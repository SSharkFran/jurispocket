import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderOpen,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Globe,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Prazo {
  id: number;
  descricao?: string;
  data_prazo: string;
  data_final?: string;
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
  tipo?: string;
}

interface DashboardData {
  processos?: { total: number; ativos: number };
  clientes?: { total: number };
  prazos?: { pendentes: number; proximos: number; lista: Prazo[] };
  tarefas?: { pendentes: number; atrasadas: number; lista: Tarefa[] };
  financeiro?: { receitas_mes: number; despesas_mes: number; saldo: number };
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
    switch (prioridade?.toLowerCase()) {
      case 'urgente':
      case 'alta':
        return 'text-red-400 bg-red-500/20';
      case 'media':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-blue-400 bg-blue-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Extrair dados da API
  const stats = {
    total_processos: data?.estatisticas?.total_processos ?? data?.processos?.total ?? 0,
    processos_ativos: data?.estatisticas?.processos_ativos ?? data?.processos?.ativos ?? 0,
    total_clientes: data?.estatisticas?.total_clientes ?? data?.clientes?.total ?? 0,
    prazos_pendentes: data?.estatisticas?.prazos_pendentes ?? data?.prazos?.pendentes ?? 0,
    prazos_vencidos: data?.estatisticas?.prazos_vencidos ?? 0,
    minhas_tarefas: data?.estatisticas?.minhas_tarefas ?? data?.tarefas?.pendentes ?? 0,
  };

  const financeiro = data?.financeiro || { receitas_mes: 0, despesas_mes: 0, saldo: 0 };
  const proximos_prazos = data?.proximos_prazos || data?.prazos?.lista || [];
  const minhas_tarefas = data?.minhas_tarefas || data?.tarefas?.lista || [];
  const processos_movimentacao = data?.processos_movimentacao || [];

  // Preparar dados para gráficos (usar dados reais se disponíveis)
  const chartData = [
    { mes: 'Set', receita: 38000, despesa: 12000 },
    { mes: 'Out', receita: 42000, despesa: 14000 },
    { mes: 'Nov', receita: 39000, despesa: 11000 },
    { mes: 'Dez', receita: 51000, despesa: 15000 },
    { mes: 'Jan', receita: 44000, despesa: 13000 },
    { mes: 'Fev', receita: financeiro.receitas_mes || 45800, despesa: financeiro.despesas_mes || 12500 },
  ];

  const processosChart = [
    { mes: 'Set', novos: 5, encerrados: 3 },
    { mes: 'Out', novos: 8, encerrados: 4 },
    { mes: 'Nov', novos: 6, encerrados: 7 },
    { mes: 'Dez', novos: 4, encerrados: 2 },
    { mes: 'Jan', novos: 7, encerrados: 5 },
    { mes: 'Fev', novos: 3, encerrados: 1 },
  ];

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05, duration: 0.4 },
  });

  const statCards = [
    {
      label: 'Processos Ativos',
      value: stats.processos_ativos,
      change: `+${Math.max(0, stats.processos_ativos - 0)}`,
      up: true,
      icon: FolderOpen,
    },
    {
      label: 'Clientes',
      value: stats.total_clientes,
      change: `+${Math.max(0, stats.total_clientes - 0)}`,
      up: true,
      icon: Users,
    },
    {
      label: 'Prazos Próximos',
      value: stats.prazos_pendentes,
      change: `${stats.prazos_vencidos} vencidos`,
      up: stats.prazos_vencidos === 0,
      icon: Clock,
      alert: stats.prazos_vencidos > 0,
    },
    {
      label: 'Receita Mensal',
      value: formatCurrency(financeiro.receitas_mes),
      change: '+12%',
      up: true,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bom dia 👋</h1>
        <p className="text-muted-foreground text-sm">Aqui está o resumo do seu escritório hoje.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} {...fade(i)} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.alert ? 'text-warning' : 'text-muted-foreground'}`} />
              <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? 'text-success' : s.alert ? 'text-warning' : 'text-muted-foreground'}`}>
                {s.up ? <ArrowUpRight className="h-3 w-3" /> : s.alert ? <AlertTriangle className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.change}
              </span>
            </div>
            <div className="text-2xl font-bold">{typeof s.value === 'string' ? s.value : s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Globe, title: 'Datajud', desc: 'Monitoramento automático', color: 'text-primary', href: '/app/datajud' },
          { icon: Bot, title: 'Copiloto IA', desc: 'Pergunte sobre seus processos', color: 'text-accent', href: '/app/ia' },
          { icon: MessageSquare, title: 'WhatsApp', desc: 'Centralize conversas', color: 'text-success', href: '/app/whatsapp' },
        ].map((a, i) => (
          <Link key={a.title} to={a.href}>
            <motion.div {...fade(i + 4)} className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-secondary ${a.color}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fade(7)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Financeiro — Últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fill: 'hsl(240 5% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(240 5% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ background: 'hsl(240 5% 10%)', border: '1px solid hsl(240 4% 16%)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="receita" stroke="hsl(160 84% 39%)" fill="url(#gRec)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" stroke="hsl(0 72% 51%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...fade(8)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Processos — Novos vs Encerrados</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={processosChart} barGap={4}>
              <XAxis dataKey="mes" tick={{ fill: 'hsl(240 5% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(240 5% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(240 5% 10%)', border: '1px solid hsl(240 4% 16%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="novos" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="encerrados" fill="hsl(240 4% 25%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Processes */}
        <motion.div {...fade(9)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Últimas Movimentações</h3>
          <ScrollArea className="h-64">
            <div className="space-y-3 pr-4">
              {processos_movimentacao.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma movimentação recente</p>
              ) : (
                processos_movimentacao.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/processos/${p.id}`}>
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.cliente_nome || p.titulo}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.numero}</div>
                        {p.ultima_movimentacao && <div className="text-xs text-primary mt-1">{p.ultima_movimentacao}</div>}
                      </div>
                      {p.tipo && <span className="inline-block px-2 py-1 rounded text-xs bg-primary/20 text-primary whitespace-nowrap">{p.tipo}</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div {...fade(10)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Prazos Próximos</h3>
          <ScrollArea className="h-64">
            <div className="space-y-3 pr-4">
              {proximos_prazos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum prazo pendente</p>
              ) : (
                proximos_prazos.slice(0, 5).map((p) => (
                  <div key={`${p.id}-${p.data_prazo}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{p.descricao || 'Prazo'}</div>
                      <div className="text-xs text-muted-foreground">{p.processo_numero || p.processo_titulo}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatDate(p.data_prazo || p.data_final)}</div>
                      <Badge className={`text-[10px] mt-1 ${getPrioridadeColor(p.prioridade)}`}>{p.prioridade}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </div>
  );
}
