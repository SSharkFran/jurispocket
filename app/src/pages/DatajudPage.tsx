import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Zap, Activity, Clock, RefreshCw, Check, AlertCircle, Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { processos } from '@/services/api';
import { toast } from 'sonner';

interface ProcessoMonitorado {
  id: number;
  numero: string;
  numero_cnj?: string;
  tribunal: string;
  tribunal_nome?: string;
  status: string;
  ultimaVerificacao?: Date;
  ultimaVerificacaoFormatada: string;
  movimentacoes: number;
  novas: number;
  ultima_movimentacao?: string;
}

interface Movimentacao {
  id?: number;
  processo: string;
  movimento: string;
  data: string;
  tribunal: string;
  lida: boolean;
}

// Função para extrair tribunal do número CNJ
const extrairTribunal = (numeroCNJ: string): string => {
  if (!numeroCNJ) return 'N/A';
  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  // TR = Código do tribunal, OOOO = Código da unidade
  const partes = numeroCNJ.split('.');
  if (partes.length >= 4) {
    const codigoTribunal = partes[3];
    const tribunais: Record<string, string> = {
      '01': 'STF', '02': 'STJ', '03': 'TST', '04': 'STM', '05': 'TSE', '06': 'TRF1',
      '07': 'TRF2', '08': 'TRF3', '09': 'TRF4', '10': 'TRF5', '11': 'TRF6',
      '12': 'TJAC', '13': 'TJAL', '14': 'TJAP', '15': 'TJAM', '16': 'TJBA',
      '17': 'TJCE', '18': 'TJDF', '19': 'TJES', '20': 'TJGO', '21': 'TJMA',
      '22': 'TJMT', '23': 'TJMS', '24': 'TJMG', '25': 'TJPA', '26': 'TJPB',
      '27': 'TJPR', '28': 'TJPE', '29': 'TJPI', '30': 'TJRJ', '31': 'TJRJ',
      '32': 'TJRN', '33': 'TJRS', '34': 'TJRO', '35': 'TJRR', '36': 'TJSC',
      '37': 'TJSE', '38': 'TJSP', '39': 'TJTO'
    };
    return tribunais[codigoTribunal] || `TJ${codigoTribunal}`;
  }
  return 'N/A';
};

