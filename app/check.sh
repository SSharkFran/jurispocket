#!/bin/bash
echo "=== VERIFICAÇÃO DO PROJETO ==="
echo ""

echo "1. Verificando estrutura de diretórios..."
if [ -d "src/pages" ]; then
    echo "✅ src/pages existe"
else
    echo "❌ src/pages não existe"
fi

if [ -d "src/components" ]; then
    echo "✅ src/components existe"
else
    echo "❌ src/components não existe"
fi

echo ""
echo "2. Verificando arquivos importantes..."
files=("src/main.tsx" "src/App.tsx" "src/index.css" "index.html" "vite.config.ts")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file não existe"
    fi
done

echo ""
echo "3. Verificando node_modules..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules existe"
    echo "📦 Pacotes instalados: $(ls node_modules | wc -l)"
else
    echo "❌ node_modules não existe - execute: npm install"
fi

echo ""
echo "4. Verificando ambiente Python..."
if [ -d "venv" ]; then
    echo "✅ venv existe"
    source venv/bin/activate
    python3 --version
    pip list | grep -i flask
else
    echo "❌ venv não existe"
fi

echo ""
echo "5. Verificando banco de dados..."
if [ -f "jurispocket.db" ]; then
    echo "✅ jurispocket.db existe"
    ls -lh jurispocket.db
else
    echo "❌ jurispocket.db não existe"
fi

echo ""
echo "=== FIM DA VERIFICAÇÃO ==="
