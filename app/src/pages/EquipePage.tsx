import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Mail, Shield, Crown, UserX, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { equipe } from '@/services/api';
import { toast } from 'sonner';

interface Membro {
  id: number;
  nome: string;
  email: string;
  role: string;
  oab?: string;
  avatar?: string;
}

interface Convite {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

const roleIcons: Record<string, typeof Shield> = { 
  admin: Crown, 
  user: Shield, 
  superadmin: Crown 
};

const roleLabels: Record<string, string> = { 
  admin: 'Admin', 
  user: 'Membro', 
  superadmin: 'Super Admin' 
};

export function EquipePage() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [membrosRes, convitesRes] = await Promise.all([
        equipe.list(),
        equipe.convitesPendentes(),
      ]);
      setMembros(membrosRes.data.membros || membrosRes.data || []);
      setConvites(convitesRes.data.convites || convitesRes.data || []);
    } catch (error) {
      toast.error('Erro ao carregar dados da equipe');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCancelarConvite = async (id: number) => {
    try {
      await equipe.cancelarConvite(id);
      toast.success('Convite cancelado');
      carregarDados();
    } catch (error) {
      toast.error('Erro ao cancelar convite');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-sm text-muted-foreground">{membros.length} membros</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => toast.info('Convidar membro em desenvolvimento')}
        >
          <Plus className="mr-2 h-4 w-4" /> Convidar Membro
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="font-semibold mb-4 text-sm">Membros ({membros.length})</h3>
            <div className="space-y-3">
              {membros.map((m, i) => {
                const RoleIcon = roleIcons[m.role] || Shield;
                const initials = m.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                return (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {initials}
                      </div>
                      <div>
                        <div className="font-medium">{m.nome}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                        {m.oab && <div className="text-xs text-primary mt-0.5">{m.oab}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="feature-badge flex items-center gap-1 text-[10px]">
                        <RoleIcon className="h-3 w-3" /> {roleLabels[m.role] || m.role}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => toast.info('Opções em desenvolvimento')}
                      >
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
                  <div key={c.id} className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{c.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Enviado {formatDate(c.created_at)}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleCancelarConvite(c.id)}
                      >
                        <UserX className="mr-1 h-3 w-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

