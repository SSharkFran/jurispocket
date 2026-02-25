import { motion } from "framer-motion";
import { Users, Plus, Mail, Shield, Crown, UserX, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const membros = [
  { id: 1, nome: "Dr. Guto", email: "guto@jurispocket.com", role: "admin", oab: "OAB/SP 123.456", avatar: "G" },
  { id: 2, nome: "Dra. Maria Silva", email: "maria@jurispocket.com", role: "user", oab: "OAB/SP 654.321", avatar: "M" },
  { id: 3, nome: "João Oliveira", email: "joao@jurispocket.com", role: "user", oab: null, avatar: "J" },
];

const convites = [
  { email: "pedro@email.com", role: "user", data: "24/02/2026" },
  { email: "carolina@email.com", role: "user", data: "22/02/2026" },
];

const roleIcons: Record<string, typeof Shield> = { admin: Crown, user: Shield, superadmin: Crown };
const roleLabels: Record<string, string> = { admin: "Admin", user: "Membro", superadmin: "Super Admin" };

const Equipe = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Escritório Silva & Associados</p>
      </div>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" /> Convidar Membro
      </Button>
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Membros ({membros.length})</h3>
        <div className="space-y-3">
          {membros.map((m, i) => {
            const RoleIcon = roleIcons[m.role] || Shield;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {m.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{m.nome}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                    {m.oab && <div className="text-xs text-primary mt-0.5">{m.oab}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="feature-badge flex items-center gap-1 text-[10px]">
                    <RoleIcon className="h-3 w-3" /> {roleLabels[m.role]}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Convites Pendentes</h3>
        {convites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum convite pendente</p>
        ) : (
          <div className="space-y-3">
            {convites.map(c => (
              <div key={c.email} className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{c.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Enviado {c.data}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                    <UserX className="mr-1 h-3 w-3" /> Cancelar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default Equipe;
