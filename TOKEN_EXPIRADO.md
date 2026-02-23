# 🔑 Token Expirado - Solução Rápida

O token do GitHub expirou. Vamos criar um novo:

---

## ⚡ Solução Mais Rápida (30 segundos)

### 1. Criar Novo Token
1. Acesse: https://github.com/settings/tokens/new
2. **Note**: `Railway Deploy`
3. **Expiration**: 30 days (ou No expiration)
4. ✅ Marque: **repo** (acesso total)
5. Clique **"Generate token"**
6. **Copie o token** (começa com `ghp_`)

### 2. Configurar no Projeto
No terminal, execute:

```bash
cd "/home/sharkdev/Área de trabalho/Juris"

# Colar seu token aqui:
TOKEN="cole-seu-token-aqui"

# Configurar remote
git remote set-url origin "https://${TOKEN}@github.com/SSharkFran/jurispocket.git"

# Testar push
git push origin main
```

### 3. Pronto!
Se aparecer "Everything up-to-date" ou similar, funcionou!

---

## 🔄 Ou Use HTTPS Normal

Se não quiser usar token, configure o Git para pedir login:

```bash
git config --global --unset credential.helper
git remote set-url origin https://github.com/SSharkFran/jurispocket.git
git push origin main
# Vai pedir: Username + Password (use o token como senha!)
```

---

## ✅ Depois de Funcionar

O Railway vai detectar automaticamente o novo commit e fazer rebuild!

Acompanhe em: https://railway.app/dashboard
