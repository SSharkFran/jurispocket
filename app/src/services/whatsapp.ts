import { api } from './api';

export interface WhatsAppStatus {
  configurado: boolean;
  provider: string;
  connected: boolean;
  conectado?: boolean;
  state?: string;
  estado?: string;
  error?: string;
  erro?: string;
}

export interface QRCodeResponse {
  sucesso: boolean;
  qrcode?: string;
  erro?: string;
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
  erro?: string;
}

export const whatsapp = {
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
  enviarProcesso: (processoId: number, mensagem?: string) =>
    api.post<EnviarMensagemResponse>(`/processos/${processoId}/whatsapp/enviar`, {
      mensagem
    }),

  // Enviar boas-vindas para cliente
  enviarBoasVindas: (clienteId: number) =>
    api.post<{ sucesso: boolean; mensagem: string }>(`/clientes/${clienteId}/whatsapp/boasvindas`)
};
