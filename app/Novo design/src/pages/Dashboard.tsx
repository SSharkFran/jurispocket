import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  FolderOpen, Users, Clock, DollarSign, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Bot, Globe, MessageSquare, Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";
import { processos as processosApi, financeiro, prazos } from "@/services/api";
import { toast } from "sonner";

interface DashboardStats {
  processosAtivos: number;
  totalClientes: number;
  prazosProximos: number;
  receitaMensal: number;
}

interface ProcessoRecente {
  id: number;
  numero: string;
  cliente: string;
  tipo: string;
  status: string;
  movimento?: string;
}

interface PrazoProximo {
  id: number;
  processo: string;
  tipo: string;
  data: string;
  prioridade: string;
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    processosAtivos: 0,
    totalClientes: 0,
    prazosProximos: 0,
    receitaMensal: 0,
  });
  const [recentProcessos, setRecentProcessos] = useState<ProcessoRecente[]>([]);
  const [prazosProximos, setPrazosProximos] = useState<PrazoProximo[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [processosChart, setProcessosChart] = useState<any[]>([]);
  const [temDadosFinanceiros, setTemDadosFinanceiros] = useState(false);
  const [temDadosProcessos, setTemDadosProcessos] = useState(false);

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05, duration: 0.4 }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Carregar processos
      const processosRes = await processosApi.list();
      const processosData = processosRes.data.processos || processosRes.data || [];
      
      // Carregar financeiro
      const financeiroRes = await financeiro.list();
      const transacoesData = financeiroRes.data || [];
      
      // Carregar prazos
      const prazosRes = await prazos.list();
      const prazosData = prazosRes.data || [];

      // Calcular estatísticas
      const processosAtivos = processosData.filter((p: any) => p.status === 'ativo').length;
      
      // Extrair clientes únicos dos processos
      const clientesUnicos = new Set(processosData.map((p: any) => p.cliente_id).filter(Boolean));
      
      // Prazos próximos (próximos 7 dias e não cumpridos)
      const hoje = new Date();
      const seteDiasDepois = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
      const prazosProximosCount = prazosData.filter((p: any) => {
        if (p.status === 'cumprido') return false;
        const dataPrazo = new Date(p.data_final);
        return dataPrazo >= hoje && dataPrazo <= seteDiasDepois;
      }).length;

      // Receita do mês atual
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const receitaMensal = transacoesData
        .filter((t: any) => {
          const dataTransacao = new Date(t.data_transacao);
          return t.tipo === 'entrada' && 
                 dataTransacao.getMonth() === mesAtual && 
                 dataTransacao.getFullYear() === anoAtual;
        })
        .reduce((sum: number, t: any) => sum + (parseFloat(t.valor) || 0), 0);

      setStats({
        processosAtivos,
        totalClientes: clientesUnicos.size,
        prazosProximos: prazosProximosCount,
        receitaMensal,
      });

      // Processos recentes (últimos 4)
      const recentes = processosData
        .slice(0, 4)
        .map((p: any) => ({
          id: p.id,
          numero: p.numero_cnj || p.numero,
          cliente: p.cliente_nome || 'Cliente não informado',
          tipo: p.tipo || 'Não informado',
          status: p.status,
          movimento: p.ultima_movimentacao || 'Sem movimentação',
        }));
      setRecentProcessos(recentes);

      // Prazos próximos (próximos 4)
      const prazosOrdenados = prazosData
        .filter((p: any) => p.status !== 'cumprido')
        .sort((a: any, b: any) => new Date(a.data_final).getTime() - new Date(b.data_final).getTime())
        .slice(0, 4)
        .map((p: any) => ({
          id: p.id,
          processo: p.processo_numero || p.processo_titulo || 'Processo não informado',
          tipo: p.descricao || p.tipo || 'Prazo',
          data: new Date(p.data_final).toLocaleDateString('pt-BR'),
          prioridade: p.prioridade,
        }));
      setPrazosProximos(prazosOrdenados);

      // === GRÁFICO FINANCEIRO - Apenas meses com dados reais ===
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      // Agrupar transações por mês/ano
      const transacoesPorMes: Record<string, { receita: number; despesa: number }> = {};
      
      transacoesData.forEach((t: any) => {
        if (!t.data_transacao) return;
        const data = new Date(t.data_transacao);
        const chave = `${meses[data.getMonth()]}/${data.getFullYear()}`;
        
        if (!transacoesPorMes[chave]) {
          transacoesPorMes[chave] = { receita: 0, despesa: 0 };
        }
        
        const valor = parseFloat(t.valor) || 0;
        if (t.tipo === 'entrada') {
          transacoesPorMes[chave].receita += valor;
        } else if (t.tipo === 'saida') {
          transacoesPorMes[chave].despesa += valor;
        }
      });

      // Verificar se tem dados financeiros
      const temFin = Object.values(transacoesPorMes).some(m => m.receita > 0 || m.despesa > 0);
      setTemDadosFinanceiros(temFin);
      
      // Ordenar meses cronologicamente
      const mesesOrdenados = Object.entries(transacoesPorMes)
        .filter(([_, valores]) => valores.receita > 0 || valores.despesa > 0)
        .sort((a, b) => {
          const [mesA, anoA] = a[0].split('/');
          const [mesB, anoB] = b[0].split('/');
          const dateA = new Date(parseInt(anoA), meses.indexOf(mesA));
          const dateB = new Date(parseInt(anoB), meses.indexOf(mesB));
          return dateA.getTime() - dateB.getTime();
        })
        .slice(-6) // Últimos 6 meses com dados
        .map(([mes, valores]) => ({
          mes,
          receita: valores.receita,
          despesa: valores.despesa
        }));
      
      setChartData(mesesOrdenados);

      // === GRÁFICO DE PROCESSOS - Baseado nas datas reais de criação ===
      const processosPorMes: Record<string, { novos: number; encerrados: number }> = {};
      
      processosData.forEach((p: any) => {
        // Usar data de abertura ou data de criação
        const dataStr = p.data_abertura || p.created_at;
        if (!dataStr) return;
        
        const data = new Date(dataStr);
        const chave = `${meses[data.getMonth()]}/${data.getFullYear()}`;
        
        if (!processosPorMes[chave]) {
          processosPorMes[chave] = { novos: 0, encerrados: 0 };
        }
        
        if (p.status === 'encerrado' || p.status === 'arquivado') {
          processosPorMes[chave].encerrados++;
        } else {
          processosPorMes[chave].novos++;
        }
      });

      // Verificar se tem dados de processos por mês
      const temProc = Object.values(processosPorMes).some(m => m.novos > 0 || m.encerrados > 0);
      setTemDadosProcessos(temProc);
      
      // Ordenar meses cronologicamente
      const processosMesesOrdenados = Object.entries(processosPorMes)
        .sort((a, b) => {
          const [mesA, anoA] = a[0].split('/');
          const [mesB, anoB] = b[0].split('/');
          const dateA = new Date(parseInt(anoA), meses.indexOf(mesA));
          const dateB = new Date(parseInt(anoB), meses.indexOf(mesB));
          return dateA.getTime() - dateB.getTime();
        })
        .slice(-6) // Últimos 6 meses com dados
        .map(([mes, valores]) => ({
          mes,
          novos: valores.novos,
          encerrados: valores.encerrados
        }));
      
      setProcessosChart(processosMesesOrdenados);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statsConfig = [
    { label: "Processos Ativos", value: stats.processosAtivos.toString(), change: "", up: true, icon: FolderOpen },
    { label: "Clientes", value: stats.totalClientes.toString(), change: "", up: true, icon: Users },
    { label: "Prazos Próximos", value: stats.prazosProximos.toString(), change: "7 dias", up: false, icon: Clock, alert: stats.prazosProximos > 0 },
    { label: "Receita Mensal", value: formatCurrency(stats.receitaMensal), change: "", up: true, icon: DollarSign },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Aqui está o resumo do seu escritório hoje.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((s, i) => (
          <motion.div key={s.label} {...fade(i)} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.alert ? "text-warning" : "text-muted-foreground"}`} />
              {s.change && (
                <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-success" : s.alert ? "text-warning" : "text-muted-foreground"}`}>
                  {s.up ? <ArrowUpRight className="h-3 w-3" /> : s.alert ? <AlertTriangle className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {s.change}
                </span>
              )}
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - WOW Features */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Globe, title: "Datajud", desc: "Consulte processos na base nacional", color: "text-primary", href: "/app/datajud" },
          { icon: Bot, title: "Copiloto IA", desc: "Pergunte sobre seus processos", color: "text-accent", href: "/app/ia" },
          { icon: MessageSquare, title: "WhatsApp", desc: "Comunicação com clientes", color: "text-success", href: "/app/whatsapp" },
        ].map((a, i) => (
          <motion.a key={a.title} href={a.href} {...fade(i + 4)}
            className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-secondary ${a.color}`}>
              <a.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-sm">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.desc}</div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fade(7)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Financeiro — Histórico</h3>
          {temDadosFinanceiros ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="receita" stroke="hsl(160 84% 39%)" fill="url(#gRec)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesa" stroke="hsl(0 72% 51%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground text-sm">
              <DollarSign className="h-10 w-10 mb-2 opacity-30" />
              <p>Sem movimentações financeiras registradas</p>
              <p className="text-xs mt-1">Adicione transações no módulo Financeiro</p>
            </div>
          )}
        </motion.div>

        <motion.div {...fade(8)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Processos — Novos vs Encerrados</h3>
          {temDadosProcessos ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={processosChart} barGap={4}>
                <XAxis dataKey="mes" tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="novos" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="encerrados" fill="hsl(240 4% 25%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground text-sm">
              <FolderOpen className="h-10 w-10 mb-2 opacity-30" />
              <p>Sem histórico de processos</p>
              <p className="text-xs mt-1">Os processos aparecerão aqui conforme forem cadastrados</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Processes */}
        <motion.div {...fade(9)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Últimos Processos</h3>
          <div className="space-y-3">
            {recentProcessos.length > 0 ? (
              recentProcessos.map(p => (
                <div key={p.id} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.cliente}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.numero}</div>
                    <div className="text-xs text-primary mt-1">{p.movimento}</div>
                  </div>
                  <span className="badge-ativo shrink-0">{p.tipo}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum processo encontrado
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div {...fade(10)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Prazos Próximos</h3>
          <div className="space-y-3">
            {prazosProximos.length > 0 ? (
              prazosProximos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium">{p.tipo}</div>
                    <div className="text-xs text-muted-foreground">{p.processo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{p.data}</div>
                    <span className={`badge-${p.prioridade}`}>{p.prioridade}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum prazo próximo
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
