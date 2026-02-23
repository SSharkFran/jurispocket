import { useState, useEffect } from 'react';
import { equipe } from '@/services/api';
import type { User, Convite } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Plus, 
  Users, 
  Mail,
  UserCheck,
  Clock,
  Shield,
  User as UserIcon,
  Crown,
  Trash2,
  MoreVertical,
  X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  user: 'Usuário',
};

const roleColors: Record<string, string> = {
  superadmin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  admin: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  user: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export function EquipePage() {
  const [membros, setMembros] = useState<User[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'user',
  });
  const [membroToRemove, setMembroToRemove] = useState<User | null>(null);
  const [conviteToCancel, setConviteToCancel] = useState<Convite | null>(null);

  const fetchData = async () => {
    try {
      const [membrosRes, convitesRes] = await Promise.all([
        equipe.list(),
        equipe.convitesPendentes()
      ]);
      // Garante que sempre sejam arrays
      const membrosData = membrosRes.data?.membros || membrosRes.data || [];
      const convitesData = convitesRes.data?.convites || convitesRes.data || [];
      setMembros(Array.isArray(membrosData) ? membrosData : []);
      setConvites(Array.isArray(convitesData) ? convitesData : []);
    } catch (error) {
      toast.error('Erro ao carregar dados da equipe');
      setMembros([]);
      setConvites([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Digite um email válido');
      return;
    }
    try {
      await equipe.convidar({
        email: formData.email,
        role: formData.role,
      });
      toast.success('Convite enviado com sucesso!');
      setIsDialogOpen(false);
      setFormData({ email: '', role: 'user' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar convite');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const handleRemoveMembro = async () => {
    if (!membroToRemove) return;
    try {
      await equipe.removerMembro(membroToRemove.id);
      toast.success('Membro removido com sucesso!');
      setMembroToRemove(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover membro');
    }
  };

  const handleCancelarConvite = async () => {
    if (!conviteToCancel) return;
    try {
      await equipe.cancelarConvite(conviteToCancel.id);
      toast.success('Convite cancelado com sucesso!');
      setConviteToCancel(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cancelar convite');
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await equipe.atualizarRole(userId, newRole);
      toast.success('Função atualizada com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar função');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Equipe</h1>
          <p className="text-slate-400 mt-1">Gerencie membros e convites da sua equipe</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Convidar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Convidar Novo Membro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleConvidar} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg">
                <p><strong>Usuário:</strong> Pode visualizar e editar processos, clientes e prazos.</p>
                <p className="mt-1"><strong>Administrador:</strong> Pode convidar membros, excluir dados e gerenciar configurações.</p>
              </div>
              <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600">
                <Mail className="w-4 h-4 mr-2" />
                Enviar Convite
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{membros.length}</p>
              <p className="text-slate-400 text-sm">Membros Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/20">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{convites.length}</p>
              <p className="text-slate-400 text-sm">Convites Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {membros.filter(m => m.role === 'admin' || m.role === 'superadmin').length}
              </p>
              <p className="text-slate-400 text-sm">Administradores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membros Ativos */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            Membros da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membros.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum membro na equipe</p>
            </div>
          ) : (
            <div className="space-y-3">
              {membros.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10 border border-cyan-500/30">
                      <AvatarImage 
                        src={membro.avatar_url ? `http://localhost:5000${membro.avatar_url}` : undefined}
                        alt={membro.nome}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-medium">
                        {membro.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{membro.nome}</p>
                      <p className="text-sm text-slate-400">{membro.email}</p>
                      {membro.oab && (
                        <p className="text-xs text-slate-500">OAB: {membro.oab}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${roleColors[membro.role]} flex items-center gap-1`}>
                      {getRoleIcon(membro.role)}
                      {roleLabels[membro.role]}
                    </Badge>
                    {membro.role !== 'superadmin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem 
                            className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
                            onClick={() => handleUpdateRole(membro.id, membro.role === 'admin' ? 'user' : 'admin')}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            {membro.role === 'admin' ? 'Mudar para Usuário' : 'Promover a Administrador'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-400 focus:bg-red-500/20 focus:text-red-300 cursor-pointer"
                            onClick={() => setMembroToRemove(membro)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover da Equipe
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convites Pendentes */}
      {convites.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" />
              Convites Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {convites.map((convite) => (
                <div
                  key={convite.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{convite.email}</p>
                      <p className="text-sm text-slate-400">
                        Enviado por {convite.invited_by_nome} • {new Date(convite.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${roleColors[convite.role]} capitalize`}>
                      {roleLabels[convite.role]}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => setConviteToCancel(convite)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação - Remover Membro */}
      <AlertDialog open={!!membroToRemove} onOpenChange={() => setMembroToRemove(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja remover <strong>{membroToRemove?.nome}</strong> da equipe? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMembro}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação - Cancelar Convite */}
      <AlertDialog open={!!conviteToCancel} onOpenChange={() => setConviteToCancel(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Convite</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja cancelar o convite enviado para <strong>{conviteToCancel?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelarConvite}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
  