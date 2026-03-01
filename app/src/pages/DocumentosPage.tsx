import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Loader2,
  File,
  Image as ImageIcon,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { documentos as documentosApi, processos } from '@/services/api';
import { toast } from 'sonner';

interface Documento {
  id: number;
  nome: string;
  tipo_arquivo?: string;
  tamanho?: number;
  categoria?: string;
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
}

interface CategoriaDocumento {
  id: string;
  nome: string;
}

const getFileIcon = (tipo?: string) => {
  if (!tipo) return <File className="h-5 w-5 text-muted-foreground" />;
  const tipoLower = tipo.toLowerCase();
  if (['pdf'].includes(tipoLower)) return <FileText className="h-5 w-5 text-red-400" />;
  if (['doc', 'docx'].includes(tipoLower)) return <FileText className="h-5 w-5 text-blue-400" />;
  if (['xls', 'xlsx', 'csv'].includes(tipoLower)) return <FileSpreadsheet className="h-5 w-5 text-green-400" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(tipoLower)) return <ImageIcon className="h-5 w-5 text-purple-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


const CATEGORIAS_FALLBACK: CategoriaDocumento[] = [
  { id: 'identidade', nome: 'Documento de Identidade' },
  { id: 'endereco', nome: 'Comprovante de Endereco' },
  { id: 'contrato', nome: 'Contrato' },
  { id: 'procuracao', nome: 'Procuracao' },
  { id: 'peticao', nome: 'Peticao' },
  { id: 'sentenca', nome: 'Sentenca/Decisao' },
  { id: 'comprovante', nome: 'Comprovante de Pagamento' },
  { id: 'laudo', nome: 'Laudo Tecnico' },
  { id: 'correspondencia', nome: 'Correspondencia' },
  { id: 'outro', nome: 'Outro' },
];

