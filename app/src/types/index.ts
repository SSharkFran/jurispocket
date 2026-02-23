export interface User {
  id: number;
  email: string;
  nome: string;
  role: 'user' | 'admin' | 'superadmin';
  oab?: string;
  telefone?: string;
  alerta_email?: boolean;
  alerta_whatsapp?: boolean;
  avatar_url?: string;
  workspace_id: number;
}

export interface Workspace {
  id: number;
  nome: string;
  slug: string;
  plano: 'free' | 'pro' | 'enterprise';
  max_users: number;
  max_processos: number;
  max_storage_mb: number;
}

export interface Cliente {
  id: number;
  workspace_id: number;
  nome: string;
  email?: string;
  telefone?: string;
  phone?: string; // compatibilidade legacy
  cpf_cnpj?: string;
  rg_ie?: string;
  data_nascimento?: string;
  nacionalidade?: string;
  estado_civil?: string;
  profissao?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  created_at: string;
  total_processos?: number;
  processos_count?: number; // compatibilidade
}

export interface MovimentacaoDatajud {
  id: number;
  processo_id: number;
  codigo_movimento: number;
  nome_movimento: string;
  data_movimento: string;
  complementos?: string;
  fonte?: string;
  lida?: boolean;
  created_at?: string;
}

export interface Processo {
  id: number;
  workspace_id: number;
  cliente_id?: number;
  cliente_nome?: string;
  numero: string;
  numero_cnj?: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  status: 'ativo' | 'arquivado' | 'suspenso';
  fase: string;
  valor_causa?: number;
  tags: string[];
  tribunal_codigo?: string;
  tribunal_nome?: string;
  tribunal_uf?: string;
  ultima_movimentacao?: string;
  tarefas_pendentes_count?: number;
  tem_tarefas_pendentes?: boolean;
  movimentacoes_novas?: number;
  data_ultima_movimentacao?: string;
  ultima_verificacao?: string;
  sincronizacao_status?: string;
  data_abertura?: string;
  data_encerramento?: string;
  created_at: string;
  total_prazos?: number;
  prazos_pendentes?: number;
  // Campos Datajud
  movimentacoes_datajud?: MovimentacaoDatajud[];
  movimentacoes_novas_count?: number;
  ultima_movimentacao_datajud?: MovimentacaoDatajud;
  ultima_movimentacao_nova?: boolean;
  monitoramento?: {
    monitorar_datajud: boolean;
    frequencia_verificacao?: string;
    ultima_verificacao?: string;
    total_movimentacoes?: number;
  };
}

export interface Prazo {
  id: number;
  processo_id: number;
  workspace_id: number;
  tipo: string;
  descricao: string;
  data_inicial?: string;
  data_final: string;
  data_cumprimento?: string;
  status: 'pendente' | 'cumprido' | 'vencido';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  responsavel_id?: number;
  responsavel_nome?: string;
  observacoes?: string;
  notificado?: boolean;
  processo_numero?: string;
  processo_titulo?: string;
}

export interface Tarefa {
  id: number;
  workspace_id: number;
  processo_id?: number;
  criado_por: number;
  criado_por_nome?: string;
  atribuido_a?: number;
  atribuido_a_nome?: string;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  data_vencimento?: string;
  data_conclusao?: string;
  created_at: string;
  processo_numero?: string;
}

export interface Documento {
  id: number;
  processo_id: number;
  workspace_id: number;
  nome: string;
  tipo?: string;
  tamanho?: number;
  caminho: string;
  categoria: string;
  created_by?: number;
  created_by_nome?: string;
  created_at: string;
}

export interface FinanceiroDocumento {
  id: number;
  financeiro_id: number;
  nome_arquivo: string;
  caminho_arquivo: string;
  tipo_arquivo: string;
  tamanho: number;
  created_at: string;
}

export interface TransacaoFinanceira {
  id: number;
  workspace_id: number;
  processo_id?: number;
  cliente_id?: number;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  data_transacao: string;
  forma_pagamento?: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'pago' | 'recebido';
  processo_numero?: string;
  cliente_nome?: string;
  documentos?: FinanceiroDocumento[];
}

export interface PJeMonitorConfig {
  id: number;
  workspace_id: number;
  processo_id: number;
  ativo: boolean;
  ultima_verificacao?: string;
  ultima_movimentacao?: string;
  data_ultima_movimentacao?: string;
  frequencia_horas: number;
  notificar_novas_movimentacoes: boolean;
}

export interface Notificacao {
  id: number;
  user_id: number;
  workspace_id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  created_at: string;
}

export interface Convite {
  id: number;
  workspace_id: number;
  workspace_nome?: string;
  email: string;
  role: string;
  token: string;
  status: 'pendente' | 'aceito' | 'recusado';
  invited_by?: number;
  invited_by_nome?: string;
  accepted_at?: string;
  created_at: string;
}

export interface DashboardData {
  estatisticas: {
    total_processos: number;
    processos_ativos: number;
    total_clientes: number;
    prazos_pendentes: number;
    prazos_vencidos: number;
    minhas_tarefas: number;
  };
  financeiro: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
  proximos_prazos: Prazo[];
  minhas_tarefas: Tarefa[];
  processos_movimentacao: Processo[];
}

export interface ConversaIA {
  id: number;
  session_id: string;
  mensagem_usuario: string;
  resposta_ia: string;
  funcoes_chamadas?: string;
  created_at: string;
}
