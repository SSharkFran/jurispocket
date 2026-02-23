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
} from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Visão geral do seu escritório</p>
        </div>
        <Button
          variant="outline"
          onClick={loadDashboard}
          className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-slate-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total_processos}</p>
                <p className="text-xs text-slate-400">Processos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.processos_ativos}</p>
                <p className="text-xs text-slate-400">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total_clientes}</p>
                <p className="text-xs text-slate-400">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.prazos_pendentes}</p>
                <p className="text-xs text-slate-400">Prazos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.prazos_vencidos}</p>
                <p className="text-xs text-slate-400">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.minhas_tarefas}</p>
                <p className="text-xs text-slate-400">Tarefas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financeiro e Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo Financeiro */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Financeiro (Mês)
              </CardTitle>
              <Link to="/dashboard/financeiro">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                  Ver mais <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <span className="text-slate-300">Entradas</span>
              <span className="text-green-400 font-semibold">{formatCurrency(financeiro.receitas_mes || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="text-slate-300">Saídas</span>
              <span className="text-red-400 font-semibold">{formatCurrency(financeiro.despesas_mes || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <span className="text-slate-300">Saldo</span>
              <span className={`font-semibold ${(financeiro.saldo || 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                {formatCurrency(financeiro.saldo || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Prazos */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                Próximos Prazos
              </CardTitle>
              <Link to="/prazos">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {proximos_prazos.length === 0 && (
                  <p className="text-slate-500 text-center py-4">Nenhum prazo pendente</p>
                )}
                {proximos_prazos.map((prazo) => (
                  <div
                    key={prazo.id}
                    className="p-3 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{prazo.processo_titulo}</p>
                        <p className="text-xs text-slate-400">{prazo.descricao}</p>
                      </div>
                      <Badge className={`text-xs ${getPrioridadeColor(prazo.prioridade)}`}>
                        {formatDate(prazo.data_prazo ?? prazo.data_final)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Minhas Tarefas */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-400" />
                Minhas Tarefas
              </CardTitle>
              <Link to="/tarefas">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                  Ver todas <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {minhas_tarefas.length === 0 && (
                  <p className="text-slate-500 text-center py-4">Nenhuma tarefa pendente</p>
                )}
                {minhas_tarefas.map((tarefa) => (
                  <div
                    key={tarefa.id}
                    className="p-3 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{tarefa.titulo}</p>
                        {tarefa.processo_numero && (
                          <p className="text-xs text-slate-500">{tarefa.processo_numero}</p>
                        )}
                      </div>
                      <Badge className={`text-xs ${getPrioridadeColor(tarefa.prioridade)}`}>
                        {tarefa.prioridade}
                      </Badge>
                    </div>
                    {tarefa.data_vencimento && (
                      <p className="text-xs text-slate-500 mt-1">
                        Vence: {formatDate(tarefa.data_vencimento)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Processos com Movimentações PJe */}
      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Processos com Movimentações PJe
            </CardTitle>
            <Link to="/processos">
              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processos_movimentacao.length === 0 && (
              <p className="text-slate-500 col-span-full text-center py-4">Nenhuma movimentação recente</p>
            )}
            {processos_movimentacao.map((processo) => (
              <Link key={processo.id} to={`/processos/${processo.id}`}>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{processo.titulo}</p>
                      <p className="text-xs text-slate-400">{processo.numero}</p>
                      {processo.ultima_movimentacao && (
                        <p className="text-xs text-cyan-400 mt-1 line-clamp-2">
                          {processo.ultima_movimentacao}
                        </p>
                      )}
                      {processo.data_ultima_movimentacao && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(processo.data_ultima_movimentacao).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
