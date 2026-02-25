import { motion } from "framer-motion";
import { MessageSquare, Send, Phone, CheckCheck, Clock, Users, Zap, QrCode, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const conversas = [
  { id: 1, cliente: "Miguel Andrade", telefone: "(11) 99876-5432", ultimaMensagem: "Obrigado pela atualização, Dr. Guto!", hora: "14:32", lida: true, novas: 0 },
  { id: 2, cliente: "Ana Beatriz Santos", telefone: "(21) 98765-4321", ultimaMensagem: "Recebi o link do processo. Muito útil!", hora: "11:20", lida: true, novas: 0 },
  { id: 3, cliente: "Carlos Ferreira", telefone: "(31) 97654-3210", ultimaMensagem: "Quando será a próxima audiência?", hora: "09:45", lida: false, novas: 1 },
  { id: 4, cliente: "Luciana Mendes", telefone: "(51) 96543-2109", ultimaMensagem: "Boa tarde, gostaria de saber...", hora: "Ontem", lida: false, novas: 3 },
];

const mensagensAutoConfig = [
  { tipo: "Boas-vindas", descricao: "Enviada ao cadastrar novo cliente", ativo: true, enviadas: 45 },
  { tipo: "Movimentação", descricao: "Notifica novas movimentações processuais", ativo: true, enviadas: 128 },
  { tipo: "Prazo", descricao: "Alerta sobre prazos próximos", ativo: true, enviadas: 67 },
  { tipo: "Link Público", descricao: "Envia link de acompanhamento do processo", ativo: true, enviadas: 33 },
  { tipo: "Cobrança", descricao: "Lembrete de honorários pendentes", ativo: false, enviadas: 0 },
];

const WhatsApp = () => (
  <div className="space-y-6">
    {/* Header */}
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card glow-border p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center" style={{ boxShadow: "0 0 20px hsl(142 71% 45% / 0.15)" }}>
            <MessageSquare className="h-6 w-6 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Automação WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Comunicação automática com clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-ativo flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Conectado</span>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
            <QrCode className="mr-2 h-4 w-4" /> QR Code
          </Button>
        </div>
      </div>
    </motion.div>

    {/* Stats */}
    <div className="grid gap-4 sm:grid-cols-4">
      {[
        { label: "Mensagens Enviadas", value: "273", icon: Send, color: "text-success" },
        { label: "Clientes Ativos", value: "48", icon: Users, color: "text-primary" },
        { label: "Automações Ativas", value: "4", icon: Zap, color: "text-accent" },
        { label: "Taxa de Entrega", value: "99.2%", icon: CheckCheck, color: "text-success" },
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
      {/* Conversas */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" /> Conversas Recentes
        </h3>
        <div className="space-y-2">
          {conversas.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success font-semibold text-sm shrink-0">
                {c.cliente.split(" ").map(n => n[0]).join("").slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.cliente}</span>
                  <span className="text-xs text-muted-foreground">{c.hora}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground truncate pr-4">{c.ultimaMensagem}</span>
                  {c.novas > 0 && (
                    <span className="h-5 min-w-[20px] rounded-full bg-success flex items-center justify-center text-[10px] font-bold text-success-foreground px-1.5 shrink-0">
                      {c.novas}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Automações */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" /> Mensagens Automáticas
        </h3>
        <div className="space-y-3">
          {mensagensAutoConfig.map((m, i) => (
            <motion.div key={m.tipo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${m.ativo ? "bg-success" : "bg-muted-foreground"}`} />
                <div>
                  <div className="text-sm font-medium">{m.tipo}</div>
                  <div className="text-xs text-muted-foreground">{m.descricao}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{m.enviadas}</div>
                <div className="text-xs text-muted-foreground">enviadas</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default WhatsApp;
