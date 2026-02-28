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
  processoId: number;
  processo: string;
  movimento: string;
  data: string;
  timestamp: number;
  tribunal: string;
  lida: boolean;
}

const extrairTribunal = (numeroCNJ: string): string => {
  if (!numeroCNJ) return 'N/A';
  const numeroLimpo = numeroCNJ.replace(/\D/g, '');
  if (numeroLimpo.length < 15) return 'N/A';
  const codigoTribunal = numeroLimpo.substring(13, 15);
  const tribunais: Record<string, string> = {
    '06': 'TRF1', '07': 'TRF2', '08': 'TRF3', '09': 'TRF4', '10': 'TRF5', '11': 'TRF6',
    '12': 'TJAC', '13': 'TJAL', '14': 'TJAP', '15': 'TJAM', '16': 'TJBA', '17': 'TJCE',
    '18': 'TJDF', '19': 'TJES', '20': 'TJGO', '21': 'TJMA', '22': 'TJMT', '23': 'TJMS',
    '24': 'TJMG', '25': 'TJPA', '26': 'TJPB', '27': 'TJPR', '28': 'TJPE', '29': 'TJPI',
    '30': 'TJRJ', '31': 'TJRJ', '32': 'TJRN', '33': 'TJRS', '34': 'TJRO', '35': 'TJRR',
    '36': 'TJSC', '37': 'TJSE', '38': 'TJSP', '39': 'TJTO',
  };
  return tribunais[codigoTribunal] || `TJ${codigoTribunal}`;
};

