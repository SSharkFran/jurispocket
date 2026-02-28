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
  updateProfile: (data: Partial<{ nome: string; telefone: string; alerta_email: boolean; alerta_whatsapp: boolean; resumo_diario: boolean }>) =>
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
  normalize: (prazo: any) => ({
    ...prazo,
    data_final: prazo?.data_final || prazo?.data_prazo,
    data_prazo: prazo?.data_prazo || prazo?.data_final,
    prioridade: prazo?.prioridade || 'media',
  }),
  list: (params?: { status?: string; processo_id?: number }) =>
    api.get('/prazos', { params }).then((response) => ({
      ...response,
      data: Array.isArray(response.data)
        ? response.data.map((prazo) => prazos.normalize(prazo))
        : response.data,
    })),
  create: (data: { processo_id: number; descricao: string; data_final: string; prioridade: 'baixa' | 'media' | 'alta' | 'urgente'; tipo?: string }) =>
    api.post('/prazos', {
      ...data,
      data_prazo: data.data_final,
    }).then((response) => ({
      ...response,
      data: prazos.normalize(response.data),
    })),
  marcarCumprido: (id: number) => api.put(`/prazos/${id}/cumprido`),
};

export const tarefas = {
  list: (params?: { status?: string; processo_id?: number; assigned_to?: number; atribuido_a?: number }) =>
    api.get('/tarefas', { params }),
  get: (id: number) => api.get(`/tarefas/${id}`),
  create: (data: { titulo: string; descricao?: string; prioridade: 'baixa' | 'media' | 'alta' | 'urgente'; processo_id?: number; data_vencimento?: string; assigned_to?: number; atribuido_a?: number }) =>
    api.post('/tarefas', data),
  update: (id: number, data: Pick<{ status?: 'pendente' | 'em_andamento' | 'concluida' }, 'status'>) =>
    api.put(`/tarefas/${id}`, data),
  delete: (id: number) => api.delete(`/tarefas/${id}`),
  getWhatsAppLink: (id: number, params?: { phone?: string }) =>
    api.get(`/tarefas/${id}/whatsapp`, { params }),
};

