import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Upload,
  Search,
  Filter,
} from 'lucide-react';
import { documentos } from '@/services/api';
import { toast } from 'sonner';

interface Documento {
  id: number;
  nome: string;
  descricao?: string;
  categoria: string;
  arquivo: string;
  tamanho: number;
  data_upload: string;
  processo_id?: number;
}

interface DocumentosListProps {
  processoId?: number;
  clienteId?: number;
}

export function DocumentosList({ processoId, clienteId }: DocumentosListProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todos');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescricao, setUploadDescricao] = useState('');
  const [uploadCategoria, setUploadCategoria] = useState('geral');

  const categorias = [
    { value: 'todos', label: 'Todos' },
    { value: 'geral', label: 'Geral' },
    { value: 'peticao', label: 'Petição' },
    { value: 'contrato', label: 'Contrato' },
    { value: 'documento_gerado', label: 'Documento Gerado' },
    { value: 'anexo', label: 'Anexo' },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleDownload = async (documentoId: number) => {
    try {
      const response = await documentos.download(documentoId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'documento');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao baixar documento');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    const formData = new FormData();
    formData.append('documento', uploadFile);
    if (processoId) formData.append('processo_id', processoId.toString());
    if (clienteId) formData.append('cliente_id', clienteId.toString());
    formData.append('categoria', uploadCategoria);
    formData.append('descricao', uploadDescricao);

    try {
      await documentos.create(formData);
      toast.success('Documento enviado com sucesso!');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadDescricao('');
      setUploadCategoria('geral');
      // Recarregar documentos
    } catch (error) {
      toast.error('Erro ao enviar documento');
    }
  };

  const filteredDocumentos = documentos.filter(doc => {
    const matchesSearch = doc.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.descricao && doc.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategoria = categoriaFilter === 'todos' || doc.categoria === categoriaFilter;
    return matchesSearch && matchesCategoria;
  });

  return (
    <div className="space-y-4">
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Enviar Documento
        </Button>
      </div>

      {/* Lista de Documentos */}
      <div className="grid gap-4">
        {filteredDocumentos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || categoriaFilter !== 'todos' 
                  ? 'Nenhum documento encontrado com os filtros aplicados' 
                  : 'Nenhum documento encontrado'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDocumentos.map((documento) => (
            <Card key={documento.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-medium">{documento.nome}</h3>
                      <Badge variant="secondary">{documento.categoria}</Badge>
                    </div>
                    {documento.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{documento.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatFileSize(documento.tamanho)}</span>
                      <span>{formatDate(documento.data_upload)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(documento.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Descrição do documento"
                value={uploadDescricao}
                onChange={(e) => setUploadDescricao(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={uploadCategoria} onValueChange={setUploadCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.filter(cat => cat.value !== 'todos').map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpload}>
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