export default function DatajudPage() {
  const [consultaNumero, setConsultaNumero] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConsultando, setIsConsultando] = useState(false);
  const [processosMonitorados, setProcessosMonitorados] = useState<ProcessoMonitorado[]>([]);
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState<Movimentacao[]>([]);
  const [stats, setStats] = useState({
    monitorados: 0,
    movimentacoesHoje: 0,
    ultimaVerificacao: '--:--',
    proximaVerificacao: '--:--',
  });

  const calcularProximaVerificacao = useCallback(() => {
    const agora = new Date();
    const slots = [0, 6, 12, 18];

    for (const slot of slots) {
      const candidato = new Date(agora);
      candidato.setHours(slot, 0, 0, 0);
      if (candidato > agora) {
        return candidato.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    }

    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(0, 0, 0, 0);
    return amanha.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const carregarProcessos = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      const listaRes = await processos.list({ status: 'ativo' });
      const lista = Array.isArray(listaRes.data?.processos || listaRes.data)
        ? (listaRes.data?.processos || listaRes.data)
        : [];

      const detalhes = await Promise.all(
        lista.map(async (p: any) => {
          try {
            const detalheRes = await processos.get(p.id);
            return detalheRes.data || p;
          } catch {
            return p;
          }
        })
      );

      let ultimaConsultaGlobal: Date | null = null;
      const now = new Date();
      const umMesAtras = new Date(now);
      umMesAtras.setDate(now.getDate() - 30);

      const monitorados: ProcessoMonitorado[] = detalhes.map((p: any) => {
        const numero = p.numero_cnj || p.numero;
        const tribunal = p.tribunal_codigo || extrairTribunal(numero);

        const ultimaVerificacaoRaw =
          p.monitoramento?.ultima_verificacao ||
          p.ultima_consulta_datajud ||
          null;
        const ultimaVerificacao = ultimaVerificacaoRaw ? new Date(ultimaVerificacaoRaw) : undefined;
        const ultimaVerificacaoValida =
          ultimaVerificacao && !isNaN(ultimaVerificacao.getTime()) ? ultimaVerificacao : undefined;

        if (ultimaVerificacaoValida && (!ultimaConsultaGlobal || ultimaVerificacaoValida > ultimaConsultaGlobal)) {
          ultimaConsultaGlobal = ultimaVerificacaoValida;
        }

        const dataUltimaMovRaw =
          p.ultima_movimentacao_datajud?.data_movimento ||
          p.data_ultima_movimentacao ||
          p.ultimo_movimento_data ||
          null;
        let ultimaMov = 'Nunca';
        if (dataUltimaMovRaw) {
          const dt = new Date(dataUltimaMovRaw);
          if (!isNaN(dt.getTime())) ultimaMov = dt.toLocaleDateString('pt-BR');
        }

        return {
          id: p.id,
          numero,
          tribunal,
          tribunal_nome: p.tribunal_nome || tribunal,
          status: p.status || 'ativo',
          ultimaVerificacao: ultimaVerificacaoValida,
          ultimaVerificacaoFormatada: ultimaVerificacaoValida
            ? ultimaVerificacaoValida.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Nunca',
          movimentacoes: p.movimentacoes_datajud?.length || p.monitoramento?.total_movimentacoes || 0,
          novas: p.movimentacoes_novas_count || p.movimentacoes_novas || 0,
          ultima_movimentacao: ultimaMov,
        };
      });

      const movs: Movimentacao[] = [];
      detalhes.forEach((p: any) => {
        const tribunal = p.tribunal_codigo || extrairTribunal(p.numero_cnj || p.numero);
        (p.movimentacoes_datajud || []).forEach((m: any) => {
          const dt = new Date(m.data_movimento);
          if (isNaN(dt.getTime())) return;
          if (dt < umMesAtras) return;
          movs.push({
            id: m.id,
            processoId: p.id,
            processo: p.numero_cnj || p.numero,
            movimento: m.nome_movimento,
            data: dt.toLocaleString('pt-BR'),
            timestamp: dt.getTime(),
            tribunal,
            lida: Boolean(m.lida),
          });
        });
      });
      movs.sort((a, b) => b.timestamp - a.timestamp);

      setProcessosMonitorados(monitorados);
      setMovimentacoesRecentes(movs.slice(0, 20));
      setStats({
        monitorados: monitorados.length,
        movimentacoesHoje: movs.length,
        ultimaVerificacao: ultimaConsultaGlobal
          ? ultimaConsultaGlobal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '--:--',
        proximaVerificacao: calcularProximaVerificacao(),
      });
    } catch (error) {
      toast.error('Erro ao carregar processos');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [calcularProximaVerificacao]);

  useEffect(() => {
    carregarProcessos();
    const interval = setInterval(() => {
      setStats((prev) => ({ ...prev, proximaVerificacao: calcularProximaVerificacao() }));
    }, 60000);
    return () => clearInterval(interval);
  }, [carregarProcessos, calcularProximaVerificacao]);

  const handleConsulta = async () => {
    if (!consultaNumero.trim()) {
      toast.error('Digite um número de processo');
      return;
    }

    const termo = consultaNumero.replace(/\D/g, '');
    const processo = processosMonitorados.find((p) => (p.numero || '').replace(/\D/g, '').includes(termo));
    if (!processo) {
      toast.error('Processo não encontrado na sua base');
      return;
    }

    setIsConsultando(true);
    try {
      await processos.consultarDatajud(processo.id);
      toast.success('Consulta Datajud realizada');
      await carregarProcessos(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao consultar Datajud');
    } finally {
      setIsConsultando(false);
    }
  };

  const handleConsultarTodos = async () => {
    setIsLoading(true);
    try {
      await Promise.all(processosMonitorados.map((p) => processos.consultarDatajud(p.id).catch(() => null)));
      toast.success('Consulta em lote finalizada');
      await carregarProcessos(false);
    } catch {
      toast.error('Erro na consulta em lote');
    } finally {
      setIsLoading(false);
    }
  };

  const marcarMovimentacoesComoLidas = async (processoId: number) => {
    try {
      await processos.marcarMovimentacoesLidas(processoId);
      await carregarProcessos(false);
    } catch {
      toast.error('Erro ao marcar movimentações como lidas');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card glow-border p-6">
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

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o número do processo"
              className="pl-10 bg-secondary border-border"
              value={consultaNumero}
              onChange={(e) => setConsultaNumero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConsulta()}
            />
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary" onClick={handleConsulta} disabled={isConsultando}>
            {isConsultando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Consultar
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Processos Monitorados', value: stats.monitorados.toString(), icon: Activity, color: 'text-primary' },
          { label: 'Movimentações (30d)', value: stats.movimentacoesHoje.toString(), icon: Zap, color: 'text-accent' },
          { label: 'Última Verificação', value: stats.ultimaVerificacao, icon: Clock, color: 'text-muted-foreground' },
          { label: 'Próxima Verificação', value: stats.proximaVerificacao, icon: RefreshCw, color: 'text-success' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Processos Monitorados</h3>
            <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={handleConsultarTodos} disabled={isLoading || processosMonitorados.length === 0}>
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Executar Agora
            </Button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {processosMonitorados.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum processo ativo monitorado.</p>
            ) : (
              processosMonitorados.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-mono truncate">{m.numero}</div>
                    <div className="text-xs text-muted-foreground">{m.tribunal} · Última mov.: {m.ultima_movimentacao || 'Nunca'}</div>
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

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Movimentações Recentes (Último Mês)</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {movimentacoesRecentes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma movimentação no último mês.</p>
            ) : (
              movimentacoesRecentes.map((m, i) => (
                <motion.div key={`${m.processo}-${m.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={`p-3 rounded-lg transition-colors ${!m.lida ? 'bg-primary/5 border border-primary/10' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {!m.lida && <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                        <span className="truncate">{m.movimento}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{m.processo} · {m.tribunal} · {m.data}</div>
                    </div>
                    {!m.lida && (
                      <Check
                        className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer shrink-0 ml-2"
                        onClick={() => marcarMovimentacoesComoLidas(m.processoId)}
                      />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
