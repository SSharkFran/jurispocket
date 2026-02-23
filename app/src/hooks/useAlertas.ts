/**
 * Hook: useAlertas - Gerenciamento de Alertas/Notificações
 */

import { useState, useEffect, useCallback } from 'react';

export interface Alerta {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'movimentacao' | 'prazo' | 'audiencia' | 'outro';
  lido: boolean;
  data_criacao: string;
  processo_numero?: string;
  processo_titulo?: string;
}

export interface EstatisticasAlertas {
  total: number;
  nao_lidos: number;
  lidos: number;
  por_tipo: Record<string, number>;
}

export interface UseAlertasReturn {
  alertas: Alerta[];
  estatisticas: EstatisticasAlertas | null;
  carregando: boolean;
  erro: string | null;
  naoLidos: number;
  carregarAlertas: () => Promise<void>;
  marcarComoLido: (alertaId: number) => Promise<boolean>;
  marcarTodosComoLidos: () => Promise<boolean>;
}

export function useAlertas(): UseAlertasReturn {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasAlertas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const getToken = () => localStorage.getItem('token');

  const carregarAlertas = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const token = getToken();
      if (!token) {
        setErro('Não autenticado');
        return;
      }

      const response = await fetch(`${API_URL}/alertas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar alertas');
      }

      const data = await response.json();
      setAlertas(data.alertas || []);
      setEstatisticas(data.estatisticas || null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }, [API_URL]);

  const marcarComoLido = useCallback(async (alertaId: number): Promise<boolean> => {
    try {
      const token = getToken();
      if (!token) return false;

      const response = await fetch(`${API_URL}/alertas/${alertaId}/ler`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAlertas(prev => 
          prev.map(a => a.id === alertaId ? { ...a, lido: true } : a)
        );
        await carregarAlertas();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [API_URL, carregarAlertas]);

  const marcarTodosComoLidos = useCallback(async (): Promise<boolean> => {
    try {
      const token = getToken();
      if (!token) return false;

      const response = await fetch(`${API_URL}/alertas/ler-todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAlertas(prev => prev.map(a => ({ ...a, lido: true })));
        await carregarAlertas();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [API_URL, carregarAlertas]);

  useEffect(() => {
    carregarAlertas();
    
    const interval = setInterval(carregarAlertas, 30000);
    return () => clearInterval(interval);
  }, [carregarAlertas]);

  const naoLidos = alertas.filter(a => !a.lido).length;

  return {
    alertas,
    estatisticas,
    carregando,
    erro,
    naoLidos,
    carregarAlertas,
    marcarComoLido,
    marcarTodosComoLidos,
  };
}

export default useAlertas;
