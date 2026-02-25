import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Zap, Activity, Clock, RefreshCw, Check, AlertCircle, Radio, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { processos } from '@/services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProcessoMonitorado {
  id: number;
  numero: string;
  numero_cnj?: string;
  tribunal: string;
  tribunal_nome?: string;
  status: string;
  ultimaVerificacao?: Date;
  ultimaVerificacaoFormatada: string;
  movimentacoes: number;
  novas: number;
  ultima_movimentacao?: string;
  ultima_movimentacao_data?: string;
}

interface MovimentacaoDatajud {
  id: number;
  processo_id: number;
  codigo_movimento: number;
  nome_movimento: string;
  data_movimento: string;
  complementos?: string;
  fonte?: string;
  lida?: boolean;
  created_at?: string;
}

// Função para extrair tribunal do número CNJ
const extrairTribunal = (numeroCNJ: string): { sigla: string; nome: string } => {
  if (!numeroCNJ) return { sigla: 'N/A', nome: 'Não identificado' };
  
  // Remove todos os caracteres não numéricos
  const numeroLimpo = numeroCNJ.replace(/\D/g, '');
  
  // Se tem pelo menos 20 dígitos (formato CNJ completo)
  if (numeroLimpo.length >= 20) {
    // Extrai o código do tribunal (posições 13-14 no CNJ)
    // Formato CNJ limpo: NNNNNNNNNNNNNNNNNNNN (20 dígitos)
    // Posições: 0-6 (NNNNNNN), 7-8 (DD), 9-12 (AAAA), 13-14 (TR), 15-18 (OOOO)
    const codigoTribunal = numeroLimpo.substring(13, 15);
    
    const tribunais: Record<string, { sigla: string; nome: string }> = {
      '01': { sigla: 'STF', nome: 'Supremo Tribunal Federal' },
      '02': { sigla: 'STJ', nome: 'Superior Tribunal de Justiça' },
      '03': { sigla: 'TST', nome: 'Tribunal Superior do Trabalho' },
      '04': { sigla: 'STM', nome: 'Superior Tribunal Militar' },
      '05': { sigla: 'TSE', nome: 'Tribunal Superior Eleitoral' },
      '06': { sigla: 'TRF1', nome: 'TRF 1ª Região' },
      '07': { sigla: 'TRF2', nome: 'TRF 2ª Região' },
      '08': { sigla: 'TRF3', nome: 'TRF 3ª Região' },
      '09': { sigla: 'TRF4', nome: 'TRF 4ª Região' },
      '10': { sigla: 'TRF5', nome: 'TRF 5ª Região' },
      '11': { sigla: 'TRF6', nome: 'TRF 6ª Região' },
      '12': { sigla: 'TJAC', nome: 'TJ do Acre' },
      '13': { sigla: 'TJAL', nome: 'TJ de Alagoas' },
      '14': { sigla: 'TJAP', nome: 'TJ do Amapá' },
      '15': { sigla: 'TJAM', nome: 'TJ do Amazonas' },
      '16': { sigla: 'TJBA', nome: 'TJ da Bahia' },
      '17': { sigla: 'TJCE', nome: 'TJ do Ceará' },
      '18': { sigla: 'TJDF', nome: 'TJ do Distrito Federal' },
      '19': { sigla: 'TJES', nome: 'TJ do Espírito Santo' },
      '20': { sigla: 'TJGO', nome: 'TJ de Goiás' },
      '21': { sigla: 'TJMA', nome: 'TJ do Maranhão' },
      '22': { sigla: 'TJMG', nome: 'TJ de Minas Gerais' },
      '23': { sigla: 'TJMS', nome: 'TJ do Mato Grosso do Sul' },
      '24': { sigla: 'TJMT', nome: 'TJ do Mato Grosso' },
      '25': { sigla: 'TJPA', nome: 'TJ do Pará' },
      '26': { sigla: 'TJPB', nome: 'TJ da Paraíba' },
      '27': { sigla: 'TJPE', nome: 'TJ de Pernambuco' },
      '28': { sigla: 'TJPI', nome: 'TJ do Piauí' },
      '29': { sigla: 'TJPR', nome: 'TJ do Paraná' },
      '30': { sigla: 'TJRJ', nome: 'TJ do Rio de Janeiro' },
      '31': { sigla: 'TJRN', nome: 'TJ do Rio Grande do Norte' },
      '32': { sigla: 'TJRO', nome: 'TJ de Rondônia' },
      '33': { sigla: 'TJRR', nome: 'TJ de Roraima' },
      '34': { sigla: 'TJRS', nome: 'TJ do Rio Grande do Sul' },
      '35': { sigla: 'TJSC', nome: 'TJ de Santa Catarina' },
      '36': { sigla: 'TJSE', nome: 'TJ de Sergipe' },
      '37': { sigla: 'TJSP', nome: 'TJ de São Paulo' },
      '38': { sigla: 'TJTO', nome: 'TJ do Tocantins' },
      '39': { sigla: 'TREAC', nome: 'TRE do Acre' },
      '40': { sigla: 'TREAL', nome: 'TRE de Alagoas' },
      '41': { sigla: 'TREAP', nome: 'TRE do Amapá' },
      '42': { sigla: 'TREAM', nome: 'TRE do Amazonas' },
      '43': { sigla: 'TREBA', nome: 'TRE da Bahia' },
      '44': { sigla: 'TRECE', nome: 'TRE do Ceará' },
      '45': { sigla: 'TREDF', nome: 'TRE do Distrito Federal' },
      '46': { sigla: 'TREES', nome: 'TRE do Espírito Santo' },
      '47': { sigla: 'TREGO', nome: 'TRE de Goiás' },
      '48': { sigla: 'TREMA', nome: 'TRE do Maranhão' },
      '49': { sigla: 'TREMG', nome: 'TRE de Minas Gerais' },
      '50': { sigla: 'TREMS', nome: 'TRE do Mato Grosso do Sul' },
      '51': { sigla: 'TREMT', nome: 'TRE do Mato Grosso' },
      '52': { sigla: 'TREPA', nome: 'TRE do Pará' },
      '53': { sigla: 'TREPB', nome: 'TRE da Paraíba' },
      '54': { sigla: 'TREPE', nome: 'TRE de Pernambuco' },
      '55': { sigla: 'TREPI', nome: 'TRE do Piauí' },
      '56': { sigla: 'TREPR', nome: 'TRE do Paraná' },
      '57': { sigla: 'TRERJ', nome: 'TRE do Rio de Janeiro' },
      '58': { sigla: 'TRERN', nome: 'TRE do Rio Grande do Norte' },
      '59': { sigla: 'TRERO', nome: 'TRE de Rondônia' },
      '60': { sigla: 'TRERR', nome: 'TRE de Roraima' },
      '61': { sigla: 'TRERS', nome: 'TRE do Rio Grande do Sul' },
      '62': { sigla: 'TRESC', nome: 'TRE de Santa Catarina' },
      '63': { sigla: 'TRESE', nome: 'TRE de Sergipe' },
      '64': { sigla: 'TRETO', nome: 'TRE do Tocantins' },
      '65': { sigla: 'TRT1', nome: 'TRT 1ª Região (RJ)' },
      '66': { sigla: 'TRT2', nome: 'TRT 2ª Região (SP)' },
      '67': { sigla: 'TRT3', nome: 'TRT 3ª Região (MG)' },
      '68': { sigla: 'TRT4', nome: 'TRT 4ª Região (RS)' },
      '69': { sigla: 'TRT5', nome: 'TRT 5ª Região (BA)' },
      '70': { sigla: 'TRT6', nome: 'TRT 6ª Região (PE)' },
      '71': { sigla: 'TRT7', nome: 'TRT 7ª Região (CE)' },
      '72': { sigla: 'TRT8', nome: 'TRT 8ª Região (PA/AP)' },
      '73': { sigla: 'TRT9', nome: 'TRT 9ª Região (PR)' },
      '74': { sigla: 'TRT10', nome: 'TRT 10ª Região (DF/TO)' },
      '75': { sigla: 'TRT11', nome: 'TRT 11ª Região (AM/RR/AC/RO)' },
      '76': { sigla: 'TRT12', nome: 'TRT 12ª Região (SC)' },
      '77': { sigla: 'TRT13', nome: 'TRT 13ª Região (PB)' },
      '78': { sigla: 'TRT14', nome: 'TRT 14ª Região (RO/AC)' },
      '79': { sigla: 'TRT15', nome: 'TRT 15ª Região (SP)' },
      '80': { sigla: 'TRT16', nome: 'TRT 16ª Região (SP)' },
      '81': { sigla: 'TRT17', nome: 'TRT 17ª Região (ES)' },
      '82': { sigla: 'TRT18', nome: 'TRT 18ª Região (GO)' },
      '83': { sigla: 'TRT19', nome: 'TRT 19ª Região (AL)' },
      '84': { sigla: 'TRT20', nome: 'TRT 20ª Região (SE)' },
      '85': { sigla: 'TRT21', nome: 'TRT 21ª Região (RN)' },
      '86': { sigla: 'TRT22', nome: 'TRT 22ª Região (PI)' },
      '87': { sigla: 'TRT23', nome: 'TRT 23ª Região (MT)' },
      '88': { sigla: 'TRT24', nome: 'TRT 24ª Região (MS)' },
      '89': { sigla: 'TRT25', nome: 'TRT 25ª Região (SP)' },
      '90': { sigla: 'TRT26', nome: 'TRT 26ª Região (SP)' },
      '91': { sigla: 'TRT27', nome: 'TRT 27ª Região (SP)' },
    };
    
    const tribunal = tribunais[codigoTribunal];
    if (tribunal) {
      return tribunal;
    }
    
    return { sigla: `TR${codigoTribunal}`, nome: `Tribunal ${codigoTribunal}` };
  }
  
  return { sigla: 'N/A', nome: 'Formato inválido' };
};

