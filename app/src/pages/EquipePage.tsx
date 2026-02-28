import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Mail, Shield, Crown, UserX, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { equipe } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
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
  invited_by_nome?: string;
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
  const { user } = useAuth();
  const canManageTeam = user?.role === 'admin' || user?.role === 'superadmin';
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [isInviting, setIsInviting] = useState(false);
  const [actionMemberId, setActionMemberId] = useState<number | null>(null);

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const responseData = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
    return responseData?.error || responseData?.message || fallback;
  };

  const carregarDados = useCallback(async () => {
    try {
      setIsLoading(true);
      const convitesRequest = canManageTeam
        ? equipe.convitesWorkspace()
        : Promise.resolve({ data: [] as Convite[] });

      const [membrosRes, convitesRes] = await Promise.all([
        equipe.list(),
        convitesRequest,
      ]);

      const membrosData = membrosRes.data?.membros || membrosRes.data || [];
      const convitesData = convitesRes.data?.convites || convitesRes.data || [];

      setMembros(Array.isArray(membrosData) ? membrosData : []);
      setConvites(Array.isArray(convitesData) ? convitesData : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar dados da equipe'));
    } finally {
      setIsLoading(false);
    }
  }, [canManageTeam]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleConvidarMembro = async () => {
    if (!canManageTeam) {
      toast.error('Apenas administradores podem convidar membros');
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValido) {
      toast.error('Informe um e-mail válido');
      return;
    }

    try {
      setIsInviting(true);
      await equipe.convidar({ email, role: inviteRole });
      toast.success('Convite enviado com sucesso');
      setInviteEmail('');
      setInviteRole('user');
      setIsInviteDialogOpen(false);
      await carregarDados();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar convite'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelarConvite = async (id: number) => {
    try {
      await equipe.cancelarConvite(id);
      toast.success('Convite cancelado');
      carregarDados();
    } catch (error) {
      toast.error('Erro ao cancelar convite');
    }
  };

  const handleAtualizarRole = async (membro: Membro, novaRole: 'user' | 'admin') => {
    if (!canManageTeam || membro.role === novaRole) return;

    try {
      setActionMemberId(membro.id);
      await equipe.atualizarRole(membro.id, novaRole);
      toast.success('Permissão atualizada com sucesso');
      await carregarDados();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar permissão'));
    } finally {
      setActionMemberId(null);
    }
  };

  const handleRemoverMembro = async (membro: Membro) => {
    if (!canManageTeam) return;
    if (membro.id === user?.id) {
      toast.error('Você não pode remover a si mesmo');
      return;
    }

    if (!window.confirm(`Remover ${membro.nome} da equipe?`)) return;

    try {
      setActionMemberId(membro.id);
      await equipe.removerMembro(membro.id);
      toast.success('Membro removido com sucesso');
      await carregarDados();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover membro'));
    } finally {
      setActionMemberId(null);
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
          {!canManageTeam && (
            <p className="text-xs text-muted-foreground mt-1">
              Somente administradores podem convidar/remover membros.
            </p>
          )}
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!canManageTeam}
            >
              <Plus className="mr-2 h-4 w-4" /> Convidar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Convidar novo membro</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="membro@exemplo.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  disabled={isInviting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Permissão</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as 'user' | 'admin')}
                  disabled={isInviting}
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Membro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isInviting}>
                Cancelar
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleConvidarMembro}
                disabled={isInviting || !inviteEmail.trim()}
              >
                {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Enviar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

                      {canManageTeam && m.role !== 'superadmin' && m.id !== user?.id ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              disabled={actionMemberId === m.id}
                            >
                              {actionMemberId === m.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => handleAtualizarRole(m, 'admin')}>
                                <Crown className="h-4 w-4" />
                                Promover para Admin
                              </DropdownMenuItem>
                            )}
                            {m.role !== 'user' && (
                              <DropdownMenuItem onClick={() => handleAtualizarRole(m, 'user')}>
                                <Shield className="h-4 w-4" />
                                Definir como Membro
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleRemoverMembro(m)}>
                              <UserX className="h-4 w-4" />
                              Remover da equipe
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/60"
                          disabled
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      )}
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
                      {canManageTeam && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleCancelarConvite(c.id)}
                        >
                          <UserX className="mr-1 h-3 w-3" /> Cancelar
                        </Button>
                      )}
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
