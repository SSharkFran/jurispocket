# 🚀 Deploy no Railway - Guia Passo a Passo

## 📋 Pré-requisitos

1. Conta no GitHub (https://github.com)
2. Conta no Railway (https://railway.app) - Login com GitHub
3. Git instalado no seu PC

---

## 🛠️ Passo 1: Preparar o Projeto

### 1.1 Commitar as alterações
```bash
cd /home/sharkdev/Área\ de\ trabalho/Juris

# Inicializar git (se não tiver)
git init

# Adicionar todos os arquivos
git add .

# Commitar
git commit -m "Primeiro commit - JurisPocket pronto para deploy"
```

### 1.2 Criar repositório no GitHub
1. Acesse https://github.com/new
2. Nome: `jurispocket`
3. Deixe público ou privado (recomendo privado)
4. NÃO marque para criar README
5. Clique em "Create repository"

### 1.3 Conectar e enviar código
```bash
# Substitua SEU-USUARIO pelo seu usuário do GitHub
git remote add origin https://github.com/SEU-USUARIO/jurispocket.git

# Enviar código
git branch -M main
git push -u origin main
```

---

## 🚂 Passo 2: Deploy no Railway

### 2.1 Acessar Railway
1. Acesse https://railway.app
2. Clique em "Login" e faça login com GitHub

### 2.2 Criar Novo Projeto
1. Clique em "New Project"
2. Escolha "Deploy from GitHub repo"
3. Selecione o repositório `jurispocket`
4. Clique em "Add Variables" (vamos configurar depois)

### 2.3 Configurar Variáveis de Ambiente
Clique em "Variables" e adicione:

**Obrigatórias:**
```
SECRET_KEY = sua-chave-super-secreta-2024-jurispocket
PORT = 8080
```

**Opcionais (para funcionalidades):**
```
# WhatsApp do time de vendas
WHATSAPP_VENDAS = 5511999999999

# IA - Groq (gratuito)
GROQ_API_KEY = sua-chave-groq

# DataJud (consulta processos)
DATAJUD_API_KEY = sua-api-key-datajud

# Email (SMTP)
SMTP_HOST = smtp.gmail.com
SMTP_USER = seu-email@gmail.com
SMTP_PASS = sua-senha-app
```

### 2.4 Deploy Automático
O Railway vai detectar o `railway.toml` e fazer deploy automaticamente!

Aguarde 3-5 minutos para o build completar.

---

## ✅ Passo 3: Verificar Deploy

### 3.1 Ver Logs
No Railway, clique no serviço e depois em "Deploy Logs"

### 3.2 Acessar URL
1. Clique em "Settings"
2. Em "Domains", clique em "Generate Domain"
3. Sua URL será algo como: `https://jurispocket-production.up.railway.app`

### 3.3 Testar
Abra a URL no navegador. Você deve ver a Landing Page! 🎉

---

## 🔄 Passo 4: Atualizar (Futuro)

Quando fizer alterações no código:

```bash
cd /home/sharkdev/Área\ de\ trabalho/Juris

# Commitar mudanças
git add .
git commit -m "Descrição das alterações"

# Enviar para GitHub
git push origin main

# O Railway faz deploy automático! 🚀
```

---

## 🛟 Troubleshooting

### Erro: "Build failed"
**Solução:** Verifique os logs no Railway. Provavelmente falta alguma variável.

### Erro: "Application failed to start"
**Solução:** 
1. Verifique se `PORT` está definido como variável
2. Reinicie o deploy: Railway → Deploy → "Redeploy"

### Site não carrega
**Solução:**
1. Verifique se o domínio foi gerado em Settings → Domains
2. Tente acessar com `https://` no início

---

## 💡 Dicas Importantes

### Plano Gratuito - Limites:
- ⚡ **US$ 5** em créditos por mês
- 💤 **Sleep**: App "dorme" após 30 min sem uso
- 🔄 **500 horas** de execução por mês
- 📊 **Banco**: SQLite (já incluso no container)

### Para evitar sleep:
- Use o site pelo menos 1x por dia
- Ou configure um "pinger" gratuito (UptimeRobot)

---

## 🎉 Pronto!

Seu JurisPocket está online! Acesse de qualquer lugar:
- 💻 No trabalho
- 📱 No celular
- 🏠 Em casa

URL: `https://seu-app.up.railway.app`

---

## 📞 Precisa de ajuda?

Se der erro, me envie:
1. Print dos logs do Railway
2. Print das variáveis de ambiente (oculte senhas)
3. Descrição do erro
