export type PlanCode = 'gratuito' | 'pro' | 'escritorio' | 'enterprise' | string;

export type PremiumFeatureKey =
  | 'ia'
  | 'pje'
  | 'whatsapp'
  | 'templates'
  | 'documentos'
  | 'financeiro'
  | 'equipe';

type PlanFeatureMap = Record<string, string[]>;

const PLAN_FEATURES: PlanFeatureMap = {
  gratuito: ['clientes', 'processos', 'prazos', 'tarefas', 'dashboard'],
  pro: [
    'clientes',
    'processos',
    'prazos',
    'tarefas',
    'dashboard',
    'ia',
    'pje',
    'equipe',
    'templates',
    'documentos',
    'financeiro',
    'whatsapp',
    'relatorios',
  ],
  escritorio: [
    'clientes',
    'processos',
    'prazos',
    'tarefas',
    'dashboard',
    'ia',
    'pje',
    'equipe',
    'templates',
    'documentos',
    'financeiro',
    'whatsapp',
    'relatorios',
  ],
  enterprise: [
    'clientes',
    'processos',
    'prazos',
    'tarefas',
    'dashboard',
    'ia',
    'pje',
    'equipe',
    'templates',
    'documentos',
    'financeiro',
    'whatsapp',
    'relatorios',
  ],
};

export const FEATURE_LABELS: Record<PremiumFeatureKey, string> = {
  ia: 'Copiloto IA',
  pje: 'Consulta Datajud',
  whatsapp: 'WhatsApp Inteligente',
  templates: 'Templates Automatizados',
  documentos: 'Gestao de Documentos',
  financeiro: 'Financeiro Avancado',
  equipe: 'Equipe e Colaboracao',
};

export const SALES_WHATSAPP_NUMBER = (
  import.meta.env.VITE_WHATSAPP_VENDAS || '5568992539472'
).replace(/\D/g, '');

export function normalizePlanCode(plano?: string | null): PlanCode {
  const value = String(plano || '').trim().toLowerCase();
  if (!value) return 'gratuito';
  if (value === 'free') return 'gratuito';
  return value;
}

export function getPlanLabel(plano?: string | null): string {
  const code = normalizePlanCode(plano);
  if (code === 'pro') return 'Pro';
  if (code === 'escritorio') return 'Escritorio';
  if (code === 'enterprise') return 'Enterprise';
  return 'Gratuito';
}

export function hasFeatureAccess(
  plano: string | null | undefined,
  feature: PremiumFeatureKey | string,
  role?: string | null
): boolean {
  if (role === 'superadmin') return true;
  const planCode = normalizePlanCode(plano);
  const features = PLAN_FEATURES[planCode] || PLAN_FEATURES.gratuito;
  return features.includes(feature);
}

export function buildSalesWhatsAppLink(params: {
  userName?: string;
  workspaceName?: string;
  currentPlan?: string | null;
  desiredPlan?: string;
  requestedFeature?: PremiumFeatureKey;
}) {
  const desiredPlanLabel = params.desiredPlan || 'Pro';
  const currentPlanLabel = getPlanLabel(params.currentPlan);
  const userName = params.userName || 'Usuario';
  const workspaceName = params.workspaceName || 'meu escritorio';
  const featureText = params.requestedFeature
    ? ` Recurso de interesse: ${FEATURE_LABELS[params.requestedFeature]}.`
    : '';
  const text =
    `Ola, time JurisPocket! ` +
    `Sou ${userName} do workspace "${workspaceName}". ` +
    `Meu plano atual e ${currentPlanLabel} e quero migrar para o plano ${desiredPlanLabel}.` +
    `${featureText} Podem me ajudar com o upgrade?`;
  return `https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

