import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Scale, Bot, MessageSquare, Search, Shield, Zap, 
  BarChart3, Users, FileText, Clock, ArrowRight, Check,
  Star, ChevronRight, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const }
  })
};

const features = [
  {
    icon: Search,
    title: "Consulta Datajud",
    description: "Monitoramento automático de processos em todos os tribunais do Brasil via API CNJ.",
    highlight: true,
  },
  {
    icon: Bot,
    title: "Copiloto Jurídico IA",
    description: "Assistente inteligente que analisa processos, sugere estratégias e gera documentos.",
    highlight: true,
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Automático",
    description: "Envio automático de atualizações processuais e comunicação com clientes.",
    highlight: true,
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Cadastro completo de clientes com histórico processual e financeiro integrado.",
  },
  {
    icon: FileText,
    title: "Templates Inteligentes",
    description: "Crie documentos jurídicos com preenchimento automático a partir dos dados do processo.",
  },
  {
    icon: BarChart3,
    title: "Financeiro Completo",
    description: "Controle de honorários, despesas e fluxo de caixa por processo e cliente.",
  },
];

const plans = [
  {
    name: "Gratuito",
    price: "0",
    description: "Para começar a organizar",
    features: ["10 processos", "20 clientes", "2 usuários", "Dashboard básico"],
    cta: "Começar Grátis",
    popular: false,
  },
  {
    name: "Pro",
    price: "97",
    description: "Para advogados individuais",
    features: [
      "Processos ilimitados", "Clientes ilimitados", "5 usuários", 
      "Copiloto IA", "Datajud", "WhatsApp", "Templates", "Financeiro"
    ],
    cta: "Assinar Pro",
    popular: true,
  },
  {
    name: "Escritório",
    price: "297",
    description: "Para escritórios de advocacia",
    features: [
      "Tudo do Pro", "Usuários ilimitados", "10GB armazenamento",
      "Relatórios avançados", "Suporte prioritário", "API personalizada"
    ],
    cta: "Falar com Vendas",
    popular: false,
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/50"
        style={{ backdropFilter: "blur(16px)", background: "hsl(240 6% 3% / 0.8)" }}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">JurisPocket</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#differentials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Diferenciais</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(240 6% 3% / 0.5), hsl(240 6% 3%))" }} />
        </div>

        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <span className="feature-badge mb-6 inline-flex">
              <Zap className="h-3.5 w-3.5" /> Novo: Integração com Datajud CNJ
            </span>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-7xl"
          >
            Gestão Jurídica{" "}
            <span className="text-gradient">Inteligente</span>
            <br />para o Advogado Moderno
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Automatize processos, monitore tribunais em tempo real e use IA para potencializar 
            sua prática jurídica. Tudo em uma única plataforma.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary px-8 text-base">
                Começar Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary px-8 text-base">
                Ver Funcionalidades
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-8"
          >
            {[
              { value: "50+", label: "Tribunais Integrados" },
              { value: "10k+", label: "Processos Monitorados" },
              { value: "99.9%", label: "Disponibilidade" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WOW Features - 3 Differentials */}
      <section id="differentials" className="py-32">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="feature-badge mb-4">Diferenciais Exclusivos</span>
            <h2 className="text-4xl font-bold md:text-5xl">
              Tecnologia que <span className="text-gradient">transforma</span> sua prática
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Datajud */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0 }}
              className="glass-card glow-border p-8 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Consulta Nacional Datajud</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Monitoramento automático em <strong className="text-foreground">todos os tribunais do Brasil</strong>. 
                Receba alertas instantâneos de movimentações via API oficial do CNJ.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {["TJSP", "TRF1", "TST", "STJ"].map(t => (
                  <span key={t} className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">{t}</span>
                ))}
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">+50</span>
              </div>
            </motion.div>

            {/* IA */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.15 }}
              className="glass-card glow-border p-8 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <Bot className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3">Copiloto Jurídico IA</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                IA treinada para o direito brasileiro. Analise processos, gere petições, 
                receba <strong className="text-foreground">sugestões de estratégia</strong> e resuma despachos.
              </p>
              <div className="mt-6 glass-card p-3 text-left text-xs">
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">"Analise o risco de recurso neste processo trabalhista..."</span>
                </div>
              </div>
            </motion.div>

            {/* WhatsApp */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="glass-card glow-border p-8 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                <MessageSquare className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-bold mb-3">Automação WhatsApp</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Envie atualizações automáticas para clientes. Notificações de movimentações, 
                prazos e <strong className="text-foreground">links de acompanhamento</strong>.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {["Boas-vindas automáticas", "Alertas de movimentação", "Link de acompanhamento"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />{f}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* All Features */}
      <section id="features" className="py-32 border-t border-border/50">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold">Tudo que você precisa, <span className="text-gradient">num só lugar</span></h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Gestão completa do seu escritório com ferramentas pensadas para advogados.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`glass-card-hover p-6 ${f.highlight ? "glow-border" : ""}`}
              >
                <f.icon className={`h-6 w-6 mb-4 ${f.highlight ? "text-primary" : "text-muted-foreground"}`} />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Clock, title: "Prazos & Alertas", desc: "Nunca perca um prazo com alertas automáticos e calendário integrado." },
              { icon: Shield, title: "Segurança Total", desc: "Dados criptografados, controle de acesso e logs de auditoria completos." },
              { icon: Star, title: "Relatórios", desc: "Relatórios detalhados de desempenho, financeiro e produtividade da equipe." },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card-hover p-6"
              >
                <f.icon className="h-6 w-6 mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 border-t border-border/50">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold">Planos que cabem no seu <span className="text-gradient">bolso</span></h2>
            <p className="mt-4 text-muted-foreground">Comece grátis. Escale quando precisar.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-8 flex flex-col ${plan.popular ? "glow-border glow-primary ring-1 ring-primary/20" : ""}`}
              >
                {plan.popular && (
                  <span className="feature-badge self-start mb-4">Mais Popular</span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="my-6">
                  <span className="text-4xl font-bold">R${plan.price}</span>
                  {plan.price !== "0" && <span className="text-muted-foreground">/mês</span>}
                </div>
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button className={`w-full ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                    {plan.cta} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} className="glass-card glow-border max-w-3xl mx-auto p-12"
          >
            <h2 className="text-3xl font-bold mb-4">Pronto para transformar seu escritório?</h2>
            <p className="text-muted-foreground mb-8">
              Junte-se a milhares de advogados que já usam o JurisPocket para ganhar tempo e produtividade.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary px-10">
                Começar Agora — É Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-semibold">JurisPocket</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 JurisPocket. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
