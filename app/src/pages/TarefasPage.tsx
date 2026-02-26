import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, Check, AlertTriangle, Loader2, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tarefas as tarefasApi, prazos as prazosApi, processos } from '@/services/api';
import { toast } from 'sonner';

interface Tarefa {
  id: number;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  processo_id?: number;
  processo_titulo?: string;
  data_vencimento?: string;
  assigned_to_nome?: string;
}

interface Prazo {
  id: number;
  processo_id: number;
  processo_numero?: string;
  processo_titulo?: string;
  descricao: string;
  tipo: string;
  data_final: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'cumprido' | 'vencido';
}

interface Processo {
  id: number;
  numero: string;
  titulo: string;
}

const statusIcon = (status: string) => {
  if (status === 'concluida' || status === 'cumprido') return <Check className="h-4 w-4 text-success" />;
  if (status === 'em_andamento') return <Clock className="h-4 w-4 text-info" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
};

const prioridadeColors: Record<string, string> = {
  baixa: 'badge-baixa',
  media: 'badge-media',
  alta: 'badge-alta',
  urgente: 'badge-urgente',
};

export function TarefasPage() {
  const [tarefasList, setTarefasList] = useState<Tarefa[]>([]);
  const [prazosList, setPrazosList] = useState<Prazo[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isTarefaDialogOpen, setIsTarefaDialogOpen] = useState(false);
  const [isPrazoDialogOpen, setIsPrazoDialogOpen] = useState(false);

  const [tarefaForm, setTarefaForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    processo_id: '',
    data_vencimento: '',
  });

  const [prazoForm, setPrazoForm] = useState({
    processo_id: '',
    tipo: 'audiencia',
    descricao: '',
    data_final: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    observacoes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tarefasRes, prazosRes, processosRes] = await Promise.all([
        tarefasApi.list(),
        prazosApi.list(),
        processos.list(),
      ]);

      const tarefasData = tarefasRes.data?.tarefas || tarefasRes.data || [];
      const prazosData = prazosRes.data?.prazos || prazosRes.data || [];
      const processosData = processosRes.data?.processos || processosRes.data || [];

      setTarefasList(Array.isArray(tarefasData) ? tarefasData : []);
      setPrazosList(Array.isArray(prazosData) ? prazosData : []);
      setProcessosList(Array.isArray(processosData) ? processosData : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarefaForm.titulo.trim()) {
      toast.error('Informe o título da tarefa');
      return;
    }

    try {
      await tarefasApi.create({
        titulo: tarefaForm.titulo,
        descricao: tarefaForm.descricao || undefined,
        prioridade: tarefaForm.prioridade,
        processo_id: tarefaForm.processo_id ? parseInt(tarefaForm.processo_id, 10) : undefined,
        data_vencimento: tarefaForm.data_vencimento || undefined,
      });
      toast.success('Tarefa criada com sucesso!');
      setIsTarefaDialogOpen(false);
      setTarefaForm({
        titulo: '',
        descricao: '',
        prioridade: 'media',
        processo_id: '',
        data_vencimento: '',
      });
      loadData();
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    }
  };

  const handleCreatePrazo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prazoForm.processo_id || !prazoForm.descricao || !prazoForm.data_final) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await prazosApi.create({
        processo_id: parseInt(prazoForm.processo_id, 10),
        tipo: prazoForm.tipo,
        descricao: prazoForm.descricao,
        data_final: prazoForm.data_final,
        prioridade: prazoForm.prioridade,
      });
      toast.success('Prazo criado com sucesso!');
      setIsPrazoDialogOpen(false);
      setPrazoForm({
        processo_id: '',
        tipo: 'audiencia',
        descricao: '',
        data_final: '',
        prioridade: 'media',
        observacoes: '',
      });
      loadData();
    } catch (error) {
      toast.error('Erro ao criar prazo');
    }
  };

  const handleConcluirTarefa = async (id: number) => {
    try {
      await tarefasApi.update(id, { status: 'concluida' });
      toast.success('Tarefa concluída!');
      loadData();
    } catch (error) {
      toast.error('Erro ao concluir tarefa');
    }
  };

  const handleMarcarCumprido = async (id: number) => {
    try {
      await prazosApi.marcarCumprido(id);
      toast.success('Prazo marcado como cumprido!');
      loadData();
    } catch (error) {
      toast.error('Erro ao marcar prazo');
    }
  };

  const getDiasRestantes = (dataFinal: string) => {
    if (!dataFinal) return 0;
    const hoje = new Date();
    const final = new Date(dataFinal);
    if (isNaN(final.getTime())) return 0;
    return Math.ceil((final.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas & Prazos</h1>
        <div className="flex gap-2">
          <Dialog open={isPrazoDialogOpen} onOpenChange={setIsPrazoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" /> Novo Prazo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Novo Prazo Processual</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePrazo} className="space-y-4">
                <div>
                  <Label htmlFor="processo_prazo">Processo *</Label>
                  <Select
                    value={prazoForm.processo_id}
                    onValueChange={(v) => setPrazoForm({ ...prazoForm, processo_id: v })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione um processo" />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      {processosList.map((processo) => (
                        <SelectItem key={processo.id} value={processo.id.toString()}>
                          {processo.numero} - {processo.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_prazo">Tipo *</Label>
                    <Select value={prazoForm.tipo} onValueChange={(v) => setPrazoForm({ ...prazoForm, tipo: v })}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="audiencia">Audiência</SelectItem>
                        <SelectItem value="pericia">Perícia</SelectItem>
                        <SelectItem value="conciliacao">Conciliação</SelectItem>
                        <SelectItem value="julgamento">Julgamento</SelectItem>
                        <SelectItem value="recurso">Recurso</SelectItem>
                        <SelectItem value="contestacao">Contestação</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="prioridade_prazo">Prioridade</Label>
                    <Select
                      value={prazoForm.prioridade}
                      onValueChange={(v) => setPrazoForm({ ...prazoForm, prioridade: v as any })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="descricao_prazo">Descrição *</Label>
                  <Input
                    id="descricao_prazo"
                    value={prazoForm.descricao}
                    onChange={(e) => setPrazoForm({ ...prazoForm, descricao: e.target.value })}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data_final_prazo">Data Final *</Label>
                  <Input
                    id="data_final_prazo"
                    type="datetime-local"
                    value={prazoForm.data_final}
                    onChange={(e) => setPrazoForm({ ...prazoForm, data_final: e.target.value })}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="obs_prazo">Observações</Label>
                  <Textarea
                    id="obs_prazo"
                    value={prazoForm.observacoes}
                    onChange={(e) => setPrazoForm({ ...prazoForm, observacoes: e.target.value })}
                    className="bg-secondary border-border"
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Criar Prazo
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTarefaDialogOpen} onOpenChange={setIsTarefaDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTarefa} className="space-y-4">
                <div>
                  <Label htmlFor="titulo_tarefa">Título *</Label>
                  <Input
                    id="titulo_tarefa"
                    value={tarefaForm.titulo}
                    onChange={(e) => setTarefaForm({ ...tarefaForm, titulo: e.target.value })}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="descricao_tarefa">Descrição</Label>
                  <Textarea
                    id="descricao_tarefa"
                    value={tarefaForm.descricao}
                    onChange={(e) => setTarefaForm({ ...tarefaForm, descricao: e.target.value })}
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="processo_tarefa">Processo</Label>
                    <Select
                      value={tarefaForm.processo_id}
                      onValueChange={(v) => setTarefaForm({ ...tarefaForm, processo_id: v })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        {processosList.map((processo) => (
                          <SelectItem key={processo.id} value={processo.id.toString()}>
                            {processo.numero}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="prioridade_tarefa">Prioridade</Label>
                    <Select
                      value={tarefaForm.prioridade}
                      onValueChange={(v) => setTarefaForm({ ...tarefaForm, prioridade: v as any })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="venc_tarefa">Data de Vencimento</Label>
                  <Input
                    id="venc_tarefa"
                    type="datetime-local"
                    value={tarefaForm.data_vencimento}
                    onChange={(e) => setTarefaForm({ ...tarefaForm, data_vencimento: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Criar Tarefa
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="tarefas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tarefas">Tarefas ({tarefasList.length})</TabsTrigger>
          <TabsTrigger value="prazos">Prazos ({prazosList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tarefas" className="space-y-3">
          {tarefasList.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa encontrada</div>
          ) : (
            tarefasList.map((tarefa, i) => (
              <motion.div
                key={tarefa.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{statusIcon(tarefa.status)}</div>
                    <div className="min-w-0">
                      <p className={`font-medium ${tarefa.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                        {tarefa.titulo}
                      </p>
                      {tarefa.descricao && <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>}
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2">
                        {tarefa.processo_titulo && (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {tarefa.processo_titulo}
                          </span>
                        )}
                        {tarefa.data_vencimento && (
                          <span>{new Date(tarefa.data_vencimento).toLocaleString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={prioridadeColors[tarefa.prioridade] || 'badge-media'}>{tarefa.prioridade}</span>
                    {tarefa.status !== 'concluida' && (
                      <Button size="sm" variant="outline" onClick={() => handleConcluirTarefa(tarefa.id)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="prazos" className="space-y-3">
          {prazosList.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">Nenhum prazo encontrado</div>
          ) : (
            prazosList.map((prazo, i) => {
              const dias = getDiasRestantes(prazo.data_final);
              return (
                <motion.div
                  key={prazo.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5">{statusIcon(prazo.status)}</div>
                      <div className="min-w-0">
                        <p className="font-medium">{prazo.descricao}</p>
                        <div className="text-sm text-muted-foreground mt-1">
                          {prazo.processo_numero || prazo.processo_titulo || 'Sem processo'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(prazo.data_final).toLocaleString('pt-BR')} · {dias < 0 ? `${Math.abs(dias)} dia(s) em atraso` : `${dias} dia(s) restantes`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={prioridadeColors[prazo.prioridade] || 'badge-media'}>{prazo.prioridade}</span>
                      {prazo.status !== 'cumprido' && (
                        <Button size="sm" variant="outline" onClick={() => handleMarcarCumprido(prazo.id)}>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Cumprir
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
