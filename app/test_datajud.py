#!/usr/bin/env python3
"""
SCRIPT DE TESTE - INTEGRACAO DATAJUD

Uso:
    export DATAJUD_API_KEY='sua_chave_aqui'
    python test_datajud.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_api_key():
    """Testa se a API Key esta configurada"""
    api_key = os.environ.get('DATAJUD_API_KEY', '')
    
    print("=" * 60)
    print("TESTE 1: Verificacao da API Key")
    print("=" * 60)
    
    if not api_key:
        print("AVISO: DATAJUD_API_KEY nao configurada!")
        print("As consultas a API Datajud nao funcionarao.")
        print()
        return False
    else:
        masked_key = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "****"
        print(f"OK: API Key configurada: {masked_key}")
        print()
        return True

def test_extracao_tribunal():
    """Testa a extracao de tribunal do NPU"""
    print("=" * 60)
    print("TESTE 2: Extracao de Tribunal do NPU")
    print("=" * 60)
    
    from datajud_worker import extrair_tribunal_do_npu
    
    test_cases = [
        ("0000001-23.2024.8.02.0001", "TJSP"),  # 802 = TJSP
        ("0000001-23.2024.8.03.0001", "TJRJ"),  # 803 = TJRJ
        ("0000001-23.2024.8.04.0001", "TJMG"),  # 804 = TJMG
        ("0000001-23.2024.4.03.0001", "TRF3"),  # 030 = TRF3
        ("0000001-23.2024.5.01.0001", "TST"),   # 001 = TST
    ]
    
    todos_passaram = True
    for npu, esperado in test_cases:
        resultado = extrair_tribunal_do_npu(npu)
        status = "OK" if resultado == esperado else "FALHA"
        if resultado != esperado:
            todos_passaram = False
        print(f"{status}: {npu} -> {resultado} (esperado: {esperado})")
    
    print()
    return todos_passaram

def test_conexao_banco():
    """Testa a conexao com o banco de dados"""
    print("=" * 60)
    print("TESTE 3: Conexao com Banco de Dados")
    print("=" * 60)
    
    from datajud_worker import get_db_connection
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM processos")
        count = cursor.fetchone()[0]
        print(f"OK: Tabela 'processos': {count} registros")
        
        conn.close()
        print()
        return True
        
    except Exception as e:
        print(f"Erro na conexao: {e}")
        print()
        return False

def main():
    print("\n" + "=" * 60)
    print("INICIANDO TESTES DE INTEGRACAO DATAJUD")
    print("=" * 60)
    print()
    
    test_api_key()
    test_extracao_tribunal()
    test_conexao_banco()
    
    print("=" * 60)
    print("Testes concluidos!")
    print("=" * 60)

if __name__ == '__main__':
    main()
