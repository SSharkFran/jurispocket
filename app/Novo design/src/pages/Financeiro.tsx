import { motion } from "framer-motion";
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const resumo = { receitas: 45800, despesas: 12500, saldo: 33300, pendentes: 8200 };

const transacoes = [
  { id: 1, tipo: "entrada", descricao: "Honorários - Miguel Andrade", valor: 15000, data: "25/02/2026", status: "pago", cliente: "Miguel Andrade" },
  { id: 2, tipo: "entrada", descricao: "Honorários - Ana Santos", valor: 8500, data: "22/02/2026", status: "pendente", cliente: "Ana Beatriz Santos" },
  { id: 3, tipo: "saida", descricao: "Custas processuais - Proc. 001234", valor: 3200, data: "20/02/2026", status: "pago", cliente: "Miguel Andrade" },
  { id: 4, tipo: "entrada", descricao: "Acordo - Carlos Ferreira", valor: 22300, data: "18/02/2026", status: "pago", cliente: "Carlos Ferreira" },
  { id: 5, tipo: "saida", descricao: "Perito - Proc. 005678", valor: 5000, data: "15/02/2026", status: "pago", cliente: "Ana Beatriz Santos" },
  { id: 6, tipo: "saida", descricao: "Deslocamento - Audiência BH", valor: 800, data: "12/02/2026", status: "pago", cliente: "Carlos Ferreira" },
];

const categoriasData = [
  { name: "Honorários", value: 45800, color: "hsl(160, 84%, 39%)" },
  { name: "Custas", value: 3200, color: "hsl(0, 72%, 51%)" },
  { name: "Perícias", value: 5000, color: "hsl(38, 92%, 50%)" },
  { name: "Outros", value: 4300, color: "hsl(217, 91%, 60%)" },
];

const Financeiro = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Fevereiro 2026</p>
      </div>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" /> Nova Transação
      </Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Receitas", value: `R$ ${resumo.receitas.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
        { label: "Despesas", value: `R$ ${resumo.despesas.toLocaleString()}`, icon: TrendingDown, color: "text-destructive" },
        { label: "Saldo", value: `R$ ${resumo.saldo.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
        { label: "Pendentes", value: `R$ ${resumo.pendentes.toLocaleString()}`, icon: DollarSign, color: "text-warning" },
      ].map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }} className="stat-card"
        >
          <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
          <div className="text-2xl font-bold">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </motion.div>
      ))}
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Transações Recentes</h3>
        <div className="space-y-2">
          {transacoes.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.tipo === "entrada" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {t.tipo === "entrada" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.descricao}</div>
                  <div className="text-xs text-muted-foreground">{t.data} · {t.cliente}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold text-sm ${t.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                  {t.tipo === "entrada" ? "+" : "-"}R$ {t.valor.toLocaleString()}
                </div>
                <span className={t.status === "pago" ? "badge-ativo" : "badge-pendente"}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Por Categoria</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={categoriasData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
              {categoriasData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 mt-4">
          {categoriasData.map(c => (
            <div key={c.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-muted-foreground">{c.name}</span>
              </div>
              <span className="font-medium">R$ {c.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Financeiro;