export function DocumentosPage() {
  const [documentosList, setDocumentosList] = useState<Documento[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas');
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaDocumento[]>([]);
  
  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<Documento | null>(null);
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    nome: '',
    categoria: '',
    processo_id: '',
    arquivo: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, procRes, categoriasRes] = await Promise.all([
        documentosApi.list(),
        processos.list(),
        documentosApi.getCategorias().catch(() => ({ data: [] })),
      ]);
      
      const documentosData = docsRes.data.documentos || docsRes.data || [];
      setDocumentosList(documentosData);
      setProcessosList(procRes.data.processos || procRes.data || []);

      const categoriasData = Array.isArray(categoriasRes.data) ? categoriasRes.data : [];
      const categoriasDaApi: CategoriaDocumento[] = categoriasData
        .filter((c: any) => c?.id && c?.nome)
        .map((c: any) => ({ id: String(c.id), nome: String(c.nome) }));

      const categoriasDosDocumentos: CategoriaDocumento[] = documentosData
        .map((doc: any) => doc?.categoria)
        .filter((categoria: string | undefined) => !!categoria)
        .map((categoria: string) => ({ id: categoria, nome: categoria }));

      const categoriasMescladas = [...categoriasDaApi, ...categoriasDosDocumentos];
      const categoriasUnicas = categoriasMescladas.filter(
        (categoria, index, lista) =>
          lista.findIndex(
            (item) =>
              item.id.toLowerCase() === categoria.id.toLowerCase() ||
              item.nome.toLowerCase() === categoria.nome.toLowerCase()
          ) === index
      );

      setCategoriasDisponiveis(categoriasUnicas.length > 0 ? categoriasUnicas : CATEGORIAS_FALLBACK);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.arquivo) {
      toast.error('Selecione um arquivo');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('documento', uploadForm.arquivo);
      formData.append('nome', uploadForm.nome || uploadForm.arquivo.name);
      if (uploadForm.categoria) formData.append('categoria', uploadForm.categoria);
      if (uploadForm.processo_id) formData.append('processo_id', uploadForm.processo_id);

      await documentosApi.upload(formData);
      
      toast.success('Documento enviado com sucesso!');
      setIsUploadDialogOpen(false);
      resetUploadForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: Documento) => {
    try {
      const response = await documentosApi.download(doc.id);
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao baixar documento');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
      await documentosApi.delete(id);
      toast.success('Documento excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir documento');
    }
  };

  const handleView = (doc: Documento) => {
    setDocumentoSelecionado(doc);
    setIsViewDialogOpen(true);
  };

  const resetUploadForm = () => {
    setUploadForm({
      nome: '',
      categoria: '',
      processo_id: '',
      arquivo: null,
    });
  };

  const filteredDocumentos = documentosList.filter(doc => {
    const matchesSearch = 
      doc.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.cliente_nome && doc.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.processo_numero && doc.processo_numero.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const categoriaSelecionada = categoriasDisponiveis.find((cat) => cat.id === categoriaFilter);
    const matchesCategoria =
      categoriaFilter === 'todas' ||
      doc.categoria === categoriaFilter ||
      (!!categoriaSelecionada &&
        !!doc.categoria &&
        doc.categoria.toLowerCase() === categoriaSelecionada.nome.toLowerCase());
    
    return matchesSearch && matchesCategoria;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {documentosList.length} documento{documentosList.length !== 1 ? 's' : ''} cadastrado{documentosList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsUploadDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Upload de Documento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar documentos..." 
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent className="bg-secondary border-border">
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categoriasDisponiveis.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documentos List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDocumentos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || categoriaFilter !== 'todas' 
                  ? 'Nenhum documento encontrado' 
                  : 'Nenhum documento cadastrado'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || categoriaFilter !== 'todas'
                  ? 'Tente ajustar os filtros'
                  : 'Faça upload do seu primeiro documento'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocumentos.map((doc, i) => (
                <motion.div 
                  key={doc.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col gap-3 rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {getFileIcon(doc.tipo_arquivo)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{doc.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {doc.cliente_nome && `${doc.cliente_nome} · `}
                        {doc.processo_numero && `${doc.processo_numero} · `}
                        {formatFileSize(doc.tamanho)} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-2 shrink-0 sm:w-auto sm:justify-end">
                    {doc.categoria && (
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {doc.categoria}
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleView(doc)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(doc.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="arquivo">Arquivo *</Label>
              <Input
                id="arquivo"
                type="file"
                onChange={(e) => setUploadForm({ 
                  ...uploadForm, 
                  arquivo: e.target.files?.[0] || null,
                  nome: e.target.files?.[0]?.name || ''
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nome">Nome do Documento</Label>
              <Input
                id="nome"
                value={uploadForm.nome}
                onChange={(e) => setUploadForm({ ...uploadForm, nome: e.target.value })}
                placeholder="Nome para identificar o documento"
              />
            </div>
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={uploadForm.categoria}
                onValueChange={(v) => setUploadForm({ ...uploadForm, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasDisponiveis.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="processo">Processo (opcional)</Label>
              <Select
                value={uploadForm.processo_id}
                onValueChange={(v) => setUploadForm({ ...uploadForm, processo_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a um processo" />
                </SelectTrigger>
                <SelectContent>
                  {processosList.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.numero} - {p.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading || !uploadForm.arquivo}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{documentoSelecionado?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                {documentoSelecionado && getFileIcon(documentoSelecionado.tipo_arquivo)}
              </div>
              <div>
                <p className="font-medium">{documentoSelecionado?.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {documentoSelecionado?.tipo_arquivo?.toUpperCase()} · {formatFileSize(documentoSelecionado?.tamanho)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Categoria</p>
                <p className="font-medium">{documentoSelecionado?.categoria || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data de Upload</p>
                <p className="font-medium">
                  {documentoSelecionado?.created_at && 
                    new Date(documentoSelecionado.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {documentoSelecionado?.processo_numero && (
                <div>
                  <p className="text-muted-foreground">Processo</p>
                  <p className="font-medium">{documentoSelecionado.processo_numero}</p>
                </div>
              )}
              {documentoSelecionado?.cliente_nome && (
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{documentoSelecionado.cliente_nome}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)}
              >
                Fechar
              </Button>
              {documentoSelecionado && (
                <Button onClick={() => handleDownload(documentoSelecionado)}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
