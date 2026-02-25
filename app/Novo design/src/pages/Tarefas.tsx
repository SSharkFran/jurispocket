import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Clock, Check, AlertTriangle, Loader2, Calendar, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tarefas as tarefasApi, prazos as prazosApi, processos, equipe } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Tarefa {
  id: number;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  processo_id?: number;
  processo_titulo?: string;
  data_vencimento?: string;
  atribuido_a?: number;
  atribuido_nome?: string;
  created_at: string;
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
  observacoes?: string;
  created_at: string;
}

interface Processo {
  id: number;
  numero: string;
  titulo: string;
}

interface Membro {
  id: number;
  nome: string;
  email: string;
}

const statusIcon = (s: string) => {
  if (s === "concluida" || s === "cumprido") return <Check className="h-4 w-4 text-success" />;
  if (s === "em_andamento") return <Clock className="h-4 w-4 text-info" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
};

const prioridadeColors: Record<string, string> = {
  baixa: 'badge-baixa',
  media: 'badge-media',
  alta: 'badge-alta',
  urgente: 'badge-urgente',
};

const Tarefas = () => {
  const { workspace } = useAuth();
  const isPlanoEscritorio = workspace?.plano === 'enterprise' || workspace?.plano === 'premium' || workspace?.plano === 'pro';
  
  const [tarefasList, setTarefasList] = useState<Tarefa[]>([]);
  const [prazosList, setPrazosList] = useState<Prazo[]>([]);
  const [processosList, setProcessosList] = useState<Processo[]>([]);
  const [membrosList, setMembrosList] = useState<Membro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [isTarefaDialogOpen, setIsTarefaDialogOpen] = useState(false);
  const [isPrazoDialogOpen, setIsPrazoDialogOpen] = useState(false);
  
  // Form states
  const [tarefaForm, setTarefaForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    processo_id: '',
    data_vencimento: '',
    atribuido_a: '',
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
      const [tarefasRes, prazosRes, processosRes, equipeRes] = await Promise.all([
        tarefasApi.list(),
        prazosApi.list(),
        processos.list(),
        isPlanoEscritorio ? equipe.list() : Promise.resolve({ data: [] }),
      ]);
      
      setTarefasList(tarefasRes.data || []);
      setPrazosList(prazosRes.data || []);
      setProcessosList(processosRes.data.processos || processosRes.data || []);
      setMembrosList(equipeRes.data || []);
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
    if (!tarefaForm.titulo) {
      toast.error('Informe o título da tarefa');
      return;
    }
    
    try {
      await tarefasApi.create({
        titulo: tarefaForm.titulo,
        descricao: tarefaForm.descricao || undefined,
        prioridade: tarefaForm.prioridade,
        processo_id: tarefaForm.processo_id ? parseInt(tarefaForm.processo_id) : undefined,
        data_vencimento: tarefaForm.data_vencimento || undefined,
        atribuido_a: tarefaForm.atribuido_a ? parseInt(tarefaForm.atribuido_a) : undefined,
      });
      toast.success('Tarefa criada com sucesso!');
      setIsTarefaDialogOpen(false);
      resetTarefaForm();
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
        processo_id: parseInt(prazoForm.processo_id),
        tipo: prazoForm.tipo,
        descricao: prazoForm.descricao,
        data_final: prazoForm.data_final,
        prioridade: prazoForm.prioridade,
      });
      toast.success('Prazo criado com sucesso!');
      setIsPrazoDialogOpen(false);
      resetPrazoForm();
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
      toast.error('Erro ao marcar prazo como cumprido');
    }
  };

  const resetTarefaForm = () => {
    setTarefaForm({
      titulo: '',
      descricao: '',
      prioridade: 'media',
      processo_id: '',
      data_vencimento: '',
      atribuido_a: '',
    });
  };

  const resetPrazoForm = () => {
    setPrazoForm({
      processo_id: '',
      tipo: 'audiencia',
      descricao: '',
      data_final: '',
      prioridade: 'media',
      observacoes: '',
    });
  };

  const getDiasRestantes = (dataFinal: string) => {
    if (!dataFinal) return 0;
    const hoje = new Date();
    const final = new Date(dataFinal);
    if (isNaN(final.getTime())) return 0;
    const diffTime = final.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
                      {processosList.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.numero} - {p.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                      value={prazoForm.tipo}
                      onValueChange={(v) => setPrazoForm({ ...prazoForm, tipo: v })}
                    >
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
                    placeholder="Ex: Audiência de Conciliação"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_final">Data Final *</Label>
                  <Input
                    id="data_final"
                    type="datetime-local"
                    value={prazoForm.data_final}
                    onChange={(e) => setPrazoForm({ ...prazoForm, data_final: e.target.value })}
                    className="bg-secondary border-border"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
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
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={tarefaForm.titulo}
                    onChange={(e) => setTarefaForm({ ...tarefaForm, titulo: e.target.value })}
                    className="bg-secondary border-border"
                    placeholder="Ex: Elaborar contestação"
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
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="data_vencimento">Vencimento</Label>
                    <Input
                      id="data_vencimento"
                      type="date"
                      value={tarefaForm.data_vencimento}
                      onChange={(e) => setTarefaForm({ ...tarefaForm, data_vencimento: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="processo_tarefa">Processo</Label>
                    <Select
                      value={tarefaForm.processo_id}
                      onValueChange={(v) => setTarefaForm({ ...tarefaForm, processo_id: v })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        {processosList.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.numero}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isPlanoEscritorio && (
                    <div>
                      <Label htmlFor="atribuido_a">Atribuir para</Label>
                      <Select
                        value={tarefaForm.atribuido_a}
                        onValueChange={(v) => setTarefaForm({ ...tarefaForm, atribuido_a: v })}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-secondary border-border">
                          <SelectItem value="">Eu mesmo</SelectItem>
                          {membrosList.map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
        <TabsList className="bg-card/50 border-white/10">
          <TabsTrigger value="tarefas">
            Tarefas ({tarefasList.filter(t => t.status !== 'concluida').length})
          </TabsTrigger>
          <TabsTrigger value="prazos">
            Prazos ({prazosList.filter(p => p.status !== 'cumprido').length})
          </TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
        </TabsList>

        <TabsContent value="tarefas" className="space-y-4">
          {tarefasList.filter(t => t.status !== 'concluida').length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma tarefa pendente</p>
              <p className="text-sm">Crie uma nova tarefa para começar</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {tarefasList
                .filter(t => t.status !== 'concluida')
                .map((tarefa, i) => (
                  <motion.div 
                    key={tarefa.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <button 
                      onClick={() => handleConcluirTarefa(tarefa.id)}
                      className="p-2 rounded-full hover:bg-green-500/20 transition-colors"
                    >
                      {statusIcon(tarefa.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{tarefa.titulo}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        {tarefa.processo_titulo && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {tarefa.processo_titulo}
                          </span>
                        )}
                        {tarefa.atribuido_nome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {tarefa.atribuido_nome}
                          </span>
                        )}
                        {tarefa.data_vencimento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={prioridadeColors[tarefa.prioridade]}>{tarefa.prioridade}</span>
                  </motion.div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prazos" className="space-y-4">
          {prazosList.filter(p => p.status !== 'cumprido').length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum prazo pendente</p>
              <p className="text-sm">Crie um novo prazo para começar</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {prazosList
                .filter(p => p.status !== 'cumprido')
                .sort((a, b) => new Date(a.data_final).getTime() - new Date(b.data_final).getTime())
                .map((prazo, i) => {
                  const diasRestantes = getDiasRestantes(prazo.data_final);
                  return (
                    <motion.div 
                      key={prazo.id} 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleMarcarCumprido(prazo.id)}
                          className="p-2 rounded-full hover:bg-green-500/20 transition-colors"
                        >
                          {statusIcon(prazo.status)}
                        </button>
                        <div>
                          <div className="text-sm font-medium">{prazo.descricao}</div>
                          <div className="text-xs text-muted-foreground">
                            {prazo.processo_numero || prazo.processo_titulo}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{new Date(prazo.data_final).toLocaleDateString('pt-BR')}</div>
                        <div className={`text-xs ${
                          diasRestantes < 0 ? 'text-red-400' :
                          diasRestantes <= 3 ? 'text-orange-400' :
                          'text-muted-foreground'
                        }`}>
                          {diasRestantes < 0 
                            ? `${Math.abs(diasRestantes)} dias atrás` 
                            : diasRestantes === 0 
                              ? 'Hoje'
                              : `${diasRestantes} dias restantes`
                          }
                        </div>
                        <span className={`${prioridadeColors[prazo.prioridade]} text-xs`}>{prazo.prioridade}</span>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluidos" className="space-y-4">
          <div className="grid gap-3">
            {[...tarefasList.filter(t => t.status === 'concluida'), ...prazosList.filter(p => p.status === 'cumprido')]
              .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
              .map((item: any, i) => (
                <motion.div 
                  key={`${item.titulo ? 't' : 'p'}-${item.id}`} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30 opacity-60"
                >
                  <Check className="h-4 w-4 text-success" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-through">{item.titulo || item.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.titulo ? 'Tarefa' : 'Prazo'} • {item.processo_titulo || item.processo_numero || 'Sem processo'}
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tarefas;
