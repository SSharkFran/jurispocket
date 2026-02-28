import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Crown,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { auth } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { buildSalesWhatsAppLink, getPlanLabel } from '@/lib/plans';
import { toast } from 'sonner';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace(/\/api\/?$/, '');

const PLAN_OPTIONS = [
  {
    code: 'pro',
    nome: 'Pro',
    preco: 'R$ 97/mes',
    destaque: 'Ideal para advogado(a) individual',
    recursos: ['IA', 'Datajud', 'WhatsApp', 'Financeiro', 'Documentos', 'Templates', 'Equipe'],
  },
  {
    code: 'escritorio',
    nome: 'Escritorio',
    preco: 'R$ 297/mes',
    destaque: 'Ideal para escritorio com equipe',
    recursos: ['Tudo do Pro', 'Escala para equipe maior', 'Mais armazenamento', 'Colaboracao avancada'],
  },
] as const;

export function ConfiguracoesPage() {
  const { user, workspace, refreshUser } = useAuth();
  const location = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    oab: '',
  });
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    whatsapp: true,
    resumoDiario: false,
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      nome: user.nome || '',
      email: user.email || '',
      telefone: user.telefone || '',
      oab: user.oab || '',
    });
    setNotificacoes({
      email: user.alerta_email !== false,
      whatsapp: user.alerta_whatsapp !== false,
      resumoDiario: user.resumo_diario || false,
    });
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get('planos');
    if (shouldOpen === '1' || shouldOpen === 'true') {
      setIsPlanDialogOpen(true);
    }
  }, [location.search]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await auth.updateProfile({
        nome: formData.nome,
        telefone: formData.telefone,
        alerta_email: notificacoes.email,
        alerta_whatsapp: notificacoes.whatsapp,
        resumo_diario: notificacoes.resumoDiario,
      });
      await refreshUser();
      toast.success('Configuracoes salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelecionarAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      await auth.uploadAvatar(file);
      await refreshUser();
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar foto de perfil');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploadingAvatar(false);
    }
  };

  const initials = formData.nome?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const avatarUrl = user?.avatar_url ? `${API_BASE_URL}${user.avatar_url}` : '';
  const planoNome = workspace?.plano_nome || getPlanLabel(workspace?.plano);
  const planoCodigo = (workspace?.plano || 'gratuito').toLowerCase();
  const planosDisponiveis = useMemo(
    () => PLAN_OPTIONS.filter((plan) => plan.code !== planoCodigo),
    [planoCodigo]
  );

  const limparParametroPlanos = () => {
    const params = new URLSearchParams(location.search);
    if (!params.has('planos')) return;
    params.delete('planos');
    const query = params.toString();
    const nextUrl = `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  };

  const handleOpenPlansDialog = () => {
    setIsPlanDialogOpen(true);
  };

  const handlePlanDialogOpenChange = (open: boolean) => {
    setIsPlanDialogOpen(open);
    if (!open) {
      limparParametroPlanos();
    }
  };

  const handleFalarComVendas = (desiredPlan?: string) => {
    const link = buildSalesWhatsAppLink({
      userName: user?.nome,
      workspaceName: workspace?.nome,
      currentPlan: workspace?.plano,
      desiredPlan,
    });
    window.open(link, '_blank', 'noopener,noreferrer');
    toast.success('Abrindo WhatsApp do time de vendas...');
  };

  return (
    <div className="space-y-6 w-full max-w-6xl">
      <h1 className="text-2xl font-bold">Configuracoes</h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 lg:p-8"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" /> Perfil
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              className="hidden"
              onChange={handleUploadAvatar}
            />
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground"
              onClick={handleSelecionarAvatar}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? 'Enviando...' : 'Alterar foto'}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>OAB</Label>
              <Input
                value={formData.oab}
                onChange={(e) => setFormData({ ...formData, oab: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input value={formData.email} disabled className="pl-10 bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 lg:p-8"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notificacoes
        </h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Alertas por Email', desc: 'Receber notificacoes de movimentacoes por email' },
            { key: 'whatsapp', label: 'Alertas por WhatsApp', desc: 'Receber notificacoes de prazos por WhatsApp' },
            { key: 'resumoDiario', label: 'Resumo diario', desc: 'Receber resumo diario das atividades do escritorio' },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div>
                <div className="text-sm font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <Switch
                checked={notificacoes[n.key as keyof typeof notificacoes]}
                onCheckedChange={(checked) => setNotificacoes((prev) => ({ ...prev, [n.key]: checked }))}
              />
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 lg:p-8"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" /> Plano Atual
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div>
            <div className="font-semibold text-primary">Plano {planoNome}</div>
            <div className="text-sm text-muted-foreground">Codigo: {planoCodigo}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/20 text-primary hover:bg-primary/10"
            onClick={handleOpenPlansDialog}
          >
            Gerenciar Plano
          </Button>
        </div>
      </motion.div>

      <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alteracoes
      </Button>

      <Dialog open={isPlanDialogOpen} onOpenChange={handlePlanDialogOpenChange}>
        <DialogContent className="max-w-4xl border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="h-5 w-5 text-primary" />
              Upgrade de Plano
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                Seu plano atual e <span className="font-semibold text-primary">{planoNome}</span>. Escolha um plano
                abaixo e fale com nosso time comercial para concluir o upgrade.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {PLAN_OPTIONS.map((plan, index) => {
                const isCurrentPlan = plan.code === planoCodigo;
                return (
                  <motion.div
                    key={plan.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`rounded-2xl border p-5 ${
                      isCurrentPlan
                        ? 'border-primary/35 bg-primary/10'
                        : 'border-border/60 bg-secondary/20 hover:border-primary/30'
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="flex items-center gap-2 text-lg font-semibold">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {plan.nome}
                        </h4>
                        <p className="text-sm text-muted-foreground">{plan.destaque}</p>
                      </div>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {plan.preco}
                      </span>
                    </div>

                    <div className="mb-5 space-y-2">
                      {plan.recursos.map((recurso) => (
                        <div key={recurso} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>{recurso}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? 'secondary' : 'default'}
                      disabled={isCurrentPlan}
                      onClick={() => handleFalarComVendas(plan.nome)}
                    >
                      {isCurrentPlan ? 'Plano Atual' : 'Quero esse plano'}
                      {!isCurrentPlan && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {planosDisponiveis.length === 0 && (
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
                Seu workspace ja esta no maior plano disponivel no momento. Se quiser um plano customizado, fale com
                nosso time.
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Precisa de ajuda para escolher?</p>
                <p className="text-sm text-muted-foreground">Nosso time comercial pode indicar o melhor plano.</p>
              </div>
              <Button variant="outline" className="border-primary/30 text-primary" onClick={() => handleFalarComVendas()}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar com Vendas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
