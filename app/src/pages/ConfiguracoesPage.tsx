import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Bell, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { auth } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ConfiguracoesPage = () => {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    oab: '',
  });
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    whatsapp: true,
    resumoDiario: false,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
        oab: user.oab || '',
      });
      setNotificacoes({
        email: user.alerta_email !== false,
        whatsapp: user.alerta_whatsapp !== false,
        resumoDiario: user.resumo_diario || false,
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await auth.updateProfile({
        nome: formData.nome,
        telefone: formData.telefone,
        alerta_email: notificacoes.email,
        alerta_whatsapp: notificacoes.whatsapp,
      });
      await refreshUser();
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = formData.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Perfil */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" /> Perfil
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {initials}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-muted-foreground"
              onClick={() => toast.info('Alterar foto em desenvolvimento')}
            >
              Alterar foto
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="bg-secondary border-border" 
              />
            </div>
            <div className="space-y-2">
              <Label>OAB</Label>
              <Input 
                value={formData.oab}
                onChange={(e) => setFormData({...formData, oab: e.target.value})}
                className="bg-secondary border-border" 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={formData.email}
                  disabled
                  className="pl-10 bg-secondary border-border" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="pl-10 bg-secondary border-border" 
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notificações */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notificações
        </h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Alertas por Email', desc: 'Receber notificações de movimentações por email' },
            { key: 'whatsapp', label: 'Alertas por WhatsApp', desc: 'Receber notificações de prazos por WhatsApp' },
            { key: 'resumoDiario', label: 'Resumo diário', desc: 'Receber resumo diário das atividades do escritório' },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div>
                <div className="text-sm font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <Switch 
                checked={notificacoes[n.key as keyof typeof notificacoes]}
                onCheckedChange={(checked) => 
                  setNotificacoes(prev => ({...prev, [n.key]: checked}))
                }
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Plano */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" /> Plano Atual
        </h3>
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div>
            <div className="font-semibold text-primary">Plano Pro</div>
            <div className="text-sm text-muted-foreground">R$ 97/mês · Renovação: 01/03/2026</div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-primary/20 text-primary hover:bg-primary/10"
            onClick={() => toast.info('Gerenciamento de plano em desenvolvimento')}
          >
            Gerenciar Plano
          </Button>
        </div>
      </motion.div>

      <Button 
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alterações
      </Button>
    </div>
  );
};

export default ConfiguracoesPage;