export const documentos = {
  list: (params?: { processo_id?: number; cliente_id?: number; categoria?: string; search?: string }) =>
    api.get('/documentos', { params }),
  upload: (formData: FormData) =>
    api.post('/documentos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (id: number) => api.get(`/documentos/${id}/download`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/documentos/${id}`),
  getCategorias: () => api.get('/documentos/categorias'),
};

export const financeiro = {
  resumo: (periodo?: string) => api.get('/financeiro/resumo', { params: { periodo } }),
  listTransacoes: (params?: { tipo?: string; processo_id?: number; mes?: string }) =>
    api.get('/financeiro', { params }),
  createTransacao: (data: { tipo: 'entrada' | 'saida'; descricao: string; valor: number; categoria?: string; processo_id?: number; data_transacao?: string }) =>
    api.post('/financeiro', { ...data, data: data.data_transacao }),
  updateTransacao: (id: number, data: Partial<{ tipo: 'entrada' | 'saida'; descricao: string; valor: number; categoria?: string; processo_id?: number; data_transacao?: string; status?: string }>) =>
    api.put(`/financeiro/${id}`, data.data_transacao ? { ...data, data: data.data_transacao } : data),
  deleteTransacao: (id: number) => api.delete(`/financeiro/${id}`),
  // Documentos
  listDocumentos: (transacaoId: number) =>
    api.get(`/financeiro/${transacaoId}/documentos`),
  uploadDocumento: (transacaoId: number, file: File, nome?: string, descricao?: string) => {
    const formData = new FormData();
    formData.append('documento', file);
    if (nome) formData.append('nome', nome);
    if (descricao) formData.append('descricao', descricao);
    return api.post(`/financeiro/${transacaoId}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDocumento: (_transacaoId: number, docId: number) =>
    documentos.delete(docId),
  downloadDocumento: (_transacaoId: number, docId: number) =>
    documentos.download(docId),
  // Extrato mensal - stub
  getExtrato: (mes: string) =>
    Promise.reject(new Error('Extrato mensal não implementado')),
  downloadComprovantesMes: (mes: string) =>
    Promise.reject(new Error('Download de comprovantes não implementado')),
};

export const notificacoes = {
  list: () => api.get('/notificacoes'),
  marcarLida: (id: number) => api.put(`/notificacoes/${id}/ler`),
  marcarTodasLidas: () => api.put('/notificacoes/ler-todas'),
};

export const equipe = {
  list: () => api.get('/equipe'),
  convidar: (data: { email: string; role?: string }) => api.post('/equipe/convidar', data),
  convitesPendentes: () => api.get('/equipe/convites'),
  cancelarConvite: (id: number) => api.delete(`/equipe/convites/${id}`),
  removerMembro: (userId: number) => api.delete(`/equipe/membros/${userId}`),
  atualizarRole: (userId: number, role: string) => api.put(`/equipe/membros/${userId}/role`, { role }),
  responderConvite: (token: string, aceitar: boolean) =>
    api.post(`/equipe/responder-convite/${token}`, { aceitar }),
};

export const dashboard = {
  get: () => api.get('/dashboard'),
};

export const ia = {
  chat: (mensagem: string, sessionId?: string) =>
    api.post('/ia/chat', { mensagem, session_id: sessionId }),
  historico: (sessionId?: string) =>
    api.get('/ia/historico', { params: { session_id: sessionId } }),
  auditoria: (params?: { status?: string; limit?: number }) =>
    api.get('/ia/auditoria', { params }),
};

export const admin = {
  // Dashboard
  estatisticas: () => api.get('/admin/estatisticas'),
  
  // Usuários
  listarUsuarios: (params?: { search?: string; page?: number; per_page?: number; status?: string }) => 
    api.get('/admin/usuarios', { params }),
  obterUsuario: (id: number) => api.get(`/admin/usuarios/${id}`),
  atualizarUsuario: (id: number, data: any) => api.put(`/admin/usuarios/${id}`, data),
  resetarSenha: (id: number, senha?: string) => api.post(`/admin/usuarios/${id}/reset-senha`, { senha }),
  excluirUsuario: (id: number) => api.delete(`/admin/usuarios/${id}`),
  impersonate: (id: number) => api.post(`/admin/impersonate/${id}`),
  
  // Planos
  listarPlanos: () => api.get('/admin/planos'),
  criarPlano: (data: any) => api.post('/admin/planos', data),
  atualizarPlano: (id: number, data: any) => api.put(`/admin/planos/${id}`, data),
  
  // Assinaturas
  listarAssinaturas: () => api.get('/admin/assinaturas'),
  criarAssinatura: (data: any) => api.post('/admin/assinaturas', data),
  
  // Cupons
  listarCupons: () => api.get('/admin/cupons'),
  criarCupom: (data: any) => api.post('/admin/cupons', data),
  atualizarCupom: (id: number, data: any) => api.put(`/admin/cupons/${id}`, data),
  
  // Configurações
  listarConfiguracoes: () => api.get('/admin/configuracoes'),
  atualizarConfiguracao: (chave: string, data: any) => api.put(`/admin/configuracoes/${chave}`, data),
  
  // Auditoria
  listarAuditoria: (params?: { entidade?: string; acao?: string; page?: number; per_page?: number }) => 
    api.get('/admin/auditoria', { params }),
  
  // Backup
  exportarBackup: () => api.get('/admin/backup', { responseType: 'blob' }),
  verificarBackup: (formData: FormData) => api.post('/admin/backup/verificar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  restaurarBackup: (data: { backup: any; opcoes: any }) => api.post('/admin/backup/restaurar', data),
  statusBackupAutomatico: () => api.get('/admin/backup/automatico'),
  
  workspaces: () => api.get('/admin/workspaces'),
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

export { api };
export default api;
