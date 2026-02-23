#!/usr/bin/env python3
"""
Script de migração para atualizar o banco de dados existente
com as novas colunas e tabelas.
"""

import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), 'jurispocket.db')

def migrate():
    print("🔄 Iniciando migração do banco de dados...")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Lista de colunas para verificar e adicionar
    migrations = [
        # Tabela users
        ("users", "telefone", "TEXT"),
        ("users", "oab", "TEXT"),
        ("users", "avatar_url", "TEXT"),
        ("users", "alerta_email", "BOOLEAN DEFAULT 1"),
        ("users", "alerta_whatsapp", "BOOLEAN DEFAULT 0"),
        
        # Tabela clientes
        ("clientes", "rg_ie", "TEXT"),
        ("clientes", "data_nascimento", "TEXT"),
        ("clientes", "estado_civil", "TEXT"),
        ("clientes", "profissao", "TEXT"),
        ("clientes", "cidade", "TEXT"),
        ("clientes", "estado", "TEXT"),
        ("clientes", "cep", "TEXT"),
        
        # Tabela processos
        ("processos", "numero_cnj", "TEXT"),
        ("processos", "tipo", "TEXT"),
        ("processos", "pje_url", "TEXT"),
    ]
    
    for table, column, col_type in migrations:
        try:
            # Verifica se a coluna já existe
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [col['name'] for col in cursor.fetchall()]
            
            if column not in columns:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                print(f"✅ Coluna '{column}' adicionada à tabela '{table}'")
            else:
                print(f"ℹ️ Coluna '{column}' já existe em '{table}'")
        except Exception as e:
            print(f"❌ Erro ao adicionar coluna '{column}' em '{table}': {e}")
    
    # Criar tabela notificacoes se não existir
    try:
        cursor.execute('''
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
        print("✅ Tabela 'notificacoes' criada/verificada")
    except Exception as e:
        print(f"❌ Erro ao criar tabela 'notificacoes': {e}")
    
    # Atualizar planos com recursos
    try:
        import json
        
        # Recursos por plano
        planos_recursos = {
            'gratuito': ["clientes", "processos", "prazos", "tarefas", "dashboard"],
            'pro': ["clientes", "processos", "prazos", "tarefas", "dashboard", "ia", "pje", "equipe", "templates", "documentos", "financeiro", "whatsapp", "relatorios"],
            'escritorio': ["clientes", "processos", "prazos", "tarefas", "dashboard", "ia", "pje", "equipe", "templates", "documentos", "financeiro", "whatsapp", "relatorios"]
        }
        
        for codigo, recursos in planos_recursos.items():
            cursor.execute(
                "UPDATE planos SET recursos = ? WHERE codigo = ?",
                (json.dumps(recursos), codigo)
            )
            if cursor.rowcount > 0:
                print(f"✅ Recursos atualizados para plano '{codigo}'")
            else:
                print(f"ℹ️ Plano '{codigo}' não encontrado")
    except Exception as e:
        print(f"❌ Erro ao atualizar recursos dos planos: {e}")
    
    conn.commit()
    conn.close()
    print("✅ Migração concluída!")

if __name__ == '__main__':
    migrate()
