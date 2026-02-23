#!/bin/bash
# Script de Deploy - JurisPocket

echo "🚀 Iniciando deploy do JurisPocket..."

# Criar diretórios necessários
mkdir -p data uploads logs

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "Copiando .env.example para .env..."
    cp .env.example .env
    echo "❌ Por favor, edite o arquivo .env com suas configurações antes de continuar."
    exit 1
fi

# Build e deploy
echo "📦 Baixando imagens e construindo containers..."
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml build

echo "🚀 Iniciando serviços..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Verificar status
echo "📊 Status dos serviços:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📱 Acesse: http://localhost"
echo "📁 Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Para parar: docker-compose -f docker-compose.prod.yml down"
