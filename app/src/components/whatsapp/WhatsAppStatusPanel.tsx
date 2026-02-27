import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { whatsapp, type WhatsAppStatus } from '@/services/whatsapp';
import {
  MessageCircle,
  RefreshCw,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  PowerOff,
} from 'lucide-react';
import { toast } from 'sonner';

export function WhatsAppStatusPanel() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await whatsapp.getStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      if (!silent) toast.error('Erro ao verificar status do WhatsApp');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleGenerateQR = async () => {
    try {
      setQrLoading(true);
      const response = await whatsapp.getQRCode();

      if (response.data.sucesso && response.data.connected && !response.data.qrcode) {
        toast.success('WhatsApp ja esta conectado');
        setQrDialogOpen(false);
        await fetchStatus(true);
        return;
      }

      if (response.data.sucesso && response.data.qrcode) {
        setQrCode(response.data.qrcode);
        setQrDialogOpen(true);
        await fetchStatus(true);
        return;
      }

      toast.error(response.data.erro || 'QR code ainda nao disponivel. Tente novamente.');
    } catch (error: any) {
      console.error('Erro ao gerar QR:', error);
      toast.error(error.response?.data?.erro || 'Erro ao gerar QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await whatsapp.desconectar();
      if (response.data.sucesso) {
        toast.success('WhatsApp desconectado');
      } else {
        toast.error(response.data.erro || 'Erro ao desconectar');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao desconectar WhatsApp');
    } finally {
      fetchStatus();
    }
  };

  const connected = Boolean(status?.connected ?? status?.conectado);

  const getStatusIcon = () => {
    if (!status) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    if (connected) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!status) return 'Verificando...';
    if (connected) return 'Conectado';
    return status.state === 'connecting' ? 'Conectando...' : 'Desconectado';
  };

  const getStatusColor = () => {
    if (!status) return 'bg-gray-100';
    if (connected) return 'bg-green-100 text-green-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verificando status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">Status:</span>
            </div>
            <Badge variant="secondary" className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>

          {status && (
            <div className="text-xs text-muted-foreground">
              Provedor: <span className="font-medium">{status.provider || '-'}</span>
            </div>
          )}

          {status?.error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{status.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            {!connected && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateQR}
                disabled={qrLoading}
                className="flex-1"
              >
                {qrLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                {qrLoading ? 'Gerando...' : 'Conectar'}
              </Button>
            )}

            {connected && (
              <Button size="sm" variant="outline" onClick={handleDisconnect}>
                <PowerOff className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            )}

            <Button size="sm" variant="ghost" onClick={() => fetchStatus()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>Escaneie o QR code com o app do WhatsApp.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain" />
              </div>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              WhatsApp - Menu - Aparelhos conectados - Conectar um aparelho
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
