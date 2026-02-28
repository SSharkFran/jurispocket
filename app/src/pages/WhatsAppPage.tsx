import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  QrCode,
  Settings,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Smartphone,
  Bell,
  Clock3,
  Save,
  Wand2,
  SendHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { whatsapp } from '@/services/whatsapp';
import type {
  WhatsAppStatus,
  WhatsAppAutomacaoConfig,
  WhatsAppSenderStatus,
  WorkspaceContato,
  WhatsAppInboxConversation,
  WhatsAppInboxMessage,
} from '@/services/whatsapp';
import { clientes } from '@/services/api';
import { toast } from 'sonner';

interface ContatoWhatsApp {
  id: number;
  nome: string;
  telefone: string;
}

const normalizeQrCode = (value: string) => {
  if (value.startsWith('data:image')) return value;
  return `data:image/png;base64,${value}`;
};

const QUICK_WHATSAPP_TEMPLATES: Array<{
  id: string;
  titulo: string;
  destino: 'cliente' | 'equipe' | 'telefone';
  mensagem: string;
}> = [
  {
    id: 'followup-cliente',
    titulo: 'Follow-up de processo (cliente)',
    destino: 'cliente',
    mensagem:
      'Ola, {{cliente_nome}}! Estamos acompanhando seu processo e assim que houver novidade relevante, eu te aviso por aqui. Conte com a gente.',
  },
  {
    id: 'prazo-equipe',
    titulo: 'Alerta de prazo (equipe)',
    destino: 'equipe',
    mensagem:
      'Pessoal, lembrete rapido: revisar os prazos do dia e sinalizar qualquer risco de atraso ate 16h.',
  },
  {
    id: 'comunicado-geral',
    titulo: 'Comunicado curto',
    destino: 'telefone',
    mensagem:
      'Aviso rapido: tivemos uma atualizacao importante no sistema. Se precisar de suporte, me chame aqui.',
  },
];

