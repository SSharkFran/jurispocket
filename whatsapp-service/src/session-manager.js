import fs from 'node:fs/promises';
import path from 'node:path';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

const DEFAULT_STATE = 'disconnected';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeUserId = (value) => String(value).trim();

export class SessionManager {
  constructor({ sessionsDir, minDelayMs, maxDelayMs, logger, webhookClient }) {
    this.sessionsDir = sessionsDir;
    this.minDelayMs = minDelayMs;
    this.maxDelayMs = Math.max(maxDelayMs, minDelayMs);
    this.logger = logger;
    this.webhookClient = webhookClient;

    this.sessions = new Map();
    this.startingSessions = new Map();
    this.sendQueues = new Map();
  }

  async bootstrapPersistedSessions() {
    await fs.mkdir(this.sessionsDir, { recursive: true });
    const entries = await fs.readdir(this.sessionsDir, { withFileTypes: true });
    const userIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          await this.connect(userId);
        } catch (error) {
          this.logger.error({ userId, error: error.message }, 'Falha ao restaurar sessao persistida');
        }
      }),
    );

    this.logger.info({ restoredSessions: userIds.length }, 'Sessoes persistidas restauradas');
  }

  _userSessionPath(userId) {
    return path.join(this.sessionsDir, normalizeUserId(userId));
  }

  _emptySession(userId) {
    return {
      userId: normalizeUserId(userId),
      socket: null,
      state: DEFAULT_STATE,
      connected: false,
      qrCodeDataUrl: null,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reconnectAttempts: 0,
      manualDisconnect: false,
      recentMessages: [],
    };
  }

  _getOrCreateSession(userId) {
    const normalized = normalizeUserId(userId);
    if (!this.sessions.has(normalized)) {
      this.sessions.set(normalized, this._emptySession(normalized));
    }
    return this.sessions.get(normalized);
  }

  _updateSession(userId, patch) {
    const session = this._getOrCreateSession(userId);
    Object.assign(session, patch, { updatedAt: new Date().toISOString() });
    return session;
  }

  _extractDisconnectStatusCode(error) {
    if (!error) return undefined;
    if (error instanceof Boom) return error.output?.statusCode;
    return error?.output?.statusCode;
  }

  _randomDelay() {
    return Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1)) + this.minDelayMs;
  }

  _normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('55')) {
      return digits;
    }

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    return digits;
  }

  _toJid(phone) {
    const normalized = this._normalizePhone(phone);
    if (!normalized) {
      throw new Error('Telefone invalido');
    }
    return `${normalized}@s.whatsapp.net`;
  }

  _extractMessageText(message) {
    if (!message) return '';
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;

    const ephemeral = message.ephemeralMessage?.message;
    if (ephemeral) return this._extractMessageText(ephemeral);

    const viewOnce = message.viewOnceMessage?.message;
    if (viewOnce) return this._extractMessageText(viewOnce);

    return '';
  }

  async _handleMessageUpsert(userId, messages, type) {
    for (const msg of messages) {
      if (!msg?.key?.remoteJid || !msg.message) continue;

      const payload = {
        event: 'whatsapp.message.received',
        userId: normalizeUserId(userId),
        type,
        from: msg.key.remoteJid,
        fromMe: Boolean(msg.key.fromMe),
        messageId: msg.key.id,
        timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) : null,
        pushName: msg.pushName || null,
        text: this._extractMessageText(msg.message),
      };

      const session = this._getOrCreateSession(userId);
      session.recentMessages.unshift(payload);
      session.recentMessages = session.recentMessages.slice(0, 50);
      session.updatedAt = new Date().toISOString();

      await this.webhookClient.emit(payload);
    }
  }

  async _openSocket(userId) {
    this._getOrCreateSession(userId);
    const authDir = this._userSessionPath(userId);
    await fs.mkdir(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('JurisPocket'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      logger: this.logger.child({ userId, module: 'baileys' }),
    });

    this._updateSession(userId, {
      socket,
      state: 'connecting',
      connected: false,
      manualDisconnect: false,
      lastError: null,
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      try {
        await this._handleMessageUpsert(userId, messages, type);
      } catch (error) {
        this.logger.error(
          { userId, error: error.message },
          'Falha ao processar mensagens recebidas',
        );
      }
    });

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrCodeDataUrl = await QRCode.toDataURL(qr);
        this._updateSession(userId, {
          state: 'qr_pending',
          connected: false,
          qrCodeDataUrl,
          lastError: null,
        });
      }

      if (connection === 'open') {
        this._updateSession(userId, {
          state: 'connected',
          connected: true,
          qrCodeDataUrl: null,
          reconnectAttempts: 0,
          lastError: null,
        });
        this.logger.info({ userId }, 'Sessao WhatsApp conectada');
      }

      if (connection === 'close') {
        const statusCode = this._extractDisconnectStatusCode(lastDisconnect?.error);
        const activeSession = this._getOrCreateSession(userId);
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = !activeSession.manualDisconnect && !loggedOut;

        this._updateSession(userId, {
          state: loggedOut ? 'logged_out' : 'disconnected',
          connected: false,
          socket: null,
          lastError: lastDisconnect?.error?.message || null,
        });

        this.logger.warn(
          { userId, statusCode, shouldReconnect, loggedOut },
          'Sessao WhatsApp desconectada',
        );

        if (shouldReconnect) {
          const attempts = activeSession.reconnectAttempts + 1;
          const reconnectDelayMs = Math.min(attempts * 1000, 15000);
          this._updateSession(userId, { reconnectAttempts: attempts });

          setTimeout(() => {
            this.connect(userId).catch((error) => {
              this.logger.error(
                { userId, error: error.message },
                'Falha ao reconectar sessao WhatsApp',
              );
            });
          }, reconnectDelayMs);
        }
      }
    });
  }

  async connect(userId) {
    const normalized = normalizeUserId(userId);
    const existing = this.sessions.get(normalized);

    if (existing?.socket && ['connecting', 'qr_pending', 'connected'].includes(existing.state)) {
      return this.getStatus(normalized);
    }

    if (this.startingSessions.has(normalized)) {
      await this.startingSessions.get(normalized);
      return this.getStatus(normalized);
    }

    const startPromise = this._openSocket(normalized)
      .catch((error) => {
        this._updateSession(normalized, {
          state: 'error',
          connected: false,
          socket: null,
          lastError: error.message,
        });
        throw error;
      })
      .finally(() => {
        this.startingSessions.delete(normalized);
      });

    this.startingSessions.set(normalized, startPromise);
    await startPromise;

    return this.getStatus(normalized);
  }

  getStatus(userId) {
    const normalized = normalizeUserId(userId);
    const session = this.sessions.get(normalized);

    if (!session) {
      return {
        userId: normalized,
        connected: false,
        state: DEFAULT_STATE,
        hasQrCode: false,
        updatedAt: null,
      };
    }

    return {
      userId: normalized,
      connected: session.connected,
      state: session.state,
      hasQrCode: Boolean(session.qrCodeDataUrl),
      lastError: session.lastError,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      reconnectAttempts: session.reconnectAttempts,
    };
  }

  async getQrCode(userId) {
    const normalized = normalizeUserId(userId);
    await this.connect(normalized);

    const session = this._getOrCreateSession(normalized);
    return {
      qrcode: session.qrCodeDataUrl,
      state: session.state,
      connected: session.connected,
    };
  }

  async sendText(userId, to, message) {
    const normalized = normalizeUserId(userId);
    await this.connect(normalized);

    const session = this._getOrCreateSession(normalized);
    if (!session.connected || !session.socket) {
      throw new Error('Sessao nao conectada');
    }

    const queue = this.sendQueues.get(normalized) || Promise.resolve();

    const task = queue.then(async () => {
      const delayMs = this._randomDelay();
      await sleep(delayMs);

      const jid = this._toJid(to);
      const response = await session.socket.sendMessage(jid, {
        text: String(message || ''),
      });

      return {
        success: true,
        messageId: response?.key?.id || null,
        to: jid,
        delayMs,
        timestamp: new Date().toISOString(),
      };
    });

    this.sendQueues.set(normalized, task.catch(() => undefined));
    return task;
  }

  getRecentMessages(userId) {
    const normalized = normalizeUserId(userId);
    const session = this.sessions.get(normalized);
    return session?.recentMessages || [];
  }

  async disconnect(userId, { logout = true } = {}) {
    const normalized = normalizeUserId(userId);
    const session = this.sessions.get(normalized);

    if (!session?.socket) {
      return { success: true, state: 'disconnected' };
    }

    session.manualDisconnect = true;

    try {
      if (logout) {
        await session.socket.logout();
      } else if (session.socket.ws) {
        session.socket.ws.close();
      }
    } catch (error) {
      this.logger.warn({ userId: normalized, error: error.message }, 'Erro no disconnect da sessao');
    }

    this._updateSession(normalized, {
      socket: null,
      connected: false,
      state: 'disconnected',
      qrCodeDataUrl: null,
    });

    if (logout) {
      await fs.rm(this._userSessionPath(normalized), { recursive: true, force: true });
    }

    return { success: true, state: 'disconnected' };
  }
}
