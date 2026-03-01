import { useState, useEffect, useRef } from 'react';
import { financeiro, processos } from '@/services/api';
import type { TransacaoFinanceira, Processo } from '@/types';
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
  Upload,
  Download,
  X,
  FileArchive,
  Edit3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const categoriaEntradas = [
  'honorarios',
  'consultoria',
  'parecer',
  'audiencia',
  'acordo',
  'outro'
];

const categoriaSaidas = [
  'custas',
  'taxa',
  'despesa_operacional',
  'imposto',
  'outro'
];

interface TransacaoComDocumentos extends TransacaoFinanceira {
  documentos?: TransacaoFinanceira['documentos'];
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function FinanceiroPage() {
  const [transacoes, setTransacoes] = useState<TransacaoComDocumentos[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [mesSelecionado, setMesSelecionado] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExtratoOpen, setIsExtratoOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<TransacaoComDocumentos | null>(null);
  const [expandedTransacao, setExpandedTransacao] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  
  // Estados para upload de documento
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTransacaoId, setUploadTransacaoId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNome, setUploadNome] = useState('');
  const [uploadDescricao, setUploadDescricao] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria: '',
    descricao: '',
    valor: '',
    processo_id: '',
    data_transacao: new Date().toISOString().split('T')[0],
    status: 'pendente',
  });

  const fetchData = async () => {
    try {
      console.log('📡 Buscando dados financeiros...');
      const [transacoesRes, resumoRes, processosRes] = await Promise.all([
        financeiro.listTransacoes({ tipo: tipoFilter === 'todos' ? undefined : tipoFilter }),
        financeiro.resumo(),
        processos.list()
      ]);
      console.log('✅ Dados recebidos:', { transacoes: transacoesRes.data, resumo: resumoRes.data, processos: processosRes.data });
      setTransacoes(Array.isArray(transacoesRes.data) ? transacoesRes.data : []);
      const resumoData = resumoRes.data || {};
      setResumo({
        entradas: resumoData.receitas || 0,
        saidas: resumoData.despesas || 0,
        saldo: resumoData.saldo || 0
      });
      setProcessosList(Array.isArray(processosRes.data) ? processosRes.data : []);
    } catch (error) {
      console.error('❌ Erro ao carregar dados financeiros:', error);
      toast.error('Erro ao carregar dados financeiros');
      setTransacoes([]);
      setResumo({ entradas: 0, saidas: 0, saldo: 0 });
      setProcessosList([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    loadData();
  }, [tipoFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor || !formData.categoria) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      await financeiro.createTransacao({
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        categoria: formData.categoria,
        processo_id: formData.processo_id ? parseInt(formData.processo_id) : undefined,
        data_transacao: formData.data_transacao,
      });
      toast.success('Transação criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar transação');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transacaoSelecionada) return;
    try {
      await financeiro.updateTransacao(transacaoSelecionada.id, {
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        categoria: formData.categoria,
        status: formData.status,
      });
      toast.success('Transação atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setTransacaoSelecionada(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar transação');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await financeiro.deleteTransacao(id);
      toast.success('Transação excluída com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir transação');
    }
  };

  const handleFileSelect = (transacaoId: number, file: File) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 
                          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PDF, imagens, DOC, XLS ou TXT');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }
    
    // Abrir diálogo para nome personalizado
    setUploadTransacaoId(transacaoId);
    setUploadFile(file);
    setUploadNome(file.name); // Nome padrão é o nome do arquivo
    setUploadDescricao('');
    setUploadDialogOpen(true);
  };

  const handleUploadDocumento = async () => {
    if (!uploadTransacaoId || !uploadFile) return;
    
    setIsUploading(true);
    try {
      await financeiro.uploadDocumento(uploadTransacaoId, uploadFile, uploadNome, uploadDescricao);
      toast.success('Documento anexado com sucesso!');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadNome('');
      setUploadDescricao('');
      setUploadTransacaoId(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao anexar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocumento = async (transacaoId: number, docId: number) => {
    if (!confirm('Tem certeza que deseja remover este documento?')) return;
    try {
      await financeiro.deleteDocumento(transacaoId, docId);
      toast.success('Documento removido!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao remover documento');
    }
  };

  const handleDownloadDocumento = async (transacaoId: number, docId: number, nomeArquivo: string) => {
    try {
      const response = await financeiro.downloadDocumento(transacaoId, docId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao baixar documento');
    }
  };

  const handleDownloadComprovantesMes = async () => {
    try {
      toast.info('Preparando download...');
      const response = await financeiro.downloadComprovantesMes(mesSelecionado);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comprovantes_${mesSelecionado}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Nenhum comprovante encontrado para este mês');
      } else {
        toast.error('Erro ao gerar arquivo');
      }
    }
  };

  const openEditDialog = (transacao: TransacaoComDocumentos) => {
    setTransacaoSelecionada(transacao);
    setFormData({
      tipo: transacao.tipo,
      categoria: transacao.categoria || '',
      descricao: transacao.descricao || '',
      valor: transacao.valor?.toString() || '',
      processo_id: transacao.processo_id?.toString() || '',
      data_transacao: transacao.data_transacao?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: transacao.status || 'pendente',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      categoria: '',
      descricao: '',
      valor: '',
      processo_id: '',
      data_transacao: new Date().toISOString().split('T')[0],
      status: 'pendente',
    });
  };

  const filteredTransacoes = transacoes.filter(t =>
    t.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.processo_numero?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.categoria?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calcular resumo do mês selecionado
  const transacoesMes = transacoes.filter(t => t.data_transacao?.startsWith(mesSelecionado));
  const resumoMes = {
    entradas: transacoesMes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + (t.valor || 0), 0),
    saidas: transacoesMes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + (t.valor || 0), 0),
    totalComprovantes: transacoesMes.filter(t => t.tipo === 'saida' && t.documentos && t.documentos.length > 0).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle de entradas e saídas</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={() => setIsExtratoOpen(true)}
            className="w-full border-border text-foreground hover:bg-secondary sm:w-auto"
          >
            <FileText className="w-4 h-4 mr-2" />
            Extrato Mensal
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v as 'entrada' | 'saida', categoria: '' })}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      {(formData.tipo === 'entrada' ? categoriaEntradas : categoriaSaidas).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="bg-secondary border-border text-foreground"
                    placeholder="Ex: Honorários processo XYZ"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      className="bg-secondary border-border text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_transacao">Data *</Label>
                    <Input
                      id="data_transacao"
                      type="date"
                      value={formData.data_transacao}
                      onChange={(e) => setFormData({ ...formData, data_transacao: e.target.value })}
                      className="bg-secondary border-border text-foreground"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="processo">Vincular a Processo (opcional)</Label>
                  <Select
                    value={formData.processo_id}
                    onValueChange={(v) => setFormData({ ...formData, processo_id: v })}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground">
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
                <Button type="submit" className="w-full bg-primary hover:bg-primary">
                  Criar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Entradas</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(resumo.entradas)}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Saídas</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(resumo.saidas)}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/20">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Saldo</p>
                <p className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {formatCurrency(resumo.saldo)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/20">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
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
            className="pl-10 bg-secondary/30 border-border text-foreground"
          />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v)}>
          <SelectTrigger className="w-full sm:w-48 bg-secondary/30 border-border text-foreground">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent className="bg-secondary border-border">
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <Card className="bg-secondary/30 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransacoes.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransacoes.map((transacao) => (
                <div
                  key={transacao.id}
                  className="rounded-lg bg-secondary/40 hover:bg-secondary transition-colors overflow-hidden"
                >
                  <div 
                    className="flex flex-col gap-3 p-4 cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => setExpandedTransacao(expandedTransacao === transacao.id ? null : transacao.id)}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        transacao.tipo === 'entrada' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      }`}>
                        {transacao.tipo === 'entrada' ? (
                          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{transacao.descricao || 'Sem descrição'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${
                            transacao.tipo === 'entrada' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-secondary/70 text-foreground border-border capitalize">
                            {(transacao.categoria || 'outro').replace(/_/g, ' ')}
                          </Badge>
                          {transacao.processo_numero && (
                            <span className="text-xs text-muted-foreground">{transacao.processo_numero}</span>
                          )}
                          {transacao.documentos && transacao.documentos.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                              <FileText className="w-3 h-3 mr-1" />
                              {transacao.documentos.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className={`font-bold ${
                          transacao.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" />
                          {transacao.data_transacao ? new Date(transacao.data_transacao).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {expandedTransacao === transacao.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedTransacao === transacao.id && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3">
                      <div className="flex flex-col gap-3">
                        {/* Documentos */}
                        <div>
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">Documentos Anexados</p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                ref={(el) => { fileInputRefs.current[transacao.id] = el; }}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileSelect(transacao.id, file);
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRefs.current[transacao.id]?.click()}
                                className="w-full border-border text-foreground hover:bg-secondary sm:w-auto"
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Anexar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(transacao)}
                                className="w-full text-muted-foreground hover:text-primary sm:w-auto"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(transacao.id)}
                                className="w-full text-muted-foreground hover:text-red-400 sm:w-auto"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                          
                          {transacao.documentos && transacao.documentos.length > 0 ? (
                            <div className="space-y-2">
                              {transacao.documentos.map((doc) => (
                                <div 
                                  key={doc.id} 
                                  className="flex flex-col gap-2 rounded bg-secondary/30 p-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm text-foreground">{doc.nome}</p>
                                      {doc.descricao && (
                                        <p className="text-xs text-muted-foreground">{doc.descricao}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)} • {doc.uploaded_by_nome || 'Sistema'}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      onClick={() => handleDownloadDocumento(transacao.id, doc.id, doc.nome)}
                                      title="Baixar"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                      onClick={() => handleDeleteDocumento(transacao.id, doc.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Nenhum documento anexado</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Extrato Mensal */}
      <Dialog open={isExtratoOpen} onOpenChange={setIsExtratoOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Extrato Mensal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Seletor de Mês */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Label htmlFor="mes_extrato">Mês:</Label>
              <Input
                id="mes_extrato"
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="w-full bg-secondary border-border text-foreground sm:w-48"
              />
            </div>
            
            {/* Resumo do Mês */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-sm text-emerald-400">Entradas</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(resumoMes.entradas)}</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">Saídas</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(resumoMes.saidas)}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-primary">Saldo</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(resumoMes.entradas - resumoMes.saidas)}</p>
              </div>
            </div>
            
            {/* Download Comprovantes */}
            {resumoMes.totalComprovantes > 0 && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-blue-400">Comprovantes de Saída</p>
                    <p className="text-xs text-muted-foreground">{resumoMes.totalComprovantes} documento(s) anexado(s)</p>
                  </div>
                  <Button
                    onClick={handleDownloadComprovantesMes}
                    className="w-full bg-blue-500 hover:bg-blue-600 sm:w-auto"
                  >
                    <FileArchive className="w-4 h-4 mr-2" />
                    Baixar Todos
                  </Button>
                </div>
              </div>
            )}
            
            {/* Lista de Transações do Mês */}
            <div>
              <h4 className="text-foreground font-medium mb-3">Transações do Mês</h4>
              {transacoesMes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma transação neste mês</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transacoesMes.map((t) => (
                    <div key={t.id} className="flex flex-col gap-2 rounded bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        {t.tipo === 'entrada' ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                        <div>
                          <p className="text-sm text-foreground">{t.descricao}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.data_transacao!).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.tipo === 'entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                        </p>
                        {t.documentos && t.documentos.length > 0 && (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Transação */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_descricao">Descrição *</Label>
              <Input
                id="edit_descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {(formData.tipo === 'entrada' ? categoriaEntradas : categoriaSaidas).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit_valor">Valor (R$) *</Label>
                <Input
                  id="edit_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="bg-secondary border-border text-foreground"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-4 sm:flex-row">
              <Button type="submit" className="w-full bg-primary hover:bg-primary sm:flex-1">
                Salvar Alterações
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Upload de Documento */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Anexar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {uploadFile && (
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Arquivo selecionado:</p>
                <p className="text-foreground font-medium">{uploadFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
              </div>
            )}
            <div>
              <Label htmlFor="nome_documento">Nome do Documento *</Label>
              <Input
                id="nome_documento"
                value={uploadNome}
                onChange={(e) => setUploadNome(e.target.value)}
                placeholder="Ex: Comprovante de Pagamento - Cliente XYZ"
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dê um nome descritivo para identificar este documento
              </p>
            </div>
            <div>
              <Label htmlFor="descricao_documento">Descrição (opcional)</Label>
              <Input
                id="descricao_documento"
                value={uploadDescricao}
                onChange={(e) => setUploadDescricao(e.target.value)}
                placeholder="Informações adicionais sobre o documento"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleUploadDocumento} 
                disabled={isUploading || !uploadNome.trim()}
                className="flex-1 bg-primary hover:bg-primary"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Anexar Documento
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setUploadDialogOpen(false);
                  setUploadFile(null);
                  setUploadNome('');
                  setUploadDescricao('');
                }}
                disabled={isUploading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

