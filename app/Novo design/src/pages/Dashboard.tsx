import { motion } from "framer-motion";
import { 
  FolderOpen, Users, Clock, DollarSign, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Bot, Globe, MessageSquare
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";

const stats = [
  { label: "Processos Ativos", value: "47", change: "+3", up: true, icon: FolderOpen },
  { label: "Clientes", value: "128", change: "+8", up: true, icon: Users },
  { label: "Prazos Próximos", value: "5", change: "3 dias", up: false, icon: Clock, alert: true },
  { label: "Receita Mensal", value: "R$ 45.800", change: "+12%", up: true, icon: DollarSign },
];

const recentProcessos = [
  { numero: "0001234-56.2024.8.26.0100", cliente: "Miguel Andrade", tipo: "Trabalhista", status: "ativo", movimento: "Decisão proferida" },
  { numero: "0005678-90.2024.8.13.0001", cliente: "Ana Beatriz Santos", tipo: "Cível", status: "ativo", movimento: "Citação realizada" },
  { numero: "0009012-34.2024.5.01.0042", cliente: "Carlos Ferreira", tipo: "Trabalhista", status: "ativo", movimento: "Audiência designada" },
  { numero: "0003456-78.2024.8.19.0001", cliente: "Luciana Mendes", tipo: "Família", status: "pendente", movimento: "Contestação apresentada" },
];

const prazosProximos = [
  { processo: "0001234-56.2024", tipo: "Contestação", data: "27/02/2026", prioridade: "alta" },
  { processo: "0005678-90.2024", tipo: "Recurso", data: "28/02/2026", prioridade: "alta" },
  { processo: "0009012-34.2024", tipo: "Audiência", data: "02/03/2026", prioridade: "media" },
  { processo: "0003456-78.2024", tipo: "Manifestação", data: "05/03/2026", prioridade: "baixa" },
];

const chartData = [
  { mes: "Set", receita: 38000, despesa: 12000 },
  { mes: "Out", receita: 42000, despesa: 14000 },
  { mes: "Nov", receita: 39000, despesa: 11000 },
  { mes: "Dez", receita: 51000, despesa: 15000 },
  { mes: "Jan", receita: 44000, despesa: 13000 },
  { mes: "Fev", receita: 45800, despesa: 12500 },
];

const processosChart = [
  { mes: "Set", novos: 5, encerrados: 3 },
  { mes: "Out", novos: 8, encerrados: 4 },
  { mes: "Nov", novos: 6, encerrados: 7 },
  { mes: "Dez", novos: 4, encerrados: 2 },
  { mes: "Jan", novos: 7, encerrados: 5 },
  { mes: "Fev", novos: 3, encerrados: 1 },
];

const fade = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05, duration: 0.4 }
});

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bom dia, Dr. Guto 👋</h1>
        <p className="text-muted-foreground text-sm">Aqui está o resumo do seu escritório hoje.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fade(i)} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.alert ? "text-warning" : "text-muted-foreground"}`} />
              <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-success" : s.alert ? "text-warning" : "text-muted-foreground"}`}>
                {s.up ? <ArrowUpRight className="h-3 w-3" /> : s.alert ? <AlertTriangle className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.change}
              </span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - WOW Features */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Globe, title: "Datajud", desc: "12 processos monitorados", color: "text-primary", href: "/app/datajud" },
          { icon: Bot, title: "Copiloto IA", desc: "Pergunte sobre seus processos", color: "text-accent", href: "/app/ia" },
          { icon: MessageSquare, title: "WhatsApp", desc: "3 mensagens pendentes", color: "text-success", href: "/app/whatsapp" },
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
          <h3 className="font-semibold mb-4 text-sm">Financeiro — Últimos 6 meses</h3>
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
              <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="receita" stroke="hsl(160 84% 39%)" fill="url(#gRec)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" stroke="hsl(0 72% 51%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...fade(8)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Processos — Novos vs Encerrados</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={processosChart} barGap={4}>
              <XAxis dataKey="mes" tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
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
          <div className="space-y-3">
            {recentProcessos.map(p => (
              <div key={p.numero} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.cliente}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.numero}</div>
                  <div className="text-xs text-primary mt-1">{p.movimento}</div>
                </div>
                <span className="badge-ativo shrink-0">{p.tipo}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div {...fade(10)} className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Prazos Próximos</h3>
          <div className="space-y-3">
            {prazosProximos.map(p => (
              <div key={p.processo + p.tipo} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div>
                  <div className="text-sm font-medium">{p.tipo}</div>
                  <div className="text-xs text-muted-foreground">{p.processo}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{p.data}</div>
                  <span className={`badge-${p.prioridade}`}>{p.prioridade}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