const DatajudPage = () => {
  const [consultaNumero, setConsultaNumero] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConsultando, setIsConsultando] = useState(false);
  const [processosMonitorados, setProcessosMonitorados] = useState<ProcessoMonitorado[]>([]);
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState<Movimentacao[]>([]);
  const [ultimaConsultaGlobal, setUltimaConsultaGlobal] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    monitorados: 0,
    movimentacoesHoje: 0,
    ultimaVerificacao: '--:--',
    proximaVerificacao: '--:--',
  });

  // Calcular próxima verificação (a cada 30 minutos, alinhado ao cron)
  const calcularProximaVerificacao = useCallback(() => {
    const agora = new Date();
    const minutos = agora.getMinutes();
    const proximos30 = Math.ceil(minutos / 30) * 30;
    const proximaHora = new Date(agora);
    proximaHora.setMinutes(proximos30);
    proximaHora.setSeconds(0);
    proximaHora.setMilliseconds(0);
    
    // Se já passou dos 30 ou 60 minutos, vai para a próxima hora
    if (proximos30 >= 60) {
      proximaHora.setHours(proximaHora.getHours() + 1);
      proximaHora.setMinutes(0);
    }
    
    return proximaHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Carregar processos do backend
  const carregarProcessos = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const response = await processos.list({ status: 'ativo' });
      const processosData = response.data.processos || response.data || [];
      
      // Encontrar a última consulta global
      let ultimaConsulta: Date | null = null;
      
      const monitorados: ProcessoMonitorado[] = processosData.map((p: any) => {
        const numeroCNJ = p.numero_cnj || p.numero;
        const tribunal = extrairTribunal(numeroCNJ);
        
        // Verificar última consulta datajud
        const dataConsulta = p.ultima_consulta_datajud 
          ? new Date(p.ultima_consulta_datajud)
          : null;
          
        if (dataConsulta && (!ultimaConsulta || dataConsulta > ultimaConsulta)) {
          ultimaConsulta = dataConsulta;
        }
        
        // Formatar última movimentação
        let ultimaMov = 'Nunca';
        if (p.ultima_movimentacao_datajud?.data_movimento) {
          const data = new Date(p.ultima_movimentacao_datajud.data_movimento);
          ultimaMov = data.toLocaleDateString('pt-BR');
        } else if (p.ultima_movimentacao) {
          ultimaMov = new Date(p.ultima_movimentacao).toLocaleDateString('pt-BR');
        }
        
        return {
          id: p.id,
          numero: numeroCNJ,
          tribunal: tribunal,
          tribunal_nome: p.tribunal_nome || tribunal,
          status: p.status || 'ativo',
          ultimaVerificacao: dataConsulta,
          ultimaVerificacaoFormatada: dataConsulta 
            ? dataConsulta.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Nunca',
          movimentacoes: p.movimentacoes_datajud?.length || p.movimentacoes?.length || 0,
          novas: p.movimentacoes_novas_count || p.movimentacoes_novas || 0,
          ultima_movimentacao: ultimaMov,
        };
      });

      setProcessosMonitorados(monitorados);
      setUltimaConsultaGlobal(ultimaConsulta);
      
      // Atualizar stats
      setStats({
        monitorados: monitorados.length,
        movimentacoesHoje: monitorados.reduce((acc, p) => acc + p.novas, 0),
        ultimaVerificacao: ultimaConsulta 
          ? ultimaConsulta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '--:--',
        proximaVerificacao: calcularProximaVerificacao(),
      });

      // Carregar movimentações recentes
      const movsRecentes: Movimentacao[] = [];
      processosData.forEach((p: any) => {
        if (p.movimentacoes_datajud?.length > 0) {
          p.movimentacoes_datajud.slice(0, 3).forEach((m: any) => {
            movsRecentes.push({
              id: m.id,
              processo: p.numero_cnj || p.numero,
              movimento: m.nome_movimento,
              data: new Date(m.data_movimento).toLocaleString('pt-BR'),
              tribunal: extrairTribunal(p.numero_cnj || p.numero),
              lida: m.lida || false,
            });
          });
        }
      });
      
      // Ordenar por data mais recente
      movsRecentes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setMovimentacoesRecentes(movsRecentes.slice(0, 10));
      
    } catch (error) {
      toast.error('Erro ao carregar processos');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [calcularProximaVerificacao]);

  useEffect(() => {
    carregarProcessos();
    
    // Atualizar próxima verificação a cada minuto
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        proximaVerificacao: calcularProximaVerificacao(),
      }));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [carregarProcessos, calcularProximaVerificacao]);

  const handleConsulta = async () => {
    if (!consultaNumero.trim()) {
      toast.error('Digite um número de processo');
      return;
    }
    
    // Verifica se o processo existe na lista
    const processo = processosMonitorados.find(p => 
      p.numero.includes(consultaNumero.replace(/\D/g, ''))
    );

    if (!processo) {
      toast.error('Processo não encontrado na sua base de dados');
      return;
    }

    setIsConsultando(true);
    try {
      await processos.consultarDatajud(processo.id);
      toast.success('Consulta Datajud realizada com sucesso!');
      await carregarProcessos(false); // Recarrega sem mostrar loading
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao consultar Datajud');
    } finally {
      setIsConsultando(false);
    }
  };

  const handleConsultarTodos = async () => {
    setIsLoading(true);
    try {
      // Consulta em lote - chamada para cada processo
      const promises = processosMonitorados.map(p => 
        processos.consultarDatajud(p.id).catch(() => null)
      );
      await Promise.all(promises);
      
      // Atualiza a última consulta global
      const agora = new Date();
      setUltimaConsultaGlobal(agora);
      
      toast.success('Consulta em lote realizada!');
      await carregarProcessos(false);
      
      // Atualizar stats com o horário atual
      setStats(prev => ({
        ...prev,
        ultimaVerificacao: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        proximaVerificacao: calcularProximaVerificacao(),
      }));
    } catch (error) {
      toast.error('Erro na consulta em lote');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com efeito especial */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card glow-border p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Consulta Nacional Datajud
              <span className="feature-badge text-[10px]"><Radio className="h-3 w-3" /> Ao Vivo</span>
            </h1>
            <p className="text-sm text-muted-foreground">Monitoramento automático via API oficial do CNJ</p>
          </div>
        </div>

        {/* Consulta rápida */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Digite o número do processo (Ex: 0001234-56.2024.8.26.0100)"
              className="pl-10 bg-secondary border-border"
              value={consultaNumero} onChange={e => setConsultaNumero(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConsulta()}
            />
          </div>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            onClick={handleConsulta}
            disabled={isConsultando}
          >
            {isConsultando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Consultar
          </Button>
        </div>
      </motion.div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Processos Monitorados', value: stats.monitorados.toString(), icon: Activity, color: 'text-primary' },
          { label: 'Movimentações Hoje', value: stats.movimentacoesHoje.toString(), icon: Zap, color: 'text-accent' },
          { label: 'Última Verificação', value: stats.ultimaVerificacao, icon: Clock, color: 'text-muted-foreground' },
          { label: 'Próxima Verificação', value: stats.proximaVerificacao, icon: RefreshCw, color: 'text-success' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }
            transition={{ delay: i * 0.05 }} className="stat-card"
          >
            <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processos monitorados */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Processos Monitorados</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary text-xs"
              onClick={handleConsultarTodos}
              disabled={isLoading || processosMonitorados.length === 0}
            >
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Executar Agora
            </Button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {isLoading && processosMonitorados.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : processosMonitorados.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhum processo cadastrado. Adicione processos na página de Processos.
              </p>
            ) : (
              processosMonitorados.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-mono truncate">{m.numero}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.tribunal} · Última mov.: {m.ultima_movimentacao}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    {m.novas > 0 && (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
                        <AlertCircle className="h-3.5 w-3.5" /> {m.novas} nova(s)
                      </span>
                    )}
                    <span className={m.status === 'ativo' ? 'badge-ativo shrink-0' : 'badge-pendente shrink-0'}>{m.status}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Movimentações recentes */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Movimentações Recentes</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {movimentacoesRecentes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Execute uma consulta para ver movimentações recentes.
              </p>
            ) : (
              movimentacoesRecentes.map((m, i) => (
                <motion.div key={`${m.processo}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }
                  className={`p-3 rounded-lg transition-colors ${!m.lida ? 'bg-primary/5 border border-primary/10' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {!m.lida && <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                        <span className="truncate">{m.movimento}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{m.processo} · {m.tribunal} · {m.data}</div>
                    </div>
                    {!m.lida && <Check className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer shrink-0 ml-2" />}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatajudPage;
