import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Scale, 
  Clock, 
  Calendar, 
  FileText, 
  User, 
  Gavel,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Movimentacao {
  id: number;
  nome_movimento: string;
  data_movimento: string;
  complementos?: string;
}

interface ProcessoPublicoData {
  id: number;
  numero: string;
  numero_cnj?: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  status: string;
  fase?: string;
  valor_causa?: number;
  data_abertura?: string;
  vara?: string;
  comarca?: string;
  tribunal?: string;
  cliente_nome?: string;
  advogado_nome?: string;
  escritorio_nome?: string;
  ultima_movimentacao?: string;
  movimentacoes?: Movimentacao[];
  link_valido: boolean;
}

const ProcessoPublico = () => {
  const { token } = useParams<{ token: string }>();
  const [processo, setProcesso] = useState<ProcessoPublicoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarProcesso();
  }, [token]);

  const carregarProcesso = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/processos/publico/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Link não encontrado ou expirado');
        } else {
          setError('Erro ao carregar processo');
        }
        return;
      }

      const data = await response.json();
      setProcesso(data);
    } catch (error) {
      setError('Erro ao carregar processo');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'arquivado':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'suspenso':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando processo...</p>
        </div>
      </div>
    );
  }

  if (error || !processo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'Este link não está mais disponível ou foi desativado.'}
          </p>
          <Link to="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Ir para o JurisPocket
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold">JurisPocket</span>
          </Link>
          <div className="text-sm text-muted-foreground">
            Acompanhamento Processual
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Escritório */}
          {processo.escritorio_nome && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Processo vinculado ao escritório</p>
              <h2 className="text-lg font-semibold">{processo.escritorio_nome}</h2>
              {processo.advogado_nome && (
                <p className="text-sm text-muted-foreground">Advogado: {processo.advogado_nome}</p>
              )}
            </div>
          )}

          {/* Processo Header */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(processo.status)}>
                      {processo.status}
                    </Badge>
                    {processo.tipo && (
                      <Badge variant="outline" className="bg-secondary">
                        {processo.tipo}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold">{processo.titulo}</h1>
                  <p className="text-muted-foreground font-mono mt-1">
                    {processo.numero_cnj || processo.numero}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  {processo.valor_causa && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valor da Causa</p>
                      <p className="text-xl font-semibold text-green-400">
                        {formatCurrency(processo.valor_causa)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{processo.cliente_nome || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Gavel className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tribunal/Vara</p>
                    <p className="font-medium">{processo.tribunal || processo.vara || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Calendar className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Abertura</p>
                    <p className="font-medium">{formatDate(processo.data_abertura)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Clock className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fase Processual</p>
                    <p className="font-medium">{processo.fase || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card sm:col-span-2 lg:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="text-sm mt-1">{processo.descricao || 'Sem descrição disponível'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Movimentações */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Movimentações Processuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processo.movimentacoes && processo.movimentacoes.length > 0 ? (
                <div className="space-y-4">
                  {processo.movimentacoes.map((mov, index) => (
                    <motion.div
                      key={mov.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4 pb-4 border-b border-border/30 last:border-0"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {index < processo.movimentacoes!.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="font-medium">{mov.nome_movimento}</h4>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(mov.data_movimento)}
                          </span>
                        </div>
                        {mov.complementos && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {mov.complementos}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">
              Este é um link público de acompanhamento processual.
            </p>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Conheça o JurisPocket
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ProcessoPublico;
