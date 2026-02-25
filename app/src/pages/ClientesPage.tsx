import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientes } from '@/services/api';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Phone, Mail, MapPin, User, MoreHorizontal, Loader2, FileText, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface Cliente {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  phone?: string;
  cpf_cnpj?: string;
  rg_ie?: string;
  data_nascimento?: string;
  nacionalidade?: string;
  estado_civil?: string;
  profissao?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  processos_count?: number;
}

export function ClientesPage() {
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    rg_ie: '',
    data_nascimento: '',
    nacionalidade: 'Brasileiro(a)',
    estado_civil: '',
    profissao: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: '',
  });

  const loadClientes = async () => {
    try {
      const response = await clientes.list(search);
      setClientesList(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);

    try {
      await clientes.create(formData);
      toast.success('Cliente criado com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cpf_cnpj: '',
        rg_ie: '',
        data_nascimento: '',
        nacionalidade: 'Brasileiro(a)',
        estado_civil: '',
        profissao: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        observacoes: '',
      });
      loadClientes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const formatCPFCNPJ = (doc?: string) => {
    if (!doc) return '';
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05, duration: 0.4 },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientesList.length} clientes cadastrados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>
                  Nome Completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                  required
                  className="bg-secondary border-border"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder="000.000.000-00"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RG/IE</Label>
                  <Input
                    value={formData.rg_ie}
                    onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                    placeholder="00.000.000-0"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nacionalidade</Label>
                  <Input
                    value={formData.nacionalidade}
                    onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                    placeholder="Brasileiro(a)"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado Civil</Label>
                  <Input
                    value={formData.estado_civil}
                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                    placeholder="Solteiro(a), Casado(a)..."
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <Input
                    value={formData.profissao}
                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                    placeholder="Ex: Advogado, Engenheiro..."
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Endereço</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua/Avenida"
                  className="bg-secondary border-border"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Número"
                    className="bg-secondary border-border"
                  />
                  <Input
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Complemento"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Bairro"
                    className="bg-secondary border-border"
                  />
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                    className="bg-secondary border-border"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      maxLength={2}
                      className="bg-secondary border-border"
                    />
                    <Input
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="CEP"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                  rows={3}
                  className="bg-secondary border-border resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.nome.trim()}
                className="w-full bg-primary text-primary-foreground"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary border-border"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientesList.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          ) : (
            clientesList.map((c, i) => (
              <Link key={c.id} to={`/clientes/${c.id}`}>
                <motion.div {...fade(i)} className="glass-card-hover p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {getInitials(c.nome)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{c.nome}</h3>
                        <span className="text-xs text-muted-foreground">{formatCPFCNPJ(c.cpf_cnpj)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {(c.telefone || c.phone) && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {formatPhone(c.telefone || c.phone)}
                      </div>
                    )}
                    {c.cidade && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {c.cidade}
                        {c.estado && `, ${c.estado}`}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{c.processos_count || 0} processo(s)</span>
                    {c.processos_count ? (
                      <Badge className="text-[10px] bg-primary/20 text-primary">{c.processos_count}</Badge>
                    ) : null}
                  </div>
                </motion.div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Dados Principais */}
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                  required
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>

              {/* Documentos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CPF/CNPJ
                  </Label>
                  <Input
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder="000.000.000-00"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">RG</Label>
                  <Input
                    value={formData.rg_ie}
                    onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                    placeholder="00.000.000-0"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>

              {/* Dados Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nacionalidade</Label>
                  <Input
                    value={formData.nacionalidade}
                    onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                    placeholder="Brasileiro(a)"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Estado Civil</Label>
                  <Input
                    value={formData.estado_civil}
                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                    placeholder="Solteiro(a), Casado(a)..."
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Profissão
                  </Label>
                  <Input
                    value={formData.profissao}
                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                    placeholder="Ex: Advogado, Engenheiro..."
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-3">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua/Avenida"
                    className="bg-secondary border-border text-foreground"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Número"
                      className="bg-secondary border-border text-foreground"
                    />
                    <Input
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                      placeholder="Complemento"
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Bairro"
                    className="bg-secondary border-border text-foreground"
                  />
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                    className="bg-secondary border-border text-foreground"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                      className="bg-secondary border-border text-foreground uppercase"
                    />
                    <Input
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="CEP"
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre o cliente..."
                  rows={3}
                  className="bg-secondary border-border text-foreground resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.nome.trim()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes por nome, email, telefone ou CPF/CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesList.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          )}
          {clientesList.map((cliente) => (
            <Link key={cliente.id} to={`/clientes/${cliente.id}`}>
              <Card className="glass-card-hover hover:border-primary/30 transition-all group h-full">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    {cliente.processos_count ? (
                      <Badge className="bg-primary/10 text-primary border-primary/30">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {cliente.processos_count} processo(s)
                      </Badge>
                    ) : null}
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors ml-auto" />
                  </div>

                  {/* Nome */}
                  <h3 className="text-lg font-semibold text-foreground mb-3">{cliente.nome}</h3>

                  {/* Informações */}
                  <div className="space-y-2">
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                    {(cliente.telefone || cliente.phone) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>{formatPhone(cliente.telefone || cliente.phone)}</span>
                      </div>
                    )}
                    {cliente.cpf_cnpj && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>{formatCPFCNPJ(cliente.cpf_cnpj)}</span>
                      </div>
                    )}
                    {cliente.endereco && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{cliente.endereco}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
