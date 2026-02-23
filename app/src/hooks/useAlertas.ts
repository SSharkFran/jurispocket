/**
 * ============================================================================
 * HOOK: useAlertas - Gerenciamento de Alertas/Notificações
 * ============================================================================
 * 
 * Este hook gerencia o sistema de alertas e notificações do JurisPocket.
 * 
 * FUNCIONALIDADES:
 * ✓ Carregar alertas não lidos
 * ✓ Marcar alertas como lidos
 * ✓ Exibir estatísticas de alertas
 * ✓ Polling automático a cada 30 segundos
 * ✓ Suporte para filtros e paginação
 * 
 * INTEGRAÇÕES:
 * - API Backend: /api/alertas, /api/alertas/estatisticas
 * - Monitoramento Datajud: Recebe notificações de novas movimentações
 * 
 * EXEMPLO DE USO:
 * 
 *     import { useAlertas } from '@/hooks/useAlertas';
 *     
 *     function Dashboard() {
 *       const {
 *         alertas,
 *         naoLidos,
 *         carregando,
 *         erro,
 *         marcarComolido,
 *         recarregar
 *       } = useAlertas();
 *       
 *       return (
 *         <div>
 *           <p>Alertas não lidos: {naoLidos}</p>
 *           {alertas.map(alerta => (
 *             <div key={alerta.id}>
 *               <h3>{alerta.titulo}</h3>
 *               <p>{alerta.mensagem}</p>
 *               <button onClick={() => marcarComolido(alerta.id)}>
 *                 Marcar como lido
 *               </button>
 *             </div>
 *           ))}
 *         </div>
 *       );
 *     }
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export interface Alerta {
  id: number;
  processo_id: number;
  tipo: 'movimentacao' | 'prazo' | 'audiencia' | 'outro';
  titulo: string;
  mensagem: string;
  lido: boolean;
  data_criacao: string;
  data_leitura?: string;
  processo_numero?: string;
  processo_titulo?: string;
}

export interface EstatisticasAlertas {
  nao_lidos: number;
  total_hoje: number;
  total_semana: number;
  ultimas_24h: number;
  por_tipo: {
    movimentacao?: number;
    prazo?: number;
    audiencia?: number;
    [key: string]: number;
  };
}

export interface OpcoesUseAlertas {
  /**
   * Intervalo de polling em milissegundos (padrão: 30000ms = 30s)
   * Use null/0 para desativar polling automático
   */
  intervaloPolling?: number;

  /**
   * Quantidade de alertas por página (padrão: 50)
   */
  itensPorPagina?: number;

  /**
   * Se deve carregar alertas automaticamente ao montar o hook
   */
  carregarAoMontar?: boolean;
}

/**
 * Hook para gerenciar alertas e notificações em tempo real
 * 
 * @param opcoes Configurações opcionais
 * @returns Objeto com alertas, métodos e estado
 */
