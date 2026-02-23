# 🚂 Conectar Railway ao GitHub

O código está no GitHub, agora precisa conectar ao Railway.

---

## 📋 Passo a Passo

### 1. Acesse o Railway
👉 https://railway.app

### 2. Criar Novo Projeto
1. Clique no botão **"New Project"** (verde, canto superior)
2. Selecione **"Deploy from GitHub repo"**

### 3. Instalar App do Railway (se pedir)
Se aparecer tela pedindo permissão:
1. Clique **"Configure GitHub App"**
2. Selecione **"Only select repositories"**
3. Escolha **"jurispocket"**
4. Clique **"Install"**

### 4. Selecionar Repositório
1. Volte para o Railway
2. Procure **"jurispocket"** na lista
3. Clique nele

### 5. Deploy Automático!
O Railway vai:
- ✅ Detectar o `railway.toml`
- ✅ Fazer build do Dockerfile
- ✅ Iniciar a aplicação

Aguarde **3-5 minutos** (barra de progresso verde).

---

## ⚙️ Configurar Variáveis (IMPORTANTE!)

Após o deploy, clique no projeto e vá em **"Variables"**:

**Clique em "New Variable" e adicione:**

```
SECRET_KEY = sua-chave-super-secreta-aqui-minimo-32-caracteres
```

**Opcionais:**
```
WHATSAPP_VENDAS = 5511999999999
GROQ_API_KEY = sua-chave-groq (se tiver)
```

---

## 🌐 Gerar Domínio

1. Clique em **"Settings"** (engrenagem)
2. Em **"Domains"**, clique **"Generate Domain"**
3. Sua URL será tipo:
   `https://jurispocket-production.up.railway.app`

---

## ✅ Pronto!

Acesse a URL e teste! 🎉

---

## ❌ Erro no Build?

Se aparecer erro vermelho:
1. Clique no deploy
2. Veja os logs
3. Provavelmente falta variável `SECRET_KEY`

---

## 🔄 Deploy Automático

Toda vez que fizer `git push`, o Railway atualiza sozinho!
