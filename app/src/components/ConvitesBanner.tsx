import { useState, useEffect } from 'react';
import { equipe } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Convite {
  id: number;
  workspace_id: number;
  workspace_nome: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by_nome?: string;
  created_at: string;
}

export function ConvitesBanner() {
  const [convites, setConvites] = useState<Convite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Só carrega convites se estiver autenticado (tiver token)
    const token = localStorage.getItem('token');
    if (token) {
      loadConvites();
    }
  }, []);

  const loadConvites = async () => {
    try {
      console.log('📡 Buscando convites...');
      const response = await equipe.convitesPendentes();
      console.log('✅ Convites recebidos:', response.data);
      // Garante que sempre seja um array
      setConvites(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Erro ao carregar convites:', error);
      setConvites([]);
    }
  };

  const responderConvite = async (token: string, aceitar: boolean) => {
    setIsLoading(true);
    try {
      await equipe.responderConvite(token, aceitar);
      toast.success(aceitar ? 'Convite aceito!' : 'Convite recusado.');
      setConvites((prev) => prev.filter((c) => c.token !== token));
      if (aceitar) {
        window.location.reload();
      }
    } catch (error) {
      toast.error('Erro ao responder convite.');
    } finally {
      setIsLoading(false);
    }
  };

  if (convites.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
      {convites.map((convite) => (
        <Card
          key={convite.id}
          className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30 p-4 shadow-lg backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                Convite para <span className="text-cyan-400">{convite.workspace_nome}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {convite.invited_by_nome || 'Alguém'} convidou você para fazer parte da equipe.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => responderConvite(convite.token, true)}
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs h-8"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => responderConvite(convite.token, false)}
                  disabled={isLoading}
                  className="border-white/20 text-slate-300 hover:bg-white/10 text-xs h-8"
                >
                  <X className="w-3 h-3 mr-1" />
                  Recusar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
