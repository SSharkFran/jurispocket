#!/usr/bin/env python3
"""Setup inicial do banco de dados jurispocket.db"""
import os
import sys
import hashlib

# Adiciona o diretório do app ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, init_db, hash_senha, get_db

def setup():
    with app.app_context():
        print("Inicializando banco de dados...")
        
        # Remove banco antigo se existir
        db_path = app.config['DATABASE']
        if os.path.exists(db_path):
            os.remove(db_path)
            print(f"Removido: {db_path}")
        
        # Cria as tabelas
        init_db()
        print("Tabelas criadas!")
        
        # Cria workspace e usuário admin
        db = get_db()
        cursor = db.cursor()
        
        # Cria workspace
        cursor.execute('INSERT INTO workspaces (nome) VALUES (?)', ('Meu Escritório',))
        workspace_id = cursor.lastrowid
        print(f"Workspace criado: ID {workspace_id}")
        
        # Cria usuário admin
        cursor.execute(
            'INSERT INTO users (workspace_id, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            (workspace_id, 'Administrador', 'admin@teste.com', hash_senha('123456'), 'admin')
        )
        user_id = cursor.lastrowid
        print(f"Usuário criado: ID {user_id}")
        
        db.commit()
        db.close()
        
        print("\n✅ Setup completo!")
        print("   Email: admin@teste.com")
        print("   Senha: 123456")

if __name__ == '__main__':
    setup()
