import { api } from './api';

export const generateWhatsAppLink = (phone: string, message?: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const text = message ? encodeURIComponent(message) : '';
  return `https://wa.me/55${cleanPhone}${text ? '?text=' + text : ''}`;
};

export const whatsapp = {
  generateLink: (processoId: number, params?: { tipo?: string; phone?: string }) =>
    api.get(`/processos/${processoId}/whatsapp`, { params }),
};
