import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, Download, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { documentos as documentosApi } from '@/services/api';
import { toast } from 'sonner';

interface Documento {
  id: number;
  nome: string;
  tipo?: string;
  processo_numero?: string;
  cliente_nome?: string;
  tamanho?: string;
  created_at?: string;
}

const templates = [
  { id: 1, nome: 'Procuração Ad Judicia', categoria: 'Geral', usos: 45 },
  { id: 2, nome: 'Petição Inicial Trabalhista', categoria: 'Trabalhista', usos: 32 },
  { id: 3, nome: 'Contrato de Honorários', categoria: 'Contratos', usos: 28 },
  { id: 4, nome: 'Recurso Ordinário', categoria: 'Recursos', usos: 15 },
];

export function DocumentosPage() {
  const [listaDocumentos, setListaDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const carregarDocumentos = async () => {
    try {
      setIsLoading(true);
      const response = await documentosApi.list();
      setListaDocumentos(response.data.documentos || response.data || []);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, []);

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const filteredDocumentos = listaDocumentos.filter(d => 
    d.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cliente_nome?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Documentos & Templates</h1>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => toast.info('Upload de documento em desenvolvimento')}
        >
          <Plus className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar documentos..." 
          className="pl-10 bg-secondary border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Documentos Recentes</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDocumentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento encontrado</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredDocumentos.map((d, i) => (
                <motion.div 
                  key={d.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{d.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.cliente_nome || 'Sem cliente'} · {d.tamanho || '-'} · {formatDate(d.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => toast.info('Visualizar em desenvolvimento')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => toast.info('Download em desenvolvimento')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => toast.info('Excluir em desenvolvimento')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Templates</h3>
          <div className="space-y-2">
            {templates.map(t => (
              <div 
                key={t.id} 
                className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => toast.info(`Usar template: ${t.nome}`)}
              >
                <div className="text-sm font-medium">{t.nome}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{t.categoria}</span>
                  <span className="text-xs text-muted-foreground">{t.usos} usos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

