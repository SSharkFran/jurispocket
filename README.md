# JurisPocket

Sistema web para gestao juridica com:
- cadastro e acompanhamento de clientes/processos;
- controle de prazos, tarefas e financeiro;
- central de documentos e templates;
- monitoramento processual (PJe/Datajud);
- integracao com WhatsApp;
- copiloto de IA com acoes reais sob confirmacao.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Modulos do Produto](#modulos-do-produto)
4. [Estrutura do Repositorio](#estrutura-do-repositorio)
5. [Stack Tecnologica](#stack-tecnologica)
6. [Variaveis de Ambiente](#variaveis-de-ambiente)
7. [Execucao Local (Desenvolvimento)](#execucao-local-desenvolvimento)
8. [Execucao com Docker Compose](#execucao-com-docker-compose)
9. [Deploy no Railway](#deploy-no-railway)
10. [Banco de Dados e Inicializacao](#banco-de-dados-e-inicializacao)
11. [Jobs em Background](#jobs-em-background)
12. [Endpoints de Referencia](#endpoints-de-referencia)
13. [Troubleshooting](#troubleshooting)

## Visao Geral

O JurisPocket e um sistema full-stack para escritorios de advocacia.
O backend concentra regras de negocio, API e jobs agendados.
O frontend oferece SPA com dashboards e modulos operacionais.
Existe tambem um microservico Node.js para conexao com WhatsApp Web.

## Arquitetura

### 1) Backend (Flask)
- Arquivo principal: `app/app.py`
- Responsavel por:
  - autenticacao, permissoes e planos;
  - API REST de todos os modulos;
  - inicializacao/migracoes do SQLite;
  - jobs com APScheduler;
  - integracoes (IA, Datajud, WhatsApp, email);
  - servir frontend estatico em producao (`app/static`).

### 2) Frontend (React + Vite)
- Codigo: `app/src`
- Roteamento principal em `app/src/App.tsx`
- Layout e navegacao em `app/src/components/AppLayout.tsx`
- Consumo de API centralizado em `app/src/services/api.ts`

### 3) Microservico WhatsApp (Node.js + Baileys)
- Codigo: `whatsapp-service/src`
- Entrada: `whatsapp-service/src/server.js`
- Funcao: conectar sessoes WhatsApp Web, QR code, envio de mensagens e webhook inbound.

### 4) Banco de dados
- SQLite
- Caminho padrao local: `app/jurispocket.db`
- Pode ser sobrescrito por `DATABASE_PATH`.

## Modulos do Produto

- **Autenticacao e Workspace**
  - cadastro com verificacao;
  - login JWT;
  - perfil e avatar.

- **Clientes**
  - CRUD completo;
  - historico e integracoes.

- **Processos**
  - CRUD;
  - consulta PJe/Datajud;
  - movimentacoes e alertas;
  - link publico de acompanhamento.

- **Prazos e Tarefas**
  - criacao, atribuicao e conclusao;
  - lembretes e acoes automatizadas.

- **Financeiro**
  - entradas e saidas;
  - resumo por periodo;
  - documentos por transacao.

- **Documentos e Templates**
  - upload/download;
  - templates juridicos;
  - geracao de documentos com variaveis.

- **Copiloto IA**
  - chat contextual com dados reais do workspace;
  - preparacao de acoes operacionais (tarefa, prazo, financeiro, WhatsApp);
  - confirmacao/rejeicao por fluxo de acao pendente.

- **WhatsApp**
  - conexao por sessao;
  - envio individual e em lote;
  - caixa de entrada;
  - automacoes (lembretes, resumo diario, campanhas).

- **Admin/Superadmin**
  - usuarios, planos, assinaturas, cupons, configuracoes;
  - auditoria;
  - backup/restaure.

## Estrutura do Repositorio

```text
jurispocket/
|- app/                         # Backend Flask + Frontend React (monorepo local)
|  |- app.py                    # API principal
|  |- requirements.txt          # Dependencias Python
|  |- package.json              # Dependencias e scripts frontend
|  |- src/                      # Frontend React
|  |- services/                 # Integracoes backend (email/whatsapp)
|  |- datajud_worker.py         # Worker de monitoramento Datajud
|  `- Dockerfile*               # Imagens backend/frontend
|- whatsapp-service/            # Microservico WhatsApp Web (Node.js)
|  |- src/server.js
|  |- package.json
|  `- README.md
|- .env.example                 # Modelo de env (raiz)
|- docker-compose.prod.yml
|- Dockerfile.railway
|- railway.toml
`- start-railway.sh
```

## Stack Tecnologica

- **Backend:** Python 3.11, Flask, APScheduler, SQLite
- **Frontend:** React 19, Vite 7, TypeScript, Tailwind, Radix UI
- **IA:** OpenAI SDK (compativel com OpenAI e Groq)
- **WhatsApp:** Node.js, Express, Baileys
- **Deploy:** Docker / Railway

## Variaveis de Ambiente

O arquivo de referencia e `.env.example` na raiz.

### Variaveis mais importantes

- `SECRET_KEY`: chave JWT/sessao do backend.
- `DATAJUD_API_KEY`: chave da API Datajud.
- `GROQ_API_KEY` ou `OPENAI_API_KEY`: habilita copiloto IA.
- `VITE_API_URL`: URL base do frontend para API.
- `WHATSAPP_MICROSERVICE_URL`: URL do microservico WhatsApp.
- `WHATSAPP_MICROSERVICE_TOKEN`: token interno Flask -> microservico.
- `DATABASE_PATH`: caminho do banco SQLite.
- `WHATSAPP_SESSIONS_DIR`: pasta persistente de sessoes WhatsApp.
- `ENABLE_BACKGROUND_JOBS`: liga/desliga jobs agendados.

### Observacao importante (dev local)

O `app/app.py` carrega `.env` dentro da pasta `app/`.
Para desenvolvimento local sem Docker, copie as variaveis para `app/.env`.

## Execucao Local (Desenvolvimento)

### 1) Backend Flask

```bash
cd app
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env

# Opcao recomendada para casar com fallback do frontend:
PORT=5002 python app.py
```

Backend em: `http://localhost:5002`

### 2) Frontend React

Em outro terminal:

```bash
cd app
npm install

# Se backend estiver em outra porta, ajuste:
# export VITE_API_URL=http://localhost:5000/api

npm run dev
```

Frontend em: `http://localhost:5173`

### 3) WhatsApp service (opcional em dev)

Em outro terminal:

```bash
cd whatsapp-service
cp .env.example .env
npm install
npm run dev
```

Garanta compatibilidade de token/URL entre backend e microservico:
- `WHATSAPP_MICROSERVICE_URL` (backend)
- `WHATSAPP_MICROSERVICE_TOKEN` (backend)
- `WHATSAPP_SERVICE_API_KEY` (microservico)

## Execucao com Docker Compose

```bash
cp .env.example .env
mkdir -p data uploads logs whatsapp-sessions
docker compose -f docker-compose.prod.yml up --build -d
```

Ou com comando legado:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

Endpoints comuns:
- Frontend: `http://localhost`
- Health API: `http://localhost/api/health`

## Deploy no Railway

Arquivos principais de deploy:
- `Dockerfile.railway`
- `railway.toml`
- `start-railway.sh`

Fluxo resumido:
1. Configure variaveis no projeto Railway.
2. Configure volume persistente para banco/sessoes (recomendado).
3. Faca deploy via GitHub ou Railway CLI.

Script auxiliar existente:

```bash
./deploy-railway.sh
```

Healthcheck configurado:
- `/api/health`

## Banco de Dados e Inicializacao

- A inicializacao ocorre no startup do backend (`init_db()`).
- O sistema cria tabelas e aplica migracoes incrementais automaticamente.
- Se `DATABASE_PATH` nao for informado, usa `app/jurispocket.db`.

### Promover usuario para superadmin

Script util na raiz:

```bash
python3 promover_superadmin.py email@dominio.com
```

## Jobs em Background

Controlados por `ENABLE_BACKGROUND_JOBS` (default: `true`).

Jobs configurados no backend:
- monitoramento PJe (cron diario);
- verificacao de prazos;
- monitoramento Datajud (00:00, 06:00, 12:00, 18:00);
- resumo diario WhatsApp (checagem por minuto);
- campanhas WhatsApp agendadas (checagem por minuto).

## Endpoints de Referencia

- **Health/Publico**
  - `GET /api/health`
  - `GET /api/config/public`

- **Auth**
  - `POST /api/auth/register`
  - `POST /api/auth/register/verify`
  - `POST /api/auth/login`
  - `GET/PUT /api/auth/me`

- **Core**
  - `clientes`, `processos`, `prazos`, `tarefas`, `financeiro`, `dashboard`

- **IA**
  - `POST /api/ia/chat`
  - `GET /api/ia/historico`
  - `GET /api/ia/auditoria`

- **WhatsApp**
  - conexao, status, QR code, inbox, automacoes, envios

- **Admin**
  - `/api/admin/*` para estatisticas, usuarios, planos, assinaturas, backup etc.

## Troubleshooting

- **Frontend nao conecta na API**
  - confira `VITE_API_URL`;
  - valide porta do backend (`PORT`).

- **IA nao responde**
  - configure `GROQ_API_KEY` ou `OPENAI_API_KEY`.

- **WhatsApp sem conectar**
  - valide token interno entre Flask e microservico;
  - confira `WHATSAPP_MICROSERVICE_URL`;
  - persista `WHATSAPP_SESSIONS_DIR`.

- **Datajud sem retorno**
  - valide `DATAJUD_API_KEY`;
  - verifique logs do backend/job.

- **Erro no boot por jobs**
  - teste com `ENABLE_BACKGROUND_JOBS=false` para isolar.

---

Projeto interno do JurisPocket. Ajuste este README conforme evolucao das regras de negocio e da infraestrutura.
