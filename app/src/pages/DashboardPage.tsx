import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase,
  Users,
  CheckSquare,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Gavel,
  FileText,
  Globe,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Prazo {
  id: number;
  descricao?: string;
  data_prazo: string;
  data_final?: string; // para compatibilidade legacy
  prioridade: string;
  processo_numero?: string;
  processo_titulo?: string;
}

interface Tarefa {
  id: number;
  titulo: string;
  prioridade: string;
  status: string;
  data_vencimento?: string;
  processo_numero?: string;
}

interface Processo {
  id: number;
  numero: string;
  titulo: string;
  ultima_movimentacao?: string;
  data_ultima_movimentacao?: string;
  cliente_nome?: string;
}

interface DashboardData {
  // Estrutura da API /api/dashboard
  processos?: {
    total: number;
    ativos: number;
  };
  clientes?: {
    total: number;
  };
  prazos?: {
    pendentes: number;
    proximos: number;
    lista: Prazo[];
  };
  tarefas?: {
    pendentes: number;
    atrasadas: number;
    lista: Tarefa[];
  };
  financeiro?: {
    receitas_mes: number;
    despesas_mes: number;
    saldo: number;
  };
  // Campos legacy que podem existir em algumas respostas
  estatisticas?: {
    total_processos: number;
    processos_ativos: number;
    total_clientes: number;
    prazos_pendentes: number;
    prazos_vencidos: number;
    minhas_tarefas: number;
  };
  proximos_prazos?: Prazo[];
  minhas_tarefas?: Tarefa[];
  processos_movimentacao?: Processo[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const response = await dashboard.get();
      setData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'alta':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'media':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Extrair dados da API (suporta ambas as estruturas: nova e legacy)
  const stats = {
    total_processos: data?.estatisticas?.total_processos ?? data?.processos?.total ?? 0,
    processos_ativos: data?.estatisticas?.processos_ativos ?? data?.processos?.ativos ?? 0,
    total_clientes: data?.estatisticas?.total_clientes ?? data?.clientes?.total ?? 0,
    prazos_pendentes: data?.estatisticas?.prazos_pendentes ?? data?.prazos?.pendentes ?? 0,
    prazos_vencidos: data?.estatisticas?.prazos_vencidos ?? 0, // API não retorna vencidos separadamente
    minhas_tarefas: data?.estatisticas?.minhas_tarefas ?? data?.tarefas?.pendentes ?? 0,
  };

  const financeiro = data?.financeiro || { receitas_mes: 0, despesas_mes: 0, saldo: 0 };
  const proximos_prazos = data?.proximos_prazos || data?.prazos?.lista || [];
  const minhas_tarefas = data?.minhas_tarefas || data?.tarefas?.lista || [];
  const processos_movimentacao = data?.processos_movimentacao || [];

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05, duration: 0.4 },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão geral</h1>
          <p className="text-sm text-muted-foreground">Resumo do que está acontecendo no seu escritório.</p>
        </div>
        <Button
          variant="outline"
          onClick={loadDashboard}
          className="border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas principais (novo visual) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...fade(0)} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.total_processos}</div>
          <div className="text-xs text-muted-foreground mt-1">Processos cadastrados</div>
        </motion.div>

        <motion.div {...fade(1)} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <Gavel className="h-5 w-5 text-success" />
          </div>
          <div className="text-2xl font-bold">{stats.processos_ativos}</div>
          <div className="text-xs text-muted-foreground mt-1">Processos ativos</div>
        </motion.div>

