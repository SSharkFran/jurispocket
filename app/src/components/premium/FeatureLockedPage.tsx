import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Crown,
  DollarSign,
  FileText,
  Globe,
  Lock,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FEATURE_LABELS,
  buildSalesWhatsAppLink,
  getPlanLabel,
} from '@/lib/plans';
import type { PremiumFeatureKey } from '@/lib/plans';

interface FeatureLockedPageProps {
  feature: PremiumFeatureKey;
  currentPlan?: string | null;
  userName?: string;
  workspaceName?: string;
}

const FEATURE_BENEFITS: Record<PremiumFeatureKey, string[]> = {
  ia: [
    'Respostas orientadas por contexto do seu escritorio',
    'Criacao de acoes com confirmacao (tarefas, prazos e financeiro)',
    'Produtividade real no atendimento ao cliente',
  ],
  pje: [
    'Monitoramento automatico de movimentacoes',
    'Alertas com prioridade e historico de consultas',
    'Mais previsibilidade do andamento processual',
  ],
  whatsapp: [
    'Automacoes de mensagens por processo e equipe',
    'Comunicacao mais rapida com clientes',
    'Central de envio com rastreio',
  ],
  templates: [
    'Documentos padronizados com menos retrabalho',
    'Ganhe velocidade na elaboracao de pecas',
    'Padrao de qualidade para todo o time',
  ],
  documentos: [
    'Organizacao centralizada de anexos e comprovantes',
    'Mais controle e menos perda de arquivo',
    'Fluxo documental por cliente e processo',
  ],
  financeiro: [
    'Visao de entradas, saidas e saldo em tempo real',
    'Controle de caixa com mais confianca',
    'Base para decisoes de crescimento',
  ],
  equipe: [
    'Gestao de membros e papeis do escritorio',
    'Distribuicao de tarefas com transparencia',
    'Colaboracao mais eficiente entre usuarios',
  ],
};

function AnimatedFeaturePreview({ feature }: { feature: PremiumFeatureKey }) {
  const iconMap = {
    ia: Bot,
    pje: Globe,
    whatsapp: MessageSquare,
    templates: FileText,
    documentos: FileText,
    financeiro: DollarSign,
    equipe: Users,
  } as const;
  const Icon = iconMap[feature];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <motion.div
        initial={{ opacity: 0.35, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1.03 }}
        transition={{ duration: 1.8, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl"
      />
      <div className="relative flex items-center gap-4">
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2.8, repeat: Infinity }}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <Icon className="h-7 w-7" />
        </motion.div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Exemplo do recurso</p>
          <p className="text-base font-semibold">{FEATURE_LABELS[feature]}</p>
        </div>
      </div>
      <div className="relative mt-5 space-y-2">
        {[0, 1, 2].map((idx) => (
          <motion.div
            key={idx}
            initial={{ x: -14, opacity: 0.5 }}
            animate={{ x: [0, 8, 0], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.2, delay: idx * 0.2, repeat: Infinity }}
            className="h-2.5 rounded-full bg-primary/30"
            style={{ width: `${100 - idx * 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function FeatureLockedPage({
  feature,
  currentPlan,
  userName,
  workspaceName,
}: FeatureLockedPageProps) {
  const navigate = useNavigate();
  const currentPlanLabel = getPlanLabel(currentPlan);

  const openSales = () => {
    const link = buildSalesWhatsAppLink({
      userName,
      workspaceName,
      currentPlan,
      desiredPlan: 'Pro',
      requestedFeature: feature,
    });
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border border-primary/20 p-6 lg:p-8"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Lock className="h-3.5 w-3.5" />
              Recurso Premium
            </div>
            <h1 className="text-2xl font-bold">Esse recurso esta bloqueado no seu plano atual</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Voce esta no plano <strong>{currentPlanLabel}</strong>. O recurso{' '}
              <strong>{FEATURE_LABELS[feature]}</strong> esta disponivel nos planos Pro e Escritorio.
            </p>
          </div>
          <div className="hidden rounded-xl bg-primary/10 p-3 text-primary md:block">
            <Crown className="h-7 w-7" />
          </div>
        </div>

        <AnimatedFeaturePreview feature={feature} />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_BENEFITS[feature].map((benefit) => (
            <div key={benefit} className="rounded-xl border border-border/50 bg-secondary/20 p-3">
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                <span>{benefit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openSales}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Falar com Vendas
          </Button>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate('/app/configuracoes?planos=1')}
          >
            Ver Planos e Upgrade
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
