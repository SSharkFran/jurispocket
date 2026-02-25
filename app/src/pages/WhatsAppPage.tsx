import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Phone, CheckCheck, Clock, Users, Zap, QrCode, Settings, Loader2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { whatsapp, WhatsAppStatus } from '@/services/whatsapp';
import { clientes } from '@/services/api';
import { toast } from 'sonner';

interface Conversa {
  id: number;
  cliente: string;
  telefone: string;
  ultimaMensagem: string;
  hora: string;
  lida: boolean;
  novas: number;
}

interface Automacao {
  tipo: string;
  descricao: string;
  ativo: boolean;
  enviadas: number;
}

const WhatsAppPage = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [stats, setStats] = useState({
    mensagensEnviadas: 273,
    clientesAtivos: 48,
    automacoesAtivas: 4,
    taxaEntrega: '99.2%',
  });

  const [automacoes, setAutomacoes] = useState<Automacao[]>([
    { tipo: 'Boas-vindas', descricao: 'Enviada ao cadastrar novo cliente', ativo: true, enviadas: 45 },
    { tipo: 'Movimentação', descricao: 'Notifica novas movimentações processuais', ativo: true, enviadas: 128 },
    { tipo: 'Prazo', descricao: 'Alerta sobre prazos próximos', ativo: true, enviadas: 67 },
    { tipo: 'Link Público', descricao: 'Envia link de acompanhamento do processo', ativo: true, enviadas: 33 },
    { tipo: 'Cobrança', descricao: 'Lembrete de honorários pendentes', ativo: false, enviadas: 0 },
  ]);

  // Carregar status do WhatsApp
  const carregarStatus = async () => {
    try {
      const response = await whatsapp.getStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status do WhatsApp');
    }
  };

  // Carregar clientes para conversas
  const carregarClientes = async () => {
    try {
      const response = await clientes.list();
      const clientesData = response.data.clientes || response.data || [];
      
      const conversasFormatadas: Conversa[] = clientesData.slice(0, 5).map((c: any, index: number) => ({
        id: c.id,
        cliente: c.nome,
        telefone: c.telefone || '(11) 99999-9999',
        ultimaMensagem: index === 0 ? 'Obrigado pela atualização!' : 
                        index === 1 ? 'Recebi o link do processo.' :
                        index === 2 ? 'Quando será a próxima audiência?' :
                        'Boa tarde, gostaria de saber...',
        hora: index === 0 ? '14:32' : index === 1 ? '11:20' : index === 2 ? '09:45' : 'Ontem',
        lida: index > 2,
        novas: index < 2 ? index + 1 : 0,
      }));

      setConversas(conversasFormatadas);
      setStats(prev => ({
        ...prev,
        clientesAtivos: clientesData.length,
      }));
    } catch (error) {
      console.error('Erro ao carregar clientes');
    }
  };

  useEffect(() => {
    carregarStatus();
    carregarClientes();
  }, []);

  const handleConectar = async () => {
    setIsLoading(true);
    setShowQRCode(true);
    try {
      const response = await whatsapp.getQRCode();
      if (response.data.sucesso && response.data.qrcode) {
        setQrCode(response.data.qrcode);
      } else {
        toast.error(response.data.erro || 'Erro ao gerar QR Code');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao conectar WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesconectar = () => {
    // Implementar desconexão quando API estiver disponível
    toast.info('Função de desconexão será implementada em breve');
  };

  const toggleAutomacao = (index: number) => {
    setAutomacoes(prev => prev.map((a, i) => 
      i === index ? { ...a, ativo: !a.ativo } : a
    ));
    toast.success('Configuração atualizada');
  };

  const isConectado = status?.connected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card glow-border p-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center" style={{ boxShadow: '0 0 20px hsl(142 71% 45% / 0.15)' }}>
              <MessageSquare className="h-6 w-6 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Automação WhatsApp</h1>
              <p className="text-sm text-muted-foreground">Comunicação automática com clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConectado ? (
              <>
                <span className="badge-ativo flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Conectado
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-border text-muted-foreground hover:text-destructive"
                  onClick={handleDesconectar}
                >
                  <PowerOff className="mr-2 h-4 w-4" /> Desconectar
                </Button>
              </>
            ) : (
              <>
                <span className="badge-pendente flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-warning" /> Desconectado
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-border text-success hover:text-success"
                  onClick={handleConectar}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                  Conectar
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Mensagens Enviadas', value: stats.mensagensEnviadas.toString(), icon: Send, color: 'text-success' },
          { label: 'Clientes Ativos', value: stats.clientesAtivos.toString(), icon: Users, color: 'text-primary' },
          { label: 'Automações Ativas', value: stats.automacoesAtivas.toString(), icon: Zap, color: 'text-accent' },
          { label: 'Taxa de Entrega', value: stats.taxaEntrega, icon: CheckCheck, color: 'text-success' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }} className="stat-card"
          >
            <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversas */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" /> Conversas Recentes
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {conversas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhuma conversa encontrada. Cadastre clientes para começar.
              </p>
            ) : (
              conversas.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success font-semibold text-sm shrink-0">
                    {c.cliente.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{c.cliente}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.hora}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate pr-4">{c.ultimaMensagem}</span>
                      {c.novas > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-success flex items-center justify-center text-[10px] font-bold text-success-foreground px-1.5 shrink-0">
                          {c.novas}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Automações */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Mensagens Automáticas
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {automacoes.map((m, i) => (
              <motion.div key={m.tipo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => toggleAutomacao(i)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${m.ativo ? 'bg-success' : 'bg-muted-foreground'}`} />
                  <div>
                    <div className="text-sm font-medium">{m.tipo}</div>
                    <div className="text-xs text-muted-foreground">{m.descricao}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{m.enviadas}</div>
                  <div className="text-xs text-muted-foreground">enviadas</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog QR Code */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Escaneie o QR Code com seu WhatsApp para conectar
            </p>
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg">
                {/* Aqui renderizaria o QR code real */}
                <div className="w-48 h-48 bg-slate-900 flex items-center justify-center text-white text-xs text-center p-4">
                  QR Code Placeholder<br/>
                  (Implementar com biblioteca qrcode.react)
                </div>
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center">
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