const Datajud = () => {
  const navigate = useNavigate();
  const [consultaNumero, setConsultaNumero] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [monitorados, setMonitorados] = useState<ProcessoMonitorado[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoDatajud[]>([]);
  const [stats, setStats] = useState({
    processosMonitorados: 0,
    movimentacoesHoje: 0,
    ultimaVerificacao: '--:--',
    proximaVerificacao: '--:--',
  });

  // Carregar processos monitorados
  const carregarProcessosMonitorados = async () => {
    try {
      setIsLoading(true);
      const response = await processos.list();
      const processosData = response.data.processos || response.data || [];
      
      // Buscar movimentações para cada processo
      const processosComMovimentacoes = await Promise.all(
        processosData.slice(0, 10).map(async (p: any) => {
          try {
            // Buscar detalhes do processo incluindo movimentações
            const detalhesRes = await processos.get(p.id);
            const detalhes = detalhesRes.data;
            
            const tribunal = extrairTribunal(p.numero_cnj || p.numero);
            const movimentacoesDatajud = detalhes.movimentacoes_datajud || [];
            const ultimaMovimentacao = movimentacoesDatajud[0];
            
            return {
              id: p.id,
              numero: p.numero,
              numero_cnj: p.numero_cnj,
              tribunal: tribunal.sigla,
              tribunal_nome: tribunal.nome,
              status: detalhes.monitoramento?.monitorar_datajud ? 'ativo' : 'pausado',
              ultimaVerificacao: detalhes.monitoramento?.ultima_verificacao 
                ? new Date(detalhes.monitoramento.ultima_verificacao) 
                : undefined,
              ultimaVerificacaoFormatada: detalhes.monitoramento?.ultima_verificacao 
                ? new Date(detalhes.monitoramento.ultima_verificacao).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Nunca',
              movimentacoes: detalhes.monitoramento?.total_movimentacoes || movimentacoesDatajud.length || 0,
              novas: detalhes.movimentacoes_novas_count || 0,
              ultima_movimentacao: ultimaMovimentacao?.nome_movimento || p.ultima_movimentacao,
              ultima_movimentacao_data: ultimaMovimentacao?.data_movimento || p.data_ultima_movimentacao,
            };
          } catch (error) {
            // Se falhar ao buscar detalhes, retorna com informações básicas
            const tribunal = extrairTribunal(p.numero_cnj || p.numero);
            return {
              id: p.id,
              numero: p.numero,
              numero_cnj: p.numero_cnj,
              tribunal: tribunal.sigla,
              tribunal_nome: tribunal.nome,
              status: 'ativo',
              ultimaVerificacao: undefined,
              ultimaVerificacaoFormatada: 'Nunca',
              movimentacoes: 0,
              novas: 0,
              ultima_movimentacao: p.ultima_movimentacao,
              ultima_movimentacao_data: p.data_ultima_movimentacao,
            };
          }
        })
      );

      setMonitorados(processosComMovimentacoes);
      
      // Coletar todas as movimentações
      const todasMovimentacoes: MovimentacaoDatajud[] = [];
      processosComMovimentacoes.forEach((p: any) => {
        if (p.movimentacoes_datajud) {
          todasMovimentacoes.push(...p.movimentacoes_datajud);
        }
      });
      
      // Ordenar por data (mais recentes primeiro) e pegar as 10 primeiras
      const movimentacoesRecentes = todasMovimentacoes
        .sort((a: MovimentacaoDatajud, b: MovimentacaoDatajud) => 
          new Date(b.data_movimento).getTime() - new Date(a.data_movimento).getTime()
        )
        .slice(0, 10);
      
      setMovimentacoes(movimentacoesRecentes);
      
      // Atualizar estatísticas
      const totalNovas = processosComMovimentacoes.reduce((sum, p) => sum + p.novas, 0);
      setStats({
        processosMonitorados: processosComMovimentacoes.length,
        movimentacoesHoje: totalNovas,
        ultimaVerificacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        proximaVerificacao: new Date(Date.now() + 3600000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
      
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      toast.error('Erro ao carregar processos monitorados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarProcessosMonitorados();
  }, []);

  // Consultar processo específico
  const handleConsulta = async () => {
    if (!consultaNumero.trim()) {
      toast.error('Digite o número do processo');
      return;
    }

    setIsLoading(true);
    try {
      // Procurar processo pelo número
      const response = await processos.list({ search: consultaNumero });
      const processosData = response.data.processos || response.data || [];
      
      if (processosData.length > 0) {
        const processo = processosData[0];
        // Consultar DataJud para o processo encontrado
        await processos.consultarDatajud(processo.id);
        toast.success('Consulta realizada com sucesso!');
        carregarProcessosMonitorados();
      } else {
        toast.info('Processo não encontrado na base local');
      }
    } catch (error) {
      toast.error('Erro ao consultar processo');
    } finally {
      setIsLoading(false);
      setConsultaNumero('');
    }
  };

  // Executar verificação manual
  const handleExecutarVerificacao = async () => {
    try {
      toast.loading('Verificando processos...');
      await carregarProcessosMonitorados();
      toast.success('Verificação concluída!', {
        description: `${monitorados.length} processos verificados`
      });
    } catch (error) {
      toast.error('Erro na verificação');
    }
  };

  // Marcar movimentação como lida
  const handleMarcarLida = async (processoId: number) => {
    try {
      await processos.marcarMovimentacoesLidas(processoId);
      toast.success('Movimentações marcadas como lidas');
      carregarProcessosMonitorados();
    } catch (error) {
      toast.error('Erro ao marcar como lida');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Globe className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Consulta Nacional Datajud
              <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                <Radio className="h-3 w-3" /> Ao Vivo
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">Monitoramento automático via API oficial do CNJ</p>
          </div>
        </div>

        {/* Consulta rápida */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Digite o número do processo (Ex: 0001234-56.2024.8.26.0100)"
              className="pl-10 bg-secondary border-border"
              value={consultaNumero} 
              onChange={e => setConsultaNumero(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleConsulta()}
            />
          </div>
          <Button 
            onClick={handleConsulta}
            disabled={isLoading}
            className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Consultar
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Processos Monitorados", value: stats.processosMonitorados.toString(), icon: Activity, color: "text-blue-400" },
          { label: "Movimentações Novas", value: stats.movimentacoesHoje.toString(), icon: Zap, color: "text-green-400" },
          { label: "Última Verificação", value: stats.ultimaVerificacao, icon: Clock, color: "text-gray-400" },
          { label: "Próxima Verificação", value: stats.proximaVerificacao, icon: RefreshCw, color: "text-purple-400" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }} className="glass-card p-4"
          >
            <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processos monitorados */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Processos Monitorados</h3>
            <Button 
              onClick={handleExecutarVerificacao}
              variant="ghost" 
              size="sm" 
              className="text-blue-400 text-xs hover:bg-blue-500/10"
              disabled={isLoading}
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {monitorados.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum processo monitorado</p>
              </div>
            ) : (
              monitorados.map((m, i) => (
                <motion.div 
                  key={m.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/app/processos/${m.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono truncate">{m.numero}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/processos/${m.id}`);
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{m.tribunal}</span>
                      {' · '}
                      {m.ultima_movimentacao 
                        ? `Última: ${m.ultima_movimentacao}` 
                        : 'Sem movimentações'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Verificado: {m.ultimaVerificacaoFormatada}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {m.novas > 0 && (
                      <span 
                        className="flex items-center gap-1 text-xs text-blue-400 font-medium cursor-pointer hover:text-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarcarLida(m.id);
                        }}
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> {m.novas} nova(s)
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      m.status === "ativo" 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                        : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                    }`}>
                      {m.status}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Movimentações recentes */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Movimentações Recentes</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {movimentacoes.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma movimentação recente</p>
              </div>
            ) : (
              movimentacoes.map((m, i) => (
                <motion.div 
                  key={m.id || i} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: i * 0.05 }}
                  className={`p-3 rounded-lg transition-colors ${
                    !m.lida ? "bg-blue-500/5 border border-blue-500/10" : "bg-secondary/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {!m.lida && <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shrink-0" />}
                        <span className="truncate">{m.nome_movimento}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {m.data_movimento && new Date(m.data_movimento).toLocaleString('pt-BR')}
                      </div>
                      {m.complementos && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {m.complementos}
                        </div>
                      )}
                    </div>
                    {!m.lida && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => m.processo_id && handleMarcarLida(m.processo_id)}
                      >
                        <Check className="h-4 w-4 text-muted-foreground hover:text-blue-400" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Datajud;
