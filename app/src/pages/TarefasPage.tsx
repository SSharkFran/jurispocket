import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tarefas, processos, equipe } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Tarefa, Processo, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ArrowRight,
  MessageCircle,
  Trash2,
  Edit3,
  Calendar,
  User as UserIcon
} from 'lucide-react';

const prioridadeColors = {
  baixa: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  media: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  urgente: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const statusIcons = {
  pendente: Circle,
  em_andamento: Clock,
  concluida: CheckCircle2,
};

const statusColors = {
  pendente: 'text-slate-400',
  em_andamento: 'text-amber-400',
  concluida: 'text-emerald-400',
};

export function TarefasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tarefasList, setTarefasList] = useState<Tarefa[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [membrosList, setMembrosList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    processo_id: '',
    data_vencimento: '',
    atribuido_a: '',
  });

  const fetchTarefas = async () => {
    try {
      console.log('📡 Buscando tarefas...');
      const response = await tarefas.list({ status: statusFilter === 'todos' ? undefined : statusFilter });
      console.log('✅ Tarefas recebidas:', response.data);
      // Garante que sempre seja um array
      setTarefasList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
      setTarefasList([]);
    }
  };

  const fetchProcessos = async () => {
    try {
      const response = await processos.list();
      setProcessosList(response.data);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    }
  };

  const fetchMembros = async () => {
    try {
      const response = await equipe.list();
      const membrosData = response.data?.membros || response.data || [];
      setMembrosList(Array.isArray(membrosData) ? membrosData : []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTarefas(), fetchProcessos(), fetchMembros()]);
      setIsLoading(false);
    };
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Se só tiver 1 membro (o próprio usuário), atribuir a si mesmo
      let atribuidoA = formData.atribuido_a ? parseInt(formData.atribuido_a) : undefined;
      if (!atribuidoA && membrosList.length === 1 && user) {
        atribuidoA = user.id;
      }
      
      await tarefas.create({
        titulo: formData.titulo,
        descricao: formData.descricao,
        prioridade: formData.prioridade,
        processo_id: formData.processo_id ? parseInt(formData.processo_id) : undefined,
        data_vencimento: formData.data_vencimento || undefined,
        atribuido_a: atribuidoA,
      });
      toast.success('Tarefa criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      fetchTarefas();
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarefa) return;
    try {
      await tarefas.update(editingTarefa.id, {
        titulo: formData.titulo,
        descricao: formData.descricao,
        prioridade: formData.prioridade,
      });
      toast.success('Tarefa atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingTarefa(null);
      resetForm();
      fetchTarefas();
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await tarefas.delete(id);
      toast.success('Tarefa excluída com sucesso!');
      fetchTarefas();
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleStatusChange = async (tarefa: Tarefa, novoStatus: 'pendente' | 'em_andamento' | 'concluida') => {
    try {
      await tarefas.update(tarefa.id, { status: novoStatus });
      toast.success(`Status atualizado para ${novoStatus.replace('_', ' ')}`);
      fetchTarefas();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleWhatsAppShare = async (tarefa: Tarefa) => {
    try {
      const response = await tarefas.getWhatsAppLink(tarefa.id);
      window.open(response.data.whatsapp_url, '_blank');
    } catch (error) {
      toast.error('Erro ao gerar link do WhatsApp');
    }
  };

  const openEditDialog = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      prioridade: tarefa.prioridade,
      processo_id: tarefa.processo_id?.toString() || '',
      data_vencimento: tarefa.data_vencimento?.split('T')[0] || '',
      atribuido_a: tarefa.atribuido_a?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTarefa(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      prioridade: 'media',
      processo_id: '',
      data_vencimento: '',
      atribuido_a: '',
    });
  };

  const filteredTarefas = tarefasList.filter(tarefa =>
    tarefa.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tarefa.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tarefa.processo_numero?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tarefasPendentes = tarefasList.filter(t => t.status === 'pendente');
  const tarefasAndamento = tarefasList.filter(t => t.status === 'em_andamento');
  const tarefasConcluidas = tarefasList.filter(t => t.status === 'concluida');

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
          <h1 className="text-3xl font-bold text-white">Tarefas</h1>
          <p className="text-slate-400 mt-1">Gerencie suas tarefas e acompanhe o progresso</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={editingTarefa ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(v) => setFormData({ ...formData, prioridade: v as any })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data_vencimento">Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="atribuido_a">Atribuir a {membrosList.length === 1 && <span className="text-xs text-slate-500">(auto)</span>}</Label>
                  <Select
                    value={formData.atribuido_a}
                    onValueChange={(v) => setFormData({ ...formData, atribuido_a: v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder={membrosList.length === 1 ? user?.nome : "Selecione"} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {membrosList.map((membro) => (
                        <SelectItem key={membro.id} value={membro.id.toString()}>
                          {membro.nome} {membro.id === user?.id && '(Você)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!editingTarefa && (
                  <div>
                    <Label htmlFor="processo">Vincular a Processo</Label>
                    <Select
                      value={formData.processo_id}
                      onValueChange={(v) => setFormData({ ...formData, processo_id: v })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {processosList.map((processo) => (
                          <SelectItem key={processo.id} value={processo.id.toString()}>
                            {processo.numero}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-cyan-500 hover:bg-cyan-600">
                  {editingTarefa ? 'Salvar Alterações' : 'Criar Tarefa'}
                </Button>
                {editingTarefa && (
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/20">
              <Circle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tarefasPendentes.length}</p>
              <p className="text-slate-400 text-sm">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tarefasAndamento.length}</p>
              <p className="text-slate-400 text-sm">Em Andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tarefasConcluidas.length}</p>
              <p className="text-slate-400 text-sm">Concluídas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white"
          />
        </div>
        <Select value={statusFilter || 'todos'} onValueChange={(v) => setStatusFilter(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48 bg-slate-900/50 border-slate-700 text-white">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tarefas List */}
      <div className="space-y-3">
        {filteredTarefas.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma tarefa encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredTarefas.map((tarefa) => {
            const StatusIcon = statusIcons[tarefa.status as keyof typeof statusIcons] || statusIcons.pendente;
            const statusColor = statusColors[tarefa.status as keyof typeof statusColors] || statusColors.pendente;
            return (
              <Card key={tarefa.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleStatusChange(tarefa, tarefa.status === 'concluida' ? 'pendente' : 'concluida')}
                      className={`mt-1 ${statusColor} hover:opacity-80 transition-opacity`}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-medium ${tarefa.status === 'concluida' ? 'line-through text-slate-500' : 'text-white'}`}>
                            {tarefa.titulo}
                          </h3>
                          {tarefa.descricao && (
                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{tarefa.descricao}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className={prioridadeColors[tarefa.prioridade]}>
                              {tarefa.prioridade}
                            </Badge>
                            {tarefa.processo_numero && (
                              <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 cursor-pointer hover:bg-slate-700"
                                onClick={() => navigate(`/processos/${tarefa.processo_id}`)}>
                                {tarefa.processo_numero}
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Badge>
                            )}
                            {tarefa.data_vencimento && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {tarefa.atribuido_a_nome && (
                              <span className="text-xs text-cyan-400 flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {tarefa.atribuido_a_nome}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleWhatsAppShare(tarefa)}
                            className="text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(tarefa)}
                            className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(tarefa.id)}
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {tarefa.status !== 'concluida' && (
                        <div className="flex gap-2 mt-3">
                          {tarefa.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(tarefa, 'em_andamento')}
                              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Iniciar
                            </Button>
                          )}
                          {tarefa.status === 'em_andamento' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(tarefa, 'concluida')}
                              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Concluir
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
