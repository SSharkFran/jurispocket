#!/usr/bin/env python3
"""
Script para promover um usuário a superadmin no JurisPocket.
Uso: python promover_superadmin.py <email-do-usuario>
"""

import sys
import sqlite3
import os

def promover_para_superadmin(db_path, email):
    """Promove um usuário para superadmin"""
    
    if not os.path.exists(db_path):
        print(f"❌ Banco de dados não encontrado: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Verifica se usuário existe
    user = cursor.execute(
        'SELECT id, nome, email, role FROM users WHERE email = ?', 
        (email,)
    ).fetchone()
    
    if not user:
        print(f"❌ Usuário com email '{email}' não encontrado.")
        conn.close()
        return False
    
    print(f"\n📋 Usuário encontrado:")
    print(f"   ID: {user['id']}")
    print(f"   Nome: {user['nome']}")
    print(f"   Email: {user['email']}")
    print(f"   Role atual: {user['role']}")
    
    if user['role'] == 'superadmin':
        print(f"\n⚠️  Este usuário já é superadmin!")
        conn.close()
        return True
    
    # Pergunta confirmação
    confirmacao = input(f"\n⚠️  Tem certeza que deseja promover '{user['nome']}' para superadmin? (s/N): ")
    
    if confirmacao.lower() != 's':
        print("\n❌ Operação cancelada.")
        conn.close()
        return False
    
    # Atualiza para superadmin
    cursor.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        ('superadmin', user['id'])
    )
    conn.commit()
    conn.close()
    
    print(f"\n✅ Usuário '{user['nome']}' promovido para superadmin com sucesso!")
    return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python promover_superadmin.py <email-do-usuario>")
        print("Exemplo: python promover_superadmin.py admin@exemplo.com")
        sys.exit(1)
    
    email = sys.argv[1]
    
    # Procura o banco na pasta app
    db_paths = [
        'app/jurispocket.db',
        'jurispocket.db',
        '../app/jurispocket.db',
        os.path.join(os.path.dirname(__file__), 'app', 'jurispocket.db')
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        # Pergunta o caminho
        db_path = input("Informe o caminho para o banco de dados (jurispocket.db): ").strip()
        if not db_path:
            db_path = 'app/jurispocket.db'
    
    print(f"\n🗄️  Usando banco de dados: {db_path}")
    
    success = promover_para_superadmin(db_path, email)
    sys.exit(0 if success else 1)
