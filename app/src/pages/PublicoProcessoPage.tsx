import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel, Calendar, User, FileText, Scale, MapPin, Building2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessoPublico {
  numero: string;
  numero_cnj?: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  status: string;
  fase?: string;
  comarca?: string;
  vara?: string;
  cliente_nome?: string;
  tribunal_codigo?: string;
  tribunal_nome?: string;
  tribunal_uf?: string;
  ultimo_movimento?: string;
  data_ultima_movimentacao?: string;
  data_abertura?: string;
}

interface Prazo {
  descricao: string;
  data_final: string;
  status: string;
  prioridade: string;
}

interface Movimentacao {
  nome_movimento: string;
  data_movimento: string;
}

export function PublicoProcessoPage() {
  const { token } = useParams<{ token: string }>();
  const [dados, setDados] = useState<{
    processo: ProcessoPublico;
    prazos: Prazo[];
    movimentacoes: Movimentacao[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarProcesso();
  }, [token]);

  const carregarProcesso = async () => {
    try {
      // Usa URL completa para acessar o backend (sem /api, rota pública)
      const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      const url = `${apiBase}/publico/processo/${token}`;
      console.log('[Publico] Buscando:', url);
      
      const response = await axios.get(url);
      console.log('[Publico] Resposta:', response.data);
      
      // Verifica se a resposta tem a estrutura correta
      if (response.data && response.data.sucesso && response.data.processo) {
        setDados({
          processo: response.data.processo,
          prazos: response.data.prazos || [],
          movimentacoes: response.data.movimentacoes || [],
        });
      } else if (response.data && response.data.error) {
        setError(response.data.mensagem || 'Erro ao carregar processo');
      } else {
        console.error('[Publico] Formato inválido:', response.data);
        setError('Formato de resposta inválido');
      }
    } catch (error: any) {
      console.error('[Publico] Erro:', error);
      console.error('[Publico] Response data:', error.response?.data);
      setError(error.response?.data?.mensagem || 'Processo não encontrado ou link expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'arquivado':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'suspenso':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'alta':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'media':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'baixa':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-2">
          <Clock className="w-5 h-5 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-white/10 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Acesso Negado</h1>
            <p className="text-slate-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dados || !dados.processo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-white/10 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Erro ao Carregar</h1>
            <p className="text-slate-400">Não foi possível carregar as informações do processo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { processo, prazos, movimentacoes } = dados;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Acompanhamento Processual</h1>
          </div>
          <p className="text-slate-400">
            Visualização pública do processo
          </p>
        </div>

        {/* Informações do Processo */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                {processo.titulo}
              </CardTitle>
              <Badge className={getStatusColor(processo.status)}>
                {processo.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Número do Processo
                </p>
                <p className="text-white font-medium">{processo.numero}</p>
                {processo.numero_cnj && (
                  <p className="text-slate-500 text-sm">CNJ: {processo.numero_cnj}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Cliente
                </p>
                <p className="text-white font-medium">{processo.cliente_nome || 'Não informado'}</p>
              </div>
              
              {processo.tribunal_codigo && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    <Gavel className="w-4 h-4" />
                    Tribunal
                  </p>
                  <p className="text-white font-medium">
                    {processo.tribunal_codigo}
                    {processo.tribunal_uf && ` - ${processo.tribunal_uf}`}
                  </p>
                </div>
              )}
              
              {processo.tipo && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">Tipo</p>
                  <p className="text-white font-medium">{processo.tipo}</p>
                </div>
              )}
              
              {processo.comarca && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Comarca
                  </p>
                  <p className="text-white font-medium">{processo.comarca}</p>
                </div>
              )}
              
              {processo.vara && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    Vara
                  </p>
                  <p className="text-white font-medium">{processo.vara}</p>
                </div>
              )}
              
              {processo.fase && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">Fase Processual</p>
                  <p className="text-white font-medium">{processo.fase}</p>
                </div>
              )}
              
              {processo.data_abertura && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Data de Abertura
                  </p>
                  <p className="text-white font-medium">
                    {format(new Date(processo.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
            
            {processo.descricao && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-slate-400 mb-1">Descrição</p>
                <p className="text-white">{processo.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Última Movimentação */}
        {processo.ultimo_movimento && (
          <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Última Movimentação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white font-medium">{processo.ultimo_movimento}</p>
              {processo.data_ultima_movimentacao && (
                <p className="text-slate-400 text-sm mt-1">
                  {format(new Date(processo.data_ultima_movimentacao), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Prazos */}
        {prazos.length > 0 && (
          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                Prazos ({prazos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prazos.map((prazo, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{prazo.descricao}</p>
                        <p className="text-sm text-slate-400">
                          {format(new Date(prazo.data_final), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <Badge className={getPrioridadeColor(prazo.prioridade)}>
                        {prazo.prioridade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movimentações Datajud */}
        {movimentacoes.length > 0 && (
          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-400" />
                Movimentações ({movimentacoes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movimentacoes.map((mov, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-white font-medium">{mov.nome_movimento}</p>
                    <p className="text-sm text-slate-400">
                      {format(new Date(mov.data_movimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm pt-8">
          <p>Este é um acompanhamento processual público.</p>
          <p>As informações são atualizadas periodicamente.</p>
        </div>
      </div>
    </div>
  );
}
