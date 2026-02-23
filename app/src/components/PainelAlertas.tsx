/**
 * ============================================================================
 * COMPONENTE: PainelAlertas - Exibidor de Notificações em Tempo Real
 * ============================================================================
 * 
 * Componente que exibe os alertas/notificações do monitoramento Datajud
 * em tempo real no dashboard do JurisPocket.
 * 
 * CARACTERÍSTICAS:
 * ✓ Exibe alertas não lidos em tempo real
 * ✓ Polling automático a cada 30 segundos
 * ✓ Marca alertas como lidos
 * ✓ Filtragem por tipo e processo
 * ✓ Paginação
 * ✓ Estados de carregamento e erro
 * 
 * INTEGRAÇÃO:
 * - Hook: useAlertas
 * - API: /api/alertas, /api/alertas/estatisticas
 * - Correspondência com backend: datajud_worker.py
 */

import React, { useState } from 'react';
import { AlertCircle, Bell, CheckCircle, X } from 'lucide-react';
import { useAlertas, ComponenteAlerta, type Alerta } from '@/hooks/useAlertas';

interface PainelAleratasProps {
  /**
   * Se deve exibir apenas alertas não lidos
   * @default true
   */
  apenasNaoLidos?: boolean;

  /**
   * ID do processo para filtrar alertas
   */
  processoId?: number;

  /**
   * Intervalo de polling em ms (padrão: 30000)
   */
  intervaloPolling?: number;

  /**
   * Callback quando um novo alerta é detectado
   */
  aoNovoAlerta?: (alerta: Alerta) => void;
}

