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
  Smartphone,
  ExternalLink,
  Copy,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function WhatsAppStatusPanel() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await whatsapp.getStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      toast.error('Erro ao verificar status do WhatsApp');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleGenerateQR = async () => {
    try {
      setQrLoading(true);
      const response = await whatsapp.getQRCode();
      
      if (response.data.sucesso && response.data.qrcode) {
        const code = response.data.qrcode;
        
        // Se for código de pareamento (8 dígitos)
        if (code.match(/^\d{8}$/)) {
          setPairingCode(code);
          setQrCode(null);
        } else if (code === 'already_connected') {
          toast.success('WhatsApp já está conectado!');
          fetchStatus();
          return;
        } else if (code === 'use_manager') {
          // Mostrar instruções para usar o manager
          setQrCode(null);
          setPairingCode(null);
          setQrDialogOpen(true);
          return;
        } else if (code.startsWith('data:image') || code.length > 100) {
          // QR code em base64
          setQrCode(code);
          setPairingCode(null);
        } else {
          // Outro formato, mostrar instruções
          setQrCode(null);
          setPairingCode(null);
        }
        setQrDialogOpen(true);
      } else {
        // Abrir diálogo com instruções alternativas
        setQrCode(null);
        setPairingCode(null);
        setQrDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao gerar QR:', error);
      toast.error('Erro ao gerar QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const copyPairingCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast.success('Código copiado!');
    }
  };

  const openEvolutionManager = () => {
    window.open('http://localhost:8080/manager', '_blank');
  };

  const getStatusIcon = () => {
    if (!status) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    
    if (status.provider === 'none') {
      return <Smartphone className="h-5 w-5 text-gray-400" />;
    }
    
    if (status.connected) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!status) return 'Verificando...';
    
    if (status.provider === 'none') {
      return 'Usando links wa.me';
    }
    
    if (status.connected) {
      return 'Conectado';
    }
    
    return status.state === 'connecting' 
      ? 'Conectando...' 
      : 'Desconectado';
  };

  const getStatusColor = () => {
    if (!status) return 'bg-gray-100';
    
    if (status.provider === 'none') {
      return 'bg-gray-100 text-gray-600';
    }
    
    if (status.connected) {
      return 'bg-green-100 text-green-700';
    }
    
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
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">Status:</span>
            </div>
            <Badge variant="secondary" className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>

          {/* Provider */}
          {status && status.provider !== 'none' && (
            <div className="text-xs text-muted-foreground">
              Provider: <span className="font-medium">{status.provider}</span>
            </div>
          )}

          {/* Alertas */}
          {status?.error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">
                {status.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            {status?.provider === 'evolution' && !status.connected && (
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
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={fetchStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Info sobre links wa.me */}
          {(!status || status.provider === 'none') && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>
                Configure a Evolution API para enviar mensagens diretamente.
                Por enquanto, será usado link wa.me.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog do QR Code ou Instruções */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escolha uma das opções abaixo para conectar seu WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-6 py-4">
            {/* Opção 1: Código de Pareamento */}
            {pairingCode && (
              <div className="w-full space-y-3">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Digite este código no WhatsApp do seu celular:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded text-2xl font-mono tracking-widest">
                      {pairingCode}
                    </code>
                    <Button size="icon" variant="ghost" onClick={copyPairingCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  WhatsApp → Menu → Aparelhos Conectados → Conectar com número de telefone
                </p>
              </div>
            )}

            {/* Opção 2: QR Code */}
            {qrCode && qrCode.startsWith('data:image') && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Escaneie o QR code com seu WhatsApp
                </p>
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={qrCode} 
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  WhatsApp → Menu → Aparelhos Conectados → Ler QR code
                </p>
              </div>
            )}

            {/* Opção 3: Instruções alternativas */}
            {!pairingCode && !qrCode && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm mb-3">
                    Clique no botão abaixo para abrir o Evolution Manager e conectar manualmente:
                  </p>
                  <Button onClick={openEvolutionManager} className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Evolution Manager
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Passo 1:</strong> Clique na engrenagem da instância</p>
                  <p><strong>Passo 2:</strong> Clique em &quot;Conectar&quot;</p>
                  <p><strong>Passo 3:</strong> Escaneie o QR code com seu WhatsApp</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
