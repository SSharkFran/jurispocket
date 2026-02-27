import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, QrCode, Settings, Loader2, Power, PowerOff, RefreshCw, Smartphone, Bell, Clock3, Save, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  whatsapp,
  WhatsAppStatus,
  WhatsAppAutomacaoConfig,
  WhatsAppAutomacaoUser,
  WhatsAppSenderStatus
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

const WhatsAppPage = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [contatos, setContatos] = useState<ContatoWhatsApp[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [automacaoConfig, setAutomacaoConfig] = useState<WhatsAppAutomacaoConfig | null>(null);
  const [automacaoUsers, setAutomacaoUsers] = useState<WhatsAppAutomacaoUser[]>([]);
  const [senderStatus, setSenderStatus] = useState<WhatsAppSenderStatus | null>(null);
  const [isAdminWorkspace, setIsAdminWorkspace] = useState(false);
  const [isSavingAutomacao, setIsSavingAutomacao] = useState(false);
  const [isEnviandoResumoTeste, setIsEnviandoResumoTeste] = useState(false);
  const [iaContexto, setIaContexto] = useState('');
  const [iaMensagemGerada, setIaMensagemGerada] = useState('');
  const [isGerandoIA, setIsGerandoIA] = useState(false);

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
      setAutomacaoUsers(response.data.usuarios || []);
      setSenderStatus(response.data.sender_status || null);
      setIsAdminWorkspace(Boolean(response.data.is_admin));
    } catch (error) {
      if (!silencioso) {
        toast.error('Erro ao carregar configurações de automação');
      }
    }
  };

  useEffect(() => {
    carregarStatus(true);
    carregarClientes();
    carregarAutomacoes(true);
  }, []);

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
        sender_user_id: automacaoConfig.sender_user_id || null,
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
        toast.success(`Resumo enviado: ${response.data.enviados || 0} mensagem(ns)`);
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

  const isConectado = Boolean(status?.connected ?? status?.conectado);
  const estadoConexao = status?.state || status?.estado || (isConectado ? 'open' : 'disconnected');
  const senderConectado = Boolean(senderStatus?.connected ?? senderStatus?.conectado);
  const senderEstado = senderStatus?.state || senderStatus?.estado || (senderConectado ? 'connected' : 'disconnected');

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
              <div>
                <label className="text-xs text-muted-foreground">Sessão remetente (WhatsApp comercial)</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
                  value={automacaoConfig.sender_user_id || ''}
                  disabled={!isAdminWorkspace}
                  onChange={(e) =>
                    updateAutomacaoField(
                      'sender_user_id',
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Selecionar automaticamente (admin do workspace)</option>
                  {automacaoUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} {u.telefone ? `- ${u.telefone}` : ''}
                    </option>
                  ))}
                </select>
                {automacaoConfig.sender_user_id ? (
                  <p className={`mt-2 text-xs ${senderConectado ? 'text-success' : 'text-warning'}`}>
                    Sessão do remetente: {senderConectado ? 'conectada' : 'desconectada'} ({senderEstado})
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sem remetente fixo. O sistema usa automaticamente o admin do workspace.
                  </p>
                )}
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

              <div>
                <label className="text-xs text-muted-foreground">Prompt do escritório para IA (opcional)</label>
                <Textarea
                  rows={3}
                  value={automacaoConfig.ai_prompt || ''}
                  disabled={!isAdminWorkspace}
                  onChange={(e) => updateAutomacaoField('ai_prompt', e.target.value)}
                  placeholder="Ex: Mensagens diretas, formais e com foco em ação."
                />
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
          </div>
        </div>
      )}

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
