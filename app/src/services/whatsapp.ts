import { api } from './api';

export interface WhatsAppStatus {
  configurado: boolean;
  provider: string;
  connected: boolean;
  conectado?: boolean;
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
  enviados: number;
  falhas: number;
  resultados: Array<{
    id?: number;
    nome?: string;
    telefone?: string | null;
    sucesso: boolean;
    erro?: string;
    message_id?: string;
    modo?: string;
    url_wame?: string;
  }>;
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
};
