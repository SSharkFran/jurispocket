import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tarefas as tarefasApi, prazos as prazosApi } from '@/services/api';
import { toast } from 'sonner';

interface Tarefa {
  id: number;
  titulo: string;
  processo_titulo?: string;
  prioridade: string;
  status: string;
  data_vencimento?: string;
  atribuido_nome?: string;
}

interface Prazo {
  id: number;
  descricao: string;
  processo_numero?: string;
  data_final: string;
  prioridade: string;
  status: string;
}

const statusIcon = (s: string) => {
  if (s === 'concluida' || s === 'cumprido') return <Check className="h-4 w-4 text-success" />;
  if (s === 'em_andamento') return <Clock className="h-4 w-4 text-info" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
};

const TarefasPage = () => {
  const [listaTarefas, setListaTarefas] = useState<Tarefa[]>([]);
  const [listaPrazos, setListaPrazos] = useState<Prazo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [tarefasRes, prazosRes] = await Promise.all([
        tarefasApi.list(),
        prazosApi.list(),
      ]);
      setListaTarefas(tarefasRes.data.tarefas || tarefasRes.data || []);
      setListaPrazos(prazosRes.data.prazos || prazosRes.data || []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tarefas & Prazos</h1>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => toast.info('Criar nova tarefa em desenvolvimento')}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tarefas */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4 text-sm">Tarefas ({listaTarefas.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {listaTarefas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa encontrada</p>
              ) : (
                listaTarefas.map((t, i) => (
                  <motion.div 
                    key={t.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    {statusIcon(t.status)}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${t.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                        {t.titulo}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.processo_titulo || 'Sem processo'} · {t.atribuido_nome || 'Não atribuído'} · {formatDate(t.data_vencimento)}
                      </div>
                    </div>
                    <span className={`badge-${t.prioridade}`}>{t.prioridade}</span>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Prazos */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4 text-sm">Prazos Processuais ({listaPrazos.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {listaPrazos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum prazo encontrado</p>
              ) : (
                listaPrazos.map((p, i) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon(p.status)}
                      <div>
                        <div className="text-sm font-medium">{p.descricao}</div>
                        <div className="text-xs text-muted-foreground">{p.processo_numero || 'Sem processo'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatDate(p.data_final)}</div>
                      <span className={`badge-${p.prioridade}`}>{p.prioridade}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TarefasPage;
