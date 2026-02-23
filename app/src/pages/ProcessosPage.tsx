import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { processos, clientes } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Gavel, 
  ArrowRight, 
  Loader2, 
  User, 
  MapPin, 
  Building2,
  Scale,
  ExternalLink,
  Calendar,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Processo {
  id: number;
  numero: string;
  numero_cnj?: string;
  titulo: string;
  descricao?: string;
  status: string;
  tipo?: string;
  comarca?: string;
  vara?: string;
  valor_causa?: number;
  data_abertura?: string;
  cliente_nome?: string;
  cliente_id?: number;
  prazos_pendentes?: number;
  pje_url?: string;
  tarefas_pendentes?: number;
  movimentacoes_novas?: number;
  monitoramento_ativo?: number;
}

interface Cliente {
  id: number;
  nome: string;
  email?: string;
}

const tiposProcesso = [
  { value: 'civil', label: 'Cível' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'tributario', label: 'Tributário' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'previdenciario', label: 'Previdenciário' },
  { value: 'penal', label: 'Penal' },
  { value: 'familia', label: 'Família' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'outro', label: 'Outro' },
];

const statusProcesso = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'concluido', label: 'Concluído' },
];

export function ProcessosPage() {
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    numero: '',
    numero_cnj: '',
    titulo: '',
    descricao: '',
    tipo: '',
    status: 'ativo',
    comarca: '',
    vara: '',
    valor_causa: '',
    data_abertura: new Date().toISOString().split('T')[0],
    pje_url: '',
    cliente_id: '',
  });
  const [clientesList, setClientesList] = useState<Cliente[]>([]);

  const loadProcessos = async () => {
    try {
      const response = await processos.list({ search });
      setProcessosList(response.data);
    } catch (error) {
      toast.error('Erro ao carregar processos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const response = await clientes.list();
      setClientesList(response.data || []);
    } catch (error) {
      console.log('Erro ao carregar clientes:', error);
    }
  };

  useEffect(() => {
    loadProcessos();
    loadClientes();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente para o processo');
      return;
    }
    if (!formData.numero.trim()) {
      toast.error('Informe o número do processo');
      return;
    }
    if (!formData.titulo.trim()) {
      toast.error('Informe o título do processo');
      return;
    }
    
    setIsSubmitting(true);

    try {
      await processos.create({
        ...formData,
        valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : undefined,
        cliente_id: parseInt(formData.cliente_id),
      });
      toast.success('Processo criado com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        numero: '',
        numero_cnj: '',
        titulo: '',
        descricao: '',
        tipo: '',
        status: 'ativo',
        comarca: '',
        vara: '',
        valor_causa: '',
        data_abertura: new Date().toISOString().split('T')[0],
        pje_url: '',
        cliente_id: '',
      });
      loadProcessos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar processo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'arquivado':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'suspenso':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'concluido':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  const getTipoLabel = (tipo?: string) => {
    return tiposProcesso.find(t => t.value === tipo)?.label || tipo;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Processos</h1>
          <p className="text-slate-400">Gerencie seus processos jurídicos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Processo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Dados Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Número do Processo *</Label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Ex: 0001234-56.2024.8.26.0100"
                    required
                    className="bg-slate-800 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Número CNJ (PJe)</Label>
                  <Input
                    value={formData.numero_cnj}
                    onChange={(e) => setFormData({ ...formData, numero_cnj: e.target.value })}
                    placeholder="Para consulta automática"
                    className="bg-slate-800 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Título/Objeto *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Ação de Indenização"
                  required
                  className="bg-slate-800 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descrição do caso"
                  rows={2}
                  className="bg-slate-800 border-white/10 text-white resize-none"
                />
              </div>

              {/* Tipo e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Tipo de Processo
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10">
                      {tiposProcesso.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10">
                      {statusProcesso.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comarca e Vara */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Comarca
                  </Label>
                  <Input
                    value={formData.comarca}
                    onChange={(e) => setFormData({ ...formData, comarca: e.target.value })}
                    placeholder="Ex: São Paulo/SP"
                    className="bg-slate-800 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Vara
                  </Label>
                  <Input
                    value={formData.vara}
                    onChange={(e) => setFormData({ ...formData, vara: e.target.value })}
                    placeholder="Ex: 15ª Vara Cível"
                    className="bg-slate-800 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Valor da Causa
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_causa}
                    onChange={(e) => setFormData({ ...formData, valor_causa: e.target.value })}
                    placeholder="0,00"
                    className="bg-slate-800 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data de Abertura
                  </Label>
                  <Input
                    type="date"
                    value={formData.data_abertura}
                    onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* PJe URL */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  URL do PJe
                </Label>
                <Input
                  value={formData.pje_url}
                  onChange={(e) => setFormData({ ...formData, pje_url: e.target.value })}
                  placeholder="https://pje.trfX.jus.br/..."
                  className="bg-slate-800 border-white/10 text-white"
                />
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  required
                >
                  <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                    <SelectValue placeholder="Selecione um cliente (obrigatório)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 max-h-60">
                    {clientesList.length === 0 && (
                      <SelectItem value="nenhum" disabled>
                        Nenhum cliente cadastrado
                      </SelectItem>
                    )}
                    {clientesList.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id.toString()}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.cliente_id || !formData.numero.trim() || !formData.titulo.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Processo'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Buscar processos por número, título ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processosList.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Gavel className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum processo encontrado</p>
            </div>
          )}
          {processosList.map((processo) => (
            <Link key={processo.id} to={`/processos/${processo.id}`}>
              <Card className="bg-slate-900/50 border-white/10 hover:border-cyan-500/30 transition-all group h-full">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusColor(processo.status)}>
                        {processo.status}
                      </Badge>
                      {processo.tipo && (
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          {getTipoLabel(processo.tipo)}
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>

                  {/* Título */}
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">{processo.titulo}</h3>
                  <p className="text-sm text-slate-400 mb-2 font-mono">{processo.numero}</p>

                  {/* Cliente */}
                  {processo.cliente_nome && (
                    <p className="text-sm text-slate-300 mb-3 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {processo.cliente_nome}
                    </p>
                  )}

                  {/* Info extras */}
                  <div className="space-y-1 text-xs text-slate-400">
                    {processo.comarca && (
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {processo.comarca}
                        {processo.vara && ` - ${processo.vara}`}
                      </p>
                    )}
                    {processo.valor_causa && (
                      <p className="flex items-center gap-1 text-green-400">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(processo.valor_causa)}
                      </p>
                    )}
                    {processo.data_abertura && (
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(processo.data_abertura).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {/* Indicadores */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {processo.prazos_pendentes ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {processo.prazos_pendentes} prazo(s)
                      </Badge>
                    ) : null}
                    {processo.tarefas_pendentes ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        {processo.tarefas_pendentes} tarefa(s)
                      </Badge>
                    ) : null}
                    {processo.movimentacoes_novas ? (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {processo.movimentacoes_novas} mov.
                      </Badge>
                    ) : null}
                    {processo.monitoramento_ativo ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Datajud
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