export function PainelAlertas({
  apenasNaoLidos = true,
  processoId,
  intervaloPolling = 30000,
  aoNovoAlerta,
}: PainelAleratasProps) {
  const {
    alertas,
    estatisticas,
    carregando,
    erro,
    paginaAtual,
    marcarComoLido,
    marcarTodosComoLidos,
    recarregar,
    irParaPagina,
    exibirApenasNaoLidos,
    filtrarPorProcesso,
  } = useAlertas({
    intervaloPolling,
    itensPorPagina: 10,
    carregarAoMontar: true,
  });

  const [alertaRemovido, setAlertaRemovido] = useState<Set<number>>(new Set());

  // =========================================================================
  // TRATAMENTO DE NOVO ALERTA
  // =========================================================================

  React.useEffect(() => {
    // Se há alertas não lidos e callback foi registrado
    if (aoNovoAlerta && alertas.length > 0) {
      const novoAlerta = alertas.find(
        (a) => !a.lido && !alertaRemovido.has(a.id)
      );
      if (novoAlerta) {
        aoNovoAlerta(novoAlerta);
      }
    }
  }, [alertas, aoNovoAlerta, alertaRemovido]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleMarcarLido = (alertaId: number) => {
    marcarComoLido(alertaId);
  };

  const handleRemoverAlerta = (alertaId: number) => {
    setAlertaRemovido((prev) => new Set([...prev, alertaId]));
  };

  const handleFiltroNaoLidos = (apenas: boolean) => {
    exibirApenasNaoLidos(apenas);
  };

  const handleFiltroProcesso = (id: number | null) => {
    filtrarPorProcesso(id);
  };

  // Alert filtrados para exibição (remove os que foram removidos)
  const alertasFiltrados = alertas.filter((a) => !alertaRemovido.has(a.id));

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-4">
      {/* ===== CABEÇALHO ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Notificações</h2>

          {/* Badge com contagem */}
          {estatisticas.nao_lidos > 0 && (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-600 text-white text-xs font-bold">
              {estatisticas.nao_lidos > 99 ? '99+' : estatisticas.nao_lidos}
            </span>
          )}
        </div>

        {/* Botão recarregar */}
        <button
          onClick={() => recarregar()}
          disabled={carregando}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {carregando ? 'Carregando...' : 'Recarregar'}
        </button>
      </div>

      {/* ===== ESTATÍSTICAS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Não Lidos</p>
          <p className="text-2xl font-bold text-blue-600">
            {estatisticas.nao_lidos}
          </p>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Últimas 24h</p>
          <p className="text-2xl font-bold text-purple-600">
            {estatisticas.ultimas_24h}
          </p>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Hoje</p>
          <p className="text-2xl font-bold text-green-600">
            {estatisticas.total_hoje}
          </p>
        </div>

        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
          <p className="text-sm text-gray-600">Esta Semana</p>
          <p className="text-2xl font-bold text-orange-600">
            {estatisticas.total_semana}
          </p>
        </div>
      </div>

      {/* ===== CONTROLES ===== */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => handleFiltroNaoLidos(!apenasNaoLidos)}
          className={`px-3 py-2 text-sm rounded-lg transition ${
            apenasNaoLidos
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Apenas Não Lidos
        </button>

        {processoId && (
          <button
            onClick={() => handleFiltroProcesso(null)}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            ✕ Limpar Filtro
          </button>
        )}

        {estatisticas.nao_lidos > 0 && (
          <button
            onClick={() => marcarTodosComoLidos()}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            ✓ Marcar Todos como Lidos
          </button>
        )}
      </div>

      {/* ===== MENSAGEM DE ERRO ===== */}
      {erro && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar alertas</p>
            <p className="text-sm">{erro}</p>
          </div>
        </div>
      )}

      {/* ===== LISTA DE ALERTAS ===== */}
      <div className="space-y-3">
        {carregando && alertasFiltrados.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border border-gray-300 border-t-blue-600"></div>
          </div>
        ) : alertasFiltrados.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma notificação</p>
            <p className="text-sm text-gray-400 mt-1">
              {apenasNaoLidos
                ? 'Todos os seus alertas foram lidos!'
                : 'Sem alertas disponíveis'}
            </p>
          </div>
        ) : (
          alertasFiltrados.map((alerta) => (
            <React.Fragment key={alerta.id}>
              <ComponenteAlerta
                alerta={alerta}
                onMarcarLido={() => handleMarcarLido(alerta.id)}
                onRemover={() => handleRemoverAlerta(alerta.id)}
              />
            </React.Fragment>
          ))
        )}
      </div>

      {/* ===== PAGINAÇÃO ===== */}
      {alertasFiltrados.length > 0 && Math.ceil(alertasFiltrados.length / 10) > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => irParaPagina(paginaAtual - 1)}
            disabled={paginaAtual === 0}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition"
          >
            ←
          </button>

          <span className="px-4 py-2 text-gray-600">
            Página {paginaAtual + 1}
          </span>

          <button
            onClick={() => irParaPagina(paginaAtual + 1)}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * COMPONENTE: WidgetAlertas - Versão compacta para sidebar/topbar
 * 
 * Exibe apenas os alertas não lidos em formato compacto
 */
export function WidgetAlertas() {
  const { alertas, estatisticas } = useAlertas({
    intervaloPolling: 30000,
    itensPorPagina: 5,
    carregarAoMontar: true,
  });

  const naoLidos = alertas.filter((a) => !a.lido);

  return (
    <div className="w-full max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">
            Alertas ({naoLidos.length})
          </span>
        </div>
        {naoLidos.length > 0 && (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-xs font-bold">
            {naoLidos.length > 9 ? '9+' : naoLidos.length}
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {naoLidos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Sem alertas não lidos
          </p>
        ) : (
          naoLidos.slice(0, 5).map((alerta) => (
            <div
              key={alerta.id}
              className="p-2 bg-blue-50 rounded border-l-2 border-blue-500 text-sm"
            >
              <p className="font-semibold text-gray-900 truncate">
                {alerta.titulo}
              </p>
              <p className="text-gray-600 text-xs truncate mt-1">
                {alerta.mensagem}
              </p>
            </div>
          ))
        )}
      </div>

      {naoLidos.length > 5 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <a
            href="/alertas"
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            Ver todos ({naoLidos.length})
          </a>
        </div>
      )}
    </div>
  );
}

export default PainelAlertas;
