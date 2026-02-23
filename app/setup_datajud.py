#!/usr/bin/env python3
"""
================================================================================
SETUP DATAJUD - Configuração Rápida da API Key
================================================================================

Este script configura a API Key PÚBLICA do Datajud no JurisPocket.

ℹ️  IMPORTANTE: A API do Datajud usa uma CHAVE PÚBLICA única, disponibilizada
   pelo CNJ/DPJ no wiki oficial. Todos usam a mesma chave!

COMO USAR:
    python setup_datajud.py

O que ele faz:
    1. Mostra a chave pública atual (ou pede pra você colar do wiki)
    2. Salva no arquivo .env
    3. Testa a conexão com a API
    4. Mostra como deixar permanente

LINK DO WIKI:
    https://datajud.cnj.jus.br/wiki/publico/index.html
================================================================================
"""

import os
import sys
import getpass

# Cores para deixar bonito no terminal
VERDE = '\033[92m'
AMARELO = '\033[93m'
VERMELHO = '\033[91m'
AZUL = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def limpar_tela():
    """Limpa a tela do terminal"""
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_banner():
    """Mostra o banner do setup"""
    limpar_tela()
    print(f"{AZUL}{BOLD}")
    print("=" * 70)
    print("     🤖 SETUP DATAJUD - JurisPocket")
    print("     Configuração da API de Monitoramento de Processos")
    print("=" * 70)
    print(f"{RESET}")
    print()

def pedir_api_key():
    """Pede a API Key ao usuário - CHAVE PÚBLICA DO CNJ"""
    print(f"{BOLD}📋 INSTRUÇÕES:{RESET}")
    print()
    print("A API Datajud usa uma CHAVE PÚBLICA única do CNJ.")
    print()
    print("1. Acesse o wiki: https://datajud.cnj.jus.br/wiki/publico/index.html")
    print("2. Copie a 'Chave Pública' atual (está na seção de Autenticação)")
    print("3. Cole aqui no terminal (Ctrl+V ou botão direito → Colar)")
    print()
    print(f"{AMARELO}💡 DICA: Se a chave abaixo já funcionar, é só dar ENTER!{RESET}")
    print()
    
    # Chave pública atual do CNJ (pode ser atualizada pelo CNJ)
    CHAVE_PUBLICA_PADRAO = "cDZHYzlZa0JadVREZDJCendQdXY4aXg0c2ZyZzR1Q1RkU3JqZmJTZ1pzbFc="
    
    print(f"{BOLD}🔑 Cole a Chave Pública do Datajud (ou ENTER para usar a padrão):{RESET}")
    
    # Pede a chave (getpass oculta o input)
    api_key = getpass.getpass(f"   [Enter=default] > ").strip()
    
    # Se não digitou nada, usa a chave pública padrão
    if not api_key:
        print(f"{AZUL}ℹ️  Usando chave pública padrão do CNJ{RESET}")
        api_key = CHAVE_PUBLICA_PADRAO
    
    return api_key

