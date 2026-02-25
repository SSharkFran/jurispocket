import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileCode, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Download, 
  Loader2,
  FileText,
  MoreHorizontal,
  Copy,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { templates, processos } from "@/services/api";
import { toast } from "sonner";

interface Template {
  id: number;
  nome: string;
  descricao?: string;
  conteudo: string;
  tipo_arquivo: 'texto' | 'docx';
  variaveis?: string[];
  created_at: string;
}

interface Processo {
  id: number;
  numero: string;
  titulo: string;
}

const TemplatesPage = () => {
  const [templatesList, setTemplatesList] = useState<Template[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  
  const [templateSelecionado, setTemplateSelecionado] = useState<Template | null>(null);
  const [processoSelecionado, setProcessoSelecionado] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    tipo_arquivo: 'texto' as 'texto' | 'docx',
    variaveis: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [templatesRes, processosRes] = await Promise.all([
        templates.list(),
        processos.list(),
      ]);
      
      setTemplatesList(templatesRes.data || []);
      setProcessosList(processosRes.data.processos || processosRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.conteudo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      await templates.create({
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        conteudo: formData.conteudo,
        tipo_arquivo: formData.tipo_arquivo,
        variaveis: formData.variaveis ? formData.variaveis.split(',').map(v => v.trim()) : undefined,
      });
      
      toast.success('Template criado com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao criar template');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateSelecionado) return;
    
    try {
      await templates.update(templateSelecionado.id, {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        conteudo: formData.conteudo,
        tipo_arquivo: formData.tipo_arquivo,
        variaveis: formData.variaveis ? formData.variaveis.split(',').map(v => v.trim()) : undefined,
      });
      
      toast.success('Template atualizado com sucesso!');
      setIsEditDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      await templates.delete(id);
      toast.success('Template excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir template');
    }
  };

  const handleGenerate = async () => {
    if (!templateSelecionado || !processoSelecionado) {
      toast.error('Selecione um processo');
      return;
    }

    try {
      const response = await templates.gerar(templateSelecionado.id, {
        processo_id: parseInt(processoSelecionado),
        formato: 'download',
      });
      
      // Download do arquivo
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateSelecionado.nome}.${templateSelecionado.tipo_arquivo === 'docx' ? 'docx' : 'txt'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Documento gerado com sucesso!');
      setIsGenerateDialogOpen(false);
      setProcessoSelecionado('');
    } catch (error) {
      toast.error('Erro ao gerar documento');
    }
  };

  const openEditDialog = (template: Template) => {
    setTemplateSelecionado(template);
    setFormData({
      nome: template.nome,
      descricao: template.descricao || '',
      conteudo: template.conteudo,
      tipo_arquivo: template.tipo_arquivo,
      variaveis: template.variaveis?.join(', ') || '',
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (template: Template) => {
    setTemplateSelecionado(template);
    setIsViewDialogOpen(true);
  };

  const openGenerateDialog = (template: Template) => {
    setTemplateSelecionado(template);
    setProcessoSelecionado('');
    setIsGenerateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
      tipo_arquivo: 'texto',
      variaveis: '',
    });
    setTemplateSelecionado(null);
  };

  const filteredTemplates = templatesList.filter(template =>
    template.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.descricao && template.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            {templatesList.length} template{templatesList.length !== 1 ? 's' : ''} cadastrado{templatesList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar templates..." 
          className="pl-10 bg-secondary border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Nenhum template encontrado' : 'Nenhum template cadastrado'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Tente outro termo de busca' : 'Crie seu primeiro template para começar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass-card h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileCode className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openViewDialog(template)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditDialog(template)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(template.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{template.nome}</CardTitle>
                  {template.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.descricao}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 flex-1">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="bg-secondary">
                      {template.tipo_arquivo === 'docx' ? 'Word' : 'Texto'}
                    </Badge>
                    {template.variaveis && template.variaveis.length > 0 && (
                      <Badge variant="outline" className="bg-secondary">
                        {template.variaveis.length} variável{template.variaveis.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => openGenerateDialog(template)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Gerar Documento
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Petição Inicial"
                required
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do template"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_arquivo">Tipo de Arquivo</Label>
                <Select
                  value={formData.tipo_arquivo}
                  onValueChange={(v: 'texto' | 'docx') => setFormData({ ...formData, tipo_arquivo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto (.txt)</SelectItem>
                    <SelectItem value="docx">Word (.docx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="variaveis">Variáveis (separadas por vírgula)</Label>
                <Input
                  id="variaveis"
                  value={formData.variaveis}
                  onChange={(e) => setFormData({ ...formData, variaveis: e.target.value })}
                  placeholder="{{nome}}, {{cpf}}, etc"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="conteudo">Conteúdo *</Label>
              <Textarea
                id="conteudo"
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Conteúdo do template. Use {{variavel}} para campos dinâmicos."
                rows={10}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_nome">Nome *</Label>
              <Input
                id="edit_nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Petição Inicial"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Input
                id="edit_descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do template"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_tipo_arquivo">Tipo de Arquivo</Label>
                <Select
                  value={formData.tipo_arquivo}
                  onValueChange={(v: 'texto' | 'docx') => setFormData({ ...formData, tipo_arquivo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto (.txt)</SelectItem>
                    <SelectItem value="docx">Word (.docx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_variaveis">Variáveis (separadas por vírgula)</Label>
                <Input
                  id="edit_variaveis"
                  value={formData.variaveis}
                  onChange={(e) => setFormData({ ...formData, variaveis: e.target.value })}
                  placeholder="{{nome}}, {{cpf}}, etc"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_conteudo">Conteúdo *</Label>
              <Textarea
                id="edit_conteudo"
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Conteúdo do template. Use {{variavel}} para campos dinâmicos."
                rows={10}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>{templateSelecionado?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {templateSelecionado?.descricao && (
              <p className="text-sm text-muted-foreground">{templateSelecionado.descricao}</p>
            )}
            <div className="flex gap-2">
              <Badge variant="outline">
                {templateSelecionado?.tipo_arquivo === 'docx' ? 'Word' : 'Texto'}
              </Badge>
              {templateSelecionado?.variaveis && templateSelecionado.variaveis.length > 0 && (
                <Badge variant="outline">
                  {templateSelecionado.variaveis.length} variável{templateSelecionado.variaveis.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="bg-secondary p-4 rounded-lg max-h-[400px] overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {templateSelecionado?.conteudo}
              </pre>
            </div>
            {templateSelecionado?.variaveis && templateSelecionado.variaveis.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {templateSelecionado.variaveis.map((v) => (
                    <Badge key={v} variant="secondary" className="font-mono">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Gerar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o processo para gerar o documento "{templateSelecionado?.nome}":
            </p>
            <div>
              <Label htmlFor="processo">Processo *</Label>
              <Select
                value={processoSelecionado}
                onValueChange={setProcessoSelecionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um processo" />
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
            {templateSelecionado?.variaveis && templateSelecionado.variaveis.length > 0 && (
              <div className="bg-secondary/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Variáveis que serão substituídas:</p>
                <div className="flex flex-wrap gap-1">
                  {templateSelecionado.variaveis.map((v) => (
                    <code key={v} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={!processoSelecionado}>
                <Download className="mr-2 h-4 w-4" /> Gerar e Baixar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
