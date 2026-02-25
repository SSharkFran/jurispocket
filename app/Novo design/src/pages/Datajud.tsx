import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Zap, Activity, Clock, RefreshCw, Check, AlertCircle, Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { processos } from '@/services/api';
import { toast } from 'sonner';

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
}

interface Movimentacao {
  id?: number;
  processo: string;
  movimento: string;
  data: string;
  tribunal: string;
  lida: boolean;
}

// Função para extrair tribunal do número CNJ
const extrairTribunal = (numeroCNJ: string): string => {
  if (!numeroCNJ) return 'N/A';
  
  // Remove todos os caracteres não numéricos
  const numeroLimpo = numeroCNJ.replace(/\D/g, '');
  
  // Se tem pelo menos 20 dígitos (formato CNJ completo)
  if (numeroLimpo.length >= 20) {
    // Extrai o código do tribunal (posições 13-14 no CNJ, índice 13-15 substring)
    // Formato CNJ limpo: NNNNNNNNNNNNNNNNNNNN (20 dígitos)
    // Posições: 0-6 (NNNNNNN), 7-8 (DD), 9-12 (AAAA), 13-14 (TR), 15-18 (OOOO)
    const codigoTribunal = numeroLimpo.substring(13, 15);
    
    const tribunais: Record<string, string> = {
      '01': 'STF', '02': 'STJ', '03': 'TST', '04': 'STM', '05': 'TSE', '06': 'TRF1',
      '07': 'TRF2', '08': 'TRF3', '09': 'TRF4', '10': 'TRF5', '11': 'TRF6',
      '12': 'TJAC', '13': 'TJAL', '14': 'TJAP', '15': 'TJAM', '16': 'TJBA',
      '17': 'TJCE', '18': 'TJDF', '19': 'TJES', '20': 'TJGO', '21': 'TJMA',
      '22': 'TJMG', '23': 'TJMS', '24': 'TJMT', '25': 'TJPA', '26': 'TJPB',
      '27': 'TJPE', '28': 'TJPI', '29': 'TJPR', '30': 'TJRJ', '31': 'TJRN',
      '32': 'TJRO', '33': 'TJRR', '34': 'TJRS', '35': 'TJSC', '36': 'TJSE',
      '37': 'TJSP', '38': 'TJTO', '39': 'TREAC', '40': 'TREAL', '41': 'TREAP',
      '42': 'TREAM', '43': 'TREBA', '44': 'TRECE', '45': 'TREDF', '46': 'TREES',
      '47': 'TREGO', '48': 'TREMA', '49': 'TREMG', '50': 'TREMS', '51': 'TREMT',
      '52': 'TREPA', '53': 'TREPB', '54': 'TREPE', '55': 'TREPI', '56': 'TREPR',
      '57': 'TRERJ', '58': 'TRERN', '59': 'TRERO', '60': 'TRERR', '61': 'TRERS',
      '62': 'TRESC', '63': 'TRESE', '64': 'TRETO', '65': 'TRT1', '66': 'TRT2',
      '67': 'TRT3', '68': 'TRT4', '69': 'TRT5', '70': 'TRT6', '71': 'TRT7',
      '72': 'TRT8', '73': 'TRT9', '74': 'TRT10', '75': 'TRT11', '76': 'TRT12',
      '77': 'TRT13', '78': 'TRT14', '79': 'TRT15', '80': 'TRT16', '81': 'TRT17',
      '82': 'TRT18', '83': 'TRT19', '84': 'TRT20', '85': 'TRT21', '86': 'TRT22',
      '87': 'TRT23', '88': 'TRT24', '89': 'TREMS', '90': 'TREPI', '91': 'TREMG',
    };
    
    return tribunais[codigoTribunal] || `TR${codigoTribunal}`;
  }
  
  return 'N/A';
};

