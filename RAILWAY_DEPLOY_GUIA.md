# 🚀 Guia de Deploy no Railway - JurisPocket

Este guia passo a passo vai te ajudar a hospedar seu JurisPocket no Railway sem erros.

## 📋 Pré-requisitos

1. Conta no Railway: https://railway.app
2. Git instalado na sua máquina
3. Seu código no GitHub (recomendado)

---

## 🔧 Configuração Inicial

### 1. Criar Projeto no Railway

1. Acesse https://railway.app/dashboard
2. Clique em **"New Project"**
3. Escolha **"Deploy from GitHub repo"**
4. Selecione seu repositório `Juris`

### 2. Configurar Variáveis de Ambiente

No painel do Railway, vá em **"Variables"** e adicione:

```bash
# Obrigatório - Segurança
SECRET_KEY=sua-chave-super-secreta-aqui-minimo-32-caracteres

# Obrigatório - API Datajud (CNJ)
DATAJUD_API_KEY=sua-api-key-do-datajud

# Opcional - IA Groq (Recomendado)
GROQ_API_KEY=sua-chave-groq

# Opcional - WhatsApp
WHATSAPP_VENDAS=5511999999999

# Opcional - Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=seu-email@gmail.com
```

> 💡 **Dica**: Para gerar um SECRET_KEY forte, use: `openssl rand -hex 32`

### 3. Configurar Porta

O Railway automaticamente detecta a porta 8080 do Dockerfile. Mas se precisar configurar manualmente:

```bash
PORT=8080
```

---

## 🏗️ Estrutura de Arquivos

Após as correções, seu projeto deve ter esta estrutura:

```
Juris/
├── app/                      # Código da aplicação
│   ├── app.py               # Backend Flask
│   ├── requirements.txt     # Dependências Python
│   ├── package.json         # Dependências Node
│   ├── frontend/            # Código React
│   │   └── src/
│   ├── services/            # Serviços Python
│   └── dist/                # Frontend buildado (gerado automaticamente)
├── Dockerfile.railway       # ✅ Dockerfile corrigido
├── railway.toml            # ✅ Configuração do Railway
├── .dockerignore           # ✅ Arquivos ignorados no build
└── ...
```

---

## 🚀 Deploy

### Método 1: Deploy Automático (GitHub)

1. Conecte seu repositório GitHub ao Railway
2. O deploy será automático a cada `git push`
3. Acompanhe os logs em **"Deployments"** → **"View Logs"**

### Método 2: Deploy Manual (CLI)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Linkar projeto
railway link

# Deploy
railway up
```

---

## 🔍 Troubleshooting

### Erro: "Build failed"

**Causa**: Arquivos de configuração incorretos

**Solução**:
1. Verifique se `Dockerfile.railway` está na raiz do projeto
2. Verifique se `railway.toml` está configurado corretamente
3. Faça commit e push das correções

### Erro: "Cannot find module" ou "Module not found"

**Causa**: Frontend não foi buildado corretamente

**Solução**:
```bash
# Localmente, teste o build:
cd app
npm install --legacy-peer-deps
npm run build

# Verifique se a pasta dist/ foi criada
ls -la dist/
```

### Erro: "Page not found" ou tela em branco

**Causa**: Frontend estático não está sendo servido

**Verificação**:
Acesse `/api/health` - deve retornar:
```json
{
  "status": "ok",
  "static_folder": "/app/static",
  "static_exists": true,
  "index_exists": true
}
```

Se `static_exists` for `false`, o build do frontend falhou.

### Erro: "Database locked" ou "SQLite error"

**Causa**: SQLite não é ideal para produção no Railway

**Solução temporária**: O sistema já cria o banco automaticamente em `/app/data/`

**Solução definitiva**: Migre para PostgreSQL (veja abaixo)

---

## 🗄️ Migrando para PostgreSQL (Opcional mas Recomendado)

O SQLite funciona, mas no Railway o PostgreSQL é mais robusto:

1. No Railway, clique em **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Copie a **"Database URL"**
3. Adicione às variáveis:
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
4. Modifique o `app.py` para usar PostgreSQL quando `DATABASE_URL` existir

---

## 📝 Comandos Úteis

### Ver logs em tempo real
```bash
railway logs -f
```

### Reiniciar deploy
```bash
railway up --detach
```

### Ver variáveis
```bash
railway variables
```

### Shell no container
```bash
railway shell
```

---

## ✅ Checklist Pré-Deploy

- [ ] `Dockerfile.railway` está na raiz
- [ ] `railway.toml` configurado
- [ ] `.dockerignore` criado
- [ ] Variável `SECRET_KEY` configurada no Railway
- [ ] Variável `DATAJUD_API_KEY` configurada (se for usar Datajud)
- [ ] Repositório commitado e pushado
- [ ] Projeto Railway criado e linkado ao GitHub

---

## 🆘 Suporte

Se persistir erros:

1. **Verifique os logs completos** no Railway (Deployments → View Logs)
2. **Teste localmente**:
   ```bash
   docker build -f Dockerfile.railway -t jurispocket-test .
   docker run -p 8080:8080 jurispocket-test
   ```
3. **Entre em contato** com suporte do Railway: https://railway.app/help

---

## 🎉 Próximos Passos Após Deploy

1. Acesse a URL gerada pelo Railway (ex: `https://juris.up.railway.app`)
2. Crie seu primeiro usuário em `/api/auth/register`
3. Configure as variáveis opcionais (WhatsApp, Email, IA)
4. Configure seu domínio personalizado (Settings → Domains)

**Bom uso do JurisPocket! ⚖️**
