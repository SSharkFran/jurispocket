"""
JurisPocket - Sistema de Gestão de Processos Jurídicos
Backend Flask com 4 funcionalidades avançadas:
1. Robô PJe Monitor
2. Gerenciador de Tarefas
3. Compartilhamento WhatsApp
4. Assistente IA Integrado
"""

# Carrega variáveis de ambiente do arquivo .env (manualmente, sem biblioteca externa)
import os

def load_env_file(filepath):
    """Carrega variáveis de ambiente de um arquivo .env"""
    if not os.path.exists(filepath):
        return False
    
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            # Ignora comentários e linhas vazias
            if not line or line.startswith('#'):
                continue
            # Divide em chave=valor
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"\'')  # Remove aspas
                # Só define se ainda não existe
                if key not in os.environ:
                    os.environ[key] = value
    return True

env_path = os.path.join(os.path.dirname(__file__), '.env')
if load_env_file(env_path):
    print(f"✅ Arquivo .env carregado: {env_path}")
else:
    print(f"⚠️ Arquivo .env não encontrado em: {env_path}")
import re
import json
import sqlite3
import hashlib
import hmac
import secrets
import threading
from datetime import datetime, timedelta
from functools import wraps
from typing import Optional, List, Dict, Any

from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
import jwt
from werkzeug.utils import secure_filename
from apscheduler.schedulers.background import BackgroundScheduler
import requests
from openai import OpenAI
from docxtpl import DocxTemplate
from docx import Document

# ============================================================================
# IMPORTAÇÃO DO SERVIÇO WHATSAPP
# ============================================================================
try:
    from services.whatsapp_service import (
        whatsapp_service,
        enviar_boas_vindas,
        enviar_link_publico,
        notificar_nova_movimentacao,
        notificar_novo_prazo,
    )
    WHATSAPP_SERVICE_DISPONIVEL = True
except Exception as e:
    WHATSAPP_SERVICE_DISPONIVEL = False
    whatsapp_service = None
    enviar_boas_vindas = None
    enviar_link_publico = None
    notificar_nova_movimentacao = None
    notificar_novo_prazo = None
    print(f"⚠️  Aviso: Serviço de WhatsApp não disponível: {e}")

# ============================================================================
# IMPORTAÇÃO DO SERVIÇO DE EMAIL
# ============================================================================
try:
    from services.email_service import (
        email_service,
        notificador_email,
        notificar_movimentacao_email,
        notificar_prazo_email,
        notificar_tarefa_email,
    )
    # Configura a conexão com o banco
    EMAIL_SERVICE_DISPONIVEL = True
except ImportError as e:
    EMAIL_SERVICE_DISPONIVEL = False
    print(f"⚠️  Aviso: Serviço de email não disponível: {e}")

# ============================================================================
# IMPORTAÇÃO DO WORKER DATAJUD (Monitoramento Automático)
# ============================================================================
try:
    from datajud_worker import executar_monitoramento_datajud
    DATAJUD_WORKER_DISPONIVEL = True
except ImportError:
    DATAJUD_WORKER_DISPONIVEL = False
    print("⚠️ Aviso: Módulo datajud_worker não encontrado. Usando job integrado.")

# Configurações
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    },
    r"/publico/*": {
        "origins": ["*"],
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"],
    }
})
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Caminho do banco de dados (permite usar volume persistente em produção)
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), 'jurispocket.db')
app.config['DATABASE'] = os.environ.get('DATABASE_PATH', DEFAULT_DB_PATH)

app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Token opcional para bootstrap seguro de superadmin
SUPERADMIN_BOOTSTRAP_TOKEN = os.environ.get('SUPERADMIN_BOOTSTRAP_TOKEN')

# Session key global do WhatsApp oficial da plataforma
PLATFORM_WHATSAPP_SESSION_KEY = os.environ.get('WHATSAPP_PLATFORM_SESSION_KEY', 'platform')

# ============================================================================
# CONFIGURAÇÃO DE IA - OpenAI ou Groq
# ============================================================================

# OpenAI API Key (opcional)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Groq API Key (alternativa gratuita recomendada)
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_API_URL = os.environ.get('GROQ_API_URL', 'https://api.groq.com/openai/v1')

# Inicializa cliente de IA (prioridade: Groq > OpenAI)
ia_client = None
ia_provider = None

if GROQ_API_KEY:
    try:
        # Configuração sem proxies para evitar erros de compatibilidade
        import httpx
        http_client = httpx.Client(timeout=60.0)
        ia_client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url=GROQ_API_URL,
            http_client=http_client
        )
        ia_provider = 'groq'
        print(f"✅ IA Client configurado: Groq (API compatível)")
    except Exception as e:
        print(f"⚠️  Erro ao configurar Groq: {e}")

if not ia_client and OPENAI_API_KEY:
    try:
        import httpx
        http_client = httpx.Client(timeout=60.0)
        ia_client = OpenAI(
            api_key=OPENAI_API_KEY,
            http_client=http_client
        )
        ia_provider = 'openai'
        print(f"✅ IA Client configurado: OpenAI")
    except Exception as e:
        print(f"⚠️  Erro ao configurar OpenAI: {e}")

if not ia_client:
    print("⚠️  Nenhum cliente de IA configurado. Configure GROQ_API_KEY ou OPENAI_API_KEY no .env")
    print("   💡 Recomendamos Groq (gratuito): https://console.groq.com")

# Alias para compatibilidade com código existente
openai_client = ia_client

# Verifica API Key do Datajud
datajud_api_key = os.environ.get('DATAJUD_API_KEY', '')
if datajud_api_key:
    masked = datajud_api_key[:8] + '...' + datajud_api_key[-8:] if len(datajud_api_key) > 16 else '****'
    print(f"✅ DATAJUD_API_KEY configurada: {masked}")
else:
    print("⚠️  DATAJUD_API_KEY não configurada! Configure no arquivo .env ou variável de ambiente.")

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Error handler to ensure CORS headers on errors
@app.errorhandler(Exception)
def handle_exception(e):
    """Ensure CORS headers are present even on errors"""
    response = jsonify({'error': str(e)})
    response.status_code = 500
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    return response

# ============================================================================
# DATABASE
# ============================================================================

def get_db():
    """Get database connection"""
    if 'db' not in g:
        g.db = sqlite3.connect(app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
    return g.db

# Configura o serviço de email com acesso ao banco
if EMAIL_SERVICE_DISPONIVEL:
    notificador_email.get_db = get_db
    if email_service.is_configured():
        print(f"✅ Serviço de Email configurado: {email_service.smtp_host}")
    else:
        print("⚠️  Serviço de Email não configurado. Adicione SMTP_HOST, SMTP_USER e SMTP_PASS no .env")

@app.teardown_appcontext
def close_db(exception):
    """Close database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize database with all tables"""
    db = get_db()
    
    # Workspaces
    db.execute('''
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Users
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            telefone TEXT,
            oab TEXT,
            avatar_url TEXT,
            alerta_email BOOLEAN DEFAULT 1,
            alerta_whatsapp BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')
    
    # Convites
    db.execute('''
        CREATE TABLE IF NOT EXISTS convites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            token TEXT UNIQUE NOT NULL,
            invited_by INTEGER NOT NULL,
            accepted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (invited_by) REFERENCES users (id)
        )
    ''')
    
    # Clientes
    db.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            email TEXT,
            telefone TEXT,
            cpf_cnpj TEXT,
            rg_ie TEXT,
            data_nascimento TEXT,
            nacionalidade TEXT DEFAULT 'Brasileiro(a)',
            estado_civil TEXT,
            profissao TEXT,
            endereco TEXT,
            numero TEXT,
            complemento TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            cep TEXT,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')
    
    # Migração: Adicionar colunas novas se não existirem
    try:
        db.execute("SELECT bairro FROM clientes LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE clientes ADD COLUMN bairro TEXT")
        print("Coluna bairro adicionada")
    
    try:
        db.execute("SELECT nacionalidade FROM clientes LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE clientes ADD COLUMN nacionalidade TEXT DEFAULT 'Brasileiro(a)'")
        print("Coluna nacionalidade adicionada")
    
    try:
        db.execute("SELECT numero FROM clientes LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE clientes ADD COLUMN numero TEXT")
        print("Coluna numero adicionada")
    
    try:
        db.execute("SELECT complemento FROM clientes LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE clientes ADD COLUMN complemento TEXT")
        print("Coluna complemento adicionada")
    
    # Processos
    db.execute('''
        CREATE TABLE IF NOT EXISTS processos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            cliente_id INTEGER NOT NULL,
            numero TEXT NOT NULL,
            numero_cnj TEXT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            tipo TEXT,
            status TEXT DEFAULT 'ativo',
            comarca TEXT,
            vara TEXT,
            valor_causa REAL,
            fase TEXT,             -- Fase processual
            data_abertura TEXT,
            ultimo_movimento TEXT,
            ultimo_movimento_data TIMESTAMP,
            pje_url TEXT,
            tribunal_codigo TEXT,  -- Sigla do tribunal (TJSP, TRF1, etc)
            tribunal_nome TEXT,    -- Nome completo do tribunal
            tribunal_uf TEXT,      -- UF do estado (para tribunais estaduais)
            public_token TEXT,     -- Token único para acesso público ao processo
            public_link_enabled BOOLEAN DEFAULT 0,  -- Se o link público está ativado
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        )
    ''')
    
    # Prazos
    db.execute('''
        CREATE TABLE IF NOT EXISTS prazos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            data_prazo TEXT NOT NULL,
            descricao TEXT,
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id)
        )
    ''')
    
    # Tarefas
    db.execute('''
        CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER,
            assigned_to INTEGER,
            titulo TEXT NOT NULL,
            descricao TEXT,
            prioridade TEXT DEFAULT 'media',
            status TEXT DEFAULT 'pendente',
            data_vencimento TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id),
            FOREIGN KEY (assigned_to) REFERENCES users (id)
        )
    ''')
    
    # Documentos
    db.execute('''
        CREATE TABLE IF NOT EXISTS documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER,
            cliente_id INTEGER,
            nome TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id),
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        )
    ''')

    # Migração: adicionar colunas usadas pelo financeiro em documentos
    try:
        db.execute("SELECT financeiro_id FROM documentos LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE documentos ADD COLUMN financeiro_id INTEGER")
    try:
        db.execute("SELECT categoria FROM documentos LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE documentos ADD COLUMN categoria TEXT")
    try:
        db.execute("SELECT descricao FROM documentos LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE documentos ADD COLUMN descricao TEXT")
    try:
        db.execute("SELECT uploaded_by FROM documentos LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE documentos ADD COLUMN uploaded_by INTEGER")
    
    # Financeiro
    db.execute('''
        CREATE TABLE IF NOT EXISTS financeiro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER,
            cliente_id INTEGER,
            tipo TEXT NOT NULL,
            categoria TEXT,
            valor REAL NOT NULL,
            data TEXT NOT NULL,
            descricao TEXT,
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id),
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        )
    ''')
    
    # PJe Monitor Logs
    db.execute('''
        CREATE TABLE IF NOT EXISTS pje_monitor_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER NOT NULL,
            numero_processo TEXT NOT NULL,
            movimento_encontrado TEXT,
            data_movimento TIMESTAMP,
            sucesso BOOLEAN DEFAULT 0,
            erro TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id)
        )
    ''')
    
    # ============================================================================
    # TABELAS DO MONITORAMENTO DATAJUD (NOVO)
    # ============================================================================
    
    # Movimentações de Processos (integração Datajud)
    db.execute('''
        CREATE TABLE IF NOT EXISTS movimentacoes_processo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER NOT NULL,
            codigo_movimento INTEGER NOT NULL,
            nome_movimento TEXT NOT NULL,
            data_movimento TIMESTAMP NOT NULL,
            complementos TEXT, -- JSON string com complementos tabelados
            fonte TEXT DEFAULT 'datajud', -- datajud, manual, etc
            lida BOOLEAN DEFAULT 0, -- Flag para movimentações novas/não lidas
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id),
            UNIQUE(processo_id, codigo_movimento, data_movimento)
        )
    ''')
    
    # Alertas e Notificações de Movimentações
    db.execute('''
        CREATE TABLE IF NOT EXISTS alertas_notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER NOT NULL,
            movimentacao_id INTEGER,
            tipo TEXT DEFAULT 'movimentacao', -- movimentacao, prazo, audiencia, etc
            titulo TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            lido BOOLEAN DEFAULT 0,
            user_id INTEGER, -- se NULL = alerta para todos do workspace
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_leitura TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id),
            FOREIGN KEY (movimentacao_id) REFERENCES movimentacoes_processo (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Configurações de Monitoramento por Processo
    db.execute('''
        CREATE TABLE IF NOT EXISTS processo_monitor_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            processo_id INTEGER NOT NULL UNIQUE,
            workspace_id INTEGER NOT NULL,
            monitorar_datajud BOOLEAN DEFAULT 1,
            frequencia_verificacao TEXT DEFAULT 'diaria', -- diaria, semanal, manual
            ultima_verificacao TIMESTAMP,
            ultimo_movimento_datajud TIMESTAMP,
            total_movimentacoes INTEGER DEFAULT 0,
            api_key_datajud TEXT, -- opcional: chave específica do processo
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id)
        )
    ''')
    
    # Log de Consultas Datajud
    db.execute('''
        CREATE TABLE IF NOT EXISTS datajud_consulta_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER NOT NULL,
            numero_processo TEXT NOT NULL,
            tribunal_sigla TEXT,
            endpoint_usado TEXT,
            status_consulta TEXT, -- sucesso, erro, vazio
            movimentacoes_encontradas INTEGER DEFAULT 0,
            movimentacoes_novas INTEGER DEFAULT 0,
            erro_msg TEXT,
            tempo_resposta_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id)
        )
    ''')
    
    # Chat History (for AI Assistant)
    db.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Templates de Documentos
    db.execute('''
        CREATE TABLE IF NOT EXISTS templates_documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
            tipo_arquivo TEXT DEFAULT 'texto',
            caminho_arquivo TEXT,
            categoria TEXT DEFAULT 'geral',
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')
    
    # Migração: Adicionar colunas tipo_arquivo e caminho_arquivo se não existirem
    try:
        db.execute("SELECT tipo_arquivo FROM templates_documentos LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE templates_documentos ADD COLUMN tipo_arquivo TEXT DEFAULT 'texto'")
        print("Coluna tipo_arquivo adicionada")
    
    try:
        db.execute("SELECT caminho_arquivo FROM templates_documentos LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE templates_documentos ADD COLUMN caminho_arquivo TEXT")
        print("Coluna caminho_arquivo adicionada")
    
    # Planos de Assinatura
    db.execute('''
        CREATE TABLE IF NOT EXISTS planos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            codigo TEXT UNIQUE NOT NULL,
            descricao TEXT,
            preco_mensal REAL NOT NULL,
            preco_anual REAL,
            recursos TEXT, -- JSON com recursos do plano
            limites TEXT, -- JSON com limites (processos, clientes, etc)
            ativo BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Assinaturas dos Workspaces
    db.execute('''
        CREATE TABLE IF NOT EXISTS assinaturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            plano_id INTEGER NOT NULL,
            status TEXT DEFAULT 'ativo', -- ativo, cancelado, suspenso, pendente
            ciclo TEXT DEFAULT 'mensal', -- mensal, anual
            valor REAL NOT NULL,
            data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_renovacao TIMESTAMP,
            data_cancelamento TIMESTAMP,
            metodo_pagamento TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (plano_id) REFERENCES planos (id)
        )
    ''')
    
    # Histórico de Pagamentos de Assinaturas
    db.execute('''
        CREATE TABLE IF NOT EXISTS assinaturas_pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assinatura_id INTEGER NOT NULL,
            workspace_id INTEGER NOT NULL,
            valor_pago REAL NOT NULL,
            data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            mes_referencia TEXT NOT NULL, -- formato: 2024-01
            metodo_pagamento TEXT, -- pix, cartao, boleto, transferencia
            status TEXT DEFAULT 'confirmado', -- confirmado, pendente, cancelado
            comprovante_path TEXT, -- caminho do arquivo de comprovante
            observacoes TEXT,
            registrado_por INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assinatura_id) REFERENCES assinaturas (id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (registrado_por) REFERENCES users (id)
        )
    ''')
    
    # Configurações Globais do Sistema
    db.execute('''
        CREATE TABLE IF NOT EXISTS configuracoes_globais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT,
            descricao TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (updated_by) REFERENCES users (id)
        )
    ''')
    
    # Logs de Auditoria
    db.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, -- Quem fez a ação
            user_nome TEXT,
            user_email TEXT,
            acao TEXT NOT NULL, -- criar, editar, excluir, login, etc
            entidade TEXT NOT NULL, -- tabela/entidade afetada
            entidade_id INTEGER, -- ID do registro afetado
            dados_anteriores TEXT, -- JSON com dados antes
            dados_novos TEXT, -- JSON com dados depois
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Cupons de Desconto
    db.execute('''
        CREATE TABLE IF NOT EXISTS cupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            tipo TEXT DEFAULT 'percentual', -- percentual, valor_fixo
            valor REAL NOT NULL,
            limite_uso INTEGER, -- NULL = ilimitado
            usos_atual INTEGER DEFAULT 0,
            data_inicio TIMESTAMP,
            data_expiracao TIMESTAMP,
            planos_validos TEXT, -- JSON com IDs dos planos (NULL = todos)
            ativo BOOLEAN DEFAULT 1,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')
    
    # Inserir planos padrão se não existirem
    planos_padrao = [
        ('gratuito', 'Gratuito', 'Plano gratuito com recursos básicos', 0, 0, 
         '{"processos": 10, "clientes": 20, "usuarios": 2, "armazenamento": 104857600}',
         '["clientes", "processos", "prazos", "tarefas", "dashboard"]'),
        ('pro', 'Pro', 'Plano profissional para advogados individuais', 97, 970,
         '{"processos": -1, "clientes": -1, "usuarios": 5, "armazenamento": 1073741824}',
         '["clientes", "processos", "prazos", "tarefas", "dashboard", "ia", "pje", "equipe", "templates", "documentos", "financeiro", "whatsapp", "relatorios"]'),
        ('escritorio', 'Escritório', 'Plano para escritórios de advocacia', 297, 2970,
         '{"processos": -1, "clientes": -1, "usuarios": -1, "armazenamento": 10737418240}',
         '["clientes", "processos", "prazos", "tarefas", "dashboard", "ia", "pje", "equipe", "templates", "documentos", "financeiro", "whatsapp", "relatorios"]')
    ]
    
    for codigo, nome, descricao, preco_mensal, preco_anual, limites, recursos in planos_padrao:
        db.execute('''
            INSERT OR IGNORE INTO planos (codigo, nome, descricao, preco_mensal, preco_anual, limites, recursos)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (codigo, nome, descricao, preco_mensal, preco_anual, limites, recursos))
    
    # Configurações globais padrão
    configs_padrao = [
        ('modo_manutencao', 'false', 'Coloca o sistema em modo de manutenção'),
        ('limite_processos_free', '10', 'Limite de processos para plano gratuito'),
        ('limite_clientes_free', '20', 'Limite de clientes para plano gratuito'),
        ('limite_usuarios_free', '2', 'Limite de usuários para plano gratuito'),
        ('max_upload_size', '52428800', 'Tamanho máximo de upload em bytes (50MB)'),
    ]
    
    for chave, valor, descricao in configs_padrao:
        db.execute('''
            INSERT OR IGNORE INTO configuracoes_globais (chave, valor, descricao)
            VALUES (?, ?, ?)
        ''', (chave, valor, descricao))
    
    # Notificações
    db.execute('''
        CREATE TABLE IF NOT EXISTS notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            workspace_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            tipo TEXT DEFAULT 'info',
            link TEXT,
            lida BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES users (id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')

    # Configuração de automações WhatsApp por workspace
    db.execute('''
        CREATE TABLE IF NOT EXISTS workspace_whatsapp_config (
            workspace_id INTEGER PRIMARY KEY,
            sender_user_id INTEGER,
            auto_nova_movimentacao BOOLEAN DEFAULT 1,
            auto_novo_prazo BOOLEAN DEFAULT 1,
            auto_lembrete_prazo BOOLEAN DEFAULT 1,
            auto_nova_tarefa BOOLEAN DEFAULT 1,
            reminder_days TEXT DEFAULT '7,3,1,0',
            auto_resumo_diario BOOLEAN DEFAULT 0,
            daily_summary_time TEXT DEFAULT '18:00',
            ai_generate_messages BOOLEAN DEFAULT 0,
            ai_prompt TEXT,
            updated_by INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (sender_user_id) REFERENCES users (id),
            FOREIGN KEY (updated_by) REFERENCES users (id)
        )
    ''')

    # Log para evitar disparos duplicados de automação
    db.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_automacao_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            marker TEXT NOT NULL,
            payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(workspace_id, tipo, entity_type, entity_id, marker),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')

    # Configuracao do WhatsApp oficial da plataforma (um unico registro)
    db.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_platform_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            session_key TEXT NOT NULL,
            display_name TEXT,
            phone_number TEXT,
            enabled BOOLEAN DEFAULT 1,
            updated_by INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (updated_by) REFERENCES users (id)
        )
    ''')

    # Configuracao do WhatsApp do workspace (uso exclusivo com clientes)
    db.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_workspace_config (
            workspace_id INTEGER PRIMARY KEY,
            session_key TEXT NOT NULL,
            display_name TEXT,
            phone_number TEXT,
            enabled BOOLEAN DEFAULT 1,
            updated_by INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (updated_by) REFERENCES users (id)
        )
    ''')

    # Log de mensagens WhatsApp (plataforma e workspace)
    db.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_message_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER,
            client_id INTEGER,
            user_id INTEGER,
            channel TEXT NOT NULL, -- platform | workspace
            direction TEXT NOT NULL, -- inbound | outbound
            sender_key TEXT,
            sender_phone TEXT,
            recipient_phone TEXT,
            message_text TEXT,
            provider_message_id TEXT,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (client_id) REFERENCES clientes (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    db.execute(
        '''INSERT OR IGNORE INTO whatsapp_platform_config (id, session_key, enabled)
           VALUES (1, ?, 1)''',
        (PLATFORM_WHATSAPP_SESSION_KEY,),
    )
    
    # Templates de Documentos (código duplicado removido - já criado acima)
    
    # Migration: Adicionar coluna 'lida' na tabela movimentacoes_processo se não existir
    try:
        db.execute('SELECT lida FROM movimentacoes_processo LIMIT 1')
    except:
        db.execute('ALTER TABLE movimentacoes_processo ADD COLUMN lida BOOLEAN DEFAULT 0')
    
    # Migration: Adicionar colunas tribunal_codigo, tribunal_nome e tribunal_uf na tabela processos
    try:
        db.execute('SELECT tribunal_codigo FROM processos LIMIT 1')
    except:
        db.execute('ALTER TABLE processos ADD COLUMN tribunal_codigo TEXT')
    try:
        db.execute('SELECT tribunal_nome FROM processos LIMIT 1')
    except:
        db.execute('ALTER TABLE processos ADD COLUMN tribunal_nome TEXT')
    try:
        db.execute('SELECT tribunal_uf FROM processos LIMIT 1')
    except:
        db.execute('ALTER TABLE processos ADD COLUMN tribunal_uf TEXT')
    
    # Migration: Adicionar colunas public_token e public_link_enabled na tabela processos
    try:
        db.execute('SELECT public_token FROM processos LIMIT 1')
    except:
        db.execute('ALTER TABLE processos ADD COLUMN public_token TEXT')
    try:
        db.execute('SELECT public_link_enabled FROM processos LIMIT 1')
    except:
        db.execute('ALTER TABLE processos ADD COLUMN public_link_enabled BOOLEAN DEFAULT 0')
    
    # Migration: Adicionar coluna fase na tabela processos
    try:
        db.execute('SELECT fase FROM processos LIMIT 1')
    except:
        db.execute('ALTER TABLE processos ADD COLUMN fase TEXT')

    # Migration: garantir colunas novas em workspace_whatsapp_config
    try:
        db.execute('SELECT auto_nova_tarefa FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute('ALTER TABLE workspace_whatsapp_config ADD COLUMN auto_nova_tarefa BOOLEAN DEFAULT 1')
    try:
        db.execute('SELECT ai_generate_messages FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute('ALTER TABLE workspace_whatsapp_config ADD COLUMN ai_generate_messages BOOLEAN DEFAULT 0')
    try:
        db.execute('SELECT ai_prompt FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute('ALTER TABLE workspace_whatsapp_config ADD COLUMN ai_prompt TEXT')
    try:
        db.execute('SELECT reminder_days FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute("ALTER TABLE workspace_whatsapp_config ADD COLUMN reminder_days TEXT DEFAULT '7,3,1,0'")
    try:
        db.execute('SELECT sender_user_id FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute('ALTER TABLE workspace_whatsapp_config ADD COLUMN sender_user_id INTEGER')
    try:
        db.execute('SELECT updated_by FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute('ALTER TABLE workspace_whatsapp_config ADD COLUMN updated_by INTEGER')
    try:
        db.execute('SELECT updated_at FROM workspace_whatsapp_config LIMIT 1')
    except:
        db.execute('ALTER TABLE workspace_whatsapp_config ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

    db.commit()

# Initialize database on startup
print("🚀 Iniciando JurisPocket...")
try:
    with app.app_context():
        init_db()
    print("✅ Banco de dados inicializado com sucesso")
except Exception as e:
    print(f"⚠️ Erro ao inicializar banco de dados: {e}")
    print("   A aplicação continuará rodando, mas funcionalidades podem não funcionar corretamente")

# ============================================================================
# AUTHENTICATION
# ============================================================================

def hash_senha(senha: str) -> str:
    """Gera hash SHA-256 simples (compatível com o sistema de login desejado)."""
    return hashlib.sha256(senha.encode()).hexdigest()


def gerar_jwt_token(user_id: int, workspace_id: int, is_admin: bool = False) -> str:
    """Gera token JWT para autenticação (7 dias de validade)."""
    payload = {
        'user_id': user_id,
        'workspace_id': workspace_id,
        'is_admin': is_admin,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def decode_jwt_token(token: str) -> Optional[Dict]:
    """Decodifica token JWT retornando payload ou None se inválido/expirado."""
    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(f):
    """Decorator para rotas que requerem autenticação.

    Decodifica o JWT, carrega o usuário do banco e popola `g.auth` com:
    `{ 'user_id', 'workspace_id', 'is_admin', 'role', 'user' }`.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401

        token = auth_header[7:]
        payload = decode_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Unauthorized'}), 401

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (payload['user_id'],)).fetchone()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        g.auth = {
            'user_id': payload.get('user_id'),
            'workspace_id': payload.get('workspace_id'),
            'is_admin': payload.get('is_admin', False),
            'role': user['role'] if 'role' in user.keys() else None,
            'user': dict(user)
        }

        return f(*args, **kwargs)

    return decorated


def require_admin(f):
    """Decorator para rotas que requerem privilégios de admin.

    Aceita tanto o payload `is_admin` do JWT quanto roles `admin`/`superadmin` no DB.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401

        token = auth_header[7:]
        payload = decode_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Unauthorized'}), 401

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (payload['user_id'],)).fetchone()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        is_admin = payload.get('is_admin', False) or (user.get('role') in ['admin', 'superadmin'])

        if not is_admin:
            return jsonify({'error': 'Forbidden'}), 403

        g.auth = {
            'user_id': payload.get('user_id'),
            'workspace_id': payload.get('workspace_id'),
            'is_admin': True,
            'role': user['role'] if 'role' in user.keys() else None,
            'user': dict(user)
        }

        return f(*args, **kwargs)

    return decorated


def require_superadmin(f):
    """Decorator para rotas que requerem privilégios de Super Admin.
    
    Apenas usuários com role 'superadmin' podem acessar.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401

        token = auth_header[7:]
        payload = decode_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Unauthorized'}), 401

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (payload['user_id'],)).fetchone()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        # Verifica se é superadmin
        user_dict = dict(user)
        if user_dict.get('role') != 'superadmin':
            return jsonify({'error': 'Forbidden - Super Admin required'}), 403

        g.auth = {
            'user_id': payload.get('user_id'),
            'workspace_id': payload.get('workspace_id'),
            'is_admin': True,
            'is_superadmin': True,
            'role': user_dict.get('role'),
            'user': user_dict
        }

        return f(*args, **kwargs)

    return decorated


def verificar_recurso_workspace(workspace_id: int, recurso: str) -> tuple:
    """Verifica se o workspace tem acesso a um recurso específico.
    
    Retorna (permitido: bool, plano_codigo: str, recursos: list)
    """
    db = get_db()
    
    # Buscar plano do workspace
    assinatura = db.execute('''
        SELECT p.codigo, p.recursos FROM assinaturas a
        JOIN planos p ON a.plano_id = p.id
        WHERE a.workspace_id = ? AND a.status = 'ativo'
        ORDER BY a.created_at DESC LIMIT 1
    ''', (workspace_id,)).fetchone()
    
    # Se não tem assinatura ativa, assume plano gratuito
    if not assinatura:
        plano_codigo = 'gratuito'
        recursos = []
    else:
        plano_codigo = assinatura['codigo']
        recursos = json.loads(assinatura['recursos'] or '[]')
    
    # Verifica se tem o recurso
    permitido = recurso in recursos
    
    return permitido, plano_codigo, recursos


def require_recurso(recurso: str):
    """Decorator para rotas que requerem um recurso específico do plano.
    
    Exemplo de uso:
        @app.route('/api/ia/chat')
        @require_auth
        @require_recurso('ia')
        def chat_ia():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'auth') or not g.auth.get('workspace_id'):
                return jsonify({'error': 'Unauthorized'}), 401
            
            workspace_id = g.auth['workspace_id']
            permitido, plano_codigo, _ = verificar_recurso_workspace(workspace_id, recurso)
            
            if not permitido:
                return jsonify({
                    'error': 'Recurso não disponível no seu plano',
                    'message': f'O recurso "{recurso}" está disponível apenas no plano Pro.',
                    'plano_atual': plano_codigo,
                    'sugestao': 'Faça upgrade para o plano Pro para desbloquear este recurso.'
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


def registrar_audit_log(acao, entidade, entidade_id=None, dados_anteriores=None, dados_novos=None):
    """Registra uma ação no log de auditoria."""
    try:
        db = get_db()
        user_id = g.auth.get('user_id') if hasattr(g, 'auth') else None
        user_nome = g.auth.get('user', {}).get('nome') if hasattr(g, 'auth') else None
        user_email = g.auth.get('user', {}).get('email') if hasattr(g, 'auth') else None
        
        db.execute('''
            INSERT INTO audit_logs 
            (user_id, user_nome, user_email, acao, entidade, entidade_id, 
             dados_anteriores, dados_novos, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            user_nome,
            user_email,
            acao,
            entidade,
            entidade_id,
            json.dumps(dados_anteriores) if dados_anteriores else None,
            json.dumps(dados_novos) if dados_novos else None,
            request.remote_addr,
            request.headers.get('User-Agent')
        ))
        db.commit()
    except Exception as e:
        print(f"Erro ao registrar audit log: {e}")


# ============================================================================
# PJe MONITOR
# ============================================================================

class PJeMonitor:
    """Monitor de processos PJe com web scraping educacional"""
    
    # Mapeamento de tribunais para suas URLs de consulta
    TRIBUNAIS = {
        # Tribunais Regionais Federais
        'TRF1': 'https://pje.trf1.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF2': 'https://pje.trf2.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF3': 'https://pje.trf3.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF4': 'https://pje.trf4.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF5': 'https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF6': 'https://pje.trf6.jus.br/pje/ConsultaPublica/listView.seam',
        
        # Justiça do Trabalho
        'TST': 'https://pje.tst.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT1': 'https://pje.trt1.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT2': 'https://pje.trt2.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT3': 'https://pje.trt3.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT4': 'https://pje.trt4.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT5': 'https://pje.trt5.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT6': 'https://pje.trt6.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT7': 'https://pje.trt7.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT8': 'https://pje.trt8.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT9': 'https://pje.trt9.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT10': 'https://pje.trt10.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT11': 'https://pje.trt11.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT12': 'https://pje.trt12.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT13': 'https://pje.trt13.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT14': 'https://pje.trt14.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT15': 'https://pje.trt15.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT16': 'https://pje.trt16.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT17': 'https://pje.trt17.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT18': 'https://pje.trt18.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT19': 'https://pje.trt19.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT20': 'https://pje.trt20.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT21': 'https://pje.trt21.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT22': 'https://pje.trt22.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT23': 'https://pje.trt23.jus.br/pje/ConsultaPublica/listView.seam',
        'TRT24': 'https://pje.trt24.jus.br/pje/ConsultaPublica/listView.seam',
        
        # Justiça Estadual (principais)
        'TJSP': 'https://pje.tjsp.jus.br/ConsultaPublica/ConsultaPublica/listView.seam',
        'TJRJ': 'https://pje.tjrj.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMG': 'https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam',
        'TJRS': 'https://pje.tjrs.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPR': 'https://pje.tjpr.jus.br/pje/ConsultaPublica/listView.seam',
        'TJSC': 'https://pje.tjsc.jus.br/pje/ConsultaPublica/listView.seam',
        'TJBA': 'https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam',
        'TJGO': 'https://pje.tjgo.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPE': 'https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam',
        'TJCE': 'https://pje.tjce.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPA': 'https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam',
        'TJAM': 'https://pje.tjam.jus.br/pje/ConsultaPublica/listView.seam',
        'TJRO': 'https://pje.tjro.jus.br/pje/ConsultaPublica/listView.seam',
        'TJAC': 'https://pje.tjac.jus.br/pje/ConsultaPublica/listView.seam',
        'TJAP': 'https://pje.tjap.jus.br/pje/ConsultaPublica/listView.seam',
        'TJRR': 'https://pje.tjrr.jus.br/pje/ConsultaPublica/listView.seam',
        'TJTO': 'https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMS': 'https://pje.tjms.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMT': 'https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam',
        'TJDF': 'https://pje.tjdft.jus.br/pje/ConsultaPublica/listView.seam',
        'TJES': 'https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPB': 'https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam',
        'TJRN': 'https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam',
        'TJAL': 'https://pje.tjal.jus.br/pje/ConsultaPublica/listView.seam',
        'TJSE': 'https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMA': 'https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPI': 'https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam',
    }
    
    @staticmethod
    def identificar_tribunal(numero_processo: str) -> Optional[str]:
        """Identifica o tribunal a partir do número do processo"""
        # Remove formatação
        numero_limpo = re.sub(r'[^0-9]', '', numero_processo)
        
        if len(numero_limpo) != 20:
            return None
        
        # Extrai o código do órgão ( dígitos 14-16 )
        codigo_orgao = numero_limpo[13:16]
        
        # Mapeamento de códigos para tribunais
        codigo_map = {
            # TRFs
            '030': 'TRF3', '040': 'TRF4', '050': 'TRF5', '060': 'TRF6',
            '010': 'TRF1', '020': 'TRF2',
            # TST
            '001': 'TST',
            # TRTs
            '101': 'TRT1', '102': 'TRT2', '103': 'TRT3', '104': 'TRT4',
            '105': 'TRT5', '106': 'TRT6', '107': 'TRT7', '108': 'TRT8',
            '109': 'TRT9', '110': 'TRT10', '111': 'TRT11', '112': 'TRT12',
            '113': 'TRT13', '114': 'TRT14', '115': 'TRT15', '116': 'TRT16',
            '117': 'TRT17', '118': 'TRT18', '119': 'TRT19', '120': 'TRT20',
            '121': 'TRT21', '122': 'TRT22', '123': 'TRT23', '124': 'TRT24',
            # TJs
            '802': 'TJSP', '803': 'TJRJ', '804': 'TJMG', '805': 'TJRS',
            '806': 'TJPR', '807': 'TJSC', '808': 'TJBA', '809': 'TJGO',
            '810': 'TJPE', '811': 'TJCE', '812': 'TJPA', '813': 'TJAM',
            '814': 'TJRO', '815': 'TJAC', '816': 'TJAP', '817': 'TJRR',
            '818': 'TJTO', '819': 'TJMS', '820': 'TJMT', '821': 'TJDF',
            '822': 'TJES', '823': 'TJPB', '824': 'TJRN', '825': 'TJAL',
            '826': 'TJSE', '827': 'TJMA', '828': 'TJPI',
        }
        
        return codigo_map.get(codigo_orgao)
    
    @staticmethod
    def consultar_processo(numero_processo: str) -> Dict[str, Any]:
        """
        Consulta processo no PJe de forma educacional
        Retorna dados simulados para demonstração
        """
        tribunal = PJeMonitor.identificar_tribunal(numero_processo)
        
        if not tribunal:
            return {
                'sucesso': False,
                'erro': 'Não foi possível identificar o tribunal pelo número do processo'
            }
        
        url = PJeMonitor.TRIBUNAIS.get(tribunal)
        if not url:
            return {
                'sucesso': False,
                'erro': f'Tribunal {tribunal} não suportado'
            }
        
        # Simulação educacional - em produção, aqui seria feita a consulta real
        # com respeito aos termos de uso e rate limiting
        return {
            'sucesso': True,
            'tribunal': tribunal,
            'numero_processo': numero_processo,
            'url_consulta': url,
            'movimentos': [
                {
                    'data': datetime.now().strftime('%d/%m/%Y'),
                    'descricao': 'Processo consultado no PJe',
                    'complemento': f'Tribunal: {tribunal}'
                }
            ],
            'simulado': True,
            'mensagem': 'Esta é uma consulta simulada para fins educacionais. Em produção, a consulta real seria realizada respeitando os termos de uso do PJe.'
        }


# ============================================================================
# DATAJUD MONITOR - INTEGRAÇÃO API PÚBLICA CNJ
# ============================================================================

class DatajudMonitor:
    """
    Monitor de Processos via API Datajud (CNJ)
    Consulta processos em tribunais brasileiros usando a API pública do CNJ
    
    DOCUMENTAÇÃO:
    - URL Base: https://api-publica.datajud.cnj.jus.br
    - Autenticação: Header 'Authorization: ApiKey <SUA_CHAVE>'
    - Formato: Elasticsearch/OpenSearch
    
    CONFIGURAÇÃO:
    1. Obtenha sua API Key em: https://datajud.cnj.jus.br
    2. Configure a variável de ambiente: DATAJUD_API_KEY
    3. Ou defina diretamente na classe abaixo (não recomendado para produção)
    
    ROTEAMENTO:
    A API Datajud possui endpoints específicos por tribunal:
    - Superiores: TST, STJ, TSE, STM
    - Regionais Federais: TRF1 a TRF6
    - Estaduais: TJSP, TJRJ, TJMG, etc.
    - Trabalhistas: TRT1 a TRT24
    """
    
    # =========================================================================
    # CONFIGURAÇÃO DA API - ALTERE AQUI SUA API KEY
    # =========================================================================
    API_KEY = os.environ.get('DATAJUD_API_KEY', '')
    BASE_URL = 'https://api-publica.datajud.cnj.jus.br'
    
    # Timeout para requisições (em segundos)
    TIMEOUT = 30
    
    # =========================================================================
    # ROTEADOR DE TRIBUNAIS - ENDPOINTS DATAJUD
    # =========================================================================
    TRIBUNAIS_ENDPOINTS = {
        # Tribunais Superiores
        'TST': '/api_publica_tst/_search',
        'STJ': '/api_publica_stj/_search',
        'TSE': '/api_publica_tse/_search',
        'STM': '/api_publica_stm/_search',
        
        # Tribunais Regionais Federais
        'TRF1': '/api_publica_trf1/_search',
        'TRF2': '/api_publica_trf2/_search',
        'TRF3': '/api_publica_trf3/_search',
        'TRF4': '/api_publica_trf4/_search',
        'TRF5': '/api_publica_trf5/_search',
        'TRF6': '/api_publica_trf6/_search',
        
        # Tribunais de Justiça Estaduais (principais)
        'TJSP': '/api_publica_tjsp/_search',
        'TJRJ': '/api_publica_tjrj/_search',
        'TJMG': '/api_publica_tjmg/_search',
        'TJRS': '/api_publica_tjrs/_search',
        'TJPR': '/api_publica_tjpr/_search',
        'TJSC': '/api_publica_tjsc/_search',
        'TJBA': '/api_publica_tjba/_search',
        'TJGO': '/api_publica_tjgo/_search',
        'TJPE': '/api_publica_tjpe/_search',
        'TJCE': '/api_publica_tjce/_search',
        'TJPA': '/api_publica_tjpa/_search',
        'TJAM': '/api_publica_tjam/_search',
        'TJRO': '/api_publica_tjro/_search',
        'TJAC': '/api_publica_tjac/_search',
        'TJAP': '/api_publica_tjap/_search',
        'TJRR': '/api_publica_tjrr/_search',
        'TJTO': '/api_publica_tjto/_search',
        'TJMS': '/api_publica_tjms/_search',
        'TJMT': '/api_publica_tjmt/_search',
        'TJDF': '/api_publica_tjdft/_search',
        'TJES': '/api_publica_tjes/_search',
        'TJPB': '/api_publica_tjpb/_search',
        'TJRN': '/api_publica_tjrn/_search',
        'TJAL': '/api_publica_tjal/_search',
        'TJSE': '/api_publica_tjse/_search',
        'TJMA': '/api_publica_tjma/_search',
        'TJPI': '/api_publica_tjpi/_search',
        
        # Tribunais Regionais do Trabalho
        'TRT1': '/api_publica_trt1/_search',
        'TRT2': '/api_publica_trt2/_search',
        'TRT3': '/api_publica_trt3/_search',
        'TRT4': '/api_publica_trt4/_search',
        'TRT5': '/api_publica_trt5/_search',
        'TRT6': '/api_publica_trt6/_search',
        'TRT7': '/api_publica_trt7/_search',
        'TRT8': '/api_publica_trt8/_search',
        'TRT9': '/api_publica_trt9/_search',
        'TRT10': '/api_publica_trt10/_search',
        'TRT11': '/api_publica_trt11/_search',
        'TRT12': '/api_publica_trt12/_search',
        'TRT13': '/api_publica_trt13/_search',
        'TRT14': '/api_publica_trt14/_search',
        'TRT15': '/api_publica_trt15/_search',
        'TRT16': '/api_publica_trt16/_search',
        'TRT17': '/api_publica_trt17/_search',
        'TRT18': '/api_publica_trt18/_search',
        'TRT19': '/api_publica_trt19/_search',
        'TRT20': '/api_publica_trt20/_search',
        'TRT21': '/api_publica_trt21/_search',
        'TRT22': '/api_publica_trt22/_search',
        'TRT23': '/api_publica_trt23/_search',
        'TRT24': '/api_publica_trt24/_search',
    }
    
    # =========================================================================
    # MAPEAMENTO COMPLETO DO NPU (Novo Padrão CNJ)
    # Estrutura: NNNNNNN-DD.AAAA.J.TR.OOOO
    # J = Justiça (1 dígito), TR = Tribunal/Região (2 dígitos)
    # Código completo = J + TR (3 dígitos, índices 13:16 da string)
    # =========================================================================
    CODIGO_ORGAO_MAP = {
        # 1. TRIBUNAIS SUPERIORES (TR = 00, J define o tribunal)
        # J=3: STJ, J=5: TST, J=6: TSE, J=7: STM
        '300': 'STJ',  # Superior Tribunal de Justiça
        '500': 'TST',  # Tribunal Superior do Trabalho
        '600': 'TSE',  # Tribunal Superior Eleitoral
        '700': 'STM',  # Superior Tribunal Militar
        
        # 2. JUSTIÇA FEDERAL (J = 4)
        # TR = 01 a 06 (Regiões Federais)
        '401': 'TRF1',  # TRF 1ª Região
        '402': 'TRF2',  # TRF 2ª Região
        '403': 'TRF3',  # TRF 3ª Região
        '404': 'TRF4',  # TRF 4ª Região
        '405': 'TRF5',  # TRF 5ª Região
        '406': 'TRF6',  # TRF 6ª Região
        
        # 3. JUSTIÇA DO TRABALHO (J = 5)
        # TR = 01 a 24 (TRTs), quando TR=00 é TST (já mapeado acima)
        '501': 'TRT1',   '502': 'TRT2',   '503': 'TRT3',   '504': 'TRT4',
        '505': 'TRT5',   '506': 'TRT6',   '507': 'TRT7',   '508': 'TRT8',
        '509': 'TRT9',   '510': 'TRT10',  '511': 'TRT11',  '512': 'TRT12',
        '513': 'TRT13',  '514': 'TRT14',  '515': 'TRT15',  '516': 'TRT16',
        '517': 'TRT17',  '518': 'TRT18',  '519': 'TRT19',  '520': 'TRT20',
        '521': 'TRT21',  '522': 'TRT22',  '523': 'TRT23',  '524': 'TRT24',
        
        # 4. JUSTIÇA ELEITORAL (J = 6)
        # TR = 01 a 27 (Estados), quando TR=00 é TSE (já mapeado)
        '601': 'TRE-AC', '602': 'TRE-AL', '603': 'TRE-AM', '604': 'TRE-AP',
        '605': 'TRE-BA', '606': 'TRE-CE', '607': 'TRE-DF', '608': 'TRE-ES',
        '609': 'TRE-GO', '610': 'TRE-MA', '611': 'TRE-MT', '612': 'TRE-MS',
        '613': 'TRE-MG', '614': 'TRE-PA', '615': 'TRE-PB', '616': 'TRE-PR',
        '617': 'TRE-PE', '618': 'TRE-PI', '619': 'TRE-RJ', '620': 'TRE-RN',
        '621': 'TRE-RS', '622': 'TRE-RO', '623': 'TRE-RR', '624': 'TRE-SC',
        '625': 'TRE-SE', '626': 'TRE-SP', '627': 'TRE-TO',
        
        # 5. JUSTIÇA ESTADUAL (J = 8)
        # TR = 01 a 27 (Estados em ordem alfabética)
        '801': 'TJAC',  # Acre
        '802': 'TJAL',  # Alagoas
        '803': 'TJAM',  # Amazonas
        '804': 'TJAP',  # Amapá
        '805': 'TJBA',  # Bahia
        '806': 'TJCE',  # Ceará
        '807': 'TJDF',  # Distrito Federal
        '808': 'TJES',  # Espírito Santo
        '809': 'TJGO',  # Goiás
        '810': 'TJMA',  # Maranhão
        '811': 'TJMT',  # Mato Grosso
        '812': 'TJMS',  # Mato Grosso do Sul
        '813': 'TJMG',  # Minas Gerais
        '814': 'TJPA',  # Pará
        '815': 'TJPB',  # Paraíba
        '816': 'TJPR',  # Paraná
        '817': 'TJPE',  # Pernambuco
        '818': 'TJPI',  # Piauí
        '819': 'TJRJ',  # Rio de Janeiro
        '820': 'TJRN',  # Rio Grande do Norte
        '821': 'TJRS',  # Rio Grande do Sul
        '822': 'TJRO',  # Rondônia
        '823': 'TJRR',  # Roraima
        '824': 'TJSC',  # Santa Catarina
        '825': 'TJSE',  # Sergipe
        '826': 'TJSP',  # São Paulo
        '827': 'TJTO',  # Tocantins
        
        # 6. JUSTIÇA MILITAR ESTADUAL (J = 9)
        # Apenas 3 estados possuem TJM independente
        '913': 'TJMMG',  # Minas Gerais
        '921': 'TJMRS',  # Rio Grande do Sul
        '926': 'TJMSP',  # São Paulo
    }
    
    # Nomes completos dos tribunais para exibição
    TRIBUNAL_NOMES = {
        # Superiores
        'STJ': 'Superior Tribunal de Justiça',
        'TST': 'Tribunal Superior do Trabalho',
        'TSE': 'Tribunal Superior Eleitoral',
        'STM': 'Superior Tribunal Militar',
        # Federais
        'TRF1': 'TRF 1ª Região (AC, AM, AP, BA, MA, MT, PA, PI, RO, RR, TO)',
        'TRF2': 'TRF 2ª Região (ES, RJ)',
        'TRF3': 'TRF 3ª Região (MS, SP)',
        'TRF4': 'TRF 4ª Região (PR, RS, SC)',
        'TRF5': 'TRF 5ª Região (AL, CE, PB, PE, RN, SE)',
        'TRF6': 'TRF 6ª Região (MG)',
        # Trabalho
        'TRT1': 'TRT 1ª Região (RJ)',
        'TRT2': 'TRT 2ª Região (SP)',
        'TRT3': 'TRT 3ª Região (MG)',
        'TRT4': 'TRT 4ª Região (RS)',
        'TRT5': 'TRT 5ª Região (BA)',
        'TRT6': 'TRT 6ª Região (PE)',
        'TRT7': 'TRT 7ª Região (CE)',
        'TRT8': 'TRT 8ª Região (PA/AP)',
        'TRT9': 'TRT 9ª Região (PR)',
        'TRT10': 'TRT 10ª Região (DF/TO)',
        'TRT11': 'TRT 11ª Região (AM/RR)',
        'TRT12': 'TRT 12ª Região (SC)',
        'TRT13': 'TRT 13ª Região (PB)',
        'TRT14': 'TRT 14ª Região (RO/AC)',
        'TRT15': 'TRT 15ª Região (SC)',
        'TRT16': 'TRT 16ª Região (SE)',
        'TRT17': 'TRT 17ª Região (ES)',
        'TRT18': 'TRT 18ª Região (GO)',
        'TRT19': 'TRT 19ª Região (AL)',
        'TRT20': 'TRT 20ª Região (SE)',
        'TRT21': 'TRT 21ª Região (RN)',
        'TRT22': 'TRT 22ª Região (PI)',
        'TRT23': 'TRT 23ª Região (MT)',
        'TRT24': 'TRT 24ª Região (MS)',
        # Estaduais
        'TJAC': 'Tribunal de Justiça do Acre',
        'TJAL': 'Tribunal de Justiça de Alagoas',
        'TJAM': 'Tribunal de Justiça do Amazonas',
        'TJAP': 'Tribunal de Justiça do Amapá',
        'TJBA': 'Tribunal de Justiça da Bahia',
        'TJCE': 'Tribunal de Justiça do Ceará',
        'TJDF': 'Tribunal de Justiça do Distrito Federal',
        'TJES': 'Tribunal de Justiça do Espírito Santo',
        'TJGO': 'Tribunal de Justiça de Goiás',
        'TJMA': 'Tribunal de Justiça do Maranhão',
        'TJMG': 'Tribunal de Justiça de Minas Gerais',
        'TJMS': 'Tribunal de Justiça do Mato Grosso do Sul',
        'TJMT': 'Tribunal de Justiça do Mato Grosso',
        'TJPA': 'Tribunal de Justiça do Pará',
        'TJPB': 'Tribunal de Justiça da Paraíba',
        'TJPE': 'Tribunal de Justiça de Pernambuco',
        'TJPI': 'Tribunal de Justiça do Piauí',
        'TJPR': 'Tribunal de Justiça do Paraná',
        'TJRJ': 'Tribunal de Justiça do Rio de Janeiro',
        'TJRN': 'Tribunal de Justiça do Rio Grande do Norte',
        'TJRO': 'Tribunal de Justiça de Rondônia',
        'TJRR': 'Tribunal de Justiça de Roraima',
        'TJRS': 'Tribunal de Justiça do Rio Grande do Sul',
        'TJSC': 'Tribunal de Justiça de Santa Catarina',
        'TJSE': 'Tribunal de Justiça de Sergipe',
        'TJSP': 'Tribunal de Justiça de São Paulo',
        'TJTO': 'Tribunal de Justiça do Tocantins',
        # Eleitorais
        'TRE-AC': 'TRE do Acre',
        'TRE-AL': 'TRE de Alagoas',
        'TRE-AM': 'TRE do Amazonas',
        'TRE-AP': 'TRE do Amapá',
        'TRE-BA': 'TRE da Bahia',
        'TRE-CE': 'TRE do Ceará',
        'TRE-DF': 'TRE do Distrito Federal',
        'TRE-ES': 'TRE do Espírito Santo',
        'TRE-GO': 'TRE de Goiás',
        'TRE-MA': 'TRE do Maranhão',
        'TRE-MG': 'TRE de Minas Gerais',
        'TRE-MS': 'TRE do Mato Grosso do Sul',
        'TRE-MT': 'TRE do Mato Grosso',
        'TRE-PA': 'TRE do Pará',
        'TRE-PB': 'TRE da Paraíba',
        'TRE-PE': 'TRE de Pernambuco',
        'TRE-PI': 'TRE do Piauí',
        'TRE-PR': 'TRE do Paraná',
        'TRE-RJ': 'TRE do Rio de Janeiro',
        'TRE-RN': 'TRE do Rio Grande do Norte',
        'TRE-RO': 'TRE de Rondônia',
        'TRE-RR': 'TRE de Roraima',
        'TRE-RS': 'TRE do Rio Grande do Sul',
        'TRE-SC': 'TRE de Santa Catarina',
        'TRE-SE': 'TRE de Sergipe',
        'TRE-SP': 'TRE de São Paulo',
        'TRE-TO': 'TRE do Tocantins',
        # Militares
        'TJMMG': 'TJM de Minas Gerais',
        'TJMRS': 'TJM do Rio Grande do Sul',
        'TJMSP': 'TJM de São Paulo',
    }
    
    # Mapeamento de UF por sigla de tribunal
    TRIBUNAL_UF = {
        # Superiores (sem UF específica)
        'STJ': None,
        'TST': None,
        'TSE': None,
        'STM': None,
        # Federais (múltiplas UFs - não identificamos especificamente)
        'TRF1': None,
        'TRF2': None,
        'TRF3': None,
        'TRF4': None,
        'TRF5': None,
        'TRF6': None,
        # Trabalho (por região)
        'TRT1': 'RJ',
        'TRT2': 'SP',
        'TRT3': 'MG',
        'TRT4': 'RS',
        'TRT5': 'BA',
        'TRT6': 'PE',
        'TRT7': 'CE',
        'TRT8': 'PA',
        'TRT9': 'PR',
        'TRT10': 'DF',
        'TRT11': 'AM',
        'TRT12': 'SC',
        'TRT13': 'PB',
        'TRT14': 'RO',
        'TRT15': 'SC',
        'TRT16': 'SE',
        'TRT17': 'ES',
        'TRT18': 'GO',
        'TRT19': 'AL',
        'TRT20': 'SE',
        'TRT21': 'RN',
        'TRT22': 'PI',
        'TRT23': 'MT',
        'TRT24': 'MS',
        # Estaduais
        'TJAC': 'AC',
        'TJAL': 'AL',
        'TJAM': 'AM',
        'TJAP': 'AP',
        'TJBA': 'BA',
        'TJCE': 'CE',
        'TJDF': 'DF',
        'TJES': 'ES',
        'TJGO': 'GO',
        'TJMA': 'MA',
        'TJMG': 'MG',
        'TJMS': 'MS',
        'TJMT': 'MT',
        'TJPA': 'PA',
        'TJPB': 'PB',
        'TJPE': 'PE',
        'TJPI': 'PI',
        'TJPR': 'PR',
        'TJRJ': 'RJ',
        'TJRN': 'RN',
        'TJRO': 'RO',
        'TJRR': 'RR',
        'TJRS': 'RS',
        'TJSC': 'SC',
        'TJSE': 'SE',
        'TJSP': 'SP',
        'TJTO': 'TO',
        # Eleitorais
        'TRE-AC': 'AC',
        'TRE-AL': 'AL',
        'TRE-AM': 'AM',
        'TRE-AP': 'AP',
        'TRE-BA': 'BA',
        'TRE-CE': 'CE',
        'TRE-DF': 'DF',
        'TRE-ES': 'ES',
        'TRE-GO': 'GO',
        'TRE-MA': 'MA',
        'TRE-MG': 'MG',
        'TRE-MS': 'MS',
        'TRE-MT': 'MT',
        'TRE-PA': 'PA',
        'TRE-PB': 'PB',
        'TRE-PE': 'PE',
        'TRE-PI': 'PI',
        'TRE-PR': 'PR',
        'TRE-RJ': 'RJ',
        'TRE-RN': 'RN',
        'TRE-RO': 'RO',
        'TRE-RR': 'RR',
        'TRE-RS': 'RS',
        'TRE-SC': 'SC',
        'TRE-SE': 'SE',
        'TRE-SP': 'SP',
        'TRE-TO': 'TO',
        # Militares
        'TJMMG': 'MG',
        'TJMRS': 'RS',
        'TJMSP': 'SP',
    }
    
    @classmethod
    def get_uf_tribunal(cls, sigla: str) -> Optional[str]:
        """
        Retorna a UF do estado para tribunais estaduais
        
        Args:
            sigla: Sigla do tribunal (ex: 'TJSP', 'TRF1')
            
        Returns:
            Sigla da UF (ex: 'SP', 'RJ') ou None se não aplicável
        """
        return cls.TRIBUNAL_UF.get(sigla)
    
    @classmethod
    def get_nome_tribunal_com_uf(cls, sigla: str, uf: Optional[str] = None) -> str:
        """
        Retorna o nome do tribunal, simplificado quando temos UF específica
        
        Args:
            sigla: Sigla do tribunal (ex: 'TRF1', 'TJSP')
            uf: UF específica (opcional)
            
        Returns:
            Nome formatado do tribunal
        """
        # Para TRFs com UF identificada via API, mostra sigla + estado
        if sigla.startswith('TRF') and uf:
            return f"{sigla} - {uf}"
        elif sigla.startswith('TRF'):
            # TRF sem UF específica
            return sigla
        elif sigla.startswith('TJ') and len(sigla) == 4 and uf:
            # Para TJs, mostra sigla + estado
            return f"{sigla} - {uf}"
        elif sigla.startswith('TRT') and uf:
            # Para TRTs, mostra região + estado
            return f"{sigla} - {uf}"
        elif sigla.startswith('TRE-') and uf:
            # Para TREs, já tem o estado no nome
            return cls.TRIBUNAL_NOMES.get(sigla, sigla)
        else:
            # Retorna o nome completo
            return cls.TRIBUNAL_NOMES.get(sigla, sigla)
    
    @classmethod
    def identificar_uf_por_api_datajud(cls, numero_processo: str, tribunal_sigla: str) -> Optional[str]:
        """
        Identifica a UF específica consultando a API Datajud e extraindo do orgaoJulgador
        Método 100% confiável para TRFs e outros tribunais
        
        Args:
            numero_processo: Número do processo (NPU)
            tribunal_sigla: Sigla do tribunal (ex: 'TRF1', 'TJSP')
            
        Returns:
            Sigla da UF específica ou None
        """
        try:
            # Consulta a API Datajud
            resultado = cls.consultar_processo(numero_processo, tribunal_sigla)
            
            if not resultado.get('sucesso') or not resultado.get('encontrado'):
                return None
            
            # Extrai o nome do órgão julgador
            orgao_nome = resultado.get('orgao_julgador', {}).get('nome', '')
            
            if not orgao_nome:
                return None
            
            # Mapeamento de padrões no nome do órgão para UF
            # Ordem: mais específicos primeiro
            uf_patterns = {
                'AC': ['Acre', '/AC', ' Rio Branco'],
                'AL': ['Alagoas', '/AL', ' Maceió'],
                'AM': ['Amazonas', '/AM', ' Manaus'],
                'AP': ['Amapá', '/AP', ' Macapá'],
                'BA': ['Bahia', '/BA', ' Salvador'],
                'CE': ['Ceará', '/CE', ' Fortaleza'],
                'DF': ['Distrito Federal', '/DF', ' Brasília'],
                'ES': ['Espírito Santo', '/ES', ' Vitória'],
                'GO': ['Goiás', '/GO', ' Goiânia'],
                'MA': ['Maranhão', '/MA', ' São Luís'],
                'MG': ['Minas Gerais', '/MG', ' Belo Horizonte'],
                'MS': ['Mato Grosso do Sul', '/MS', ' Campo Grande'],
                'MT': ['Mato Grosso', '/MT', ' Cuiabá'],
                'PA': ['Pará', '/PA', ' Belém'],
                'PB': ['Paraíba', '/PB', ' João Pessoa'],
                'PE': ['Pernambuco', '/PE', ' Recife'],
                'PI': ['Piauí', '/PI', ' Teresina'],
                'PR': ['Paraná', '/PR', ' Curitiba'],
                'RJ': ['Rio de Janeiro', '/RJ'],
                'RN': ['Rio Grande do Norte', '/RN', ' Natal'],
                'RO': ['Rondônia', '/RO', ' Porto Velho'],
                'RR': ['Roraima', '/RR', ' Boa Vista'],
                'RS': ['Rio Grande do Sul', '/RS'],
                'SC': ['Santa Catarina', '/SC', ' Florianópolis'],
                'SE': ['Sergipe', '/SE', ' Aracaju'],
                'SP': ['São Paulo', '/SP'],
                'TO': ['Tocantins', '/TO', ' Palmas'],
            }
            
            orgao_upper = orgao_nome.upper()
            
            for uf, patterns in uf_patterns.items():
                for pattern in patterns:
                    if pattern.upper() in orgao_upper:
                        print(f"[Datajud] UF identificada via API: {uf} (órgão: {orgao_nome})")
                        return uf
            
            # Se não encontrou pelo padrão, tenta extrair de /XX no final
            import re
            match = re.search(r'/([A-Z]{2})\b', orgao_nome.upper())
            if match:
                uf = match.group(1)
                if uf in uf_patterns:
                    print(f"[Datajud] UF identificada via regex: {uf} (órgão: {orgao_nome})")
                    return uf
            
            return None
            
        except Exception as e:
            print(f"[Datajud] Erro ao identificar UF via API: {e}")
            return None
    
    @classmethod
    def identificar_uf_por_unidade(cls, numero_processo: str, tribunal_sigla: str) -> Optional[str]:
        """
        Identifica a UF específica baseada no código da unidade/origem
        Para TRFs, consulta a API Datajud para obter a UF exata do orgaoJulgador
        
        Args:
            numero_processo: Número do processo (NPU)
            tribunal_sigla: Sigla do tribunal (ex: 'TJSP', 'TRT1')
            
        Returns:
            Sigla da UF específica ou None
        """
        # Para TRFs (Justiça Federal), consulta a API para identificar a UF exata
        if tribunal_sigla.startswith('TRF'):
            return cls.identificar_uf_por_api_datajud(numero_processo, tribunal_sigla)
        
        # Para outros tribunais, retorna o mapeamento padrão
        return cls.TRIBUNAL_UF.get(tribunal_sigla)
    
    @classmethod
    def identificar_tribunal(cls, numero_processo: str) -> Optional[str]:
        """
        Identifica a sigla do tribunal a partir do número do processo (NPU)
        Seguindo o padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
        
        Args:
            numero_processo: Número do processo (com ou sem formatação)
            
        Returns:
            Sigla do tribunal (ex: 'TJSP', 'TRF1') ou None
        """
        # Remove formatação (pontos, traços, barras)
        numero_limpo = re.sub(r'[^0-9]', '', numero_processo)
        
        # Valida tamanho do NPU (deve ter 20 dígitos)
        if len(numero_limpo) != 20:
            return None
        
        # Extrai J (Justiça) - dígito 14 (índice 13)
        # Extrai TR (Tribunal/Região) - dígitos 15-16 (índices 14:16)
        j = numero_limpo[13]        # 1 dígito
        tr = numero_limpo[14:16]    # 2 dígitos
        
        # Código completo = J + TR
        codigo_orgao = j + tr
        
        return cls.CODIGO_ORGAO_MAP.get(codigo_orgao)
    
    @classmethod
    def get_nome_tribunal(cls, sigla: str) -> str:
        """
        Retorna o nome completo do tribunal a partir da sigla
        
        Args:
            sigla: Sigla do tribunal (ex: 'TJSP', 'TRF1')
            
        Returns:
            Nome completo do tribunal ou a própria sigla se não encontrado
        """
        return cls.TRIBUNAL_NOMES.get(sigla, sigla)
    
    @classmethod
    def identificar_tribunal_completo(cls, numero_processo: str) -> Optional[Dict[str, str]]:
        """
        Identifica o tribunal completo (sigla + nome + UF) a partir do número do processo
        
        Args:
            numero_processo: Número do processo (NPU)
            
        Returns:
            Dict com 'sigla', 'nome' e 'uf' do tribunal, ou None se não identificado
        """
        sigla = cls.identificar_tribunal(numero_processo)
        if sigla:
            # Para TRFs, tenta identificar a UF específica baseada na unidade
            uf_especifica = cls.identificar_uf_por_unidade(numero_processo, sigla)
            # Se não conseguir identificar a UF específica, usa o mapeamento padrão
            uf = uf_especifica if uf_especifica else cls.get_uf_tribunal(sigla)
            # Gera nome do tribunal (simplificado se tiver UF específica)
            nome = cls.get_nome_tribunal_com_uf(sigla, uf)
            return {
                'sigla': sigla,
                'nome': nome,
                'uf': uf
            }
        return None
    
    @classmethod
    def consultar_processo(cls, numero_processo: str, tribunal_sigla: Optional[str] = None) -> Dict[str, Any]:
        """
        Consulta um processo na API Datajud
        
        Args:
            numero_processo: Número do processo (NPU)
            tribunal_sigla: Sigla do tribunal (opcional, auto-detecta se não informado)
            
        Returns:
            Dict com os dados do processo ou erro
        """
        # Verifica se API Key está configurada
        if not cls.API_KEY:
            return {
                'sucesso': False,
                'erro': 'API Key do Datajud não configurada. Configure a variável de ambiente DATAJUD_API_KEY'
            }
        
        # Identifica o tribunal
        if not tribunal_sigla:
            tribunal_sigla = cls.identificar_tribunal(numero_processo)
        
        if not tribunal_sigla:
            return {
                'sucesso': False,
                'erro': 'Não foi possível identificar o tribunal pelo número do processo. Verifique o NPU.'
            }
        
        # Obtém o endpoint
        endpoint = cls.TRIBUNAIS_ENDPOINTS.get(tribunal_sigla)
        if not endpoint:
            return {
                'sucesso': False,
                'erro': f'Tribunal {tribunal_sigla} não suportado pela API Datajud'
            }
        
        # Prepara a requisição
        url = f"{cls.BASE_URL}{endpoint}"
        headers = {
            'Authorization': f'ApiKey {cls.API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Limpa o número do processo para a consulta
        numero_limpo = re.sub(r'[^0-9]', '', numero_processo)
        
        # Payload da consulta (formato Elasticsearch)
        payload = {
            "query": {
                "match": {
                    "numeroProcesso": numero_limpo
                }
            }
        }
        
        try:
            import time
            inicio = time.time()
            
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=cls.TIMEOUT
            )
            
            tempo_resposta = int((time.time() - inicio) * 1000)
            
            # Verifica erro HTTP
            if response.status_code != 200:
                return {
                    'sucesso': False,
                    'erro': f'Erro na API Datajud: HTTP {response.status_code}',
                    'tribunal': tribunal_sigla,
                    'tempo_resposta_ms': tempo_resposta
                }
            
            # Parse da resposta
            data = response.json()
            
            # Extrai hits do resultado Elasticsearch
            hits = data.get('hits', {}).get('hits', [])
            
            if not hits:
                return {
                    'sucesso': True,
                    'encontrado': False,
                    'mensagem': 'Processo não encontrado no tribunal',
                    'tribunal': tribunal_sigla,
                    'tempo_resposta_ms': tempo_resposta
                }
            
            # Extrai dados do primeiro hit (mais relevante)
            source = hits[0].get('_source', {})
            
            # Extrai movimentações
            movimentos_raw = source.get('movimentos', [])
            movimentos = []
            
            for mov in movimentos_raw:
                movimentos.append({
                    'codigo': mov.get('codigo'),
                    'nome': mov.get('nome'),
                    'data_hora': mov.get('dataHora'),
                    'complementos': mov.get('complementosTabelados', [])
                })
            
            # Ordena movimentações por data (mais recente primeiro)
            movimentos.sort(key=lambda x: x.get('data_hora', ''), reverse=True)
            
            return {
                'sucesso': True,
                'encontrado': True,
                'tribunal': tribunal_sigla,
                'numero_processo': source.get('numeroProcesso'),
                'data_ajuizamento': source.get('dataAjuizamento'),
                'classe': {
                    'codigo': source.get('classe', {}).get('codigo'),
                    'nome': source.get('classe', {}).get('nome')
                },
                'orgao_julgador': {
                    'nome': source.get('orgaoJulgador', {}).get('nome')
                },
                'movimentos': movimentos,
                'total_movimentos': len(movimentos),
                'tempo_resposta_ms': tempo_resposta
            }
            
        except requests.exceptions.Timeout:
            return {
                'sucesso': False,
                'erro': f'Timeout na consulta ao tribunal {tribunal_sigla}. Tente novamente.',
                'tribunal': tribunal_sigla
            }
        except requests.exceptions.RequestException as e:
            return {
                'sucesso': False,
                'erro': f'Erro de conexão: {str(e)}',
                'tribunal': tribunal_sigla
            }
        except Exception as e:
            return {
                'sucesso': False,
                'erro': f'Erro inesperado: {str(e)}',
                'tribunal': tribunal_sigla
            }
    
    @classmethod
    def salvar_movimentacoes(cls, processo_id: int, workspace_id: int, movimentos: List[Dict]) -> Dict[str, Any]:
        """
        Salva movimentações no banco de dados
        Usa INSERT IGNORE para evitar duplicatas (chave única: processo_id + codigo + data)
        
        Args:
            processo_id: ID do processo no banco
            workspace_id: ID do workspace
            movimentos: Lista de movimentações da API Datajud
            
        Returns:
            Dict com estatísticas de inserção
        """
        db = get_db()
        inseridas = 0
        duplicadas = 0
        novas_movimentacoes = []
        
        try:
            for mov in movimentos:
                codigo = mov.get('codigo')
                nome = mov.get('nome', 'Movimentação sem descrição')
                data_hora = mov.get('data_hora')
                complementos = json.dumps(mov.get('complementos', []), ensure_ascii=False)
                
                # Converte data ISO 8601 para formato do banco
                if data_hora:
                    try:
                        # Remove timezone se presente e converte
                        data_clean = data_hora.replace('Z', '+00:00')
                        dt = datetime.fromisoformat(data_clean)
                        data_movimento = dt.strftime('%Y-%m-%d %H:%M:%S')
                    except:
                        data_movimento = data_hora
                else:
                    data_movimento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                try:
                    cursor = db.execute('''
                        INSERT OR IGNORE INTO movimentacoes_processo 
                        (workspace_id, processo_id, codigo_movimento, nome_movimento, 
                         data_movimento, complementos, fonte)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (workspace_id, processo_id, codigo, nome, data_movimento, 
                          complementos, 'datajud'))
                    
                    if cursor.rowcount > 0:
                        inseridas += 1
                        novas_movimentacoes.append({
                            'codigo': codigo,
                            'nome': nome,
                            'data': data_movimento
                        })
                    else:
                        duplicadas += 1
                        
                except Exception as e:
                    print(f"Erro ao inserir movimentação {codigo}: {e}")
                    continue
            
            db.commit()
            
            return {
                'sucesso': True,
                'inseridas': inseridas,
                'duplicadas': duplicadas,
                'novas_movimentacoes': novas_movimentacoes
            }
            
        except Exception as e:
            db.rollback()
            return {
                'sucesso': False,
                'erro': str(e),
                'inseridas': inseridas,
                'duplicadas': duplicadas
            }
    
    @classmethod
    def criar_alertas_movimentacao(cls, processo_id: int, workspace_id: int, 
                                    movimentacoes: List[Dict], numero_processo: str) -> int:
        """
        Cria alertas/notificações para novas movimentações
        
        Args:
            processo_id: ID do processo
            workspace_id: ID do workspace
            movimentacoes: Lista de novas movimentações
            numero_processo: Número do processo para exibir na notificação
            
        Returns:
            Número de alertas criados
        """
        db = get_db()
        alertas_criados = 0
        
        try:
            for mov in movimentacoes:
                # Cria título e mensagem do alerta
                titulo = f"Nova movimentação - {numero_processo[-9:]}"  # Últimos 9 dígitos
                mensagem = f"{mov['nome']}\nData: {mov['data']}"
                
                db.execute('''
                    INSERT INTO alertas_notificacoes 
                    (workspace_id, processo_id, tipo, titulo, mensagem, lido, data_criacao)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (workspace_id, processo_id, 'movimentacao', titulo, mensagem, 
                      False, datetime.now()))
                
                alertas_criados += 1
            
            db.commit()
            
            # ============================================================================
            # ENVIO DE EMAIL PARA MOVIMENTAÇÕES
            # ============================================================================
            if EMAIL_SERVICE_DISPONIVEL and email_service.is_configured() and alertas_criados > 0:
                try:
                    # Envia email de notificação
                    resultado_email = notificador_email.notificar_nova_movimentacao(
                        workspace_id=workspace_id,
                        processo_id=processo_id,
                        numero_processo=numero_processo,
                        descricao=f"{len(movimentacoes)} nova(s) movimentação(ões) detectada(s)",
                        data_movimento=movimentacoes[0]['data'] if movimentacoes else None
                    )
                    
                    if resultado_email.get('success'):
                        print(f"📧 Email de movimentação enviado para {resultado_email.get('success_count', 0)} usuário(s)")
                    else:
                        print(f"⚠️  Erro ao enviar email de movimentação: {resultado_email.get('error')}")
                except Exception as e:
                    print(f"⚠️  Erro ao enviar notificação por email: {e}")

            # ============================================================================
            # ENVIO AUTOMÁTICO WHATSAPP PARA MOVIMENTAÇÕES
            # ============================================================================
            try:
                if alertas_criados > 0:
                    resultado_whatsapp = trigger_whatsapp_on_new_movements(
                        workspace_id=workspace_id,
                        processo_id=processo_id,
                        numero_processo=numero_processo,
                        movimentacoes=movimentacoes,
                    )
                    if resultado_whatsapp.get('success'):
                        print(
                            f"📱 WhatsApp de movimentações enviado: "
                            f"{resultado_whatsapp.get('enviados', 0)} enviado(s)"
                        )
            except Exception as e:
                print(f"⚠️  Erro ao enviar automação WhatsApp de movimentações: {e}")
            
            return alertas_criados
            
        except Exception as e:
            db.rollback()
            print(f"Erro ao criar alertas: {e}")
            return 0


# ============================================================================
# AI ASSISTANT
# ============================================================================

class AssistenteIA:
    """Assistente IA com OpenAI/Groq Function Calling"""
    
    # Modelos por provider (atualizados em 2025)
    MODELS = {
        'groq': 'llama-3.3-70b-versatile',  # Modelo poderoso disponível gratuitamente no Groq
        'openai': 'gpt-3.5-turbo',
        'default': 'llama-3.3-70b-versatile'
    }
    
    FUNCTIONS = [
        {
            "name": "listar_processos",
            "description": "Lista os processos do escritório com filtros opcionais",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["ativo", "arquivado", "suspenso"],
                        "description": "Filtrar por status do processo"
                    },
                    "cliente": {
                        "type": "string",
                        "description": "Nome do cliente para filtrar"
                    },
                    "limite": {
                        "type": "integer",
                        "description": "Número máximo de resultados"
                    }
                }
            }
        },
        {
            "name": "buscar_processo",
            "description": "Busca um processo específico pelo número ou título",
            "parameters": {
                "type": "object",
                "properties": {
                    "numero": {
                        "type": "string",
                        "description": "Número do processo"
                    },
                    "titulo": {
                        "type": "string",
                        "description": "Título ou palavras-chave do processo"
                    }
                }
            }
        },
        {
            "name": "listar_prazos",
            "description": "Lista prazos do escritório, pode filtrar por período",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pendente", "cumprido", "vencido"],
                        "description": "Status do prazo"
                    },
                    "dias": {
                        "type": "integer",
                        "description": "Filtrar prazos dos próximos N dias"
                    }
                }
            }
        },
        {
            "name": "listar_tarefas",
            "description": "Lista tarefas do escritório",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pendente", "em_andamento", "concluida"],
                        "description": "Status da tarefa"
                    },
                    "prioridade": {
                        "type": "string",
                        "enum": ["baixa", "media", "alta", "urgente"],
                        "description": "Prioridade da tarefa"
                    }
                }
            }
        },
        {
            "name": "listar_clientes",
            "description": "Lista clientes do escritório",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome": {
                        "type": "string",
                        "description": "Filtrar por nome do cliente"
                    }
                }
            }
        },
        {
            "name": "resumo_financeiro",
            "description": "Obtém resumo financeiro do período",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {
                        "type": "string",
                        "enum": ["mes_atual", "mes_anterior", "ano"],
                        "description": "Período para o resumo"
                    }
                }
            }
        }
    ]
    
    @staticmethod
    def get_modelo() -> str:
        """Retorna o modelo apropriado baseado no provider configurado"""
        return AssistenteIA.MODELS.get(ia_provider, AssistenteIA.MODELS['default'])
    
    @staticmethod
    def processar_mensagem(mensagem: str, workspace_id: int, user_id: int, session_id: str) -> Dict[str, Any]:
        """Processa mensagem do usuário usando IA (OpenAI ou Groq)"""
        
        global ia_client, ia_provider
        
        if not ia_client:
            return {
                'resposta': '''🤖 **Copiloto Jurídico não configurado**

Para usar o assistente IA, configure uma das opções no arquivo `.env`:

**Opção 1 - Groq (Gratuito - Recomendado):**
1. Acesse https://console.groq.com
2. Crie uma conta gratuita
3. Gere uma API Key
4. Adicione ao .env: `GROQ_API_KEY=sua_chave_aqui`

**Opção 2 - OpenAI (Pago):**
- Adicione ao .env: `OPENAI_API_KEY=sua_chave_aqui`

💡 Recomendamos o **Groq** pois é gratuito e ultra-rápido!''',
                'funcoes_chamadas': []
            }
        
        try:
            # Busca histórico da conversa
            db = get_db()
            historico = db.execute(
                '''SELECT role, content FROM chat_history 
                   WHERE workspace_id = ? AND user_id = ? AND session_id = ?
                   ORDER BY created_at DESC LIMIT 10''',
                (workspace_id, user_id, session_id)
            ).fetchall()
            
            messages = [
                {"role": "system", "content": """Você é o Copiloto Jurídico do JurisGestão, um assistente de IA especializado em gestão de escritórios de advocacia.

SUA IDENTIDADE:
- Nome: Copiloto Jurídico
- Especialidade: Gestão jurídica e organização de escritórios de advocacia
- Tom: Profissional, prestativo, claro e direto

O QUE VOCÊ PODE FAZER:
- Buscar e consultar processos com detalhes completos
- Localizar informações de clientes
- Verificar prazos processuais pendentes
- Listar tarefas e afazeres do escritório
- Analisar o financeiro (entradas, saídas, balanço)
- Responder dúvidas sobre movimentações processuais
- Sugerir organização da agenda e prioridades

COMO RESPONDER:
- Seja sempre cordial e profissional
- Use formatacao clara quando apropriado
- Quando nao souber algo, seja honesto e sugira alternativas
- Mantenha respostas concisas mas completas
- Sempre responda em portugues do Brasil

Use as funcoes disponiveis para buscar informacoes em tempo real quando necessario."""}
            ]
            
            # Adiciona histórico
            for h in reversed(historico):
                messages.append({"role": h['role'], "content": h['content']})
            
            # Adiciona mensagem atual
            messages.append({"role": "user", "content": mensagem})
            
            # Seleciona modelo baseado no provider
            modelo = AssistenteIA.get_modelo()
            
            def _criar_completion(com_funcoes: bool = True):
                payload = {
                    'model': modelo,
                    'messages': messages,
                    'temperature': 0.7,
                    'max_tokens': 500
                }
                if com_funcoes:
                    payload['functions'] = AssistenteIA.FUNCTIONS
                    payload['function_call'] = 'auto'
                return ia_client.chat.completions.create(**payload)

            # Chama a API de IA (fallback sem funcoes para evitar erro tool_use_failed)
            try:
                response = _criar_completion(com_funcoes=True)
            except Exception as tool_error:
                tool_error_msg = str(tool_error)
                if 'tool_use_failed' in tool_error_msg or 'Failed to call a function' in tool_error_msg:
                    response = _criar_completion(com_funcoes=False)
                else:
                    raise
            
            message = response.choices[0].message
            funcoes_chamadas = []
            
            # Salva mensagem do usuário
            db.execute(
                'INSERT INTO chat_history (workspace_id, user_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)',
                (workspace_id, user_id, session_id, 'user', mensagem)
            )
            
            # Verifica se houve function calling
            function_call = getattr(message, 'function_call', None)
            if function_call:
                func_name = function_call.name
                try:
                    func_args = json.loads(function_call.arguments or '{}')
                except Exception:
                    func_args = {}
                if not isinstance(func_args, dict):
                    func_args = {}
                funcoes_chamadas.append({'nome': func_name, 'args': func_args})
                
                # Executa a função
                resultado = AssistenteIA.executar_funcao(func_name, func_args, workspace_id)
                
                # Adiciona resultado ao contexto
                messages.append({
                    "role": "function",
                    "name": func_name,
                    "content": json.dumps(resultado)
                })
                
                # Chama API novamente com o resultado
                response = ia_client.chat.completions.create(
                    model=modelo,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500
                )
                message = response.choices[0].message
            
            resposta = message.content or "Não entendi. Pode reformular?"
            
            # Salva resposta do assistente
            db.execute(
                'INSERT INTO chat_history (workspace_id, user_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)',
                (workspace_id, user_id, session_id, 'assistant', resposta)
            )
            db.commit()
            
            return {
                'resposta': resposta,
                'funcoes_chamadas': funcoes_chamadas
            }
            
        except Exception as e:
            error_msg = str(e)
            if 'quota' in error_msg.lower() or '429' in error_msg:
                return {
                    'resposta': '''⚠️ **Limite de uso atingido**

Parece que você atingiu o limite da sua API Key atual.

**Soluções:**
1. Se estiver usando OpenAI: Mude para **Groq** (gratuito)
   - Acesse https://console.groq.com
   - Crie uma conta e gere uma API Key gratuita
   - Substitua no .env: `GROQ_API_KEY=sua_chave_aqui`

2. Se já estiver usando Groq: Aguarde alguns minutos e tente novamente
   (Limite: 1,000 requisições/dia para o modelo llama3-70b)''',
                    'funcoes_chamadas': []
                }
            return {
                'resposta': f'Erro ao processar mensagem: {error_msg}',
                'funcoes_chamadas': []
            }
    
    @staticmethod
    def executar_funcao(nome: str, args: Dict, workspace_id: int) -> Dict:
        """Executa função chamada pelo modelo"""
        db = get_db()
        
        if nome == 'listar_processos':
            query = 'SELECT * FROM processos WHERE workspace_id = ?'
            params = [workspace_id]
            
            if args.get('status'):
                query += ' AND status = ?'
                params.append(args['status'])
            
            if args.get('cliente'):
                query += ' AND cliente_id IN (SELECT id FROM clientes WHERE nome LIKE ?)'
                params.append(f"%{args['cliente']}%")
            
            query += ' ORDER BY created_at DESC'
            
            if args.get('limite'):
                query += " LIMIT ?"
                params.append(args['limite'])
            
            rows = db.execute(query, params).fetchall()
            return {'processos': [dict(r) for r in rows]}
        
        elif nome == 'buscar_processo':
            query = 'SELECT * FROM processos WHERE workspace_id = ? AND ('
            params = [workspace_id]
            
            conditions = []
            if args.get('numero'):
                conditions.append('numero LIKE ?')
                params.append(f"%{args['numero']}%")
            if args.get('titulo'):
                conditions.append('titulo LIKE ?')
                params.append(f"%{args['titulo']}%")
            
            query += ' OR '.join(conditions) + ')' if conditions else '1=0)'
            
            rows = db.execute(query, params).fetchall()
            return {'processos': [dict(r) for r in rows]}
        
        elif nome == 'listar_prazos':
            query = 'SELECT p.*, pr.numero as processo_numero FROM prazos p '
            query += 'JOIN processos pr ON p.processo_id = pr.id WHERE p.workspace_id = ?'
            params = [workspace_id]
            
            if args.get('status'):
                query += ' AND p.status = ?'
                params.append(args['status'])
            
            if args.get('dias'):
                data_limite = (datetime.now() + timedelta(days=args['dias'])).strftime('%Y-%m-%d')
                query += ' AND p.data_prazo <= ?'
                params.append(data_limite)
            
            query += ' ORDER BY p.data_prazo'
            
            rows = db.execute(query, params).fetchall()
            return {'prazos': [dict(r) for r in rows]}
        
        elif nome == 'listar_tarefas':
            query = 'SELECT * FROM tarefas WHERE workspace_id = ?'
            params = [workspace_id]
            
            if args.get('status'):
                query += ' AND status = ?'
                params.append(args['status'])
            
            if args.get('prioridade'):
                query += ' AND prioridade = ?'
                params.append(args['prioridade'])
            
            query += ' ORDER BY created_at DESC'
            
            rows = db.execute(query, params).fetchall()
            return {'tarefas': [dict(r) for r in rows]}
        
        elif nome == 'listar_clientes':
            query = 'SELECT * FROM clientes WHERE workspace_id = ?'
            params = [workspace_id]
            
            if args.get('nome'):
                query += ' AND nome LIKE ?'
                params.append(f"%{args['nome']}%")
            
            query += ' ORDER BY nome'
            
            rows = db.execute(query, params).fetchall()
            return {'clientes': [dict(r) for r in rows]}
        
        elif nome == 'resumo_financeiro':
            hoje = datetime.now()
            
            if args.get('periodo') == 'mes_atual':
                inicio = hoje.replace(day=1).strftime('%Y-%m-%d')
                fim = hoje.strftime('%Y-%m-%d')
            elif args.get('periodo') == 'mes_anterior':
                inicio = (hoje.replace(day=1) - timedelta(days=1)).replace(day=1).strftime('%Y-%m-%d')
                fim = hoje.replace(day=1).strftime('%Y-%m-%d')
            else:
                inicio = hoje.replace(month=1, day=1).strftime('%Y-%m-%d')
                fim = hoje.strftime('%Y-%m-%d')
            
            receitas = db.execute(
                'SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE workspace_id = ? AND tipo = ? AND data BETWEEN ? AND ?',
                (workspace_id, 'receita', inicio, fim)
            ).fetchone()['total']
            
            despesas = db.execute(
                'SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE workspace_id = ? AND tipo = ? AND data BETWEEN ? AND ?',
                (workspace_id, 'despesa', inicio, fim)
            ).fetchone()['total']
            
            return {
                'receitas': receitas,
                'despesas': despesas,
                'saldo': receitas - despesas,
                'periodo': args.get('periodo', 'ano')
            }
        
        return {'erro': 'Função não implementada'}

# ============================================================================
# WHATSAPP UTILS
# ============================================================================

def gerar_link_whatsapp(telefone: str, mensagem: str) -> str:
    """Gera link do WhatsApp para compartilhamento"""
    # Remove caracteres não numéricos do telefone
    numero_limpo = re.sub(r'[^0-9]', '', telefone)
    
    # Adiciona código do país se não tiver
    if len(numero_limpo) == 11 or len(numero_limpo) == 10:
        numero_limpo = '55' + numero_limpo
    
    # Codifica a mensagem para URL
    mensagem_codificada = requests.utils.quote(mensagem)
    
    return f"https://wa.me/{numero_limpo}?text={mensagem_codificada}"

def formatar_mensagem_processo(processo: Dict) -> str:
    """Formata mensagem para compartilhamento de processo"""
    return f"""📋 *Processo Jurídico*

*Número:* {processo.get('numero', 'N/A')}
*Título:* {processo.get('titulo', 'N/A')}
*Status:* {processo.get('status', 'N/A')}
*Comarca:* {processo.get('comarca', 'N/A')}

_Enviado via JurisPocket_"""

def formatar_mensagem_tarefa(tarefa: Dict) -> str:
    """Formata mensagem para compartilhamento de tarefa"""
    return f"""✅ *Tarefa*

*Título:* {tarefa.get('titulo', 'N/A')}
*Prioridade:* {tarefa.get('prioridade', 'N/A')}
*Status:* {tarefa.get('status', 'N/A')}
*Vencimento:* {tarefa.get('data_vencimento', 'N/A')}

_Enviado via JurisPocket_"""


def formatar_mensagem_movimentacao(processo: Dict, movimentacao: Dict) -> str:
    """Formata mensagem para compartilhamento de movimentacao."""
    return (
        f"Atualizacao de processo\n\n"
        f"Processo: {processo.get('numero', 'N/A')}\n"
        f"Titulo: {processo.get('titulo', 'N/A')}\n"
        f"Movimentacao: {movimentacao.get('nome_movimento', 'N/A')}\n"
        f"Data: {movimentacao.get('data_movimento', 'N/A')}\n"
        f"Codigo: {movimentacao.get('codigo_movimento', 'N/A')}\n\n"
        f"Enviado via JurisPocket"
    )


def normalize_phone_digits(phone: str) -> str:
    """Extrai apenas digitos do telefone."""
    return re.sub(r'\D', '', phone or '')


def build_phone_candidates(phone: str) -> List[str]:
    """Gera variantes de telefone para matching (com/sem DDI 55)."""
    digits = normalize_phone_digits(phone)
    if not digits:
        return []

    candidates = {digits}
    if digits.startswith('55') and len(digits) > 11:
        candidates.add(digits[2:])
    elif len(digits) in (10, 11):
        candidates.add(f'55{digits}')

    return list(candidates)


def find_workspace_client_by_phone(db, workspace_id: int, phone: str) -> Optional[Dict[str, Any]]:
    """Localiza cliente do workspace pelo telefone, normalizando para comparacao."""
    candidates = set(build_phone_candidates(phone))
    if not candidates:
        return None

    rows = db.execute(
        '''SELECT id, nome, telefone
           FROM clientes
           WHERE workspace_id = ? AND telefone IS NOT NULL AND TRIM(telefone) != ''',
        (workspace_id,),
    ).fetchall()

    for row in rows:
        raw_phone = row['telefone'] if isinstance(row, dict) else row[2]
        normalized = normalize_phone_digits(raw_phone)
        if normalized in candidates:
            return dict(row)

    return None


def ensure_platform_whatsapp_config(db) -> Dict[str, Any]:
    """Garante configuracao default do WhatsApp oficial da plataforma."""
    row = db.execute(
        'SELECT * FROM whatsapp_platform_config WHERE id = 1',
    ).fetchone()

    if not row:
        db.execute(
            '''INSERT INTO whatsapp_platform_config (id, session_key, enabled)
               VALUES (1, ?, 1)''',
            (PLATFORM_WHATSAPP_SESSION_KEY,),
        )
        db.commit()
        row = db.execute(
            'SELECT * FROM whatsapp_platform_config WHERE id = 1',
        ).fetchone()

    config = dict(row) if row else {}
    config['enabled'] = parse_bool(config.get('enabled', True))
    if not config.get('session_key'):
        config['session_key'] = PLATFORM_WHATSAPP_SESSION_KEY
    return config


def get_workspace_whatsapp_connection_config(db, workspace_id: int) -> Dict[str, Any]:
    """Retorna configuracao do WhatsApp do workspace (contato com clientes)."""
    row = db.execute(
        'SELECT * FROM whatsapp_workspace_config WHERE workspace_id = ?',
        (workspace_id,),
    ).fetchone()

    if not row:
        session_key = f'workspace-{workspace_id}'
        db.execute(
            '''INSERT INTO whatsapp_workspace_config (workspace_id, session_key, enabled)
               VALUES (?, ?, 1)''',
            (workspace_id, session_key),
        )
        db.commit()
        row = db.execute(
            'SELECT * FROM whatsapp_workspace_config WHERE workspace_id = ?',
            (workspace_id,),
        ).fetchone()

    config = dict(row) if row else {}
    config['enabled'] = parse_bool(config.get('enabled', True))
    if not config.get('session_key'):
        config['session_key'] = f'workspace-{workspace_id}'
    return config


def resolve_workspace_whatsapp_session_key(db, workspace_id: int) -> str:
    config = get_workspace_whatsapp_connection_config(db, workspace_id)
    return config.get('session_key') or f'workspace-{workspace_id}'


def log_whatsapp_message(
    db,
    workspace_id: Optional[int],
    channel: str,
    direction: str,
    message_text: str,
    sender_key: Optional[str] = None,
    sender_phone: Optional[str] = None,
    recipient_phone: Optional[str] = None,
    provider_message_id: Optional[str] = None,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    user_id: Optional[int] = None,
    commit: bool = True,
) -> None:
    """Registra mensagem no log unificado."""
    db.execute(
        '''INSERT INTO whatsapp_message_log
           (workspace_id, client_id, user_id, channel, direction, sender_key, sender_phone,
            recipient_phone, message_text, provider_message_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            workspace_id,
            client_id,
            user_id,
            channel,
            direction,
            sender_key,
            sender_phone,
            recipient_phone,
            (message_text or '')[:2000],
            provider_message_id,
            status,
        ),
    )
    if commit:
        db.commit()


def send_workspace_whatsapp_message(
    db,
    workspace_id: int,
    phone: str,
    message: str,
    client_id: Optional[int] = None,
    sender_user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Envia mensagem para cliente usando o WhatsApp de um usuario do workspace."""
    if not whatsapp_service.is_configured():
        return {'success': False, 'error': 'Servico WhatsApp nao configurado'}

    resolved_sender_user_id: Optional[int] = None
    if sender_user_id is not None:
        try:
            parsed_sender_id = int(sender_user_id)
        except (TypeError, ValueError):
            return {'success': False, 'error': 'sender_user_id invalido'}

        sender_row = db.execute(
            'SELECT id FROM users WHERE id = ? AND workspace_id = ?',
            (parsed_sender_id, workspace_id),
        ).fetchone()
        if not sender_row:
            return {
                'success': False,
                'error': 'Usuario remetente nao pertence ao workspace',
            }
        resolved_sender_user_id = int(sender_row['id'])
    else:
        resolved_sender_user_id = resolve_workspace_whatsapp_sender_user_id(db, workspace_id)

    if not resolved_sender_user_id:
        return {
            'success': False,
            'error': 'Nenhum usuario remetente disponivel para enviar mensagem ao cliente',
        }

    sender_key = str(resolved_sender_user_id)
    response = whatsapp_service.send_text_message(sender_key, phone, message)
    success = bool(response.get('success'))

    try:
        log_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            client_id=client_id,
            user_id=resolved_sender_user_id,
            channel='workspace',
            direction='outbound',
            sender_key=sender_key,
            recipient_phone=phone,
            message_text=message,
            provider_message_id=response.get('message_id'),
            status='sent' if success else 'failed',
            commit=True,
        )
    except Exception as log_error:
        print(f"[whatsapp] Falha ao registrar log de envio workspace: {log_error}")

    return {
        **response,
        'sender_user_id': resolved_sender_user_id,
        'sender_key': sender_key,
    }

def listar_usuarios_workspace_com_telefone(
    db,
    workspace_id: int,
    user_ids: Optional[List[int]] = None,
    somente_alerta_whatsapp: bool = False,
) -> List[Dict[str, Any]]:
    """
    Lista usuarios do workspace com telefone valido.
    """
    query = '''
        SELECT id, nome, email, telefone, alerta_whatsapp
        FROM users
        WHERE workspace_id = ?
          AND telefone IS NOT NULL
          AND TRIM(telefone) != ''
    '''
    params: List[Any] = [workspace_id]

    if somente_alerta_whatsapp:
        query += ' AND alerta_whatsapp = 1'

    if user_ids:
        placeholders = ','.join(['?'] * len(user_ids))
        query += f' AND id IN ({placeholders})'
        params.extend(user_ids)

    query += ' ORDER BY nome ASC'
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def enviar_whatsapp_para_destinatarios(
    db,
    sender_key: str,
    destinatarios: List[Dict[str, Any]],
    mensagem: str,
    workspace_id: Optional[int],
    channel: str,
    recipient_kind: str = 'user',
) -> Dict[str, Any]:
    """
    Envia mensagem para lista de destinatarios e retorna relatorio consolidado.
    """
    resultados = []
    enviados = 0
    falhas = 0

    for dest in destinatarios:
        telefone = dest.get('telefone')
        if not telefone:
            falhas += 1
            resultados.append({
                'id': dest.get('id'),
                'nome': dest.get('nome'),
                'telefone': None,
                'sucesso': False,
                'erro': 'Telefone ausente',
            })
            continue

        resposta = whatsapp_service.send_text_message(sender_key, telefone, mensagem)
        sucesso = bool(resposta.get('success'))
        if sucesso:
            enviados += 1
        else:
            falhas += 1

        recipient_user_id = dest.get('id') if recipient_kind == 'user' else None
        recipient_client_id = dest.get('id') if recipient_kind == 'client' else None
        try:
            log_whatsapp_message(
                db=db,
                workspace_id=workspace_id,
                client_id=recipient_client_id,
                user_id=recipient_user_id,
                channel=channel,
                direction='outbound',
                sender_key=sender_key,
                recipient_phone=telefone,
                message_text=mensagem,
                provider_message_id=resposta.get('message_id'),
                status='sent' if sucesso else 'failed',
                commit=False,
            )
        except Exception as log_error:
            print(f"[whatsapp] Falha ao registrar log de envio: {log_error}")

        resultados.append({
            'id': dest.get('id'),
            'nome': dest.get('nome'),
            'telefone': telefone,
            'sucesso': sucesso,
            'erro': resposta.get('error') or resposta.get('erro'),
            'message_id': resposta.get('message_id'),
            'modo': resposta.get('modo'),
            'url_wame': resposta.get('url_wame'),
        })

    try:
        db.commit()
    except Exception:
        pass

    return {
        'total': len(destinatarios),
        'enviados': enviados,
        'falhas': falhas,
        'resultados': resultados,
    }


def parse_bool(value: Any) -> bool:
    """Converte valor dinamico para bool de forma previsivel."""
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip().lower()
    return text in ('1', 'true', 'sim', 'yes', 'on')


# ============================================================================
# WHATSAPP AUTOMAÇÕES (WORKSPACE)
# ============================================================================

DEFAULT_WHATSAPP_AUTOMACAO = {
    'sender_user_id': None,
    'auto_nova_movimentacao': True,
    'auto_novo_prazo': True,
    'auto_lembrete_prazo': True,
    'auto_nova_tarefa': True,
    'reminder_days': '7,3,1,0',
    'auto_resumo_diario': False,
    'daily_summary_time': '18:00',
    'ai_generate_messages': False,
    'ai_prompt': '',
}


def parse_reminder_days(value: Any) -> List[int]:
    """Converte texto '7,3,1,0' em lista de inteiros normalizada."""
    if isinstance(value, list):
        raw_values = value
    else:
        raw_values = str(value or '').split(',')

    days: List[int] = []
    for item in raw_values:
        try:
            day = int(str(item).strip())
        except (TypeError, ValueError):
            continue
        if 0 <= day <= 30:
            days.append(day)

    normalized = sorted(set(days), reverse=True)
    return normalized or [7, 3, 1, 0]


def normalize_hhmm(value: Any, default: str = '18:00') -> str:
    """Normaliza horário no formato HH:MM."""
    text = str(value or '').strip()
    if not text:
        return default

    try:
        parsed = datetime.strptime(text[:5], '%H:%M')
        return parsed.strftime('%H:%M')
    except ValueError:
        return default


def get_workspace_whatsapp_config(db, workspace_id: int) -> Dict[str, Any]:
    """Retorna configuração de automações WhatsApp com defaults aplicados."""
    row = db.execute(
        'SELECT * FROM workspace_whatsapp_config WHERE workspace_id = ?',
        (workspace_id,),
    ).fetchone()

    config = dict(DEFAULT_WHATSAPP_AUTOMACAO)
    if row:
        config.update(dict(row))

    reminder_days_list = parse_reminder_days(config.get('reminder_days'))
    config['reminder_days'] = ','.join(str(day) for day in reminder_days_list)
    config['reminder_days_list'] = reminder_days_list
    config['daily_summary_time'] = normalize_hhmm(config.get('daily_summary_time'))
    config['auto_nova_movimentacao'] = parse_bool(config.get('auto_nova_movimentacao'))
    config['auto_novo_prazo'] = parse_bool(config.get('auto_novo_prazo'))
    config['auto_lembrete_prazo'] = parse_bool(config.get('auto_lembrete_prazo'))
    config['auto_nova_tarefa'] = parse_bool(config.get('auto_nova_tarefa'))
    config['auto_resumo_diario'] = parse_bool(config.get('auto_resumo_diario'))
    config['ai_generate_messages'] = parse_bool(config.get('ai_generate_messages'))
    return config


def resolve_workspace_whatsapp_sender_user_id(
    db,
    workspace_id: int,
    fallback_user_id: Optional[int] = None,
) -> Optional[int]:
    """
    Define qual usuário será usado como remetente da sessão WhatsApp do workspace.
    Prioridade: configuração > fallback > primeiro admin/superadmin > primeiro usuário.
    """
    config = get_workspace_whatsapp_config(db, workspace_id)
    configured_sender = config.get('sender_user_id')

    if configured_sender:
        sender_row = db.execute(
            'SELECT id FROM users WHERE id = ? AND workspace_id = ?',
            (configured_sender, workspace_id),
        ).fetchone()
        if sender_row:
            return int(sender_row['id'])

    if fallback_user_id:
        fallback_row = db.execute(
            'SELECT id FROM users WHERE id = ? AND workspace_id = ?',
            (fallback_user_id, workspace_id),
        ).fetchone()
        if fallback_row:
            return int(fallback_row['id'])

    admin_row = db.execute(
        '''SELECT id
           FROM users
           WHERE workspace_id = ? AND role IN ('admin', 'superadmin')
           ORDER BY id ASC
           LIMIT 1''',
        (workspace_id,),
    ).fetchone()
    if admin_row:
        return int(admin_row['id'])

    first_user = db.execute(
        'SELECT id FROM users WHERE workspace_id = ? ORDER BY id ASC LIMIT 1',
        (workspace_id,),
    ).fetchone()
    if first_user:
        return int(first_user['id'])

    return None


def list_workspace_whatsapp_recipients(db, workspace_id: int) -> List[Dict[str, Any]]:
    """
    Lista destinatários padrão das automações.
    Prioriza quem marcou alerta_whatsapp; se ninguém marcou, usa todos com telefone.
    """
    recipients = listar_usuarios_workspace_com_telefone(
        db=db,
        workspace_id=workspace_id,
        somente_alerta_whatsapp=True,
    )
    if recipients:
        return recipients

    return listar_usuarios_workspace_com_telefone(
        db=db,
        workspace_id=workspace_id,
        somente_alerta_whatsapp=False,
    )


def was_whatsapp_automacao_sent(
    db,
    workspace_id: int,
    tipo: str,
    entity_type: str,
    entity_id: int,
    marker: str,
) -> bool:
    row = db.execute(
        '''SELECT id
           FROM whatsapp_automacao_logs
           WHERE workspace_id = ? AND tipo = ? AND entity_type = ? AND entity_id = ? AND marker = ?
           LIMIT 1''',
        (workspace_id, tipo, entity_type, entity_id, marker),
    ).fetchone()
    return bool(row)


def register_whatsapp_automacao_log(
    db,
    workspace_id: int,
    tipo: str,
    entity_type: str,
    entity_id: int,
    marker: str,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    db.execute(
        '''INSERT OR IGNORE INTO whatsapp_automacao_logs
           (workspace_id, tipo, entity_type, entity_id, marker, payload)
           VALUES (?, ?, ?, ?, ?, ?)''',
        (
            workspace_id,
            tipo,
            entity_type,
            entity_id,
            marker,
            json.dumps(payload or {}, ensure_ascii=False),
        ),
    )
    db.commit()


def maybe_generate_whatsapp_message_with_ai(
    base_message: str,
    objective: str,
    ai_prompt: str = '',
) -> str:
    """
    Reescreve mensagem com IA (quando configurada), mantendo fallback deterministico.
    """
    if not openai_client:
        return base_message

    model = 'llama-3.3-70b-versatile' if ia_provider == 'groq' else 'gpt-3.5-turbo'
    system_prompt = (
        "Voce escreve mensagens curtas e profissionais para WhatsApp de escritorio juridico. "
        "Use portugues brasileiro, tom objetivo e claro."
    )
    if ai_prompt:
        system_prompt += f" Preferencias do escritorio: {ai_prompt}"

    user_prompt = (
        f"Objetivo: {objective}\n"
        "Reescreva a mensagem abaixo para WhatsApp, sem inventar dados, mantendo ate 700 caracteres.\n\n"
        f"Mensagem base:\n{base_message}"
    )

    try:
        response = openai_client.chat.completions.create(
            model=model,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            temperature=0.5,
            max_tokens=260,
        )
        content = response.choices[0].message.content if response.choices else ''
        text = (content or '').strip()
        return text or base_message
    except Exception as error:
        print(f"[whatsapp-ai] Falha ao gerar mensagem com IA: {error}")
        return base_message


def dispatch_platform_whatsapp_message(
    db,
    workspace_id: int,
    message: str,
    recipients: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Envia mensagem para usuarios do workspace usando o WhatsApp oficial da plataforma.
    """
    if not whatsapp_service.is_configured():
        return {'success': False, 'error': 'Servico WhatsApp nao configurado'}

    platform_config = ensure_platform_whatsapp_config(db)
    if not platform_config.get('enabled'):
        return {'success': False, 'error': 'WhatsApp da plataforma desativado'}

    sender_key = platform_config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
    targets = recipients or list_workspace_whatsapp_recipients(db, workspace_id)
    if not targets:
        return {'success': False, 'error': 'Nenhum destinatario com telefone configurado'}

    report = enviar_whatsapp_para_destinatarios(
        db=db,
        sender_key=sender_key,
        destinatarios=targets,
        mensagem=message,
        workspace_id=workspace_id,
        channel='platform',
        recipient_kind='user',
    )
    success = report.get('enviados', 0) > 0
    payload = {'success': success, **report}
    if not success and not payload.get('error'):
        payload['error'] = (
            'Nenhuma mensagem teve confirmacao de entrega no WhatsApp. '
            'Verifique telefone dos destinatarios e a sessao conectada.'
        )
    return payload

def trigger_whatsapp_on_new_deadline(workspace_id: int, prazo_id: int) -> Dict[str, Any]:
    """Dispara WhatsApp automático ao criar um novo prazo."""
    db = get_db()
    config = get_workspace_whatsapp_config(db, workspace_id)
    if not config.get('auto_novo_prazo'):
        return {'success': False, 'reason': 'auto_novo_prazo_desativado'}

    prazo = db.execute(
        '''SELECT p.id, p.tipo, p.data_prazo, p.descricao,
                  pr.numero as processo_numero, pr.titulo as processo_titulo
           FROM prazos p
           JOIN processos pr ON p.processo_id = pr.id
           WHERE p.id = ? AND p.workspace_id = ?''',
        (prazo_id, workspace_id),
    ).fetchone()
    if not prazo:
        return {'success': False, 'reason': 'prazo_nao_encontrado'}

    prazo_data = dict(prazo)
    message = (
        "Novo prazo cadastrado\n\n"
        f"Processo: {prazo_data.get('processo_numero')}\n"
        f"Titulo: {prazo_data.get('processo_titulo')}\n"
        f"Tipo: {prazo_data.get('tipo')}\n"
        f"Data: {prazo_data.get('data_prazo')}\n"
        f"Descricao: {prazo_data.get('descricao') or '-'}"
    )

    if config.get('ai_generate_messages'):
        message = maybe_generate_whatsapp_message_with_ai(
            base_message=message,
            objective='Notificar equipe sobre novo prazo',
            ai_prompt=config.get('ai_prompt') or '',
        )

    return dispatch_platform_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        message=message,
    )


def trigger_whatsapp_on_new_task(workspace_id: int, tarefa_id: int) -> Dict[str, Any]:
    """Dispara WhatsApp automático para responsável da tarefa."""
    db = get_db()
    config = get_workspace_whatsapp_config(db, workspace_id)
    if not config.get('auto_nova_tarefa'):
        return {'success': False, 'reason': 'auto_nova_tarefa_desativado'}

    tarefa = db.execute(
        '''SELECT t.id, t.titulo, t.descricao, t.prioridade, t.data_vencimento,
                  u.id as user_id, u.nome as user_nome, u.telefone as user_telefone,
                  p.numero as processo_numero
           FROM tarefas t
           LEFT JOIN users u ON t.assigned_to = u.id
           LEFT JOIN processos p ON t.processo_id = p.id
           WHERE t.id = ? AND t.workspace_id = ?''',
        (tarefa_id, workspace_id),
    ).fetchone()
    if not tarefa:
        return {'success': False, 'reason': 'tarefa_nao_encontrada'}

    task = dict(tarefa)
    if not task.get('user_telefone'):
        return {'success': False, 'reason': 'responsavel_sem_telefone'}

    message = (
        "Nova tarefa atribuida\n\n"
        f"Responsavel: {task.get('user_nome')}\n"
        f"Titulo: {task.get('titulo')}\n"
        f"Processo: {task.get('processo_numero') or '-'}\n"
        f"Prioridade: {task.get('prioridade')}\n"
        f"Vencimento: {task.get('data_vencimento') or '-'}\n"
        f"Descricao: {task.get('descricao') or '-'}"
    )

    if config.get('ai_generate_messages'):
        message = maybe_generate_whatsapp_message_with_ai(
            base_message=message,
            objective='Notificar responsavel sobre nova tarefa',
            ai_prompt=config.get('ai_prompt') or '',
        )

    recipient = [{
        'id': task.get('user_id'),
        'nome': task.get('user_nome'),
        'telefone': task.get('user_telefone'),
    }]

    return dispatch_platform_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        message=message,
        recipients=recipient,
    )


def trigger_whatsapp_on_new_movements(
    workspace_id: int,
    processo_id: int,
    numero_processo: str,
    movimentacoes: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Dispara WhatsApp automático ao detectar novas movimentações."""
    db = get_db()
    config = get_workspace_whatsapp_config(db, workspace_id)
    if not config.get('auto_nova_movimentacao'):
        return {'success': False, 'reason': 'auto_nova_movimentacao_desativado'}

    if not movimentacoes:
        return {'success': False, 'reason': 'sem_movimentacoes'}

    resumo_linhas = []
    for mov in movimentacoes[:5]:
        resumo_linhas.append(f"- {mov.get('nome')} ({mov.get('data')})")

    more_count = max(len(movimentacoes) - 5, 0)
    complemento = f"\n...e mais {more_count} movimentacao(oes)." if more_count else ''

    message = (
        "Atualizacao de processo\n\n"
        f"Processo: {numero_processo}\n"
        f"Novas movimentacoes: {len(movimentacoes)}\n\n"
        + '\n'.join(resumo_linhas)
        + complemento
    )

    if config.get('ai_generate_messages'):
        message = maybe_generate_whatsapp_message_with_ai(
            base_message=message,
            objective='Notificar equipe sobre novas movimentacoes de processo',
            ai_prompt=config.get('ai_prompt') or '',
        )

    return dispatch_platform_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        message=message,
    )


def build_workspace_daily_summary_message(
    db,
    workspace_id: int,
    ai_enabled: bool = False,
    ai_prompt: str = '',
) -> str:
    """Monta mensagem de resumo diário do escritório."""
    hoje = datetime.now().strftime('%Y-%m-%d')
    amanha = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    total_processos_ativos = db.execute(
        "SELECT COUNT(*) as count FROM processos WHERE workspace_id = ? AND status = 'ativo'",
        (workspace_id,),
    ).fetchone()['count']

    tarefas_pendentes = db.execute(
        "SELECT COUNT(*) as count FROM tarefas WHERE workspace_id = ? AND status IN ('pendente', 'em_andamento')",
        (workspace_id,),
    ).fetchone()['count']

    prazos_hoje = db.execute(
        "SELECT COUNT(*) as count FROM prazos WHERE workspace_id = ? AND status = 'pendente' AND data_prazo = ?",
        (workspace_id, hoje),
    ).fetchone()['count']

    prazos_amanha = db.execute(
        "SELECT COUNT(*) as count FROM prazos WHERE workspace_id = ? AND status = 'pendente' AND data_prazo = ?",
        (workspace_id, amanha),
    ).fetchone()['count']

    movimentacoes_hoje = db.execute(
        '''SELECT COUNT(*) as count
           FROM movimentacoes_processo
           WHERE workspace_id = ? AND date(created_at) = ?''',
        (workspace_id, hoje),
    ).fetchone()['count']

    message = (
        "Resumo diario do escritorio\n\n"
        f"- Processos ativos: {total_processos_ativos}\n"
        f"- Tarefas pendentes/em andamento: {tarefas_pendentes}\n"
        f"- Prazos para hoje: {prazos_hoje}\n"
        f"- Prazos para amanha: {prazos_amanha}\n"
        f"- Novas movimentacoes hoje: {movimentacoes_hoje}\n\n"
        "JurisPocket - acompanhamento diario"
    )

    if ai_enabled:
        message = maybe_generate_whatsapp_message_with_ai(
            base_message=message,
            objective='Enviar resumo diario do escritorio via WhatsApp',
            ai_prompt=ai_prompt,
        )

    return message


def send_workspace_daily_summary(
    workspace_id: int,
    force: bool = False,
) -> Dict[str, Any]:
    """Envia resumo diário do workspace via WhatsApp."""
    db = get_db()
    config = get_workspace_whatsapp_config(db, workspace_id)
    if not force and not config.get('auto_resumo_diario'):
        return {'success': False, 'reason': 'auto_resumo_diario_desativado'}

    marker = datetime.now().strftime('%Y-%m-%d')
    if not force and was_whatsapp_automacao_sent(
        db,
        workspace_id=workspace_id,
        tipo='resumo_diario',
        entity_type='workspace',
        entity_id=workspace_id,
        marker=marker,
    ):
        return {'success': False, 'reason': 'resumo_ja_enviado_hoje'}

    message = build_workspace_daily_summary_message(
        db=db,
        workspace_id=workspace_id,
        ai_enabled=config.get('ai_generate_messages', False),
        ai_prompt=config.get('ai_prompt') or '',
    )

    report = dispatch_platform_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        message=message,
    )

    if report.get('success'):
        register_whatsapp_automacao_log(
            db=db,
            workspace_id=workspace_id,
            tipo='resumo_diario',
            entity_type='workspace',
            entity_id=workspace_id,
            marker=marker,
            payload={
                'enviados': report.get('enviados', 0),
                'falhas': report.get('falhas', 0),
            },
        )

    return report

# ============================================================================
# BACKGROUND JOBS
# ============================================================================

scheduler = BackgroundScheduler()

def monitorar_processos_job():
    """Job para monitorar processos PJe diariamente"""
    with app.app_context():
        db = get_db()
        
        # Busca processos ativos com URL PJe
        processos = db.execute(
            'SELECT * FROM processos WHERE status = ? AND pje_url IS NOT NULL',
            ('ativo',)
        ).fetchall()
        
        for proc in processos:
            try:
                resultado = PJeMonitor.consultar_processo(proc['numero'])
                
                # Registra log
                db.execute(
                    '''INSERT INTO pje_monitor_logs 
                       (workspace_id, processo_id, numero_processo, movimento_encontrado, 
                        data_movimento, sucesso, erro) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)''',
                    (
                        proc['workspace_id'],
                        proc['id'],
                        proc['numero'],
                        resultado.get('movimentos', [{}])[0].get('descricao') if resultado.get('sucesso') else None,
                        datetime.now() if resultado.get('sucesso') else None,
                        resultado.get('sucesso', False),
                        resultado.get('erro')
                    )
                )
                
                # Atualiza processo se houver movimento novo
                if resultado.get('sucesso') and resultado.get('movimentos'):
                    movimento = resultado['movimentos'][0]
                    db.execute(
                        'UPDATE processos SET ultimo_movimento = ?, ultimo_movimento_data = ? WHERE id = ?',
                        (movimento.get('descricao'), datetime.now(), proc['id'])
                    )
                
                db.commit()
                
            except Exception as e:
                print(f"Erro ao monitorar processo {proc['numero']}: {e}")


def monitorar_datajud_job():
    """
    JOB DE MONITORAMENTO DATAJUD - Executado automaticamente pelo APScheduler
    
    Este job consulta a API Datajud (CNJ) para todos os processos ativos
    que possuem monitoramento habilitado. Roda 2x ao dia: 08:00 e 17:30
    
    FUNCIONAMENTO:
    1. Busca processos com monitoramento ativo (monitorar_datajud = 1)
    2. Consulta a API Datajud para cada processo
    3. Insere novas movimentações (INSERT IGNORE evita duplicatas)
    4. Cria alertas/notificações para movimentações novas
    5. Registra logs de consulta para auditoria
    
    CONFIGURAÇÃO DO AGENDADOR:
    - Manhã: 08:00 (antes do expediente)
    - Tarde: 17:30 (final do expediente)
    
    CHAVE DE API:
    Configure a variável de ambiente DATAJUD_API_KEY ou edite diretamente
    na classe DatajudMonitor.API_KEY
    """
    with app.app_context():
        db = get_db()
        
        print(f"[{datetime.now()}] Iniciando monitoramento Datajud...")
        
        # Busca processos com monitoramento ativo
        processos = db.execute('''
            SELECT p.*, c.monitorar_datajud, c.ultima_verificacao, c.ultimo_movimento_datajud
            FROM processos p
            LEFT JOIN processo_monitor_config c ON p.id = c.processo_id
            WHERE p.status = ? 
              AND (c.monitorar_datajud = 1 OR c.monitorar_datajud IS NULL)
            ORDER BY c.ultima_verificacao ASC NULLS FIRST
            LIMIT 50  -- Limite diário para não sobrecarregar a API
        ''', ('ativo',)).fetchall()
        
        if not processos:
            print(f"[{datetime.now()}] Nenhum processo para monitorar.")
            return
        
        print(f"[{datetime.now()}] Monitorando {len(processos)} processos...")
        
        for proc in processos:
            try:
                processo_id = proc['id']
                workspace_id = proc['workspace_id']
                numero_processo = proc['numero']
                tribunal_sigla = DatajudMonitor.identificar_tribunal(numero_processo)
                
                if not tribunal_sigla:
                    print(f"  ⚠️ Processo {numero_processo}: Tribunal não identificado")
                    continue
                
                # Consulta API Datajud
                inicio_consulta = datetime.now()
                resultado = DatajudMonitor.consultar_processo(numero_processo, tribunal_sigla)
                fim_consulta = datetime.now()
                tempo_ms = int((fim_consulta - inicio_consulta).total_seconds() * 1000)
                
                # Status da consulta para log
                status_consulta = 'sucesso' if resultado.get('sucesso') and resultado.get('encontrado') else 'erro'
                movs_encontradas = resultado.get('total_movimentos', 0) if resultado.get('encontrado') else 0
                erro_msg = resultado.get('erro') if not resultado.get('sucesso') else None
                
                # Registra log da consulta
                db.execute('''
                    INSERT INTO datajud_consulta_logs 
                    (workspace_id, processo_id, numero_processo, tribunal_sigla, 
                     endpoint_usado, status_consulta, movimentacoes_encontradas, 
                     movimentacoes_novas, erro_msg, tempo_resposta_ms, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    workspace_id, processo_id, numero_processo, tribunal_sigla,
                    DatajudMonitor.TRIBUNAIS_ENDPOINTS.get(tribunal_sigla, ''),
                    status_consulta, movs_encontradas, 0, erro_msg, tempo_ms, fim_consulta
                ))
                
                # Se encontrou o processo, processa movimentações
                if resultado.get('sucesso') and resultado.get('encontrado') and resultado.get('movimentos'):
                    movimentos = resultado['movimentos']
                    
                    # Salva movimentações (INSERT IGNORE para evitar duplicatas)
                    resultado_salvamento = DatajudMonitor.salvar_movimentacoes(
                        processo_id, workspace_id, movimentos
                    )
                    
                    movs_novas = resultado_salvamento.get('novas_movimentacoes', [])
                    
                    # Atualiza log com quantidade de movimentações novas
                    db.execute('''
                        UPDATE datajud_consulta_logs 
                        SET movimentacoes_novas = ? 
                        WHERE processo_id = ? AND created_at = ?
                    ''', (len(movs_novas), processo_id, fim_consulta))
                    
                    # Se há movimentações novas, cria alertas
                    if movs_novas:
                        alertas_criados = DatajudMonitor.criar_alertas_movimentacao(
                            processo_id, workspace_id, movs_novas, numero_processo
                        )
                        print(f"  ✅ {numero_processo}: {len(movs_novas)} nova(s) movimentação(ões), {alertas_criados} alerta(s)")
                        
                        # Atualiza último movimento no processo
                        ultima_mov = movs_novas[0]  # Mais recente
                        db.execute('''
                            UPDATE processos 
                            SET ultimo_movimento = ?, ultimo_movimento_data = ? 
                            WHERE id = ?
                        ''', (ultima_mov['nome'], ultima_mov['data'], processo_id))
                    else:
                        print(f"  ℹ️ {numero_processo}: Sem novas movimentações")
                
                elif not resultado.get('encontrado'):
                    print(f"  ⚠️ {numero_processo}: Processo não encontrado no tribunal {tribunal_sigla}")
                else:
                    print(f"  ❌ {numero_processo}: Erro - {resultado.get('erro', 'Desconhecido')}")
                
                # Atualiza configuração de monitoramento
                db.execute('''
                    INSERT INTO processo_monitor_config 
                    (processo_id, workspace_id, monitorar_datajud, ultima_verificacao, 
                     total_movimentacoes, updated_at)
                    VALUES (?, ?, 1, ?, ?, ?)
                    ON CONFLICT(processo_id) DO UPDATE SET
                    ultima_verificacao = excluded.ultima_verificacao,
                    total_movimentacoes = excluded.total_movimentacoes,
                    updated_at = excluded.updated_at
                ''', (processo_id, workspace_id, fim_consulta, movs_encontradas, fim_consulta))
                
                db.commit()
                
            except Exception as e:
                print(f"  ❌ Erro ao processar {proc.get('numero', 'desconhecido')}: {e}")
                db.rollback()
                continue
        
        print(f"[{datetime.now()}] Monitoramento Datajud concluído.")


def verificar_prazos_job():
    """Job para verificar prazos e disparar lembretes automáticos via WhatsApp."""
    with app.app_context():
        db = get_db()
        hoje = datetime.now().date()
        data_limite = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')

        prazos = db.execute(
            '''SELECT p.id, p.workspace_id, p.tipo, p.data_prazo, p.descricao,
                      pr.numero as processo_numero, pr.titulo as processo_titulo
               FROM prazos p
               JOIN processos pr ON p.processo_id = pr.id
               WHERE p.status = 'pendente' AND p.data_prazo <= ?''',
            (data_limite,),
        ).fetchall()

        workspace_config_cache: Dict[int, Dict[str, Any]] = {}
        total_enviados = 0

        for prazo in prazos:
            prazo_dict = dict(prazo)
            workspace_id = int(prazo_dict['workspace_id'])

            if workspace_id not in workspace_config_cache:
                workspace_config_cache[workspace_id] = get_workspace_whatsapp_config(db, workspace_id)
            config = workspace_config_cache[workspace_id]

            if not config.get('auto_lembrete_prazo'):
                continue

            data_raw = str(prazo_dict.get('data_prazo') or '')[:10]
            try:
                data_evento = datetime.strptime(data_raw, '%Y-%m-%d').date()
            except ValueError:
                continue

            dias_restantes = (data_evento - hoje).days
            if dias_restantes < 0:
                continue

            if dias_restantes not in config.get('reminder_days_list', [7, 3, 1, 0]):
                continue

            marker = f"D-{dias_restantes}"
            if was_whatsapp_automacao_sent(
                db=db,
                workspace_id=workspace_id,
                tipo='lembrete_prazo',
                entity_type='prazo',
                entity_id=int(prazo_dict['id']),
                marker=marker,
            ):
                continue

            if dias_restantes == 0:
                cabecalho = "Lembrete de prazo: hoje e o dia"
            elif dias_restantes == 1:
                cabecalho = "Lembrete de prazo: falta 1 dia"
            else:
                cabecalho = f"Lembrete de prazo: faltam {dias_restantes} dias"

            message = (
                f"{cabecalho}\n\n"
                f"Processo: {prazo_dict.get('processo_numero')}\n"
                f"Titulo: {prazo_dict.get('processo_titulo')}\n"
                f"Tipo: {prazo_dict.get('tipo')}\n"
                f"Data: {prazo_dict.get('data_prazo')}\n"
                f"Descricao: {prazo_dict.get('descricao') or '-'}"
            )

            if config.get('ai_generate_messages'):
                message = maybe_generate_whatsapp_message_with_ai(
                    base_message=message,
                    objective='Lembrete de prazo processual',
                    ai_prompt=config.get('ai_prompt') or '',
                )

            report = dispatch_platform_whatsapp_message(
                db=db,
                workspace_id=workspace_id,
                message=message,
            )

            if report.get('success'):
                total_enviados += int(report.get('enviados', 0))
                register_whatsapp_automacao_log(
                    db=db,
                    workspace_id=workspace_id,
                    tipo='lembrete_prazo',
                    entity_type='prazo',
                    entity_id=int(prazo_dict['id']),
                    marker=marker,
                    payload={
                        'dias_restantes': dias_restantes,
                        'enviados': report.get('enviados', 0),
                        'falhas': report.get('falhas', 0),
                    },
                )

        if total_enviados:
            print(f"[whatsapp] Lembretes de prazo enviados: {total_enviados}")


def enviar_resumo_diario_whatsapp_job():
    """Job para envio de resumo diário do escritório via WhatsApp."""
    with app.app_context():
        db = get_db()
        agora = datetime.now().strftime('%H:%M')

        workspaces = db.execute(
            '''SELECT workspace_id
               FROM workspace_whatsapp_config
               WHERE auto_resumo_diario = 1 AND daily_summary_time = ?''',
            (agora,),
        ).fetchall()

        if not workspaces:
            return

        total_workspaces = 0
        total_enviados = 0
        for row in workspaces:
            workspace_id = int(row['workspace_id'])
            report = send_workspace_daily_summary(workspace_id=workspace_id, force=False)
            if report.get('success'):
                total_workspaces += 1
                total_enviados += int(report.get('enviados', 0))

        if total_workspaces:
            print(
                f"[whatsapp] Resumo diário enviado para {total_workspaces} workspace(s), "
                f"mensagens enviadas: {total_enviados}"
            )

# Agenda jobs
scheduler.add_job(monitorar_processos_job, 'cron', hour=6, minute=0, id='pje_monitor')
scheduler.add_job(verificar_prazos_job, 'cron', hour=8, minute=0, id='verificar_prazos')

# ============================================================================
# AGENDAMENTO DO MONITORAMENTO DATAJUD (NOVO)
# ============================================================================
# Configura o job para rodar 2x ao dia: 08:00 e 17:30
# Você pode alterar os horários abaixo conforme necessário
scheduler.add_job(
    monitorar_datajud_job, 
    'cron', 
    hour='8,17',      # 08:00 e 17:00 (24h format)
    minute='0,30',    # 00 e 30 minutos
    id='datajud_monitor_manha',
    replace_existing=True
)
# Job específico para 17:30
scheduler.add_job(
    monitorar_datajud_job, 
    'cron', 
    hour=17, 
    minute=30, 
    id='datajud_monitor_tarde',
    replace_existing=True
)

# Job de manhã às 08:00
scheduler.add_job(
    monitorar_datajud_job, 
    'cron', 
    hour=8, 
    minute=0, 
    id='datajud_monitor_manha_8h',
    replace_existing=True
)

# Job de resumo diário WhatsApp (verifica a cada minuto o horário configurado por workspace)
scheduler.add_job(
    enviar_resumo_diario_whatsapp_job,
    'cron',
    minute='*',
    id='whatsapp_resumo_diario',
    replace_existing=True
)

print(f"[{datetime.now()}] Agendador iniciado. Jobs configurados:")
print(f"  - PJe Monitor: 06:00 diariamente")
print(f"  - Verificar Prazos: 08:00 diariamente")
print(f"  - Datajud Monitor: 08:00 e 17:30 diariamente")
print(f"  - WhatsApp Resumo Diário: checagem a cada minuto")

scheduler.start()

# Graceful shutdown do scheduler
import atexit
atexit.register(lambda: scheduler.shutdown())

# ============================================================================
# API ROUTES - AUTH
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user with workspace"""
    data = request.get_json() or {}
    
    nome = data.get('nome')
    email = data.get('email')
    password = data.get('password')
    workspace_nome = data.get('workspace_nome', f'Escritório de {nome}')
    
    if not all([nome, email, password]):
        return jsonify({'error': 'Dados incompletos'}), 400
    
    db = get_db()
    
    # Check if email exists
    if db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone():
        return jsonify({'error': 'Email já cadastrado'}), 409
    
    # Create workspace
    cursor = db.execute('INSERT INTO workspaces (nome) VALUES (?)', (workspace_nome,))
    workspace_id = cursor.lastrowid
    
    # Create user as admin
    password_hash = hash_senha(password)
    cursor = db.execute(
        'INSERT INTO users (workspace_id, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        (workspace_id, nome, email, password_hash, 'admin')
    )
    user_id = cursor.lastrowid

    db.commit()

    token = gerar_jwt_token(user_id, workspace_id, is_admin=True)
    
    return jsonify({
        'token': token,
        'user': {
            'id': user_id,
            'nome': nome,
            'email': email,
            'role': 'admin',
            'workspace_id': workspace_id
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json() or {}
    
    email = data.get('email')
    password = data.get('password')
    
    if not all([email, password]):
        return jsonify({'error': 'Dados incompletos'}), 400
    
    db = get_db()
    
    # Busca usuário ativo
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    
    # Se não encontrou, busca usuários inativos (email com sufixo .inativo.id)
    if not user:
        # Busca padrão: email termina com .inativo.{numero}
        user = db.execute(
            "SELECT * FROM users WHERE email LIKE ? AND role = 'inativo'",
            (f'{email}.inativo.%',)
        ).fetchone()
    
    if not user or user['password_hash'] != hash_senha(password):
        return jsonify({'error': 'Credenciais inválidas'}), 401

    # Determina se é admin com base na role
    is_admin = user['role'] in ['admin', 'superadmin'] if 'role' in user.keys() else False
    token = gerar_jwt_token(user['id'], user['workspace_id'], is_admin=is_admin)
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'nome': user['nome'],
            'email': email,  # Retorna o email original (sem sufixo .inativo)
            'role': user['role'],
            'workspace_id': user['workspace_id']
        }
    })

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    """Get current user info"""
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    # Buscar workspace e plano
    workspace = None
    if workspace_id:
        row = db.execute('''
            SELECT w.*, p.codigo as plano, p.nome as plano_nome, p.limites 
            FROM workspaces w
            LEFT JOIN assinaturas a ON w.id = a.workspace_id AND a.status = 'ativo'
            LEFT JOIN planos p ON a.plano_id = p.id
            WHERE w.id = ?
            ORDER BY a.created_at DESC LIMIT 1
        ''', (workspace_id,)).fetchone()
        
        if row:
            workspace = dict(row)
            # Se não tem plano, assume gratuito
            if not workspace.get('plano'):
                workspace['plano'] = 'gratuito'
                workspace['plano_nome'] = 'Gratuito'
                workspace['limites'] = json.dumps({
                    'processos': 5, 
                    'clientes': 20, 
                    'usuarios': 2, 
                    'armazenamento': 104857600
                })
        else:
            # Workspace não encontrado, mas temos workspace_id
            workspace = {
                'id': workspace_id,
                'plano': 'gratuito',
                'plano_nome': 'Gratuito',
                'limites': json.dumps({
                    'processos': 5, 
                    'clientes': 20, 
                    'usuarios': 2, 
                    'armazenamento': 104857600
                })
            }
    
    return jsonify({
        'user': g.auth['user'],
        'workspace': workspace
    })

@app.route('/api/auth/me', methods=['PUT'])
@require_auth
def update_me():
    """Update current user profile"""
    data = request.get_json() or {}
    db = get_db()
    
    # Atualiza os campos permitidos
    campos_permitidos = ['nome', 'telefone', 'oab', 'alerta_email', 'alerta_whatsapp']
    updates = []
    params = []
    
    for campo in campos_permitidos:
        if campo in data:
            updates.append(f"{campo} = ?")
            params.append(data[campo])
    
    if updates:
        params.append(g.auth['user_id'])
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        db.execute(query, params)
        db.commit()
    
    # Retorna o usuário atualizado
    user = db.execute('SELECT * FROM users WHERE id = ?', (g.auth['user_id'],)).fetchone()
    return jsonify({'user': dict(user)})

@app.route('/api/auth/avatar', methods=['POST'])
@require_auth
def upload_avatar():
    """Upload user avatar"""
    if 'avatar' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    # Validar extensão
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({'error': 'Formato não suportado. Use PNG, JPG, GIF ou WEBP'}), 400
    
    # Criar nome único
    filename = f"avatar_{g.auth['user_id']}_{int(datetime.now().timestamp())}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Salvar arquivo
    file.save(filepath)
    
    # Atualizar banco
    avatar_url = f"/uploads/{filename}"
    db = get_db()
    db.execute('UPDATE users SET avatar_url = ? WHERE id = ?', (avatar_url, g.auth['user_id']))
    db.commit()
    
    return jsonify({'avatar_url': avatar_url})

@app.route('/api/auth/avatar', methods=['DELETE'])
@require_auth
def delete_avatar():
    """Delete user avatar"""
    db = get_db()
    
    # Buscar avatar atual
    user = db.execute('SELECT avatar_url FROM users WHERE id = ?', (g.auth['user_id'],)).fetchone()
    
    if user and user['avatar_url']:
        # Deletar arquivo
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(user['avatar_url']))
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Limpar no banco
        db.execute('UPDATE users SET avatar_url = NULL WHERE id = ?', (g.auth['user_id'],))
        db.commit()
    
    return jsonify({'message': 'Avatar removido'})

# ============================================================================
# API ROUTES - CLIENTES
# ============================================================================

@app.route('/api/clientes', methods=['GET'])
@require_auth
def list_clientes():
    """List all clients with process count"""
    db = get_db()
    search = request.args.get('search', '')
    
    query = '''SELECT c.*, 
               (SELECT COUNT(*) FROM processos WHERE cliente_id = c.id) as processos_count
               FROM clientes c 
               WHERE c.workspace_id = ?'''
    params = [g.auth['workspace_id']]
    
    if search:
        query += ' AND (c.nome LIKE ? OR c.email LIKE ? OR c.cpf_cnpj LIKE ? OR c.telefone LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%', f'%{search}%'])
    
    query += ' ORDER BY c.nome'
    
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/clientes', methods=['POST'])
@require_auth
def create_cliente():
    """Create new client"""
    data = request.get_json()
    db = get_db()
    
    # Verificar limite de clientes
    permitido, limite, atual, mensagem = verificar_limite_workspace(g.auth['workspace_id'], 'clientes')
    if not permitido:
        return jsonify({
            'error': 'Limite atingido',
            'message': mensagem,
            'limite': limite,
            'atual': atual,
            'sugestao': 'Faça upgrade para o plano Pro para criar clientes ilimitados.'
        }), 403
    
    cursor = db.execute(
        '''INSERT INTO clientes (workspace_id, nome, email, telefone, cpf_cnpj, rg_ie, 
           data_nascimento, nacionalidade, estado_civil, profissao, endereco, numero, complemento, 
           bairro, cidade, estado, cep, observacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (g.auth['workspace_id'], data.get('nome'), data.get('email'), 
         data.get('telefone'), data.get('cpf_cnpj'), data.get('rg_ie'),
         data.get('data_nascimento'), data.get('nacionalidade', 'Brasileiro(a)'),
         data.get('estado_civil'), data.get('profissao'), data.get('endereco'),
         data.get('numero'), data.get('complemento'), data.get('bairro'),
         data.get('cidade'), data.get('estado'), data.get('cep'),
         data.get('observacoes'))
    )
    db.commit()
    
    cliente = db.execute('SELECT * FROM clientes WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify(dict(cliente)), 201

@app.route('/api/clientes/<int:id>', methods=['GET'])
@require_auth
def get_cliente(id):
    """Get client by ID"""
    db = get_db()
    cliente = db.execute(
        'SELECT * FROM clientes WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    
    return jsonify(dict(cliente))

@app.route('/api/clientes/<int:id>', methods=['PUT'])
@require_auth
def update_cliente(id):
    """Update client"""
    data = request.get_json()
    db = get_db()
    
    db.execute(
        '''UPDATE clientes SET nome = ?, email = ?, telefone = ?, 
           cpf_cnpj = ?, rg_ie = ?, data_nascimento = ?, nacionalidade = ?, estado_civil = ?, 
           profissao = ?, endereco = ?, numero = ?, complemento = ?, bairro = ?, 
           cidade = ?, estado = ?, cep = ?, observacoes = ? 
           WHERE id = ? AND workspace_id = ?''',
        (data.get('nome'), data.get('email'), data.get('telefone'),
         data.get('cpf_cnpj'), data.get('rg_ie'), data.get('data_nascimento'),
         data.get('nacionalidade', 'Brasileiro(a)'), data.get('estado_civil'),
         data.get('profissao'), data.get('endereco'), data.get('numero'),
         data.get('complemento'), data.get('bairro'), data.get('cidade'),
         data.get('estado'), data.get('cep'), data.get('observacoes'),
         id, g.auth['workspace_id'])
    )
    db.commit()
    
    cliente = db.execute('SELECT * FROM clientes WHERE id = ?', (id,)).fetchone()
    return jsonify(dict(cliente))

@app.route('/api/clientes/<int:id>', methods=['DELETE'])
@require_auth
def delete_cliente(id):
    """Delete client"""
    db = get_db()
    db.execute('DELETE FROM clientes WHERE id = ? AND workspace_id = ?', (id, g.auth['workspace_id']))
    db.commit()
    return jsonify({'message': 'Cliente excluído'})

# ============================================================================
# API ROUTES - PROCESSOS
# ============================================================================

@app.route('/api/processos', methods=['GET'])
@require_auth
def list_processos():
    """List all processes"""
    db = get_db()
    
    status = request.args.get('status')
    cliente_id = request.args.get('cliente_id')
    search = request.args.get('search', '')
    
    query = '''SELECT p.*, c.nome as cliente_nome,
               (SELECT COUNT(*) FROM prazos WHERE processo_id = p.id AND status = 'pendente') as prazos_pendentes,
               (SELECT monitorar_datajud FROM processo_monitor_config WHERE processo_id = p.id) as monitoramento_ativo,
               (SELECT COUNT(*) FROM tarefas WHERE processo_id = p.id AND status = 'pendente') as tarefas_pendentes,
               (SELECT COUNT(*) FROM movimentacoes_processo WHERE processo_id = p.id AND (lida = 0 OR lida IS NULL)) as movimentacoes_novas
               FROM processos p 
               JOIN clientes c ON p.cliente_id = c.id 
               WHERE p.workspace_id = ?'''
    params = [g.auth['workspace_id']]
    
    if status:
        query += ' AND p.status = ?'
        params.append(status)
    
    if cliente_id:
        query += ' AND p.cliente_id = ?'
        params.append(cliente_id)
    
    if search:
        query += ' AND (p.numero LIKE ? OR p.titulo LIKE ? OR c.nome LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
    
    query += ' ORDER BY p.created_at DESC'
    
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

def verificar_limite_workspace(workspace_id: int, entidade: str) -> tuple:
    """Verifica se o workspace atingiu o limite de uma entidade.
    Retorna (permitido: bool, limite: int, atual: int, mensagem: str)
    """
    db = get_db()
    
    # Buscar plano do workspace
    assinatura = db.execute('''
        SELECT p.codigo, p.limites FROM assinaturas a
        JOIN planos p ON a.plano_id = p.id
        WHERE a.workspace_id = ? AND a.status = 'ativo'
        ORDER BY a.created_at DESC LIMIT 1
    ''', (workspace_id,)).fetchone()
    
    # Se não tem assinatura ativa, assume plano gratuito
    if not assinatura:
        plano_codigo = 'gratuito'
        limites = {'processos': 5, 'clientes': 20, 'usuarios': 2, 'armazenamento': 104857600}
    else:
        plano_codigo = assinatura['codigo']
        limites = json.loads(assinatura['limites'] or '{}')
    
    limite = limites.get(entidade, -1)
    
    # -1 significa ilimitado
    if limite == -1:
        return True, -1, 0, ''
    
    # Contar registros atuais
    if entidade == 'processos':
        atual = db.execute('SELECT COUNT(*) as count FROM processos WHERE workspace_id = ?', 
                          (workspace_id,)).fetchone()['count']
    elif entidade == 'clientes':
        atual = db.execute('SELECT COUNT(*) as count FROM clientes WHERE workspace_id = ?', 
                          (workspace_id,)).fetchone()['count']
    elif entidade == 'usuarios':
        atual = db.execute('SELECT COUNT(*) as count FROM users WHERE workspace_id = ?', 
                          (workspace_id,)).fetchone()['count']
    else:
        return True, -1, 0, ''
    
    if atual >= limite:
        return False, limite, atual, f'Limite de {entidade} atingido. Plano {plano_codigo}: {limite} {entidade}.'
    
    return True, limite, atual, ''


@app.route('/api/processos', methods=['POST'])
@require_auth
def create_processo():
    """Create new process"""
    data = request.get_json()
    db = get_db()
    
    # Verificar limite de processos
    permitido, limite, atual, mensagem = verificar_limite_workspace(g.auth['workspace_id'], 'processos')
    if not permitido:
        return jsonify({
            'error': 'Limite atingido',
            'message': mensagem,
            'limite': limite,
            'atual': atual,
            'sugestao': 'Faça upgrade para o plano Pro para criar processos ilimitados.'
        }), 403
    
    # Validação dos campos obrigatórios
    cliente_id = data.get('cliente_id')
    numero = data.get('numero')
    titulo = data.get('titulo')
    
    if not cliente_id:
        return jsonify({'error': 'Cliente é obrigatório', 'message': 'Selecione um cliente para o processo'}), 400
    if not numero or not str(numero).strip():
        return jsonify({'error': 'Número do processo é obrigatório', 'message': 'Informe o número do processo'}), 400
    if not titulo or not str(titulo).strip():
        return jsonify({'error': 'Título é obrigatório', 'message': 'Informe o título do processo'}), 400
    
    # ========================================================================
    # IDENTIFICA O TRIBUNAL AUTOMATICAMENTE PELO NÚMERO DO PROCESSO
    # ========================================================================
    tribunal_info = DatajudMonitor.identificar_tribunal_completo(numero)
    tribunal_codigo = tribunal_info['sigla'] if tribunal_info else None
    tribunal_nome = tribunal_info['nome'] if tribunal_info else None
    tribunal_uf = tribunal_info['uf'] if tribunal_info else None
    
    if tribunal_info:
        print(f"[Processo] Tribunal identificado: {tribunal_codigo} - {tribunal_nome} ({tribunal_uf or 'N/A'})")
    else:
        print(f"[Processo] Não foi possível identificar tribunal para: {numero}")
    
    cursor = db.execute(
        '''INSERT INTO processos (workspace_id, cliente_id, numero, numero_cnj, titulo, descricao, 
           tipo, status, comarca, vara, valor_causa, data_abertura, pje_url, tribunal_codigo, tribunal_nome, tribunal_uf)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (g.auth['workspace_id'], cliente_id, numero,
         data.get('numero_cnj'), titulo, data.get('descricao'),
         data.get('tipo'), data.get('status', 'ativo'),
         data.get('comarca'), data.get('vara'), data.get('valor_causa'),
         data.get('data_abertura'), data.get('pje_url'),
         tribunal_codigo, tribunal_nome, tribunal_uf)
    )
    processo_id = cursor.lastrowid
    
    # ========================================================================
    # ATIVA MONITORAMENTO AUTOMÁTICO VIA DATAJUD
    # ========================================================================
    # Verifica se o usuário quer ativar monitoramento (padrão: true)
    ativar_monitoramento = data.get('ativar_monitoramento', True)
    
    if ativar_monitoramento:
        if tribunal_codigo:
            # Ativa monitoramento na tabela de configuração
            db.execute('''
                INSERT INTO processo_monitor_config
                (processo_id, workspace_id, monitorar_datajud, frequencia_verificacao, 
                 ultima_verificacao, total_movimentacoes, created_at, updated_at)
                VALUES (?, ?, 1, 'diaria', NULL, 0, ?, ?)
                ON CONFLICT(processo_id) DO UPDATE SET
                monitorar_datajud = 1,
                updated_at = excluded.updated_at
            ''', (processo_id, g.auth['workspace_id'], 
                  datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                  datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            
            print(f"[Datajud] Monitoramento ativado automaticamente para processo {numero} (Tribunal: {tribunal_codigo})")
        else:
            print(f"[Datajud] Não foi possível identificar tribunal para {numero}. Monitoramento não ativado.")
    else:
        print(f"[Datajud] Monitoramento desativado pelo usuário para processo {numero}")
    
    db.commit()
    
    processo = db.execute('SELECT * FROM processos WHERE id = ?', (processo_id,)).fetchone()
    return jsonify(dict(processo)), 201

@app.route('/api/processos/<int:id>', methods=['GET'])
@require_auth
def get_processo(id):
    """Get process by ID"""
    db = get_db()
    
    processo = db.execute(
        '''SELECT p.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone
           FROM processos p 
           JOIN clientes c ON p.cliente_id = c.id 
           WHERE p.id = ? AND p.workspace_id = ?''',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    result = dict(processo)
    
    # ========================================================================
    # IDENTIFICA TRIBUNAL AUTOMATICAMENTE SE NÃO ESTIVER SALVO
    # ========================================================================
    if not result.get('tribunal_codigo') and result.get('numero'):
        tribunal_info = DatajudMonitor.identificar_tribunal_completo(result['numero'])
        if tribunal_info:
            # Atualiza no banco para futuras consultas
            db.execute('''
                UPDATE processos 
                SET tribunal_codigo = ?, tribunal_nome = ?, tribunal_uf = ?
                WHERE id = ?
            ''', (tribunal_info['sigla'], tribunal_info['nome'], tribunal_info['uf'], id))
            db.commit()
            # Atualiza o resultado para retornar os dados corretos
            result['tribunal_codigo'] = tribunal_info['sigla']
            result['tribunal_nome'] = tribunal_info['nome']
            result['tribunal_uf'] = tribunal_info['uf']
            print(f"[Processo] Tribunal identificado e salvo: {tribunal_info['sigla']} - {tribunal_info['nome']} ({tribunal_info['uf'] or 'N/A'})")
    
    # ========================================================================
    # ATUALIZA UF DO TRIBUNAL VIA API DATAJUD (PARA TRFs)
    # ========================================================================
    if result.get('tribunal_codigo') and result.get('numero'):
        tribunal_sigla = result['tribunal_codigo']
        # Para TRFs, tenta identificar a UF específica via API Datajud
        if tribunal_sigla.startswith('TRF') and not result.get('tribunal_uf'):
            try:
                print(f"[Processo] Tentando identificar UF específica para {tribunal_sigla} via API Datajud...")
                uf_especifica = DatajudMonitor.identificar_uf_por_api_datajud(result['numero'], tribunal_sigla)
                if uf_especifica:
                    # Atualiza nome simplificado
                    nome_simplificado = DatajudMonitor.get_nome_tribunal_com_uf(tribunal_sigla, uf_especifica)
                    db.execute('''
                        UPDATE processos 
                        SET tribunal_nome = ?, tribunal_uf = ?
                        WHERE id = ?
                    ''', (nome_simplificado, uf_especifica, id))
                    db.commit()
                    result['tribunal_nome'] = nome_simplificado
                    result['tribunal_uf'] = uf_especifica
                    print(f"[Processo] UF identificada via Datajud: {nome_simplificado} ({uf_especifica})")
                else:
                    print(f"[Processo] Não foi possível identificar UF específica via Datajud")
            except Exception as e:
                print(f"[Processo] Erro ao identificar UF via Datajud: {e}")
    
    # Get prazos
    prazos = db.execute(
        'SELECT * FROM prazos WHERE processo_id = ? ORDER BY data_prazo',
        (id,)
    ).fetchall()
    result['prazos'] = [dict(r) for r in prazos]
    
    # Get tarefas
    tarefas_list = db.execute(
        'SELECT * FROM tarefas WHERE processo_id = ? ORDER BY created_at DESC',
        (id,)
    ).fetchall()
    result['tarefas'] = [dict(r) for r in tarefas_list]
    
    # Get documentos
    documentos = db.execute(
        'SELECT * FROM documentos WHERE processo_id = ? ORDER BY created_at DESC',
        (id,)
    ).fetchall()
    result['documentos'] = [dict(r) for r in documentos]
    
    # Get configuração de monitoramento Datajud
    monitor_config = db.execute(
        'SELECT * FROM processo_monitor_config WHERE processo_id = ?',
        (id,)
    ).fetchone()
    
    if monitor_config:
        # Converte para dicionário e garante que monitorar_datajud seja booleano
        monitor_dict = dict(monitor_config)
        # SQLite retorna int (0 ou 1), converter para booleano explicitamente
        monitor_dict['monitorar_datajud'] = bool(monitor_dict.get('monitorar_datajud', 0))
        result['monitoramento'] = monitor_dict
    elif result.get('tribunal_codigo'):
        # Se não tem configuração mas tem tribunal identificado, cria automaticamente
        db.execute('''
            INSERT INTO processo_monitor_config
            (processo_id, workspace_id, monitorar_datajud, frequencia_verificacao, 
             ultima_verificacao, total_movimentacoes, created_at, updated_at)
            VALUES (?, ?, 1, 'diaria', NULL, 0, ?, ?)
        ''', (id, g.auth['workspace_id'], 
              datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
              datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        db.commit()
        result['monitoramento'] = {
            'monitorar_datajud': True,
            'frequencia_verificacao': 'diaria',
            'ultima_verificacao': None,
            'total_movimentacoes': 0
        }
        print(f"[Datajud] Monitoramento ativado automaticamente para processo existente {id}")
    else:
        result['monitoramento'] = {
            'monitorar_datajud': False,
            'frequencia_verificacao': None,
            'ultima_verificacao': None,
            'total_movimentacoes': 0
        }
    
    # Get movimentações do Datajud (últimas 10)
    movimentacoes = db.execute(
        '''SELECT * FROM movimentacoes_processo 
           WHERE processo_id = ? 
           ORDER BY data_movimento DESC 
           LIMIT 10''',
        (id,)
    ).fetchall()
    result['movimentacoes_datajud'] = [dict(r) for r in movimentacoes]
    
    # Contar movimentações não lidas
    count_novas = db.execute(
        '''SELECT COUNT(*) as total FROM movimentacoes_processo 
           WHERE processo_id = ? AND (lida = 0 OR lida IS NULL)''',
        (id,)
    ).fetchone()
    result['movimentacoes_novas_count'] = count_novas['total'] if count_novas else 0
    
    # Get última movimentação com info de "nova"
    ultima_mov = db.execute(
        '''SELECT * FROM movimentacoes_processo 
           WHERE processo_id = ? 
           ORDER BY data_movimento DESC 
           LIMIT 1''',
        (id,)
    ).fetchone()
    if ultima_mov:
        result['ultima_movimentacao_datajud'] = dict(ultima_mov)
        result['ultima_movimentacao_nova'] = not ultima_mov['lida'] if ultima_mov['lida'] is not None else True
    else:
        result['ultima_movimentacao_datajud'] = None
        result['ultima_movimentacao_nova'] = False
    
    # ========================================================================
    # CONTA TAREFAS PENDENTES PARA INDICADOR "PENDENTE"
    # ========================================================================
    tarefas_pendentes = db.execute(
        '''SELECT COUNT(*) as total FROM tarefas 
           WHERE processo_id = ? AND status = 'pendente' ''',
        (id,)
    ).fetchone()
    result['tarefas_pendentes_count'] = tarefas_pendentes['total'] if tarefas_pendentes else 0
    result['tem_tarefas_pendentes'] = result['tarefas_pendentes_count'] > 0
    
    return jsonify(result)

@app.route('/api/processos/<int:id>', methods=['PUT'])
@require_auth
def update_processo(id):
    """Update process"""
    try:
        # print(f"[DEBUG] Iniciando update_processo para id={id}")
        data = request.get_json()
        # print(f"[DEBUG] Dados recebidos: {data}")
        
        db = get_db()
        
        # Busca o processo atual para verificar mudança de status
        # print(f"[DEBUG] Buscando processo atual...")
        processo_atual = db.execute(
            'SELECT status FROM processos WHERE id = ? AND workspace_id = ?',
            (id, g.auth['workspace_id'])
        ).fetchone()
        
        if not processo_atual:
            # print(f"[DEBUG] Processo não encontrado")
            return jsonify({'error': 'Processo não encontrado'}), 404
        
        # print(f"[DEBUG] Processo encontrado, status atual: {processo_atual['status']}")
        
        novo_status = data.get('status')
        status_anterior = processo_atual['status']
        
        # Busca dados completos do processo para preservar valores não enviados
        processo_completo = db.execute(
            'SELECT * FROM processos WHERE id = ? AND workspace_id = ?',
            (id, g.auth['workspace_id'])
        ).fetchone()
        
        # print(f"[DEBUG] Atualizando processo... novo_status={novo_status}")
        db.execute(
            '''UPDATE processos SET numero = ?, numero_cnj = ?, titulo = ?, descricao = ?, 
               tipo = ?, status = ?, comarca = ?, vara = ?, valor_causa = ?, 
               data_abertura = ?, pje_url = ?
               WHERE id = ? AND workspace_id = ?''',
            (data.get('numero') or processo_completo['numero'], 
             data.get('numero_cnj') if 'numero_cnj' in data else processo_completo['numero_cnj'], 
             data.get('titulo') or processo_completo['titulo'], 
             data.get('descricao') if 'descricao' in data else processo_completo['descricao'], 
             data.get('tipo') if 'tipo' in data else processo_completo['tipo'], 
             novo_status, 
             data.get('comarca') if 'comarca' in data else processo_completo['comarca'], 
             data.get('vara') if 'vara' in data else processo_completo['vara'], 
             data.get('valor_causa') if 'valor_causa' in data else processo_completo['valor_causa'], 
             data.get('data_abertura') if 'data_abertura' in data else processo_completo['data_abertura'], 
             data.get('pje_url') if 'pje_url' in data else processo_completo['pje_url'],
             id, g.auth['workspace_id'])
        )
        # print(f"[DEBUG] Processo atualizado no banco")
        
        # ========================================================================
        # DESATIVA MONITORAMENTO SE PROCESSO FOR ARQUIVADO OU SUSPENSO
        # ========================================================================
        if novo_status in ['arquivado', 'suspenso'] and status_anterior != novo_status:
            # print(f"[DEBUG] Desativando monitoramento...")
            # Verifica se existe configuração de monitoramento ativa
            monitor_config = db.execute(
                'SELECT id, monitorar_datajud FROM processo_monitor_config WHERE processo_id = ?',
                (id,)
            ).fetchone()
            
            if monitor_config and monitor_config['monitorar_datajud']:
                db.execute(
                    '''UPDATE processo_monitor_config 
                       SET monitorar_datajud = 0, updated_at = ?
                       WHERE processo_id = ?''',
                    (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), id)
                )
                print(f"[Datajud] Monitoramento desativado automaticamente - processo {id} {novo_status}")
        
        # ========================================================================
        # REATIVA MONITORAMENTO SE PROCESSO VOLTAR A SER ATIVO
        # ========================================================================
        elif novo_status == 'ativo' and status_anterior in ['arquivado', 'suspenso']:
            # print(f"[DEBUG] Reativando monitoramento...")
            # Verifica se existe configuração de monitoramento
            monitor_config = db.execute(
                'SELECT id FROM processo_monitor_config WHERE processo_id = ?',
                (id,)
            ).fetchone()
            
            if monitor_config:
                # Reativa monitoramento
                db.execute(
                    '''UPDATE processo_monitor_config 
                       SET monitorar_datajud = 1, updated_at = ?
                       WHERE processo_id = ?''',
                    (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), id)
                )
                print(f"[Datajud] Monitoramento reativado automaticamente - processo {id} ativado")
        
        # print(f"[DEBUG] Fazendo commit...")
        db.commit()
        # print(f"[DEBUG] Commit realizado com sucesso")
        
        # print(f"[DEBUG] Chamando get_processo...")
        return get_processo(id)
    except Exception as e:
        import traceback
        # print(f"[DEBUG] ERRO em update_processo: {e}")
        # print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/processos/<int:id>', methods=['DELETE'])
@require_auth
def delete_processo(id):
    """Delete process"""
    db = get_db()
    db.execute('DELETE FROM processos WHERE id = ? AND workspace_id = ?', (id, g.auth['workspace_id']))
    db.commit()
    return jsonify({'message': 'Processo excluído'})

@app.route('/api/processos/<int:id>/consultar-pje', methods=['POST'])
@require_auth
@require_recurso('pje')
def consultar_pje(id):
    """Consult process in PJe"""
    db = get_db()
    
    processo = db.execute(
        'SELECT * FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    resultado = PJeMonitor.consultar_processo(processo['numero'])
    
    # Log consultation
    db.execute(
        '''INSERT INTO pje_monitor_logs 
           (workspace_id, processo_id, numero_processo, movimento_encontrado, 
            data_movimento, sucesso, erro) 
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (
            g.auth['workspace_id'],
            id,
            processo['numero'],
            resultado.get('movimentos', [{}])[0].get('descricao') if resultado.get('sucesso') else None,
            datetime.now() if resultado.get('sucesso') else None,
            resultado.get('sucesso', False),
            resultado.get('erro')
        )
    )
    
    if resultado.get('sucesso') and resultado.get('movimentos'):
        movimento = resultado['movimentos'][0]
        db.execute(
            'UPDATE processos SET ultimo_movimento = ?, ultimo_movimento_data = ? WHERE id = ?',
            (movimento.get('descricao'), datetime.now(), id)
        )
    
    db.commit()
    
    return jsonify(resultado)


@app.route('/api/processos/<int:id>/consultar-datajud', methods=['POST'])
@require_auth
@require_recurso('pje')
def consultar_datajud(id):
    """
    Consulta um processo na API Datajud (CNJ) em tempo real
    
    Este endpoint faz uma consulta manual ao Datajud, independente do monitoramento automático.
    Útil para forçar uma atualização quando o usuário quer ver movimentações recentes.
    
    Returns:
        {
            'sucesso': bool,
            'encontrado': bool,
            'tribunal': str,
            'numero_processo': str,
            'movimentos': [...],
            'total_movimentos': int
        }
    """
    db = get_db()
    
    # Busca o processo
    processo = db.execute(
        'SELECT * FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    numero_processo = processo['numero']
    workspace_id = g.auth['workspace_id']
    
    # Limpa o número do processo (remove formatação)
    import re
    numero_limpo = re.sub(r'[^0-9]', '', numero_processo)
    
    # Identifica o tribunal pelo número do processo
    tribunal_sigla = DatajudMonitor.identificar_tribunal(numero_processo)
    
    if not tribunal_sigla:
        # Extrai o código do órgão pra debug
        codigo_orgao = numero_limpo[13:16] if len(numero_limpo) >= 16 else 'N/A'
        
        return jsonify({
            'sucesso': False,
            'erro': 'Número do processo não reconhecido',
            'detalhes': {
                'numero_informado': numero_processo,
                'numero_limpo': numero_limpo,
                'tamanho': len(numero_limpo),
                'codigo_orgao': codigo_orgao,
                'formato_esperado': 'NNNNNNN-NN.NNNN.N.NN.NNNN (20 dígitos)',
                'exemplo_valido': '0000001-23.2024.8.02.0001 (TJSP)'
            },
            'mensagem': 'O número do processo deve ter 20 dígitos. Tribunais suportados: TJSP, TJRJ, TJMG, TRF1-6, TST, etc.'
        }), 400
    
    # Consulta a API Datajud
    resultado = DatajudMonitor.consultar_processo(numero_processo, tribunal_sigla)
    
    if not resultado.get('sucesso'):
        return jsonify({
            'sucesso': False,
            'erro': resultado.get('erro', 'Erro na consulta ao Datajud')
        }), 500
    
    # Se encontrou o processo, salva as movimentações
    if resultado.get('encontrado') and resultado.get('movimentos'):
        movimentos = resultado['movimentos']
        
        # Salva movimentações no banco (evita duplicatas)
        resultado_salvamento = DatajudMonitor.salvar_movimentacoes(
            id, workspace_id, movimentos
        )
        
        movs_novas = resultado_salvamento.get('novas_movimentacoes', [])
        
        # Se há movimentações novas, cria alertas
        if movs_novas:
            DatajudMonitor.criar_alertas_movimentacao(
                id, workspace_id, movs_novas, numero_processo
            )
        
        # Registra log da consulta
        db.execute('''
            INSERT INTO datajud_consulta_logs 
            (workspace_id, processo_id, numero_processo, tribunal_sigla, 
             endpoint_usado, status_consulta, movimentacoes_encontradas, 
             movimentacoes_novas, tempo_resposta_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            workspace_id, id, numero_processo, tribunal_sigla,
            DatajudMonitor.TRIBUNAIS_ENDPOINTS.get(tribunal_sigla, ''),
            'sucesso', len(movimentos), len(movs_novas),
            resultado.get('tempo_resposta_ms', 0), datetime.now()
        ))
        
        # Atualiza último movimento no processo
        if movs_novas:
            ultima_mov = movs_novas[0]
            db.execute('''
                UPDATE processos 
                SET ultimo_movimento = ?, ultimo_movimento_data = ? 
                WHERE id = ?
            ''', (ultima_mov['nome'], ultima_mov['data'], id))
        
        db.commit()
        
        # Atualiza resultado com info de novas movimentações
        resultado['movimentacoes_novas'] = len(movs_novas)
    
    return jsonify(resultado)


@app.route('/api/processos/<int:id>/movimentacoes/lidas', methods=['POST'])
@require_auth
def marcar_movimentacoes_lidas(id):
    """
    Marca todas as movimentações de um processo como lidas
    """
    db = get_db()
    
    # Verifica se o processo existe e pertence ao workspace
    processo = db.execute(
        'SELECT id FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    # Marca todas as movimentações como lidas
    db.execute('''
        UPDATE movimentacoes_processo 
        SET lida = 1 
        WHERE processo_id = ? AND (lida = 0 OR lida IS NULL)
    ''', (id,))
    
    db.commit()
    
    return jsonify({
        'sucesso': True,
        'mensagem': 'Movimentações marcadas como lidas'
    })


@app.route('/api/processos/<int:id>/pje-url', methods=['GET'])
@require_auth
def get_pje_url(id):
    """
    Retorna a URL de consulta pública do PJe para o tribunal do processo
    """
    db = get_db()
    
    # Busca o processo
    processo = db.execute(
        'SELECT numero, tribunal_codigo FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    tribunal_codigo = processo['tribunal_codigo']
    
    if not tribunal_codigo:
        return jsonify({
            'sucesso': False,
            'erro': 'Tribunal não identificado para este processo'
        }), 400
    
    # URLs de consulta pública por tribunal
    urls_consulta = {
        # 🏛️ Tribunais Superiores
        'STF': 'https://portal.stf.jus.br/processos/',
        'STJ': 'https://processo.stj.jus.br/processo/pesquisa/',
        'TST': 'https://consultaprocessual.tst.jus.br/',
        'TSE': 'https://consultaunificadapje.tse.jus.br/',
        'STM': 'https://www.stm.jus.br/processos/acompanhamento-processual',
        
        # ⚖️ Justiça Federal (TRFs)
        'TRF1': 'https://pje1g.trf1.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF2': 'https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=consulta_publica',
        'TRF3': 'https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF4': 'https://eproc.trf4.jus.br/eproc2trf4/externo_controlador.php?acao=consulta_publica',
        'TRF5': 'https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam',
        'TRF6': 'https://pje.trf6.jus.br/pje/ConsultaPublica/listView.seam',
        
        # 🏢 Justiça Estadual (TJs)
        'TJAC': 'https://esaj.tjac.jus.br/cpopg/open.do',
        'TJAL': 'https://www2.tjal.jus.br/cpopg/open.do',
        'TJAM': 'https://consultasaj.tjam.jus.br/cpopg/open.do',
        'TJAP': 'https://tucujuris.tjap.jus.br/tucujuris/pages/consultar-processo',
        'TJBA': 'https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam',
        'TJCE': 'https://pjes.tjce.jus.br/pje-web/externo/inicio.seam',
        'TJDF': 'https://pje.tjdft.jus.br/consultapublica/',
        'TJES': 'https://sistemas.tjes.jus.br/pje/ConsultaPublica/listView.seam',
        'TJGO': 'https://projudi.tjgo.jus.br/BuscaProcessoPublica',
        'TJMA': 'https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMG': 'https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMS': 'https://esaj.tjms.jus.br/cpopg5/open.do',
        'TJMT': 'https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPA': 'https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPB': 'https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPE': 'https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPI': 'https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam',
        'TJPR': 'https://projudi.tjpr.jus.br/projudi/',
        'TJRJ': 'https://www3.tjrj.jus.br/consultaprocessual/',
        'TJRN': 'https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam',
        'TJRO': 'https://pjepg.tjro.jus.br/consulta/',
        'TJRR': 'https://eproc.tjrr.jus.br/eproc/externo_controlador.php?acao=consulta_publica',
        'TJRS': 'https://eproc1g.tjrs.jus.br/eproc/externo_controlador.php?acao=consulta_publica',
        'TJSC': 'https://eproc1g.tjsc.jus.br/eproc/externo_controlador.php?acao=consulta_publica',
        'TJSE': 'https://www.tjse.jus.br/portal/consultas/consulta-processual',
        'TJSP': 'https://esaj.tjsp.jus.br/cpopg/open.do',
        'TJTO': 'https://eproc1.tjto.jus.br/eprocV2_prod_1grau/externo_controlador.php?acao=consulta_publica',
        
        # 💼 Justiça do Trabalho (TRTs) - Padrão
        'TRT1': 'https://pje.trt1.jus.br/consultapublica',
        'TRT2': 'https://pje.trt2.jus.br/consultapublica',
        'TRT3': 'https://pje.trt3.jus.br/consultapublica',
        'TRT4': 'https://pje.trt4.jus.br/consultapublica',
        'TRT5': 'https://pje.trt5.jus.br/consultapublica',
        'TRT6': 'https://pje.trt6.jus.br/consultapublica',
        'TRT7': 'https://pje.trt7.jus.br/consultapublica',
        'TRT8': 'https://pje.trt8.jus.br/consultapublica',
        'TRT9': 'https://pje.trt9.jus.br/consultapublica',
        'TRT10': 'https://pje.trt10.jus.br/consultapublica',
        'TRT11': 'https://pje.trt11.jus.br/consultapublica',
        'TRT12': 'https://pje.trt12.jus.br/consultapublica',
        'TRT13': 'https://pje.trt13.jus.br/consultapublica',
        'TRT14': 'https://pje.trt14.jus.br/consultapublica',
        'TRT15': 'https://pje.trt15.jus.br/consultapublica',
        'TRT16': 'https://pje.trt16.jus.br/consultapublica',
        'TRT17': 'https://pje.trt17.jus.br/consultapublica',
        'TRT18': 'https://pje.trt18.jus.br/consultapublica',
        'TRT19': 'https://pje.trt19.jus.br/consultapublica',
        'TRT20': 'https://pje.trt20.jus.br/consultapublica',
        'TRT21': 'https://pje.trt21.jus.br/consultapublica',
        'TRT22': 'https://pje.trt22.jus.br/consultapublica',
        'TRT23': 'https://pje.trt23.jus.br/consultapublica',
        'TRT24': 'https://pje.trt24.jus.br/consultapublica',
        
        # 🗳️ Justiça Eleitoral (Todos os TREs usam o portal unificado do TSE)
        'TRE-AC': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-AL': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-AM': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-AP': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-BA': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-CE': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-DF': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-ES': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-GO': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-MA': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-MG': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-MS': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-MT': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-PA': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-PB': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-PE': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-PI': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-PR': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-RJ': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-RN': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-RO': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-RR': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-RS': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-SC': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-SE': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-SP': 'https://consultaunificadapje.tse.jus.br/',
        'TRE-TO': 'https://consultaunificadapje.tse.jus.br/',
        
        # 🎖️ Justiça Militar Estadual (TJMs)
        'TJMMG': 'https://pje.tjmmg.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMRS': 'https://pje.tjmrs.jus.br/pje/ConsultaPublica/listView.seam',
        'TJMSP': 'https://pje.tjmsp.jus.br/pje/ConsultaPublica/listView.seam',
    }
    
    url = urls_consulta.get(tribunal_codigo)
    
    if not url:
        return jsonify({
            'sucesso': False,
            'erro': f'URL de consulta não disponível para o tribunal {tribunal_codigo}'
        }), 400
    
    return jsonify({
        'sucesso': True,
        'tribunal': tribunal_codigo,
        'url': url,
        'numero_processo': processo['numero']
    })


import secrets
import string

def gerar_token_publico():
    """Gera um token único e seguro para acesso público"""
    # Gera um token de 32 caracteres (alfanumérico)
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

def get_public_frontend_base_url():
    """Retorna a base pública do frontend para construção dos links compartilháveis."""
    frontend_url = os.environ.get('FRONTEND_URL') or os.environ.get('PUBLIC_APP_URL')
    if frontend_url:
        return frontend_url.rstrip('/')
    return request.host_url.rstrip('/')


@app.route('/api/processos/<int:id>/link-publico', methods=['POST'])
@require_auth
def gerar_link_publico(id):
    """
    Gera ou regenera o link público de acesso ao processo
    
    Returns:
        {
            'sucesso': True,
            'token': 'abc123...',
            'url': 'https://.../publico/processo/abc123...',
            'ativo': True
        }
    """
    db = get_db()
    
    # Verifica se o processo existe e pertence ao workspace
    processo = db.execute(
        'SELECT id, public_token, public_link_enabled FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    # Gera novo token se não existir
    token = processo['public_token']
    if not token:
        token = gerar_token_publico()
        # Garante unicidade do token
        while db.execute('SELECT 1 FROM processos WHERE public_token = ?', (token,)).fetchone():
            token = gerar_token_publico()
    
    # Ativa o link público
    db.execute(
        '''UPDATE processos 
           SET public_token = ?, public_link_enabled = 1 
           WHERE id = ?''',
        (token, id)
    )
    db.commit()
    
    # Monta a URL pública (preferencialmente do frontend)
    base_url = get_public_frontend_base_url()
    url_publica = f"{base_url}/publico/processo/{token}"
    
    return jsonify({
        'sucesso': True,
        'token': token,
        'url': url_publica,
        'link_publico': token,
        'ativo': True
    })

@app.route('/api/processos/<int:id>/link-publico', methods=['DELETE'])
@require_auth
def desativar_link_publico(id):
    """
    Desativa o link público do processo
    """
    db = get_db()
    
    processo = db.execute(
        'SELECT id FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    db.execute(
        'UPDATE processos SET public_link_enabled = 0 WHERE id = ?',
        (id,)
    )
    db.commit()
    
    return jsonify({
        'sucesso': True,
        'mensagem': 'Link público desativado'
    })

@app.route('/api/processos/<int:id>/link-publico', methods=['GET'])
@require_auth
def obter_link_publico(id):
    """
    Retorna o link público atual do processo (se existir)
    """
    db = get_db()
    
    processo = db.execute(
        'SELECT public_token, public_link_enabled FROM processos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    if not processo['public_token'] or not processo['public_link_enabled']:
        return jsonify({
            'sucesso': True,
            'ativo': False,
            'mensagem': 'Link público não ativado'
        })
    
    base_url = get_public_frontend_base_url()
    url_publica = f"{base_url}/publico/processo/{processo['public_token']}"
    
    return jsonify({
        'sucesso': True,
        'token': processo['public_token'],
        'url': url_publica,
        'link_publico': processo['public_token'],
        'ativo': True
    })

@app.route('/api/publico/processo/<token>', methods=['GET'])
@app.route('/publico/processo/<token>', methods=['GET'])
def acessar_processo_publico(token):
    """
    Endpoint público para acessar informações do processo via token
    Não requer autenticação
    """
    try:
        # Quando acessado no navegador, entregar a interface React (SPA),
        # evitando retorno bruto de JSON na URL pública.
        if request.path.startswith('/publico/processo/'):
            aceita_json = request.accept_mimetypes.best == 'application/json' if request.accept_mimetypes else False
            if not aceita_json:
                index_path = os.path.join(STATIC_FOLDER, 'index.html')
                if os.path.exists(index_path):
                    return send_from_directory(STATIC_FOLDER, 'index.html')

        db = get_db()
        
        # Busca o processo pelo token
        processo = db.execute(
            'SELECT * FROM processos WHERE public_token = ? AND public_link_enabled = 1',
            (token,)
        ).fetchone()
        
        if not processo:
            return jsonify({
                'error': 'Processo não encontrado',
                'mensagem': 'O link pode ter expirado ou sido desativado'
            }), 404
        
        # Converte sqlite3.Row para dict
        processo_dict = dict(processo)
        
        # Busca nome do cliente separadamente
        cliente_nome = None
        try:
            cliente = db.execute(
                'SELECT nome FROM clientes WHERE id = ?',
                (processo_dict['cliente_id'],)
            ).fetchone()
            if cliente:
                cliente_nome = dict(cliente)['nome']
        except Exception as e:
            print(f"[Publico] Erro ao buscar cliente: {e}")
        
        # Monta resposta com informações públicas
        resultado = {
            'sucesso': True,
            'processo': {
                'numero': processo_dict['numero'],
                'numero_cnj': processo_dict.get('numero_cnj'),
                'titulo': processo_dict['titulo'],
                'descricao': processo_dict.get('descricao'),
                'tipo': processo_dict.get('tipo'),
                'status': processo_dict['status'],
                'fase': processo_dict.get('fase'),
                'comarca': processo_dict.get('comarca'),
                'vara': processo_dict.get('vara'),
                'cliente_nome': cliente_nome,
                'tribunal_codigo': processo_dict.get('tribunal_codigo'),
                'tribunal_nome': processo_dict.get('tribunal_nome'),
                'tribunal_uf': processo_dict.get('tribunal_uf'),
                'ultimo_movimento': processo_dict.get('ultimo_movimento'),
                'data_ultima_movimentacao': processo_dict.get('ultimo_movimento_data'),
                'data_abertura': processo_dict.get('data_abertura'),
            },
            'prazos': [],
            'movimentacoes': []
        }
        
        # Busca prazos
        try:
            prazos = db.execute(
                '''SELECT descricao, data_prazo as data_final, status, 'media' as prioridade
                   FROM prazos 
                   WHERE processo_id = ? AND status = 'pendente'
                   ORDER BY data_prazo''',
                (processo_dict['id'],)
            ).fetchall()
            resultado['prazos'] = [dict(p) for p in prazos]
        except Exception as e:
            print(f"[Publico] Erro ao buscar prazos: {e}")
        
        # Busca movimentações
        try:
            movimentacoes = db.execute(
                '''SELECT nome_movimento, data_movimento 
                   FROM movimentacoes_processo 
                   WHERE processo_id = ? 
                   ORDER BY data_movimento DESC 
                   LIMIT 10''',
                (processo_dict['id'],)
            ).fetchall()
            resultado['movimentacoes'] = [dict(m) for m in movimentacoes]
        except Exception as e:
            print(f"[Publico] Erro ao buscar movimentacoes: {e}")
        
        return jsonify(resultado)
        
    except Exception as e:
        import traceback
        print(f"[ERRO] acessar_processo_publico: {e}")
        print(f"[ERRO] Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Erro interno',
            'mensagem': 'Ocorreu um erro ao carregar o processo. Tente novamente.'
        }), 500


# Alias para compatibilidade com frontend
@app.route('/api/processos/<int:id>/pje/consultar', methods=['POST'])
@require_auth
def consultar_pje_alias(id):
    """Alias for /api/processos/<id>/consultar-pje"""
    return consultar_pje(id)

@app.route('/api/processos/<int:id>/pje/extrair-html', methods=['POST'])
@require_auth
def extrair_movimentacao_html(id):
    """Extrai movimentação de processo a partir de HTML do PJe (stub)"""
    data = request.get_json()
    html = data.get('html', '')
    
    # TODO: Implementar extração real do HTML
    # Por enquanto retorna dados simulados
    return jsonify({
        'sucesso': True,
        'movimentos': [
            {
                'data': datetime.now().strftime('%d/%m/%Y'),
                'descricao': 'Movimentação extraída do HTML',
                'complemento': 'Extração implementada como stub'
            }
        ],
        'mensagem': 'Extração de HTML recebida. Implementação completa pendente.'
    })

@app.route('/api/processos/<int:id>/whatsapp', methods=['GET'])
@require_auth
@require_recurso('whatsapp')
def gerar_whatsapp_processo(id):
    """Generate WhatsApp link for process"""
    db = get_db()
    
    processo = db.execute(
        '''SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone
           FROM processos p 
           JOIN clientes c ON p.cliente_id = c.id 
           WHERE p.id = ? AND p.workspace_id = ?''',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    if not processo['cliente_telefone']:
        return jsonify({'error': 'Cliente não possui telefone cadastrado'}), 400
    
    mensagem = formatar_mensagem_processo(dict(processo))
    link = gerar_link_whatsapp(processo['cliente_telefone'], mensagem)
    
    return jsonify({'link': link})

# ============================================================================
# API ROUTES - PRAZOS
# ============================================================================

@app.route('/api/prazos', methods=['GET'])
@require_auth
def list_prazos():
    """List all deadlines"""
    db = get_db()
    
    status = request.args.get('status')
    processo_id = request.args.get('processo_id')
    dias = request.args.get('dias', type=int)
    
    query = '''SELECT p.*, pr.numero as processo_numero, pr.titulo as processo_titulo
               FROM prazos p 
               JOIN processos pr ON p.processo_id = pr.id 
               WHERE p.workspace_id = ?'''
    params = [g.auth['workspace_id']]
    
    if status:
        query += ' AND p.status = ?'
        params.append(status)
    
    if processo_id:
        query += ' AND p.processo_id = ?'
        params.append(processo_id)
    
    if dias:
        data_limite = (datetime.now() + timedelta(days=dias)).strftime('%Y-%m-%d')
        query += ' AND p.data_prazo <= ?'
        params.append(data_limite)
    
    query += ' ORDER BY p.data_prazo'
    
    rows = db.execute(query, params).fetchall()
    result = []
    for row in rows:
        prazo = dict(row)
        # Compatibilidade com frontend legado (data_final)
        prazo['data_final'] = prazo.get('data_prazo')
        if 'prioridade' not in prazo or not prazo.get('prioridade'):
            prazo['prioridade'] = 'media'
        result.append(prazo)
    return jsonify(result)

@app.route('/api/prazos', methods=['POST'])
@require_auth
def create_prazo():
    """Create new deadline"""
    data = request.get_json()
    db = get_db()
    
    data_prazo = data.get('data_prazo') or data.get('data_final')
    if not data_prazo:
        return jsonify({'error': 'Data do prazo é obrigatória'}), 400

    cursor = db.execute(
        'INSERT INTO prazos (workspace_id, processo_id, tipo, data_prazo, descricao, status) VALUES (?, ?, ?, ?, ?, ?)',
        (g.auth['workspace_id'], data.get('processo_id'), data.get('tipo'),
         data_prazo, data.get('descricao'), data.get('status', 'pendente'))
    )
    db.commit()
    
    prazo_id = cursor.lastrowid
    prazo = db.execute('SELECT * FROM prazos WHERE id = ?', (prazo_id,)).fetchone()
    
    # Notificar todos os usuários do workspace sobre o novo prazo
    processo = db.execute('SELECT numero FROM processos WHERE id = ?', 
                          (data.get('processo_id'),)).fetchone()
    processo_numero = processo['numero'] if processo else 'N/A'
    
    tipo_prazo = data.get('tipo', 'Prazo')
    data_formatada = data_prazo or 'sem data'
    
    # Busca todos os usuários do workspace
    usuarios = db.execute(
        'SELECT id FROM users WHERE workspace_id = ? AND id != ?',
        (g.auth['workspace_id'], g.auth['user_id'])
    ).fetchall()
    
    for usuario in usuarios:
        db.execute(
            '''INSERT INTO notificacoes (usuario_id, workspace_id, titulo, mensagem, tipo, link)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (usuario['id'], g.auth['workspace_id'], 
             'Novo Prazo', 
             f'{tipo_prazo} em {data_formatada} - Processo: {processo_numero}',
             'prazo', '/prazos')
        )
    db.commit()

    # Automação WhatsApp para novo prazo (assíncrono)
    workspace_id = g.auth['workspace_id']

    def _whatsapp_novo_prazo_job():
        with app.app_context():
            try:
                trigger_whatsapp_on_new_deadline(workspace_id, prazo_id)
            except Exception as error:
                print(f"[whatsapp] Falha ao enviar automação de novo prazo: {error}")

    threading.Thread(target=_whatsapp_novo_prazo_job, daemon=True).start()
    
    prazo_dict = dict(prazo)
    prazo_dict['data_final'] = prazo_dict.get('data_prazo')
    if 'prioridade' not in prazo_dict or not prazo_dict.get('prioridade'):
        prazo_dict['prioridade'] = 'media'
    return jsonify(prazo_dict), 201

@app.route('/api/prazos/<int:id>', methods=['PUT'])
@require_auth
def update_prazo(id):
    """Deadline editing is disabled."""
    return jsonify({
        'error': 'Edição de prazo desativada. Use "Marcar como cumprido".'
    }), 403

@app.route('/api/prazos/<int:id>', methods=['DELETE'])
@require_auth
def delete_prazo(id):
    """Deadline deletion is disabled."""
    return jsonify({
        'error': 'Exclusão de prazo desativada.'
    }), 403

@app.route('/api/prazos/<int:id>/cumprido', methods=['PUT'])
@require_auth
def marcar_prazo_cumprido(id):
    """Mark deadline as completed"""
    db = get_db()
    
    # Verifica se o prazo existe e pertence ao workspace
    prazo = db.execute(
        'SELECT * FROM prazos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not prazo:
        return jsonify({'error': 'Prazo não encontrado'}), 404
    
    db.execute(
        'UPDATE prazos SET status = ? WHERE id = ? AND workspace_id = ?',
        ('cumprido', id, g.auth['workspace_id'])
    )
    db.commit()
    
    return jsonify({'message': 'Prazo marcado como cumprido', 'id': id})

# ============================================================================
# API ROUTES - TAREFAS
# ============================================================================

@app.route('/api/tarefas', methods=['GET'])
@require_auth
def list_tarefas():
    """List all tasks"""
    db = get_db()
    
    status = request.args.get('status')
    processo_id = request.args.get('processo_id')
    assigned_to = request.args.get('assigned_to')
    
    query = '''SELECT t.*, p.numero as processo_numero, p.titulo as processo_titulo,
               u.nome as assigned_to_nome
               FROM tarefas t 
               LEFT JOIN processos p ON t.processo_id = p.id 
               LEFT JOIN users u ON t.assigned_to = u.id
               WHERE t.workspace_id = ?'''
    params = [g.auth['workspace_id']]
    
    if status:
        query += ' AND t.status = ?'
        params.append(status)
    
    if processo_id:
        query += ' AND t.processo_id = ?'
        params.append(processo_id)
    
    if assigned_to:
        query += ' AND t.assigned_to = ?'
        params.append(assigned_to)
    
    query += ' ORDER BY t.created_at DESC'
    
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/tarefas', methods=['POST'])
@require_auth
def create_tarefa():
    """Create new task"""
    data = request.get_json() or {}
    db = get_db()
    workspace_id = g.auth['workspace_id']
    user_id = g.auth['user_id']
    
    # Suporta tanto 'assigned_to' quanto 'atribuido_a' (usado pelo frontend)
    assigned_to_raw = data.get('assigned_to')
    if assigned_to_raw is None:
        assigned_to_raw = data.get('atribuido_a')

    assigned_to = None
    if assigned_to_raw not in (None, ''):
        try:
            assigned_to = int(assigned_to_raw)
        except (TypeError, ValueError):
            return jsonify({'error': 'Responsável inválido'}), 400

    if assigned_to is None:
        assigned_to = user_id
    else:
        usuario_atribuido = db.execute(
            'SELECT id FROM users WHERE id = ? AND workspace_id = ?',
            (assigned_to, workspace_id)
        ).fetchone()
        if not usuario_atribuido:
            return jsonify({'error': 'Responsável não pertence ao grupo'}), 400
    print(f"📝 Criando tarefa: titulo={data.get('titulo')}, assigned_to={assigned_to}, user_id={user_id}")
    
    cursor = db.execute(
        '''INSERT INTO tarefas (workspace_id, processo_id, assigned_to, titulo, descricao,
           prioridade, status, data_vencimento)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (workspace_id, data.get('processo_id'), assigned_to,
         data.get('titulo'), data.get('descricao'), data.get('prioridade', 'media'),
         data.get('status', 'pendente'), data.get('data_vencimento'))
    )
    db.commit()
    
    tarefa_id = cursor.lastrowid
    tarefa = db.execute('SELECT * FROM tarefas WHERE id = ?', (tarefa_id,)).fetchone()
    
    # Criar notificação para o usuário atribuído.
    assigned_to = assigned_to or user_id
    print(f"📝 assigned_to final: {assigned_to}")
    
    # Busca nome do processo se houver
    processo_nome = None
    if data.get('processo_id'):
        processo = db.execute('SELECT titulo FROM processos WHERE id = ?', 
                              (data.get('processo_id'),)).fetchone()
        if processo:
            processo_nome = processo['titulo']
    
    # Mensagem diferente se for para si mesmo ou outro
    if assigned_to == user_id:
        mensagem = f"Você criou uma nova tarefa: {data.get('titulo')}"
    else:
        mensagem = f"Você foi atribuído à tarefa: {data.get('titulo')}"
    
    if processo_nome:
        mensagem += f" (Processo: {processo_nome})"
    
    db.execute(
        '''INSERT INTO notificacoes (usuario_id, workspace_id, titulo, mensagem, tipo, link)
           VALUES (?, ?, ?, ?, ?, ?)''',
        (assigned_to, workspace_id, 'Nova Tarefa', mensagem, 'tarefa',
         f'/tarefas')
    )
    db.commit()
    print(f"🔔 Notificação criada para user_id={assigned_to}: {mensagem}")
    
    if EMAIL_SERVICE_DISPONIVEL and email_service.is_configured():
        titulo_tarefa = data.get('titulo')
        descricao = data.get('descricao')
        data_vencimento = data.get('data_vencimento')

        def _enviar_email_tarefa():
            with app.app_context():
                try:
                    resultado_email = notificador_email.notificar_nova_tarefa(
                        workspace_id=workspace_id,
                        tarefa_id=tarefa_id,
                        titulo_tarefa=titulo_tarefa,
                        descricao=descricao,
                        data_vencimento=data_vencimento,
                        usuario_atribuido_id=assigned_to
                    )
                    if resultado_email.get('success'):
                        print(f"[email] Notificação de tarefa enviada para user_id={assigned_to}")
                    else:
                        print(f"[email] Falha ao enviar notificação de tarefa: {resultado_email.get('error')}")
                except Exception as e:
                    print(f"[email] Erro inesperado ao enviar notificação de tarefa: {e}")

        threading.Thread(target=_enviar_email_tarefa, daemon=True).start()

    # Automação WhatsApp para nova tarefa (assíncrono)
    def _whatsapp_nova_tarefa_job():
        with app.app_context():
            try:
                trigger_whatsapp_on_new_task(workspace_id=workspace_id, tarefa_id=tarefa_id)
            except Exception as error:
                print(f"[whatsapp] Falha ao enviar automação de nova tarefa: {error}")

    threading.Thread(target=_whatsapp_nova_tarefa_job, daemon=True).start()

    return jsonify(dict(tarefa)), 201

@app.route('/api/tarefas/<int:id>', methods=['PUT'])
@require_auth
def update_tarefa(id):
    """Update task status (field editing disabled)."""
    data = request.get_json() or {}
    db = get_db()

    allowed_fields = {'status'}
    campos_invalidos = set(data.keys()) - allowed_fields
    if campos_invalidos:
        return jsonify({
            'error': 'Edição de tarefa desativada. Apenas mudança de status é permitida.'
        }), 403

    if 'status' in data and data['status'] not in ('pendente', 'em_andamento', 'concluida'):
        return jsonify({'error': 'Status inválido'}), 400
    
    # Busca a tarefa atual
    tarefa_atual = db.execute(
        'SELECT * FROM tarefas WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not tarefa_atual:
        return jsonify({'error': 'Tarefa não encontrada'}), 404
    
    # Mescla dados: usa os enviados ou mantém os atuais
    processo_id = data.get('processo_id', tarefa_atual['processo_id'])
    assigned_to = data.get('assigned_to', tarefa_atual['assigned_to'])
    titulo = data.get('titulo', tarefa_atual['titulo'])
    descricao = data.get('descricao', tarefa_atual['descricao'])
    prioridade = data.get('prioridade', tarefa_atual['prioridade'])
    status = data.get('status', tarefa_atual['status'])
    data_vencimento = data.get('data_vencimento', tarefa_atual['data_vencimento'])
    
    # Check if status changed to completed
    if status == 'concluida' and tarefa_atual['status'] != 'concluida':
        completed_at = datetime.now().isoformat()
    elif status != 'concluida':
        completed_at = None
    else:
        completed_at = tarefa_atual['completed_at']
    
    db.execute(
        '''UPDATE tarefas SET processo_id = ?, assigned_to = ?, titulo = ?, descricao = ?,
           prioridade = ?, status = ?, data_vencimento = ?, completed_at = ?
           WHERE id = ? AND workspace_id = ?''',
        (processo_id, assigned_to, titulo, descricao, prioridade, status,
         data_vencimento, completed_at, id, g.auth['workspace_id'])
    )
    db.commit()
    
    # Notificar quando tarefa é concluída
    if status == 'concluida' and tarefa_atual['status'] != 'concluida':
        # Busca informações do usuário que concluiu
        user = db.execute('SELECT nome FROM users WHERE id = ?', (g.auth['user_id'],)).fetchone()
        user_nome = user['nome'] if user else 'Alguém'
        
        # Notifica o criador da tarefa (assigned_to) se não for quem concluiu
        if tarefa_atual['assigned_to'] and tarefa_atual['assigned_to'] != g.auth['user_id']:
            db.execute(
                '''INSERT INTO notificacoes (usuario_id, workspace_id, titulo, mensagem, tipo, link)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (tarefa_atual['assigned_to'], g.auth['workspace_id'], 
                 'Tarefa Concluída', 
                 f'{user_nome} concluiu a tarefa: {titulo}',
                 'tarefa', '/tarefas')
            )
            db.commit()
    
    tarefa = db.execute('SELECT * FROM tarefas WHERE id = ?', (id,)).fetchone()
    return jsonify(dict(tarefa))

@app.route('/api/tarefas/<int:id>', methods=['DELETE'])
@require_auth
def delete_tarefa(id):
    """Task deletion is disabled."""
    return jsonify({
        'error': 'Exclusão de tarefa desativada.'
    }), 403

@app.route('/api/tarefas/<int:id>/whatsapp', methods=['GET'])
@require_auth
@require_recurso('whatsapp')
def gerar_whatsapp_tarefa(id):
    """Prepara dados de compartilhamento WhatsApp para tarefa."""
    db = get_db()
    
    tarefa = db.execute(
        '''SELECT t.*, u.nome as assigned_to_nome, u.email as assigned_to_email, u.telefone as assigned_to_telefone
           FROM tarefas t 
           LEFT JOIN users u ON t.assigned_to = u.id 
           WHERE t.id = ? AND t.workspace_id = ?''',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not tarefa:
        return jsonify({'error': 'Tarefa não encontrada'}), 404
    
    tarefa_dict = dict(tarefa)
    mensagem = formatar_mensagem_tarefa(tarefa_dict)
    link = None
    if tarefa_dict.get('assigned_to_telefone'):
        link = gerar_link_whatsapp(tarefa_dict.get('assigned_to_telefone'), mensagem)

    return jsonify({
        'mensagem': mensagem,
        'responsavel': {
            'nome': tarefa_dict.get('assigned_to_nome'),
            'email': tarefa_dict.get('assigned_to_email'),
            'telefone': tarefa_dict.get('assigned_to_telefone'),
        },
        'link': link,
    })

# ============================================================================
# API ROUTES - FINANCEIRO
# ============================================================================

@app.route('/api/financeiro', methods=['GET'])
@require_auth
def list_financeiro():
    """List all financial records with documents"""
    db = get_db()
    
    tipo = request.args.get('tipo')
    processo_id = request.args.get('processo_id')
    cliente_id = request.args.get('cliente_id')
    
    query = '''SELECT f.*, p.numero as processo_numero, c.nome as cliente_nome
               FROM financeiro f 
               LEFT JOIN processos p ON f.processo_id = p.id 
               LEFT JOIN clientes c ON f.cliente_id = c.id
               WHERE f.workspace_id = ?'''
    params = [g.auth['workspace_id']]
    
    if tipo:
        query += ' AND f.tipo = ?'
        params.append(tipo)
    
    if processo_id:
        query += ' AND f.processo_id = ?'
        params.append(processo_id)
    
    if cliente_id:
        query += ' AND f.cliente_id = ?'
        params.append(cliente_id)
    
    query += ' ORDER BY f.data DESC'
    
    rows = db.execute(query, params).fetchall()
    
    # Buscar documentos para cada transação
    result = []
    for row in rows:
        transacao = dict(row)
        
        # Mapear campo 'data' para 'data_transacao' para compatibilidade com frontend
        transacao['data_transacao'] = transacao.pop('data', None)
        
        # Buscar documentos
        docs = db.execute(
            '''SELECT d.id, d.nome, d.file_size, d.mime_type, d.categoria, d.descricao, d.created_at,
               u.nome as uploaded_by_nome
               FROM documentos d 
               LEFT JOIN users u ON d.uploaded_by = u.id
               WHERE d.financeiro_id = ? AND d.workspace_id = ?
               ORDER BY d.created_at DESC''',
            (transacao['id'], g.auth['workspace_id'])
        ).fetchall()
        
        transacao['documentos'] = [dict(d) for d in docs]
        result.append(transacao)
    
    return jsonify(result)

@app.route('/api/financeiro/resumo', methods=['GET'])
@require_auth
def resumo_financeiro():
    """Get financial summary"""
    db = get_db()
    
    periodo = request.args.get('periodo', 'mes')
    hoje = datetime.now()
    
    if periodo == 'mes':
        # Do primeiro dia até o último dia do mês atual
        inicio = hoje.replace(day=1).strftime('%Y-%m-%d')
        # Último dia do mês
        from calendar import monthrange
        ultimo_dia = monthrange(hoje.year, hoje.month)[1]
        fim = hoje.replace(day=ultimo_dia).strftime('%Y-%m-%d')
    elif periodo == 'ano':
        inicio = hoje.replace(month=1, day=1).strftime('%Y-%m-%d')
        fim = hoje.replace(month=12, day=31).strftime('%Y-%m-%d')
    else:
        # Do primeiro dia até o último dia do mês atual
        inicio = hoje.replace(day=1).strftime('%Y-%m-%d')
        from calendar import monthrange
        ultimo_dia = monthrange(hoje.year, hoje.month)[1]
        fim = hoje.replace(day=ultimo_dia).strftime('%Y-%m-%d')
    
    # Suporta tanto 'entrada' (novo) quanto 'receita' (legado)
    receitas = db.execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE workspace_id = ? AND tipo IN ('entrada', 'receita') AND data BETWEEN ? AND ?",
        (g.auth['workspace_id'], inicio, fim)
    ).fetchone()['total']
    
    # Suporta tanto 'saida' (novo) quanto 'despesa' (legado)
    despesas = db.execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE workspace_id = ? AND tipo IN ('saida', 'despesa') AND data BETWEEN ? AND ?",
        (g.auth['workspace_id'], inicio, fim)
    ).fetchone()['total']
    
    receitas_pendentes = db.execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE workspace_id = ? AND tipo IN ('entrada', 'receita') AND status = ?",
        (g.auth['workspace_id'], 'pendente')
    ).fetchone()['total']
    
    despesas_pendentes = db.execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE workspace_id = ? AND tipo IN ('saida', 'despesa') AND status = ?",
        (g.auth['workspace_id'], 'pendente')
    ).fetchone()['total']
    
    return jsonify({
        'receitas': receitas,
        'despesas': despesas,
        'saldo': receitas - despesas,
        'receitas_pendentes': receitas_pendentes,
        'despesas_pendentes': despesas_pendentes,
        'periodo': periodo
    })

@app.route('/api/financeiro', methods=['POST'])
@require_auth
def create_financeiro():
    """Create new financial record"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados inválidos ou JSON malformado'}), 400
    
    db = get_db()
    
    # Validate required fields
    required = ['tipo', 'valor', 'data']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Campos obrigatórios faltando: {", ".join(missing)}'}), 400
    
    try:
        cursor = db.execute(
            '''INSERT INTO financeiro (workspace_id, processo_id, cliente_id, tipo, categoria,
               valor, data, descricao, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (g.auth['workspace_id'], data.get('processo_id'), data.get('cliente_id'),
             data.get('tipo'), data.get('categoria'), data.get('valor'),
             data.get('data'), data.get('descricao'), data.get('status', 'pendente'))
        )
        db.commit()
        
        record = db.execute('SELECT * FROM financeiro WHERE id = ?', (cursor.lastrowid,)).fetchone()
        result = dict(record)
        result['data_transacao'] = result.pop('data', None)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': f'Erro ao criar registro: {str(e)}'}), 500

@app.route('/api/financeiro/<int:id>', methods=['PUT'])
@require_auth
def update_financeiro(id):
    """Update financial record"""
    data = request.get_json()
    db = get_db()
    
    db.execute(
        '''UPDATE financeiro SET processo_id = ?, cliente_id = ?, tipo = ?, categoria = ?,
           valor = ?, data = ?, descricao = ?, status = ?
           WHERE id = ? AND workspace_id = ?''',
        (data.get('processo_id'), data.get('cliente_id'), data.get('tipo'),
         data.get('categoria'), data.get('valor'), data.get('data'),
         data.get('descricao'), data.get('status'), id, g.auth['workspace_id'])
    )
    db.commit()
    
    record = db.execute('SELECT * FROM financeiro WHERE id = ?', (id,)).fetchone()
    result = dict(record)
    result['data_transacao'] = result.pop('data', None)
    return jsonify(result)

@app.route('/api/financeiro/<int:id>', methods=['DELETE'])
@require_auth
def delete_financeiro(id):
    """Delete financial record"""
    db = get_db()
    db.execute('DELETE FROM financeiro WHERE id = ? AND workspace_id = ?', (id, g.auth['workspace_id']))
    db.commit()
    return jsonify({'message': 'Registro excluído'})

# ============================================================================
# API ROUTES - NOTIFICACOES
# ============================================================================

@app.route('/api/notificacoes', methods=['GET'])
@require_auth
def list_notificacoes():
    """List user notifications"""
    db = get_db()
    
    print(f"🔔 Buscando notificações para user_id={g.auth['user_id']}, workspace_id={g.auth['workspace_id']}")
    
    rows = db.execute(
        '''SELECT * FROM notificacoes 
           WHERE usuario_id = ? AND workspace_id = ?
           ORDER BY created_at DESC LIMIT 50''',
        (g.auth['user_id'], g.auth['workspace_id'])
    ).fetchall()
    
    print(f"🔔 Notificações encontradas: {len(rows)}")
    
    notificacoes = []
    for row in rows:
        notificacoes.append({
            'id': row['id'],
            'titulo': row['titulo'],
            'mensagem': row['mensagem'],
            'tipo': row['tipo'],
            'lida': bool(row['lida']),
            'link': row['link'],
            'created_at': row['created_at']
        })
    
    nao_lidas = sum(1 for n in notificacoes if not n['lida'])
    
    return jsonify({
        'notificacoes': notificacoes,
        'nao_lidas': nao_lidas
    })

@app.route('/api/notificacoes/<int:id>/ler', methods=['PUT'])
@require_auth
def marcar_notificacao_lida(id):
    """Mark notification as read"""
    db = get_db()
    
    db.execute(
        'UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?',
        (id, g.auth['user_id'])
    )
    db.commit()
    
    return jsonify({'message': 'Notificação marcada como lida'})

@app.route('/api/notificacoes/ler-todas', methods=['PUT'])
@require_auth
def marcar_todas_lidas():
    """Mark all notifications as read"""
    db = get_db()
    
    db.execute(
        'UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND workspace_id = ?',
        (g.auth['user_id'], g.auth['workspace_id'])
    )
    db.commit()
    
    return jsonify({'message': 'Todas as notificações marcadas como lidas'})

# ============================================================================
# API ROUTES - EQUIPE
# ============================================================================

@app.route('/api/equipe', methods=['GET'])
@require_auth
def list_equipe():
    """List team members"""
    db = get_db()
    
    rows = db.execute(
        'SELECT id, nome, email, role, created_at FROM users WHERE workspace_id = ?',
        (g.auth['workspace_id'],)
    ).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.route('/api/equipe/convites', methods=['GET'])
@require_auth
def list_convites():
    """List pending invitations for the logged user (by email)"""
    db = get_db()
    
    # Busca convites pendentes pelo email do usuário logado
    rows = db.execute(
        '''SELECT c.*, u.nome as invited_by_nome, w.nome as workspace_nome
           FROM convites c 
           JOIN users u ON c.invited_by = u.id 
           JOIN workspaces w ON c.workspace_id = w.id
           WHERE c.email = ? AND c.accepted_at IS NULL''',
        (g.auth['user']['email'],)
    ).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.route('/api/equipe/convites/workspace', methods=['GET'])
@require_admin
def list_convites_workspace():
    """List pending invitations for the current workspace (admin view)"""
    db = get_db()
    
    rows = db.execute(
        '''SELECT c.*, u.nome as invited_by_nome 
           FROM convites c 
           JOIN users u ON c.invited_by = u.id 
           WHERE c.workspace_id = ? AND c.accepted_at IS NULL''',
        (g.auth['workspace_id'],)
    ).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.route('/api/equipe/convites', methods=['POST'])
@require_admin
@require_recurso('equipe')
def create_convite():
    """Create team invitation"""
    return create_convite_internal()

# Alias para compatibilidade
@app.route('/api/equipe/convidar', methods=['POST'])
@require_admin
@require_recurso('equipe')
def create_convite_alias():
    """Alias for /api/equipe/convites"""
    return create_convite_internal()

def create_convite_internal():
    """Internal function for creating team invitation"""
    data = request.get_json()
    db = get_db()
    
    email = data.get('email')
    role = data.get('role', 'user')
    
    # Check if email already in workspace
    existing = db.execute(
        'SELECT id FROM users WHERE email = ? AND workspace_id = ?',
        (email, g.auth['workspace_id'])
    ).fetchone()
    
    if existing:
        return jsonify({'error': 'Usuário já faz parte do workspace'}), 409
    
    # Check if invitation already pending
    existing_convite = db.execute(
        'SELECT id FROM convites WHERE email = ? AND workspace_id = ? AND accepted_at IS NULL',
        (email, g.auth['workspace_id'])
    ).fetchone()
    
    if existing_convite:
        return jsonify({'error': 'Convite já enviado para este email'}), 409
    
    token = secrets.token_urlsafe(32)
    
    cursor = db.execute(
        'INSERT INTO convites (workspace_id, email, role, token, invited_by) VALUES (?, ?, ?, ?, ?)',
        (g.auth['workspace_id'], email, role, token, g.auth['user_id'])
    )
    db.commit()
    
    convite = db.execute('SELECT * FROM convites WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify(dict(convite)), 201

@app.route('/api/equipe/convites/<int:id>', methods=['DELETE'])
@require_admin
@require_recurso('equipe')
def delete_convite(id):
    """Cancel invitation"""
    db = get_db()
    db.execute('DELETE FROM convites WHERE id = ? AND workspace_id = ?', (id, g.auth['workspace_id']))
    db.commit()
    return jsonify({'message': 'Convite cancelado'})

@app.route('/api/equipe/responder-convite/<token>', methods=['POST'])
@require_auth
def responder_convite(token):
    """Accept or reject invitation"""
    data = request.get_json() or {}
    aceitar = data.get('aceitar', True)
    
    db = get_db()
    
    # Busca o convite
    convite = db.execute(
        'SELECT * FROM convites WHERE token = ? AND accepted_at IS NULL',
        (token,)
    ).fetchone()
    
    if not convite:
        return jsonify({'error': 'Convite não encontrado ou já aceito'}), 404
    
    # Verifica se o email do convite corresponde ao usuário logado
    if g.auth['user']['email'] != convite['email']:
        return jsonify({'error': 'Este convite não é para você'}), 403
    
    if not aceitar:
        # Recusa o convite - remove da tabela
        db.execute('DELETE FROM convites WHERE id = ?', (convite['id'],))
        db.commit()
        return jsonify({'message': 'Convite recusado'})
    
    # Verifica se o usuário está inativo (foi removido anteriormente)
    if g.auth['user']['role'] == 'inativo':
        # Reativa o usuário e atualiza workspace
        db.execute(
            'UPDATE users SET workspace_id = ?, role = ?, email = ? WHERE id = ?',
            (convite['workspace_id'], convite['role'], convite['email'], g.auth['user_id'])
        )
    else:
        # Usuário ativo - apenas atualiza o workspace
        db.execute(
            'UPDATE users SET workspace_id = ?, role = ? WHERE id = ?',
            (convite['workspace_id'], convite['role'], g.auth['user_id'])
        )
    
    # Marca convite como aceito
    db.execute(
        'UPDATE convites SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
        (convite['id'],)
    )
    
    db.commit()
    
    return jsonify({
        'message': 'Convite aceito com sucesso! Você agora faz parte do workspace.',
        'workspace_id': convite['workspace_id']
    })

@app.route('/api/equipe/membros/<int:user_id>', methods=['DELETE'])
@require_admin
@require_recurso('equipe')
def remover_membro(user_id):
    """Remove member from workspace"""
    db = get_db()
    
    # Verify user exists and belongs to workspace
    user = db.execute(
        'SELECT * FROM users WHERE id = ? AND workspace_id = ?',
        (user_id, g.auth['workspace_id'])
    ).fetchone()
    
    if not user:
        return jsonify({'error': 'Membro não encontrado'}), 404
    
    # Prevent removing superadmin or self
    if user['role'] == 'superadmin':
        return jsonify({'error': 'Não é possível remover o super administrador'}), 403
    
    if user_id == g.auth['user_id']:
        return jsonify({'error': 'Você não pode remover a si mesmo'}), 403
    
    # Soft delete - marca como inativo em vez de excluir
    import hashlib
    user_dict = dict(user)
    db.execute(
        "UPDATE users SET role = 'inativo', email = ?, workspace_id = NULL WHERE id = ?",
        (f"{user_dict['email']}.inativo.{user_id}", user_id)
    )
    db.commit()
    
    # Registrar audit log
    registrar_audit_log('remover_membro', 'users', user_id, user_dict, {'status': 'inativo'})
    
    return jsonify({'message': 'Membro removido com sucesso'})

@app.route('/api/equipe/membros/<int:user_id>/role', methods=['PUT'])
@require_admin
@require_recurso('equipe')
def atualizar_role_membro(user_id):
    """Update member role"""
    data = request.get_json()
    nova_role = data.get('role')
    
    if not nova_role or nova_role not in ['user', 'admin']:
        return jsonify({'error': 'Role inválida'}), 400
    
    db = get_db()
    
    # Verify user exists and belongs to workspace
    user = db.execute(
        'SELECT * FROM users WHERE id = ? AND workspace_id = ?',
        (user_id, g.auth['workspace_id'])
    ).fetchone()
    
    if not user:
        return jsonify({'error': 'Membro não encontrado'}), 404
    
    # Prevent changing superadmin role
    if user['role'] == 'superadmin':
        return jsonify({'error': 'Não é possível alterar o papel do super administrador'}), 403
    
    if user_id == g.auth['user_id']:
        return jsonify({'error': 'Você não pode alterar seu próprio papel'}), 403
    
    db.execute('UPDATE users SET role = ? WHERE id = ?', (nova_role, user_id))
    db.commit()
    return jsonify({'message': 'Papel atualizado com sucesso'})

# ============================================================================
# API ROUTES - DASHBOARD
# ============================================================================

@app.route('/api/dashboard', methods=['GET'])
@require_auth
def dashboard():
    """Get dashboard data"""
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    # Count processos
    total_processos = db.execute(
        'SELECT COUNT(*) as count FROM processos WHERE workspace_id = ?',
        (workspace_id,)
    ).fetchone()['count']
    
    processos_ativos = db.execute(
        'SELECT COUNT(*) as count FROM processos WHERE workspace_id = ? AND status = ?',
        (workspace_id, 'ativo')
    ).fetchone()['count']
    
    # Count clientes
    total_clientes = db.execute(
        'SELECT COUNT(*) as count FROM clientes WHERE workspace_id = ?',
        (workspace_id,)
    ).fetchone()['count']
    
    # Count prazos pendentes
    prazos_pendentes = db.execute(
        'SELECT COUNT(*) as count FROM prazos WHERE workspace_id = ? AND status = ?',
        (workspace_id, 'pendente')
    ).fetchone()['count']
    
    # Prazos próximos (7 dias)
    data_limite = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    prazos_proximos = db.execute(
        '''SELECT COUNT(*) as count FROM prazos 
           WHERE workspace_id = ? AND status = ? AND data_prazo <= ?''',
        (workspace_id, 'pendente', data_limite)
    ).fetchone()['count']
    
    # Count tarefas do usuário logado (minhas tarefas)
    user_id = g.auth['user_id']
    tarefas_pendentes = db.execute(
        'SELECT COUNT(*) as count FROM tarefas WHERE workspace_id = ? AND status = ? AND assigned_to = ?',
        (workspace_id, 'pendente', user_id)
    ).fetchone()['count']
    
    tarefas_atrasadas = db.execute(
        '''SELECT COUNT(*) as count FROM tarefas 
           WHERE workspace_id = ? AND status = ? AND assigned_to = ? AND data_vencimento < ?''',
        (workspace_id, 'pendente', user_id, datetime.now().strftime('%Y-%m-%d'))
    ).fetchone()['count']
    
    # Resumo financeiro (usa 'entrada' e 'saida')
    receitas_mes = db.execute(
        '''SELECT COALESCE(SUM(valor), 0) as total FROM financeiro 
           WHERE workspace_id = ? AND tipo = ? AND strftime('%Y-%m', data) = ?''',
        (workspace_id, 'entrada', datetime.now().strftime('%Y-%m'))
    ).fetchone()['total']
    
    despesas_mes = db.execute(
        '''SELECT COALESCE(SUM(valor), 0) as total FROM financeiro 
           WHERE workspace_id = ? AND tipo = ? AND strftime('%Y-%m', data) = ?''',
        (workspace_id, 'saida', datetime.now().strftime('%Y-%m'))
    ).fetchone()['total']
    
    # Prazos recentes
    prazos = db.execute(
        '''SELECT p.*, pr.numero as processo_numero, pr.titulo as processo_titulo
           FROM prazos p 
           JOIN processos pr ON p.processo_id = pr.id 
           WHERE p.workspace_id = ? AND p.status = ?
           ORDER BY p.data_prazo LIMIT 5''',
        (workspace_id, 'pendente')
    ).fetchall()
    
    # Tarefas recentes do usuário logado
    tarefas = db.execute(
        '''SELECT t.*, p.numero as processo_numero
           FROM tarefas t 
           LEFT JOIN processos p ON t.processo_id = p.id 
           WHERE t.workspace_id = ? AND t.status = ? AND t.assigned_to = ?
           ORDER BY t.created_at DESC LIMIT 5''',
        (workspace_id, 'pendente', user_id)
    ).fetchall()
    
    return jsonify({
        'processos': {
            'total': total_processos,
            'ativos': processos_ativos
        },
        'clientes': {
            'total': total_clientes
        },
        'prazos': {
            'pendentes': prazos_pendentes,
            'proximos': prazos_proximos,
            'lista': [dict(r) for r in prazos]
        },
        'tarefas': {
            'pendentes': tarefas_pendentes,
            'atrasadas': tarefas_atrasadas,
            'lista': [dict(r) for r in tarefas]
        },
        'financeiro': {
            'receitas_mes': receitas_mes,
            'despesas_mes': despesas_mes,
            'saldo': receitas_mes - despesas_mes
        }
    })

# ============================================================================
# API ROUTES - AI ASSISTANT
# ============================================================================

@app.route('/api/assistente/chat', methods=['POST'])
@require_auth
def chat_assistente():
    """Chat with AI assistant"""
    data = request.get_json()
    mensagem = data.get('mensagem')
    session_id = data.get('session_id', 'default')
    
    if not mensagem:
        return jsonify({'error': 'Mensagem não fornecida'}), 400
    
    resultado = AssistenteIA.processar_mensagem(
        mensagem,
        g.auth['workspace_id'],
        g.auth['user_id'],
        session_id
    )
    
    return jsonify(resultado)

@app.route('/api/assistente/historico', methods=['GET'])
@require_auth
def historico_chat():
    """Get chat history"""
    session_id = request.args.get('session_id', 'default')
    
    db = get_db()
    rows = db.execute(
        '''SELECT role, content, created_at FROM chat_history 
           WHERE workspace_id = ? AND user_id = ? AND session_id = ?
           ORDER BY created_at''',
        (g.auth['workspace_id'], g.auth['user_id'], session_id)
    ).fetchall()
    
    return jsonify([dict(r) for r in rows])

# Aliases para compatibilidade com frontend (rotas /ia/*)
@app.route('/api/ia/chat', methods=['POST'])
@require_auth
@require_recurso('ia')
def ia_chat_alias():
    """Alias for /api/assistente/chat"""
    return chat_assistente()

@app.route('/api/ia/historico', methods=['GET'])
@require_auth
@require_recurso('ia')
def ia_historico_alias():
    """Alias for /api/assistente/historico"""
    return historico_chat()

# ============================================================================
# API ROUTES - DOCUMENTOS
# ============================================================================

@app.route('/api/documentos', methods=['GET'])
@require_auth
def list_documentos():
    """List documents with filters"""
    db = get_db()
    
    # Filtros
    processo_id = request.args.get('processo_id')
    cliente_id = request.args.get('cliente_id')
    financeiro_id = request.args.get('financeiro_id')
    categoria = request.args.get('categoria')
    search = request.args.get('search', '')
    
    query = '''SELECT d.*, p.numero as processo_numero, p.titulo as processo_titulo,
               c.nome as cliente_nome, u.nome as uploaded_by_nome
               FROM documentos d 
               LEFT JOIN processos p ON d.processo_id = p.id 
               LEFT JOIN clientes c ON d.cliente_id = c.id
               LEFT JOIN users u ON d.uploaded_by = u.id
               WHERE d.workspace_id = ?'''
    params = [g.auth['workspace_id']]
    
    if processo_id:
        query += ' AND d.processo_id = ?'
        params.append(processo_id)
    
    if cliente_id:
        query += ' AND d.cliente_id = ?'
        params.append(cliente_id)
    
    if financeiro_id:
        query += ' AND d.financeiro_id = ?'
        params.append(financeiro_id)
    
    if categoria:
        query += ' AND d.categoria = ?'
        params.append(categoria)
    
    if search:
        query += ' AND (d.nome LIKE ? OR d.descricao LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    query += ' ORDER BY d.created_at DESC'
    
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/documentos', methods=['POST'])
@require_auth
def upload_documento():
    """Upload new document"""
    if 'documento' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['documento']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    # Dados do formulário
    processo_id = request.form.get('processo_id')
    cliente_id = request.form.get('cliente_id')
    financeiro_id = request.form.get('financeiro_id')
    categoria = request.form.get('categoria', 'outro')
    descricao = request.form.get('descricao', '')
    
    if not processo_id and not cliente_id and not financeiro_id:
        return jsonify({'error': 'Informe o processo, cliente ou transação financeira'}), 400
    
    # Validar extensão
    allowed_extensions = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({'error': 'Formato não suportado'}), 400
    
    # Criar nome único
    filename = f"doc_{g.auth['user_id']}_{int(datetime.now().timestamp())}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Salvar arquivo
    file.save(filepath)
    
    # Salvar no banco
    db = get_db()
    cursor = db.execute(
        '''INSERT INTO documentos (workspace_id, processo_id, cliente_id, financeiro_id, nome, filename, 
           file_path, file_size, mime_type, categoria, descricao, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (g.auth['workspace_id'], processo_id, cliente_id, financeiro_id, file.filename, filename,
         filepath, os.path.getsize(filepath), file.content_type, categoria, descricao, g.auth['user_id'])
    )
    db.commit()
    
    documento = db.execute('SELECT * FROM documentos WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify(dict(documento)), 201

@app.route('/api/documentos/<int:id>', methods=['DELETE'])
@require_auth
def delete_documento(id):
    """Delete document"""
    db = get_db()
    
    # Buscar documento
    doc = db.execute(
        'SELECT * FROM documentos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not doc:
        return jsonify({'error': 'Documento não encontrado'}), 404
    
    # Deletar arquivo
    if os.path.exists(doc['file_path']):
        os.remove(doc['file_path'])
    
    # Deletar do banco
    db.execute('DELETE FROM documentos WHERE id = ?', (id,))
    db.commit()
    
    return jsonify({'message': 'Documento excluído'})

@app.route('/api/documentos/<int:id>/download', methods=['GET'])
@require_auth
def download_documento(id):
    """Download document"""
    db = get_db()
    
    doc = db.execute(
        'SELECT * FROM documentos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not doc:
        return jsonify({'error': 'Documento não encontrado'}), 404
    
    if not os.path.exists(doc['file_path']):
        return jsonify({'error': 'Arquivo não encontrado no servidor'}), 404
    
    return send_from_directory(
        app.config['UPLOAD_FOLDER'], 
        doc['filename'],
        as_attachment=True,
        download_name=doc['nome']
    )

@app.route('/api/documentos/categorias', methods=['GET'])
@require_auth
def list_categorias():
    """List document categories"""
    return jsonify([
        {'id': 'identidade', 'nome': 'Documento de Identidade', 'icon': 'id-card'},
        {'id': 'endereco', 'nome': 'Comprovante de Endereço', 'icon': 'home'},
        {'id': 'contrato', 'nome': 'Contrato', 'icon': 'file-signature'},
        {'id': 'procuracao', 'nome': 'Procuração', 'icon': 'file-power'},
        {'id': 'peticao', 'nome': 'Petição', 'icon': 'file-alt'},
        {'id': 'sentenca', 'nome': 'Sentença/Decisão', 'icon': 'gavel'},
        {'id': 'comprovante', 'nome': 'Comprovante de Pagamento', 'icon': 'receipt'},
        {'id': 'laudo', 'nome': 'Laudo Técnico', 'icon': 'clipboard-check'},
        {'id': 'correspondencia', 'nome': 'Correspondência', 'icon': 'envelope'},
        {'id': 'outro', 'nome': 'Outro', 'icon': 'file'},
    ])

# ============================================================================
# API ROUTES - FINANCEIRO DOCUMENTOS
# ============================================================================

@app.route('/api/financeiro/<int:financeiro_id>/documentos', methods=['GET'])
@require_auth
def list_financeiro_documentos(financeiro_id):
    """List documents for a financeiro transaction"""
    db = get_db()
    
    # Verify financeiro belongs to workspace
    fin = db.execute(
        'SELECT id FROM financeiro WHERE id = ? AND workspace_id = ?',
        (financeiro_id, g.auth['workspace_id'])
    ).fetchone()
    
    if not fin:
        return jsonify({'error': 'Transação não encontrada'}), 404
    
    rows = db.execute(
        '''SELECT d.*, u.nome as uploaded_by_nome
           FROM documentos d 
           LEFT JOIN users u ON d.uploaded_by = u.id
           WHERE d.financeiro_id = ? AND d.workspace_id = ?
           ORDER BY d.created_at DESC''',
        (financeiro_id, g.auth['workspace_id'])
    ).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.route('/api/financeiro/<int:financeiro_id>/documentos', methods=['POST'])
@require_auth
def upload_financeiro_documento(financeiro_id):
    """Upload document for a financeiro transaction"""
    if 'documento' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['documento']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    # Verify financeiro belongs to workspace
    db = get_db()
    fin = db.execute(
        'SELECT id FROM financeiro WHERE id = ? AND workspace_id = ?',
        (financeiro_id, g.auth['workspace_id'])
    ).fetchone()
    
    if not fin:
        return jsonify({'error': 'Transação não encontrada'}), 404
    
    # Nome personalizado ou nome do arquivo
    nome_customizado = request.form.get('nome', '').strip()
    descricao = request.form.get('descricao', '')
    
    # Usar nome personalizado ou manter o nome original
    nome_final = nome_customizado if nome_customizado else file.filename
    
    # Validar extensão
    allowed_extensions = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({'error': 'Formato não suportado'}), 400
    
    # Criar nome único para o arquivo
    filename = f"doc_fin_{g.auth['user_id']}_{int(datetime.now().timestamp())}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Salvar arquivo
    file.save(filepath)
    
    # Salvar no banco
    cursor = db.execute(
        '''INSERT INTO documentos (workspace_id, financeiro_id, nome, filename, 
           file_path, file_size, mime_type, categoria, descricao, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (g.auth['workspace_id'], financeiro_id, nome_final, filename,
         filepath, os.path.getsize(filepath), file.content_type, 'comprovante', descricao, g.auth['user_id'])
    )
    db.commit()
    
    documento = db.execute('SELECT * FROM documentos WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify(dict(documento)), 201

# ============================================================================
# TEMPLATES DE DOCUMENTOS
# ============================================================================

# Variáveis disponíveis para templates
TEMPLATE_VARS = {
    # Cliente
    'cliente_nome': 'Nome completo do cliente',
    'cliente_cpf': 'CPF/CNPJ do cliente',
    'cliente_rg': 'RG do cliente',
    'cliente_nacionalidade': 'Nacionalidade do cliente',
    'cliente_estado_civil': 'Estado civil do cliente',
    'cliente_profissao': 'Profissão do cliente',
    'cliente_endereco': 'Endereço completo do cliente',
    'cliente_email': 'E-mail do cliente',
    'cliente_telefone': 'Telefone do cliente',
    # Processo
    'processo_numero': 'Número do processo',
    'processo_titulo': 'Título/ação do processo',
    'processo_vara': 'Vara do processo',
    'processo_comarca': 'Comarca do processo',
    'processo_valor_causa': 'Valor da causa',
    'processo_status': 'Status do processo',
    'processo_data_abertura': 'Data de abertura do processo',
    # Advogado/Escritório
    'advogado_nome': 'Nome do advogado',
    'advogado_email': 'E-mail do advogado',
    'advogado_oab': 'Número da OAB',
    'escritorio_nome': 'Nome do escritório',
    # Data
    'data_atual': 'Data atual (dd/mm/aaaa)',
    'data_atual_extenso': 'Data atual por extenso',
}


@app.route('/api/templates/variaveis', methods=['GET'])
@require_auth
def listar_variaveis_template():
    """Lista todas as variáveis disponíveis para templates"""
    return jsonify(TEMPLATE_VARS)


@app.route('/api/templates', methods=['GET'])
@require_auth
def listar_templates():
    """Lista todos os templates do workspace"""
    db = get_db()
    categoria = request.args.get('categoria')
    tipo = request.args.get('tipo')  # Filtrar por tipo: 'texto' ou 'docx'
    
    query = '''
        SELECT t.*, u.nome as criado_por_nome 
        FROM templates_documentos t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.workspace_id = ?
    '''
    params = [g.auth['workspace_id']]
    
    if categoria:
        query += ' AND t.categoria = ?'
        params.append(categoria)
    
    if tipo:
        query += ' AND t.tipo_arquivo = ?'
        params.append(tipo)
    
    query += ' ORDER BY t.nome ASC'
    
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/templates', methods=['POST'])
@require_auth
@require_recurso('templates')
def criar_template():
    """Cria um novo template de documento (texto simples)"""
    data = request.get_json()
    
    if not data or not data.get('nome') or not data.get('conteudo'):
        return jsonify({'error': 'Nome e conteúdo são obrigatórios'}), 400
    
    db = get_db()
    cursor = db.execute('''
        INSERT INTO templates_documentos 
        (workspace_id, nome, descricao, conteudo, tipo_arquivo, categoria, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        g.auth['workspace_id'],
        data['nome'].strip(),
        data.get('descricao', '').strip(),
        data['conteudo'],
        data.get('tipo_arquivo', 'texto'),
        data.get('categoria', 'geral').strip(),
        g.auth['user_id']
    ))
    db.commit()
    
    template = db.execute('''
        SELECT t.*, u.nome as criado_por_nome 
        FROM templates_documentos t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
    ''', (cursor.lastrowid,)).fetchone()
    
    return jsonify(dict(template)), 201


@app.route('/api/templates/upload', methods=['POST'])
@require_auth
@require_recurso('templates')
def upload_template_word():
    """Faz upload de um template Word (.docx)"""
    if 'arquivo' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['arquivo']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    # Validar extensão
    if not file.filename.endswith('.docx'):
        return jsonify({'error': 'Apenas arquivos .docx são permitidos'}), 400
    
    # Dados do formulário
    nome = request.form.get('nome', '').strip()
    descricao = request.form.get('descricao', '').strip()
    categoria = request.form.get('categoria', 'geral').strip()
    
    if not nome:
        nome = file.filename.replace('.docx', '')
    
    # Criar pasta de templates se não existir
    templates_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'templates')
    os.makedirs(templates_dir, exist_ok=True)
    
    # Criar nome único para o arquivo
    timestamp = int(datetime.now().timestamp())
    safe_filename = f"template_{g.auth['workspace_id']}_{timestamp}.docx"
    filepath = os.path.join(templates_dir, safe_filename)
    
    # Salvar arquivo
    file.save(filepath)
    
    # Salvar no banco
    db = get_db()
    cursor = db.execute('''
        INSERT INTO templates_documentos 
        (workspace_id, nome, descricao, conteudo, tipo_arquivo, caminho_arquivo, categoria, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        g.auth['workspace_id'],
        nome,
        descricao,
        '',  # conteúdo vazio para templates Word
        'docx',
        filepath,
        categoria,
        g.auth['user_id']
    ))
    db.commit()
    
    template = db.execute('''
        SELECT t.*, u.nome as criado_por_nome 
        FROM templates_documentos t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
    ''', (cursor.lastrowid,)).fetchone()
    
    return jsonify(dict(template)), 201


@app.route('/api/templates/<int:id>', methods=['GET'])
@require_auth
def obter_template(id):
    """Obtém um template específico"""
    db = get_db()
    template = db.execute('''
        SELECT t.*, u.nome as criado_por_nome 
        FROM templates_documentos t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ? AND t.workspace_id = ?
    ''', (id, g.auth['workspace_id'])).fetchone()
    
    if not template:
        return jsonify({'error': 'Template não encontrado'}), 404
    
    return jsonify(dict(template))


@app.route('/api/templates/<int:id>', methods=['PUT'])
@require_auth
@require_recurso('templates')
def atualizar_template(id):
    """Atualiza um template existente"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Dados inválidos'}), 400
    
    db = get_db()
    
    # Verifica se template existe e pertence ao workspace
    template = db.execute(
        'SELECT id FROM templates_documentos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not template:
        return jsonify({'error': 'Template não encontrado'}), 404
    
    # Atualiza campos fornecidos
    campos = []
    valores = []
    
    if 'nome' in data:
        campos.append('nome = ?')
        valores.append(data['nome'].strip())
    if 'descricao' in data:
        campos.append('descricao = ?')
        valores.append(data['descricao'].strip())
    if 'conteudo' in data:
        campos.append('conteudo = ?')
        valores.append(data['conteudo'])
    if 'categoria' in data:
        campos.append('categoria = ?')
        valores.append(data['categoria'].strip())
    
    campos.append('updated_at = CURRENT_TIMESTAMP')
    valores.extend([id, g.auth['workspace_id']])
    
    query = f"UPDATE templates_documentos SET {', '.join(campos)} WHERE id = ? AND workspace_id = ?"
    db.execute(query, valores)
    db.commit()
    
    template = db.execute('''
        SELECT t.*, u.nome as criado_por_nome 
        FROM templates_documentos t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
    ''', (id,)).fetchone()
    
    return jsonify(dict(template))


@app.route('/api/templates/<int:id>', methods=['DELETE'])
@require_auth
@require_recurso('templates')
def excluir_template(id):
    """Exclui um template"""
    db = get_db()
    
    template = db.execute(
        'SELECT id FROM templates_documentos WHERE id = ? AND workspace_id = ?',
        (id, g.auth['workspace_id'])
    ).fetchone()
    
    if not template:
        return jsonify({'error': 'Template não encontrado'}), 404
    
    db.execute('DELETE FROM templates_documentos WHERE id = ?', (id,))
    db.commit()
    
    return jsonify({'message': 'Template excluído com sucesso'})


def build_template_context(db, processo_id, workspace_id, user_id):
    """Constrói o contexto completo para preenchimento de templates.
    
    Retorna um dicionário com todos os dados disponíveis para templates.
    """
    # Busca o processo com dados completos do cliente
    processo = db.execute('''
        SELECT p.*, 
               c.nome as cliente_nome, 
               c.cpf_cnpj as cliente_cpf, 
               c.rg_ie as cliente_rg,
               c.nacionalidade as cliente_nacionalidade,
               c.endereco as cliente_endereco, 
               c.numero as cliente_numero,
               c.complemento as cliente_complemento,
               c.bairro as cliente_bairro,
               c.cidade as cliente_cidade,
               c.estado as cliente_estado,
               c.cep as cliente_cep,
               c.email as cliente_email,
               c.telefone as cliente_telefone,
               c.data_nascimento as cliente_data_nascimento,
               c.estado_civil as cliente_estado_civil,
               c.profissao as cliente_profissao
        FROM processos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE p.id = ? AND p.workspace_id = ?
    ''', (processo_id, workspace_id)).fetchone()
    
    if not processo:
        return None
    
    # Busca dados do advogado
    advogado = db.execute(
        'SELECT nome, email, oab, telefone FROM users WHERE id = ?',
        (user_id,)
    ).fetchone()
    
    # Busca workspace
    workspace = db.execute(
        'SELECT nome FROM workspaces WHERE id = ?',
        (workspace_id,)
    ).fetchone()
    
    # Busca dados financeiros do processo
    financeiro = db.execute('''
        SELECT 
            COALESCE(SUM(CASE WHEN tipo IN ('entrada', 'receita') THEN valor ELSE 0 END), 0) as total_entradas,
            COALESCE(SUM(CASE WHEN tipo IN ('saida', 'despesa') THEN valor ELSE 0 END), 0) as total_saidas
        FROM financeiro 
        WHERE processo_id = ? AND workspace_id = ?
    ''', (processo_id, workspace_id)).fetchone()
    
    # Data atual
    hoje = datetime.now()
    meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
             'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    
    # Formatar valor da causa
    valor_causa_formatado = ''
    if processo['valor_causa']:
        valor_causa_formatado = f"R$ {processo['valor_causa']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    
    # Construir contexto completo
    context = {
        # Dados do cliente (flat para compatibilidade)
        'cliente_nome': processo['cliente_nome'] or '',
        'cliente_cpf': processo['cliente_cpf'] or '',
        'cliente_cnpj': processo['cliente_cpf'] if processo['cliente_cpf'] and len(re.sub(r'[^0-9]', '', processo['cliente_cpf'])) > 11 else '',
        'cliente_rg': processo['cliente_rg'] or '',
        'cliente_nacionalidade': processo['cliente_nacionalidade'] or 'Brasileiro(a)',
        'cliente_endereco': processo['cliente_endereco'] or '',
        'cliente_numero': processo['cliente_numero'] or '',
        'cliente_complemento': processo['cliente_complemento'] or '',
        'cliente_bairro': processo['cliente_bairro'] or '',
        'cliente_cidade': processo['cliente_cidade'] or '',
        'cliente_estado': processo['cliente_estado'] or '',
        'cliente_cep': processo['cliente_cep'] or '',
        'cliente_email': processo['cliente_email'] or '',
        'cliente_telefone': processo['cliente_telefone'] or '',
        'cliente_data_nascimento': processo['cliente_data_nascimento'] or '',
        'cliente_estado_civil': processo['cliente_estado_civil'] or '',
        'cliente_profissao': processo['cliente_profissao'] or '',
        
        # Dados do processo
        'processo_numero': processo['numero'] or '',
        'processo_numero_cnj': processo['numero_cnj'] or '',
        'processo_titulo': processo['titulo'] or '',
        'processo_descricao': processo['descricao'] or '',
        'processo_tipo': processo['tipo'] or '',
        'processo_status': processo['status'] or '',
        'processo_vara': processo['vara'] or '',
        'processo_comarca': processo['comarca'] or '',
        'processo_valor_causa': valor_causa_formatado,
        'processo_valor_causa_numero': processo['valor_causa'] or 0,
        'processo_data_abertura': processo['data_abertura'] or '',
        
        # Dados do advogado
        'advogado_nome': advogado['nome'] if advogado else '',
        'advogado_email': advogado['email'] if advogado else '',
        'advogado_oab': advogado['oab'] if advogado else '',
        'advogado_telefone': advogado['telefone'] if advogado else '',
        
        # Dados do escritório
        'escritorio_nome': workspace['nome'] if workspace else '',
        
        # Dados financeiros
        'financeiro_total_entradas': f"R$ {financeiro['total_entradas']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.') if financeiro else 'R$ 0,00',
        'financeiro_total_saidas': f"R$ {financeiro['total_saidas']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.') if financeiro else 'R$ 0,00',
        'financeiro_saldo': f"R$ {financeiro['total_entradas'] - financeiro['total_saidas']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.') if financeiro else 'R$ 0,00',
        
        # Datas
        'data_atual': hoje.strftime('%d/%m/%Y'),
        'data_atual_extenso': f"{hoje.day} de {meses[hoje.month-1]} de {hoje.year}",
        'data_atual_americana': hoje.strftime('%Y-%m-%d'),
        'hora_atual': hoje.strftime('%H:%M'),
        
        # Objetos aninhados (para acesso tipo {{ cliente.nome }})
        'cliente': {
            'nome': processo['cliente_nome'] or '',
            'cpf': processo['cliente_cpf'] or '',
            'cnpj': processo['cliente_cpf'] if processo['cliente_cpf'] and len(re.sub(r'[^0-9]', '', processo['cliente_cpf'])) > 11 else '',
            'rg': processo['cliente_rg'] or '',
            'nacionalidade': processo['cliente_nacionalidade'] or 'Brasileiro(a)',
            'endereco': processo['cliente_endereco'] or '',
            'numero': processo['cliente_numero'] or '',
            'complemento': processo['cliente_complemento'] or '',
            'bairro': processo['cliente_bairro'] or '',
            'cidade': processo['cliente_cidade'] or '',
            'estado': processo['cliente_estado'] or '',
            'cep': processo['cliente_cep'] or '',
            'email': processo['cliente_email'] or '',
            'telefone': processo['cliente_telefone'] or '',
            'data_nascimento': processo['cliente_data_nascimento'] or '',
            'estado_civil': processo['cliente_estado_civil'] or '',
            'profissao': processo['cliente_profissao'] or '',
        },
        'processo': {
            'numero': processo['numero'] or '',
            'numero_cnj': processo['numero_cnj'] or '',
            'titulo': processo['titulo'] or '',
            'descricao': processo['descricao'] or '',
            'tipo': processo['tipo'] or '',
            'status': processo['status'] or '',
            'vara': processo['vara'] or '',
            'comarca': processo['comarca'] or '',
            'valor_causa': valor_causa_formatado,
            'data_abertura': processo['data_abertura'] or '',
        },
        'advogado': {
            'nome': advogado['nome'] if advogado else '',
            'email': advogado['email'] if advogado else '',
            'oab': advogado['oab'] if advogado else '',
            'telefone': advogado['telefone'] if advogado else '',
        },
        'escritorio': {
            'nome': workspace['nome'] if workspace else '',
        },
    }
    
    return context


@app.route('/api/templates/<int:template_id>/gerar', methods=['POST'])
@require_auth
@require_recurso('templates')
def gerar_documento_template(template_id):
    """Gera um documento preenchendo o template com dados do processo"""
    data = request.get_json()
    
    if not data or not data.get('processo_id'):
        return jsonify({'error': 'ID do processo é obrigatório'}), 400
    
    processo_id = data['processo_id']
    formato = data.get('formato', 'auto')  # 'auto', 'json', 'download'
    db = get_db()
    
    # Busca o template
    template = db.execute(
        'SELECT * FROM templates_documentos WHERE id = ? AND workspace_id = ?',
        (template_id, g.auth['workspace_id'])
    ).fetchone()
    
    if not template:
        return jsonify({'error': 'Template não encontrado'}), 404
    
    # Constrói contexto completo
    context = build_template_context(db, processo_id, g.auth['workspace_id'], g.auth['user_id'])
    
    if not context:
        return jsonify({'error': 'Processo não encontrado'}), 404
    
    # Se for template Word (.docx)
    if template['tipo_arquivo'] == 'docx':
        if not template['caminho_arquivo'] or not os.path.exists(template['caminho_arquivo']):
            return jsonify({'error': 'Arquivo do template não encontrado'}), 404
        
        try:
            # Carrega o template Word
            doc = DocxTemplate(template['caminho_arquivo'])
            
            # Renderiza com o contexto
            doc.render(context)
            
            # Cria pasta temp se não existir
            temp_dir = os.path.join(os.path.dirname(__file__), 'temp')
            os.makedirs(temp_dir, exist_ok=True)
            
            # Nome do arquivo de saída
            safe_cliente_nome = re.sub(r'[^\w\s-]', '', context['cliente_nome'] or 'Cliente').strip().replace(' ', '_')
            safe_processo = re.sub(r'[^\w\s-]', '', context['processo_numero'] or 'Processo').strip().replace(' ', '_')
            output_filename = f"{template['nome']}_{safe_cliente_nome}_{int(datetime.now().timestamp())}.docx"
            output_path = os.path.join(temp_dir, output_filename)
            
            # Salva o documento
            doc.save(output_path)
            
            # Se solicitou JSON (preview), retorna info
            if formato == 'json':
                return jsonify({
                    'tipo': 'docx',
                    'template_nome': template['nome'],
                    'processo_numero': context['processo_numero'],
                    'data_geracao': context['data_atual'],
                    'nome_arquivo': output_filename,
                    'mensagem': 'Documento Word gerado com sucesso'
                })
            
            # Retorna arquivo para download
            return send_from_directory(
                temp_dir,
                output_filename,
                as_attachment=True,
                download_name=output_filename
            )
            
        except Exception as e:
            return jsonify({'error': f'Erro ao gerar documento Word: {str(e)}'}), 500
    
    # Template de texto (modo antigo)
    else:
        # Prepara as variáveis para substituição (modo simples para texto)
        conteudo = template['conteudo'] or ''
        
        # Substitui as variáveis {{nome_variavel}}
        for var_name, var_value in context.items():
            if isinstance(var_value, str):
                placeholder = f'{{{{{var_name}}}}}'
                conteudo = conteudo.replace(placeholder, str(var_value))
        
        # Limpa variáveis não reconhecidas
        conteudo = re.sub(r'\{\{[\w_]+\}\}', '________________', conteudo)
        
        return jsonify({
            'tipo': 'texto',
            'documento_gerado': conteudo,
            'template_nome': template['nome'],
            'processo_numero': context['processo_numero'],
            'data_geracao': context['data_atual']
        })


# ============================================================================
# SUPER ADMIN - BOOTSTRAP SEGURO
# ============================================================================

@app.route('/api/bootstrap/superadmin', methods=['POST'])
def bootstrap_superadmin():
    """
    Endpoint de bootstrap para criar/promover um usuário como superadmin.

    Proteções:
    - Só funciona se a env SUPERADMIN_BOOTSTRAP_TOKEN estiver definida
    - Requer header X-Bootstrap-Token igual a essa env
    - Só permite executar enquanto não existir nenhum usuário com role='superadmin'
    """
    if not SUPERADMIN_BOOTSTRAP_TOKEN:
        # Se não houver token configurado, como se a rota não existisse
        return jsonify({'error': 'Bootstrap desabilitado'}), 404

    token = request.headers.get('X-Bootstrap-Token')
    if token != SUPERADMIN_BOOTSTRAP_TOKEN:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()

    # Já existe superadmin? Então não permite mais bootstrap
    existing = db.execute(
        "SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'"
    ).fetchone()['count']
    if existing > 0:
        return jsonify({'error': 'Já existe um superadmin configurado'}), 400

    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    nome = data.get('nome') or 'Super Admin'

    if not email or not password:
        return jsonify({'error': 'Campos obrigatórios: email, password'}), 400

    # Usa o primeiro workspace existente ou cria um novo
    ws = db.execute('SELECT id FROM workspaces ORDER BY id LIMIT 1').fetchone()
    if ws:
        workspace_id = ws['id']
    else:
        cursor = db.execute(
            'INSERT INTO workspaces (nome) VALUES (?)',
            ('Super Admin Workspace',)
        )
        workspace_id = cursor.lastrowid

    # Se já existir usuário com esse email, apenas promove para superadmin
    existing_user = db.execute(
        'SELECT id, role FROM users WHERE email = ?',
        (email,)
    ).fetchone()

    if existing_user:
        db.execute(
            'UPDATE users SET role = ?, workspace_id = ? WHERE email = ?',
            ('superadmin', workspace_id, email)
        )
    else:
        db.execute(
            'INSERT INTO users (workspace_id, nome, email, password_hash, role) '
            'VALUES (?, ?, ?, ?, ?)',
            (workspace_id, nome, email, hash_senha(password), 'superadmin')
        )

    db.commit()

    return jsonify({
        'message': 'Superadmin criado/atualizado com sucesso',
        'email': email
    }), 201


# ============================================================================
# SUPER ADMIN - DASHBOARD
# ============================================================================

@app.route('/api/admin/estatisticas', methods=['GET'])
@require_superadmin
def admin_estatisticas():
    """Retorna estatísticas gerais do sistema para o dashboard de super admin."""
    db = get_db()
    
    # Total de usuários
    total_usuarios = db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
    usuarios_ativos = db.execute("SELECT COUNT(*) as count FROM users WHERE role != 'inativo'").fetchone()['count']
    
    # Total de workspaces
    total_workspaces = db.execute('SELECT COUNT(*) as count FROM workspaces').fetchone()['count']
    
    # Total de processos
    total_processos = db.execute('SELECT COUNT(*) as count FROM processos').fetchone()['count']
    
    # Receita mensal (MRR)
    mrr = db.execute('''
        SELECT COALESCE(SUM(valor), 0) as total FROM assinaturas 
        WHERE status = 'ativo' AND ciclo = 'mensal'
    ''').fetchone()['total']
    
    # Usuários novos nos últimos 30 dias
    usuarios_recentes = db.execute('''
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= date('now', '-30 days')
    ''').fetchone()['count']
    
    # Distribuição por plano
    planos_dist = db.execute('''
        SELECT p.nome, COUNT(a.id) as count 
        FROM planos p 
        LEFT JOIN assinaturas a ON p.id = a.plano_id AND a.status = 'ativo'
        GROUP BY p.id
    ''').fetchall()
    
    # Logs recentes
    logs_recentes = db.execute('''
        SELECT * FROM audit_logs 
        ORDER BY created_at DESC LIMIT 10
    ''').fetchall()
    
    return jsonify({
        'total_usuarios': total_usuarios,
        'usuarios_ativos': usuarios_ativos,
        'total_workspaces': total_workspaces,
        'total_processos': total_processos,
        'mrr': mrr,
        'usuarios_recentes': usuarios_recentes,
        'distribuicao_planos': [dict(r) for r in planos_dist],
        'logs_recentes': [dict(r) for r in logs_recentes]
    })


@app.route('/api/admin/usuarios', methods=['GET'])
@require_superadmin
def admin_listar_usuarios():
    """Lista todos os usuários do sistema com filtros."""
    db = get_db()
    
    # Parâmetros de filtro
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    plano = request.args.get('plano', '')
    data_inicio = request.args.get('data_inicio', '')
    data_fim = request.args.get('data_fim', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    query = '''
        SELECT u.*, w.nome as workspace_nome, p.nome as plano_nome, a.status as assinatura_status
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        LEFT JOIN assinaturas a ON w.id = a.workspace_id AND a.status = 'ativo'
        LEFT JOIN planos p ON a.plano_id = p.id
        WHERE 1=1
    '''
    params = []
    
    if search:
        query += ' AND (u.nome LIKE ? OR u.email LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    if status:
        query += ' AND u.role = ?'
        params.append(status)
    
    if plano:
        query += ' AND p.codigo = ?'
        params.append(plano)
    
    if data_inicio:
        query += ' AND u.created_at >= ?'
        params.append(data_inicio)
    
    if data_fim:
        query += ' AND u.created_at <= ?'
        params.append(data_fim)
    
    # Count total
    count_query = query.replace('SELECT u.*, w.nome as workspace_nome, p.nome as plano_nome, a.status as assinatura_status', 'SELECT COUNT(*) as count')
    total = db.execute(count_query, params).fetchone()['count']
    
    # Paginação
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    
    rows = db.execute(query, params).fetchall()
    
    return jsonify({
        'usuarios': [dict(r) for r in rows],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })


@app.route('/api/admin/usuarios/<int:user_id>', methods=['GET'])
@require_superadmin
def admin_obter_usuario(user_id):
    """Obtém detalhes de um usuário específico."""
    db = get_db()
    
    user = db.execute('''
        SELECT u.*, w.nome as workspace_nome
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        WHERE u.id = ?
    ''', (user_id,)).fetchone()
    
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Assinatura atual
    assinatura = db.execute('''
        SELECT a.*, p.nome as plano_nome, p.codigo as plano_codigo
        FROM assinaturas a
        JOIN planos p ON a.plano_id = p.id
        WHERE a.workspace_id = ? AND a.status = 'ativo'
        ORDER BY a.created_at DESC LIMIT 1
    ''', (user['workspace_id'],)).fetchone()
    
    # Estatísticas do usuário
    stats = db.execute('''
        SELECT 
            (SELECT COUNT(*) FROM processos WHERE workspace_id = ?) as total_processos,
            (SELECT COUNT(*) FROM clientes WHERE workspace_id = ?) as total_clientes,
            (SELECT COUNT(*) FROM documentos WHERE workspace_id = ?) as total_documentos
    ''', (user['workspace_id'], user['workspace_id'], user['workspace_id'])).fetchone()
    
    return jsonify({
        'usuario': dict(user),
        'assinatura': dict(assinatura) if assinatura else None,
        'estatisticas': dict(stats)
    })


@app.route('/api/admin/usuarios/<int:user_id>', methods=['PUT'])
@require_superadmin
def admin_atualizar_usuario(user_id):
    """Atualiza dados de um usuário."""
    data = request.get_json()
    db = get_db()
    
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Campos permitidos para atualização
    campos_permitidos = ['nome', 'email', 'telefone', 'role']
    updates = []
    params = []
    
    for campo in campos_permitidos:
        if campo in data:
            updates.append(f'{campo} = ?')
            params.append(data[campo])
    
    if not updates:
        return jsonify({'error': 'Nenhum campo para atualizar'}), 400
    
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    
    db.execute(query, params)
    db.commit()
    
    # Registrar audit log
    registrar_audit_log('editar', 'users', user_id, dict(user), data)
    
    return jsonify({'message': 'Usuário atualizado com sucesso'})


@app.route('/api/admin/usuarios/<int:user_id>/reset-senha', methods=['POST'])
@require_superadmin
def admin_resetar_senha(user_id):
    """Reseta a senha de um usuário."""
    data = request.get_json()
    nova_senha = data.get('senha', 'Juris@123')  # Senha padrão se não informada
    
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    password_hash = hash_senha(nova_senha)
    db.execute('UPDATE users SET password_hash = ? WHERE id = ?', (password_hash, user_id))
    db.commit()
    
    # Registrar audit log
    registrar_audit_log('reset_senha', 'users', user_id, None, {'senha_alterada': True})
    
    return jsonify({'message': 'Senha resetada com sucesso', 'senha_temporaria': nova_senha})


@app.route('/api/admin/usuarios/<int:user_id>', methods=['DELETE'])
@require_superadmin
def admin_excluir_usuario(user_id):
    """Exclui (soft delete) um usuário."""
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    if user['role'] == 'superadmin':
        return jsonify({'error': 'Não é possível excluir um super admin'}), 403
    
    # Soft delete - marca como inativo em vez de excluir
    db.execute("UPDATE users SET role = 'inativo', email = ? WHERE id = ?", 
               (f"{user['email']}.inativo.{user_id}", user_id))
    db.commit()
    
    # Registrar audit log
    registrar_audit_log('excluir', 'users', user_id, dict(user), {'status': 'inativo'})
    
    return jsonify({'message': 'Usuário desativado com sucesso'})


@app.route('/api/admin/impersonate/<int:user_id>', methods=['POST'])
@require_superadmin
def admin_impersonate(user_id):
    """Gera um token JWT para impersonar um usuário (suporte técnico)."""
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Gerar token especial de impersonação
    token = gerar_jwt_token(user['id'], user['workspace_id'], user['role'] in ['admin', 'superadmin'])
    
    # Registrar audit log
    registrar_audit_log('impersonate', 'users', user_id, None, {'admin_id': g.auth['user_id']})
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'nome': user['nome'],
            'email': user['email'],
            'workspace_id': user['workspace_id']
        }
    })


@app.route('/api/admin/planos', methods=['GET'])
@require_superadmin
def admin_listar_planos():
    """Lista todos os planos disponíveis."""
    db = get_db()
    rows = db.execute('SELECT * FROM planos ORDER BY preco_mensal ASC').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/planos', methods=['POST'])
@require_superadmin
def admin_criar_plano():
    """Cria um novo plano."""
    data = request.get_json()
    db = get_db()
    
    cursor = db.execute('''
        INSERT INTO planos (codigo, nome, descricao, preco_mensal, preco_anual, recursos, limites)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['codigo'],
        data['nome'],
        data.get('descricao', ''),
        data['preco_mensal'],
        data.get('preco_anual'),
        json.dumps(data.get('recursos', {})),
        json.dumps(data.get('limites', {}))
    ))
    db.commit()
    
    plano = db.execute('SELECT * FROM planos WHERE id = ?', (cursor.lastrowid,)).fetchone()
    
    registrar_audit_log('criar', 'planos', cursor.lastrowid, None, dict(plano))
    
    return jsonify(dict(plano)), 201


@app.route('/api/admin/planos/<int:plano_id>', methods=['PUT'])
@require_superadmin
def admin_atualizar_plano(plano_id):
    """Atualiza um plano existente."""
    data = request.get_json()
    db = get_db()
    
    plano = db.execute('SELECT * FROM planos WHERE id = ?', (plano_id,)).fetchone()
    if not plano:
        return jsonify({'error': 'Plano não encontrado'}), 404
    
    campos = []
    params = []
    
    if 'nome' in data:
        campos.append('nome = ?')
        params.append(data['nome'])
    if 'descricao' in data:
        campos.append('descricao = ?')
        params.append(data['descricao'])
    if 'preco_mensal' in data:
        campos.append('preco_mensal = ?')
        params.append(data['preco_mensal'])
    if 'preco_anual' in data:
        campos.append('preco_anual = ?')
        params.append(data['preco_anual'])
    if 'recursos' in data:
        campos.append('recursos = ?')
        params.append(json.dumps(data['recursos']))
    if 'limites' in data:
        campos.append('limites = ?')
        params.append(json.dumps(data['limites']))
    if 'ativo' in data:
        campos.append('ativo = ?')
        params.append(data['ativo'])
    
    if not campos:
        return jsonify({'error': 'Nenhum campo para atualizar'}), 400
    
    params.append(plano_id)
    query = f"UPDATE planos SET {', '.join(campos)} WHERE id = ?"
    db.execute(query, params)
    db.commit()
    
    registrar_audit_log('editar', 'planos', plano_id, dict(plano), data)
    
    return jsonify({'message': 'Plano atualizado com sucesso'})


@app.route('/api/admin/assinaturas', methods=['GET'])
@require_superadmin
def admin_listar_assinaturas():
    """Lista todas as assinaturas do sistema."""
    db = get_db()
    
    rows = db.execute('''
        SELECT a.*, w.nome as workspace_nome, p.nome as plano_nome, p.codigo as plano_codigo
        FROM assinaturas a
        JOIN workspaces w ON a.workspace_id = w.id
        JOIN planos p ON a.plano_id = p.id
        ORDER BY a.created_at DESC
    ''').fetchall()
    
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/assinaturas', methods=['POST'])
@require_superadmin
def admin_criar_assinatura():
    """Cria ou atualiza uma assinatura manualmente."""
    data = request.get_json()
    db = get_db()
    
    workspace_id = data.get('workspace_id')
    plano_id = data.get('plano_id')
    
    # Cancelar assinatura ativa existente
    db.execute('''
        UPDATE assinaturas SET status = 'cancelado', data_cancelamento = CURRENT_TIMESTAMP
        WHERE workspace_id = ? AND status = 'ativo'
    ''', (workspace_id,))
    
    # Criar nova assinatura
    cursor = db.execute('''
        INSERT INTO assinaturas (workspace_id, plano_id, status, ciclo, valor, data_renovacao)
        VALUES (?, ?, 'ativo', ?, ?, ?)
    ''', (
        workspace_id,
        plano_id,
        data.get('ciclo', 'mensal'),
        data.get('valor', 0),
        data.get('data_renovacao')
    ))
    db.commit()
    
    registrar_audit_log('criar', 'assinaturas', cursor.lastrowid, None, data)
    
    return jsonify({'message': 'Assinatura criada com sucesso'}), 201


@app.route('/api/admin/cupons', methods=['GET'])
@require_superadmin
def admin_listar_cupons():
    """Lista todos os cupons de desconto."""
    db = get_db()
    rows = db.execute('SELECT * FROM cupons ORDER BY created_at DESC').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/cupons', methods=['POST'])
@require_superadmin
def admin_criar_cupom():
    """Cria um novo cupom de desconto."""
    data = request.get_json()
    db = get_db()
    
    cursor = db.execute('''
        INSERT INTO cupons (codigo, tipo, valor, limite_uso, data_inicio, data_expiracao, planos_validos, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['codigo'].upper(),
        data.get('tipo', 'percentual'),
        data['valor'],
        data.get('limite_uso'),
        data.get('data_inicio'),
        data.get('data_expiracao'),
        json.dumps(data.get('planos_validos')),
        g.auth['user_id']
    ))
    db.commit()
    
    cupom = db.execute('SELECT * FROM cupons WHERE id = ?', (cursor.lastrowid,)).fetchone()
    registrar_audit_log('criar', 'cupons', cursor.lastrowid, None, dict(cupom))
    
    return jsonify(dict(cupom)), 201


@app.route('/api/admin/cupons/<int:cupom_id>', methods=['PUT'])
@require_superadmin
def admin_atualizar_cupom(cupom_id):
    """Atualiza um cupom existente."""
    data = request.get_json()
    db = get_db()
    
    cupom = db.execute('SELECT * FROM cupons WHERE id = ?', (cupom_id,)).fetchone()
    if not cupom:
        return jsonify({'error': 'Cupom não encontrado'}), 404
    
    campos = []
    params = []
    
    if 'ativo' in data:
        campos.append('ativo = ?')
        params.append(data['ativo'])
    if 'limite_uso' in data:
        campos.append('limite_uso = ?')
        params.append(data['limite_uso'])
    if 'data_expiracao' in data:
        campos.append('data_expiracao = ?')
        params.append(data['data_expiracao'])
    
    if not campos:
        return jsonify({'error': 'Nenhum campo para atualizar'}), 400
    
    params.append(cupom_id)
    query = f"UPDATE cupons SET {', '.join(campos)} WHERE id = ?"
    db.execute(query, params)
    db.commit()
    
    registrar_audit_log('editar', 'cupons', cupom_id, dict(cupom), data)
    
    return jsonify({'message': 'Cupom atualizado com sucesso'})


@app.route('/api/admin/configuracoes', methods=['GET'])
@require_superadmin
def admin_listar_configuracoes():
    """Lista todas as configurações globais."""
    db = get_db()
    rows = db.execute('SELECT * FROM configuracoes_globais ORDER BY chave ASC').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/configuracoes/<chave>', methods=['PUT'])
@require_superadmin
def admin_atualizar_configuracao(chave):
    """Atualiza uma configuração global."""
    data = request.get_json()
    db = get_db()
    
    config = db.execute('SELECT * FROM configuracoes_globais WHERE chave = ?', (chave,)).fetchone()
    if not config:
        return jsonify({'error': 'Configuração não encontrada'}), 404
    
    db.execute('''
        UPDATE configuracoes_globais 
        SET valor = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE chave = ?
    ''', (data.get('valor', config['valor']), data.get('descricao', config['descricao']), g.auth['user_id'], chave))
    db.commit()
    
    registrar_audit_log('editar', 'configuracoes_globais', None, dict(config), data)
    
    return jsonify({'message': 'Configuração atualizada com sucesso'})


@app.route('/api/admin/auditoria', methods=['GET'])
@require_superadmin
def admin_listar_auditoria():
    """Lista os logs de auditoria com filtros."""
    db = get_db()
    
    entidade = request.args.get('entidade', '')
    acao = request.args.get('acao', '')
    user_id = request.args.get('user_id', '')
    data_inicio = request.args.get('data_inicio', '')
    data_fim = request.args.get('data_fim', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    
    query = 'SELECT * FROM audit_logs WHERE 1=1'
    params = []
    
    if entidade:
        query += ' AND entidade = ?'
        params.append(entidade)
    if acao:
        query += ' AND acao = ?'
        params.append(acao)
    if user_id:
        query += ' AND user_id = ?'
        params.append(user_id)
    if data_inicio:
        query += ' AND created_at >= ?'
        params.append(data_inicio)
    if data_fim:
        query += ' AND created_at <= ?'
        params.append(data_fim)
    
    # Count
    count_query = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    total = db.execute(count_query, params).fetchone()['count']
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    
    rows = db.execute(query, params).fetchall()
    
    return jsonify({
        'logs': [dict(r) for r in rows],
        'total': total,
        'page': page,
        'per_page': per_page
    })


# ============================================================================
# BACKUP E RESTAURAÇÃO
# ============================================================================

@app.route('/api/admin/backup', methods=['GET'])
@require_superadmin
def admin_exportar_backup():
    """Exporta todos os dados do sistema para backup."""
    db = get_db()
    
    backup = {
        'metadata': {
            'versao': '1.0',
            'data_exportacao': datetime.now().isoformat(),
            'exportado_por': g.auth['user']['email']
        },
        'tabelas': {}
    }
    
    tabelas = [
        'workspaces', 'users', 'clientes', 'processos', 'prazos', 'tarefas',
        'documentos', 'financeiro', 'convites', 'templates_documentos',
        'planos', 'assinaturas', 'cupons', 'configuracoes_globais',
        'chat_history', 'audit_logs', 'notificacoes'
    ]
    
    for tabela in tabelas:
        try:
            rows = db.execute(f'SELECT * FROM {tabela}').fetchall()
            backup['tabelas'][tabela] = [dict(r) for r in rows]
        except Exception as e:
            backup['tabelas'][tabela] = {'erro': str(e)}
    
    # Registrar no audit log
    registrar_audit_log('backup_exportar', 'sistema', None, None, {
        'tabelas_exportadas': len(tabelas),
        'total_registros': sum(len(v) for v in backup['tabelas'].values() if isinstance(v, list))
    })
    
    # Gerar nome do arquivo
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"jurispocket_backup_{timestamp}.json"
    
    return jsonify(backup), 200, {
        'Content-Disposition': f'attachment; filename={filename}',
        'Content-Type': 'application/json'
    }


@app.route('/api/admin/backup/verificar', methods=['POST'])
@require_superadmin
def admin_verificar_backup():
    """Verifica a integridade de um arquivo de backup antes da importação."""
    if 'arquivo' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['arquivo']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    try:
        conteudo = file.read().decode('utf-8')
        backup = json.loads(conteudo)
        
        # Verificar estrutura
        if 'metadata' not in backup or 'tabelas' not in backup:
            return jsonify({'error': 'Arquivo de backup inválido - estrutura incorreta'}), 400
        
        # Contar registros
        estatisticas = {}
        total_registros = 0
        for tabela, dados in backup['tabelas'].items():
            if isinstance(dados, list):
                estatisticas[tabela] = len(dados)
                total_registros += len(dados)
        
        return jsonify({
            'valido': True,
            'versao': backup['metadata'].get('versao', 'desconhecida'),
            'data_exportacao': backup['metadata'].get('data_exportacao'),
            'exportado_por': backup['metadata'].get('exportado_por'),
            'estatisticas': estatisticas,
            'total_registros': total_registros
        })
        
    except json.JSONDecodeError:
        return jsonify({'error': 'Arquivo JSON inválido'}), 400
    except Exception as e:
        return jsonify({'error': f'Erro ao verificar backup: {str(e)}'}), 500


@app.route('/api/admin/backup/restaurar', methods=['POST'])
@require_superadmin
def admin_restaurar_backup():
    """Restaura dados de um arquivo de backup."""
    data = request.get_json()
    
    if not data or 'backup' not in data:
        return jsonify({'error': 'Dados do backup não fornecidos'}), 400
    
    backup = data['backup']
    opcoes = data.get('opcoes', {})
    
    # Opções de restauração
    modo = opcoes.get('modo', 'merge')  # 'merge' ou 'replace'
    tabelas_selecionadas = opcoes.get('tabelas', [])  # Vazio = todas
    
    if modo not in ['merge', 'replace']:
        return jsonify({'error': 'Modo deve ser "merge" ou "replace"'}), 400
    
    db = get_db()
    resultados = {}
    erros = []
    
    # Tabelas que podem ser restauradas
    tabelas_permitidas = [
        'workspaces', 'users', 'clientes', 'processos', 'prazos', 'tarefas',
        'documentos', 'financeiro', 'convites', 'templates_documentos',
        'planos', 'assinaturas', 'cupons', 'configuracoes_globais',
        'chat_history', 'notificacoes'
    ]
    
    # Se não especificou tabelas, usa todas
    if not tabelas_selecionadas:
        tabelas_selecionadas = list(backup.get('tabelas', {}).keys())
    
    # Filtrar apenas tabelas permitidas
    tabelas_restaurar = [t for t in tabelas_selecionadas if t in tabelas_permitidas]
    
    try:
        for tabela in tabelas_restaurar:
            dados = backup['tabelas'].get(tabela, [])
            
            if not isinstance(dados, list) or len(dados) == 0:
                resultados[tabela] = {'status': 'ignorado', 'mensagem': 'Sem dados para restaurar'}
                continue
            
            # Em modo replace, limpa a tabela primeiro (exceto tabelas críticas)
            if modo == 'replace' and tabela not in ['planos', 'configuracoes_globais']:
                try:
                    db.execute(f'DELETE FROM {tabela}')
                except Exception as e:
                    erros.append(f'Erro ao limpar {tabela}: {str(e)}')
                    continue
            
            registros_importados = 0
            registros_falhos = 0
            
            for registro in dados:
                try:
                    # Remover campos auto-gerados
                    registro_limpo = {k: v for k, v in registro.items() 
                                      if k not in ['id', 'created_at', 'updated_at']}
                    
                    if not registro_limpo:
                        continue
                    
                    colunas = ', '.join(registro_limpo.keys())
                    placeholders = ', '.join(['?' for _ in registro_limpo])
                    valores = list(registro_limpo.values())
                    
                    db.execute(f'''
                        INSERT OR IGNORE INTO {tabela} ({colunas})
                        VALUES ({placeholders})
                    ''', valores)
                    
                    registros_importados += 1
                    
                except Exception as e:
                    registros_falhos += 1
                    print(f"Erro ao importar registro em {tabela}: {e}")
            
            resultados[tabela] = {
                'status': 'sucesso',
                'importados': registros_importados,
                'falhos': registros_falhos
            }
        
        db.commit()
        
        # Registrar no audit log
        registrar_audit_log('backup_restaurar', 'sistema', None, None, {
            'modo': modo,
            'tabelas': tabelas_restaurar,
            'resultados': resultados
        })
        
        return jsonify({
            'sucesso': True,
            'modo': modo,
            'resultados': resultados,
            'erros': erros if erros else None
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({'error': f'Erro ao restaurar backup: {str(e)}'}), 500


@app.route('/api/admin/backup/automatico', methods=['GET'])
@require_superadmin
def admin_status_backup_automatico():
    """Retorna status do backup automático."""
    db = get_db()
    
    # Verificar último backup registrado
    ultimo_backup = db.execute('''
        SELECT * FROM audit_logs 
        WHERE acao = 'backup_exportar' 
        ORDER BY created_at DESC LIMIT 1
    ''').fetchone()
    
    # Calcular próximo backup (se configurado para diário)
    proximo_backup = None
    if ultimo_backup:
        ultima_data = datetime.fromisoformat(ultimo_backup['created_at'])
        proximo_backup = (ultima_data + timedelta(days=1)).isoformat()
    
    return jsonify({
        'backup_automatico': False,  # Pode ser configurado
        'frequencia': 'diario',
        'ultimo_backup': dict(ultimo_backup) if ultimo_backup else None,
        'proximo_backup_agendado': proximo_backup,
        'recomendacao': 'É recomendado fazer backup manual antes de grandes operações'
    })


@app.route('/api/admin/workspaces', methods=['GET'])
@require_superadmin
def admin_listar_workspaces():
    """Lista todos os workspaces do sistema."""
    db = get_db()
    
    rows = db.execute('''
        SELECT w.*, 
               (SELECT COUNT(*) FROM users WHERE workspace_id = w.id) as total_usuarios,
               (SELECT COUNT(*) FROM processos WHERE workspace_id = w.id) as total_processos,
               (SELECT COUNT(*) FROM clientes WHERE workspace_id = w.id) as total_clientes,
               p.nome as plano_nome, p.codigo as plano_codigo
        FROM workspaces w
        LEFT JOIN assinaturas a ON w.id = a.workspace_id AND a.status = 'ativo'
        LEFT JOIN planos p ON a.plano_id = p.id
        ORDER BY w.created_at DESC
    ''').fetchall()
    
    return jsonify([dict(r) for r in rows])


# ============================================================================
# SUPER ADMIN - ASSINATURAS E PAGAMENTOS
# ============================================================================

@app.route('/api/admin/assinaturas', methods=['GET'])
@require_superadmin
def admin_listar_assinaturas_detalhado():
    """Lista todas as assinaturas com dados completos para gestão."""
    db = get_db()
    
    status = request.args.get('status', '')
    search = request.args.get('search', '')
    
    query = '''
        SELECT a.*, 
               w.nome as workspace_nome,
               p.nome as plano_nome, 
               p.codigo as plano_codigo,
               p.preco_mensal,
               p.preco_anual,
               u.nome as responsavel_nome,
               u.email as responsavel_email,
               (SELECT COUNT(*) FROM users WHERE workspace_id = w.id) as total_usuarios,
               (SELECT COUNT(*) FROM processos WHERE workspace_id = w.id) as total_processos
        FROM assinaturas a
        JOIN workspaces w ON a.workspace_id = w.id
        JOIN planos p ON a.plano_id = p.id
        LEFT JOIN users u ON w.id = u.workspace_id AND u.role = 'admin'
        WHERE 1=1
    '''
    params = []
    
    if status:
        query += ' AND a.status = ?'
        params.append(status)
    
    if search:
        query += ' AND (w.nome LIKE ? OR u.nome LIKE ? OR u.email LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
    
    query += ' ORDER BY a.created_at DESC'
    
    rows = db.execute(query, params).fetchall()
    assinaturas = [dict(r) for r in rows]
    
    # Buscar histórico de pagamentos para cada assinatura
    for assinatura in assinaturas:
        pagamentos = db.execute('''
            SELECT p.*, u.nome as registrado_por_nome
            FROM assinaturas_pagamentos p
            LEFT JOIN users u ON p.registrado_por = u.id
            WHERE p.assinatura_id = ?
            ORDER BY p.data_pagamento DESC
        ''', (assinatura['id'],)).fetchall()
        assinatura['pagamentos'] = [dict(p) for p in pagamentos]
        
        # Calcular status de pagamento do mês atual
        mes_atual = datetime.now().strftime('%Y-%m')
        pagamento_mes = db.execute('''
            SELECT * FROM assinaturas_pagamentos
            WHERE assinatura_id = ? AND mes_referencia = ? AND status = 'confirmado'
        ''', (assinatura['id'], mes_atual)).fetchone()
        assinatura['pago_mes_atual'] = bool(pagamento_mes)
    
    return jsonify(assinaturas)


@app.route('/api/admin/assinaturas/<int:assinatura_id>/pagamentos', methods=['GET'])
@require_superadmin
def admin_listar_pagamentos(assinatura_id):
    """Lista histórico de pagamentos de uma assinatura."""
    db = get_db()
    
    rows = db.execute('''
        SELECT p.*, u.nome as registrado_por_nome
        FROM assinaturas_pagamentos p
        LEFT JOIN users u ON p.registrado_por = u.id
        WHERE p.assinatura_id = ?
        ORDER BY p.data_pagamento DESC
    ''', (assinatura_id,)).fetchall()
    
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/assinaturas/<int:assinatura_id>/pagamentos', methods=['POST'])
@require_superadmin
def admin_registrar_pagamento(assinatura_id):
    """Registra um novo pagamento."""
    data = request.get_json()
    db = get_db()
    
    # Verifica se assinatura existe
    assinatura = db.execute(
        'SELECT * FROM assinaturas WHERE id = ?', (assinatura_id,)
    ).fetchone()
    
    if not assinatura:
        return jsonify({'error': 'Assinatura não encontrada'}), 404
    
    cursor = db.execute('''
        INSERT INTO assinaturas_pagamentos 
        (assinatura_id, workspace_id, valor_pago, mes_referencia, metodo_pagamento, 
         status, observacoes, registrado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        assinatura_id,
        assinatura['workspace_id'],
        data.get('valor_pago'),
        data.get('mes_referencia'),
        data.get('metodo_pagamento', 'pix'),
        data.get('status', 'confirmado'),
        data.get('observacoes'),
        g.auth['user_id']
    ))
    db.commit()
    
    # Registrar no audit log
    registrar_audit_log('criar', 'assinaturas_pagamentos', cursor.lastrowid, None, {
        'assinatura_id': assinatura_id,
        'valor': data.get('valor_pago'),
        'mes': data.get('mes_referencia')
    })
    
    return jsonify({'message': 'Pagamento registrado com sucesso', 'id': cursor.lastrowid})


@app.route('/api/admin/assinaturas/<int:assinatura_id>/pagamentos/<int:pagamento_id>', methods=['DELETE'])
@require_superadmin
def admin_excluir_pagamento(assinatura_id, pagamento_id):
    """Exclui um registro de pagamento."""
    db = get_db()
    
    db.execute('DELETE FROM assinaturas_pagamentos WHERE id = ? AND assinatura_id = ?',
               (pagamento_id, assinatura_id))
    db.commit()
    
    registrar_audit_log('excluir', 'assinaturas_pagamentos', pagamento_id, None, None)
    
    return jsonify({'message': 'Pagamento excluído'})


@app.route('/api/admin/assinaturas/<int:assinatura_id>/comprovante', methods=['POST'])
@require_superadmin
def admin_upload_comprovante(assinatura_id):
    """Faz upload de comprovante de pagamento."""
    if 'comprovante' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['comprovante']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    pagamento_id = request.form.get('pagamento_id')
    if not pagamento_id:
        return jsonify({'error': 'ID do pagamento não informado'}), 400
    
    db = get_db()
    
    # Verifica se pagamento existe
    pagamento = db.execute(
        'SELECT * FROM assinaturas_pagamentos WHERE id = ? AND assinatura_id = ?',
        (pagamento_id, assinatura_id)
    ).fetchone()
    
    if not pagamento:
        return jsonify({'error': 'Pagamento não encontrado'}), 404
    
    # Criar pasta de comprovantes se não existir
    comprovantes_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'comprovantes')
    os.makedirs(comprovantes_dir, exist_ok=True)
    
    # Criar nome único para o arquivo
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'pdf'
    filename = f"comprovante_{assinatura_id}_{pagamento_id}_{int(datetime.now().timestamp())}.{ext}"
    filepath = os.path.join(comprovantes_dir, filename)
    
    # Salvar arquivo
    file.save(filepath)
    
    # Atualizar no banco
    db.execute(
        'UPDATE assinaturas_pagamentos SET comprovante_path = ? WHERE id = ?',
        (filepath, pagamento_id)
    )
    db.commit()
    
    return jsonify({'message': 'Comprovante salvo com sucesso'})


@app.route('/api/admin/assinaturas/<int:assinatura_id>', methods=['DELETE'])
@require_superadmin
def admin_excluir_assinatura(assinatura_id):
    """Exclui uma assinatura e todos seus pagamentos (hard delete)."""
    db = get_db()
    
    # Verifica se assinatura existe
    assinatura = db.execute(
        'SELECT * FROM assinaturas WHERE id = ?', (assinatura_id,)
    ).fetchone()
    
    if not assinatura:
        return jsonify({'error': 'Assinatura não encontrada'}), 404
    
    # Primeiro exclui todos os pagamentos associados
    db.execute('DELETE FROM assinaturas_pagamentos WHERE assinatura_id = ?', (assinatura_id,))
    
    # Depois exclui a assinatura
    db.execute('DELETE FROM assinaturas WHERE id = ?', (assinatura_id,))
    db.commit()
    
    registrar_audit_log('excluir', 'assinaturas', assinatura_id, None, {
        'workspace_id': assinatura['workspace_id'],
        'plano_id': assinatura['plano_id'],
        'motivo': 'Exclusão definitiva pelo super admin'
    })
    
    return jsonify({'message': 'Assinatura excluída com sucesso'})


@app.route('/api/admin/assinaturas/resumo', methods=['GET'])
@require_superadmin
def admin_resumo_assinaturas():
    """Retorna resumo financeiro das assinaturas."""
    db = get_db()
    
    mes_atual = datetime.now().strftime('%Y-%m')
    
    # Total de assinaturas ativas
    total_ativas = db.execute(
        "SELECT COUNT(*) as count FROM assinaturas WHERE status = 'ativo'"
    ).fetchone()['count']
    
    # Total de pagamentos do mês
    pagamentos_mes = db.execute('''
        SELECT COALESCE(SUM(valor_pago), 0) as total, COUNT(*) as quantidade
        FROM assinaturas_pagamentos
        WHERE mes_referencia = ? AND status = 'confirmado'
    ''', (mes_atual,)).fetchone()
    
    # Assinaturas com pagamento pendente (mês atual)
    assinaturas_pendentes = db.execute('''
        SELECT COUNT(*) as count FROM assinaturas a
        WHERE a.status = 'ativo'
        AND a.id NOT IN (
            SELECT assinatura_id FROM assinaturas_pagamentos 
            WHERE mes_referencia = ? AND status = 'confirmado'
        )
    ''', (mes_atual,)).fetchone()['count']
    
    # MRR (Monthly Recurring Revenue)
    mrr = db.execute('''
        SELECT COALESCE(SUM(valor), 0) as total
        FROM assinaturas
        WHERE status = 'ativo' AND ciclo = 'mensal'
    ''').fetchone()['total']
    
    return jsonify({
        'total_assinaturas_ativas': total_ativas,
        'total_recebido_mes': pagamentos_mes['total'],
        'quantidade_pagamentos_mes': pagamentos_mes['quantidade'],
        'assinaturas_pendentes_mes': assinaturas_pendentes,
        'mrr': mrr,
        'mes_referencia': mes_atual
    })


# ============================================================================
# MONITORAMENTO DATAJUD - ENDPOINTS DE ALERTAS E NOTIFICAÇÕES
# ============================================================================

@app.route('/api/alertas', methods=['GET'])
@require_auth
def listar_alertas():
    """
    📋 Retorna alertas/notificações não lidos do workspace do usuário
    
    QUERY PARAMETERS:
    - lidos: boolean (false=não lidos, true=todos)
    - processo_id: int (filtrar por processo)
    - tipo: string (movimentacao, prazo, etc)
    - limite: int (padrão: 50)
    - offset: int (para paginação)
    
    RESPOSTA:
    {
        "alertas": [...],
        "nao_lidos": int,
        "total": int
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    # Parâmetros
    apenas_nao_lidos = request.args.get('lidos', 'false').lower() == 'false'
    processo_id = request.args.get('processo_id', type=int)
    tipo_alerta = request.args.get('tipo')
    limite = request.args.get('limite', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Query base
    query = '''
        SELECT 
            a.id, a.processo_id, a.tipo, a.titulo, a.mensagem,
            a.lido, a.data_criacao, a.data_leitura,
            p.numero as processo_numero, p.titulo as processo_titulo
        FROM alertas_notificacoes a
        LEFT JOIN processos p ON a.processo_id = p.id
        WHERE a.workspace_id = ?
    '''
    params = [workspace_id]
    
    # Filtros
    if apenas_nao_lidos:
        query += ' AND a.lido = 0'
    
    if processo_id:
        query += ' AND a.processo_id = ?'
        params.append(processo_id)
    
    if tipo_alerta:
        query += ' AND a.tipo = ?'
        params.append(tipo_alerta)
    
    # Somente alertas posteriores a hoje menos 30 dias
    data_limite = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    query += ' AND a.data_criacao > ?'
    params.append(data_limite)
    
    # Ordenação e paginação
    query_count = f"SELECT COUNT(*) as total FROM ({query})"
    query += ' ORDER BY a.data_criacao DESC LIMIT ? OFFSET ?'
    params_count = params.copy()
    params.extend([limite, offset])
    
    try:
        # Total de alertas
        total = db.execute(query_count, params_count).fetchone()['total']
        
        # Alertas com paginação
        alertas = db.execute(query, params).fetchall()
        
        # Contagem de não lidos
        nao_lidos = db.execute(
            'SELECT COUNT(*) as count FROM alertas_notificacoes WHERE workspace_id = ? AND lido = 0',
            (workspace_id,)
        ).fetchone()['count']
        
        return jsonify({
            'sucesso': True,
            'alertas': [dict(a) for a in alertas],
            'nao_lidos': nao_lidos,
            'total': total,
            'pagina': offset // limite + 1,
            'por_pagina': limite
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/alertas/<int:alerta_id>/marcar-como-lido', methods=['POST'])
@require_auth
def marcar_alerta_lido(alerta_id):
    """
    ✅ Marca um alerta como lido
    
    RESPOSTA:
    {
        "sucesso": true,
        "mensagem": "Alerta marcado como lido"
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    try:
        # Verifica se o alerta pertence ao workspace do usuário
        alerta = db.execute(
            'SELECT * FROM alertas_notificacoes WHERE id = ? AND workspace_id = ?',
            (alerta_id, workspace_id)
        ).fetchone()
        
        if not alerta:
            return jsonify({'error': 'Alerta não encontrado'}), 404
        
        # Marca como lido
        db.execute(
            '''UPDATE alertas_notificacoes 
               SET lido = 1, data_leitura = ?
               WHERE id = ?''',
            (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), alerta_id)
        )
        db.commit()
        
        return jsonify({
            'sucesso': True,
            'mensagem': 'Alerta marcado como lido'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/alertas/marcar-todos-lidos', methods=['POST'])
@require_auth
def marcar_todos_alertas_lidos():
    """
    ✅ Marca TODOS os alertas como lidos
    
    RESPOSTA:
    {
        "sucesso": true,
        "alertas_atualizados": int
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    try:
        cursor = db.execute(
            '''UPDATE alertas_notificacoes 
               SET lido = 1, data_leitura = ?
               WHERE workspace_id = ? AND lido = 0''',
            (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), workspace_id)
        )
        db.commit()
        
        return jsonify({
            'sucesso': True,
            'alertas_atualizados': cursor.rowcount
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/alertas/estatisticas', methods=['GET'])
@require_auth
def estatisticas_alertas():
    """
    📊 Retorna estatísticas de alertas do workspace
    
    RESPOSTA:
    {
        "nao_lidos": int,
        "total_hoje": int,
        "total_semana": int,
        "por_tipo": {...},
        "ultimas_24h": int
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    agora = datetime.now()
    hoje = agora.strftime('%Y-%m-%d')
    uma_semana_atras = (agora - timedelta(days=7)).strftime('%Y-%m-%d')
    ultimas_24h = (agora - timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
    
    try:
        # Alertas não lidos
        nao_lidos = db.execute(
            'SELECT COUNT(*) as count FROM alertas_notificacoes WHERE workspace_id = ? AND lido = 0',
            (workspace_id,)
        ).fetchone()['count']
        
        # Alertas hoje
        total_hoje = db.execute(
            'SELECT COUNT(*) as count FROM alertas_notificacoes WHERE workspace_id = ? AND date(data_criacao) = ?',
            (workspace_id, hoje)
        ).fetchone()['count']
        
        # Alertas última semana
        total_semana = db.execute(
            'SELECT COUNT(*) as count FROM alertas_notificacoes WHERE workspace_id = ? AND data_criacao >= ?',
            (workspace_id, uma_semana_atras)
        ).fetchone()['count']
        
        # Alertas últimas 24h
        ultimas_24h = db.execute(
            'SELECT COUNT(*) as count FROM alertas_notificacoes WHERE workspace_id = ? AND data_criacao >= ?',
            (workspace_id, ultimas_24h)
        ).fetchone()['count']
        
        # Por tipo
        por_tipo = {}
        tipos = db.execute(
            'SELECT tipo, COUNT(*) as count FROM alertas_notificacoes WHERE workspace_id = ? GROUP BY tipo',
            (workspace_id,)
        ).fetchall()
        
        for t in tipos:
            por_tipo[t['tipo']] = t['count']
        
        return jsonify({
            'sucesso': True,
            'nao_lidos': nao_lidos,
            'total_hoje': total_hoje,
            'total_semana': total_semana,
            'ultimas_24h': ultimas_24h,
            'por_tipo': por_tipo
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/monitoramento-datajud/status', methods=['GET'])
@require_auth
def status_monitoramento_datajud():
    """
    🤖 Retorna status do último monitoramento Datajud
    
    RESPOSTA:
    {
        "ultima_execucao": datetime,
        "processos_monitorados": int,
        "movimentacoes_encontradas": int,
        "alertas_criados_hoje": int,
        "proximo_agendamento": str
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    
    try:
        # Última execução
        ultima_log = db.execute(
            '''SELECT * FROM datajud_consulta_logs 
               WHERE workspace_id = ? 
               ORDER BY created_at DESC LIMIT 1''',
            (workspace_id,)
        ).fetchone()
        
        # Logs de hoje
        hoje = datetime.now().strftime('%Y-%m-%d')
        logs_hoje = db.execute(
            '''SELECT COUNT(*) as total, SUM(movimentacoes_novas) as novas
               FROM datajud_consulta_logs
               WHERE workspace_id = ? AND date(created_at) = ?''',
            (workspace_id, hoje)
        ).fetchone()
        
        # Próxima execução
        agora = datetime.now()
        proxima = None
        if agora.hour < 8:
            proxima = agora.replace(hour=8, minute=0, second=0)
        elif agora.hour < 17 or (agora.hour == 17 and agora.minute < 30):
            proxima = agora.replace(hour=17, minute=30, second=0)
        else:
            proxima = (agora + timedelta(days=1)).replace(hour=8, minute=0, second=0)
        
        return jsonify({
            'sucesso': True,
            'ultima_execucao': ultima_log['created_at'] if ultima_log else None,
            'processos_monitorados': db.execute(
                'SELECT COUNT(*) as count FROM processo_monitor_config WHERE workspace_id = ? AND monitorar_datajud = 1',
                (workspace_id,)
            ).fetchone()['count'],
            'movimentacoes_encontradas_hoje': logs_hoje['novas'] or 0,
            'consultas_realizadas_hoje': logs_hoje['total'] or 0,
            'proximo_agendamento': proxima.isoformat() if proxima else None
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/monitoramento-datajud/ativar', methods=['POST'])
@require_auth
def ativar_monitoramento_processo():
    """
    ✅ Ativa monitoramento Datajud para um processo
    
    BODY:
    {
        "processo_id": int,
        "frequencia": "diaria" (ou "semanal", "manual")
    }
    
    RESPOSTA:
    {
        "sucesso": true,
        "mensagem": "Monitoramento ativado"
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    data = request.get_json()
    
    processo_id = data.get('processo_id')
    frequencia = data.get('frequencia', 'diaria')
    
    if not processo_id:
        return jsonify({'error': 'processo_id é obrigatório'}), 400
    
    try:
        # Verifica se processo pertence ao workspace
        processo = db.execute(
            'SELECT * FROM processos WHERE id = ? AND workspace_id = ?',
            (processo_id, workspace_id)
        ).fetchone()
        
        if not processo:
            return jsonify({'error': 'Processo não encontrado'}), 404
        
        # Inserir ou atualizar configuração de monitoramento
        db.execute('''
            INSERT INTO processo_monitor_config
            (processo_id, workspace_id, monitorar_datajud, frequencia_verificacao, 
             ultima_verificacao, created_at, updated_at)
            VALUES (?, ?, 1, ?, NULL, ?, ?)
            ON CONFLICT(processo_id) DO UPDATE SET
            monitorar_datajud = 1,
            frequencia_verificacao = excluded.frequencia_verificacao,
            updated_at = excluded.updated_at
        ''', (processo_id, workspace_id, frequencia, 
              datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
              datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        
        db.commit()
        
        return jsonify({
            'sucesso': True,
            'mensagem': f'Monitoramento ativado com frequência {frequencia}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/monitoramento-datajud/desativar', methods=['POST'])
@require_auth
def desativar_monitoramento_processo():
    """
    ❌ Desativa monitoramento Datajud para um processo
    
    BODY:
    {
        "processo_id": int
    }
    """
    db = get_db()
    workspace_id = g.auth['workspace_id']
    data = request.get_json()
    
    processo_id = data.get('processo_id')
    
    if not processo_id:
        return jsonify({'error': 'processo_id é obrigatório'}), 400
    
    try:
        # Desativa monitoramento
        db.execute(
            '''UPDATE processo_monitor_config 
               SET monitorar_datajud = 0, updated_at = ?
               WHERE processo_id = ? AND workspace_id = ?''',
            (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), processo_id, workspace_id)
        )
        db.commit()
        
        return jsonify({
            'sucesso': True,
            'mensagem': 'Monitoramento desativado'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# MONITORAMENTO DATAJUD - EXECUÇÃO MANUAL
# ============================================================================

@app.route('/api/monitoramento-datajud/executar', methods=['POST'])
@require_auth
@require_recurso('pje')
def executar_monitoramento_manual():
    """
    🚀 Executa o monitoramento Datajud manualmente (para testes ou forçar atualização)
    
    Apenas admins podem executar manualmente.
    Executa o worker em background sem bloquear a requisição.
    
    RESPOSTA:
    {
        "sucesso": true,
        "mensagem": "Monitoramento iniciado em background",
        "modo": "background"
    }
    """
    import threading
    
    def run_worker():
        """Executa o worker em uma thread separada"""
        try:
            with app.app_context():
                if DATAJUD_WORKER_DISPONIVEL:
                    resultado = executar_monitoramento_datajud()
                    print(f"[Worker Background] Resultado: {resultado}")
                else:
                    # Fallback para o job integrado
                    monitorar_datajud_job()
        except Exception as e:
            print(f"[Worker Background] Erro: {e}")
    
    # Inicia em background
    thread = threading.Thread(target=run_worker)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'sucesso': True,
        'mensagem': 'Monitoramento Datajud iniciado em background',
        'modo': 'background',
        'aviso': 'O processamento pode levar alguns minutos. Verifique os logs para acompanhar.'
    })


@app.route('/api/monitoramento-datajud/executar-sync', methods=['POST'])
@require_admin
def executar_monitoramento_sync():
    """
    🚀 Executa o monitoramento Datajud sincronamente (aguarda resultado)
    
    ATENÇÃO: Pode demorar vários minutos dependendo da quantidade de processos!
    Recomendado apenas para testes ou quando necessário aguardar o resultado.
    
    RESPOSTA:
    {
        "sucesso": true,
        "resultado": {...}
    }
    """
    try:
        if DATAJUD_WORKER_DISPONIVEL:
            resultado = executar_monitoramento_datajud()
            return jsonify({
                'sucesso': True,
                'resultado': resultado,
                'modo': 'sync'
            })
        else:
            # Usa o job integrado
            monitorar_datajud_job()
            return jsonify({
                'sucesso': True,
                'mensagem': 'Job integrado executado com sucesso',
                'modo': 'sync'
            })
    except Exception as e:
        return jsonify({
            'sucesso': False,
            'erro': str(e)
        }), 500


# ============================================================================
# EMAIL NOTIFICATIONS
# ============================================================================

@app.route('/api/email/status', methods=['GET'])
@require_auth
def email_status():
    """
    Retorna status do serviço de email
    """
    if not EMAIL_SERVICE_DISPONIVEL:
        return jsonify({
            'configurado': False,
            'mensagem': 'Serviço de email não disponível'
        }), 503
    
    return jsonify({
        'configurado': email_service.is_configured(),
        'smtp_host': email_service.smtp_host if email_service.is_configured() else None,
        'smtp_from': email_service.smtp_from if email_service.is_configured() else None
    })

@app.route('/api/email/teste', methods=['POST'])
@require_auth
def email_teste():
    """
    Envia email de teste para o usuário logado
    
    BODY:
    {
        "assunto": "Teste de Email" (opcional)
    }
    """
    if not EMAIL_SERVICE_DISPONIVEL:
        return jsonify({
            'sucesso': False,
            'erro': 'Serviço de email não disponível'
        }), 503
    
    if not email_service.is_configured():
        return jsonify({
            'sucesso': False,
            'erro': 'Serviço de email não configurado. Verifique o .env'
        }), 400
    
    data = request.get_json() or {}
    assunto = data.get('assunto', 'Teste de Email - JurisGestão')
    
    # Pega email do usuário logado
    user_email = g.auth.get('user', {}).get('email')
    if not user_email:
        return jsonify({
            'sucesso': False,
            'erro': 'Usuário não tem email cadastrado'
        }), 400
    
    # Template de teste
    html_content = f'''
    <div style="text-align: center; padding: 40px;">
        <h2 style="color: #667eea;">✅ Teste de Email</h2>
        <p>Olá {g.auth.get('user', {}).get('nome', 'Usuário')}!</p>
        <p>Se você está vendo esta mensagem, o serviço de email está funcionando corretamente.</p>
        <p style="margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 10px;">
            <strong>Configuração:</strong><br>
            Servidor: {email_service.smtp_host}<br>
            Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}
        </p>
    </div>
    '''
    
    resultado = email_service.send_email(user_email, assunto, html_content)
    
    if resultado['success']:
        return jsonify({
            'sucesso': True,
            'mensagem': f'Email de teste enviado para {user_email}'
        })
    else:
        return jsonify({
            'sucesso': False,
            'erro': resultado.get('error', 'Erro ao enviar email')
        }), 500

@app.route('/api/email/notificar-movimentacao', methods=['POST'])
@require_auth
def email_notificar_movimentacao():
    """
    Envia notificação de movimentação por email
    
    BODY:
    {
        "processo_id": 123,
        "numero_processo": "0000001-00.2024.8.26.0100",
        "descricao": "Decisão proferida",
        "data_movimento": "2024-01-15"
    }
    """
    if not EMAIL_SERVICE_DISPONIVEL:
        return jsonify({'sucesso': False, 'erro': 'Serviço não disponível'}), 503
    
    data = request.get_json()
    resultado = notificar_movimentacao_email(
        workspace_id=g.auth['workspace_id'],
        processo_id=data.get('processo_id'),
        numero_processo=data.get('numero_processo'),
        descricao=data.get('descricao'),
        data_movimento=data.get('data_movimento')
    )
    
    return jsonify(resultado)


# ============================================================================
# WHATSAPP INTEGRATION
# ============================================================================

@app.route('/api/whatsapp/conectar', methods=['POST'])
@require_auth
def whatsapp_conectar():
    """
    Inicializa a sessao WhatsApp do usuario autenticado.
    """
    session_key = str(g.auth['user_id'])
    resultado = whatsapp_service.connect_user(session_key) or {}

    if resultado.get('success'):
        return jsonify({
            'sucesso': True,
            'estado': resultado.get('state'),
            'connected': resultado.get('connected', False),
            'sender_scope': 'user',
            'sender_user_id': g.auth['user_id'],
        })

    return jsonify({
        'sucesso': False,
        'erro': resultado.get('error') or resultado.get('erro') or 'Falha ao iniciar sessao WhatsApp.'
    }), 500


@app.route('/api/whatsapp/status', methods=['GET'])
@require_auth
def whatsapp_status():
    """
    Retorna status da conexao com WhatsApp do usuario autenticado.
    """
    session_key = str(g.auth['user_id'])

    status = whatsapp_service.get_connection_status(session_key) or {}
    connected = status.get('connected')
    if connected is None:
        connected = status.get('conectado', False)

    state = status.get('state') or status.get('estado')

    return jsonify({
        'sucesso': True,
        'connected': connected,
        'conectado': connected,
        'state': state,
        'estado': state,
        'configurado': whatsapp_service.is_configured(),
        'provider': whatsapp_service.provider,
        'sender_scope': 'user',
        'sender_user_id': g.auth['user_id'],
    })


@app.route('/api/whatsapp/qrcode', methods=['GET'])
@require_auth
def whatsapp_qrcode():
    """
    Gera QR code para conexao da sessao WhatsApp do usuario autenticado.
    """
    session_key = str(g.auth['user_id'])
    resultado = whatsapp_service.generate_qr_code(session_key) or {}

    if resultado.get('success') or resultado.get('sucesso'):
        if resultado.get('connected') or resultado.get('conectado'):
            return jsonify({
                'sucesso': True,
                'connected': True,
                'mensagem': 'WhatsApp ja conectado para este usuario.',
            })

        return jsonify({
            'sucesso': True,
            'qrcode': resultado.get('qrcode') or resultado.get('base64'),
            'estado': resultado.get('state') or resultado.get('estado'),
            'connected': resultado.get('connected', False),
            'pending': resultado.get('pending', False),
        })

    return jsonify({
        'sucesso': False,
        'erro': resultado.get('error') or resultado.get('erro') or 'Falha ao gerar QR Code.'
    }), 500


@app.route('/api/whatsapp/desconectar', methods=['POST'])
@require_auth
def whatsapp_desconectar():
    """
    Desconecta a sessao WhatsApp do usuario autenticado.
    """
    session_key = str(g.auth['user_id'])
    resultado = whatsapp_service.logout(session_key) or {}

    if resultado.get('success'):
        return jsonify({'sucesso': True})

    return jsonify({'sucesso': False, 'erro': resultado.get('error') or resultado.get('erro') or 'Falha ao desconectar.'}), 500


@app.route('/api/whatsapp/workspace/config', methods=['GET'])
@require_auth
def whatsapp_workspace_config_get():
    """Retorna configuracao do WhatsApp do workspace."""
    db = get_db()
    workspace_id = g.auth['workspace_id']
    config = get_workspace_whatsapp_connection_config(db, workspace_id)
    return jsonify({'sucesso': True, 'config': config})


@app.route('/api/whatsapp/workspace/config', methods=['PUT'])
@require_auth
def whatsapp_workspace_config_update():
    """Atualiza configuracao do WhatsApp do workspace (admin apenas)."""
    if g.auth.get('role') not in ('admin', 'superadmin'):
        return jsonify({'sucesso': False, 'erro': 'Apenas admin pode atualizar o WhatsApp do workspace'}), 403

    data = request.get_json() or {}
    db = get_db()
    workspace_id = g.auth['workspace_id']
    config = get_workspace_whatsapp_connection_config(db, workspace_id)

    display_name = (data.get('display_name') or '').strip()[:120]
    phone_number = (data.get('phone_number') or '').strip()[:32]
    enabled = parse_bool(data.get('enabled', True))

    db.execute(
        '''UPDATE whatsapp_workspace_config
           SET display_name = ?, phone_number = ?, enabled = ?, updated_by = ?, updated_at = ?
           WHERE workspace_id = ?''',
        (
            display_name or None,
            phone_number or None,
            1 if enabled else 0,
            g.auth.get('user_id'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            workspace_id,
        ),
    )
    db.commit()

    config = get_workspace_whatsapp_connection_config(db, workspace_id)
    return jsonify({'sucesso': True, 'config': config})


@app.route('/api/whatsapp/workspace/config', methods=['DELETE'])
@require_auth
def whatsapp_workspace_config_delete():
    """Remove/desativa o WhatsApp do workspace (admin apenas)."""
    if g.auth.get('role') not in ('admin', 'superadmin'):
        return jsonify({'sucesso': False, 'erro': 'Apenas admin pode remover o WhatsApp do workspace'}), 403

    db = get_db()
    workspace_id = g.auth['workspace_id']
    config = get_workspace_whatsapp_connection_config(db, workspace_id)

    db.execute(
        '''UPDATE whatsapp_workspace_config
           SET enabled = 0, updated_by = ?, updated_at = ?
           WHERE workspace_id = ?''',
        (
            g.auth.get('user_id'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            workspace_id,
        ),
    )
    db.commit()

    session_key = config.get('session_key') or f'workspace-{workspace_id}'
    try:
        whatsapp_service.logout(session_key)
    except Exception:
        pass

    return jsonify({'sucesso': True})

@app.route('/api/admin/whatsapp-platform/config', methods=['GET'])
@require_superadmin
def admin_whatsapp_platform_config_get():
    """Retorna configuracao do WhatsApp oficial da plataforma."""
    db = get_db()
    config = ensure_platform_whatsapp_config(db)
    return jsonify({'sucesso': True, 'config': config})


@app.route('/api/admin/whatsapp-platform/config', methods=['PUT'])
@require_superadmin
def admin_whatsapp_platform_config_update():
    """Atualiza configuracao do WhatsApp oficial da plataforma."""
    data = request.get_json() or {}
    db = get_db()
    config = ensure_platform_whatsapp_config(db)

    display_name = (data.get('display_name') or '').strip()[:120]
    phone_number = (data.get('phone_number') or '').strip()[:32]
    enabled = parse_bool(data.get('enabled', True))

    db.execute(
        '''UPDATE whatsapp_platform_config
           SET display_name = ?, phone_number = ?, enabled = ?, updated_by = ?, updated_at = ?
           WHERE id = 1''',
        (
            display_name or None,
            phone_number or None,
            1 if enabled else 0,
            g.auth.get('user_id'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        ),
    )
    db.commit()

    config = ensure_platform_whatsapp_config(db)
    return jsonify({'sucesso': True, 'config': config})


@app.route('/api/admin/whatsapp-platform/status', methods=['GET'])
@require_superadmin
def admin_whatsapp_platform_status():
    """Status da conexao do WhatsApp oficial da plataforma."""
    db = get_db()
    config = ensure_platform_whatsapp_config(db)
    session_key = config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
    status = whatsapp_service.get_connection_status(session_key) or {}
    connected = status.get('connected')
    if connected is None:
        connected = status.get('conectado', False)

    state = status.get('state') or status.get('estado')

    return jsonify({
        'sucesso': True,
        'connected': connected,
        'state': state,
        'config': config,
        'configurado': whatsapp_service.is_configured(),
        'provider': whatsapp_service.provider,
    })


@app.route('/api/admin/whatsapp-platform/connect', methods=['POST'])
@require_superadmin
def admin_whatsapp_platform_connect():
    """Conecta o WhatsApp oficial da plataforma."""
    db = get_db()
    config = ensure_platform_whatsapp_config(db)
    if not config.get('enabled'):
        return jsonify({'sucesso': False, 'erro': 'WhatsApp da plataforma desativado'}), 400

    session_key = config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
    resultado = whatsapp_service.connect_user(session_key) or {}

    if resultado.get('success'):
        return jsonify({
            'sucesso': True,
            'estado': resultado.get('state'),
            'connected': resultado.get('connected', False),
        })

    return jsonify({'sucesso': False, 'erro': resultado.get('error') or resultado.get('erro') or 'Falha ao conectar.'}), 500


@app.route('/api/admin/whatsapp-platform/qrcode', methods=['GET'])
@require_superadmin
def admin_whatsapp_platform_qrcode():
    """Gera QR code do WhatsApp oficial da plataforma."""
    db = get_db()
    config = ensure_platform_whatsapp_config(db)
    if not config.get('enabled'):
        return jsonify({'sucesso': False, 'erro': 'WhatsApp da plataforma desativado'}), 400

    session_key = config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
    resultado = whatsapp_service.generate_qr_code(session_key) or {}

    if resultado.get('success') or resultado.get('sucesso'):
        if resultado.get('connected') or resultado.get('conectado'):
            return jsonify({
                'sucesso': True,
                'connected': True,
                'mensagem': 'WhatsApp da plataforma ja conectado.',
            })

        return jsonify({
            'sucesso': True,
            'qrcode': resultado.get('qrcode') or resultado.get('base64'),
            'estado': resultado.get('state') or resultado.get('estado'),
            'connected': resultado.get('connected', False),
            'pending': resultado.get('pending', False),
        })

    return jsonify({'sucesso': False, 'erro': resultado.get('error') or resultado.get('erro') or 'Falha ao gerar QR Code.'}), 500


@app.route('/api/admin/whatsapp-platform/disconnect', methods=['POST'])
@require_superadmin
def admin_whatsapp_platform_disconnect():
    """Desconecta o WhatsApp oficial da plataforma."""
    db = get_db()
    config = ensure_platform_whatsapp_config(db)
    session_key = config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
    resultado = whatsapp_service.logout(session_key) or {}

    if resultado.get('success'):
        return jsonify({'sucesso': True})

    return jsonify({'sucesso': False, 'erro': resultado.get('error') or resultado.get('erro') or 'Falha ao desconectar.'}), 500

@app.route('/api/whatsapp/enviar', methods=['POST'])
@require_auth
def whatsapp_enviar():
    """
    Envia mensagem WhatsApp

    BODY:
    {
        "telefone": "11999999999",
        "mensagem": "Olá, tudo bem?",
        "tipo": "texto"  // ou "documento"
    }
    """
    data = request.get_json() or {}

    if not whatsapp_service.is_configured():
        return jsonify({
            'sucesso': False,
            'erro': 'Serviço WhatsApp não configurado. Configure as variáveis de ambiente.'
        }), 503

    telefone = data.get('telefone')
    mensagem = data.get('mensagem')
    tipo = data.get('tipo', 'texto')

    if not telefone or not mensagem:
        return jsonify({
            'sucesso': False,
            'erro': 'Telefone e mensagem são obrigatórios'
        }), 400

    if tipo != 'texto':
        return jsonify({
            'sucesso': False,
            'erro': 'Tipo de mensagem não suportado'
        }), 400

    db = get_db()
    workspace_id = g.auth['workspace_id']

    cliente = find_workspace_client_by_phone(db, workspace_id, telefone)
    if not cliente:
        return jsonify({'sucesso': False, 'erro': 'Telefone nao vinculado a cliente do workspace'}), 400

    resultado = send_workspace_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        phone=telefone,
        message=mensagem,
        client_id=cliente.get('id'),
        sender_user_id=g.auth['user_id'],
    )

    if resultado.get('success'):
        return jsonify({
            'sucesso': True,
            'message_id': resultado.get('message_id'),
            'timestamp': resultado.get('timestamp'),
            'modo': resultado.get('modo', 'api'),
        })

    erro = resultado.get('error', 'Erro desconhecido')
    return jsonify({'sucesso': False, 'erro': erro, 'url_wame': resultado.get('url_wame')}), 500

@app.route('/api/processos/<int:id>/whatsapp/enviar', methods=['POST'])
@require_auth
def enviar_whatsapp_processo(id):
    """
    Envia mensagem WhatsApp para o cliente do processo

    BODY:
    {
        "mensagem": "Mensagem personalizada (opcional)"
    }
    """
    if not whatsapp_service.is_configured():
        return jsonify({
            'sucesso': False,
            'erro': 'Serviço WhatsApp não configurado'
        }), 503

    db = get_db()
    workspace_id = g.auth['workspace_id']

    # Busca processo com dados do cliente
    processo = db.execute(
        '''SELECT p.*, c.id as cliente_id, c.nome as cliente_nome, c.telefone as cliente_telefone
           FROM processos p
           JOIN clientes c ON p.cliente_id = c.id
           WHERE p.id = ? AND p.workspace_id = ?''',
        (id, workspace_id)
    ).fetchone()

    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404

    data = request.get_json() or {}
    mensagem_personalizada = data.get('mensagem')
    destino = (data.get('destino') or 'cliente').lower()

    if destino == 'equipe':
        platform_config = ensure_platform_whatsapp_config(db)
        if not platform_config.get('enabled'):
            return jsonify({'sucesso': False, 'erro': 'WhatsApp da plataforma desativado'}), 400

    # Se nao tiver mensagem personalizada, monta mensagem padrao
    if not mensagem_personalizada:
        if destino == 'cliente':
            # Gera ou busca link público
            if not processo['public_token'] or not processo['public_link_enabled']:
                token = gerar_token_publico()
                db.execute(
                    '''UPDATE processos
                       SET public_token = ?, public_link_enabled = 1
                       WHERE id = ?''',
                    (token, id)
                )
                db.commit()
            else:
                token = processo['public_token']

            base_url = request.host_url.rstrip('/')
            link_publico = f"{base_url}/publico/processo/{token}"
            mensagem_personalizada = (
                f"Ola, *{processo['cliente_nome']}*!\n\n"
                f"Seu processo *{processo['titulo']}* esta disponivel para acompanhamento.\n\n"
                f"*Link de acesso:*\n{link_publico}\n\n"
                "Voce pode acessar para ver andamentos, prazos e documentos.\n\n"
                "Em caso de duvidas, entre em contato conosco."
            )
        else:
            mensagem_personalizada = formatar_mensagem_processo(dict(processo))

    # envio para telefone avulso (somente se vinculado a cliente)
    if destino == 'telefone':
        telefone_destino = (data.get('telefone') or '').strip()
        if not telefone_destino:
            return jsonify({
                'sucesso': False,
                'erro': 'Informe o telefone quando o destino for "telefone"'
            }), 400

        cliente = find_workspace_client_by_phone(db, workspace_id, telefone_destino)
        if not cliente:
            return jsonify({'sucesso': False, 'erro': 'Telefone nao vinculado a cliente do workspace'}), 400

        resultado = send_workspace_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            phone=telefone_destino,
            message=mensagem_personalizada,
            client_id=cliente.get('id'),
            sender_user_id=g.auth['user_id'],
        )
        if resultado.get('success'):
            return jsonify({'sucesso': True, 'message_id': resultado.get('message_id')})
        return jsonify({'sucesso': False, 'erro': resultado.get('error'), 'url_wame': resultado.get('url_wame')}), 500

    # envio para equipe do workspace (via WhatsApp da plataforma)
    if destino == 'equipe':
        integrantes = listar_usuarios_workspace_com_telefone(
            db=db,
            workspace_id=workspace_id,
            somente_alerta_whatsapp=parse_bool(data.get('somente_alerta_whatsapp', False)),
        )
        if not integrantes:
            return jsonify({'sucesso': False, 'erro': 'Nenhum integrante com telefone cadastrado'}), 400

        relatorio = dispatch_platform_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            message=mensagem_personalizada,
            recipients=integrantes,
        )
        return jsonify({'sucesso': relatorio['enviados'] > 0, **relatorio})

    # destino padrao: cliente
    if not processo['cliente_telefone']:
        return jsonify({'sucesso': False, 'erro': 'Cliente nao possui telefone cadastrado'}), 400

    resultado = send_workspace_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        phone=processo['cliente_telefone'],
        message=mensagem_personalizada,
        client_id=processo.get('cliente_id'),
        sender_user_id=g.auth['user_id'],
    )
    if resultado.get('success'):
        return jsonify({'sucesso': True, 'message_id': resultado.get('message_id')})
    return jsonify({'sucesso': False, 'erro': resultado.get('error'), 'url_wame': resultado.get('url_wame')}), 500

@app.route('/api/tarefas/<int:id>/whatsapp/enviar', methods=['POST'])
@require_auth
@require_recurso('whatsapp')
def enviar_whatsapp_tarefa(id):
    """
    Compartilha tarefa via WhatsApp.
    BODY:
    {
        "mensagem": "opcional",
        "destino": "responsavel|equipe|telefone",
        "telefone": "obrigatorio se destino=telefone",
        "somente_alerta_whatsapp": false
    }
    """
    if not whatsapp_service.is_configured():
        return jsonify({'sucesso': False, 'erro': 'Serviço WhatsApp não configurado'}), 503

    data = request.get_json() or {}
    destino = (data.get('destino') or 'responsavel').lower()
    db = get_db()
    workspace_id = g.auth['workspace_id']

    tarefa = db.execute(
        '''SELECT t.*, p.numero as processo_numero, p.titulo as processo_titulo,
                  u.id as responsavel_id, u.nome as responsavel_nome, u.telefone as responsavel_telefone
           FROM tarefas t
           LEFT JOIN processos p ON p.id = t.processo_id
           LEFT JOIN users u ON u.id = t.assigned_to
           WHERE t.id = ? AND t.workspace_id = ?''',
        (id, workspace_id)
    ).fetchone()

    if not tarefa:
        return jsonify({'sucesso': False, 'erro': 'Tarefa não encontrada'}), 404

    tarefa_dict = dict(tarefa)
    mensagem = data.get('mensagem') or formatar_mensagem_tarefa(tarefa_dict)

    if destino == 'telefone':
        telefone = (data.get('telefone') or '').strip()
        if not telefone:
            return jsonify({'sucesso': False, 'erro': 'Telefone obrigatorio para destino=telefone'}), 400

        cliente = find_workspace_client_by_phone(db, workspace_id, telefone)
        if not cliente:
            return jsonify({'sucesso': False, 'erro': 'Telefone nao vinculado a cliente do workspace'}), 400

        resultado = send_workspace_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            phone=telefone,
            message=mensagem,
            client_id=cliente.get('id'),
            sender_user_id=g.auth['user_id'],
        )
        if resultado.get('success'):
            return jsonify({'sucesso': True, 'message_id': resultado.get('message_id')})
        return jsonify({'sucesso': False, 'erro': resultado.get('error'), 'url_wame': resultado.get('url_wame')}), 500

    if destino == 'equipe':
        integrantes = listar_usuarios_workspace_com_telefone(
            db=db,
            workspace_id=workspace_id,
            somente_alerta_whatsapp=parse_bool(data.get('somente_alerta_whatsapp', False)),
        )
        if not integrantes:
            return jsonify({'sucesso': False, 'erro': 'Nenhum integrante com telefone cadastrado'}), 400

        relatorio = dispatch_platform_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            message=mensagem,
            recipients=integrantes,
        )
        return jsonify({'sucesso': relatorio['enviados'] > 0, **relatorio})

    # destino padrao: responsavel
    telefone_responsavel = tarefa_dict.get('responsavel_telefone')
    if not telefone_responsavel:
        return jsonify({'sucesso': False, 'erro': 'Responsavel sem telefone cadastrado'}), 400

    recipient = [{
        'id': tarefa_dict.get('responsavel_id'),
        'nome': tarefa_dict.get('responsavel_nome'),
        'telefone': telefone_responsavel,
    }]
    relatorio = dispatch_platform_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        message=mensagem,
        recipients=recipient,
    )
    return jsonify({'sucesso': relatorio['enviados'] > 0, **relatorio})

@app.route('/api/processos/<int:id>/movimentacoes/<int:movimentacao_id>/whatsapp/enviar', methods=['POST'])
@require_auth
@require_recurso('whatsapp')
def enviar_whatsapp_movimentacao(id, movimentacao_id):
    """
    Compartilha movimentacao de processo via WhatsApp.
    BODY:
    {
        "mensagem": "opcional",
        "destino": "cliente|equipe|telefone",
        "telefone": "obrigatorio se destino=telefone",
        "somente_alerta_whatsapp": false
    }
    """
    if not whatsapp_service.is_configured():
        return jsonify({'sucesso': False, 'erro': 'Serviço WhatsApp não configurado'}), 503

    data = request.get_json() or {}
    destino = (data.get('destino') or 'cliente').lower()
    db = get_db()
    workspace_id = g.auth['workspace_id']

    processo = db.execute(
        '''SELECT p.*, c.id as cliente_id, c.nome as cliente_nome, c.telefone as cliente_telefone
           FROM processos p
           LEFT JOIN clientes c ON c.id = p.cliente_id
           WHERE p.id = ? AND p.workspace_id = ?''',
        (id, workspace_id)
    ).fetchone()
    if not processo:
        return jsonify({'sucesso': False, 'erro': 'Processo não encontrado'}), 404

    movimentacao = db.execute(
        '''SELECT *
           FROM movimentacoes_processo
           WHERE id = ? AND processo_id = ? AND workspace_id = ?''',
        (movimentacao_id, id, workspace_id)
    ).fetchone()
    if not movimentacao:
        return jsonify({'sucesso': False, 'erro': 'Movimentacao nao encontrada'}), 404

    processo_dict = dict(processo)
    movimentacao_dict = dict(movimentacao)
    mensagem = data.get('mensagem') or formatar_mensagem_movimentacao(processo_dict, movimentacao_dict)

    if destino == 'telefone':
        telefone = (data.get('telefone') or '').strip()
        if not telefone:
            return jsonify({'sucesso': False, 'erro': 'Telefone obrigatorio para destino=telefone'}), 400

        cliente = find_workspace_client_by_phone(db, workspace_id, telefone)
        if not cliente:
            return jsonify({'sucesso': False, 'erro': 'Telefone nao vinculado a cliente do workspace'}), 400

        resultado = send_workspace_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            phone=telefone,
            message=mensagem,
            client_id=cliente.get('id'),
            sender_user_id=g.auth['user_id'],
        )
        if resultado.get('success'):
            return jsonify({'sucesso': True, 'message_id': resultado.get('message_id')})
        return jsonify({'sucesso': False, 'erro': resultado.get('error'), 'url_wame': resultado.get('url_wame')}), 500

    if destino == 'equipe':
        integrantes = listar_usuarios_workspace_com_telefone(
            db=db,
            workspace_id=workspace_id,
            somente_alerta_whatsapp=parse_bool(data.get('somente_alerta_whatsapp', False)),
        )
        if not integrantes:
            return jsonify({'sucesso': False, 'erro': 'Nenhum integrante com telefone cadastrado'}), 400

        relatorio = dispatch_platform_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            message=mensagem,
            recipients=integrantes,
        )
        return jsonify({'sucesso': relatorio['enviados'] > 0, **relatorio})

    # destino padrao: cliente
    if not processo_dict.get('cliente_telefone'):
        return jsonify({'sucesso': False, 'erro': 'Cliente nao possui telefone cadastrado'}), 400

    resultado = send_workspace_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        phone=processo_dict.get('cliente_telefone'),
        message=mensagem,
        client_id=processo_dict.get('cliente_id'),
        sender_user_id=g.auth['user_id'],
    )
    if resultado.get('success'):
        return jsonify({'sucesso': True, 'message_id': resultado.get('message_id')})
    return jsonify({'sucesso': False, 'erro': resultado.get('error'), 'url_wame': resultado.get('url_wame')}), 500

@app.route('/api/processos/<int:id>/movimentacoes/<int:movimentacao_id>/whatsapp', methods=['GET'])
@require_auth
@require_recurso('whatsapp')
def preparar_whatsapp_movimentacao(id, movimentacao_id):
    """
    Prepara dados de compartilhamento de movimentacao via WhatsApp.
    """
    db = get_db()
    processo = db.execute(
        '''SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone
           FROM processos p
           LEFT JOIN clientes c ON c.id = p.cliente_id
           WHERE p.id = ? AND p.workspace_id = ?''',
        (id, g.auth['workspace_id'])
    ).fetchone()
    if not processo:
        return jsonify({'error': 'Processo não encontrado'}), 404

    movimentacao = db.execute(
        '''SELECT *
           FROM movimentacoes_processo
           WHERE id = ? AND processo_id = ? AND workspace_id = ?''',
        (movimentacao_id, id, g.auth['workspace_id'])
    ).fetchone()
    if not movimentacao:
        return jsonify({'error': 'Movimentação não encontrada'}), 404

    processo_dict = dict(processo)
    movimentacao_dict = dict(movimentacao)
    mensagem = formatar_mensagem_movimentacao(processo_dict, movimentacao_dict)
    link = None
    if processo_dict.get('cliente_telefone'):
        link = gerar_link_whatsapp(processo_dict['cliente_telefone'], mensagem)

    return jsonify({
        'mensagem': mensagem,
        'movimentacao': movimentacao_dict,
        'cliente': {
            'nome': processo_dict.get('cliente_nome'),
            'telefone': processo_dict.get('cliente_telefone'),
        },
        'link': link,
    })


@app.route('/api/processos/<int:id>/movimentacoes/ultima/whatsapp/enviar', methods=['POST'])
@require_auth
@require_recurso('whatsapp')
def enviar_whatsapp_ultima_movimentacao(id):
    """
    Compartilha a ultima movimentacao do processo via WhatsApp.
    """
    db = get_db()
    mov = db.execute(
        '''SELECT id
           FROM movimentacoes_processo
           WHERE processo_id = ? AND workspace_id = ?
           ORDER BY data_movimento DESC
           LIMIT 1''',
        (id, g.auth['workspace_id'])
    ).fetchone()

    if not mov:
        return jsonify({'sucesso': False, 'erro': 'Processo sem movimentacoes registradas'}), 404

    return enviar_whatsapp_movimentacao(id, mov['id'])


@app.route('/api/whatsapp/workspace/contatos', methods=['GET'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_workspace_contatos():
    """
    Lista integrantes do workspace com telefone cadastrado para envio via WhatsApp.
    """
    db = get_db()
    somente_alerta = request.args.get('somente_alerta_whatsapp', 'false').lower() == 'true'
    contatos = listar_usuarios_workspace_com_telefone(
        db=db,
        workspace_id=g.auth['workspace_id'],
        somente_alerta_whatsapp=somente_alerta,
    )
    return jsonify({
        'sucesso': True,
        'total': len(contatos),
        'contatos': contatos,
    })


@app.route('/api/whatsapp/workspace/enviar', methods=['POST'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_workspace_enviar():
    """
    Envia mensagem para integrantes do workspace usando o WhatsApp da plataforma.
    BODY:
    {
        "mensagem": "obrigatorio",
        "user_ids": [1,2,3],         # opcional
        "somente_alerta_whatsapp": false
    }
    """
    if not whatsapp_service.is_configured():
        return jsonify({'sucesso': False, 'erro': 'Serviço WhatsApp não configurado'}), 503

    data = request.get_json() or {}
    mensagem = (data.get('mensagem') or '').strip()
    if not mensagem:
        return jsonify({'sucesso': False, 'erro': 'Campo mensagem é obrigatório'}), 400

    user_ids_raw = data.get('user_ids') or []
    user_ids: List[int] = []
    for value in user_ids_raw:
        try:
            user_ids.append(int(value))
        except (TypeError, ValueError):
            return jsonify({'sucesso': False, 'erro': f'user_id inválido: {value}'}), 400

    db = get_db()
    workspace_id = g.auth['workspace_id']
    platform_config = ensure_platform_whatsapp_config(db)
    if not platform_config.get('enabled'):
        return jsonify({'sucesso': False, 'erro': 'WhatsApp da plataforma desativado'}), 400

    contatos = listar_usuarios_workspace_com_telefone(
        db=db,
        workspace_id=workspace_id,
        user_ids=user_ids if user_ids else None,
        somente_alerta_whatsapp=parse_bool(data.get('somente_alerta_whatsapp', False)),
    )
    if not contatos:
        return jsonify({'sucesso': False, 'erro': 'Nenhum destinatario com telefone cadastrado'}), 400

    relatorio = dispatch_platform_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        message=mensagem,
        recipients=contatos,
    )

    return jsonify({'sucesso': relatorio['enviados'] > 0, **relatorio})

@app.route('/api/whatsapp/automacoes/config', methods=['GET'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_automacoes_config_get():
    """Retorna configuração de automações WhatsApp do workspace."""
    db = get_db()
    workspace_id = g.auth['workspace_id']
    config = get_workspace_whatsapp_config(db, workspace_id)

    platform_config = ensure_platform_whatsapp_config(db)
    platform_status = None
    if whatsapp_service.is_configured():
        try:
            platform_status = whatsapp_service.get_connection_status(
                platform_config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
            )
        except Exception:
            platform_status = None

    usuarios = db.execute(
        '''SELECT id, nome, email, role, telefone, alerta_whatsapp
           FROM users
           WHERE workspace_id = ?
           ORDER BY nome ASC''',
        (workspace_id,),
    ).fetchall()

    return jsonify({
        'sucesso': True,
        'is_admin': g.auth.get('role') in ('admin', 'superadmin'),
        'config': {
            'sender_user_id': config.get('sender_user_id'),
            'auto_nova_movimentacao': config.get('auto_nova_movimentacao'),
            'auto_novo_prazo': config.get('auto_novo_prazo'),
            'auto_lembrete_prazo': config.get('auto_lembrete_prazo'),
            'auto_nova_tarefa': config.get('auto_nova_tarefa'),
            'reminder_days': config.get('reminder_days'),
            'daily_summary_time': config.get('daily_summary_time'),
            'auto_resumo_diario': config.get('auto_resumo_diario'),
            'ai_generate_messages': config.get('ai_generate_messages'),
            'ai_prompt': config.get('ai_prompt') or '',
        },
        'usuarios': [dict(u) for u in usuarios],
        'sender_status': platform_status,
        'sender_scope': 'platform',
        'platform_enabled': platform_config.get('enabled', True),
    })

@app.route('/api/whatsapp/automacoes/config', methods=['PUT'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_automacoes_config_update():
    """Atualiza configuração de automações WhatsApp do workspace (apenas admin)."""
    if g.auth.get('role') not in ('admin', 'superadmin'):
        return jsonify({'sucesso': False, 'erro': 'Apenas admin pode alterar automações do workspace'}), 403

    db = get_db()
    workspace_id = g.auth['workspace_id']
    data = request.get_json() or {}
    current_config = get_workspace_whatsapp_config(db, workspace_id)

    sender_user_id = data.get('sender_user_id')
    if sender_user_id in ('', None):
        sender_user_id = None
    else:
        try:
            sender_user_id = int(sender_user_id)
        except (TypeError, ValueError):
            return jsonify({'sucesso': False, 'erro': 'sender_user_id inválido'}), 400

        user_ok = db.execute(
            'SELECT id FROM users WHERE id = ? AND workspace_id = ?',
            (sender_user_id, workspace_id),
        ).fetchone()
        if not user_ok:
            return jsonify({'sucesso': False, 'erro': 'Usuário remetente não pertence ao workspace'}), 400

    reminder_days = ','.join(
        str(d) for d in parse_reminder_days(data.get('reminder_days', current_config.get('reminder_days')))
    )
    daily_summary_time = normalize_hhmm(data.get('daily_summary_time', current_config.get('daily_summary_time')))

    db.execute(
        '''INSERT INTO workspace_whatsapp_config
           (workspace_id, sender_user_id, auto_nova_movimentacao, auto_novo_prazo,
            auto_lembrete_prazo, auto_nova_tarefa, reminder_days, auto_resumo_diario,
            daily_summary_time, ai_generate_messages, ai_prompt, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(workspace_id) DO UPDATE SET
             sender_user_id = excluded.sender_user_id,
             auto_nova_movimentacao = excluded.auto_nova_movimentacao,
             auto_novo_prazo = excluded.auto_novo_prazo,
             auto_lembrete_prazo = excluded.auto_lembrete_prazo,
             auto_nova_tarefa = excluded.auto_nova_tarefa,
             reminder_days = excluded.reminder_days,
             auto_resumo_diario = excluded.auto_resumo_diario,
             daily_summary_time = excluded.daily_summary_time,
             ai_generate_messages = excluded.ai_generate_messages,
             ai_prompt = excluded.ai_prompt,
             updated_by = excluded.updated_by,
             updated_at = excluded.updated_at''',
        (
            workspace_id,
            sender_user_id,
            1 if parse_bool(data.get('auto_nova_movimentacao', current_config.get('auto_nova_movimentacao', True))) else 0,
            1 if parse_bool(data.get('auto_novo_prazo', current_config.get('auto_novo_prazo', True))) else 0,
            1 if parse_bool(data.get('auto_lembrete_prazo', current_config.get('auto_lembrete_prazo', True))) else 0,
            1 if parse_bool(data.get('auto_nova_tarefa', current_config.get('auto_nova_tarefa', True))) else 0,
            reminder_days,
            1 if parse_bool(data.get('auto_resumo_diario', current_config.get('auto_resumo_diario', False))) else 0,
            daily_summary_time,
            1 if parse_bool(data.get('ai_generate_messages', current_config.get('ai_generate_messages', False))) else 0,
            (data.get('ai_prompt', current_config.get('ai_prompt') or '') or '').strip()[:800],
            g.auth['user_id'],
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        ),
    )
    db.commit()

    config = get_workspace_whatsapp_config(db, workspace_id)
    return jsonify({'sucesso': True, 'config': config})


@app.route('/api/whatsapp/automacoes/teste-resumo', methods=['POST'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_automacoes_teste_resumo():
    """Envia resumo diário de teste para o workspace."""
    if g.auth.get('role') not in ('admin', 'superadmin'):
        return jsonify({'sucesso': False, 'erro': 'Apenas admin pode enviar resumo de teste'}), 403

    workspace_id = g.auth['workspace_id']
    report = send_workspace_daily_summary(workspace_id=workspace_id, force=True)
    return jsonify({'sucesso': report.get('success', False), **report})


@app.route('/api/whatsapp/automacoes/preview-ia', methods=['POST'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_automacoes_preview_ia():
    """Gera sugestão de mensagem com IA para WhatsApp."""
    data = request.get_json() or {}
    objetivo = (data.get('objetivo') or 'Gerar mensagem profissional para WhatsApp').strip()
    mensagem_base = (data.get('mensagem_base') or '').strip()
    contexto = (data.get('contexto') or '').strip()

    if not mensagem_base and not contexto:
        return jsonify({'sucesso': False, 'erro': 'Informe mensagem_base ou contexto'}), 400

    base = mensagem_base or f"Contexto: {contexto}"
    suggested = maybe_generate_whatsapp_message_with_ai(
        base_message=base,
        objective=objetivo,
        ai_prompt=(data.get('ai_prompt') or '').strip(),
    )

    return jsonify({
        'sucesso': True,
        'mensagem': suggested,
        'ia_disponivel': bool(openai_client),
    })

@app.route('/api/clientes/<int:id>/whatsapp/boasvindas', methods=['POST'])
@require_auth
def enviar_boas_vindas_cliente(id):
    """
    Envia mensagem de boas-vindas para o cliente
    """
    if not whatsapp_service.is_configured():
        return jsonify({
            'sucesso': False,
            'erro': 'Serviço WhatsApp não configurado'
        }), 503

    db = get_db()
    workspace_id = g.auth['workspace_id']

    cliente = db.execute(
        'SELECT id, nome, telefone FROM clientes WHERE id = ? AND workspace_id = ?',
        (id, workspace_id)
    ).fetchone()

    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404

    if not cliente['telefone']:
        return jsonify({
            'sucesso': False,
            'erro': 'Cliente não possui telefone cadastrado'
        }), 400

    mensagem = (
        f"Ola, *{cliente['nome']}*!\n\n"
        "Seja bem-vindo ao *JurisPocket*!\n\n"
        "Seu cadastro foi realizado com sucesso. Agora voce recebera atualizacoes sobre seus processos por aqui.\n\n"
        "Em caso de duvidas, entre em contato conosco."
    )

    resultado = send_workspace_whatsapp_message(
        db=db,
        workspace_id=workspace_id,
        phone=cliente['telefone'],
        message=mensagem,
        client_id=cliente['id'],
        sender_user_id=g.auth['user_id'],
    )

    sucesso = bool(resultado.get('success'))
    return jsonify({
        'sucesso': sucesso,
        'mensagem': 'Mensagem de boas-vindas enviada' if sucesso else (resultado.get('error') or 'Erro ao enviar')
    })

@app.route('/api/clientes/<int:id>/whatsapp/mensagens', methods=['GET'])
@require_auth
def listar_mensagens_whatsapp_cliente(id):
    """Lista historico de mensagens WhatsApp de um cliente (workspace)."""
    db = get_db()
    workspace_id = g.auth['workspace_id']

    cliente = db.execute(
        'SELECT id FROM clientes WHERE id = ? AND workspace_id = ?',
        (id, workspace_id),
    ).fetchone()
    if not cliente:
        return jsonify({'sucesso': False, 'erro': 'Cliente nao encontrado'}), 404

    try:
        limit = int(request.args.get('limit', 50))
    except (TypeError, ValueError):
        limit = 50
    limit = max(1, min(limit, 200))

    rows = db.execute(
        '''SELECT id, direction, sender_phone, recipient_phone, message_text, status, created_at
           FROM whatsapp_message_log
           WHERE workspace_id = ? AND client_id = ? AND channel = 'workspace'
           ORDER BY id DESC
           LIMIT ?''',
        (workspace_id, id, limit),
    ).fetchall()

    return jsonify({'sucesso': True, 'mensagens': [dict(r) for r in rows]})


@app.route('/api/whatsapp/debug', methods=['GET'])
@require_auth
@require_recurso('whatsapp')
def whatsapp_debug():
    """Endpoint de debug para verificar envios e configuracoes WhatsApp."""
    if g.auth.get('role') not in ('admin', 'superadmin'):
        return jsonify({'sucesso': False, 'erro': 'Apenas admin pode acessar debug'}), 403

    db = get_db()
    workspace_id = g.auth['workspace_id']

    platform_config = ensure_platform_whatsapp_config(db)
    workspace_config = get_workspace_whatsapp_connection_config(db, workspace_id)
    automacao_config = get_workspace_whatsapp_config(db, workspace_id)

    platform_status = None
    if whatsapp_service.is_configured():
        try:
            platform_status = whatsapp_service.get_connection_status(
                platform_config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY
            )
        except Exception as error:
            platform_status = {'error': str(error)}

    recipients = list_workspace_whatsapp_recipients(db, workspace_id)

    logs = db.execute(
        '''SELECT id, channel, direction, sender_key, sender_phone, recipient_phone,
                  message_text, status, created_at
           FROM whatsapp_message_log
           WHERE workspace_id = ?
           ORDER BY id DESC
           LIMIT 30''',
        (workspace_id,),
    ).fetchall()

    automacao_logs = db.execute(
        '''SELECT id, tipo, entity_type, entity_id, marker, created_at
           FROM whatsapp_automacao_logs
           WHERE workspace_id = ?
           ORDER BY id DESC
           LIMIT 20''',
        (workspace_id,),
    ).fetchall()

    raw_workspace_config = db.execute(
        'SELECT * FROM workspace_whatsapp_config WHERE workspace_id = ?',
        (workspace_id,),
    ).fetchone()

    return jsonify({
        'sucesso': True,
        'workspace_id': workspace_id,
        'platform_config': platform_config,
        'platform_status': platform_status,
        'workspace_config': workspace_config,
        'workspace_config_row': dict(raw_workspace_config) if raw_workspace_config else None,
        'automacao_config': automacao_config,
        'recipients': recipients,
        'logs': [dict(r) for r in logs],
        'automacao_logs': [dict(r) for r in automacao_logs],
    })

@app.route('/api/internal/whatsapp/inbound', methods=['POST'])
def whatsapp_inbound_webhook():
    """
    Recebe mensagens de entrada do microservico WhatsApp Web.
    Endpoint interno (webhook) para listener de mensagens.
    """
    webhook_secret = os.environ.get('WHATSAPP_INBOUND_WEBHOOK_SECRET', '')
    header_signature = request.headers.get('x-jurispocket-signature', '')

    if webhook_secret:
        raw_body = request.get_data(as_text=True) or ''
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            raw_body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(header_signature, expected_signature):
            return jsonify({'sucesso': False, 'erro': 'Assinatura invalida'}), 401

    payload = request.get_json(silent=True) or {}
    event = payload.get('event')
    session_key = str(payload.get('userId') or '').strip()
    from_jid = payload.get('from')
    text = payload.get('text')

    if event != 'whatsapp.message.received' or not session_key:
        return jsonify({'sucesso': True})

    from_phone = ''
    if from_jid:
        from_phone = normalize_phone_digits(str(from_jid).split('@')[0])

    print(f"Webhook WhatsApp recebido: event={event} session={session_key} from={from_jid} text={text}")

    db = get_db()
    platform_config = ensure_platform_whatsapp_config(db)
    platform_key = platform_config.get('session_key') or PLATFORM_WHATSAPP_SESSION_KEY

    # Mensagens recebidas pela plataforma nao devem ser encaminhadas a clientes
    if session_key == platform_key:
        try:
            log_whatsapp_message(
                db=db,
                workspace_id=None,
                client_id=None,
                user_id=None,
                channel='platform',
                direction='inbound',
                sender_key=session_key,
                sender_phone=from_phone,
                message_text=text or '',
                status='received',
                commit=True,
            )
        except Exception as error:
            print(f"Erro ao registrar log inbound plataforma: {error}")
        return jsonify({'sucesso': True})

    workspace_id = None
    session_user_id = None
    if session_key.startswith('workspace-') or session_key.startswith('workspace:'):
        try:
            if session_key.startswith('workspace-'):
                workspace_id = int(session_key.split('-', 1)[1])
            else:
                workspace_id = int(session_key.split(':', 1)[1])
        except (TypeError, ValueError):
            workspace_id = None

    if not workspace_id:
        row = db.execute(
            'SELECT workspace_id FROM whatsapp_workspace_config WHERE session_key = ? LIMIT 1',
            (session_key,),
        ).fetchone()
        if row:
            workspace_id = int(row['workspace_id'])

    if not workspace_id:
        try:
            possible_user_id = int(session_key)
        except (TypeError, ValueError):
            possible_user_id = None

        if possible_user_id:
            user_row = db.execute(
                'SELECT id, workspace_id FROM users WHERE id = ? LIMIT 1',
                (possible_user_id,),
            ).fetchone()
            if user_row:
                session_user_id = int(user_row['id'])
                workspace_id = int(user_row['workspace_id'])

    if not workspace_id:
        return jsonify({'sucesso': True})

    client = find_workspace_client_by_phone(db, workspace_id, from_phone)
    client_id = client.get('id') if client else None

    try:
        log_whatsapp_message(
            db=db,
            workspace_id=workspace_id,
            client_id=client_id,
            user_id=session_user_id,
            channel='workspace',
            direction='inbound',
            sender_key=session_key,
            sender_phone=from_phone,
            message_text=text or '',
            status='received',
            commit=True,
        )
    except Exception as error:
        print(f"Erro ao registrar log inbound WhatsApp: {error}")

    # Notifica admins do workspace sobre nova mensagem
    try:
        msg_preview = (text or '').strip()
        if len(msg_preview) > 120:
            msg_preview = msg_preview[:117] + '...'

        admins = db.execute(
            '''SELECT id FROM users
               WHERE workspace_id = ? AND role IN ('admin', 'superadmin')''',
            (workspace_id,),
        ).fetchall()
        for admin in admins:
            db.execute(
                '''INSERT INTO notificacoes (usuario_id, workspace_id, titulo, mensagem, tipo, link)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (
                    admin['id'],
                    workspace_id,
                    'Nova mensagem no WhatsApp',
                    f"De: {from_phone or 'contato'} - {msg_preview or '(sem texto)'}",
                    'whatsapp',
                    '/app/whatsapp',
                ),
            )
        db.commit()
    except Exception as error:
        print(f"Erro ao registrar notificacao inbound WhatsApp: {error}")

    return jsonify({'sucesso': True})

# ============================================================================
# CONFIGURAÇÕES PÚBLICAS (Para Landing Page)
# ============================================================================

@app.route('/api/config/public', methods=['GET'])
def config_public():
    """
    Retorna configurações públicas para a landing page.
    Não requer autenticação.
    """
    # Número do WhatsApp do time de vendas (com prefixo 55 para Brasil)
    # Pode ser configurado via variável de ambiente
    whatsapp_vendas = os.environ.get('WHATSAPP_VENDAS', '5568992539472')
    
    return jsonify({
        'whatsapp_vendas': whatsapp_vendas,
        'app_name': 'JurisPocket',
        'app_tagline': 'Sistema de Gestão de Processos Jurídicos'
    })


# ============================================================================
# STATIC FILES
# ============================================================================

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ============================================================================
# LANDING PAGE ESTÁTICA (Alternativa)
# ============================================================================

# Para usar a landing page estática da pasta 'landing page' em vez da React,
# descomente as rotas abaixo e comente a rota '/' no App.tsx do frontend

# LANDING_PAGE_FOLDER = os.path.join(os.path.dirname(__file__), 'landing page')
# 
# @app.route('/landing/')
# @app.route('/landing/<path:filename>')
# def landing_page_static(filename=None):
#     """Serve landing page estática como alternativa"""
#     if filename is None or filename == '':
#         filename = 'index.html'
#     
#     # Se for um arquivo nos assets, serve diretamente
#     if filename.startswith('assets/'):
#         return send_from_directory(LANDING_PAGE_FOLDER, filename)
#     
#     # Caso contrário, serve o index.html (SPA behavior)
#     try:
#         return send_from_directory(LANDING_PAGE_FOLDER, filename)
#     except:
#         return send_from_directory(LANDING_PAGE_FOLDER, 'index.html')

# ============================================================================
# SERVIR FRONTEND (Produção)
# ============================================================================

import os

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), 'static')

@app.route('/api/health')
@app.route('/health')
@app.route('/healthz')
def health_check():
    """Health check endpoint - rápido e leve para o Railway"""
    try:
        # Verificação mínima - apenas retorna OK
        # Não faz consultas ao banco para ser rápido
        return jsonify({
            'status': 'ok',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'jurispocket-api'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve o frontend React em produção"""
    # Se for API, não serve frontend
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Tenta servir arquivo específico
    if path:
        file_path = os.path.join(STATIC_FOLDER, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(STATIC_FOLDER, path)
    
    # Serve index.html para SPA
    index_path = os.path.join(STATIC_FOLDER, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(STATIC_FOLDER, 'index.html')
    
    # Debug - mostra o que está acontecendo
    return jsonify({
        'status': 'JurisPocket API',
        'error': 'Frontend not found',
        'static_folder': STATIC_FOLDER,
        'exists': os.path.exists(STATIC_FOLDER),
        'files': os.listdir(STATIC_FOLDER) if os.path.exists(STATIC_FOLDER) else []
    }), 500

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)




