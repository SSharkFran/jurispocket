# JurisPocket - Arquitetura WhatsApp Web (Sem Evolution API)

## 1) Arquitetura geral

O WhatsApp passa a ser um microservico dedicado em Node.js (`whatsapp-service`) usando Baileys.

Fluxo:

1. Usuario autenticado no Flask chama `/api/whatsapp/*`.
2. Flask identifica `user_id` via JWT (`g.auth.user_id`).
3. Flask chama o microservico Node em `/whatsapp/{acao}/{user_id}`.
4. Node gerencia a sessao exclusiva do usuario em disco (`/sessions/{user_id}/`).
5. Node envia/recebe mensagens com o WhatsApp Web desse usuario.
6. Mensagens recebidas podem ser entregues ao Flask por webhook interno (`/api/internal/whatsapp/inbound`).

## 2) Multi-tenant e isolamento

- Cada usuario possui uma sessao independente.
- Credenciais e estado ficam em pastas separadas por `user_id`.
- Fila de envio e delay sao aplicados por usuario para reduzir risco de bloqueio.

Estrutura de persistencia:

```text
whatsapp-service/
  sessions/
    12/
      creds.json
      ...
    34/
      creds.json
      ...
```

## 3) Rotas do microservico Node

- `POST /whatsapp/connect/:user_id`
- `GET  /whatsapp/qrcode/:user_id`
- `GET  /whatsapp/status/:user_id`
- `POST /whatsapp/send/:user_id`
- `POST /whatsapp/disconnect/:user_id` (extra para logout)
- `GET  /whatsapp/messages/:user_id` (listener local em memoria)

## 4) Integracao com Flask

No backend Python, o servico `app/services/whatsapp_service.py` foi adaptado para consumir o Node via HTTP:

- `WHATSAPP_MICROSERVICE_URL`
- `WHATSAPP_MICROSERVICE_TOKEN`

As rotas Flask existentes continuam em `/api/whatsapp/*`, mas agora enviam `user_id` autenticado para o microservico.

### Exemplo de envio (Flask -> Node)

```python
resultado = whatsapp_service.send_text_message(g.auth.get('user_id'), telefone, mensagem)
```

### Exemplo de inbound webhook (Node -> Flask)

Endpoint no Flask:

- `POST /api/internal/whatsapp/inbound`

Esse endpoint valida assinatura HMAC opcional (`WHATSAPP_INBOUND_WEBHOOK_SECRET`) e recebe eventos de mensagem.

### Endpoints funcionais adicionados no Flask (uso de produto)

- `POST /api/whatsapp/conectar`
- `GET /api/whatsapp/status`
- `GET /api/whatsapp/qrcode`
- `POST /api/whatsapp/desconectar`
- `POST /api/whatsapp/enviar`
- `POST /api/processos/{id}/whatsapp/enviar` (destinos: cliente, equipe, telefone)
- `GET /api/tarefas/{id}/whatsapp` (preparacao de mensagem/link)
- `POST /api/tarefas/{id}/whatsapp/enviar` (destinos: responsavel, equipe, telefone)
- `GET /api/processos/{id}/movimentacoes/{movimentacao_id}/whatsapp` (preparacao)
- `POST /api/processos/{id}/movimentacoes/{movimentacao_id}/whatsapp/enviar`
- `POST /api/processos/{id}/movimentacoes/ultima/whatsapp/enviar`
- `GET /api/whatsapp/workspace/contatos`
- `POST /api/whatsapp/workspace/enviar`

## 5) Variaveis de ambiente essenciais

Flask:

- `WHATSAPP_MICROSERVICE_URL=http://whatsapp-service:3001`
- `WHATSAPP_MICROSERVICE_TOKEN=...`
- `WHATSAPP_INBOUND_WEBHOOK_SECRET=...` (opcional, recomendado)

Node (`whatsapp-service/.env`):

- `WHATSAPP_SERVICE_API_KEY=...`
- `WHATSAPP_SESSIONS_DIR=./sessions`
- `WHATSAPP_MIN_DELAY_MS=1200`
- `WHATSAPP_MAX_DELAY_MS=2600`
- `WHATSAPP_INBOUND_WEBHOOK_URL=http://backend:5000/api/internal/whatsapp/inbound`

## 6) Escalabilidade e limites

- Escalabilidade horizontal: para multiplas replicas, manter afinidade de sessao por usuario (sticky routing) ou externalizar estado/sockets para uma camada dedicada.
- Persistencia: usar volume persistente para `sessions/`.
- Observabilidade: logar status de sessao, reconexoes, latencia de envio e erro por `user_id`.
- Limites anti-bloqueio:
  - manter delay entre envios,
  - evitar blasts/massa,
  - preferir mensagens transacionais,
  - aquecer numero gradualmente.
- Recuperacao: o servico restaura sessoes persistidas no boot automaticamente.

## 7) Estrutura de pastas adicionada

```text
whatsapp-service/
  src/
    server.js
    session-manager.js
    webhook-client.js
  sessions/
  package.json
  .env.example
  Dockerfile
  README.md
```
