import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Globe,
  Search,
  Zap,
  Activity,
  Clock,
  RefreshCw,
  Check,
  AlertCircle,
  Radio,
  Loader2,
  UserPlus,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { processos, clientes as clientesApi } from '@/services/api';
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

type TipoBuscaDatajud = 'numero' | 'nome' | 'documento';

interface DatajudParte {
  nome: string;
  tipo?: string;
  documento?: string;
}

interface DatajudBuscaResultado {
  numero_processo: string;
  tribunal_sigla?: string;
  tribunal_nome?: string;
  tribunais_relacionados?: string[];
  classe_codigo?: string;
  classe_nome?: string;
  assunto_principal?: string;
  orgao_julgador?: string;
  data_ajuizamento?: string;
  ultima_movimentacao?: string;
  ultima_movimentacao_data?: string;
  total_movimentos?: number;
  fase_atual?: string;
  instancias_detectadas?: string[];
  partes?: DatajudParte[];
  ja_cadastrado?: boolean;
  processo_id_workspace?: number | null;
}

interface ClienteResumo {
  id: number;
  nome: string;
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

const normalizarNumero = (valor: string): string => (valor || '').replace(/\D/g, '');

const formatarDataSegura = (valor?: string): string => {
  if (!valor) return 'N/A';
  const dt = new Date(valor);
  if (isNaN(dt.getTime())) return valor;
  return dt.toLocaleString('pt-BR');
};

const formatarPartesResumidas = (partes: DatajudParte[] = []): string => {
  if (!partes.length) return 'Nao informado';
  return partes
    .slice(0, 3)
    .map((parte) => {
      const tipo = parte.tipo ? `${parte.tipo}: ` : '';
      return `${tipo}${parte.nome}`;
    })
    .join(' | ');
};

export default function DatajudPage() {
  const navigate = useNavigate();

  const [consultaNumero, setConsultaNumero] = useState('');
  const [tipoBusca, setTipoBusca] = useState<TipoBuscaDatajud>('numero');
  const [isLoading, setIsLoading] = useState(false);
  const [isConsultando, setIsConsultando] = useState(false);
  const [processosMonitorados, setProcessosMonitorados] = useState<ProcessoMonitorado[]>([]);
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState<Movimentacao[]>([]);
  const [clientesDisponiveis, setClientesDisponiveis] = useState<ClienteResumo[]>([]);
  const [clienteCadastroId, setClienteCadastroId] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<DatajudBuscaResultado[]>([]);
  const [dialogBuscaAberto, setDialogBuscaAberto] = useState(false);
  const [numeroCadastrando, setNumeroCadastrando] = useState<string | null>(null);
  const [resumoBusca, setResumoBusca] = useState({
    total: 0,
    parcial: false,
    tribunaisConsultados: [] as string[],
  });
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

  const carregarClientes = useCallback(async () => {
    try {
      const response = await clientesApi.list();
      const lista = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.clientes)
          ? response.data.clientes
          : [];

      const clientes: ClienteResumo[] = lista
        .map((item: any) => ({
          id: Number(item.id),
          nome: String(item.nome || ''),
        }))
        .filter((item) => item.id > 0 && item.nome);

      setClientesDisponiveis(clientes);
      setClienteCadastroId((valorAtual) => {
        if (valorAtual && clientes.some((cliente) => String(cliente.id) === valorAtual)) {
          return valorAtual;
        }
        return clientes.length > 0 ? String(clientes[0].id) : '';
      });
    } catch {
      setClientesDisponiveis([]);
    }
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
        }),
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
    } catch {
      toast.error('Erro ao carregar processos');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [calcularProximaVerificacao]);

  useEffect(() => {
    carregarProcessos();
    carregarClientes();
    const interval = setInterval(() => {
      setStats((prev) => ({ ...prev, proximaVerificacao: calcularProximaVerificacao() }));
    }, 60000);
    return () => clearInterval(interval);
  }, [carregarProcessos, carregarClientes, calcularProximaVerificacao]);

  const handleConsulta = async () => {
    if (!consultaNumero.trim()) {
      toast.error('Digite um termo para consulta');
      return;
    }

    setIsConsultando(true);
    try {
      if (tipoBusca === 'numero') {
        const termo = normalizarNumero(consultaNumero);
        const processoLocal = processosMonitorados.find((p) => normalizarNumero(p.numero) === termo);
        if (processoLocal) {
          await processos.consultarDatajud(processoLocal.id);
          toast.success('Consulta Datajud realizada no processo monitorado');
          await carregarProcessos(false);
          return;
        }
      }

      const buscaRes = await processos.buscarDatajudAvancado({
        termo: consultaNumero,
        tipo: tipoBusca,
        limite: 12,
        limite_tribunais: 30,
      });

      const payload = buscaRes.data || {};
      const lista = Array.isArray(payload.resultados) ? payload.resultados : [];
      if (!lista.length) {
        toast.error(payload.mensagem || 'Nenhum processo encontrado para essa busca');
        return;
      }

      setResultadosBusca(lista);
      setResumoBusca({
        total: Number(payload.total_resultados || lista.length),
        parcial: Boolean(payload.parcial),
        tribunaisConsultados: Array.isArray(payload.tribunais_consultados)
          ? payload.tribunais_consultados
          : [],
      });
      setDialogBuscaAberto(true);
    } catch (error: any) {
      toast.error(error.response?.data?.erro || error.response?.data?.message || 'Erro ao consultar Datajud');
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
      toast.error('Erro ao marcar movimentacoes como lidas');
    }
  };

  const handleCadastrarResultado = async (resultado: DatajudBuscaResultado) => {
    if (resultado.ja_cadastrado && resultado.processo_id_workspace) {
      navigate(`/processos/${resultado.processo_id_workspace}`);
      return;
    }

    if (!clienteCadastroId) {
      toast.error('Selecione um cliente para cadastrar o processo');
      return;
    }

    setNumeroCadastrando(resultado.numero_processo);
    try {
      const partesResumo = formatarPartesResumidas(resultado.partes || []);
      const descricao = [
        resultado.tribunal_sigla ? `Tribunal: ${resultado.tribunal_sigla}` : '',
        resultado.orgao_julgador ? `Orgao julgador: ${resultado.orgao_julgador}` : '',
        resultado.fase_atual ? `Fase atual: ${resultado.fase_atual}` : '',
        partesResumo ? `Partes: ${partesResumo}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const tituloBase = resultado.classe_nome || 'Processo Datajud';
      const createRes = await processos.create({
        cliente_id: Number(clienteCadastroId),
        numero: resultado.numero_processo,
        numero_cnj: resultado.numero_processo,
        titulo: `${tituloBase} - ${resultado.numero_processo}`,
        descricao,
        status: 'ativo',
        ativar_monitoramento: true,
      });

      const processoId = Number(createRes.data?.id || 0) || null;
      const numeroNormalizado = normalizarNumero(resultado.numero_processo);

      setResultadosBusca((prev) =>
        prev.map((item) =>
          normalizarNumero(item.numero_processo) === numeroNormalizado
            ? { ...item, ja_cadastrado: true, processo_id_workspace: processoId }
            : item,
        ),
      );

      toast.success('Processo cadastrado com sucesso no workspace');
      await carregarProcessos(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Erro ao cadastrar processo');
    } finally {
      setNumeroCadastrando(null);
    }
  };

  const placeholderBusca =
    tipoBusca === 'numero'
      ? 'Digite o numero do processo'
      : tipoBusca === 'nome'
        ? 'Digite nome da parte'
        : 'Digite CPF ou CNPJ';

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card glow-border p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              Consulta Nacional Datajud
              <span className="feature-badge text-[10px]"><Radio className="h-3 w-3" /> Ao Vivo</span>
            </h1>
            <p className="text-sm text-muted-foreground">Monitoramento automatico via API oficial do CNJ</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="w-full md:w-52">
            <Select value={tipoBusca} onValueChange={(value) => setTipoBusca(value as TipoBuscaDatajud)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Tipo de busca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numero">Numero do processo</SelectItem>
                <SelectItem value="nome">Nome da parte</SelectItem>
                <SelectItem value="documento">CPF/CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholderBusca}
              className="border-border bg-secondary pl-10"
              value={consultaNumero}
              onChange={(e) => setConsultaNumero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConsulta()}
            />
          </div>

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary" onClick={handleConsulta} disabled={isConsultando}>
            {isConsultando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Processos Monitorados', value: stats.monitorados.toString(), icon: Activity, color: 'text-primary' },
          { label: 'Movimentacoes (30d)', value: stats.movimentacoesHoje.toString(), icon: Zap, color: 'text-accent' },
          { label: 'Ultima Verificacao', value: stats.ultimaVerificacao, icon: Clock, color: 'text-muted-foreground' },
          { label: 'Proxima Verificacao', value: stats.proximaVerificacao, icon: RefreshCw, color: 'text-success' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Processos Monitorados</h3>
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={handleConsultarTodos} disabled={isLoading || processosMonitorados.length === 0}>
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Executar Agora
            </Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {processosMonitorados.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Nenhum processo ativo monitorado.</p>
            ) : (
              processosMonitorados.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm">{m.numero}</div>
                    <div className="text-xs text-muted-foreground">{m.tribunal} · Ultima mov.: {m.ultima_movimentacao || 'Nunca'}</div>
                  </div>
                  <div className="ml-2 flex items-center gap-3">
                    {m.novas > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
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
          <h3 className="mb-4 text-sm font-semibold">Movimentacoes Recentes (Ultimo Mes)</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {movimentacoesRecentes.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma movimentacao no ultimo mes.</p>
            ) : (
              movimentacoesRecentes.map((m, i) => (
                <motion.div key={`${m.processo}-${m.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={`rounded-lg p-3 transition-colors ${!m.lida ? 'border border-primary/10 bg-primary/5' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {!m.lida && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />}
                        <span className="truncate">{m.movimento}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{m.processo} · {m.tribunal} · {m.data}</div>
                    </div>
                    {!m.lida && (
                      <Check
                        className="ml-2 h-4 w-4 shrink-0 cursor-pointer text-muted-foreground hover:text-primary"
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

      <Dialog open={dialogBuscaAberto} onOpenChange={setDialogBuscaAberto}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resultado da busca Datajud</DialogTitle>
            <DialogDescription>
              {resumoBusca.total} resultado(s) encontrado(s)
              {resumoBusca.parcial ? ' (com falhas em alguns tribunais).' : '.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
              <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 text-xs text-muted-foreground">
                Tribunais consultados: {resumoBusca.tribunaisConsultados.length ? resumoBusca.tribunaisConsultados.join(', ') : 'N/A'}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cliente-cadastro">Cliente para cadastro</Label>
                <Select value={clienteCadastroId} onValueChange={setClienteCadastroId}>
                  <SelectTrigger id="cliente-cadastro" className="border-border bg-secondary">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponiveis.map((cliente) => (
                      <SelectItem key={cliente.id} value={String(cliente.id)}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {clientesDisponiveis.length === 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <span>Cadastre um cliente antes de adicionar processos ao workspace.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400/40"
                  onClick={() => {
                    setDialogBuscaAberto(false);
                    navigate('/clientes');
                  }}
                >
                  Ir para clientes
                </Button>
              </div>
            )}

            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {resultadosBusca.map((resultado, index) => (
                <div key={`${resultado.numero_processo}-${index}`} className="rounded-lg border border-border/70 bg-secondary/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="truncate font-mono text-sm font-semibold">{resultado.numero_processo}</div>
                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>
                          <span className="font-medium text-foreground/80">Classe:</span> {resultado.classe_nome || resultado.classe_codigo || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground/80">Tribunal:</span> {resultado.tribunal_sigla || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground/80">Fase:</span> {resultado.fase_atual || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground/80">Movimentos:</span> {resultado.total_movimentos || 0}
                        </div>
                        <div>
                          <span className="font-medium text-foreground/80">Ajuizamento:</span> {formatarDataSegura(resultado.data_ajuizamento)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground/80">Ultima movimentacao:</span> {formatarDataSegura(resultado.ultima_movimentacao_data)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Movimento recente:</span> {resultado.ultima_movimentacao || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Partes:</span> {formatarPartesResumidas(resultado.partes || [])}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      {resultado.ja_cadastrado ? (
                        <Button
                          variant="outline"
                          onClick={() => resultado.processo_id_workspace && navigate(`/processos/${resultado.processo_id_workspace}`)}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Abrir processo
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleCadastrarResultado(resultado)}
                          disabled={!clienteCadastroId || clientesDisponiveis.length === 0 || numeroCadastrando === resultado.numero_processo}
                        >
                          {numeroCadastrando === resultado.numero_processo ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          Cadastrar no workspace
                        </Button>
                      )}

                      {resultado.ja_cadastrado && (
                        <span className="text-right text-[11px] text-emerald-400">Ja cadastrado no workspace</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
