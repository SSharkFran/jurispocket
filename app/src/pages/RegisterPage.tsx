import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Scale, Mail, Lock, User, Building, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, verifyRegisterEmail } = useAuth();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    workspace_nome: '',
  });
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      toast.error('As senhas não coincidem', { duration: 5000 });
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await register({
        nome: form.nome,
        email: form.email,
        password: form.password,
        workspace_nome: form.workspace_nome.trim() || undefined,
      });

      if (response?.requires_verification) {
        const destinationEmail = response.email || form.email.trim().toLowerCase();
        setPendingEmail(destinationEmail);
        setStep('verify');
        toast.success(
          response.message ||
            `Código enviado para ${destinationEmail}. Confira sua caixa de entrada.`
        );
        return;
      }

      toast.success('Conta criada com sucesso!');
      navigate('/app');
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao criar conta';
      setErrorMessage(message);
      toast.error(message, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const emailToVerify = (pendingEmail || form.email).trim().toLowerCase();
      await verifyRegisterEmail(emailToVerify, verificationCode.trim());
      toast.success('Email confirmado com sucesso! Sua conta foi criada.');
      navigate('/app');
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao confirmar código';
      setErrorMessage(message);
      toast.error(message, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await register({
        nome: form.nome,
        email: form.email,
        password: form.password,
        workspace_nome: form.workspace_nome.trim() || undefined,
      });
      toast.success('Novo código enviado para seu email.');
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao reenviar código';
      setErrorMessage(message);
      toast.error(message, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">JurisPocket</span>
          </Link>
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
          <p className="text-muted-foreground mt-1">Comece a usar o JurisPocket gratuitamente</p>
        </div>

        <div className="glass-card p-8">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
            >
              {errorMessage}
            </motion.div>
          )}

          {step === 'register' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Dr. João Silva"
                    className="pl-10 bg-secondary border-border"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 bg-secondary border-border"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome do escritório</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Escritório Silva & Associados"
                    className="pl-10 bg-secondary border-border"
                    name="workspace_nome"
                    value={form.workspace_nome}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-secondary border-border"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-secondary border-border"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Criar Conta <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmail} className="space-y-5">
              <div className="text-sm text-muted-foreground">
                Enviamos um código de verificação para <span className="text-foreground font-medium">{pendingEmail}</span>.
              </div>

              <div className="space-y-2">
                <Label>Código de verificação</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={isLoading}
                  className="bg-secondary border-border tracking-[0.3em] text-center text-lg font-semibold"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Confirmar Código <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Reenviar código
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('register');
                    setVerificationCode('');
                    setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Alterar dados
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Fazer login
          </Link>
        </p>

        <div className="mt-3 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a landing page
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
