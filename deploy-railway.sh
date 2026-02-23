#!/bin/bash
# Script de Deploy para Railway - JurisPocket
# Uso: ./deploy-railway.sh

set -e  # Para em caso de erro

echo "🚀 JurisPocket - Deploy para Railway"
echo "======================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica se está na pasta correta
if [ ! -f "app/app.py" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto Juris${NC}"
    exit 1
fi

echo ""
echo "📋 Verificando arquivos de configuração..."

# Verifica arquivos necessários
if [ ! -f "Dockerfile.railway" ]; then
    echo -e "${RED}❌ Dockerfile.railway não encontrado!${NC}"
    exit 1
fi

if [ ! -f "railway.toml" ]; then
    echo -e "${RED}❌ railway.toml não encontrado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivos de configuração OK${NC}"

# Verifica instalação do Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI não encontrado. Instalando...${NC}"
    npm install -g @railway/cli
fi

echo ""
echo "🔍 Verificando login no Railway..."
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Não logado no Railway. Iniciando login...${NC}"
    railway login
fi

echo -e "${GREEN}✅ Logado no Railway${NC}"

# Verifica se projeto está linkado
echo ""
echo "🔗 Verificando projeto linkado..."
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Projeto não linkado.${NC}"
    echo "Por favor, selecione seu projeto:"
    railway link
fi

echo -e "${GREEN}✅ Projeto linkado${NC}"

echo ""
echo "📦 Fazendo commit das alterações..."
git add -A
git commit -m "Configuração para deploy no Railway - $(date '+%Y-%m-%d %H:%M')" || echo -e "${YELLOW}⚠️  Nada para commitar${NC}"

echo ""
echo "⬆️  Enviando para GitHub..."
git push origin $(git branch --show-current)

echo ""
echo "🚀 Iniciando deploy no Railway..."
echo -e "${YELLOW}⏳ Isso pode levar alguns minutos...${NC}"
echo ""

railway up --detach

echo ""
echo -e "${GREEN}✅ Deploy iniciado com sucesso!${NC}"
echo ""
echo "📊 Acompanhe o deploy em:"
echo "   railway logs -f"
echo ""
echo "🌐 Verifique o status da aplicação:"
echo "   railway open"
echo ""
echo "💡 Dicas:"
echo "   - Health check: /api/health"
echo "   - Configurações públicas: /api/config/public"
echo ""
echo -e "${GREEN}🎉 JurisPocket está no ar!${NC}"
