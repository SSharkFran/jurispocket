#!/usr/bin/env python3
"""Script para inicializar o banco de dados com usuário de teste"""
import os
import sqlite3
import hashlib

def hash_senha(senha):
    return hashlib.sha256(senha.encode()).hexdigest()

def init_database():
    db_path = 'database.db'
    
    # Remove banco antigo se existir
    if os.path.exists(db_path):
        os.remove(db_path)
        print('Banco antigo removido')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Cria tabela workspaces
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Cria tabela users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')
    
    # Cria tabela processos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            numero TEXT NOT NULL,
            numero_cnj TEXT,
            titulo TEXT NOT NULL,
            cliente_id INTEGER,
            descricao TEXT,
            status TEXT DEFAULT 'ativo',
            comarca TEXT,
            vara TEXT,
            valor_causa REAL DEFAULT 0,
            data_abertura DATE,
            token_publico TEXT UNIQUE,
            ultima_movimentacao TEXT,
            data_ultima_movimentacao TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    ''')
    
    # Cria tabela clientes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            cpf_cnpj TEXT,
            telefone TEXT,
            email TEXT,
            endereco TEXT,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')
    
    # Cria tabela prazos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prazos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER,
            titulo TEXT NOT NULL,
            descricao TEXT,
            data_prazo TIMESTAMP NOT NULL,
            tipo TEXT DEFAULT 'interno',
            status TEXT DEFAULT 'pendente',
            prioridade TEXT DEFAULT 'media',
            alerta_enviado BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id)
        )
    ''')
    
    # Cria tabela tarefas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            processo_id INTEGER,
            assigned_to INTEGER,
            titulo TEXT NOT NULL,
            descricao TEXT,
            status TEXT DEFAULT 'pendente',
            prioridade TEXT DEFAULT 'media',
            data_vencimento TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
            FOREIGN KEY (processo_id) REFERENCES processos (id),
            FOREIGN KEY (assigned_to) REFERENCES users (id)
        )
    ''')
    
    # Cria tabela notificacoes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            workspace_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            tipo TEXT DEFAULT 'info',
            lida BOOLEAN DEFAULT 0,
            link TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES users (id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
        )
    ''')
    
    # Cria tabela pje_monitor_logs
    cursor.execute('''
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
    
    # Cria workspace padrão
    cursor.execute('INSERT INTO workspaces (nome) VALUES (?)', ('Meu Escritório',))
    workspace_id = cursor.lastrowid
    print(f'Workspace criado: ID {workspace_id}')
    
    # Cria usuário admin
    cursor.execute(
        'INSERT INTO users (workspace_id, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        (workspace_id, 'Administrador', 'admin@teste.com', hash_senha('123456'), 'admin')
    )
    user_id = cursor.lastrowid
    print(f'Usuário criado: ID {user_id}')
    
    conn.commit()
    conn.close()
    print('\n✓ Banco de dados inicializado com sucesso!')
    print('  Email: admin@teste.com')
    print('  Senha: 123456')

if __name__ == '__main__':
    init_database()
