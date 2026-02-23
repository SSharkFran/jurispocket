# Dockerfile para JurisPocket Backend
FROM python:3.11-slim

# Evitar prompts do apt
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar requirements primeiro (cache eficiente)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o código
COPY . .

# Criar diretórios necessários
RUN mkdir -p uploads logs data

# Criar script de entrypoint
RUN echo '#!/bin/bash\n\
if [ "$FLASK_ENV" = "production" ]; then\n\
    echo "🚀 Iniciando em modo produção..."\n\
    gunicorn -w 4 -b 0.0.0.0:5000 --access-logfile - --error-logfile - --timeout 120 app:app\n\
else\n\
    echo "🛠️  Iniciando em modo desenvolvimento..."\n\
    python app.py\n\
fi' > /entrypoint.sh && chmod +x /entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/config/public || exit 1

# Expor porta
EXPOSE 5000

# Comando para iniciar
ENTRYPOINT ["/entrypoint.sh"]