def salvar_env(api_key):
    """Salva a API Key no arquivo .env"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    # Lê o conteúdo atual se existir
    linhas_existentes = []
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            linhas_existentes = f.readlines()
    
    # Remove linha antiga da DATAJUD_API_KEY se existir
    novas_linhas = []
    for linha in linhas_existentes:
        if not linha.startswith('DATAJUD_API_KEY='):
            novas_linhas.append(linha)
    
    # Adiciona a nova chave
    novas_linhas.append(f'DATAJUD_API_KEY={api_key}\n')
    
    # Salva o arquivo
    with open(env_path, 'w') as f:
        f.writelines(novas_linhas)
    
    return env_path

def testar_conexao(api_key):
    """Testa se a API Key funciona"""
    print()
    print(f"{BOLD}🌐 Testando conexão com a API Datajud...{RESET}")
    print()
    
    try:
        import requests
        
        # Testa com um endpoint genérico (TJSP)
        url = 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search'
        headers = {
            'Authorization': f'ApiKey {api_key}',
            'Content-Type': 'application/json'
        }
        payload = {
            "query": {
                "match": {
                    "numeroProcesso": "00000000000000000000"  # Número inválido, só pra testar auth
                }
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            print(f"{VERDE}✅ CONEXÃO OK!{RESET}")
            print(f"   API Key está funcionando corretamente.")
            return True
        elif response.status_code == 401:
            print(f"{VERMELHO}❌ ERRO DE AUTENTICAÇÃO{RESET}")
            print(f"   Status: HTTP {response.status_code}")
            print(f"   Sua API Key está inválida ou expirada.")
            return False
        else:
            print(f"{AMARELO}⚠️  ATENÇÃO{RESET}")
            print(f"   Status: HTTP {response.status_code}")
            print(f"   A API respondeu, mas pode haver algum problema.")
            return True
            
    except requests.exceptions.ConnectionError:
        print(f"{VERMELHO}❌ ERRO DE CONEXÃO{RESET}")
        print(f"   Não foi possível conectar à API Datajud.")
        print(f"   Verifique sua internet.")
        return False
    except Exception as e:
        print(f"{VERMELHO}❌ ERRO:{RESET} {e}")
        return False

def mostrar_resumo(api_key, env_path, teste_ok):
    """Mostra o resumo da configuração"""
    print()
    print(f"{AZUL}{BOLD}" + "=" * 70)
    print("📊 RESUMO DA CONFIGURAÇÃO")
    print("=" * 70 + f"{RESET}")
    print()
    
    # Mostra a chave mascarada
    chave_mascarada = api_key[:8] + "..." + api_key[-8:] if len(api_key) > 16 else "****"
    print(f"✅ API Key (PÚBLICA): {chave_mascarada}")
    print(f"✅ Arquivo .env: {env_path}")
    
    if teste_ok:
        print(f"✅ Teste de conexão: {VERDE}FUNCIONANDO{RESET}")
    else:
        print(f"⚠️  Teste de conexão: {AMARELO}FALHOU (verifique a chave){RESET}")
    
    print()
    print(f"{BOLD}📁 CONFIGURAÇÃO SALVA EM:{RESET}")
    print(f"   {env_path}")
    print()
    print(f"{BOLD}🚀 PRÓXIMOS PASSOS:{RESET}")
    print()
    print("1. ✅ Agora você já pode usar o monitoramento!")
    print()
    print("2. 🧪 Para TESTAR agora, execute:")
    print(f"   {VERDE}python test_datajud.py{RESET}")
    print()
    print("3. 📖 Para VER LOGS em tempo real:")
    print(f"   {VERDE}tail -f logs/datajud_worker.log{RESET}")
    print()
    print(f"{AMARELO}⚠️  IMPORTANTE:{RESET}")
    print("   O CNJ pode alterar a chave pública a qualquer momento.")
    print("   Se parar de funcionar, acesse o wiki e atualize a chave:")
    print("   https://datajud.cnj.jus.br/wiki/publico/index.html")
    print()

def menu_opcoes():
    """Mostra menu de opções após configuração"""
    print(f"{BOLD}O que você quer fazer agora?{RESET}")
    print()
    print("1. 🧪 Testar a integração agora")
    print("2. 🚀 Iniciar o servidor Flask")
    print("3. ❌ Sair")
    print()
    
    opcao = input(f"{BOLD}Escolha (1/2/3):{RESET} ").strip()
    return opcao

def main():
    """Função principal"""
    mostrar_banner()
    
    # Verifica se já existe uma chave configurada
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    chave_atual = None
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for linha in f:
                if linha.startswith('DATAJUD_API_KEY='):
                    chave_atual = linha.strip().split('=', 1)[1]
                    break
    
    if chave_atual:
        print(f"{AMARELO}⚠️  Já existe uma chave pública configurada!{RESET}")
        print()
        substituir = input(f"{BOLD}Deseja atualizar para uma nova chave do wiki? (s/n):{RESET} ").strip().lower()
        if substituir not in ['s', 'sim', 'yes', 'y']:
            print()
            print(f"{VERDE}✅ Mantendo configuração atual.{RESET}")
            print(f"   Para testar: python test_datajud.py")
            return
        print()
    
    # Pede a nova chave
    api_key = pedir_api_key()
    if not api_key:
        sys.exit(1)
    
    # Salva no .env
    print()
    print(f"{BOLD}💾 Salvando configuração...{RESET}")
    env_path = salvar_env(api_key)
    print(f"{VERDE}✅ Configuração salva em:{RESET} {env_path}")
    
    # Testa a conexão
    teste_ok = testar_conexao(api_key)
    
    # Mostra resumo
    mostrar_resumo(api_key, env_path, teste_ok)
    
    # Menu de opções
    opcao = menu_opcoes()
    
    if opcao == '1':
        print()
        print(f"{BOLD}🧪 Executando testes...{RESET}")
        print()
        os.system(f'cd "{os.path.dirname(__file__)}" && python test_datajud.py')
    elif opcao == '2':
        print()
        print(f"{BOLD}🚀 Iniciando servidor...{RESET}")
        print()
        os.system(f'cd "{os.path.dirname(__file__)}" && python app.py')
    else:
        print()
        print(f"{VERDE}✅ Setup concluído!{RESET}")
        print(f"   Para iniciar o servidor: python app.py")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print()
        print()
        print(f"{AMARELO}⚠️  Setup cancelado pelo usuário.{RESET}")
        sys.exit(0)
    except Exception as e:
        print()
        print(f"{VERMELHO}❌ ERRO:{RESET} {e}")
        sys.exit(1)
