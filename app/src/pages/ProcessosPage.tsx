import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Eye, Globe, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { processos } from '@/services/api';
import { toast } from 'sonner';

interface Processo {
  id: number;
  numero: string;
  numero_cnj?: string;
  titulo: string;
  cliente_nome?: string;
  tipo?: string;
  status: string;
  fase?: string;
  valor_causa?: number;
  vara?: string;
  comarca?: string;
  ultima_movimentacao?: string;
}

const statusColors: Record<string, string> = {
  ativo: 'badge-ativo',
  pendente: 'badge-pendente',
  encerrado: 'badge-concluido',
  arquivado: 'badge-concluido',
};

export function ProcessosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [listaProcessos, setListaProcessos] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const carregarProcessos = async () => {
    try {
      setIsLoading(true);
      const search = searchParams.get('search') || undefined;
      const response = await processos.list({ search });
      const processosData = response.data.processos || response.data || [];
      setListaProcessos(processosData);
    } catch (error) {
      toast.error('Erro ao carregar processos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarProcessos();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Processos</h1>
          <p className="text-sm text-muted-foreground">{listaProcessos.length} processos cadastrados</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate('/app/processos/novo')}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Processo
        </Button>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por número ou cliente..." 
          className="pl-10 bg-secondary border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listaProcessos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum processo encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="p-4 text-xs font-medium text-muted-foreground">Processo</th>
                  <th className="p-4 text-xs font-medium text-muted-foreground">Cliente</th>
                  <th className="p-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                  <th className="p-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Vara</th>
                  <th className="p-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Valor</th>
                  <th className="p-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaProcessos.map((p, i) => (
                  <motion.tr 
                    key={p.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/processos/${p.id}`)}
                  >
                    <td className="p-4">
                      <div className="font-medium">{p.titulo}</div>
                      <div className="text-xs text-muted-foreground">{p.numero_cnj || p.numero}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.cliente_nome || '-'}</td>
                    <td className="p-4 hidden md:table-cell">
                      {p.tipo && <span className="feature-badge">{p.tipo}</span>}
                    </td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell text-xs">{p.vara || '-'}</td>
                    <td className="p-4 hidden lg:table-cell font-medium">{formatCurrency(p.valor_causa)}</td>
                    <td className="p-4">
                      <span className={statusColors[p.status] || 'badge-pendente'}>{p.status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/app/processos/${p.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => toast.info('Consulta Datajud em desenvolvimento')}
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