        <motion.div {...fade(2)} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.total_clientes}</div>
          <div className="text-xs text-muted-foreground mt-1">Clientes</div>
        </motion.div>

        <motion.div {...fade(3)} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-5 w-5 text-warning" />
          </div>
          <div className="text-2xl font-bold">{stats.prazos_pendentes}</div>
          <div className="text-xs text-muted-foreground mt-1">Prazos pendentes</div>
        </motion.div>
      </div>

      {/* Ações rápidas / integrações (mock visual, sem nova lógica) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div {...fade(4)} className="glass-card-hover p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-secondary text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">Datajud</div>
            <div className="text-xs text-muted-foreground">Monitoramento automático dos seus processos</div>
          </div>
        </motion.div>

        <motion.div {...fade(5)} className="glass-card-hover p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-secondary text-accent">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">Copiloto IA</div>
            <div className="text-xs text-muted-foreground">Faça perguntas sobre seus processos</div>
          </div>
        </motion.div>

        <motion.div {...fade(6)} className="glass-card-hover p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-secondary text-success">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">WhatsApp</div>
            <div className="text-xs text-muted-foreground">Centralize conversas com clientes</div>
          </div>
        </motion.div>
      </div>

      {/* Financeiro + Prazos + Tarefas – layout novo, dados reais */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financeiro (Mês) */}
        <motion.div {...fade(7)} className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              <h2 className="text-sm font-semibold">Financeiro (mês)</h2>
            </div>
            <Link to="/dashboard/financeiro">
              <Button variant="ghost" size="sm" className="text-primary hover:underline px-0">
                Ver mais <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2">
              <span className="text-muted-foreground">Entradas</span>
              <span className="font-semibold text-success">{formatCurrency(financeiro.receitas_mes || 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <span className="text-muted-foreground">Saídas</span>
              <span className="font-semibold text-destructive">
                {formatCurrency(financeiro.despesas_mes || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="text-muted-foreground">Saldo</span>
              <span
                className={`font-semibold ${
                  (financeiro.saldo || 0) >= 0 ? 'text-primary' : 'text-destructive'
                }`}
              >
                {formatCurrency(financeiro.saldo || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Próximos prazos */}
        <motion.div {...fade(8)} className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <h2 className="text-sm font-semibold">Próximos prazos</h2>
            </div>
            <Link to="/prazos">
              <Button variant="ghost" size="sm" className="text-primary hover:underline px-0">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {proximos_prazos.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum prazo pendente no momento.
                </p>
              )}
              {proximos_prazos.map((prazo) => (
                <div
                  key={prazo.id}
                  className="flex items-start justify-between rounded-lg bg-secondary/40 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 mr-2">
                    <p className="font-medium truncate">
                      {prazo.processo_titulo || prazo.processo_numero || 'Prazo'}
                    </p>
                    {prazo.descricao && (
                      <p className="text-muted-foreground line-clamp-2">{prazo.descricao}</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-foreground">
                      {formatDate(prazo.data_prazo ?? prazo.data_final)}
                    </span>
                    <Badge className={`text-[10px] ${getPrioridadeColor(prazo.prioridade)}`}>
                      {prazo.prioridade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Minhas tarefas */}
        <motion.div {...fade(9)} className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-info" />
              <h2 className="text-sm font-semibold">Minhas tarefas</h2>
            </div>
            <Link to="/tarefas">
              <Button variant="ghost" size="sm" className="text-primary hover:underline px-0">
                Ver todas <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-3 text-xs">
              {minhas_tarefas.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma tarefa pendente no momento.
                </p>
              )}
              {minhas_tarefas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="rounded-lg bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tarefa.titulo}</p>
                      {tarefa.processo_numero && (
                        <p className="text-muted-foreground">{tarefa.processo_numero}</p>
                      )}
                    </div>
                    <Badge className={`text-[10px] ${getPrioridadeColor(tarefa.prioridade)}`}>
                      {tarefa.prioridade}
                    </Badge>
                  </div>
                  {tarefa.data_vencimento && (
                    <p className="mt-1 text-muted-foreground">
                      Vence em {formatDate(tarefa.data_vencimento)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      </div>

      {/* Processos com movimentações PJe */}
      <motion.div {...fade(10)} className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold">Processos com movimentações PJe</h2>
          </div>
          <Link to="/processos">
            <Button variant="ghost" size="sm" className="text-primary hover:underline px-0">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {processos_movimentacao.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-4">
              Nenhuma movimentação recente.
            </p>
          )}
          {processos_movimentacao.map((processo) => (
            <Link key={processo.id} to={`/processos/${processo.id}`}>
              <div className="p-4 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{processo.titulo}</p>
                    <p className="text-muted-foreground">{processo.numero}</p>
                    {processo.ultima_movimentacao && (
                      <p className="text-primary mt-1 line-clamp-2">
                        {processo.ultima_movimentacao}
                      </p>
                    )}
                    {processo.data_ultima_movimentacao && (
                      <p className="text-muted-foreground mt-1">
                        {new Date(processo.data_ultima_movimentacao).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
