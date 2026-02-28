import { api } from './api';

export interface WhatsAppStatus {
  configurado: boolean;
  provider: string;
  connected: boolean;
  conectado?: boolean;
  workspace_enabled?: boolean;
  display_name?: string | null;
  phone_number?: string | null;
  user_id?: number;
  state?: string;
  estado?: string;
  error?: string;
  erro?: string;
  has_qrcode?: boolean;
}

export interface QRCodeResponse {
  sucesso: boolean;
  qrcode?: string | null;
  erro?: string;
  pending?: boolean;
  connected?: boolean;
  state?: string;
  mensagem?: string;
}

export interface EnviarMensagemRequest {
  telefone: string;
  mensagem: string;
  tipo: 'texto' | 'documento';
}

export interface EnviarMensagemResponse {
  sucesso: boolean;
  message_id?: string;
  timestamp?: string;
  modo?: string;
  url_wame?: string;
  erro?: string;
}

export interface WorkspaceContato {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  alerta_whatsapp: number | boolean;
}

export interface WorkspaceEnvioResponse {
  sucesso: boolean;
  total: number;
  processados?: number;
  enviados: number;
  confirmados?: number;
  pendentes_confirmacao?: number;
  falhas: number;
  warning?: string;
  resultados: Array<{
    id?: number;
    nome?: string;
    telefone?: string | null;
    sucesso: boolean;
    erro?: string;
    message_id?: string;
    modo?: string;
    url_wame?: string;
    recipient_jid?: string | null;
    delivery_confirmed?: boolean | null;
    recipient_exists?: boolean | null;
    ack_status?: string | number | null;
    ack_source?: string | null;
    ack_timestamp?: string | null;
    warning?: string | null;
  }>;
}

export interface WhatsAppEnvioPersonalizadoPayload {
  mensagem: string;
  destino: 'cliente' | 'equipe' | 'telefone';
  cliente_id?: number;
  telefone?: string;
  user_ids?: number[];
  somente_alerta_whatsapp?: boolean;
}

export interface WhatsAppInboxConversation {
  id: number;
  workspace_id: number;
  phone: string;
  client_id?: number | null;
  cliente_nome?: string | null;
  status: 'novo' | 'aguardando' | 'resolvido';
  unread_count: number;
  first_inbound_at?: string | null;
  last_inbound_at?: string | null;
  first_response_at?: string | null;
  last_outbound_at?: string | null;
  last_message_text?: string | null;
  last_message_direction?: 'inbound' | 'outbound' | null;
  last_message_at?: string | null;
  resolved_at?: string | null;
  assigned_user_id?: number | null;
  assigned_user_nome?: string | null;
  sla_minutes?: number | null;
  sla_label?: string;
  sla_level?: 'ok' | 'attention' | 'critical' | 'resolved';
  response_minutes?: number | null;
  response_label?: string;
}

export interface WhatsAppInboxMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  sender_phone?: string | null;
  recipient_phone?: string | null;
  message_text?: string | null;
  status?: string | null;
  created_at: string;
  provider_message_id?: string | null;
}

