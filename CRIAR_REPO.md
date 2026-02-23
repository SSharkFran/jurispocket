# 📦 Criar Repositório no GitHub

O erro 403 significa que o repositório `jurispocket` **não existe** no GitHub.

---

## 🚀 Criar pelo Navegador (Recomendado)

1. Acesse: **https://github.com/new**

2. Preencha:
   - **Repository name**: `jurispocket`
   - **Description**: `Sistema de Gestão de Processos Jurídicos`
   - **Public** ou **Private** (escolha)
   - ❌ **NÃO** marque "Add a README"
   - ❌ **NÃO** marque "Add .gitignore"
   - ❌ **NÃO** marque "Choose a license"

3. Clique em **"Create repository"**

---

## 🚀 Criar pelo Terminal (gh CLI)

```bash
# Criar repositório privado
gh repo create jurispocket --private --source=. --push

# Ou público:
# gh repo create jurispocket --public --source=. --push
```

---

## ✅ Depois de Criar

Volte no terminal e execute:

```bash
./deploy-railway.sh
```

---

## ❌ Se der erro de "remote já existe"

```bash
# Remover remote antigo
git remote remove origin

# Adicionar novo (com gh já autenticado)
git remote add origin https://github.com/SSharkFran/jurispocket.git

# Agora funciona!
git push -u origin main
```

---

## 🎯 Resumo

| Problema | Solução |
|----------|---------|
| Erro 403 | Criar repositório no GitHub |
| Repo não existe | https://github.com/new |

Crie o repo e tente de novo! 🚀
