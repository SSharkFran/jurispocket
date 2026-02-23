# 🚀 Guia de Hospedagem - JurisPocket

## 📋 Opções de Hospedagem

### Opção 1: VPS (Recomendado para Produção)
**Melhor custo-benefício e controle total**

**Provedores recomendados:**
- 🇧🇷 **Brasil**: Locaweb, UOL Host, HostGator Brasil
- 🌍 **Internacional**: DigitalOcean, Vultr, Linode, Hetzner

**Especificações mínimas:**
- 2 vCPU
- 4GB RAM
- 40GB SSD
- Ubuntu 22.04 LTS

**Preço estimado:** R$ 50-150/mês

---

### Opção 2: Railway (Mais Fácil)
**Deploy simplificado com interface web**

1. Acesse: https://railway.app
2. Conecte seu GitHub
3. Importe o repositório
4. Adicione as variáveis de ambiente
5. Deploy automático!

**Preço:** Gratuito (US$ 5 créditos/mês) ou US$ 5/mês

---

### Opção 3: Render
**Alternativa gratuita ao Railway**

1. Acesse: https://render.com
2. Crie um Web Service
3. Conecte o repositório GitHub
4. Configure o Dockerfile
5. Adicione variáveis de ambiente

**Preço:** Gratuito (com sleep) ou US$ 7/mês

---

## 🛠️ Deploy no VPS (Passo a Passo)

### 1. Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Instalar utilitários
sudo apt install git nginx certbot python3-certbot-nginx -y
```

### 2. Clonar e Configurar

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/jurispocket.git
cd jurispocket

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Edite com suas configurações

# Tornar script executável
chmod +x deploy.sh
```

### 3. Executar Deploy

```bash
./deploy.sh
```

### 4. Configurar Nginx + SSL (HTTPS)

```bash
# Configurar domínio
sudo nano /etc/nginx/sites-available/jurispocket
```

Adicione:
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/jurispocket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Instalar SSL (Certbot)
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br
```

---

## 📁 Estrutura de Arquivos

```
Juris/
├── app/                      # Backend Flask + Frontend React
│   ├── app.py               # API principal
│   ├── Dockerfile           # Container backend
│   ├── Dockerfile.frontend  # Container frontend
│   ├── nginx.conf           # Config nginx
│   └── requirements.txt     # Dependências Python
├── docker-compose.prod.yml  # Orquestração produção
├── deploy.sh                # Script de deploy
├── .env.example             # Template variáveis
└── HOSPEDAGEM.md           # Este arquivo
```

---

## 🔧 Comandos Úteis

### Docker
```bash
# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs específicos
docker-compose -f docker-compose.prod.yml logs -f backend

# Reiniciar serviço
docker-compose -f docker-compose.prod.yml restart backend

# Parar tudo
docker-compose -f docker-compose.prod.yml down

# Backup banco
cp data/jurispocket.db backups/jurispocket-$(date +%Y%m%d).db

# Atualizar (pull + rebuild)
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Monitoramento
```bash
# Ver uso de recursos
docker stats

# Ver processos
docker-compose -f docker-compose.prod.yml top

# Health check
curl http://localhost/api/config/public
```

---

## 🔐 Segurança

### Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Fail2Ban (Proteção contra ataques)
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

---

## 💰 Estimativa de Custos

| Opção | Mensal | Ideal para |
|-------|--------|-----------|
| Hetzner (VPS 4GB) | ~R$ 30 | Produção pequena |
| DigitalOcean | ~R$ 50 | Produção média |
| Railway | ~R$ 25 | MVP/Teste |
| Render | ~R$ 35 | MVP/Teste |
| AWS/Azure | R$ 100+ | Enterprise |

---

## ❌ Troubleshooting

### Erro: "port already allocated"
```bash
# Verificar porta 80
sudo lsof -i :80
# Matar processo ou mudar porta no docker-compose
```

### Erro: "permission denied"
```bash
sudo chown -R $USER:$USER ./data ./uploads ./logs
chmod -R 755 ./data ./uploads
```

### Backend não inicia
```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs backend

# Verificar .env
cat .env | grep -v PASSWORD
```

---

## 📞 Suporte

Em caso de dúvidas:
1. Verifique os logs: `docker-compose logs`
2. Consulte a documentação do projeto
3. Abra uma issue no GitHub

---

**Pronto para deploy!** 🎉