export interface WhatsAppCampaign {
  id: number;
  mensagem: string;
  workspace_ids: number[];
  somente_admins: boolean;
  scheduled_for: string;
  status: 'pendente' | 'processando' | 'enviado' | 'parcial' | 'falhou' | 'cancelado';
  result_summary?: {
    total?: number;
    processados?: number;
    enviados?: number;
    confirmados?: number;
    pendentes_confirmacao?: number;
    falhas?: number;
  };
  last_error?: string | null;
  processed_at?: string | null;
  created_by?: number | null;
  created_by_nome?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppAutomacaoConfig {
  sender_user_id?: number | null;
  auto_nova_movimentacao: boolean;
  auto_novo_prazo: boolean;
  auto_lembrete_prazo: boolean;
  auto_nova_tarefa: boolean;
  reminder_days: string;
  auto_resumo_diario: boolean;
  daily_summary_time: string;
  ai_generate_messages: boolean;
  ai_prompt?: string;
}

export interface WhatsAppAutomacaoUser {
  id: number;
  nome: string;
  email: string;
  role: string;
  telefone?: string;
  alerta_whatsapp?: boolean | number;
}

export interface WhatsAppSenderStatus {
  connected?: boolean;
  conectado?: boolean;
  state?: string;
  estado?: string;
  error?: string;
  erro?: string;
}

export interface WhatsAppPlatformConfig {
  id?: number;
  session_key?: string;
  display_name?: string | null;
  phone_number?: string | null;
  enabled?: boolean;
  updated_by?: number | null;
  updated_at?: string | null;
}

export const whatsapp = {
  // Inicializa conexão da sessão do usuário
  connect: () => api.post<{ sucesso: boolean; estado?: string; connected?: boolean }>('/whatsapp/conectar'),

  // Status da conexão
  getStatus: () => api.get<WhatsAppStatus>('/whatsapp/status'),

  // QR Code para conexão
  getQRCode: () => api.get<QRCodeResponse>('/whatsapp/qrcode'),

  // Desconectar instância
  desconectar: () => api.post<{ sucesso: boolean; erro?: string }>('/whatsapp/desconectar'),

  // Enviar mensagem genérica
  enviarMensagem: (data: EnviarMensagemRequest) =>
    api.post<EnviarMensagemResponse>('/whatsapp/enviar', data),

  // Enviar mensagem manual usando a sessão conectada do próprio usuário
  enviarMensagemPersonalizada: (payload: WhatsAppEnvioPersonalizadoPayload) =>
    api.post<
      WorkspaceEnvioResponse & {
        erro?: string;
      }
    >('/whatsapp/enviar-personalizado', payload),

  // Enviar mensagem para cliente do processo
  enviarProcesso: (
    processoId: number,
    payload?: {
      mensagem?: string;
      destino?: 'cliente' | 'equipe' | 'telefone';
      telefone?: string;
      somente_alerta_whatsapp?: boolean;
    }
  ) =>
    api.post<EnviarMensagemResponse | WorkspaceEnvioResponse>(`/processos/${processoId}/whatsapp/enviar`, {
      ...payload
    }),

  // Enviar boas-vindas para cliente
  enviarBoasVindas: (clienteId: number) =>
    api.post<{ sucesso: boolean; mensagem: string }>(`/clientes/${clienteId}/whatsapp/boasvindas`),

  // Preparar compartilhamento de tarefa
  prepararTarefa: (tarefaId: number) =>
    api.get<{ mensagem: string; link?: string; responsavel?: { nome?: string; email?: string; telefone?: string } }>(`/tarefas/${tarefaId}/whatsapp`),

  // Enviar tarefa via WhatsApp
  enviarTarefa: (
    tarefaId: number,
    payload?: {
      mensagem?: string;
      destino?: 'responsavel' | 'equipe' | 'telefone';
      telefone?: string;
      somente_alerta_whatsapp?: boolean;
    }
  ) => api.post<EnviarMensagemResponse | WorkspaceEnvioResponse>(`/tarefas/${tarefaId}/whatsapp/enviar`, payload || {}),

  // Preparar movimentação para WhatsApp
  prepararMovimentacao: (processoId: number, movimentacaoId: number) =>
    api.get<{ mensagem: string; link?: string; movimentacao: any; cliente?: { nome?: string; telefone?: string } }>(
      `/processos/${processoId}/movimentacoes/${movimentacaoId}/whatsapp`
    ),

  // Enviar movimentação específica
  enviarMovimentacao: (
    processoId: number,
    movimentacaoId: number,
    payload?: {
      mensagem?: string;
      destino?: 'cliente' | 'equipe' | 'telefone';
      telefone?: string;
      somente_alerta_whatsapp?: boolean;
    }
  ) => api.post<EnviarMensagemResponse | WorkspaceEnvioResponse>(
    `/processos/${processoId}/movimentacoes/${movimentacaoId}/whatsapp/enviar`,
    payload || {}
  ),

  // Enviar última movimentação
  enviarUltimaMovimentacao: (
    processoId: number,
    payload?: {
      mensagem?: string;
      destino?: 'cliente' | 'equipe' | 'telefone';
      telefone?: string;
      somente_alerta_whatsapp?: boolean;
    }
  ) => api.post<EnviarMensagemResponse | WorkspaceEnvioResponse>(
    `/processos/${processoId}/movimentacoes/ultima/whatsapp/enviar`,
    payload || {}
  ),

  // Listar integrantes com telefone
  listarContatosWorkspace: (somente_alerta_whatsapp = false) =>
    api.get<{ sucesso: boolean; total: number; contatos: WorkspaceContato[] }>(
      `/whatsapp/workspace/contatos?somente_alerta_whatsapp=${somente_alerta_whatsapp}`
    ),

  // Enviar mensagem para integrantes do workspace
  enviarParaWorkspace: (payload: {
    mensagem: string;
    user_ids?: number[];
    somente_alerta_whatsapp?: boolean;
  }) => api.post<WorkspaceEnvioResponse>('/whatsapp/workspace/enviar', payload),

  // Caixa de entrada WhatsApp
  listarInboxConversas: (params?: {
    status?: 'novo' | 'aguardando' | 'resolvido';
    search?: string;
    limit?: number;
  }) =>
    api.get<{ sucesso: boolean; total: number; conversas: WhatsAppInboxConversation[] }>(
      '/whatsapp/inbox/conversas',
      { params }
    ),

  listarInboxMensagens: (conversationId: number, limit = 80) =>
    api.get<{ sucesso: boolean; mensagens: WhatsAppInboxMessage[] }>(
      `/whatsapp/inbox/conversas/${conversationId}/mensagens`,
      { params: { limit } }
    ),

  atualizarInboxStatus: (
    conversationId: number,
    status: 'novo' | 'aguardando' | 'resolvido'
  ) =>
    api.put<{ sucesso: boolean; conversa: WhatsAppInboxConversation }>(
      `/whatsapp/inbox/conversas/${conversationId}/status`,
      { status }
    ),

  // Configuração de automações por workspace
  getAutomacoesConfig: () =>
    api.get<{
      sucesso: boolean;
      is_admin: boolean;
      config: WhatsAppAutomacaoConfig;
      usuarios: WhatsAppAutomacaoUser[];
      sender_status?: WhatsAppSenderStatus | null;
    }>('/whatsapp/automacoes/config'),

  updateAutomacoesConfig: (payload: Partial<WhatsAppAutomacaoConfig>) =>
    api.put<{ sucesso: boolean; config: WhatsAppAutomacaoConfig }>('/whatsapp/automacoes/config', payload),

  // Envia resumo diário de teste
  enviarResumoTeste: () =>
    api.post<{
      sucesso: boolean;
      test_mode?: string;
      destinatarios?: Array<{
        id?: number;
        nome?: string;
        telefone?: string | null;
      }>;
      processados?: number;
      enviados?: number;
      confirmados?: number;
      pendentes_confirmacao?: number;
      falhas?: number;
      total?: number;
      warning?: string;
      error?: string;
      resultados?: WorkspaceEnvioResponse['resultados'];
    }>('/whatsapp/automacoes/teste-resumo'),

  // Sugere texto com IA
  gerarMensagemIA: (payload: {
    objetivo?: string;
    mensagem_base?: string;
    contexto?: string;
    ai_prompt?: string;
  }) =>
    api.post<{
      sucesso: boolean;
      mensagem: string;
      ia_disponivel: boolean;
    }>('/whatsapp/automacoes/preview-ia', payload),
};

export const whatsappPlatform = {
  getConfig: () =>
    api.get<{ sucesso: boolean; config: WhatsAppPlatformConfig }>('/admin/whatsapp-platform/config'),
  updateConfig: (payload: Partial<WhatsAppPlatformConfig>) =>
    api.put<{ sucesso: boolean; config: WhatsAppPlatformConfig }>(
      '/admin/whatsapp-platform/config',
      payload
    ),
  status: () =>
    api.get<{
      sucesso: boolean;
      connected?: boolean;
      state?: string;
      configurado?: boolean;
      provider?: string;
      config?: WhatsAppPlatformConfig;
    }>('/admin/whatsapp-platform/status'),
  connect: () => api.post<{ sucesso: boolean; estado?: string; connected?: boolean }>('/admin/whatsapp-platform/connect'),
  getQRCode: () => api.get<QRCodeResponse>('/admin/whatsapp-platform/qrcode'),
  disconnect: () => api.post<{ sucesso: boolean; erro?: string }>('/admin/whatsapp-platform/disconnect'),
  enviarAviso: (payload: {
    mensagem: string;
    workspace_ids?: number[];
    somente_admins?: boolean;
  }) =>
    api.post<
      WorkspaceEnvioResponse & {
        filtros?: {
          workspace_ids?: number[];
          somente_admins?: boolean;
        };
        erro?: string;
      }
    >('/admin/whatsapp-platform/enviar-aviso', payload),
  listarCampanhas: (params?: { status?: string; limit?: number }) =>
    api.get<{ sucesso: boolean; campanhas: WhatsAppCampaign[] }>(
      '/admin/whatsapp-platform/campanhas',
      { params }
    ),
  agendarCampanha: (payload: {
    mensagem: string;
    scheduled_for: string;
    workspace_ids?: number[];
    somente_admins?: boolean;
  }) =>
    api.post<{ sucesso: boolean; campanha: WhatsAppCampaign }>(
      '/admin/whatsapp-platform/campanhas',
      payload
    ),
  cancelarCampanha: (campaignId: number) =>
    api.post<{ sucesso: boolean; erro?: string }>(
      `/admin/whatsapp-platform/campanhas/${campaignId}/cancelar`
    ),
};
