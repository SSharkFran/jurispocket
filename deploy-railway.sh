#!/bin/bash
# Script de Deploy para Railway

echo "🚀 Deploy JurisPocket no Railway"
echo "================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "railway.toml" ]; then
    echo -e "${RED}❌ Erro: railway.toml não encontrado!${NC}"
    echo "Execute este script na pasta raiz do projeto."
    exit 1
fi

# Verificar git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git não está instalado!${NC}"
    echo "Instale o Git primeiro."
    exit 1
fi

# Inicializar git se necessário
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📦 Inicializando Git...${NC}"
    git init
    git branch -M main
fi

# Verificar remote
REMOTE=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Repositório GitHub não configurado${NC}"
    echo ""
    echo "1. Crie um repositório em: https://github.com/new"
    echo "2. Digite seu usuário do GitHub:"
    read -r GITHUB_USER
    echo "3. Digite o nome do repositório (ex: jurispocket):"
    read -r REPO_NAME
    
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo -e "${GREEN}✅ Repositório configurado!${NC}"
fi

# Perguntar mensagem do commit
echo ""
echo "📝 Digite uma mensagem para este deploy:"
echo "(ou pressione Enter para usar 'Deploy no Railway')"
read -r COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Deploy no Railway"
fi

# Adicionar arquivos
echo ""
echo -e "${YELLOW}📦 Adicionando arquivos...${NC}"
git add .

# Commit
echo -e "${YELLOW}💾 Criando commit...${NC}"
git commit -m "$COMMIT_MSG" || echo -e "${YELLOW}ℹ️  Nada para commitar (pode ser normal)${NC}"

# Push
echo ""
echo -e "${YELLOW}🚀 Enviando para GitHub...${NC}"
if git push origin main; then
    echo ""
    echo -e "${GREEN}✅ Código enviado com sucesso!${NC}"
    echo ""
    echo "🚂 O Railway vai detectar automaticamente e fazer deploy!"
    echo ""
    echo "⏱️  Aguarde 3-5 minutos..."
    echo ""
    echo "📊 Acompanhe o deploy em:"
    echo "   https://railway.app/dashboard"
    echo ""
    echo "💡 Próximos passos:"
    echo "   1. Acesse o Railway"
    echo "   2. Clique no seu projeto"
    echo "   3. Adicione as variáveis de ambiente"
    echo "   4. Gere o domínio em Settings"
else
    echo ""
    echo -e "${RED}❌ Erro ao enviar para GitHub${NC}"
    echo "Verifique suas credenciais e tente novamente."
    exit 1
fi
