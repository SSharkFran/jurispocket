import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { processos, prazos, api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  ArrowLeft,
  Check,
  Gavel,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Edit,
  Trash2,
  FileText,
  FileCode,
  Copy,
  Printer,
  File,
  Download,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface MovimentacaoDatajud {
  id: number;
  processo_id: number;
  codigo_movimento: number;
  nome_movimento: string;
  data_movimento: string;
  complementos?: string;
  fonte?: string;
  lida?: boolean;
  created_at?: string;
}

interface Processo {
  id: number;
  numero: string;
  numero_cnj?: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  status: string;
  fase: string;
  valor_causa?: number;
  cliente_nome?: string;
  cliente_telefone?: string;
  tribunal_codigo?: string;
  tribunal_nome?: string;
  tribunal_uf?: string;
  ultima_movimentacao?: string;
  data_ultima_movimentacao?: string;
  sincronizacao_status?: string;
  // Datajud fields
  movimentacoes_datajud?: MovimentacaoDatajud[];
  movimentacoes_novas_count?: number;
  ultima_movimentacao_datajud?: MovimentacaoDatajud;
  ultima_movimentacao_nova?: boolean;
  // Tarefas pendentes
  tarefas_pendentes_count?: number;
  tem_tarefas_pendentes?: boolean;
  prazos: Array<{
    id: number;
    descricao: string;
    data_final: string;
    status: string;
    prioridade: string;
  }>;
  tarefas: Array<{
    id: number;
    titulo: string;
    status: string;
    prioridade: string;
  }>;
  transacoes: Array<{
    id: number;
    tipo: 'entrada' | 'saida';
    descricao: string;
    valor: number;
    data_transacao: string;
  }>;
  monitoramento?: {
    monitorar_datajud: boolean;
    frequencia_verificacao?: string;
    ultima_verificacao?: string;
    total_movimentacoes?: number;
  };
}

const ProcessoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConsultingDatajud, setIsConsultingDatajud] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    titulo: '',
    status: '',
    fase: '',
    descricao: '',
    tipo: '',
    valor_causa: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const loadProcesso = async () => {
    try {
      const response = await processos.get(Number(id));
      setProcesso(response.data);
    } catch (error) {
      toast.error('Erro ao carregar processo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProcesso();
  }, [id]);

  const consultarDatajud = async () => {
    setIsConsultingDatajud(true);
    
    const loadingToast = toast.loading('Consultando Datajud...', {
      description: 'Buscando movimentações no CNJ'
    });
    
    try {
      const response = await api.post(`/processos/${Number(id)}/consultar-datajud`);
      const data = response.data;
      
      toast.dismiss(loadingToast);
      
      if (data.sucesso && data.encontrado) {
        const novas = data.movimentacoes_novas || 0;
        if (novas > 0) {
          toast.success(`${novas} movimentação(ões) nova(s) encontradas!`, {
            description: `Total: ${data.movimentos?.length || 0} movimentações no processo`
          });
        } else {
          toast.info('Consulta realizada', {
            description: 'Nenhuma movimentação nova encontrada'
          });
        }
        await loadProcesso();
      } else if (data.sucesso && !data.encontrado) {
        toast.info('Processo não encontrado no Datajud', {
          description: 'O processo ainda não está disponível na API pública. Pode levar alguns dias após a distribuição.',
          duration: 6000
        });
      } else {
        if (data.detalhes) {
          toast.error(
            <div className="space-y-2">
              <p className="font-semibold">{data.erro || 'Erro na consulta'}</p>
              <p className="text-sm">{data.mensagem}</p>
              {data.detalhes && (
                <div className="text-xs bg-secondary p-2 rounded mt-2">
                  <p>Número: {data.detalhes.numero_informado}</p>
                  <p>Tamanho: {data.detalhes.tamanho} dígitos (esperado: 20)</p>
                </div>
              )}
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error(data.erro || 'Erro na consulta ao Datajud');
        }
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      
      if (error.response?.status === 403) {
        const errorData = error.response?.data;
        toast.error(
          <div>
            <p className="font-semibold">{errorData?.message || 'Recurso não disponível'}</p>
            <p className="text-sm mt-1">{errorData?.sugestao || 'Faça upgrade para desbloquear.'}</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        const msg = error.response?.data?.error || error.response?.data?.erro || error.message || 'Erro ao consultar Datajud';
        toast.error(msg);
      }
    } finally {
      setIsConsultingDatajud(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await processos.update(Number(id), {
        titulo: editFormData.titulo,
        status: editFormData.status,
        fase: editFormData.fase,
        descricao: editFormData.descricao,
        tipo: editFormData.tipo,
        valor_causa: editFormData.valor_causa ? parseFloat(editFormData.valor_causa) : undefined,
      });
      toast.success('Processo atualizado com sucesso!');
      setEditMode(false);
      loadProcesso();
    } catch (error) {
      toast.error('Erro ao atualizar processo');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'arquivado':
        return 'bg-muted/20 text-muted-foreground border-muted/30';
      case 'suspenso':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Processo não encontrado</p>
        <Link to="/app/processos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/app/processos">
            <Button variant="outline" size="icon" className="border-white/10 text-muted-foreground hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            {editMode ? (
              <div className="space-y-3">
                <Input
                  value={editFormData.titulo}
                  onChange={(e) => setEditFormData({...editFormData, titulo: e.target.value})}
                  className="bg-secondary border-white/10 text-white text-lg font-semibold"
                  placeholder="Título do processo"
                />
                <div className="flex gap-2 flex-wrap">
                  <Select 
                    value={editFormData.status} 
                    onValueChange={(v) => setEditFormData({...editFormData, status: v})}
                  >
                    <SelectTrigger className="w-[140px] bg-secondary border-white/10 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-white/10">
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="arquivado">Arquivado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={editFormData.fase}
                    onChange={(e) => setEditFormData({...editFormData, fase: e.target.value})}
                    className="w-[180px] bg-secondary border-white/10 text-white"
                    placeholder="Fase processual"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{processo.titulo}</h1>
                  <Badge className={getStatusColor(processo.status)}>{processo.status}</Badge>
                  {processo.tem_tarefas_pendentes && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      {processo.tarefas_pendentes_count} tarefa{processo.tarefas_pendentes_count !== 1 ? 's' : ''} pendente{processo.tarefas_pendentes_count !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{processo.numero}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode && (
            <>
              {processo.numero_cnj && (
                <Button
                  variant="outline"
                  onClick={consultarDatajud}
                  disabled={isConsultingDatajud}
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  {isConsultingDatajud ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Consultar Datajud
                </Button>
              )}
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (editMode) {
                setEditMode(false);
              } else {
                setEditFormData({
                  titulo: processo?.titulo || '',
                  status: processo?.status || '',
                  fase: processo?.fase || '',
                  descricao: processo?.descricao || '',
                  tipo: processo?.tipo || '',
                  valor_causa: processo?.valor_causa?.toString() || '',
                });
                setEditMode(true);
              }
            }}
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Edit className="w-4 h-4 mr-2" />
            {editMode ? 'Cancelar' : 'Editar'}
          </Button>
          {editMode && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* Informações do Processo */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Informações do Processo</CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground block mb-1">Descrição</label>
                <textarea
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                  className="w-full bg-secondary border border-white/10 rounded-md p-3 text-white resize-none"
                  rows={3}
                  placeholder="Descrição do processo"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Tipo</label>
                <Input
                  value={editFormData.tipo}
                  onChange={(e) => setEditFormData({...editFormData, tipo: e.target.value})}
                  className="bg-secondary border-white/10 text-white"
                  placeholder="Ex: Cível, Trabalhista, etc"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Valor da Causa</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.valor_causa}
                  onChange={(e) => setEditFormData({...editFormData, valor_causa: e.target.value})}
                  className="bg-secondary border-white/10 text-white"
                  placeholder="0,00"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processo.descricao && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-white">{processo.descricao}</p>
                </div>
              )}
              {processo.tipo && (
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="text-white font-medium">{processo.tipo}</p>
                </div>
              )}
              {processo.valor_causa && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor da Causa</p>
                  <p className="text-white font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processo.valor_causa)}
                  </p>
                </div>
              )}
              {processo.fase && (
                <div>
                  <p className="text-sm text-muted-foreground">Fase Processual</p>
                  <p className="text-white font-medium">{processo.fase}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abas de conteúdo */}
      <Tabs defaultValue="movimentacoes" className="space-y-4">
        <TabsList className="bg-card/50 border-white/10">
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="prazos">Prazos</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>
        
        <TabsContent value="movimentacoes" className="space-y-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {processo.movimentacoes_datajud && processo.movimentacoes_datajud.length > 0 ? (
                <div className="space-y-3">
                  {processo.movimentacoes_datajud.map((mov) => (
                    <div key={mov.id} className="border-l-2 border-primary/30 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium">{mov.nome_movimento}</p>
                          <p className="text-sm text-muted-foreground">{mov.data_movimento}</p>
                          {mov.complementos && (
                            <p className="text-sm text-muted-foreground mt-1">{mov.complementos}</p>
                          )}
                        </div>
                        {!mov.lida && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Nova</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prazos" className="space-y-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Prazos</CardTitle>
            </CardHeader>
            <CardContent>
              {processo.prazos && processo.prazos.length > 0 ? (
                <div className="space-y-3">
                  {processo.prazos.map((prazo) => (
                    <div key={prazo.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{prazo.descricao}</p>
                        <p className="text-sm text-muted-foreground">{prazo.data_final}</p>
                      </div>
                      <Badge className={
                        prazo.status === 'cumprido' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        prazo.status === 'vencido' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }>
                        {prazo.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum prazo cadastrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tarefas" className="space-y-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              {processo.tarefas && processo.tarefas.length > 0 ? (
                <div className="space-y-3">
                  {processo.tarefas.map((tarefa) => (
                    <div key={tarefa.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{tarefa.titulo}</p>
                      </div>
                      <Badge className={
                        tarefa.status === 'concluida' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        tarefa.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }>
                        {tarefa.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma tarefa cadastrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financeiro" className="space-y-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Movimentações Financeiras</CardTitle>
            </CardHeader>
            <CardContent>
              {processo.transacoes && processo.transacoes.length > 0 ? (
                <div className="space-y-3">
                  {processo.transacoes.map((transacao) => (
                    <div key={transacao.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{transacao.descricao}</p>
                        <p className="text-sm text-muted-foreground">{transacao.data_transacao}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transacao.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma movimentação financeira encontrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProcessoDetalhe;
