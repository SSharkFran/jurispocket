import { motion } from "framer-motion";
import { Plus, Clock, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const tarefas = [
  { id: 1, titulo: "Elaborar contestação - Proc. 001234", processo: "Miguel Andrade", prioridade: "alta", status: "pendente", vencimento: "27/02/2026", atribuido: "Dr. Guto" },
  { id: 2, titulo: "Revisar petição inicial", processo: "Ana Santos", prioridade: "alta", status: "em_andamento", vencimento: "28/02/2026", atribuido: "Dra. Maria" },
  { id: 3, titulo: "Preparar documentos para audiência", processo: "Carlos Ferreira", prioridade: "media", status: "pendente", vencimento: "02/03/2026", atribuido: "Dr. Guto" },
  { id: 4, titulo: "Enviar procuração assinada", processo: "Luciana Mendes", prioridade: "baixa", status: "concluida", vencimento: "20/02/2026", atribuido: "Dra. Maria" },
  { id: 5, titulo: "Agendar reunião com perito", processo: "Ana Santos", prioridade: "media", status: "pendente", vencimento: "05/03/2026", atribuido: "Dr. Guto" },
];

const prazos = [
  { id: 1, tipo: "Contestação", processo: "0001234-56.2024", data: "27/02/2026", prioridade: "alta", status: "pendente" },
  { id: 2, tipo: "Recurso Ordinário", processo: "0005678-90.2024", data: "28/02/2026", prioridade: "alta", status: "pendente" },
  { id: 3, tipo: "Audiência de Instrução", processo: "0009012-34.2024", data: "02/03/2026", prioridade: "media", status: "pendente" },
  { id: 4, tipo: "Manifestação", processo: "0003456-78.2024", data: "05/03/2026", prioridade: "baixa", status: "pendente" },
  { id: 5, tipo: "Juntada de documentos", processo: "0001234-56.2024", data: "10/03/2026", prioridade: "media", status: "cumprido" },
];

const statusIcon = (s: string) => {
  if (s === "concluida" || s === "cumprido") return <Check className="h-4 w-4 text-success" />;
  if (s === "em_andamento") return <Clock className="h-4 w-4 text-info" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
};

const Tarefas = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Tarefas & Prazos</h1>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Nova Tarefa</Button>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      {/* Tarefas */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Tarefas</h3>
        <div className="space-y-2">
          {tarefas.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              {statusIcon(t.status)}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</div>
                <div className="text-xs text-muted-foreground">{t.processo} · {t.atribuido} · {t.vencimento}</div>
              </div>
              <span className={`badge-${t.prioridade}`}>{t.prioridade}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Prazos */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Prazos Processuais</h3>
        <div className="space-y-2">
          {prazos.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {statusIcon(p.status)}
                <div>
                  <div className="text-sm font-medium">{p.tipo}</div>
                  <div className="text-xs text-muted-foreground">{p.processo}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm">{p.data}</div>
                <span className={`badge-${p.prioridade}`}>{p.prioridade}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Tarefas;
