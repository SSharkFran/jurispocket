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
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { DocumentosList } from '@/components/DocumentosList';
import { WhatsAppButton } from '@/components/whatsapp';
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

export function ProcessoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConsultingPJe, setIsConsultingPJe] = useState(false);
  const [isConsultingDatajud, setIsConsultingDatajud] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [prazoDialogOpen, setPrazoDialogOpen] = useState(false);
  const [tarefaDialogOpen, setTarefaDialogOpen] = useState(false);
  
  // Estados para formulário de prazo
  const [novoPrazo, setNovoPrazo] = useState({
    descricao: '',
    data_final: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    tipo: 'outro' as string,
  });
  const [salvandoPrazo, setSalvandoPrazo] = useState(false);
  
  // Estados para formulário de tarefa
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
  });
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);
  
  const [pjeConsultaData, setPjeConsultaData] = useState<any>(null);
  const [pjeDialogOpen, setPjeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gerarDocOpen, setGerarDocOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<number | null>(null);
  const [templateInfo, setTemplateInfo] = useState<any>(null);
  const [documentoGerado, setDocumentoGerado] = useState<string | null>(null);
  const [documentoTipo, setDocumentoTipo] = useState<'texto' | 'docx' | null>(null);
  const [documentoDownloadUrl, setDocumentoDownloadUrl] = useState<string | null>(null);
  const [gerandoDoc, setGerandoDoc] = useState(false);
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

  const abrirConsultaPublicaPJe = async () => {
    setIsConsultingPJe(true);
    try {
      const response = await processos.getPJeUrl(Number(id));
      const data = response.data;
      
      if (data.sucesso && data.url) {
        // Abre a consulta pública em nova aba
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(data.erro || 'URL de consulta não disponível para este tribunal');
      }
    } catch (error) {
      toast.error('Erro ao obter URL de consulta');
    } finally {
      setIsConsultingPJe(false);
    }
  };

  const marcarMovimentacoesLidas = async () => {
    try {
      await processos.marcarMovimentacoesLidas(Number(id));
      loadProcesso();
      toast.success('Movimentações marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar movimentações');
    }
  };

  const handleSalvarPrazo = async () => {
    if (!novoPrazo.descricao || !novoPrazo.data_final) {
      toast.error('Preencha a descrição e a data do prazo');
      return;
    }
    
    setSalvandoPrazo(true);
    try {
      await prazos.create({
        processo_id: Number(id),
        descricao: novoPrazo.descricao,
        data_final: novoPrazo.data_final,
        prioridade: novoPrazo.prioridade,
        tipo: novoPrazo.tipo,
      });
      toast.success('Prazo criado com sucesso!');
      setPrazoDialogOpen(false);
      setNovoPrazo({
        descricao: '',
        data_final: '',
        prioridade: 'media',
        tipo: 'outro',
      });
      loadProcesso();
    } catch (error) {
      toast.error('Erro ao criar prazo');
    } finally {
      setSalvandoPrazo(false);
    }
  };

  const handleSalvarTarefa = async () => {
    if (!novaTarefa.titulo) {
      toast.error('Preencha o título da tarefa');
      return;
    }
    
    setSalvandoTarefa(true);
    try {
      await api.post('/tarefas', {
        processo_id: Number(id),
        titulo: novaTarefa.titulo,
        descricao: novaTarefa.descricao,
        prioridade: novaTarefa.prioridade,
      });
      toast.success('Tarefa criada com sucesso!');
      setTarefaDialogOpen(false);
      setNovaTarefa({
        titulo: '',
        descricao: '',
        prioridade: 'media',
      });
      loadProcesso();
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    } finally {
      setSalvandoTarefa(false);
    }
  };

  // Estados para link público
  const [linkPublico, setLinkPublico] = useState<string | null>(null);
  const [linkPublicoAtivo, setLinkPublicoAtivo] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);

  // Carrega link público ao carregar o processo
  useEffect(() => {
    if (processo?.id) {
      carregarLinkPublico();
    }
  }, [processo?.id]);

  const carregarLinkPublico = async () => {
    try {
      const response = await processos.getLinkPublico(Number(id));
      if (response.data.ativo) {
        setLinkPublico(response.data.url);
        setLinkPublicoAtivo(true);
      }
    } catch (error) {
      // Silencioso - link pode não existir
    }
  };

  const gerarLinkPublico = async () => {
    setGerandoLink(true);
    try {
      const response = await processos.gerarLinkPublico(Number(id));
      setLinkPublico(response.data.url);
      setLinkPublicoAtivo(true);
      toast.success('Link público gerado!');
    } catch (error) {
      toast.error('Erro ao gerar link público');
    } finally {
      setGerandoLink(false);
    }
  };

  const desativarLinkPublico = async () => {
    try {
      await processos.desativarLinkPublico(Number(id));
      setLinkPublico(null);
      setLinkPublicoAtivo(false);
      toast.success('Link público desativado');
    } catch (error) {
      toast.error('Erro ao desativar link');
    }
  };

  const copiarLinkPublico = () => {
    if (linkPublico) {
      navigator.clipboard.writeText(linkPublico);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const consultarDatajud = async () => {
    setIsConsultingDatajud(true);
    
    // Toast de loading
    const loadingToast = toast.loading('Consultando Datajud...', {
      description: 'Buscando movimentações no CNJ'
    });
    
    try {
      const response = await api.post(`/processos/${id}/consultar-datajud`);
      const data = response.data;
      
      // Fecha o toast de loading
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
        // Força recarregar o processo para mostrar as movimentações
        await loadProcesso();
      } else if (data.sucesso && !data.encontrado) {
        toast.info('Processo não encontrado no Datajud', {
          description: 'O processo ainda não está disponível na API pública. Pode levar alguns dias após a distribuição.',
          duration: 6000
        });
      } else {
        // Erro com detalhes
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
      // Fecha o toast de loading
      toast.dismiss(loadingToast);
      
      // Trata erro de recurso não disponível no plano (403)
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

  const gerarLinkWhatsApp = async () => {
    try {
      const response = await processos.getWhatsAppLink(Number(id));
      setWhatsappLink(response.data.link);
      setWhatsappDialogOpen(true);
    } catch (error) {
      toast.error('Erro ao gerar link do WhatsApp');
    }
  };

  const carregarTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Erro ao carregar templates');
    }
  };

  const abrirModalGerarDoc = async () => {
    await carregarTemplates();
    setGerarDocOpen(true);
    setTemplateSelecionado(null);
    setTemplateInfo(null);
    setDocumentoGerado(null);
    setDocumentoTipo(null);
    setDocumentoDownloadUrl(null);
  };

  const handleTemplateChange = (templateId: number) => {
    setTemplateSelecionado(templateId);
    const template = templates.find((t) => t.id === templateId);
    setTemplateInfo(template);
  };

  const downloadDocumento = () => {
    if (documentoDownloadUrl && templateInfo) {
      const link = document.createElement('a');
      link.href = documentoDownloadUrl;
      link.download = `${templateInfo?.nome || 'documento'}_${processo?.cliente_nome || 'cliente'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const gerarDocumento = async () => {
    if (!templateSelecionado) {
      toast.error('Selecione um template');
      return;
    }
    setGerandoDoc(true);
    try {
      // Verifica se é template Word
      const isWord = templateInfo?.tipo_arquivo === 'docx';
      
      const response = await api.post(`/templates/${templateSelecionado}/gerar`, {
        processo_id: Number(id),
        formato: isWord ? 'download' : 'json',
      }, {
        responseType: isWord ? 'blob' : 'json',
      });
      
      if (isWord) {
        // Cria URL para download do arquivo
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        const url = window.URL.createObjectURL(blob);
        
        setDocumentoTipo('docx');
        setDocumentoDownloadUrl(url);
        
        // Extrai nome do arquivo do header se disponível
        const contentDisposition = response.headers['content-disposition'];
        let filename = `${templateInfo?.nome || 'documento'}_${processo?.cliente_nome || 'cliente'}.docx`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match) {
            filename = match[1].replace(/['"]/g, '');
          }
        }
        
        // Fazer upload do documento gerado para a aba de documentos
        try {
          const formData = new FormData();
          formData.append('documento', blob, filename);
          formData.append('processo_id', id || '');
          formData.append('categoria', 'documento_gerado');
          formData.append('descricao', `Documento gerado a partir do template: ${templateInfo?.nome}`);
          
          await api.post('/documentos', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          toast.success('Documento gerado e salvo com sucesso!');
        } catch (uploadError) {
          console.error('Erro ao salvar documento:', uploadError);
          toast.success('Documento gerado! (Erro ao salvar automaticamente)');
        }
      } else {
        setDocumentoTipo('texto');
        setDocumentoGerado(response.data.documento_gerado);
        toast.success('Documento gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento');
    } finally {
      setGerandoDoc(false);
    }
  };

  const copiarDocumento = () => {
    if (documentoGerado) {
      navigator.clipboard.writeText(documentoGerado);
      toast.success('Documento copiado!');
    }
  };

  const imprimirDocumento = () => {
    if (documentoGerado) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Documento - ${processo?.titulo || 'Processo'}</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
                pre { white-space: pre-wrap; font-family: inherit; }
              </style>
            </head>
            <body>
              <pre>${documentoGerado}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
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

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'alta':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'media':
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
        <Link to="/processos">
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
          <Link to="/processos">
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
              <Button
                variant="outline"
                onClick={abrirModalGerarDoc}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Gerar Documento
              </Button>
              <WhatsAppButton
                processoId={Number(id)}
                clienteTelefone={processo.cliente_telefone}
                clienteNome={processo.cliente_nome}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-400"
              />
              {processo.numero_cnj && (
                <Button
                  variant="outline"
                  onClick={abrirConsultaPublicaPJe}
                  disabled={isConsultingPJe}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isConsultingPJe ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Abrir Consulta Pública
                </Button>
              )}
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
              
              {/* Botão Link Público */}
              {linkPublicoAtivo && linkPublico ? (
                <>
                  <Button
                    variant="outline"
                    onClick={copiarLinkPublico}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link do Cliente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={desativarLinkPublico}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    size="icon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={gerarLinkPublico}
                  disabled={gerandoLink}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  {gerandoLink ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Gerar Link do Cliente
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
          {!editMode && (
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
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

      {processo.numero_cnj && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Monitoramento PJe
              {processo.movimentacoes_novas_count ? (
                <Badge className="bg-red-500 text-white ml-2">
                  {processo.movimentacoes_novas_count} nova{processo.movimentacoes_novas_count > 1 ? 's' : ''}
                </Badge>
              ) : null}
            </CardTitle>
            {processo.movimentacoes_novas_count > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={marcarMovimentacoesLidas}
                className="text-muted-foreground hover:text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Marcar como lidas
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tribunal</p>
                <p className="text-white font-medium">
                  {processo.tribunal_codigo ? (
                    <span className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {processo.tribunal_codigo}
                      </Badge>
                      {processo.tribunal_uf && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {processo.tribunal_uf}
                        </Badge>
                      )}
                      <span className="text-sm text-foreground">{processo.tribunal_nome}</span>
                    </span>
                  ) : (
                    'Não identificado'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status Monitoramento</p>
                <p className="text-white font-medium">
                  {processo.monitoramento?.monitorar_datajud ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <RefreshCw className="w-4 h-4" />
                      Ativo (Datajud)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Inativo</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Última movimentação do Datajud */}
            {processo.ultima_movimentacao_datajud ? (
              <div className={`mt-4 rounded-lg p-4 border ${
                processo.ultima_movimentacao_nova 
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10' 
                  : 'bg-secondary/50 border-border'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {processo.ultima_movimentacao_nova ? (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                          <span className="text-amber-400 font-semibold text-sm flex items-center gap-1">
                            <RefreshCw className="w-4 h-4" />
                            NOVA MOVIMENTAÇÃO
                          </span>
                        </>
                      ) : (
                        <span className="text-green-400 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Última Movimentação
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {new Date(processo.ultima_movimentacao_datajud.data_movimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className={`font-medium ${processo.ultima_movimentacao_nova ? 'text-amber-100' : 'text-white'}`}>
                      {processo.ultima_movimentacao_datajud.nome_movimento}
                    </p>
                    {processo.ultima_movimentacao_datajud.complementos && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {(() => {
                          try {
                            const comps = JSON.parse(processo.ultima_movimentacao_datajud.complementos);
                            if (Array.isArray(comps) && comps.length > 0) {
                              return comps.map(c => c.descricao).filter(Boolean).join(' | ');
                            }
                          } catch {}
                          return null;
                        })()}
                      </p>
                    )}
                  </div>
                  {processo.ultima_movimentacao_nova && (
                    <Badge className="bg-amber-500 text-white ml-2 animate-pulse">
                      Nova!
                    </Badge>
                  )}
                </div>
                {processo.movimentacoes_novas_count > 1 && (
                  <p className="text-amber-400/80 text-sm mt-2 pt-2 border-t border-amber-500/20">
                    +{processo.movimentacoes_novas_count - 1} outra{processo.movimentacoes_novas_count > 2 ? 's' : ''} movimentação{processo.movimentacoes_novas_count > 2 ? 's' : ''} nova{processo.movimentacoes_novas_count > 2 ? 's' : ''}. 
                    <Link to="#" onClick={() => document.querySelector('[data-value="datajud"]')?.click()} className="underline hover:text-amber-300">
                      Ver todas →
                    </Link>
                  </p>
                )}
              </div>
            ) : processo.ultima_movimentacao ? (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm text-green-400 font-medium mb-1">
                  <Check className="w-4 h-4 inline mr-1" />
                  Última Movimentação {processo.data_ultima_movimentacao && `(${new Date(processo.data_ultima_movimentacao).toLocaleDateString('pt-BR')})`}
                </p>
                <p className="text-white">{processo.ultima_movimentacao}</p>
              </div>
            ) : (
              <div className="mt-4 bg-secondary/50 border border-border rounded-lg p-3">
                <p className="text-muted-foreground text-sm">
                  Nenhuma movimentação registrada. Clique em "Consultar Datajud" para buscar atualizações.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="prazos">
        <TabsList className="bg-secondary border-white/10">
          <TabsTrigger value="prazos" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Prazos ({processo.prazos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Tarefas ({processo.tarefas?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileText className="w-4 h-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="datajud" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 relative">
            <RefreshCw className="w-4 h-4 mr-2" />
            Movimentações Datajud ({processo.movimentacoes_datajud?.length || 0})
            {processo.movimentacoes_novas_count ? (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prazos" className="mt-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Prazos</CardTitle>
              <Button size="sm" onClick={() => setPrazoDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo Prazo
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {processo.prazos?.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhum prazo cadastrado</p>
                  )}
                  {processo.prazos?.map((prazo) => (
                    <div key={prazo.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{prazo.descricao}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPrioridadeColor(prazo.prioridade)}>{prazo.prioridade}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(prazo.data_final).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      {prazo.status === 'pendente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await prazos.marcarCumprido(prazo.id);
                            loadProcesso();
                            toast.success('Prazo marcado como cumprido!');
                          }}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarefas" className="mt-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Tarefas</CardTitle>
              <Button size="sm" onClick={() => setTarefaDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {processo.tarefas?.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhuma tarefa</p>
                  )}
                  {processo.tarefas?.map((tarefa) => (
                    <div key={tarefa.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{tarefa.titulo}</p>
                        <Badge className={getPrioridadeColor(tarefa.prioridade)}>{tarefa.prioridade}</Badge>
                      </div>
                      <Badge className={tarefa.status === 'concluida' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {tarefa.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Transações Financeiras</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {processo.transacoes?.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhuma transação</p>
                  )}
                  {processo.transacoes?.map((trans) => (
                    <div key={trans.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-white">{trans.descricao}</p>
                        <p className="text-sm text-muted-foreground">{new Date(trans.data_transacao).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`font-semibold ${trans.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                        {trans.tipo === 'entrada' ? '+' : '-'}{formatCurrency(trans.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <DocumentosList processoId={Number(id)} titulo="Documentos do Processo" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datajud" className="mt-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                  Movimentações Datajud (CNJ)
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Consulta automática via API pública do CNJ
                </p>
              </div>
              <div className="flex items-center gap-2">
                {processo.monitoramento?.monitorar_datajud ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Monitorando
                  </Badge>
                ) : (
                  <Badge className="bg-muted/20 text-muted-foreground border-muted/30">
                    Não monitorado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {processo.movimentacoes_datajud?.length === 0 ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        Clique em "Consultar Datajud" para buscar movimentações
                      </p>
                    </div>
                  ) : (
                    processo.movimentacoes_datajud?.map((mov: any) => {
                      const isNova = !mov.lida;
                      return (
                        <div key={mov.id} className={`p-4 rounded-lg border-l-4 transition-all ${
                          isNova 
                            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500 shadow-sm' 
                            : 'bg-secondary/50 border-blue-500'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${isNova ? 'text-amber-100' : 'text-white'}`}>
                                  {mov.nome_movimento}
                                </p>
                                {isNova && (
                                  <Badge className="bg-amber-500 text-white text-xs">
                                    NOVA
                                  </Badge>
                                )}
                              </div>
                              {mov.complementos && (
                                <p className="text-muted-foreground text-sm mt-1">
                                  {(() => {
                                    try {
                                      const comps = JSON.parse(mov.complementos);
                                      if (Array.isArray(comps) && comps.length > 0) {
                                        return comps.map((c: any) => c.descricao).filter(Boolean).join(', ');
                                      }
                                    } catch {}
                                    return null;
                                  })()}
                                </p>
                              )}
                            </div>
                            <span className={`text-sm ml-4 ${isNova ? 'text-amber-400' : 'text-muted-foreground'}`}>
                              {new Date(mov.data_movimento).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              
              {processo.monitoramento?.ultima_verificacao && (
                <p className="text-muted-foreground text-xs mt-4 text-right">
                  Última verificação: {new Date(processo.monitoramento.ultima_verificacao).toLocaleString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Compartilhar via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <a
              href={whatsappLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Abrir WhatsApp
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog PJe */}
      <Dialog open={pjeDialogOpen} onOpenChange={setPjeDialogOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Consulta PJe - {pjeConsultaData?.tribunal_nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Info do Tribunal */}
            <div className="p-4 bg-secondary/50 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-white font-medium">{pjeConsultaData?.tribunal_nome}</p>
                  <p className="text-muted-foreground text-xs">{pjeConsultaData?.numero_processo}</p>
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className={`p-4 rounded-lg ${pjeConsultaData?.ultima_movimentacao ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <p className={`text-sm ${pjeConsultaData?.ultima_movimentacao ? 'text-green-400' : 'text-amber-400'}`}>
                {pjeConsultaData?.ultima_movimentacao ? (
                  <><strong>✓ Sucesso!</strong> Última movimentação extraída automaticamente do PJe.</>
                ) : (
                  <><strong>Como consultar:</strong> Clique no botão abaixo para abrir o PJe. 
                  Cole o número do processo, clique em buscar e copie a última movimentação.</>
                )}
              </p>
            </div>
            
            {/* Link para consulta manual */}
            {pjeConsultaData?.url_consulta && (
              <a
                href={pjeConsultaData.url_consulta}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-4 bg-primary/20 border border-primary/30 rounded-lg text-primary hover:bg-primary/30 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Consulta Pública PJe
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Dados extraídos automaticamente (se houver) */}
            {pjeConsultaData?.ultima_movimentacao && (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-primary text-sm font-medium mb-2">
                  <Check className="w-4 h-4 inline mr-1" />
                  Última Movimentação (Automático)
                </p>
                {pjeConsultaData.data_ultima_movimentacao && (
                  <p className="text-white text-sm font-semibold mb-1">
                    Data: {pjeConsultaData.data_ultima_movimentacao}
                  </p>
                )}
                <p className="text-white text-sm">{pjeConsultaData.ultima_movimentacao}</p>
                <Button
                  onClick={async () => {
                    try {
                      await processos.update(Number(id), {
                        ultimo_movimento: pjeConsultaData.ultima_movimentacao,
                        ultimo_movimento_data: pjeConsultaData.data_ultima_movimentacao 
                          ? new Date(pjeConsultaData.data_ultima_movimentacao.split('/').reverse().join('-')).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0]
                      });
                      toast.success('Movimentação salva com sucesso!');
                      setPjeDialogOpen(false);
                      loadProcesso();
                    } catch (error) {
                      toast.error('Erro ao salvar movimentação');
                    }
                  }}
                  className="mt-3 w-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Esta Movimentação
                </Button>
              </div>
            )}

            {/* Modo Manual */}
            {!pjeConsultaData?.ultima_movimentacao && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Última Movimentação (copie do PJe)</label>
                  <textarea
                    value={pjeConsultaData?.ultima_movimentacao_manual || ''}
                    onChange={(e) => setPjeConsultaData({...pjeConsultaData, ultima_movimentacao_manual: e.target.value})}
                    className="w-full bg-secondary border border-white/10 rounded-md p-3 text-white text-sm resize-none"
                    rows={3}
                    placeholder="Cole aqui a última movimentação..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Data da Movimentação</label>
                  <Input
                    type="date"
                    value={pjeConsultaData?.data_movimentacao_manual || ''}
                    onChange={(e) => setPjeConsultaData({...pjeConsultaData, data_movimentacao_manual: e.target.value})}
                    className="bg-secondary border-white/10 text-white"
                  />
                </div>

                <Button
                  onClick={async () => {
                    if (!pjeConsultaData?.ultima_movimentacao_manual) {
                      toast.error('Digite a última movimentação');
                      return;
                    }
                    try {
                      await processos.update(Number(id), {
                        ultimo_movimento: pjeConsultaData.ultima_movimentacao_manual,
                        ultimo_movimento_data: pjeConsultaData.data_movimentacao_manual || new Date().toISOString().split('T')[0]
                      });
                      toast.success('Movimentação salva com sucesso!');
                      setPjeDialogOpen(false);
                      loadProcesso();
                    } catch (error) {
                      toast.error('Erro ao salvar movimentação');
                    }
                  }}
                  className="w-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Movimentação
                </Button>
              </>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              Você será redirecionado para o site oficial do tribunal.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerar Documento */}
      <Dialog open={gerarDocOpen} onOpenChange={setGerarDocOpen}>
        <DialogContent className="bg-card border-white/10 max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-purple-400" />
              Gerar Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {!documentoGerado ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Selecione um Template</label>
                  <Select 
                    value={templateSelecionado?.toString() || ''} 
                    onValueChange={(v) => handleTemplateChange(Number(v))}
                  >
                    <SelectTrigger className="bg-secondary border-white/10 text-white">
                      <SelectValue placeholder="Escolha um modelo de documento" />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-white/10">
                      {templates.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          Nenhum template cadastrado
                        </div>
                      ) : (
                        templates.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            <div className="flex items-center gap-2">
                              {t.tipo_arquivo === 'docx' ? (
                                <File className="w-4 h-4 text-blue-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-primary" />
                              )}
                              <span>{t.nome}</span>
                              {t.categoria && (
                                <span className="text-muted-foreground text-xs">({t.categoria})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {templateInfo?.tipo_arquivo === 'docx' && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <File className="w-4 h-4 text-blue-400" />
                      <span>Template Word: O documento será gerado em formato .docx</span>
                    </div>
                  </div>
                )}

                {templates.length === 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-sm">
                      <strong>Nenhum template cadastrado.</strong>{' '}
                      <Link to="/templates" className="underline hover:text-amber-300">
                        Clique aqui para criar templates
                      </Link>
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setGerarDocOpen(false)}
                    className="flex-1 border-white/10 text-muted-foreground hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={gerarDocumento}
                    disabled={!templateSelecionado || gerandoDoc || templates.length === 0}
                    className="flex-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                  >
                    {gerandoDoc ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : templateInfo?.tipo_arquivo === 'docx' ? (
                      <File className="w-4 h-4 mr-2 text-blue-400" />
                    ) : (
                      <FileCode className="w-4 h-4 mr-2" />
                    )}
                    {templateInfo?.tipo_arquivo === 'docx' ? 'Gerar Word' : 'Gerar Documento'}
                  </Button>
                </div>
              </>
            ) : documentoTipo === 'docx' ? (
              <>
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-6 text-center">
                  <File className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-100 mb-2">
                    Documento Word Gerado!
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    O documento <strong>{templateInfo?.nome}</strong> foi gerado com sucesso.
                    <br />
                    Clique no botão abaixo para fazer o download.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDocumentoGerado(null);
                      setDocumentoTipo(null);
                      setDocumentoDownloadUrl(null);
                    }}
                    className="border-white/10 text-muted-foreground hover:text-white"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={downloadDocumento}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Documento .docx
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-secondary border border-white/10 rounded-lg p-4 max-h-[50vh] overflow-auto">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-200">
                    {documentoGerado}
                  </pre>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDocumentoGerado(null)}
                    className="border-white/10 text-muted-foreground hover:text-white"
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copiarDocumento}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={imprimirDocumento}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={() => setGerarDocOpen(false)}
                    className="bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 ml-auto"
                  >
                    Concluir
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-foreground">
              Tem certeza que deseja excluir o processo <strong className="text-white">{processo?.titulo}</strong>?
            </p>
            <p className="text-muted-foreground text-sm">
              Esta ação não pode ser desfeita. Todos os prazos, tarefas e dados financeiros associados também serão removidos.
            </p>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 border-white/10 text-muted-foreground hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await processos.delete(Number(id));
                    toast.success('Processo excluído com sucesso!');
                    navigate('/processos');
                  } catch (error) {
                    toast.error('Erro ao excluir processo');
                  }
                }}
                className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Prazo */}
      <Dialog open={prazoDialogOpen} onOpenChange={setPrazoDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Prazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Descrição</Label>
              <Input
                value={novoPrazo.descricao}
                onChange={(e) => setNovoPrazo({...novoPrazo, descricao: e.target.value})}
                className="bg-secondary border-white/10 text-white"
                placeholder="Ex: Prazo para manifestação"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Data Final</Label>
                <Input
                  type="date"
                  value={novoPrazo.data_final}
                  onChange={(e) => setNovoPrazo({...novoPrazo, data_final: e.target.value})}
                  className="bg-secondary border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Prioridade</Label>
                <Select 
                  value={novoPrazo.prioridade} 
                  onValueChange={(v) => setNovoPrazo({...novoPrazo, prioridade: v as any})}
                >
                  <SelectTrigger className="bg-secondary border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-white/10">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground">Tipo</Label>
              <Select 
                value={novoPrazo.tipo} 
                onValueChange={(v) => setNovoPrazo({...novoPrazo, tipo: v})}
              >
                <SelectTrigger className="bg-secondary border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10">
                  <SelectItem value="audiencia">Audiência</SelectItem>
                  <SelectItem value="pericia">Perícia</SelectItem>
                  <SelectItem value="manifestacao">Manifestação</SelectItem>
                  <SelectItem value="recurso">Recurso</SelectItem>
                  <SelectItem value="citacao">Citação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPrazoDialogOpen(false)}
                className="flex-1 border-white/10 text-white hover:bg-secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarPrazo}
                disabled={salvandoPrazo}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                {salvandoPrazo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Tarefa */}
      <Dialog open={tarefaDialogOpen} onOpenChange={setTarefaDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Título</Label>
              <Input
                value={novaTarefa.titulo}
                onChange={(e) => setNovaTarefa({...novaTarefa, titulo: e.target.value})}
                className="bg-secondary border-white/10 text-white"
                placeholder="Ex: Preparar petição inicial"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground">Descrição (opcional)</Label>
              <Textarea
                value={novaTarefa.descricao}
                onChange={(e) => setNovaTarefa({...novaTarefa, descricao: e.target.value})}
                className="bg-secondary border-white/10 text-white"
                placeholder="Detalhes da tarefa..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground">Prioridade</Label>
              <Select 
                value={novaTarefa.prioridade} 
                onValueChange={(v) => setNovaTarefa({...novaTarefa, prioridade: v as any})}
              >
                <SelectTrigger className="bg-secondary border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10">
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setTarefaDialogOpen(false)}
                className="flex-1 border-white/10 text-white hover:bg-secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarTarefa}
                disabled={salvandoTarefa}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                {salvandoTarefa ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
