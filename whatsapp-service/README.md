# JurisPocket WhatsApp Service

Microservico Node.js para conexao WhatsApp Web por usuario (multi-tenant), sem Evolution API.

## Requisitos

- Node.js 20+
- `npm install`

## Execucao

```bash
cp .env.example .env
npm install
npm run start
```

## Rotas

- `POST /whatsapp/connect/:user_id`: inicializa/reinicializa sessao do usuario.
- `GET /whatsapp/qrcode/:user_id`: retorna QR Code em Data URL.
- `GET /whatsapp/status/:user_id`: status da sessao (`connected`, `state`, `lastError`).
- `POST /whatsapp/send/:user_id`: envia mensagem (`to`, `message`).
- `POST /whatsapp/disconnect/:user_id`: desconecta sessao (logout por padrao).
- `GET /whatsapp/messages/:user_id`: mensagens recentes recebidas na memoria.
- `GET /health`: healthcheck.

## Persistencia

Cada usuario possui credenciais em:

```text
/sessions/{user_id}/
```

As credenciais sao restauradas no boot do servico.

## Webhook de entrada (opcional)

Ao receber mensagens, o servico envia payload HTTP para `WHATSAPP_INBOUND_WEBHOOK_URL`.
Se `WHATSAPP_INBOUND_WEBHOOK_SECRET` estiver configurado, inclui assinatura HMAC SHA-256 no header `x-jurispocket-signature`.

## Observacoes de uso

- O envio usa fila por usuario e delay aleatorio (`WHATSAPP_MIN_DELAY_MS`/`WHATSAPP_MAX_DELAY_MS`).
- Evite disparos em massa para reduzir risco de bloqueio.
