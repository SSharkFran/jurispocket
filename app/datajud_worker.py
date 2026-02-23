#!/usr/bin/env python3
"""
================================================================================
WORKER DE MONITORAMENTO AUTOMÁTICO VIA DATAJUD - JurisPocket
================================================================================

Este módulo implementa um robô inteligente que consulta a API pública Datajud
do CNJ (Conselho Nacional de Justiça) e atualiza automaticamente o banco de 
dados MySQL/SQLite com novas movimentações de processos cadastrados.

FUNCIONAMENTO:
- Executa 2 vezes ao dia: 08:00 e 17:30 (horários configuráveis)
- Roda de forma assíncrona sem travar a aplicação principal
- Consulta apenas processos marcados para monitoramento
- Evita duplicatas com chave única (processo_id, codigo_movimento, data_movimento)
- Cria notificações inteligentes para o usuário
- Registra logs detalhados de cada consulta

CONFIGURAÇÃO NECESSÁRIA:
1. Defina sua API Key do Datajud (https://datajud.cnj.jus.br)
   - Variável de ambiente: DATAJUD_API_KEY
   - Ou edite a constante DATAJUD_API_KEY neste arquivo (não recomendado para produção)
   
2. Configure os horários de execução na função schedule_datajud_monitoring()
   em app.py (linhas 800-810)

3. Certifique-se de ter o Python 3.7+ e as dependências instaladas:
   pip install -r requirements.txt

ESTRUTURA DE DADOS:
- Tabelas utilizadas:
  ✓ processos - Armazena os processos
  ✓ processo_monitor_config - Config de monitoramento por processo
  ✓ movimentacoes_processo - Historicamente de movimentações (CHAVE ÚNICA!)
  ✓ alertas_notificacoes - Notificações para o usuário
  ✓ datajud_consulta_logs - Logs de todas as consultas feitas
  
SEGURANÇA:
- API Key deve estar em variável de ambiente (NUNCA em código)
- Rate limiting automático para respeitar TOS da API Datajud
- Timeout configurável para não congelar a aplicação
- Tratamento robusto de erros com logging
================================================================================
"""

import os
import json
import time
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging

# ============================================================================
# CONFIGURAÇÃO DE LOGGING
# ============================================================================

# Cria diretório de logs se não existir
LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Configura logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Handler para arquivo
fh = logging.FileHandler(os.path.join(LOG_DIR, 'datajud_worker.log'))
fh.setLevel(logging.DEBUG)

# Handler para console
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)

# Formato
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%d/%m/%Y %H:%M:%S'
)
fh.setFormatter(formatter)
ch.setFormatter(formatter)

logger.addHandler(fh)
logger.addHandler(ch)

# ============================================================================
# CONFIGURAÇÕES
# ============================================================================

# 🔑 CONFIGURAÇÃO DA API DATAJUD
# Obtenha sua chave em: https://datajud.cnj.jus.br/portal/externo/consultar-api
DATAJUD_API_KEY = os.environ.get('DATAJUD_API_KEY', '')

# URL base da API pública Datajud
DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br'

# Timeout para requisições HTTP (em segundos)
DATAJUD_TIMEOUT = 30

# Delay entre requisições para respeitar rate limiting (em segundos)
DATAJUD_DELAY_ENTRE_REQUISICOES = 2

# Caminho do banco de dados SQLite
DB_PATH = os.path.join(os.path.dirname(__file__), 'jurispocket.db')

# ============================================================================
# ROTEADOR DE TRIBUNAIS DATAJUD
# ============================================================================
# Este dicionário mapeia a sigla do tribunal para o endpoint específico da API
# A URL final fica: {BASE_URL}{ENDPOINT}

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
    
    # Tribunais de Justiça Estaduais
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

# ============================================================================
# MAPEAMENTO COMPLETO DO NPU (Novo Padrão CNJ)
# Estrutura: NNNNNNN-DD.AAAA.J.TR.OOOO
# J = Justiça (1 dígito), TR = Tribunal/Região (2 dígitos)
# Código = J + TR (3 dígitos, índices 13:16)
# ============================================================================

