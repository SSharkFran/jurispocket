import { Wrench, RefreshCcw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceScreenProps {
  message: string;
  onRetry: () => void;
  supportWhatsappUrl?: string;
}

export function MaintenanceScreen({ message, onRetry, supportWhatsappUrl }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card/80 p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sistema em manutenção</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <p className="mt-2 text-xs text-muted-foreground/80">
          Estamos trabalhando para voltar o quanto antes.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full border-border text-foreground sm:w-auto"
            onClick={onRetry}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          {supportWhatsappUrl && (
            <a
              href={supportWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                type="button"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp oficial
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