const WhatsAppPage = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [contatos, setContatos] = useState<ContatoWhatsApp[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [automacaoConfig, setAutomacaoConfig] = useState<WhatsAppAutomacaoConfig | null>(null);
  const [platformStatus, setPlatformStatus] = useState<WhatsAppSenderStatus | null>(null);
  const [isAdminWorkspace, setIsAdminWorkspace] = useState(false);
  const [workspaceContatos, setWorkspaceContatos] = useState<WorkspaceContato[]>([]);
  const [isSavingAutomacao, setIsSavingAutomacao] = useState(false);
  const [isEnviandoResumoTeste, setIsEnviandoResumoTeste] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [iaContexto, setIaContexto] = useState('');
  const [iaMensagemGerada, setIaMensagemGerada] = useState('');
  const [isGerandoIA, setIsGerandoIA] = useState(false);
  const [isEnviandoMensagemIa, setIsEnviandoMensagemIa] = useState(false);
  const [destinoEnvioIa, setDestinoEnvioIa] = useState<'cliente' | 'equipe' | 'telefone'>('cliente');
  const [clienteDestinoId, setClienteDestinoId] = useState<string>('');
  const [equipeSelecionadaIds, setEquipeSelecionadaIds] = useState<number[]>([]);
  const [somenteEquipeAlerta, setSomenteEquipeAlerta] = useState(false);
  const [telefoneDestino, setTelefoneDestino] = useState('');
  const [inboxConversas, setInboxConversas] = useState<WhatsAppInboxConversation[]>([]);
  const [inboxStatusFilter, setInboxStatusFilter] = useState<'todos' | 'novo' | 'aguardando' | 'resolvido'>('todos');
  const [inboxSearch, setInboxSearch] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [inboxMensagens, setInboxMensagens] = useState<WhatsAppInboxMessage[]>([]);
  const [isLoadingInboxMensagens, setIsLoadingInboxMensagens] = useState(false);
  const [isUpdatingInboxStatus, setIsUpdatingInboxStatus] = useState(false);

  const carregarStatus = async (silencioso = false) => {
    try {
      if (!silencioso) setIsRefreshingStatus(true);
      const response = await whatsapp.getStatus();
      setStatus(response.data);
    } catch (error) {
      if (!silencioso) {
        toast.error('Erro ao carregar status do WhatsApp');
      }
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const response = await clientes.list();
      const clientesData = response.data.clientes || response.data || [];
      setTotalClientes(clientesData.length);

      const contatosValidos: ContatoWhatsApp[] = clientesData
        .filter((c: any) => typeof c.telefone === 'string' && c.telefone.trim().length > 0)
        .map((c: any) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
        }));

      setContatos(contatosValidos);
    } catch (error) {
      toast.error('Erro ao carregar clientes para WhatsApp');
    }
  };

  const carregarAutomacoes = async (silencioso = true) => {
    try {
      const response = await whatsapp.getAutomacoesConfig();
      setAutomacaoConfig(response.data.config);
      setPlatformStatus(response.data.sender_status || null);
      setIsAdminWorkspace(Boolean(response.data.is_admin));
    } catch (error) {
      if (!silencioso) {
        toast.error('Erro ao carregar configurações de automação');
      }
    }
  };

  const carregarContatosEquipe = async (silencioso = true) => {
    try {
      const response = await whatsapp.listarContatosWorkspace(false);
      setWorkspaceContatos(response.data.contatos || []);
    } catch (error) {
      if (!silencioso) {
        toast.error('Erro ao carregar contatos da equipe');
      }
    }
  };

  const carregarInboxConversas = async (silencioso = true) => {
    try {
      if (!silencioso) setIsLoadingInbox(true);
      const params: {
        status?: 'novo' | 'aguardando' | 'resolvido';
        search?: string;
        limit?: number;
      } = {
        limit: 120,
      };
      if (inboxStatusFilter !== 'todos') {
        params.status = inboxStatusFilter;
      }
      if (inboxSearch.trim()) {
        params.search = inboxSearch.trim();
      }

      const response = await whatsapp.listarInboxConversas(params);
      const conversas = response.data.conversas || [];
      setInboxConversas(conversas);

      if (selectedInboxId) {
        const stillExists = conversas.some((item) => item.id === selectedInboxId);
        if (!stillExists) {
          setSelectedInboxId(conversas[0]?.id || null);
        }
      } else if (conversas.length > 0) {
        setSelectedInboxId(conversas[0].id);
      }
    } catch (error) {
      if (!silencioso) {
        toast.error('Erro ao carregar caixa de entrada WhatsApp');
      }
    } finally {
      setIsLoadingInbox(false);
    }
  };

  const carregarMensagensConversa = async (conversationId: number, silencioso = true) => {
    try {
      if (!silencioso) setIsLoadingInboxMensagens(true);
      const response = await whatsapp.listarInboxMensagens(conversationId, 120);
      setInboxMensagens(response.data.mensagens || []);
    } catch (error) {
      if (!silencioso) {
        toast.error('Erro ao carregar mensagens da conversa');
      }
    } finally {
      setIsLoadingInboxMensagens(false);
    }
  };

  useEffect(() => {
    carregarStatus(true);
    carregarClientes();
    carregarAutomacoes(true);
    carregarContatosEquipe(true);
    carregarInboxConversas(true);
  }, []);

  useEffect(() => {
    carregarInboxConversas(true);
  }, [inboxStatusFilter, inboxSearch]);

  useEffect(() => {
    if (!selectedInboxId) {
      setInboxMensagens([]);
      return;
    }
    carregarMensagensConversa(selectedInboxId, true);
  }, [selectedInboxId]);

  useEffect(() => {
    const interval = setInterval(() => {
      carregarInboxConversas(true);
      if (selectedInboxId) {
        carregarMensagensConversa(selectedInboxId, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedInboxId, inboxStatusFilter, inboxSearch]);

  useEffect(() => {
    if (!showQRCode) return undefined;

    const interval = setInterval(async () => {
      try {
        const response = await whatsapp.getStatus();
        setStatus(response.data);

        const conectado = Boolean(response.data?.connected ?? response.data?.conectado);
        if (conectado) {
          setShowQRCode(false);
          setQrCode(null);
          toast.success('WhatsApp conectado com sucesso');
        }
      } catch (error) {
        console.error('Erro ao acompanhar status de conexao no modal QR:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showQRCode]);

  const handleConectar = async () => {
    setIsLoading(true);
    setShowQRCode(true);
    setQrCode(null);

    try {
      const response = await whatsapp.getQRCode();
      const rawQr = response.data?.qrcode as unknown;

      let qrValue: string | undefined;
      if (typeof rawQr === 'string') {
        qrValue = rawQr;
      } else if (rawQr && typeof rawQr === 'object') {
        qrValue = (rawQr as any).qrcode || (rawQr as any).base64;
      }

      if (response.data.sucesso && response.data.connected && !qrValue) {
        toast.success('WhatsApp ja esta conectado');
        setShowQRCode(false);
      } else if (response.data.sucesso && qrValue) {
        setQrCode(normalizeQrCode(qrValue));
      } else if (response.data.pending) {
        toast.info('Preparando QR Code, tente novamente em alguns segundos.');
      } else {
        toast.error(response.data.erro || 'Erro ao gerar QR Code');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao conectar WhatsApp');
    } finally {
      setIsLoading(false);
      carregarStatus(true);
    }
  };

  const handleDesconectar = async () => {
    try {
      const response = await whatsapp.desconectar();
      if (response.data?.sucesso) {
        toast.success('WhatsApp desconectado com sucesso');
      } else {
        toast.error(response.data?.erro || 'Nao foi possivel desconectar');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao desconectar WhatsApp');
    } finally {
      carregarStatus();
    }
  };

  const updateAutomacaoField = <K extends keyof WhatsAppAutomacaoConfig>(
    key: K,
    value: WhatsAppAutomacaoConfig[K]
  ) => {
    setAutomacaoConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSalvarAutomacoes = async () => {
    if (!automacaoConfig) return;
    if (!isAdminWorkspace) {
      toast.error('Apenas admin pode alterar automações');
      return;
    }

    setIsSavingAutomacao(true);
    try {
      const payload = {
        ...automacaoConfig,
      };
      const response = await whatsapp.updateAutomacoesConfig(payload);
      setAutomacaoConfig(response.data.config);
      toast.success('Configurações de automação salvas');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao salvar automações');
    } finally {
      setIsSavingAutomacao(false);
    }
  };

  const handleEnviarResumoTeste = async () => {
    if (!isAdminWorkspace) {
      toast.error('Apenas admin pode enviar resumo de teste');
      return;
    }

    setIsEnviandoResumoTeste(true);
    try {
      const response = await whatsapp.enviarResumoTeste();
      if (response.data.sucesso) {
        const confirmadas = response.data.confirmados ?? response.data.enviados ?? 0;
        const pendentes = response.data.pendentes_confirmacao ?? 0;
        const processadas = response.data.processados ?? (confirmadas + pendentes);
        const invalidos = (response.data.resultados || [])
          .filter((r) => r.recipient_exists === false)
          .map((r) => r.telefone)
          .filter(Boolean)
          .join(', ');
        const destinos = (response.data.destinatarios || [])
          .map((d) => d.telefone)
          .filter(Boolean)
          .join(', ');

        if (confirmadas > 0) {
          const sufixoPendentes = pendentes > 0 ? `, ${pendentes} pendente(s) de confirmacao` : '';
          toast.success(
            `Resumo processado: ${processadas} mensagem(ns), ${confirmadas} confirmada(s)${sufixoPendentes}`
          );
        } else if (processadas > 0) {
          const detalheInvalido = invalidos ? ` Numeros sem WhatsApp: ${invalidos}.` : '';
          const jids = (response.data.resultados || [])
            .map((r) => r.recipient_jid)
            .filter(Boolean)
            .join(', ');
          toast.warning(
            `Resumo processado: ${processadas} mensagem(ns), aguardando confirmacao. Destinos: ${destinos || 'N/A'}.${detalheInvalido}${jids ? ` JIDs: ${jids}` : ''}`
          );
        } else {
          toast.error(response.data.error || 'Resumo não enviado');
        }
      } else {
        toast.error(response.data.error || 'Resumo não enviado');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao enviar resumo de teste');
    } finally {
      setIsEnviandoResumoTeste(false);
    }
  };

  const handleGerarMensagemIA = async () => {
    if (!iaContexto.trim()) {
      toast.error('Descreva o contexto para gerar a mensagem');
      return;
    }

    setIsGerandoIA(true);
    try {
      const response = await whatsapp.gerarMensagemIA({
        objetivo: 'Criar mensagem automática para WhatsApp do escritório',
        contexto: iaContexto,
        ai_prompt: automacaoConfig?.ai_prompt || '',
      });
      setIaMensagemGerada(response.data.mensagem);
      if (!response.data.ia_disponivel) {
        toast.info('IA não configurada no servidor. Retornado texto base.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao gerar mensagem com IA');
    } finally {
      setIsGerandoIA(false);
    }
  };

  const toggleEquipeSelecionada = (userId: number) => {
    setEquipeSelecionadaIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const aplicarTemplateRapido = (templateId: string) => {
    const selectedTemplate = QUICK_WHATSAPP_TEMPLATES.find((item) => item.id === templateId);
    if (!selectedTemplate) return;

    const clienteAtual = contatos.find((c) => String(c.id) === String(clienteDestinoId));
    const fallbackCliente = contatos[0];
    const clienteNome = (clienteAtual || fallbackCliente)?.nome || 'cliente';

    let texto = selectedTemplate.mensagem;
    texto = texto.replace(/\{\{cliente_nome\}\}/g, clienteNome);
    texto = texto.replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'));

    setDestinoEnvioIa(selectedTemplate.destino);
    if (selectedTemplate.destino === 'cliente' && !clienteDestinoId && fallbackCliente) {
      setClienteDestinoId(String(fallbackCliente.id));
    }
    setIaMensagemGerada(texto);
  };

  const handleEnviarMensagemIA = async () => {
    const mensagem = iaMensagemGerada.trim();
    if (!mensagem) {
      toast.error('Gere ou escreva uma mensagem antes de enviar');
      return;
    }

    if (!(status?.connected ?? status?.conectado)) {
      toast.error('Conecte seu WhatsApp antes de enviar mensagens');
      return;
    }

    const payload: {
      mensagem: string;
      destino: 'cliente' | 'equipe' | 'telefone';
      cliente_id?: number;
      telefone?: string;
      user_ids?: number[];
      somente_alerta_whatsapp?: boolean;
    } = {
      mensagem,
      destino: destinoEnvioIa,
    };

    if (destinoEnvioIa === 'cliente') {
      const clienteSelecionado = contatos.find((c) => String(c.id) === String(clienteDestinoId));
      if (!clienteSelecionado) {
        toast.error('Selecione um cliente para enviar');
        return;
      }
      payload.cliente_id = clienteSelecionado.id;
    }

    if (destinoEnvioIa === 'equipe') {
      payload.somente_alerta_whatsapp = somenteEquipeAlerta;
      if (equipeSelecionadaIds.length > 0) {
        payload.user_ids = equipeSelecionadaIds;
      }
    }

    if (destinoEnvioIa === 'telefone') {
      const telefone = telefoneDestino.trim();
      if (!telefone) {
        toast.error('Informe o telefone de destino');
        return;
      }
      payload.telefone = telefone;
    }

    setIsEnviandoMensagemIa(true);
    try {
      const response = await whatsapp.enviarMensagemPersonalizada(payload);
      if (response.data.sucesso) {
        const processados = response.data.processados ?? 0;
        const confirmados = response.data.confirmados ?? response.data.enviados ?? 0;
        const pendentes = response.data.pendentes_confirmacao ?? 0;
        const sufixoPendentes = pendentes > 0 ? `, ${pendentes} pendente(s) de confirmacao` : '';
        toast.success(
          `Mensagem processada para ${processados} destino(s), ${confirmados} confirmada(s)${sufixoPendentes}`
        );
        carregarInboxConversas(true);
        if (selectedInboxId) {
          carregarMensagensConversa(selectedInboxId, true);
        }
      } else {
        toast.error(response.data.erro || 'Falha ao enviar mensagem');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao enviar mensagem');
    } finally {
      setIsEnviandoMensagemIa(false);
    }
  };

  const handleAtualizarStatusInbox = async (
    conversationId: number,
    status: 'novo' | 'aguardando' | 'resolvido'
  ) => {
    setIsUpdatingInboxStatus(true);
    try {
      await whatsapp.atualizarInboxStatus(conversationId, status);
      await carregarInboxConversas(true);
      if (selectedInboxId === conversationId) {
        await carregarMensagensConversa(conversationId, true);
      }
      toast.success('Status da conversa atualizado');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao atualizar status da conversa');
    } finally {
      setIsUpdatingInboxStatus(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
  };

  const getSlaColorClass = (slaLevel?: string) => {
    if (slaLevel === 'critical') return 'text-destructive';
    if (slaLevel === 'attention') return 'text-warning';
    if (slaLevel === 'resolved') return 'text-success';
    return 'text-success';
  };

  const isConectado = Boolean(status?.connected ?? status?.conectado);
  const estadoConexao = status?.state || status?.estado || (isConectado ? 'open' : 'disconnected');
  const platformConectado = Boolean(platformStatus?.connected ?? platformStatus?.conectado);
  const platformEstado = platformStatus?.state || platformStatus?.estado || (platformConectado ? 'connected' : 'disconnected');
  const selectedInboxConversa = inboxConversas.find((item) => item.id === selectedInboxId) || null;

  const cards = [
    { label: 'Clientes com Telefone', value: contatos.length.toString(), icon: Users, color: 'text-primary' },
    { label: 'Clientes sem Telefone', value: Math.max(totalClientes - contatos.length, 0).toString(), icon: Smartphone, color: 'text-muted-foreground' },
    { label: 'Status da Conexao', value: isConectado ? 'Conectado' : 'Desconectado', icon: MessageSquare, color: isConectado ? 'text-success' : 'text-warning' },
    { label: 'Provedor', value: status?.provider || '-', icon: Settings, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card glow-border p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Integracao WhatsApp</h1>
              <p className="text-sm text-muted-foreground">Conexao real com clientes e envio de notificacoes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={isConectado ? 'badge-ativo flex items-center gap-1' : 'badge-pendente flex items-center gap-1'}>
              <span className={`h-2 w-2 rounded-full ${isConectado ? 'bg-success animate-pulse' : 'bg-warning'}`} />
              {isConectado ? 'Conectado' : 'Desconectado'}
            </span>
            {isConectado ? (
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-destructive" onClick={handleDesconectar}>
                <PowerOff className="mr-2 h-4 w-4" /> Desconectar
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="border-border text-success hover:text-success" onClick={handleConectar} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                Conectar
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Clientes com WhatsApp
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {contatos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhum cliente com telefone cadastrado.
              </p>
            ) : (
              contatos.slice(0, 12).map((contato, i) => (
                <motion.div key={contato.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success font-semibold text-sm shrink-0">
                    {contato.nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{contato.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{contato.telefone}</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Status da Integracao
          </h3>

          <div className="rounded-lg bg-secondary/30 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provedor</span>
              <span className="font-medium">{status?.provider || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-medium">{estadoConexao}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Configurado</span>
              <span className="font-medium">{status?.configurado ? 'Sim' : 'Nao'}</span>
            </div>
            {status?.error || status?.erro ? (
              <div className="text-xs text-warning">{status.error || status.erro}</div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => carregarStatus()} disabled={isRefreshingStatus}>
              {isRefreshingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar status
            </Button>
            {!isConectado && (
              <Button className="flex-1" onClick={handleConectar} disabled={isLoading}>
                <QrCode className="mr-2 h-4 w-4" /> Gerar QR
              </Button>
            )}
          </div>
        </div>
      </div>

      {automacaoConfig && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" /> Automações de WhatsApp
            </h3>

            {!isAdminWorkspace && (
              <p className="text-xs text-warning">
                Somente admins do workspace podem editar estas configurações.
              </p>
            )}

            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>WhatsApp oficial da plataforma</span>
                  <span className={platformConectado ? 'text-success' : 'text-warning'}>
                    {platformConectado ? 'Conectado' : 'Desconectado'} ({platformEstado})
                  </span>
                </div>
                <p className="mt-2">
                  Os envios automáticos para usuários são disparados pela plataforma. Se estiver desconectado, contate o suporte.
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={automacaoConfig.auto_nova_movimentacao}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('auto_nova_movimentacao', e.target.checked)}
                />
                <span>Enviar WhatsApp em nova movimentação</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={automacaoConfig.auto_novo_prazo}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('auto_novo_prazo', e.target.checked)}
                />
                <span>Enviar WhatsApp em novo prazo</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={automacaoConfig.auto_nova_tarefa}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('auto_nova_tarefa', e.target.checked)}
                />
                <span>Enviar WhatsApp em nova tarefa atribuída</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={automacaoConfig.auto_lembrete_prazo}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('auto_lembrete_prazo', e.target.checked)}
                />
                <span>Lembretes de prazo automáticos</span>
              </label>

              <div>
                <label className="text-xs text-muted-foreground">Dias para lembrar (ex: 7,3,1,0)</label>
                <Input
                  value={automacaoConfig.reminder_days}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('reminder_days', e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={automacaoConfig.auto_resumo_diario}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('auto_resumo_diario', e.target.checked)}
                />
                <span>Resumo diário do escritório no WhatsApp</span>
              </label>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock3 className="h-3 w-3" /> Horário do resumo diário
                </label>
                <Input
                  type="time"
                  value={automacaoConfig.daily_summary_time || '18:00'}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('daily_summary_time', e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={automacaoConfig.ai_generate_messages}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('ai_generate_messages', e.target.checked)}
                />
                <span>Usar IA para melhorar mensagens automáticas</span>
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-muted-foreground">
                    Prompt do escritório para IA (opcional)
                  </label>
                  {isAdminWorkspace && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setIsPromptEditorOpen((prev) => !prev)}
                    >
                      {isPromptEditorOpen ? (
                        <>
                          Ocultar <ChevronUp className="ml-1 h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Editar <ChevronDown className="ml-1 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isPromptEditorOpen ? (
                  <Textarea
                    rows={3}
                    value={automacaoConfig.ai_prompt || ''}
                    disabled={!isAdminWorkspace}
                    onChange={(e) => updateAutomacaoField('ai_prompt', e.target.value)}
                    placeholder="Ex: Mensagens diretas, formais e com foco em ação."
                  />
                ) : (
                  <div className="rounded-md border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                    Prompt oculto. Clique em "Editar" quando quiser ajustar.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSalvarAutomacoes}
                disabled={!isAdminWorkspace || isSavingAutomacao}
              >
                {isSavingAutomacao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar automações
              </Button>
              <Button
                variant="outline"
                onClick={handleEnviarResumoTeste}
                disabled={!isAdminWorkspace || isEnviandoResumoTeste}
              >
                {isEnviandoResumoTeste ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                Testar resumo
              </Button>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" /> Assistente IA de Mensagens
            </h3>
            <p className="text-xs text-muted-foreground">
              Descreva um cenário e gere uma sugestão pronta para disparos automáticos.
            </p>

            <div className="rounded-lg bg-secondary/20 p-3 space-y-2">
              <p className="text-xs font-medium">Templates rapidos</p>
              <div className="grid gap-2">
                {QUICK_WHATSAPP_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    className="justify-start text-left h-auto py-2 whitespace-normal"
                    onClick={() => aplicarTemplateRapido(template.id)}
                  >
                    {template.titulo}
                  </Button>
                ))}
              </div>
            </div>

            <Textarea
              rows={6}
              value={iaContexto}
              onChange={(e) => setIaContexto(e.target.value)}
              placeholder="Ex: Avisar equipe sobre prazo de audiência amanhã às 14h do processo 123..."
            />

            <Button onClick={handleGerarMensagemIA} disabled={isGerandoIA}>
              {isGerandoIA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Gerar mensagem com IA
            </Button>

            <Textarea
              rows={8}
              value={iaMensagemGerada}
              onChange={(e) => setIaMensagemGerada(e.target.value)}
              placeholder="A mensagem sugerida aparecerá aqui..."
            />

            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium">Enviar mensagem gerada</p>
                <span
                  className={
                    isConectado
                      ? 'text-[11px] text-success'
                      : 'text-[11px] text-warning'
                  }
                >
                  {isConectado ? 'WhatsApp conectado' : 'Conecte seu WhatsApp para enviar'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={destinoEnvioIa === 'cliente' ? 'default' : 'outline'}
                  onClick={() => setDestinoEnvioIa('cliente')}
                >
                  Cliente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={destinoEnvioIa === 'equipe' ? 'default' : 'outline'}
                  onClick={() => setDestinoEnvioIa('equipe')}
                >
                  Equipe
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={destinoEnvioIa === 'telefone' ? 'default' : 'outline'}
                  onClick={() => setDestinoEnvioIa('telefone')}
                >
                  Telefone
                </Button>
              </div>

              {destinoEnvioIa === 'cliente' && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Cliente destino</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={clienteDestinoId}
                    onChange={(e) => setClienteDestinoId(e.target.value)}
                  >
                    <option value="">Selecione um cliente...</option>
                    {contatos.map((contato) => (
                      <option key={contato.id} value={String(contato.id)}>
                        {contato.nome} - {contato.telefone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {destinoEnvioIa === 'equipe' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={somenteEquipeAlerta}
                      onChange={(e) => setSomenteEquipeAlerta(e.target.checked)}
                    />
                    <span className="text-muted-foreground">
                      Somente membros com alerta WhatsApp ativo
                    </span>
                  </label>
                  <div className="max-h-36 overflow-y-auto rounded-md border border-border/60 p-2 space-y-1">
                    {workspaceContatos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum membro com telefone cadastrado.
                      </p>
                    ) : (
                      workspaceContatos.map((contato) => (
                        <label
                          key={contato.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-secondary/40"
                        >
                          <span className="truncate">{contato.nome}</span>
                          <input
                            type="checkbox"
                            checked={equipeSelecionadaIds.includes(contato.id)}
                            onChange={() => toggleEquipeSelecionada(contato.id)}
                          />
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Nenhum marcado = envia para toda a equipe filtrada.
                  </p>
                </div>
              )}

              {destinoEnvioIa === 'telefone' && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Telefone destino</label>
                  <Input
                    value={telefoneDestino}
                    onChange={(e) => setTelefoneDestino(e.target.value)}
                    placeholder="5511999999999"
                  />
                </div>
              )}

              <Button
                type="button"
                onClick={handleEnviarMensagemIA}
                disabled={isEnviandoMensagemIa || !iaMensagemGerada.trim()}
              >
                {isEnviandoMensagemIa ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="mr-2 h-4 w-4" />
                )}
                Enviar mensagem
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Caixa de Entrada
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarInboxConversas(false)}
              disabled={isLoadingInbox}
            >
              {isLoadingInbox ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3 w-3" />
              )}
              Atualizar
            </Button>
          </div>

          <Input
            placeholder="Buscar por nome/telefone..."
            value={inboxSearch}
            onChange={(e) => setInboxSearch(e.target.value)}
          />

          <div className="grid grid-cols-4 gap-2">
            <Button
              size="sm"
              variant={inboxStatusFilter === 'todos' ? 'default' : 'outline'}
              onClick={() => setInboxStatusFilter('todos')}
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={inboxStatusFilter === 'novo' ? 'default' : 'outline'}
              onClick={() => setInboxStatusFilter('novo')}
            >
              Novo
            </Button>
            <Button
              size="sm"
              variant={inboxStatusFilter === 'aguardando' ? 'default' : 'outline'}
              onClick={() => setInboxStatusFilter('aguardando')}
            >
              Aguardando
            </Button>
            <Button
              size="sm"
              variant={inboxStatusFilter === 'resolvido' ? 'default' : 'outline'}
              onClick={() => setInboxStatusFilter('resolvido')}
            >
              Resolvido
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {inboxConversas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhuma conversa encontrada.
              </p>
            ) : (
              inboxConversas.map((conversa) => (
                <button
                  key={conversa.id}
                  type="button"
                  onClick={() => setSelectedInboxId(conversa.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedInboxId === conversa.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/60 hover:bg-secondary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversa.cliente_nome || conversa.phone}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{conversa.phone}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded border border-border/60 uppercase">
                      {conversa.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {conversa.last_message_text || '(sem preview)'}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className={getSlaColorClass(conversa.sla_level)}>
                      SLA: {conversa.sla_label || '-'}
                    </span>
                    <span className="text-muted-foreground">
                      {conversa.unread_count > 0 ? `${conversa.unread_count} nova(s)` : 'sem novas'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" /> Atendimento
          </h3>

          {!selectedInboxConversa ? (
            <p className="text-sm text-muted-foreground">
              Selecione uma conversa para visualizar histórico e atualizar status.
            </p>
          ) : (
            <>
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Contato:</span>{' '}
                  {selectedInboxConversa.cliente_nome || selectedInboxConversa.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">Telefone:</span> {selectedInboxConversa.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">Ultima entrada:</span>{' '}
                  {formatDateTime(selectedInboxConversa.last_inbound_at || selectedInboxConversa.last_message_at)}
                </p>
                <p>
                  <span className="text-muted-foreground">SLA:</span>{' '}
                  <span className={getSlaColorClass(selectedInboxConversa.sla_level)}>
                    {selectedInboxConversa.sla_label || '-'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedInboxConversa.status === 'novo' ? 'default' : 'outline'}
                  disabled={isUpdatingInboxStatus}
                  onClick={() => handleAtualizarStatusInbox(selectedInboxConversa.id, 'novo')}
                >
                  Novo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedInboxConversa.status === 'aguardando' ? 'default' : 'outline'}
                  disabled={isUpdatingInboxStatus}
                  onClick={() => handleAtualizarStatusInbox(selectedInboxConversa.id, 'aguardando')}
                >
                  Aguardando
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedInboxConversa.status === 'resolvido' ? 'default' : 'outline'}
                  disabled={isUpdatingInboxStatus}
                  onClick={() => handleAtualizarStatusInbox(selectedInboxConversa.id, 'resolvido')}
                >
                  Resolvido
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border border-border/60 p-3 space-y-2">
                {isLoadingInboxMensagens ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : inboxMensagens.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Sem mensagens registradas nesta conversa.
                  </p>
                ) : (
                  inboxMensagens.map((mensagem) => (
                    <div
                      key={mensagem.id}
                      className={`rounded-md px-3 py-2 text-xs ${
                        mensagem.direction === 'inbound'
                          ? 'bg-secondary/40'
                          : 'bg-primary/10 border border-primary/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium">
                          {mensagem.direction === 'inbound' ? 'Cliente' : 'Equipe'}
                        </span>
                        <span className="text-muted-foreground">{formatDateTime(mensagem.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{mensagem.message_text || '(sem texto)'}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Escaneie pelo WhatsApp em "Aparelhos conectados &gt; Conectar um aparelho".
              Nao use o fluxo de "Transferir conta".
            </p>
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppPage;