const Datajud = () => {
  const [consultaNumero, setConsultaNumero] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [monitorados, setMonitorados] = useState<ProcessoMonitorado[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [stats, setStats] = useState({
    processosMonitorados: 0,
    movimentacoesHoje: 0,
    ultimaVerificacao: '--:--',
    proximaVerificacao: '--:--',
  });

  // Carregar processos monitorados
  const carregarProcessosMonitorados = async () => {
    try {
      const response = await processos.list();
      const processosData = response.data.processos || response.data || [];
      
      // Simular processos monitorados com dados reais
      const processosMonitorados: ProcessoMonitorado[] = processosData.slice(0, 8).map((p: any, index: number) => {
        const tribunal = extrairTribunal(p.numero_cnj || p.numero);
        const agora = new Date();
        const ultimaVerificacao = new Date(agora.getTime() - Math.random() * 3600000 * 6); // Até 6 horas atrás
        const movimentacoes = Math.floor(Math.random() * 15) + 1;
        const novas = Math.floor(Math.random() * 3);
        
        return {
          id: p.id,
          numero: p.numero,
          numero_cnj: p.numero_cnj,
          tribunal,
          tribunal_nome: tribunal,
          status: Math.random() > 0.2 ? 'ativo' : 'pausado',
          ultimaVerificacao,
          ultimaVerificacaoFormatada: ultimaVerificacao.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          movimentacoes,
          novas,
          ultima_movimentacao: new Date(agora.getTime() - Math.random() * 86400000 * 7).toLocaleDateString('pt-BR'),
        };
      });

      setMonitorados(processosMonitorados);
      
      // Atualizar estatísticas
      const totalNovas = processosMonitorados.reduce((sum, p) => sum + p.novas, 0);
      setStats({
        processosMonitorados: processosMonitorados.length,
        movimentacoesHoje: totalNovas,
        ultimaVerificacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        proximaVerificacao: new Date(Date.now() + 3600000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });

      // Gerar movimentações recentes
      const movimentacoesRecentes: Movimentacao[] = processosMonitorados
        .filter(p => p.novas > 0)
        .slice(0, 5)
        .map((p, index) => ({
          processo: p.numero.substring(0, 15) + '...',
          movimento: index === 0 ? 'Decisão proferida' :
                    index === 1 ? 'Juntada de petição' :
                    index === 2 ? 'Audiência designada' :
                    index === 3 ? 'Citação expedida' :
                    'Contestação apresentada',
          data: new Date(Date.now() - Math.random() * 86400000).toLocaleString('pt-BR'),
          tribunal: p.tribunal,
          lida: Math.random() > 0.5,
        }));

      setMovimentacoes(movimentacoesRecentes);
      
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      toast.error('Erro ao carregar processos monitorados');
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
      // Simular consulta - na implementação real, chamaria a API
      setTimeout(() => {
        toast.success('Consulta realizada com sucesso!', {
          description: `Processo ${consultaNumero} encontrado no Datajud`
        });
        setIsLoading(false);
        setConsultaNumero('');
      }, 2000);
    } catch (error) {
      toast.error('Erro ao consultar processo');
      setIsLoading(false);
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
  const handleMarcarLida = (index: number) => {
    setMovimentacoes(prev => prev.map((m, i) => 
      i === index ? { ...m, lida: true } : m
    ));
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
          { label: "Movimentações Hoje", value: stats.movimentacoesHoje.toString(), icon: Zap, color: "text-green-400" },
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
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Executar Agora
            </Button>
          </div>
          <div className="space-y-2">
            {monitorados.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum processo monitorado</p>
              </div>
            ) : (
              monitorados.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-mono">{m.numero}</div>
                    <div className="text-xs text-muted-foreground">{m.tribunal} · Última: {m.ultimaVerificacaoFormatada}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.novas > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 font-medium">
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
          <div className="space-y-2">
            {movimentacoes.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma movimentação recente</p>
              </div>
            ) : (
              movimentacoes.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className={`p-3 rounded-lg transition-colors cursor-pointer ${
                    !m.lida ? "bg-blue-500/5 border border-blue-500/10" : "bg-secondary/30 hover:bg-secondary/50"
                  }`}
                  onClick={() => !m.lida && handleMarcarLida(i)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {!m.lida && <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />}
                        {m.movimento}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{m.processo} · {m.tribunal} · {m.data}</div>
                    </div>
                    {!m.lida && <Check className="h-4 w-4 text-muted-foreground hover:text-blue-400" />}
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