CODIGO_ORGAO_MAP = {
    # 1. TRIBUNAIS SUPERIORES (TR = 00)
    '300': 'STJ',  # Superior Tribunal de Justiça (J=3)
    '500': 'TST',  # Tribunal Superior do Trabalho (J=5)
    '600': 'TSE',  # Tribunal Superior Eleitoral (J=6)
    '700': 'STM',  # Superior Tribunal Militar (J=7)
    
    # 2. JUSTIÇA FEDERAL (J = 4) - TRF1 a TRF6
    '401': 'TRF1', '402': 'TRF2', '403': 'TRF3',
    '404': 'TRF4', '405': 'TRF5', '406': 'TRF6',
    
    # 3. JUSTIÇA DO TRABALHO (J = 5) - TRT1 a TRT24
    '501': 'TRT1',   '502': 'TRT2',   '503': 'TRT3',   '504': 'TRT4',
    '505': 'TRT5',   '506': 'TRT6',   '507': 'TRT7',   '508': 'TRT8',
    '509': 'TRT9',   '510': 'TRT10',  '511': 'TRT11',  '512': 'TRT12',
    '513': 'TRT13',  '514': 'TRT14',  '515': 'TRT15',  '516': 'TRT16',
    '517': 'TRT17',  '518': 'TRT18',  '519': 'TRT19',  '520': 'TRT20',
    '521': 'TRT21',  '522': 'TRT22',  '523': 'TRT23',  '524': 'TRT24',
    
    # 4. JUSTIÇA ELEITORAL (J = 6) - TREs dos estados
    '601': 'TRE-AC', '602': 'TRE-AL', '603': 'TRE-AM', '604': 'TRE-AP',
    '605': 'TRE-BA', '606': 'TRE-CE', '607': 'TRE-DF', '608': 'TRE-ES',
    '609': 'TRE-GO', '610': 'TRE-MA', '611': 'TRE-MT', '612': 'TRE-MS',
    '613': 'TRE-MG', '614': 'TRE-PA', '615': 'TRE-PB', '616': 'TRE-PR',
    '617': 'TRE-PE', '618': 'TRE-PI', '619': 'TRE-RJ', '620': 'TRE-RN',
    '621': 'TRE-RS', '622': 'TRE-RO', '623': 'TRE-RR', '624': 'TRE-SC',
    '625': 'TRE-SE', '626': 'TRE-SP', '627': 'TRE-TO',
    
    # 5. JUSTIÇA ESTADUAL (J = 8) - TJs (ordem alfabética dos estados)
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
    '913': 'TJMMG',  # Minas Gerais
    '921': 'TJMRS',  # Rio Grande do Sul
    '926': 'TJMSP',  # São Paulo
}

# ============================================================================
# FUNÇÕES UTILITÁRIAS
# ============================================================================


