import { motion } from "framer-motion";
import { Shield, Users, DollarSign, FolderOpen, Building, TrendingUp, Activity, Settings, Tag, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from "recharts";

const stats = [
  { label: "Total Usuários", value: "342", change: "+28 este mês", icon: Users, color: "text-primary" },
  { label: "Workspaces", value: "156", change: "+12 este mês", icon: Building, color: "text-accent" },
  { label: "MRR", value: "R$ 24.800", change: "+8.5%", icon: DollarSign, color: "text-success" },
  { label: "Processos Totais", value: "2.847", change: "+145 este mês", icon: FolderOpen, color: "text-info" },
];

const planosDist = [
  { plano: "Gratuito", usuarios: 198 },
  { plano: "Pro", usuarios: 112 },
  { plano: "Escritório", usuarios: 32 },
];

const mrrHistory = [
  { mes: "Set", valor: 18500 },
  { mes: "Out", valor: 19800 },
  { mes: "Nov", valor: 21200 },
  { mes: "Dez", valor: 22100 },
  { mes: "Jan", valor: 23400 },
  { mes: "Fev", valor: 24800 },
];

const usuariosRecentes = [
  { nome: "Fernanda Lima", email: "fernanda@email.com", plano: "Pro", data: "25/02/2026", status: "ativo" },
  { nome: "Ricardo Moura", email: "ricardo.m@email.com", plano: "Gratuito", data: "24/02/2026", status: "ativo" },
  { nome: "Juliana Costa", email: "juliana.c@email.com", plano: "Escritório", data: "23/02/2026", status: "ativo" },
  { nome: "Eduardo Pinto", email: "eduardo.p@email.com", plano: "Pro", data: "22/02/2026", status: "ativo" },
  { nome: "Mariana Souza", email: "mariana.s@email.com", plano: "Gratuito", data: "21/02/2026", status: "inativo" },
];

const logsAuditoria = [
  { acao: "login", usuario: "Dr. Guto", entidade: "auth", data: "25/02/2026 14:32" },
  { acao: "criar", usuario: "Dra. Maria", entidade: "processo", data: "25/02/2026 11:20" },
  { acao: "editar", usuario: "Admin", entidade: "plano", data: "25/02/2026 09:45" },
  { acao: "excluir", usuario: "Admin", entidade: "cupom", data: "24/02/2026 16:30" },
];

const SuperAdmin = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <Shield className="h-6 w-6 text-primary" />
      <div>
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground">Painel de administração do sistema</p>
      </div>
    </div>

    {/* Stats */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }} className="stat-card"
        >
          <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
          <div className="text-2xl font-bold">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-xs text-success mt-1">{s.change}</div>
        </motion.div>
      ))}
    </div>

    {/* Charts */}
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Distribuição por Plano</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={planosDist} layout="vertical">
            <XAxis type="number" tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="plano" tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="usuarios" fill="hsl(160 84% 39%)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Evolução MRR</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mrrHistory}>
            <XAxis dataKey="mes" tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
            <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="valor" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={{ fill: "hsl(160 84% 39%)", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Quick actions */}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { icon: Users, label: "Gerenciar Usuários", desc: "342 usuários" },
        { icon: Tag, label: "Cupons", desc: "5 ativos" },
        { icon: Settings, label: "Configurações", desc: "Sistema" },
        { icon: FileText, label: "Logs de Auditoria", desc: "Últimos 30 dias" },
      ].map((a, i) => (
        <motion.div key={a.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card-hover p-4 flex items-center gap-3 cursor-pointer"
        >
          <a.icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">{a.label}</div>
            <div className="text-xs text-muted-foreground">{a.desc}</div>
          </div>
        </motion.div>
      ))}
    </div>

    {/* Tables */}
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Usuários Recentes</h3>
        <div className="space-y-2">
          {usuariosRecentes.map(u => (
            <div key={u.email} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div>
                <div className="text-sm font-medium">{u.nome}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="text-right">
                <span className="feature-badge text-[10px]">{u.plano}</span>
                <div className="text-xs text-muted-foreground mt-1">{u.data}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" /> Logs de Auditoria
        </h3>
        <div className="space-y-2">
          {logsAuditoria.map((l, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm"><span className="font-medium">{l.usuario}</span> · <span className="text-primary">{l.acao}</span></div>
                  <div className="text-xs text-muted-foreground">{l.entidade}</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{l.data}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SuperAdmin;
