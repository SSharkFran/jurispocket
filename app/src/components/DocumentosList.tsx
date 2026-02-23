import { useEffect, useState, useRef } from 'react';
import { documentos } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FileText,
  Download,
  Trash2,
  Loader2,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Upload,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Documento {
  id: number;
  nome: string;
  categoria: string;
  descricao?: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploaded_by_nome?: string;
}

interface DocumentosListProps {
  processoId?: number;
  clienteId?: number;
  titulo?: string;
}

const categorias = [
  { id: 'identidade', nome: 'Documento de Identidade' },
  { id: 'endereco', nome: 'Comprovante de Endereço' },
  { id: 'contrato', nome: 'Contrato' },
  { id: 'procuracao', nome: 'Procuração' },
  { id: 'peticao', nome: 'Petição' },
  { id: 'sentenca', nome: 'Sentença/Decisão' },
  { id: 'comprovante', nome: 'Comprovante de Pagamento' },
  { id: 'laudo', nome: 'Laudo Técnico' },
  { id: 'correspondencia', nome: 'Correspondência' },
  { id: 'outro', nome: 'Outro' },
];

const getCategoriaNome = (id: string) => {
  return categorias.find(c => c.id === id)?.nome || 'Outro';
};

const getCategoriaColor = (categoria: string) => {
  switch (categoria) {
    case 'identidade':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'endereco':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'contrato':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'procuracao':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'peticao':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'sentenca':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'comprovante':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'laudo':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getFileIcon = (mimeType: string) => {
  if (mimeType?.includes('pdf')) return <FileText className="w-6 h-6 text-red-400" />;
  if (mimeType?.includes('image')) return <FileImage className="w-6 h-6 text-purple-400" />;
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <FileSpreadsheet className="w-6 h-6 text-green-400" />;
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return <FileArchive className="w-6 h-6 text-yellow-400" />;
  return <File className="w-6 h-6 text-slate-400" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentosList({ processoId, clienteId, titulo = 'Documentos' }: DocumentosListProps) {
  const [documentosList, setDocumentosList] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  
  const [uploadForm, setUploadForm] = useState({
    categoria: 'outro',
    descricao: '',
    file: null as File | null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocumentos = async () => {
    try {
      const params: any = {};
      if (processoId) params.processo_id = processoId;
      if (clienteId) params.cliente_id = clienteId;
      
      const response = await documentos.list(params);
      setDocumentosList(response.data);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentos();
  }, [processoId, clienteId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB');
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      toast.error('Selecione um arquivo');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('documento', uploadForm.file);
      formData.append('categoria', uploadForm.categoria);
      formData.append('descricao', uploadForm.descricao);
      if (processoId) formData.append('processo_id', processoId.toString());
      if (clienteId) formData.append('cliente_id', clienteId.toString());

      await documentos.upload(formData);
      toast.success('Documento enviado com sucesso!');
      setIsUploadDialogOpen(false);
      setUploadForm({ categoria: 'outro', descricao: '', file: null });
      loadDocumentos();
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (id: number, nome: string) => {
    setIsDownloading(id);
    try {
      const response = await documentos.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nome);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao baixar documento');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    
    setIsDeleting(id);
    try {
      await documentos.delete(id);
      toast.success('Documento excluído!');
      loadDocumentos();
    } catch (error) {
      toast.error('Erro ao excluir documento');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{titulo}</h3>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Enviar Documento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Arquivo *</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="bg-slate-800 border-white/10 text-white hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-white/10 text-slate-300 hover:text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadForm.file ? uploadForm.file.name : 'Selecionar arquivo'}
                  </Button>
                  {uploadForm.file && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setUploadForm({ ...uploadForm, file: null })}
                      className="text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  PDF, DOC, XLS, JPG, PNG, ZIP (máx. 10MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Categoria</Label>
                <Select
                  value={uploadForm.categoria}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, categoria: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Descrição</Label>
                <Textarea
                  value={uploadForm.descricao}
                  onChange={(e) => setUploadForm({ ...uploadForm, descricao: e.target.value })}
                  placeholder="Descrição opcional do documento"
                  rows={2}
                  className="bg-slate-800 border-white/10 text-white resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isUploading || !uploadForm.file}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Enviar Documento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        </div>
      ) : documentosList.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Nenhum documento encontrado</p>
          <p className="text-slate-500 text-xs mt-1">
            Clique em "Adicionar" para fazer upload
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documentosList.map((doc) => (
            <Card key={doc.id} className="bg-slate-800/50 border-white/5 hover:border-cyan-500/30 transition-all">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Ícone */}
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    {getFileIcon(doc.mime_type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm truncate">{doc.nome}</p>
                      <Badge className={`text-xs ${getCategoriaColor(doc.categoria)}`}>
                        {getCategoriaNome(doc.categoria)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      {doc.uploaded_by_nome && (
                        <span>por {doc.uploaded_by_nome}</span>
                      )}
                    </div>
                    {doc.descricao && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{doc.descricao}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.id, doc.nome)}
                      disabled={isDownloading === doc.id}
                      className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                    >
                      {isDownloading === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeleting === doc.id}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {isDeleting === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
