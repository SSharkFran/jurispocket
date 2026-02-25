import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Phone, CheckCheck, Clock, Users, Zap, QrCode, Settings, Loader2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface Stats {
  mensagensEnviadas: number;
  clientesAtivos: number;
  automacoesAtivas: number;
  taxaEntrega: string;
}

const WhatsApp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [stats, setStats] = useState<Stats>({
    mensagensEnviadas: 0,
    clientesAtivos: 0,
    automacoesAtivas: 0,
    taxaEntrega: '0%',
  });
  const [isConnected, setIsConnected] = useState(false);

  const [automacoes, setAutomacoes] = useState<Automacao[]>([
    { tipo: 'Boas-vindas', descricao: 'Enviada ao cadastrar novo cliente', ativo: true, enviadas: 0 },
    { tipo: 'Movimentação', descricao: 'Notifica novas movimentações processuais', ativo: true, enviadas: 0 },
    { tipo: 'Prazo', descricao: 'Alerta sobre prazos próximos', ativo: true, enviadas: 0 },
    { tipo: 'Link Público', descricao: 'Envia link de acompanhamento do processo', ativo: true, enviadas: 0 },
    { tipo: 'Cobrança', descricao: 'Lembrete de honorários pendentes', ativo: false, enviadas: 0 },
  ]);

  // Carregar clientes para conversas
  const carregarClientes = async () => {
    try {
      const response = await clientes.list();
      const clientesData = response.data || [];
      
      const conversasFormatadas: Conversa[] = clientesData.slice(0, 5).map((c: any, index: number) => ({
        id: c.id,
        cliente: c.nome,
        telefone: c.phone || c.telefone || '(11) 99999-9999',
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
        mensagensEnviadas: Math.floor(Math.random() * 500) + 100, // Simulação temporária
        taxaEntrega: (95 + Math.random() * 4).toFixed(1) + '%',
      }));
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const handleConectar = async () => {
    setIsLoading(true);
    setShowQRCode(true);
    
    // Simulação - na implementação real, chamaria a API
    setTimeout(() => {
      setQrCode('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
      setIsLoading(false);
      
      // Simula conexão após 3 segundos
      setTimeout(() => {
        setIsConnected(true);
        setShowQRCode(false);
        toast.success('WhatsApp conectado com sucesso!');
        
        // Atualiza estatísticas
        setStats(prev => ({
          ...prev,
          automacoesAtivas: automacoes.filter(a => a.ativo).length,
        }));
      }, 3000);
    }, 1000);
  };

  const handleDesconectar = () => {
    setIsConnected(false);
    toast.info('WhatsApp desconectado');
    setStats(prev => ({
      ...prev,
      automacoesAtivas: 0,
    }));
  };

  const toggleAutomacao = (tipo: string) => {
    setAutomacoes(prev => prev.map(a => 
      a.tipo === tipo ? { ...a, ativo: !a.ativo } : a
    ));
    
    const automacao = automacoes.find(a => a.tipo === tipo);
    if (automacao) {
      toast.success(`Automação "${tipo}" ${!automacao.ativo ? 'ativada' : 'desativada'}`);
      
      // Atualiza contador de automações ativas
      setStats(prev => ({
        ...prev,
        automacoesAtivas: automacoes.filter(a => a.ativo).length + (!automacao.ativo ? 1 : -1),
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Automação WhatsApp</h1>
              <p className="text-sm text-muted-foreground">Comunicação automática com clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
            {!isConnected ? (
              <Button onClick={handleConectar} disabled={isLoading} className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Conectar
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleDesconectar} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                <PowerOff className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Mensagens Enviadas", value: stats.mensagensEnviadas.toString(), icon: Send, color: "text-green-400" },
          { label: "Clientes Ativos", value: stats.clientesAtivos.toString(), icon: Users, color: "text-blue-400" },
          { label: "Automações Ativas", value: stats.automacoesAtivas.toString(), icon: Zap, color: "text-purple-400" },
          { label: "Taxa de Entrega", value: stats.taxaEntrega, icon: CheckCheck, color: "text-green-400" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }} className="glass-card p-4"
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
          <div className="space-y-2">
            {conversas.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              conversas.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 font-semibold text-sm shrink-0">
                    {c.cliente.split(" ").map(n => n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.cliente}</span>
                      <span className="text-xs text-muted-foreground">{c.hora}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate pr-4">{c.ultimaMensagem}</span>
                      {c.novas > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-white px-1.5 shrink-0">
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
          <div className="space-y-3">
            {automacoes.map((m, i) => (
              <motion.div key={m.tipo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${m.ativo ? "bg-green-400" : "bg-gray-400"}`} />
                  <div>
                    <div className="text-sm font-medium">{m.tipo}</div>
                    <div className="text-xs text-muted-foreground">{m.descricao}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">{m.enviadas}</div>
                    <div className="text-xs text-muted-foreground">enviadas</div>
                  </div>
                  <Button
                    size="sm"
                    variant={m.ativo ? "default" : "outline"}
                    onClick={() => toggleAutomacao(m.tipo)}
                    disabled={!isConnected}
                    className={m.ativo ? "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30" : ""}
                  >
                    {m.ativo ? "Ativo" : "Inativo"}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Escaneie este QR Code com o WhatsApp para conectar
            </p>
            {qrCode ? (
              <div className="w-64 h-64 mx-auto bg-white p-4 rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-full h-full" />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto bg-secondary rounded-lg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Abra WhatsApp > Configurações > Dispositivos conectados > Conectar dispositivo
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsApp;
