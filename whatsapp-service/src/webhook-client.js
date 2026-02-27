import crypto from 'node:crypto';
import axios from 'axios';

export class WebhookClient {
  constructor({ webhookUrl, webhookSecret, timeoutMs, logger }) {
    this.webhookUrl = webhookUrl;
    this.webhookSecret = webhookSecret;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
  }

  isEnabled() {
    return Boolean(this.webhookUrl);
  }

  _headers(payloadString) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.webhookSecret) {
      const signature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');
      headers['x-jurispocket-signature'] = signature;
    }

    return headers;
  }

  async emit(eventPayload) {
    if (!this.isEnabled()) return;

    const payloadString = JSON.stringify(eventPayload);

    try {
      await axios.post(this.webhookUrl, payloadString, {
        timeout: this.timeoutMs,
        headers: this._headers(payloadString),
      });
    } catch (error) {
      const statusCode = error.response?.status;
      const message = error.response?.data || error.message;
      this.logger.warn(
        {
          statusCode,
          message,
          webhookUrl: this.webhookUrl,
          event: eventPayload?.event,
          userId: eventPayload?.userId,
        },
        'Falha ao enviar evento para webhook de entrada',
      );
    }
  }
}
