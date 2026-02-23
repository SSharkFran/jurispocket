import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  FileText,
  Search,
  Download,
  Trash2,
  Loader2,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Calendar,
  User,
  FolderOpen,
  Briefcase,
  Filter,
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
  processo_id?: number;
  processo_numero?: string;
  processo_titulo?: string;
  cliente_id?: number;
  cliente_nome?: string;
  uploaded_by_nome?: string;
}

const categorias = [
  { id: 'identidade', nome: 'Documento de Identidade', icon: 'id-card' },
  { id: 'endereco', nome: 'Comprovante de Endereço', icon: 'home' },
  { id: 'contrato', nome: 'Contrato', icon: 'file-signature' },
  { id: 'procuracao', nome: 'Procuração', icon: 'file-power' },
  { id: 'peticao', nome: 'Petição', icon: 'file-alt' },
  { id: 'sentenca', nome: 'Sentença/Decisão', icon: 'gavel' },
  { id: 'comprovante', nome: 'Comprovante de Pagamento', icon: 'receipt' },
  { id: 'laudo', nome: 'Laudo Técnico', icon: 'clipboard-check' },
  { id: 'correspondencia', nome: 'Correspondência', icon: 'envelope' },
  { id: 'outro', nome: 'Outro', icon: 'file' },
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
  if (mimeType?.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
  if (mimeType?.includes('image')) return <FileImage className="w-8 h-8 text-purple-400" />;
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-400" />;
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return <FileArchive className="w-8 h-8 text-yellow-400" />;
  return <File className="w-8 h-8 text-slate-400" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentosPage() {
  const [documentosList, setDocumentosList] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const loadDocumentos = async () => {
    try {
      const response = await documentos.list({
        search: search || undefined,
        categoria: categoriaFiltro || undefined,
      });
      setDocumentosList(response.data);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentos();
  }, [search, categoriaFiltro]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentos</h1>
          <p className="text-slate-400">
            {documentosList.length} documento(s) encontrado(s)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <FolderOpen className="w-4 h-4" />
          <span>Gerencie todos os documentos do escritório</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar documentos por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={categoriaFiltro || 'todas'} onValueChange={(v) => setCategoriaFiltro(v === 'todas' ? '' : v)}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10">
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {categoriaFiltro && (
          <Button
            variant="outline"
            onClick={() => setCategoriaFiltro('')}
            className="border-white/10 text-slate-400"
          >
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Lista de Documentos */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : documentosList.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nenhum documento encontrado</p>
          <p className="text-slate-500 text-sm mt-1">
            Faça upload de documentos nos processos ou clientes
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documentosList.map((doc) => (
            <Card key={doc.id} className="bg-slate-900/50 border-white/10 hover:border-cyan-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Ícone */}
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    {getFileIcon(doc.mime_type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-medium text-white truncate">{doc.nome}</h3>
                      <Badge className={getCategoriaColor(doc.categoria)}>
                        {getCategoriaNome(doc.categoria)}
                      </Badge>
                    </div>
                    
                    {doc.descricao && (
                      <p className="text-sm text-slate-400 mb-2">{doc.descricao}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                      {doc.uploaded_by_nome && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.uploaded_by_nome}
                        </span>
                      )}
                    </div>

                    {/* Links para Processo/Cliente */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {doc.processo_id && (
                        <Link to={`/processos/${doc.processo_id}`}>
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {doc.processo_numero || 'Processo'}
                          </Badge>
                        </Link>
                      )}
                      {doc.cliente_id && (
                        <Link to={`/clientes/${doc.cliente_id}`}>
                          <Badge variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                            <User className="w-3 h-3 mr-1" />
                            {doc.cliente_nome || 'Cliente'}
                          </Badge>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownload(doc.id, doc.nome)}
                      disabled={isDownloading === doc.id}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      {isDownloading === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeleting === doc.id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
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
