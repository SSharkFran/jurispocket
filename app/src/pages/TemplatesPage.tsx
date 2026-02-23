import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Copy, 
  Eye, 
  FileCode,
  ChevronRight,
  HelpCircle,
  Upload,
  FileType,
  File,
  Download
} from 'lucide-react';

interface Template {
  id: number;
  nome: string;
  descricao: string;
  conteudo: string;
  tipo_arquivo: 'texto' | 'docx';
  caminho_arquivo: string | null;
  categoria: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIAS = [
  { value: 'procuracao', label: 'Procuração' },
  { value: 'declaracao', label: 'Declaração' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'peticao', label: 'Petição' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'timbre', label: 'Papel Timbrado' },
  { value: 'geral', label: 'Geral' },
];

const VARIAVEIS_DISPONIVEIS = {
  'Dados do Cliente': [
    { var: '{{cliente_nome}}', desc: 'Nome completo' },
    { var: '{{cliente_cpf}}', desc: 'CPF/CNPJ' },
    { var: '{{cliente_cnpj}}', desc: 'CNPJ (se aplicável)' },
    { var: '{{cliente_rg}}', desc: 'RG' },
    { var: '{{cliente_nacionalidade}}', desc: 'Nacionalidade' },
    { var: '{{cliente_estado_civil}}', desc: 'Estado civil' },
    { var: '{{cliente_profissao}}', desc: 'Profissão' },
    { var: '{{cliente_endereco}}', desc: 'Rua/Avenida' },
    { var: '{{cliente_numero}}', desc: 'Número' },
    { var: '{{cliente_complemento}}', desc: 'Complemento' },
    { var: '{{cliente_bairro}}', desc: 'Bairro' },
    { var: '{{cliente_cidade}}', desc: 'Cidade' },
    { var: '{{cliente_estado}}', desc: 'Estado' },
    { var: '{{cliente_cep}}', desc: 'CEP' },
    { var: '{{cliente_email}}', desc: 'E-mail' },
    { var: '{{cliente_telefone}}', desc: 'Telefone' },
    { var: '{{cliente_data_nascimento}}', desc: 'Data de nascimento' },
  ],
  'Dados do Processo': [
    { var: '{{processo_numero}}', desc: 'Número do processo' },
    { var: '{{processo_numero_cnj}}', desc: 'Número CNJ' },
    { var: '{{processo_titulo}}', desc: 'Título/ação' },
    { var: '{{processo_descricao}}', desc: 'Descrição' },
    { var: '{{processo_tipo}}', desc: 'Tipo' },
    { var: '{{processo_vara}}', desc: 'Vara' },
    { var: '{{processo_comarca}}', desc: 'Comarca' },
    { var: '{{processo_valor_causa}}', desc: 'Valor da causa (formatado)' },
    { var: '{{processo_valor_causa_numero}}', desc: 'Valor numérico' },
    { var: '{{processo_status}}', desc: 'Status' },
    { var: '{{processo_data_abertura}}', desc: 'Data de abertura' },
  ],
  'Advogado/Escritório': [
    { var: '{{advogado_nome}}', desc: 'Nome do advogado' },
    { var: '{{advogado_email}}', desc: 'E-mail' },
    { var: '{{advogado_oab}}', desc: 'Número OAB' },
    { var: '{{advogado_telefone}}', desc: 'Telefone' },
    { var: '{{escritorio_nome}}', desc: 'Nome do escritório' },
  ],
  'Financeiro': [
    { var: '{{financeiro_total_entradas}}', desc: 'Total de entradas' },
    { var: '{{financeiro_total_saidas}}', desc: 'Total de saídas' },
    { var: '{{financeiro_saldo}}', desc: 'Saldo' },
  ],
  'Data': [
    { var: '{{data_atual}}', desc: 'Data atual (dd/mm/aaaa)' },
    { var: '{{data_atual_extenso}}', desc: 'Data por extenso' },
    { var: '{{data_atual_americana}}', desc: 'Data (aaaa-mm-dd)' },
    { var: '{{hora_atual}}', desc: 'Hora atual' },
  ],
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'texto' | 'docx'>('todos');
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    categoria: 'geral',
    tipo_arquivo: 'texto' as 'texto' | 'docx',
  });
  const [arquivoWord, setArquivoWord] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarTemplates();
  }, []);

  const carregarTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/templates');
      console.log('Templates carregados:', response.data);
      setTemplates(response.data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Se for template Word, faz upload do arquivo
    if (formData.tipo_arquivo === 'docx') {
      if (!arquivoWord) {
        toast.error('Selecione um arquivo .docx');
        return;
      }
      
      try {
        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('arquivo', arquivoWord);
        uploadData.append('nome', formData.nome);
        uploadData.append('descricao', formData.descricao);
        uploadData.append('categoria', formData.categoria);
        
        await api.post('/templates/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.success('Template Word criado com sucesso!');
        setIsCreateOpen(false);
        resetForm();
        await carregarTemplates();
      } catch (error: any) {
        console.error('Erro ao fazer upload:', error);
        toast.error(error.response?.data?.error || 'Erro ao fazer upload do template');
      } finally {
        setUploading(false);
      }
    } else {
      // Template de texto
      if (!formData.conteudo.trim()) {
        toast.error('Conteúdo é obrigatório');
        return;
      }
      
      try {
        await api.post('/templates', formData);
        toast.success('Template criado com sucesso!');
        setIsCreateOpen(false);
        resetForm();
        await carregarTemplates();
      } catch (error) {
        console.error('Erro ao criar template:', error);
        toast.error('Erro ao criar template');
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await api.put(`/templates/${selectedTemplate.id}`, formData);
      toast.success('Template atualizado com sucesso!');
      setIsEditOpen(false);
      setSelectedTemplate(null);
      resetForm();
      carregarTemplates();
    } catch (error) {
      toast.error('Erro ao atualizar template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      await api.delete(`/templates/${id}`);
      toast.success('Template excluído com sucesso!');
      carregarTemplates();
    } catch (error) {
      toast.error('Erro ao excluir template');
    }
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      nome: template.nome,
      descricao: template.descricao || '',
      conteudo: template.conteudo || '',
      categoria: template.categoria,
      tipo_arquivo: template.tipo_arquivo || 'texto',
    });
    setIsEditOpen(true);
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
      categoria: 'geral',
      tipo_arquivo: 'texto',
    });
    setArquivoWord(null);
  };

  const inserirVariavel = (variavel: string) => {
    setFormData(prev => ({
      ...prev,
      conteudo: prev.conteudo + variavel
    }));
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFiltro === 'todas' || t.categoria === categoriaFiltro;
    const matchesTipo = tipoFiltro === 'todos' || t.tipo_arquivo === tipoFiltro;
    return matchesSearch && matchesCategoria && matchesTipo;
  });

  const getCategoriaLabel = (cat: string) => {
    return CATEGORIAS.find(c => c.value === cat)?.label || cat;
  };

  const handleDownloadModelo = () => {
    // Cria um documento Word modelo com todas as variáveis
    const variaveisTexto = Object.entries(VARIAVEIS_DISPONIVEIS)
      .map(([grupo, vars]) => {
        return `${grupo}:\n${vars.map(v => `  ${v.var} - ${v.desc}`).join('\n')}`;
      })
      .join('\n\n');
    
    const blob = new Blob([
      `VARIÁVEIS DISPONÍVEIS PARA TEMPLATES\n\n${variaveisTexto}\n\nExemplo de uso:\nEu, {{cliente_nome}}, portador do CPF {{cliente_cpf}}, autorizo...`
    ], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variaveis_template.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Arquivo de variáveis baixado!');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Templates de Documentos</h1>
          <p className="text-slate-400 mt-1">
            Crie modelos com variáveis para gerar documentos automaticamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadModelo}
            className="border-slate-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Guia de Variáveis
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIAS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as any)}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
            <SelectValue placeholder="Todos tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos tipos</SelectItem>
            <SelectItem value="texto">Editor de Texto</SelectItem>
            <SelectItem value="docx">Word (.docx)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Templates */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCode className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-400">Nenhum template encontrado</p>
            <Button 
              variant="outline" 
              className="mt-4 border-slate-600"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {template.tipo_arquivo === 'docx' ? (
                        <File className="w-5 h-5 text-blue-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-cyan-400" />
                      )}
                      <CardTitle className="text-lg text-slate-100 truncate">
                        {template.nome}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 text-sm mt-1">
                      {template.descricao || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="border-slate-600 text-xs">
                      {getCategoriaLabel(template.categoria)}
                    </Badge>
                    <Badge 
                      variant={template.tipo_arquivo === 'docx' ? 'default' : 'secondary'}
                      className={template.tipo_arquivo === 'docx' ? 'bg-blue-600' : ''}
                    >
                      {template.tipo_arquivo === 'docx' ? 'Word' : 'Texto'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-500 mb-4">
                  Criado por {template.criado_por_nome || 'Desconhecido'} em{' '}
                  {new Date(template.created_at).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handlePreview(template)}
                    className="text-slate-400 hover:text-slate-100"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  {template.tipo_arquivo !== 'docx' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(template)}
                      className="text-slate-400 hover:text-cyan-400"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(template.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Criar Template */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-slate-800 border-slate-700 text-slate-100 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-500" />
              Novo Template de Documento
            </DialogTitle>
          </DialogHeader>
          
          {/* Seleção de tipo */}
          <div className="mb-4">
            <Label className="mb-2 block">Tipo de Template</Label>
            <RadioGroup 
              value={formData.tipo_arquivo} 
              onValueChange={(v) => setFormData({ ...formData, tipo_arquivo: v as 'texto' | 'docx' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="texto" id="texto" />
                <Label htmlFor="texto" className="cursor-pointer flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Editor de Texto
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx" className="cursor-pointer flex items-center gap-2">
                  <File className="w-4 h-4 text-blue-400" />
                  Upload de Arquivo Word (.docx)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-slate-500 mt-2">
              {formData.tipo_arquivo === 'texto' 
                ? 'Crie o template usando o editor de texto com variáveis.'
                : 'Faça upload de um arquivo Word (.docx) com as variáveis já inseridas.'}
            </p>
          </div>

          {formData.tipo_arquivo === 'texto' ? (
            <TemplateForm 
              formData={formData}
              setFormData={setFormData}
              onInsertVar={inserirVariavel}
              onCancel={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              onSubmit={handleCreate}
              submitLabel="Criar Template"
            />
          ) : (
            <WordUploadForm 
              formData={formData}
              setFormData={setFormData}
              arquivoWord={arquivoWord}
              setArquivoWord={setArquivoWord}
              fileInputRef={fileInputRef}
              onCancel={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              onSubmit={handleCreate}
              uploading={uploading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Template */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-500" />
              Editar Template
            </DialogTitle>
          </DialogHeader>
          <TemplateForm 
            formData={formData}
            setFormData={setFormData}
            onInsertVar={inserirVariavel}
            onCancel={() => {
              setIsEditOpen(false);
              setSelectedTemplate(null);
              resetForm();
            }}
            onSubmit={handleUpdate}
            submitLabel="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.tipo_arquivo === 'docx' ? (
                <File className="w-5 h-5 text-blue-400" />
              ) : (
                <FileText className="w-5 h-5 text-cyan-400" />
              )}
              {selectedTemplate?.nome}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate?.tipo_arquivo === 'docx' ? (
            <div className="space-y-4">
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <File className="w-10 h-10 text-blue-400" />
                  <div>
                    <p className="font-medium text-slate-100">Template Word (.docx)</p>
                    <p className="text-sm text-slate-400">
                      Este é um template Word. O documento será gerado no formato .docx mantendo toda a formatação.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-900 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Variáveis disponíveis neste template:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(VARIAVEIS_DISPONIVEIS).flat().slice(0, 10).map((v) => (
                    <code key={v.var} className="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-400">
                      {v.var}
                    </code>
                  ))}
                  <span className="text-xs text-slate-500">...e mais</span>
                </div>
              </div>
              
              <p className="text-sm text-slate-400">
                Para usar este template, vá até um processo e clique em "Gerar Documento".
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="bg-slate-900 p-6 rounded-lg whitespace-pre-wrap font-mono text-sm text-slate-300">
                {selectedTemplate?.conteudo}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewOpen(false)}
              className="border-slate-600"
            >
              Fechar
            </Button>
            {selectedTemplate?.tipo_arquivo !== 'docx' && (
              <Button 
                onClick={() => {
                  if (selectedTemplate) {
                    navigator.clipboard.writeText(selectedTemplate.conteudo);
                    toast.success('Conteúdo copiado!');
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Texto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente auxiliar do formulário de texto
interface TemplateFormProps {
  formData: {
    nome: string;
    descricao: string;
    conteudo: string;
    categoria: string;
    tipo_arquivo: 'texto' | 'docx';
  };
  setFormData: (data: any) => void;
  onInsertVar: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}

function TemplateForm({ formData, setFormData, onInsertVar, onCancel, onSubmit, submitLabel }: TemplateFormProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <Label htmlFor="nome">Nome do Template *</Label>
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Procuração Ad Judicia"
            className="bg-slate-900 border-slate-700 mt-1"
          />
        </div>
        <div>
          <Label htmlFor="categoria">Categoria</Label>
          <Select 
            value={formData.categoria} 
            onValueChange={(v) => setFormData({ ...formData, categoria: v })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Input
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          placeholder="Breve descrição do template"
          className="bg-slate-900 border-slate-700 mt-1"
        />
      </div>

      <div className="flex gap-4 flex-1 min-h-[400px]">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <Label htmlFor="conteudo" className="mb-1">
            Conteúdo do Documento *
            <span className="text-xs text-slate-500 ml-2">
              Use {'{{variavel}}'} para campos dinâmicos
            </span>
          </Label>
          <Textarea
            id="conteudo"
            value={formData.conteudo}
            onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
            placeholder="Digite o conteúdo do documento aqui...&#10;&#10;Ex:&#10;Eu, {{cliente_nome}}, portador do CPF {{cliente_cpf}},..."
            className="flex-1 bg-slate-900 border-slate-700 font-mono text-sm resize-none"
          />
        </div>

        {/* Painel de Variáveis */}
        <div className="w-64 bg-slate-900 rounded-lg border border-slate-700 flex flex-col max-h-[500px]">
          <div className="p-3 border-b border-slate-700 flex items-center gap-2 shrink-0">
            <HelpCircle className="w-4 h-4 text-cyan-500" />
            <span className="font-medium text-sm">Variáveis Disponíveis</span>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-4">
              {Object.entries(VARIAVEIS_DISPONIVEIS).map(([grupo, vars]) => (
                <div key={grupo}>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    {grupo}
                  </h4>
                  <div className="space-y-1">
                    {vars.map((v) => (
                      <button
                        key={v.var}
                        onClick={() => onInsertVar(v.var)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 transition-colors group"
                        title={v.desc}
                      >
                        <code className="text-xs text-cyan-400 font-mono">{v.var}</code>
                        <p className="text-xs text-slate-500 truncate">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-slate-700 text-xs text-slate-500 shrink-0">
            Clique para inserir no texto
          </div>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} className="border-slate-600">
          Cancelar
        </Button>
        <Button onClick={onSubmit} className="bg-cyan-600 hover:bg-cyan-700">
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Componente de upload de Word
interface WordUploadFormProps {
  formData: {
    nome: string;
    descricao: string;
    categoria: string;
  };
  setFormData: (data: any) => void;
  arquivoWord: File | null;
  setArquivoWord: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCancel: () => void;
  onSubmit: () => void;
  uploading: boolean;
}

function WordUploadForm({ 
  formData, 
  setFormData, 
  arquivoWord, 
  setArquivoWord, 
  fileInputRef,
  onCancel, 
  onSubmit, 
  uploading 
}: WordUploadFormProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <Label htmlFor="nome-word">Nome do Template *</Label>
          <Input
            id="nome-word"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Procuração Ad Judicia"
            className="bg-slate-900 border-slate-700 mt-1"
          />
        </div>
        <div>
          <Label htmlFor="categoria-word">Categoria</Label>
          <Select 
            value={formData.categoria} 
            onValueChange={(v) => setFormData({ ...formData, categoria: v })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="descricao-word">Descrição (opcional)</Label>
        <Input
          id="descricao-word"
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          placeholder="Breve descrição do template"
          className="bg-slate-900 border-slate-700 mt-1"
        />
      </div>

      <div className="flex gap-4 flex-1 min-h-[300px]">
        {/* Upload Area */}
        <div className="flex-1 flex flex-col">
          <Label className="mb-2">Arquivo Word (.docx) *</Label>
          <div 
            className="flex-1 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center p-8 hover:border-slate-500 transition-colors cursor-pointer bg-slate-900/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={(e) => setArquivoWord(e.target.files?.[0] || null)}
              className="hidden"
            />
            
            {arquivoWord ? (
              <div className="text-center">
                <File className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="text-slate-200 font-medium">{arquivoWord.name}</p>
                <p className="text-slate-500 text-sm">
                  {(arquivoWord.size / 1024).toFixed(1)} KB
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-red-400 hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setArquivoWord(null);
                  }}
                >
                  Remover arquivo
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-slate-300 font-medium">Clique para selecionar arquivo</p>
                <p className="text-slate-500 text-sm mt-1">Apenas arquivos .docx</p>
              </>
            )}
          </div>
        </div>

        {/* Painel de Instruções */}
        <div className="w-72 bg-slate-900 rounded-lg border border-slate-700 flex flex-col max-h-[400px]">
          <div className="p-3 border-b border-slate-700 flex items-center gap-2 shrink-0">
            <HelpCircle className="w-4 h-4 text-cyan-500" />
            <span className="font-medium text-sm">Como usar</span>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4 text-sm">
              <div>
                <p className="text-slate-300 font-medium mb-1">1. Crie no Word</p>
                <p className="text-slate-500">
                  Crie seu documento no Microsoft Word com toda a formatação desejada (logos, timbre, rodapé, etc).
                </p>
              </div>
              
              <div>
                <p className="text-slate-300 font-medium mb-1">2. Insira variáveis</p>
                <p className="text-slate-500 mb-2">
                  Use variáveis no formato {'{{nome}}'} onde deseja preencher dados:
                </p>
                <div className="bg-slate-800 p-2 rounded text-xs space-y-1">
                  <code className="text-cyan-400">{'{{cliente_nome}}'}</code>
                  <br />
                  <code className="text-cyan-400">{'{{cliente_cpf}}'}</code>
                  <br />
                  <code className="text-cyan-400">{'{{processo_numero}}'}</code>
                </div>
              </div>
              
              <div>
                <p className="text-slate-300 font-medium mb-1">3. Salve e envie</p>
                <p className="text-slate-500">
                  Salve como .docx e faça o upload aqui. O sistema manterá toda a formatação original.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500">
                  <strong className="text-slate-400">Dica:</strong> Você também pode usar notação de objeto: {'{{ cliente.nome }}'}
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} className="border-slate-600">
          Cancelar
        </Button>
        <Button 
          onClick={onSubmit} 
          className="bg-cyan-600 hover:bg-cyan-700"
          disabled={uploading || !arquivoWord}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Fazer Upload
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