export function useAlertas(opcoes: OpcoesUseAlertas = {}) {
  const {
    intervaloPolling = 30000,  // 30 segundos
    itensPorPagina = 50,
    carregarAoMontar = true,
  } = opcoes;

  // =========================================================================
  // ESTADO
  // =========================================================================

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasAlertas>({
    nao_lidos: 0,
    total_hoje: 0,
    total_semana: 0,
    ultimas_24h: 0,
    por_tipo: {},
  });

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [apenasNaoLidos, setApenasNaoLidos] = useState(true);
  const [processoIdFiltro, setProcessoIdFiltro] = useState<number | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);

  // =========================================================================
  // FUNÇÕES DE CARREGAMENTO
  // =========================================================================

  /**
   * Carrega alertas da API
   */
  const carregarAlertas = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams();
      params.append('lidos', apenasNaoLidos ? 'false' : 'true');
      params.append('limite', itensPorPagina.toString());
      params.append('offset', (paginaAtual * itensPorPagina).toString());

      if (processoIdFiltro) {
        params.append('processo_id', processoIdFiltro.toString());
      }

      if (tipoFiltro) {
        params.append('tipo', tipoFiltro);
      }

      const response = await api.get(`/alertas?${params.toString()}`);

      if (response.data.sucesso) {
        setAlertas(response.data.alertas);
      } else {
        setErro('Erro ao carregar alertas');
      }
    } catch (err: any) {
      console.error('Erro ao carregar alertas:', err);
      setErro(err.message || 'Erro ao carregar alertas');
    } finally {
      setCarregando(false);
    }
  }, [apenasNaoLidos, itensPorPagina, paginaAtual, processoIdFiltro, tipoFiltro]);

  /**
   * Carrega estatísticas de alertas
   */
  const carregarEstatisticas = useCallback(async () => {
    try {
      const response = await api.get('/alertas/estatisticas');

      if (response.data.sucesso) {
        setEstatisticas(response.data);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);

  /**
   * Recarrega tanto alertas quanto estatísticas
   */
  const recarregar = useCallback(async () => {
    await Promise.all([carregarAlertas(), carregarEstatisticas()]);
  }, [carregarAlertas, carregarEstatisticas]);

  // =========================================================================
  // FUNÇÕES DE AÇÕES EM ALERTAS
  // =========================================================================

  /**
   * Marca um alerta individual como lido
   * @param alertaId - ID do alerta
   */
  const marcarComolido = useCallback(
    async (alertaId: number) => {
      try {
        const response = await api.post(`/alertas/${alertaId}/marcar-como-lido`);

        if (response.data.sucesso) {
          // Atualiza estado local
          setAlertas(
            alertas.map((a) =>
              a.id === alertaId ? { ...a, lido: true, data_leitura: new Date().toISOString() } : a
            )
          );

          // Atualiza estatísticas
          setEstatisticas((prev) => ({
            ...prev,
            nao_lidos: Math.max(0, prev.nao_lidos - 1),
          }));
        }
      } catch (err) {
        console.error('Erro ao marcar alerta como lido:', err);
      }
    },
    [alertas]
  );

  /**
   * Marca TODOS os alertas como lidos
   */
  const marcarTodosComolidos = useCallback(async () => {
    try {
      const response = await api.post('/alertas/marcar-todos-lidos');

      if (response.data.sucesso) {
        // Atualiza estado local
        setAlertas(
          alertas.map((a) => ({
            ...a,
            lido: true,
            data_leitura: new Date().toISOString(),
          }))
        );

        // Atualiza estatísticas
        setEstatisticas((prev) => ({
          ...prev,
          nao_lidos: 0,
        }));
      }
    } catch (err) {
      console.error('Erro ao marcar todos como lidos:', err);
    }
  }, [alertas]);

  // =========================================================================
  // FUNÇÕES DE FILTRO
  // =========================================================================

  const filtrarPorProcesso = useCallback((processoId: number | null) => {
    setProcessoIdFiltro(processoId);
    setPaginaAtual(0);
  }, []);

  const filtrarPorTipo = useCallback((tipo: string | null) => {
    setTipoFiltro(tipo);
    setPaginaAtual(0);
  }, []);

  const exibirApenasNaoLidos = useCallback((apenas: boolean) => {
    setApenasNaoLidos(apenas);
    setPaginaAtual(0);
  }, []);

  const irParaPagina = useCallback((pagina: number) => {
    setPaginaAtual(Math.max(0, pagina));
  }, []);

  // =========================================================================
  // EFEITOS
  // =========================================================================

  /**
   * Carrega alertas quando filtros mudam ou ao montar
   */
  useEffect(() => {
    if (carregarAoMontar) {
      carregarAlertas();
    }
  }, [carregarAoMontar, carregarAlertas]);

  /**
   * Carrega estatísticas ao montar
   */
  useEffect(() => {
    if (carregarAoMontar) {
      carregarEstatisticas();
    }
  }, [carregarAoMontar, carregarEstatisticas]);

  /**
   * Polling automático a cada X ms
   */
  useEffect(() => {
    if (!intervaloPolling || intervaloPolling <= 0) {
      return;
    }

    const intervalo = setInterval(() => {
      recarregar();
    }, intervaloPolling);

    return () => clearInterval(intervalo);
  }, [intervaloPolling, recarregar]);

  // =========================================================================
  // RETORNO
  // =========================================================================

  return {
    // Estado
    alertas,
    estatisticas,
    carregando,
    erro,
    paginaAtual,
    apenasNaoLidos,
    processoIdFiltro,
    tipoFiltro,

    // Métodos de carregamento
    carregarAlertas,
    carregarEstatisticas,
    recarregar,

    // Métodos de ação
    marcarComolido,
    marcarTodosComolidos,

    // Métodos de filtro
    filtrarPorProcesso,
    filtrarPorTipo,
    exibirApenasNaoLidos,
    irParaPagina,
  };
}

/**
 * Componente auxiliar para exibir um alerta em formato de notificação
 * 
 * EXEMPLO:
 * 
 *     import { ComponenteAlerta } from '@/hooks/useAlertas';
 *     
 *     <ComponenteAlerta 
 *       alerta={alerta}
 *       onMarcarLido={() => marcarComolido(alerta.id)}
 *     />
 */
export function ComponenteAlerta({
  alerta,
  onMarcarLido,
  onRemover,
}: {
  alerta: Alerta;
  onMarcarLido?: () => void;
  onRemover?: () => void;
}) {
  // Formata a data
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(alerta.data_criacao));

  // Ícone por tipo
  const iconePorTipo: Record<string, string> = {
    movimentacao: '📋',
    prazo: '⏰',
    audiencia: '🏛️',
    outro: 'ℹ️',
  };

  return (
    <div
      className={`
        flex items-start gap-4 p-4 rounded-lg border-l-4
        ${alerta.lido
          ? 'bg-gray-50 border-gray-300'
          : 'bg-blue-50 border-blue-500'
        }
      `}
    >
      {/* Ícone */}
      <div className="text-2xl">{iconePorTipo[alerta.tipo] || '📌'}</div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900">{alerta.titulo}</h3>
        <p className="text-gray-700 mt-1">{alerta.mensagem}</p>

        {alerta.processo_numero && (
          <p className="text-sm text-gray-500 mt-2">
            Processo: {alerta.processo_numero}
            {alerta.processo_titulo && ` - ${alerta.processo_titulo}`}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-2">{dataFormatada}</p>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        {!alerta.lido && onMarcarLido && (
          <button
            onClick={onMarcarLido}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            title="Marcar como lido"
          >
            ✓
          </button>
        )}

        {onRemover && (
          <button
            onClick={onRemover}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
            title="Remover"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default useAlertas;
// Build: seg 23 fev 2026 01:40:53 -05
