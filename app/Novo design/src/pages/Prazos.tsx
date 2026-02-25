import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prazos, processos } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock, 
  AlertTriangle,
  Calendar,
  ArrowRight,
  Filter,
  Loader2
} from 'lucide-react';

interface Prazo {
  id: number;
  processo_id: number;
  processo_numero?: string;
  processo_titulo?: string;
  descricao: string;
  tipo: string;
  data_final: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'cumprido' | 'vencido';
  observacoes?: string;
  created_at: string;
}

interface Processo {
  id: number;
  numero: string;
  titulo: string;
  cliente_nome?: string;
}

const prioridadeColors = {
  baixa: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  media: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  urgente: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const Prazos = () => {
  const navigate = useNavigate();
  const [prazosList, setPrazosList] = useState<Prazo[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    processo_id: '',
    tipo: 'audiencia',
    descricao: '',
    data_final: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    observacoes: '',
  });

  const fetchPrazos = async () => {
    try {
      const response = await prazos.list({ status: statusFilter === 'todos' ? undefined : statusFilter });
      const prazosData = response.data || [];
      setPrazosList(Array.isArray(prazosData) ? prazosData : []);
    } catch (err) {
      console.error('Erro ao carregar prazos:', err);
      toast.error('Erro ao carregar prazos');
      setPrazosList([]);
    }
  };

  const fetchProcessos = async () => {
    try {
      const response = await processos.list();
      const processosData = response.data.processos || response.data || [];
      setProcessosList(Array.isArray(processosData) ? processosData : []);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPrazos(), fetchProcessos()]);
      setIsLoading(false);
    };
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.processo_id || !formData.descricao || !formData.data_final) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      await prazos.create({
        processo_id: parseInt(formData.processo_id),
        tipo: formData.tipo,
        descricao: formData.descricao,
        data_final: formData.data_final,
        prioridade: formData.prioridade,
      });
      toast.success('Prazo criado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      fetchPrazos();
    } catch (error) {
      toast.error('Erro ao criar prazo');
    }
  };

  const handleMarcarCumprido = async (id: number) => {
    try {
      await prazos.marcarCumprido(id);
      toast.success('Prazo marcado como cumprido!');
      fetchPrazos();
    } catch (error) {
      toast.error('Erro ao marcar prazo como cumprido');
    }
  };

  const resetForm = () => {
    setFormData({
      processo_id: '',
      tipo: 'audiencia',
      descricao: '',
      data_final: '',
      prioridade: 'media',
      observacoes: '',
    });
  };

  const getDiasRestantes = (dataFinal: string) => {
    if (!dataFinal) return 0;
    const hoje = new Date();
    const final = new Date(dataFinal);
    if (isNaN(final.getTime())) return 0;
    const diffTime = final.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusPrazo = (prazo: Prazo) => {
    if (!prazo) return 'pendente';
    if (prazo.status === 'cumprido') return 'cumprido';
    const dias = getDiasRestantes(prazo.data_final);
    if (dias < 0) return 'vencido';
    if (dias <= 3) return 'urgente';
    return 'pendente';
  };

  const filteredPrazos = prazosList.filter(prazo =>
    prazo.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prazo.processo_numero?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prazo.processo_titulo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const prazosPendentes = prazosList.filter(p => p.status === 'pendente');
  const prazosVencidos = prazosList.filter(p => getStatusPrazo(p) === 'vencido');
  const prazosUrgentes = prazosList.filter(p => {
    const dias = getDiasRestantes(p.data_final);
    return p.status === 'pendente' && dias >= 0 && dias <= 3;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prazos</h1>
          <p className="text-sm text-muted-foreground">Gerencie prazos processuais e compromissos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Prazo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Novo Prazo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="processo">Processo *</Label>
                <Select
                  value={formData.processo_id}
                  onValueChange={(v) => setFormData({ ...formData, processo_id: v })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione um processo" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    {processosList.map((processo) => (
                      <SelectItem key={processo.id} value={processo.id.toString()}>
                        {processo.numero} - {processo.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      <SelectItem value="audiencia">Audiência</SelectItem>
                      <SelectItem value="pericia">Perícia</SelectItem>
                      <SelectItem value="conciliacao">Conciliação</SelectItem>
                      <SelectItem value="julgamento">Julgamento</SelectItem>
                      <SelectItem value="recurso">Recurso</SelectItem>
                      <SelectItem value="contestacao">Contestação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(v) => setFormData({ ...formData, prioridade: v as any })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="bg-secondary border-border"
                  placeholder="Ex: Audiência de Conciliação"
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_final">Data Final *</Label>
                <Input
                  id="data_final"
                  type="datetime-local"
                  value={formData.data_final}
                  onChange={(e) => setFormData({ ...formData, data_final: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="bg-secondary border-border"
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full">
                Criar Prazo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/20">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{prazosPendentes.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{prazosVencidos.length}</p>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-500/20">
              <Calendar className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{prazosUrgentes.length}</p>
              <p className="text-sm text-muted-foreground">Próximos (3 dias)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {prazosList.filter(p => p.status === 'cumprido').length}
              </p>
              <p className="text-sm text-muted-foreground">Cumpridos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar prazos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <Select value={statusFilter || 'todos'} onValueChange={(v) => setStatusFilter(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-secondary border-border">
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="cumprido">Cumprido</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prazos List */}
      <div className="space-y-3">
        {filteredPrazos.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum prazo encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredPrazos.map((prazo) => {
            const diasRestantes = getDiasRestantes(prazo.data_final);
            const status = getStatusPrazo(prazo);
            return (
              <Card key={prazo.id} className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-lg ${
                      status === 'vencido' ? 'bg-red-500/20' :
                      status === 'urgente' ? 'bg-orange-500/20' :
                      status === 'cumprido' ? 'bg-emerald-500/20' :
                      'bg-amber-500/20'
                    }`}>
                      {status === 'cumprido' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : status === 'vencido' ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Clock className={`w-5 h-5 ${
                          status === 'urgente' ? 'text-orange-400' : 'text-amber-400'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-medium ${status === 'cumprido' ? 'line-through text-muted-foreground' : ''}`}>
                            {prazo.descricao}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className={prioridadeColors[prazo.prioridade]}>
                              {prazo.prioridade}
                            </Badge>
                            <Badge variant="outline" className="bg-secondary text-muted-foreground border-border capitalize">
                              {prazo.tipo}
                            </Badge>
                            {prazo.processo_numero && (
                              <Badge 
                                variant="outline" 
                                className="bg-secondary text-muted-foreground border-border cursor-pointer hover:bg-accent"
                                onClick={() => navigate(`/app/processos/${prazo.processo_id}`)}
                              >
                                {prazo.processo_numero}
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(prazo.data_final).toLocaleDateString('pt-BR')}
                          </p>
                          <p className={`text-sm font-medium ${
                            diasRestantes < 0 ? 'text-red-400' :
                            diasRestantes <= 3 ? 'text-orange-400' :
                            'text-muted-foreground'
                          }`}>
                            {diasRestantes < 0 
                              ? `${Math.abs(diasRestantes)} dias atrás` 
                              : diasRestantes === 0 
                                ? 'Hoje'
                                : `${diasRestantes} dias restantes`
                            }
                          </p>
                        </div>
                      </div>
                      {status !== 'cumprido' && status !== 'vencido' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarcarCumprido(prazo.id)}
                          className="mt-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marcar como Cumprido
                        </Button>
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
};

export default Prazos;
