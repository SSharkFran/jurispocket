import { useState, useEffect } from 'react';
import { financeiro, processos } from '@/services/api';
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
  Search, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  FileText,
  Download,
  X,
  Edit3,
  Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TransacaoFinanceira {
  id: number;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data_transacao: string;
  status: 'pago' | 'pendente';
  categoria: string;
  processo_id?: number;
  processo_numero?: string;
  processo_titulo?: string;
  cliente_nome?: string;
  created_at: string;
}

interface Processo {
  id: number;
  numero: string;
  titulo: string;
  cliente_nome?: string;
}

interface ResumoFinanceiro {
  entradas: number;
  saidas: number;
  saldo: number;
  pendentes: number;
}

const categoriaEntradas = [
  { value: 'honorarios', label: 'Honorários' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'parecer', label: 'Parecer' },
  { value: 'audiencia', label: 'Audiência' },
  { value: 'acordo', label: 'Acordo' },
  { value: 'outro', label: 'Outro' }
];

const categoriaSaidas = [
  { value: 'custas', label: 'Custas' },
  { value: 'taxa', label: 'Taxas' },
  { value: 'despesa_operacional', label: 'Despesas Operacionais' },
  { value: 'imposto', label: 'Impostos' },
  { value: 'outro', label: 'Outro' }
];

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const Financeiro = () => {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro>({ entradas: 0, saidas: 0, saldo: 0, pendentes: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [mesSelecionado, setMesSelecionado] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<TransacaoFinanceira | null>(null);
  
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria: '',
    descricao: '',
    valor: '',
    processo_id: '',
    data_transacao: new Date().toISOString().split('T')[0],
  });

  const fetchTransacoes = async () => {
    try {
      const [dataInicio, dataFim] = getMesRange(mesSelecionado);
      const response = await financeiro.list({
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      
      const transacoesData = response.data || [];
      setTransacoes(Array.isArray(transacoesData) ? transacoesData : []);
      
      // Calcular resumo
      const entradas = transacoesData.filter((t: TransacaoFinanceira) => t.tipo === 'entrada').reduce((sum: number, t: TransacaoFinanceira) => sum + t.valor, 0);
      const saidas = transacoesData.filter((t: TransacaoFinanceira) => t.tipo === 'saida').reduce((sum: number, t: TransacaoFinanceira) => sum + t.valor, 0);
      const pendentes = transacoesData.filter((t: TransacaoFinanceira) => t.status === 'pendente').reduce((sum: number, t: TransacaoFinanceira) => sum + t.valor, 0);
      
      setResumo({
        entradas,
        saidas,
        saldo: entradas - saidas,
        pendentes
      });
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast.error('Erro ao carregar transações');
      setTransacoes([]);
      setResumo({ entradas: 0, saidas: 0, saldo: 0, pendentes: 0 });
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
      await Promise.all([fetchTransacoes(), fetchProcessos()]);
      setIsLoading(false);
    };
    loadData();
  }, [mesSelecionado]);

  const getMesRange = (mes: string) => {
    const [ano, mesNum] = mes.split('-');
    const dataInicio = `${ano}-${mesNum}-01`;
    const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
    const dataFim = `${ano}-${mesNum}-${ultimoDia}`;
    return [dataInicio, dataFim];
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor || !formData.data_transacao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await financeiro.create({
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_transacao: formData.data_transacao,
        categoria: formData.categoria,
        processo_id: formData.processo_id ? parseInt(formData.processo_id) : undefined,
      });
      
      toast.success('Transação criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      fetchTransacoes();
    } catch (error) {
      toast.error('Erro ao criar transação');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await financeiro.delete(id);
      toast.success('Transação excluída com sucesso!');
      fetchTransacoes();
    } catch (error) {
      toast.error('Erro ao excluir transação');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      categoria: '',
      descricao: '',
      valor: '',
      processo_id: '',
      data_transacao: new Date().toISOString().split('T')[0],
    });
  };

  const filteredTransacoes = transacoes.filter(transacao =>
    transacao.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transacao.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (transacao.processo_numero && transacao.processo_numero.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (transacao.cliente_nome && transacao.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()))
  ).filter(transacao => tipoFilter === 'todos' || transacao.tipo === tipoFilter);

  // Dados para o gráfico de pizza
  const categoriasData = [
    ...categoriaEntradas.map(cat => ({
      name: cat.label,
      value: transacoes.filter(t => t.tipo === 'entrada' && t.categoria === cat.value).reduce((sum, t) => sum + t.valor, 0),
      color: `hsl(${160 + categoriaEntradas.indexOf(cat) * 20}, 70%, 50%)`
    })),
    ...categoriaSaidas.map(cat => ({
      name: cat.label,
      value: transacoes.filter(t => t.tipo === 'saida' && t.categoria === cat.value).reduce((sum, t) => sum + t.valor, 0),
      color: `hsl(${0 + categoriaSaidas.indexOf(cat) * 15}, 70%, 50%)`
    }))
  ].filter(item => item.value > 0);

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
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(mesSelecionado).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = date.toISOString().slice(0, 7);
                const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return <SelectItem key={value} value={value}>{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v: 'entrada' | 'saida') => setFormData({ ...formData, tipo: v, categoria: '' })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria *</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        {(formData.tipo === 'entrada' ? categoriaEntradas : categoriaSaidas).map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descrição *</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Honorários advocatícios"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={formData.data_transacao}
                      onChange={(e) => setFormData({ ...formData, data_transacao: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Processo (opcional)</Label>
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
                <Button type="submit" className="w-full">
                  Criar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(resumo.entradas)}</p>
              <p className="text-sm text-muted-foreground">Receitas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/20">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(resumo.saidas)}</p>
              <p className="text-sm text-muted-foreground">Despesas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(resumo.saldo)}</p>
              <p className="text-sm text-muted-foreground">Saldo</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <Wallet className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(resumo.pendentes)}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent className="bg-secondary border-border">
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTransacoes.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransacoes.map((transacao) => (
                    <div key={transacao.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          transacao.tipo === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transacao.tipo === 'entrada' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{transacao.descricao}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transacao.data_transacao).toLocaleDateString('pt-BR')}
                            {transacao.processo_numero && ` · ${transacao.processo_numero}`}
                            {transacao.cliente_nome && ` · ${transacao.cliente_nome}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${transacao.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                          {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant={transacao.status === 'pago' ? 'default' : 'secondary'}>
                            {transacao.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(transacao.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {categoriasData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoriasData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                        {categoriasData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(240 5% 10%)", border: "1px solid hsl(240 4% 16%)", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {categoriasData.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          <span className="text-muted-foreground">{c.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Financeiro;
