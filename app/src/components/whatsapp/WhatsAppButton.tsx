import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ExternalLink, MessageCircle, Send, Loader2, Copy, Check, Smartphone } from 'lucide-react';
import { whatsapp } from '@/services/whatsapp';
import { toast } from 'sonner';

interface WhatsAppButtonProps {
  processoId: number;
  clienteTelefone?: string | null;
  clienteNome?: string;
  processoTitulo?: string;
  linkPublico?: string | null;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WhatsAppButton({
  processoId,
  clienteTelefone,
  clienteNome,
  processoTitulo,
  linkPublico,
  variant = 'outline',
  size = 'default',
  className
}: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadStatus = async () => {
      try {
        const response = await whatsapp.getStatus();
        if (!mounted) return;
        const data = response.data;
        const conectado = Boolean(data.connected ?? data.conectado);
        setApiConfigured(data.provider === 'whatsapp-web' && conectado);
      } catch {
        if (mounted) setApiConfigured(false);
      }
    };
    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const formatarTelefone = (telefone: string): string => {
    // Remove tudo que não é dígito
    const digits = telefone.replace(/\D/g, '');
    
    // Se começa com 55, mantém
    if (digits.startsWith('55') && digits.length >= 12) {
      return digits;
    }
    
    // Adiciona 55 se tiver DDD + número
    if (digits.length >= 10) {
      return `55${digits}`;
    }
    
    return digits;
  };

  const gerarMensagemPadrao = (): string => {
    const nome = clienteNome?.split(' ')[0] || 'Cliente';
    const titulo = processoTitulo || 'seu processo';
    
    if (linkPublico) {
      return `👋 Olá, ${nome}!\n\n` +
        `Acompanhe o andamento do seu processo "${titulo}" pelo link:\n` +
        `${linkPublico}\n\n` +
        `Qualquer dúvida, estou à disposição! ⚖️`;
    }
    
    return `👋 Olá, ${nome}!\n\n` +
      `Entrando em contato sobre o processo "${titulo}".\n\n` +
      `Qualquer dúvida, estou à disposição! ⚖️`;
  };

  const getWhatsAppLink = (): string => {
    const telefone = clienteTelefone ? formatarTelefone(clienteTelefone) : '';
    const texto = encodeURIComponent(mensagem || gerarMensagemPadrao());
    return `https://wa.me/${telefone}?text=${texto}`;
  };

  const handleEnviarViaLink = () => {
    const link = getWhatsAppLink();
    window.open(link, '_blank');
    setOpen(false);
    toast.success('WhatsApp aberto!');
  };

  const handleEnviarViaApi = async () => {
    if (!clienteTelefone) return;
    
    setLoading(true);
    try {
      const response = await whatsapp.enviarMensagem({
        telefone: formatarTelefone(clienteTelefone),
        mensagem: mensagem || gerarMensagemPadrao(),
        tipo: 'texto'
      });
      
      if (response.data.sucesso) {
        toast.success('Mensagem enviada diretamente! ✅');
        setOpen(false);
      } else {
        toast.error(response.data.erro || 'Erro ao enviar');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.response?.data?.erro || 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const copiarMensagem = () => {
    const texto = mensagem || gerarMensagemPadrao();
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopiado(false), 2000);
  };

  // Se não tem telefone do cliente, mostra alerta
  const handleClick = () => {
    if (!clienteTelefone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    whatsapp.getStatus()
      .then((response) => {
        const data = response.data;
        const conectado = Boolean(data.connected ?? data.conectado);
        setApiConfigured(data.provider === 'whatsapp-web' && conectado);
      })
      .catch(() => setApiConfigured(false));
    setMensagem(gerarMensagemPadrao());
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={className}
          onClick={handleClick}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Revise a mensagem antes de enviar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {clienteNome && (
            <div className="text-sm">
              <span className="text-muted-foreground">Para:</span>{' '}
              <span className="font-medium">{clienteNome}</span>
            </div>
          )}
          
          {clienteTelefone && (
            <div className="text-sm">
              <span className="text-muted-foreground">Telefone:</span>{' '}
              <span className="font-medium">{clienteTelefone}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mensagem">Mensagem</Label>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={copiarMensagem}
                className="h-6 px-2"
              >
                {copiado ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copiado ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {apiConfigured 
                ? 'A mensagem será enviada diretamente pela API.' 
                : 'Você pode editar a mensagem antes de abrir.'}
            </p>
          </div>

          {/* Botões de envio */}
          <div className="space-y-2">
            {apiConfigured && (
              <Button 
                onClick={handleEnviarViaApi}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Enviando...' : 'Enviar Direto pela API'}
              </Button>
            )}
            
            <Button 
              onClick={handleEnviarViaLink}
              variant={apiConfigured ? "outline" : "default"}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {apiConfigured ? 'Abrir WhatsApp Web' : 'Abrir WhatsApp'}
            </Button>
          </div>

          {/* Badge de status */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            {apiConfigured ? (
              <>
                <Smartphone className="h-3 w-3 text-green-500" />
                <span>WhatsApp Web conectado</span>
              </>
            ) : (
              <>
                <ExternalLink className="h-3 w-3" />
                <span>Modo wa.me (link)</span>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
