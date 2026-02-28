#!/bin/sh
set -u

echo "[startup] Iniciando JurisPocket..."
echo "[startup] PORT=${PORT:-8080} WHATSAPP_SERVICE_PORT=${WHATSAPP_SERVICE_PORT:-3001}"

# Se houver volume persistente no Railway, prioriza esse path para dados.
if [ -z "${DATABASE_PATH:-}" ]; then
  if [ -n "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
    export DATABASE_PATH="${RAILWAY_VOLUME_MOUNT_PATH}/jurispocket.db"
  elif [ -d "/data" ]; then
    export DATABASE_PATH="/data/jurispocket.db"
  fi
fi

if [ -n "${DATABASE_PATH:-}" ]; then
  DB_DIR=$(dirname "$DATABASE_PATH")
  mkdir -p "$DB_DIR" 2>/dev/null || true
  echo "[startup] DATABASE_PATH=$DATABASE_PATH"
fi

if [ -z "${WHATSAPP_SESSIONS_DIR:-}" ]; then
  if [ -n "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
    SESSIONS_BASE="$RAILWAY_VOLUME_MOUNT_PATH"
  elif [ -n "${DATABASE_PATH:-}" ]; then
    SESSIONS_BASE=$(dirname "$DATABASE_PATH")
  elif [ -d "/data" ]; then
    SESSIONS_BASE="/data"
  else
    SESSIONS_BASE="/app/data"
  fi
  export WHATSAPP_SESSIONS_DIR="$SESSIONS_BASE/whatsapp-sessions"
fi

mkdir -p "$WHATSAPP_SESSIONS_DIR" 2>/dev/null || true
echo "[startup] WHATSAPP_SESSIONS_DIR=$WHATSAPP_SESSIONS_DIR"

NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
elif command -v nodejs >/dev/null 2>&1; then
  NODE_BIN="nodejs"
fi

if [ -n "$NODE_BIN" ]; then
  echo "[startup] Iniciando microservico WhatsApp com $NODE_BIN na porta ${WHATSAPP_SERVICE_PORT:-3001}..."
  PORT=${WHATSAPP_SERVICE_PORT:-3001} $NODE_BIN /app/whatsapp-service/src/server.js &
else
  echo "[startup] AVISO: Node nao encontrado. Continuando apenas com API Flask."
fi

echo "[startup] Iniciando Gunicorn na porta ${PORT:-8080}..."
if ! command -v gunicorn >/dev/null 2>&1; then
  echo "[startup] ERRO: gunicorn não encontrado no PATH. Iniciando fallback com Flask."
  exec python /app/app.py
fi

exec gunicorn -w 1 -b 0.0.0.0:${PORT:-8080} \
  --access-logfile - \
  --error-logfile - \
  --timeout 120 \
  --keep-alive 2 \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  app:app
