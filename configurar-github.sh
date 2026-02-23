#!/bin/bash
# Script para configurar GitHub com Token

echo "🔧 Configuração GitHub para Railway Deploy"
echo "==========================================="
echo ""
echo "Você precisa criar um token em:"
echo "   https://github.com/settings/tokens"
echo ""
echo "1. Clique 'Generate new token (classic)'"
echo "2. Marque a opção 'repo'"
echo "3. Gere e copie o token"
echo ""
read -p "Cole seu token aqui: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token vazio. Cancelando."
    exit 1
fi

cd "/home/sharkdev/Área de trabalho/Juris"

# Remover remote antigo se existir
git remote remove origin 2>/dev/null

# Adicionar novo remote com token
git remote add origin "https://${TOKEN}@github.com/SSharkFran/jurispocket.git"

# Testar
echo ""
echo "🔄 Testando conexão..."
if git push -u origin main; then
    echo ""
    echo "✅ Configurado com sucesso!"
    echo ""
    echo "Agora você pode usar: ./deploy-railway.sh"
else
    echo ""
    echo "❌ Erro no push. Verifique se:"
    echo "   - O token está correto"
    echo "   - O repositório 'jurispocket' existe no GitHub"
fi
