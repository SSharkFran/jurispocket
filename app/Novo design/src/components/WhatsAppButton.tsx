import { Button } from '@/components/ui/button';
import { MessageCircle, Phone } from 'lucide-react';
import { generateWhatsAppLink } from '@/services/whatsapp';

interface WhatsAppButtonProps {
  processoId: number;
  clienteTelefone?: string;
  clienteNome?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WhatsAppButton({
  processoId,
  clienteTelefone,
  clienteNome,
  variant = 'default',
  size = 'default',
  className = '',
}: WhatsAppButtonProps) {
  const handleClick = () => {
    if (clienteTelefone) {
      const message = clienteNome 
        ? `Olá ${clienteNome}, estou entrando em contato sobre o seu processo.` 
        : 'Olá, estou entrando em contato sobre o seu processo.';
      
      const whatsappUrl = generateWhatsAppLink(clienteTelefone, message);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30 ${className}`}
      disabled={!clienteTelefone}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      WhatsApp
    </Button>
  );
}
