import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Só redireciona se não estiver já na página de login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; nome: string; phone?: string }) =>
    api.post('/auth/register', { 
      email: data.email, 
      password: data.password, 
      nome: data.nome, 
      telefone: data.phone 
    }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: Partial<{ nome: string; telefone: string; alerta_email: boolean; alerta_whatsapp: boolean }>) =>
    api.put('/auth/me', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: () => api.delete('/auth/avatar'),
};

export const clientes = {
  list: (search?: string) => api.get('/clientes', { params: { search } }),
  get: (id: number) => api.get(`/clientes/${id}`),
  create: (data: Partial<{ nome: string; email?: string; phone?: string; cpf_cnpj?: string }>) => api.post('/clientes', data),
  update: (id: number, data: Partial<{ nome: string; email?: string; phone?: string }>) => api.put(`/clientes/${id}`, data),
  delete: (id: number) => api.delete(`/clientes/${id}`),
};

export const processos = {
  list: (params?: { status?: string; search?: string; cliente_id?: number }) =>
    api.get('/processos', { params }),
  get: (id: number) => api.get(`/processos/${id}`),
  create: (data: Partial<{ numero: string; numero_cnj?: string; titulo: string; cliente_id?: number; tipo?: string; valor_causa?: number; data_abertura?: string; descricao?: string }>) => 
    api.post('/processos', data),
  update: (id: number, data: Partial<{ titulo?: string; status?: string; fase?: string; descricao?: string; tipo?: string; valor_causa?: number; ultimo_movimento?: string; ultimo_movimento_data?: string }>) => api.put(`/processos/${id}`, data),
  delete: (id: number) => api.delete(`/processos/${id}`),
  consultarPJe: (id: number) => api.post(`/processos/${id}/pje/consultar`),
  extrairMovimentacaoHtml: (id: number, html: string) => api.post(`/processos/${id}/pje/extrair-html`, { html }),
  getWhatsAppLink: (id: number, params?: { tipo?: string; phone?: string }) =>
    api.get(`/processos/${id}/whatsapp`, { params }),
  // Datajud
  consultarDatajud: (id: number) => api.post(`/processos/${id}/consultar-datajud`),
  marcarMovimentacoesLidas: (id: number) => api.post(`/processos/${id}/movimentacoes/lidas`),
  getPJeUrl: (id: number) => api.get(`/processos/${id}/pje-url`),
  // Link público
  gerarLinkPublico: (id: number) => api.post(`/processos/${id}/link-publico`),
  desativarLinkPublico: (id: number) => api.delete(`/processos/${id}/link-publico`),
  getLinkPublico: (id: number) => api.get(`/processos/${id}/link-publico`),
};

export const prazos = {
  list: (params?: { status?: string; processo_id?: number }) =>
    api.get('/prazos', { params }),
  create: (data: { processo_id: number; descricao: string; data_final: string; prioridade: 'baixa' | 'media' | 'alta' | 'urgente'; tipo?: string }) =>
    api.post('/prazos', data),
  marcarCumprido: (id: number) => api.put(`/prazos/${id}/cumprido`),
};

export const tarefas = {
  list: (params?: { status?: string; processo_id?: number; atribuido_a?: number }) =>
    api.get('/tarefas', { params }),
  get: (id: number) => api.get(`/tarefas/${id}`),
  create: (data: { titulo: string; descricao?: string; prioridade: 'baixa' | 'media' | 'alta' | 'urgente'; processo_id?: number; data_vencimento?: string; atribuido_a?: number }) =>
    api.post('/tarefas', data),
  update: (id: number, data: Partial<{ titulo?: string; descricao?: string; status?: string; prioridade?: string; data_vencimento?: string; atribuido_a?: number }>) =>
    api.put(`/tarefas/${id}`, data),
  delete: (id: number) => api.delete(`/tarefas/${id}`),
};

export const financeiro = {
  list: (params?: { tipo?: string; processo_id?: number; cliente_id?: number; data_inicio?: string; data_fim?: string }) =>
    api.get('/financeiro', { params }),
  create: (data: { tipo: 'entrada' | 'saida'; descricao: string; valor: number; data_transacao: string; processo_id?: number; cliente_id?: number; categoria?: string }) =>
    api.post('/financeiro', data),
  update: (id: number, data: Partial<{ tipo?: string; descricao?: string; valor?: number; data_transacao?: string; categoria?: string }>) =>
    api.put(`/financeiro/${id}`, data),
  delete: (id: number) => api.delete(`/financeiro/${id}`),
  getResumo: (params?: { data_inicio?: string; data_fim?: string }) =>
    api.get('/financeiro/resumo', { params }),
};

export const documentos = {
  list: (params?: { processo_id?: number; categoria?: string; search?: string }) =>
    api.get('/documentos', { params }),
  get: (id: number) => api.get(`/documentos/${id}`),
  create: (data: FormData) => api.post('/documentos', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: number, data: FormData) => api.put(`/documentos/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: number) => api.delete(`/documentos/${id}`),
  download: (id: number) => api.get(`/documentos/${id}/download`, { responseType: 'blob' }),
};

export const templates = {
  list: () => api.get('/templates'),
  get: (id: number) => api.get(`/templates/${id}`),
  create: (data: { nome: string; descricao?: string; conteudo: string; tipo_arquivo: 'texto' | 'docx'; variaveis?: string[] }) =>
    api.post('/templates', data),
  update: (id: number, data: Partial<{ nome?: string; descricao?: string; conteudo?: string; tipo_arquivo?: 'texto' | 'docx'; variaveis?: string[] }>) =>
    api.put(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
  gerar: (id: number, data: { processo_id: number; formato?: 'json' | 'download' }) =>
    api.post(`/templates/${id}/gerar`, data, { responseType: 'blob' }),
};

export const equipe = {
  list: () => api.get('/equipe'),
  get: (id: number) => api.get(`/equipe/${id}`),
  create: (data: { nome: string; email: string; cargo?: string; telefone?: string }) =>
    api.post('/equipe', data),
  update: (id: number, data: Partial<{ nome?: string; email?: string; cargo?: string; telefone?: string; ativo?: boolean }>) =>
    api.put(`/equipe/${id}`, data),
  delete: (id: number) => api.delete(`/equipe/${id}`),
  convidar: (data: { email: string; cargo?: string }) => api.post('/equipe/convite', data),
};

export default api;
