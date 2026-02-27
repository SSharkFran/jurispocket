#!/bin/sh
set -u

echo "[startup] Iniciando JurisPocket..."

NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
elif command -v nodejs >/dev/null 2>&1; then
  NODE_BIN="nodejs"
fi

if [ -n "$NODE_BIN" ]; then
  echo "[startup] Iniciando microservico WhatsApp com $NODE_BIN na porta ${WHATSAPP_SERVICE_PORT:-3001}..."
  $NODE_BIN /app/whatsapp-service/src/server.js &
else
  echo "[startup] AVISO: Node nao encontrado. Continuando apenas com API Flask."
fi

echo "[startup] Iniciando Gunicorn na porta ${PORT:-8080}..."
exec gunicorn -w 1 -b 0.0.0.0:${PORT:-8080} \
  --access-logfile - \
  --error-logfile - \
  --timeout 120 \
  --keep-alive 2 \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  app:app
