import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientes, processos } from '@/services/api';
import type { Cliente, Processo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Edit3, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Briefcase,
  User,
  Plus,
  Trash2,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { DocumentosList } from '@/components/DocumentosList';

export function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Cliente>>({});

  const fetchData = async () => {
    if (!id) return;
    try {
      const [clienteRes, processosRes] = await Promise.all([
        clientes.get(parseInt(id)),
        processos.list({ cliente_id: parseInt(id) })
      ]);
      setCliente(clienteRes.data);
      setFormData(clienteRes.data);
      setProcessosList(processosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados do cliente');
      navigate('/app/clientes');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    loadData();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await clientes.update(parseInt(id), formData);
      toast.success('Cliente atualizado com sucesso!');
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar cliente');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) return;
    try {
      await clientes.delete(parseInt(id));
      toast.success('Cliente excluído com sucesso!');
      navigate('/app/clientes');
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button onClick={() => navigate('/app/clientes')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/app/clientes')}
            className="border-border text-muted-foreground hover:text-white hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{cliente.nome}</h1>
            <p className="text-muted-foreground mt-1">
              {cliente.cpf_cnpj && `CPF/CNPJ: ${cliente.cpf_cnpj}`}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-border text-foreground hover:text-white hover:bg-secondary sm:w-auto">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome || ''}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="bg-secondary border-border text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone || ''}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                    <Input
                      id="cpf_cnpj"
                      value={formData.cpf_cnpj || ''}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rg_ie">RG/IE</Label>
                    <Input
                      id="rg_ie"
                      value={formData.rg_ie || ''}
                      onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Input
                      id="estado_civil"
                      value={formData.estado_civil || ''}
                      onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input
                      id="profissao"
                      value={formData.profissao || ''}
                      onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nacionalidade">Nacionalidade</Label>
                    <Input
                      id="nacionalidade"
                      value={formData.nacionalidade || ''}
                      onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                      placeholder="Brasileiro(a)"
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço (Rua/Avenida)</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco || ''}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        value={formData.numero || ''}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="bg-secondary border-border text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={formData.complemento || ''}
                        onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        placeholder="Apto, Sala, etc"
                        className="bg-secondary border-border text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro || ''}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade || ''}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="bg-secondary border-border text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={formData.estado || ''}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="bg-secondary border-border text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={formData.cep || ''}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                        className="bg-secondary border-border text-white"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes || ''}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="bg-secondary border-border text-white"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 sm:flex-1">
                    Salvar Alterações
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            onClick={handleDelete}
            className="w-full border-red-700 text-red-400 hover:text-red-300 hover:bg-red-500/10 sm:w-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto bg-card/50 border border-border">
          <TabsTrigger value="info" className="flex-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="processos" className="flex-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <Briefcase className="w-4 h-4 mr-2" />
            Processos ({processosList.length})
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <FolderOpen className="w-4 h-4 mr-2" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cliente.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{cliente.email}</span>
                  </div>
                )}
                {cliente.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{cliente.phone}</span>
                  </div>
                )}
                {!cliente.email && !cliente.phone && (
                  <p className="text-muted-foreground">Nenhum contato cadastrado</p>
                )}
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cliente.endereco ? (
                  <div className="space-y-1">
                    <p className="text-foreground">
                      {cliente.endereco}
                      {cliente.numero && `, ${cliente.numero}`}
                      {cliente.complemento && ` - ${cliente.complemento}`}
                    </p>
                    {cliente.bairro && (
                      <p className="text-muted-foreground">{cliente.bairro}</p>
                    )}
                    <p className="text-muted-foreground">
                      {cliente.cidade && `${cliente.cidade}, `}
                      {cliente.estado && `${cliente.estado} `}
                      {cliente.cep && `- CEP: ${cliente.cep}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum endereço cadastrado</p>
                )}
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cliente.cpf_cnpj && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">CPF/CNPJ:</span>
                    <span className="text-foreground">{cliente.cpf_cnpj}</span>
                  </div>
                )}
                {cliente.rg_ie && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">RG/IE:</span>
                    <span className="text-foreground">{cliente.rg_ie}</span>
                  </div>
                )}
                {cliente.data_nascimento && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Nascimento:</span>
                    <span className="text-foreground">
                      {new Date(cliente.data_nascimento).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {cliente.nacionalidade && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Nacionalidade:</span>
                    <span className="text-foreground">{cliente.nacionalidade}</span>
                  </div>
                )}
                {cliente.estado_civil && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Estado Civil:</span>
                    <span className="text-foreground capitalize">{cliente.estado_civil}</span>
                  </div>
                )}
                {cliente.profissao && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Profissão:</span>
                    <span className="text-foreground">{cliente.profissao}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Observations */}
            {cliente.observacoes && (
              <Card className="bg-card/50 border-border md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{cliente.observacoes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processos" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">Processos do Cliente</h2>
            <Button 
              onClick={() => navigate('/app/processos', { state: { cliente_id: cliente.id } })}
              className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Processo
            </Button>
          </div>

          {processosList.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum processo cadastrado para este cliente</p>
                <Button 
                  onClick={() => navigate('/app/processos', { state: { cliente_id: cliente.id } })}
                  className="mt-4 bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Processo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processosList.map((processo) => (
                <Card 
                  key={processo.id} 
                  className="bg-card/50 border-border hover:border-border transition-colors cursor-pointer"
                  onClick={() => navigate(`/app/processos/${processo.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white">{processo.titulo}</h3>
                        <p className="text-sm text-muted-foreground">{processo.numero}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`text-xs ${
                            processo.status === 'ativo' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-secondary text-foreground border-border'
                          }`}>
                            {processo.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {processo.fase}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="space-y-6">
          <Card className="bg-card/50 border-border">
            <CardContent className="pt-6">
              <DocumentosList clienteId={cliente.id} titulo="Documentos do Cliente" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
