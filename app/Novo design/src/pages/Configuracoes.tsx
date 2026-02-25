import { motion } from "framer-motion";
import { User, Mail, Phone, Shield, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Configuracoes = () => (
  <div className="space-y-6 max-w-2xl">
    <h1 className="text-2xl font-bold">Configurações</h1>

    {/* Perfil */}
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="h-4 w-4" /> Perfil</h3>
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">G</div>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground">Alterar foto</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input defaultValue="Dr. Guto" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>OAB</Label>
            <Input defaultValue="OAB/SP 123.456" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input defaultValue="guto@jurispocket.com" className="pl-10 bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input defaultValue="(11) 99999-9999" className="pl-10 bg-secondary border-border" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>

    {/* Notificações */}
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações</h3>
      <div className="space-y-4">
        {[
          { label: "Alertas por Email", desc: "Receber notificações de movimentações por email" },
          { label: "Alertas por WhatsApp", desc: "Receber notificações de prazos por WhatsApp" },
          { label: "Resumo diário", desc: "Receber resumo diário das atividades do escritório" },
        ].map(n => (
          <div key={n.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div>
              <div className="text-sm font-medium">{n.label}</div>
              <div className="text-xs text-muted-foreground">{n.desc}</div>
            </div>
            <Switch defaultChecked />
          </div>
        ))}
      </div>
    </motion.div>

    {/* Plano */}
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield className="h-4 w-4" /> Plano Atual</h3>
      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
        <div>
          <div className="font-semibold text-primary">Plano Pro</div>
          <div className="text-sm text-muted-foreground">R$ 97/mês · Renovação: 01/03/2026</div>
        </div>
        <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/10">
          Gerenciar Plano
        </Button>
      </div>
    </motion.div>

    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
      <Save className="mr-2 h-4 w-4" /> Salvar Alterações
    </Button>
  </div>
);

export default Configuracoes;