def get_db_connection() -> sqlite3.Connection:
    """
    Estabelece conexão com o banco de dados SQLite
    
    Returns:
        Conexão SQLite com row_factory configurado
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def extrair_tribunal_do_npu(numero_processo: str) -> Optional[str]:
    """
    Extrai a sigla do tribunal a partir do número do processo (NPU)
    
    ℹ️ NPU: Número único de processo com 20 dígitos
    Estrutura: NNNNNNN-DD.AAAA.J.TR.OOOO
    - J (Justiça): 1 dígito (índice 13)
    - TR (Tribunal/Região): 2 dígitos (índices 14-15)
    - Código = J + TR (3 dígitos)
    
    Args:
        numero_processo: String com o número (com ou sem formatação)
        
    Returns:
        Sigla do tribunal (ex: 'TJSP', 'TRF1') ou None se inválido
        
    Exemplo:
        >>> extrair_tribunal_do_npu("0000001-23.2024.8.26.0100")
        'TJSP'  # J=8, TR=26, Código=826
    """
    import re
    
    # Remove tudo que não é número
    limpo = re.sub(r'[^0-9]', '', numero_processo)
    
    # Deve ter exatamente 20 dígitos
    if len(limpo) != 20:
        logger.warning(f"NPU inválido (comprimento {len(limpo)}): {numero_processo}")
        return None
    
    # Extrai J (1 dígito) e TR (2 dígitos)
    j = limpo[13]          # Justiça (1 dígito)
    tr = limpo[14:16]      # Tribunal/Região (2 dígitos)
    codigo_orgao = j + tr  # Código completo (3 dígitos)
    
    tribunal = CODIGO_ORGAO_MAP.get(codigo_orgao)
    
    if not tribunal:
        logger.warning(f"Código de órgão desconhecido: {codigo_orgao} (J={j}, TR={tr}) em {numero_processo}")
        return None
    
    return tribunal


def consultar_processo_datajud(
    numero_processo: str,
    tribunal_sigla: str
) -> Dict[str, Any]:
    """
    Consulta um processo na API pública Datajud do CNJ
    
    📡 DETALHES DA REQUISIÇÃO:
    - Método: POST
    - URL: {DATAJUD_BASE_URL}{TRIBUNAIS_ENDPOINTS[tribunal_sigla]}
    - Headers:
        - Authorization: ApiKey {DATAJUD_API_KEY}
        - Content-Type: application/json
    - Body: {"query": {"match": {"numeroProcesso": "NUMERO_LIMPO"}}}
    
    📨 RESPOSTA: Formato Elasticsearch
    - JSON com estrutura: hits.hits[0]._source
    - Contém: numeroProcesso, dataAjuizamento, classe, orgaoJulgador, movimentos
    
    Args:
        numero_processo: NPU do processo
        tribunal_sigla: Sigla identificada do tribunal
        
    Returns:
        Dict com:
        - sucesso: bool
        - encontrado: bool (if sucesso=True)
        - error: str (if sucesso=False)
        - tribunal: str
        - numero_processo: str
        - data_ajuizamento: str
        - classe: {codigo, nome}
        - orgao_julgador: {nome}
        - movimentos: List[{codigo, nome, data_hora, complementos}]
        - tempo_resposta_ms: int
    """
    
    # ========================================================================
    # VALIDAÇÃO PRÉ-REQUISIÇÃO
    # ========================================================================
    
    if not DATAJUD_API_KEY:
        erro_msg = (
            "❌ API Key não configurada!\n"
            "Configure a variável de ambiente DATAJUD_API_KEY\n"
            "Obtenha a chave em: https://datajud.cnj.jus.br/portal/externo/consultar-api"
        )
        logger.error(erro_msg)
        return {
            'sucesso': False,
            'erro': erro_msg,
            'tribunal': tribunal_sigla
        }
    
    endpoint = TRIBUNAIS_ENDPOINTS.get(tribunal_sigla)
    if not endpoint:
        return {
            'sucesso': False,
            'erro': f'Tribunal {tribunal_sigla} não mapeado',
            'tribunal': tribunal_sigla
        }
    
    # ========================================================================
    # CONSTRUÇÃO DA REQUISIÇÃO
    # ========================================================================
    
    import re
    numero_limpo = re.sub(r'[^0-9]', '', numero_processo)
    
    url = f"{DATAJUD_BASE_URL}{endpoint}"
    
    headers = {
        'Authorization': f'ApiKey {DATAJUD_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Query em formato Elasticsearch: busca pelo número exato
    payload = {
        "query": {
            "match": {
                "numeroProcesso": numero_limpo
            }
        }
    }
    
    # ========================================================================
    # EXECUÇÃO DA REQUISIÇÃO
    # ========================================================================
    
    inicio = time.time()
    
    try:
        logger.info(f"🔍 Consultando {tribunal_sigla}: {numero_limpo}")
        
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=DATAJUD_TIMEOUT
        )
        
        tempo_ms = int((time.time() - inicio) * 1000)
        
        # Status HTTP não 200
        if response.status_code != 200:
            erro = f"HTTP {response.status_code}"
            logger.warning(f"❌ Erro na API Datajud: {erro} ({tempo_ms}ms)")
            return {
                'sucesso': False,
                'erro': erro,
                'tribunal': tribunal_sigla,
                'tempo_resposta_ms': tempo_ms,
                'status_code': response.status_code
            }
        
        # ====================================================================
        # PARSER DA RESPOSTA ELASTICSEARCH
        # ====================================================================
        
        data = response.json()
        
        hits = data.get('hits', {}).get('hits', [])
        
        # Processo não encontrado
        if not hits:
            logger.info(f"⚠️  Processo não encontrado: {numero_limpo} em {tribunal_sigla}")
            return {
                'sucesso': True,
                'encontrado': False,
                'tribunal': tribunal_sigla,
                'mensagem': 'Processo ainda não está disponível na API',
                'tempo_resposta_ms': tempo_ms
            }
        
        # Extrai dados do primeiro hit (OpenSearch retorna ordenado por relevância)
        source = hits[0].get('_source', {})
        
        # ====================================================================
        # EXTRAÇÃO E MAPEAMENTO DE DADOS
        # ====================================================================
        
        # Movimentações (histórico)
        movimentos_raw = source.get('movimentos', [])
        movimentos = []
        
        for mov in movimentos_raw:
            movimentos.append({
                'codigo': mov.get('codigo'),
                'nome': mov.get('nome'),
                'data_hora': mov.get('dataHora'),
                'complementos': mov.get('complementosTabelados', [])
            })
        
        # Ordena por data decrescente (mais recente primeiro)
        movimentos.sort(key=lambda x: x.get('data_hora', ''), reverse=True)
        
        logger.info(f"✅ {len(movimentos)} movimentações encontradas em {tempo_ms}ms")
        
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
            'tiempo_resposta_ms': tempo_ms
        }
    
    except requests.exceptions.Timeout:
        tempo_ms = int((time.time() - inicio) * 1000)
        msg = f"Timeout após {DATAJUD_TIMEOUT}s"
        logger.error(f"⏱️  {msg} no tribunal {tribunal_sigla}")
        return {
            'sucesso': False,
            'erro': msg,
            'tribunal': tribunal_sigla,
            'tempo_resposta_ms': tempo_ms
        }
    
    except requests.exceptions.RequestException as e:
        tempo_ms = int((time.time() - inicio) * 1000)
        logger.error(f"🌐 Erro de conexão: {str(e)}")
        return {
            'sucesso': False,
            'erro': f'Erro de conexão: {str(e)}',
            'tribunal': tribunal_sigla,
            'tempo_resposta_ms': tempo_ms
        }
    
    except json.JSONDecodeError as e:
        tempo_ms = int((time.time() - inicio) * 1000)
        logger.error(f"📄 Erro ao decodificar JSON: {str(e)}")
        return {
            'sucesso': False,
            'erro': 'Resposta inválida da API',
            'tribunal': tribunal_sigla,
            'tempo_resposta_ms': tempo_ms
        }
    
    except Exception as e:
        tempo_ms = int((time.time() - inicio) * 1000)
        logger.exception(f"❌ Erro inesperado: {str(e)}")
        return {
            'sucesso': False,
            'erro': str(e),
            'tribunal': tribunal_sigla,
            'tempo_resposta_ms': tempo_ms
        }


def salvar_movimentacoes(
    conn: sqlite3.Connection,
    processo_id: int,
    workspace_id: int,
    movimentos: List[Dict]
) -> Tuple[int, int, List[Dict]]:
    """
    Salva movimentações no banco de dados com proteção contra duplicatas
    
    🔐 CHAVE ÚNICA: (processo_id, codigo_movimento, data_movimento)
    - SQLite usa INSERT OR IGNORE para pular duplicatas
    - Garante que a mesma movimentação nunca seja inserida 2x
    
    ⚡ OPERAÇÃO:
    1. Para cada movimentação, tenta inserir
    2. Se violar UNIQUE constraint, ignora (duplicata)
    3. Se inserir, incrementa contador de novas
    4. Retorna tupla: (inseridas, duplicadas, novas_movimentacoes)
    
    Args:
        conn: Conexão com banco de dados
        processo_id: ID do processo
        workspace_id: ID do workspace
        movimentos: Lista de movimentações da API
        
    Returns:
        Tuple (inseridas, duplicadas, lista_de_novas_movimentacoes)
    """
    
    cursor = conn.cursor()
    inseridas = 0
    duplicadas = 0
    novas_movimentacoes = []
    
    try:
        for mov in movimentos:
            codigo = mov.get('codigo')
            nome = mov.get('nome', 'Movimentação sem descrição')
            data_hora = mov.get('data_hora')
            complementos_list = mov.get('complementos', [])
            
            # ================================================================
            # CONVERSÃO DE DATA: ISO 8601 → DATETIME MySQL
            # ================================================================
            # A API retorna em ISO 8601 (exemplo: 2024-02-21T15:30:00Z)
            # Converte para: YYYY-MM-DD HH:MM:SS
            
            if data_hora:
                try:
                    # Remove 'Z' (UTC indicator) e converte
                    data_clean = data_hora.replace('Z', '+00:00')
                    # Python 3.7+: fromisoformat com timezone
                    from datetime import datetime as dt_cls
                    dt = dt_cls.fromisoformat(data_clean)
                    data_movimento = dt.strftime('%Y-%m-%d %H:%M:%S')
                except (ValueError, AttributeError):
                    # Fallback: usa como está
                    data_movimento = data_hora[:19]  # Toma os 19 primeiros chars
            else:
                data_movimento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Salva complementos como JSON string
            complementos_json = json.dumps(complementos_list, ensure_ascii=False)
            
            # ================================================================
            # INSERT OR IGNORE
            # ================================================================
            # Se a combinação (processo_id, codigo_movimento, data_movimento)
            # já existir, será ignorado (rowcount = 0)
            # Se for novo, será inserido (rowcount = 1)
            
            cursor.execute('''
                INSERT OR IGNORE INTO movimentacoes_processo 
                (workspace_id, processo_id, codigo_movimento, nome_movimento,
                 data_movimento, complementos, fonte, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                workspace_id,
                processo_id,
                codigo,
                nome,
                data_movimento,
                complementos_json,
                'datajud',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            if cursor.rowcount > 0:
                inseridas += 1
                novas_movimentacoes.append({
                    'codigo': codigo,
                    'nome': nome,
                    'data': data_movimento
                })
            else:
                duplicadas += 1
        
        conn.commit()
        logger.info(f"💾 Salvo: {inseridas} novas, {duplicadas} duplicadas")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Erro ao salvar movimentações: {e}")
    
    return inseridas, duplicadas, novas_movimentacoes


def criar_alertas(
    conn: sqlite3.Connection,
    processo_id: int,
    workspace_id: int,
    numero_processo: str,
    novas_movimentacoes: List[Dict]
) -> int:
    """
    Cria alertas/notificações para novas movimentações
    
    💡 LÓGICA:
    - Para cada movimentação nova, cria um alerta
    - Alerta fica com lido=FALSE para aparecer como "novo"
    - O usuário verá assim que fazer login ou abrir dashboard
    - Pode marcar como lido pela API
    
    Args:
        conn: Conexão com banco
        processo_id: ID do processo
        workspace_id: ID do workspace
        numero_processo: NPU para exibir
        novas_movimentacoes: Lista de novas movimentações
        
    Returns:
        Quantidade de alertas criados
    """
    
    cursor = conn.cursor()
    alertas_criados = 0
    
    try:
        for mov in novas_movimentacoes:
            # Extrai apenas os últimos 9 dígitos do NPU para exibir no alerta
            npu_curto = numero_processo[-9:] if len(numero_processo) >= 9 else numero_processo
            
            titulo = f"🔔 Nova movimentação - {npu_curto}"
            mensagem = f"{mov['nome']}\nData: {mov['data']}"
            
            cursor.execute('''
                INSERT INTO alertas_notificacoes
                (workspace_id, processo_id, tipo, titulo, mensagem, lido, data_criacao)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                workspace_id,
                processo_id,
                'movimentacao',
                titulo,
                mensagem,
                False,  # Novo alerta não lido
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            alertas_criados += 1
        
        conn.commit()
        logger.info(f"🔔 {alertas_criados} alertas criados")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Erro ao criar alertas: {e}")
    
    return alertas_criados


def registrar_log_consulta(
    conn: sqlite3.Connection,
    processo_id: int,
    workspace_id: int,
    numero_processo: str,
    tribunal_sigla: str,
    status: str,
    movimentacoes_encontradas: int,
    movimentacoes_novas: int,
    tempo_ms: int,
    erro: Optional[str] = None
) -> None:
    """
    Registra detalhes de cada consulta para auditoria e debugging
    
    📊 TABELA: datajud_consulta_logs
    
    Serve para:
    - Rastrear histórico de monitoramento
    - Identificar problemas com tribunais específicos
    - Calcular estatísticas de uso da API
    - Auditar atividades
    
    Args:
        conn: Conexão com banco
        processo_id: ID do processo
        workspace_id: ID do workspace
        numero_processo: NPU
        tribunal_sigla: Tribunal consultado
        status: 'sucesso', 'erro', 'vazio'
        movimentacoes_encontradas: Total encontradas
        movimentacoes_novas: Novas (inseridas)
        tempo_ms: Tempo de resposta
        erro: Mensagem de erro (se houver)
    """
    
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO datajud_consulta_logs
            (workspace_id, processo_id, numero_processo, tribunal_sigla,
             endpoint_usado, status_consulta, movimentacoes_encontradas,
             movimentacoes_novas, tempo_resposta_ms, erro_msg, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            workspace_id,
            processo_id,
            numero_processo,
            tribunal_sigla,
            TRIBUNAIS_ENDPOINTS.get(tribunal_sigla, ''),
            status,
            movimentacoes_encontradas,
            movimentacoes_novas,
            tempo_ms,
            erro,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Erro ao registrar log: {e}")


def processar_processo(
    processo_row: sqlite3.Row,
    conn: sqlite3.Connection
) -> Dict[str, Any]:
    """
    Processa um processo individual: consulta API, salva tudo, cria alertas
    
    🔄 WORKFLOW:
    1. Extrai tribunal do número (NPU parsing)
    2. Consulta API Datajud
    3. Se sucesso e encontrado:
       a. Salva movimentações (com INSERT OR IGNORE para duplicatas)
       b. Cria alertas para novas movimentações
       c. Atualiza data da última verificação
    4. Registra log da consulta
    
    Args:
        processo_row: Row do SQLite com dados do processo
        conn: Conexão com banco
        
    Returns:
        Dict com resultado: sucesso, movimentacoes_novas, tempo_resposta_ms, etc
    """
    
    processo_id = processo_row['processo_id']
    numero_processo = processo_row['numero']
    workspace_id = processo_row['workspace_id']
    
    logger.info(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(f"📋 Processando processo ID {processo_id}: {numero_processo}")
    logger.info(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # ========================================================================
    # IDENTIFICAÇÃO DO TRIBUNAL (extrai automaticamente do NPU)
    # ========================================================================
    
    tribunal = extrair_tribunal_do_npu(numero_processo)
    
    if not tribunal:
        erro = "Não foi possível identificar tribunal pelo número do processo"
        logger.error(f"❌ {erro}")
        registrar_log_consulta(
            conn, processo_id, workspace_id, numero_processo,
            'DESCONHECIDO', 'erro', 0, 0, 0, erro
        )
        return {
            'sucesso': False,
            'erro': erro,
            'processo_id': processo_id
        }
    
    logger.info(f"🎯 Tribunal detectado: {tribunal}")
    
    # ========================================================================
    # DELAY ENTRE REQUISIÇÕES (Rate Limiting)
    # ========================================================================
    
    time.sleep(DATAJUD_DELAY_ENTRE_REQUISICOES)
    
    # ========================================================================
    # CONSULTA À API DATAJUD
    # ========================================================================
    
    resultado = consultar_processo_datajud(numero_processo, tribunal)
    
    if not resultado['sucesso']:
        # Consulta falhou
        registrar_log_consulta(
            conn, processo_id, workspace_id, numero_processo,
            tribunal, 'erro', 0, 0,
            resultado.get('tempo_resposta_ms', 0),
            resultado.get('erro', 'Erro desconhecido')
        )
        return resultado
    
    # Verificar se encontrou o processo
    if not resultado.get('encontrado', False):
        registrar_log_consulta(
            conn, processo_id, workspace_id, numero_processo,
            tribunal, 'vazio', 0, 0,
            resultado.get('tiempo_resposta_ms', 0),
            None
        )
        logger.info(f"⚠️  Processo não encontrado na API")
        return resultado
    
    # ========================================================================
    # SALVAMENTO DE MOVIMENTAÇÕES
    # ========================================================================
    
    movimentos = resultado.get('movimentos', [])
    inseridas, duplicadas, novas_movimentacoes = salvar_movimentacoes(
        conn, processo_id, workspace_id, movimentos
    )
    
    # ========================================================================
    # CRIAÇÃO DE ALERTAS (Se houver novas movimentações)
    # ========================================================================
    
    alertas_criados = 0
    if novas_movimentacoes:
        alertas_criados = criar_alertas(
            conn, processo_id, workspace_id,
            numero_processo, novas_movimentacoes
        )
    
    # ========================================================================
    # ATUALIZAÇÃO DA DATA DE ÚLTIMA VERIFICAÇÃO
    # ========================================================================
    
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE processo_monitor_config
            SET ultima_verificacao = ?,
                total_movimentacoes = total_movimentacoes + ?
            WHERE processo_id = ?
        ''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            inseridas,
            processo_id
        ))
        conn.commit()
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar config: {e}")
    
    # ========================================================================
    # REGISTRO DE LOG
    # ========================================================================
    
    registrar_log_consulta(
        conn, processo_id, workspace_id, numero_processo,
        tribunal, 'sucesso', len(movimentos), inseridas,
        resultado.get('tiempo_resposta_ms', 0), None
    )
    
    # ========================================================================
    # RETORNO COM ESTATÍSTICAS
    # ========================================================================
    
    logger.info(f"✅ Processamento completado!")
    
    return {
        'sucesso': True,
        'processo_id': processo_id,
        'numero_processo': numero_processo,
        'tribunal': tribunal,
        'movimentos_encontrados': len(movimentos),
        'movimentos_novos': inseridas,
        'movimentos_duplicados': duplicadas,
        'alertas_criados': alertas_criados,
        'tempo_resposta_ms': resultado.get('tiempo_resposta_ms', 0)
    }


# ============================================================================
# FUNÇÃO PRINCIPAL: EXECUTAR WORKER
# ============================================================================

def executar_monitoramento_datajud() -> Dict[str, Any]:
    """
    🤖 FUNÇÃO PRINCIPAL DO WORKER
    
    Executa o ciclo completo de monitoramento:
    1. Conecta ao banco de dados
    2. Busca processos marcados para monitoramento
    3. Processa cada um: API → DB → Alertas
    4. Retorna estatísticas
    
    💡 INVOCAÇÃO:
    - Agendada via APScheduler (08:00 e 17:30)
    - E em app.py: scheduler.add_job(executar_monitoramento_datajud, ...)
    
    ⚡ PERFORMANCE:
    - Execução: ~2-10 segundos por processo
    - Não bloqueia aplicação principal
    - Logging detalhado para debugging
    - Rate limiting integrado
    
    Returns:
        Dict com:
        - sucesso: bool
        - timestamp: str
        - processos_processados: int
        - processos_com_atualizacoes: int
        - total_movimentacoes_novas: int
        - total_alertas_criados: int
        - erros: int
        - tempo_total_ms: int
    """
    
    import time
    tempo_inicio = time.time()
    
    logger.info("\n" + "="*70)
    logger.info("🚀 INICIANDO MONITORAMENTO DATAJUD")
    logger.info(f"⏰ Timestamp: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info("="*70)
    
    # ========================================================================
    # VALIDAÇÃO PRÉ-EXECUÇÃO
    # ========================================================================
    
    if not DATAJUD_API_KEY:
        logger.error("❌ API Key não configurada!")
        logger.error("Configure: export DATAJUD_API_KEY='sua_chave'")
        return {
            'sucesso': False,
            'erro': 'API Key não configurada',
            'timestamp': datetime.now().isoformat()
        }
    
    # ========================================================================
    # CONEXÃO COM BANCO
    # ========================================================================
    
    try:
        conn = get_db_connection()
    except Exception as e:
        logger.error(f"❌ Erro ao conectar no banco: {e}")
        return {
            'sucesso': False,
            'erro': f'Erro de conexão: {e}',
            'timestamp': datetime.now().isoformat()
        }
    
    try:
        # ====================================================================
        # BUSCA PROCESSOS PARA MONITORAR
        # ====================================================================
        
        cursor = conn.cursor()
        
        # Busca processos onde:
        # - monitorar_datajud = 1 (marcado para monitorar)
        # - Ordena por última verificação (mais antigas primeiro)
        
        cursor.execute('''
            SELECT 
                p.id as processo_id,
                p.numero,
                p.numero_cnj,
                p.workspace_id,
                pmc.ultima_verificacao
            FROM processos p
            LEFT JOIN processo_monitor_config pmc ON p.id = pmc.processo_id
            WHERE pmc.monitorar_datajud = 1
            ORDER BY pmc.ultima_verificacao ASC NULLS FIRST
        ''')
        
        processos = cursor.fetchall()
        
        if not processos:
            logger.warning("⚠️  Nenhum processo marcado para monitoramento")
            return {
                'sucesso': True,
                'processos_processados': 0,
                'mensagem': 'Nenhum processo para monitorar',
                'timestamp': datetime.now().isoformat()
            }
        
        logger.info(f"📋 {len(processos)} processo(s) para processar")
        
        # ====================================================================
        # PROCESSAMENTO DE CADA PROCESSO
        # ====================================================================
        
        processos_com_atualizacoes = 0
        total_movimentacoes_novas = 0
        total_alertas_criados = 0
        erros = 0
        resultados = []
        
        for i, processo in enumerate(processos, 1):
            logger.info(f"\n[{i}/{len(processos)}] Processando...")
            
            resultado = processar_processo(processo, conn)
            
            if resultado['sucesso']:
                movimentos_novos = resultado.get('movimentos_novos', 0)
                if movimentos_novos > 0:
                    processos_com_atualizacoes += 1
                total_movimentacoes_novas += movimentos_novos
                total_alertas_criados += resultado.get('alertas_criados', 0)
            else:
                erros += 1
            
            resultados.append(resultado)
        
        # ====================================================================
        # RESUMO FINAL
        # ====================================================================
        
        tempo_total_ms = int((time.time() - tempo_inicio) * 1000)
        
        logger.info("\n" + "="*70)
        logger.info("📊 RESUMO DO MONITORAMENTO")
        logger.info("="*70)
        logger.info(f"✅ Processos processados: {len(processos)}")
        logger.info(f"🔄 Com atualizações: {processos_com_atualizacoes}")
        logger.info(f"📨 Movimentações novas: {total_movimentacoes_novas}")
        logger.info(f"🔔 Alertas criados: {total_alertas_criados}")
        logger.info(f"❌ Erros: {erros}")
        logger.info(f"⏱️  Tempo total: {tempo_total_ms}ms ({tempo_total_ms/1000:.2f}s)")
        logger.info("="*70 + "\n")
        
        return {
            'sucesso': True,
            'timestamp': datetime.now().isoformat(),
            'processos_processados': len(processos),
            'processos_com_atualizacoes': processos_com_atualizacoes,
            'total_movimentacoes_novas': total_movimentacoes_novas,
            'total_alertas_criados': total_alertas_criados,
            'erros': erros,
            'tempo_total_ms': tempo_total_ms,
            'resultados_detalhados': resultados
        }
    
    except Exception as e:
        logger.exception(f"❌ Erro geral na execução: {e}")
        return {
            'sucesso': False,
            'erro': str(e),
            'timestamp': datetime.now().isoformat()
        }
    
    finally:
        conn.close()


# ============================================================================
# TESTE LOCAL
# ============================================================================

if __name__ == '__main__':
    """
    Script de teste local para validar o worker
    
    Uso:
        cd /caminho/para/juris/app
        export DATAJUD_API_KEY='sua_chave_aqui'
        python datajud_worker.py
    """
    
    resultado = executar_monitoramento_datajud()
    print("\n" + json.dumps(resultado, indent=2, ensure_ascii=False))
