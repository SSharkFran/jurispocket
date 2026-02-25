import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Search, Zap, Activity, Clock, RefreshCw, Check, AlertCircle, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const monitorados = [
  { id: 1, numero: "0001234-56.2024.8.26.0100", tribunal: "TJSP", status: "ativo", ultimaVerificacao: "25/02/2026 08:00", movimentacoes: 12, novas: 2 },
  { id: 2, numero: "0005678-90.2024.8.13.0001", tribunal: "TJPB", status: "ativo", ultimaVerificacao: "25/02/2026 08:00", movimentacoes: 8, novas: 0 },
  { id: 3, numero: "0009012-34.2024.5.01.0042", tribunal: "TRT1", status: "ativo", ultimaVerificacao: "25/02/2026 08:00", movimentacoes: 5, novas: 1 },
  { id: 4, numero: "0003456-78.2024.8.19.0001", tribunal: "TJRJ", status: "pausado", ultimaVerificacao: "24/02/2026 17:30", movimentacoes: 3, novas: 0 },
];

const movimentacoesRecentes = [
  { processo: "0001234-56.2024", movimento: "Decisão proferida", data: "25/02/2026 14:32", tribunal: "TJSP", lida: false },
  { processo: "0001234-56.2024", movimento: "Juntada de petição", data: "25/02/2026 10:15", tribunal: "TJSP", lida: false },
  { processo: "0009012-34.2024", movimento: "Audiência designada para 15/03/2026", data: "25/02/2026 09:45", tribunal: "TRT1", lida: true },
  { processo: "0005678-90.2024", movimento: "Citação por AR", data: "24/02/2026 16:20", tribunal: "TJPB", lida: true },
  { processo: "0003456-78.2024", movimento: "Contestação apresentada", data: "24/02/2026 11:10", tribunal: "TJRJ", lida: true },
];

const Datajud = () => {
  const [consultaNumero, setConsultaNumero] = useState("");

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
            />
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Zap className="mr-2 h-4 w-4" /> Consultar
          </Button>
        </div>
      </motion.div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Processos Monitorados", value: "12", icon: Activity, color: "text-primary" },
          { label: "Movimentações Hoje", value: "3", icon: Zap, color: "text-accent" },
          { label: "Última Verificação", value: "08:00", icon: Clock, color: "text-muted-foreground" },
          { label: "Próxima Verificação", value: "17:30", icon: RefreshCw, color: "text-success" },
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processos monitorados */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Processos Monitorados</h3>
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              <RefreshCw className="mr-1 h-3 w-3" /> Executar Agora
            </Button>
          </div>
          <div className="space-y-2">
            {monitorados.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-mono">{m.numero}</div>
                  <div className="text-xs text-muted-foreground">{m.tribunal} · Última: {m.ultimaVerificacao}</div>
                </div>
                <div className="flex items-center gap-3">
                  {m.novas > 0 && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> {m.novas} nova(s)
                    </span>
                  )}
                  <span className={m.status === "ativo" ? "badge-ativo" : "badge-pendente"}>{m.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Movimentações recentes */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Movimentações Recentes</h3>
          <div className="space-y-2">
            {movimentacoesRecentes.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className={`p-3 rounded-lg transition-colors ${!m.lida ? "bg-primary/5 border border-primary/10" : "bg-secondary/30 hover:bg-secondary/50"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      {!m.lida && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                      {m.movimento}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{m.processo} · {m.tribunal} · {m.data}</div>
                  </div>
                  {!m.lida && <Check className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Datajud;
