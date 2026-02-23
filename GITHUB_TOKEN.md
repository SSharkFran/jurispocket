# 🔑 Como Criar Token do GitHub (Autenticação)

O GitHub não aceita mais senha para push. Você precisa criar um **Token de Acesso Pessoal**.

---

## 📋 Passo 1: Criar Token

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token (classic)"**
3. Confirme sua senha do GitHub
4. Preencha:
   - **Note**: `JurisPocket Deploy`
   - **Expiration**: `No expiration` (ou 90 dias)
   - **Scopes**: Marque apenas `repo` (acesso completo aos repositórios)

5. Clique em **"Generate token"**
6. **COPIE O TOKEN** (é a única vez que aparece!)

---

## 📋 Passo 2: Configurar no Git

No terminal, execute:

```bash
# Configurar credential helper
git config --global credential.helper cache

# Ou para salvar permanentemente:
git config --global credential.helper store
```

---

## 📋 Passo 3: Fazer Push com Token

Quando o script pedir senha, cole o **token** no lugar da senha:

```
Username: SSharkFran
Password: ghp_seu_token_aqui  <-- COLE O TOKEN AQUI
```

---

## ✅ Alternativa Mais Fácil (Recomendada)

Use o **GitHub CLI** que é mais simples:

```bash
# Instalar GitHub CLI
sudo apt install gh -y

# Login
gh auth login

# Escolha:
# - GitHub.com
# - HTTPS
# - Login with a web browser

# Depois do login, o push funciona normalmente:
./deploy-railway.sh
```

---

## 🔧 Solução Rápida (Agora)

Se quiser resolver agora sem instalar nada:

```bash
cd "/home/sharkdev/Área de trabalho/Juris"

# Remover remote antigo
git remote remove origin

# Adicionar com token (substitua SEU_TOKEN pelo token gerado)
git remote add origin https://SEU_TOKEN@github.com/SSharkFran/jurispocket.git

# Agora o push funciona sem pedir senha!
git push origin main
```

---

## ❓ Token não funciona?

1. Verifique se copiou o token completo
2. Verifique se marcou a permissão `repo`
3. Tente gerar um novo token

---

**Recomendo usar o GitHub CLI (gh)** - é a forma mais moderna e fácil!
