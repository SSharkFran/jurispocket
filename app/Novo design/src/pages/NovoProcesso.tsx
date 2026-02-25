import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processos, clientes } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Cliente {
  id: number;
  nome: string;
  email?: string;
  phone?: string;
}

const NovoProcesso = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState({
    numero: '',
    numero_cnj: '',
    titulo: '',
    descricao: '',
    cliente_id: '',
    tipo: '',
    valor_causa: '',
    data_abertura: '',
  });

  // Carregar clientes
  useState(() => {
    const loadClientes = async () => {
      try {
        const response = await clientes.list();
        const clientesData = response.data || [];
        setClientes(Array.isArray(clientesData) ? clientesData : []);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };
    loadClientes();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.numero) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      await processos.create({
        numero: formData.numero,
        numero_cnj: formData.numero_cnj || undefined,
        titulo: formData.titulo,
        descricao: formData.descricao || undefined,
        cliente_id: formData.cliente_id ? parseInt(formData.cliente_id) : undefined,
        tipo: formData.tipo || undefined,
        valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : undefined,
        data_abertura: formData.data_abertura || undefined,
      });
      
      toast.success('Processo criado com sucesso!');
      navigate('/app/processos');
    } catch (error) {
      console.error('Erro ao criar processo:', error);
      toast.error('Erro ao criar processo');
    } finally {
      setIsLoading(false);
    }
  };

  const tiposProcesso = [
    'Cível',
    'Trabalhista',
    'Criminal',
    'Tributário',
    'Previdenciário',
    'Consumidor',
    'Família',
    'Empresarial',
    'Imobiliário',
    'Outro'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/processos">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Processo</h1>
          <p className="text-sm text-muted-foreground">Cadastre um novo processo judicial</p>
        </div>
      </div>

      {/* Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Informações do Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero">Número do Processo *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Ex: 0001234-56.2024.8.26.0100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="numero_cnj">Número CNJ</Label>
                <Input
                  id="numero_cnj"
                  value={formData.numero_cnj}
                  onChange={(e) => setFormData({ ...formData, numero_cnj: e.target.value })}
                  placeholder="Ex: 0001234-56.2024.8.26.0100"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="titulo">Título do Processo *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Reclamação Trabalhista - Indenização"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id.toString()}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Processo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposProcesso.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor_causa">Valor da Causa</Label>
                <Input
                  id="valor_causa"
                  type="number"
                  step="0.01"
                  value={formData.valor_causa}
                  onChange={(e) => setFormData({ ...formData, valor_causa: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="data_abertura">Data de Abertura</Label>
                <Input
                  id="data_abertura"
                  type="date"
                  value={formData.data_abertura}
                  onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva os detalhes do processo..."
                rows={4}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Link to="/app/processos">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar Processo
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovoProcesso;
