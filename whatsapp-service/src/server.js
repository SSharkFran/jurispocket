import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import { SessionManager } from './session-manager.js';
import { WebhookClient } from './webhook-client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.WHATSAPP_SERVICE_PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const SERVICE_API_KEY =
  process.env.WHATSAPP_SERVICE_API_KEY || process.env.WHATSAPP_MICROSERVICE_TOKEN || '';
const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR || path.resolve(__dirname, '../sessions');
const MIN_DELAY_MS = Number(process.env.WHATSAPP_MIN_DELAY_MS || 1200);
const MAX_DELAY_MS = Number(process.env.WHATSAPP_MAX_DELAY_MS || 2600);
const MAX_RECONNECT_ATTEMPTS = Number(process.env.WHATSAPP_MAX_RECONNECT_ATTEMPTS || 8);
const WEBHOOK_URL = process.env.WHATSAPP_INBOUND_WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WHATSAPP_INBOUND_WEBHOOK_SECRET || '';
const WEBHOOK_TIMEOUT_MS = Number(process.env.WHATSAPP_WEBHOOK_TIMEOUT_MS || 8000);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const webhookClient = new WebhookClient({
  webhookUrl: WEBHOOK_URL,
  webhookSecret: WEBHOOK_SECRET,
  timeoutMs: WEBHOOK_TIMEOUT_MS,
  logger,
});

const manager = new SessionManager({
  sessionsDir: SESSIONS_DIR,
  minDelayMs: MIN_DELAY_MS,
  maxDelayMs: MAX_DELAY_MS,
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  webhookClient,
  logger,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  if (!SERVICE_API_KEY || req.path === '/health') {
    return next();
  }

  const headerApiKey = req.header('x-api-key');
  if (headerApiKey !== SERVICE_API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  return next();
});

const validateUserId = (req, res, next) => {
  const userId = String(req.params.user_id || '').trim();
  if (!userId) {
    return res.status(400).json({ success: false, error: 'user_id obrigatorio' });
  }
  req.userId = userId;
  return next();
};

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'jurispocket-whatsapp-service',
    timestamp: new Date().toISOString(),
  });
});

app.post('/whatsapp/connect/:user_id', validateUserId, async (req, res) => {
  try {
    const status = await manager.connect(req.userId);
    return res.json({ success: true, ...status });
  } catch (error) {
    logger.error({ userId: req.userId, error: error.message }, 'Erro ao iniciar conexao do usuario');
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/whatsapp/status/:user_id', validateUserId, async (req, res) => {
  const status = manager.getStatus(req.userId);
  return res.json({ success: true, ...status });
});

app.get('/whatsapp/qrcode/:user_id', validateUserId, async (req, res) => {
  try {
    const qr = await manager.getQrCode(req.userId);

    if (!qr.qrcode) {
      return res.status(404).json({
        success: false,
        error: 'QR code ainda nao disponivel. Aguarde alguns segundos e tente novamente.',
        state: qr.state,
        connected: qr.connected,
      });
    }

    return res.json({
      success: true,
      qrcode: qr.qrcode,
      state: qr.state,
      connected: qr.connected,
    });
  } catch (error) {
    logger.error({ userId: req.userId, error: error.message }, 'Erro ao obter QR code');
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/whatsapp/send/:user_id', validateUserId, async (req, res) => {
  const to = req.body?.to || req.body?.number || req.body?.telefone;
  const message = req.body?.message || req.body?.text || req.body?.mensagem;

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Campos to e message sao obrigatorios' });
  }

  try {
    const result = await manager.sendText(req.userId, to, message);
    return res.json(result);
  } catch (error) {
    const statusCode = error.message === 'Sessao nao conectada' ? 409 : 500;
    return res.status(statusCode).json({ success: false, error: error.message });
  }
});

app.post('/whatsapp/disconnect/:user_id', validateUserId, async (req, res) => {
  try {
    const logout = req.body?.logout !== false;
    const result = await manager.disconnect(req.userId, { logout });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/whatsapp/messages/:user_id', validateUserId, (req, res) => {
  const messages = manager.getRecentMessages(req.userId);
  return res.json({ success: true, items: messages });
});

app.use((err, req, res, _next) => {
  logger.error({ error: err.message, stack: err.stack, path: req.path }, 'Erro nao tratado no servidor');
  return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});

const start = async () => {
  await manager.bootstrapPersistedSessions();

  app.listen(PORT, HOST, () => {
    logger.info(
      {
        host: HOST,
        port: PORT,
        sessionsDir: SESSIONS_DIR,
        webhookEnabled: webhookClient.isEnabled(),
      },
      'Servico WhatsApp iniciado',
    );
  });
};

start().catch((error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Falha ao iniciar servico WhatsApp');
  process.exit(1);
});
