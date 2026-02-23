import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Scale, 
  Calendar, 
  FileText, 
  Clock, 
  Shield, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Menu,
  X,
  Zap,
  Briefcase,
  Lock,
  MessageSquare,
  TrendingUp,
  HeartHandshake,
  ChevronDown,
  Award,
  Database,
  FileCheck,
  HelpCircle,
  Star
} from 'lucide-react'

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('5511999999999')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showStickyCta, setShowStickyCta] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
      setShowStickyCta(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    fetch('http://localhost:5000/api/config/public')
      .then(res => res.json())
      .then(data => {
        if (data.whatsapp_vendas) {
          setWhatsappNumber(data.whatsapp_vendas)
        }
      })
      .catch(() => {})
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  const features = [
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Linha do Tempo de Prazos',
      description: 'Visualize todos os prazos em uma linha do tempo intuitiva. Nunca mais perca uma data importante.'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Gestão de Documentos',
      description: 'Armazene e organize todos os documentos dos processos em um só lugar, com acesso rápido e seguro.'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Geração de Petições',
      description: 'Crie documentos automaticamente com templates personalizáveis e variáveis dinâmicas.'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Timesheet Integrado',
      description: 'Controle preciso das horas trabalhadas por processo para uma cobrança justa e transparente.'
    }
  ]

  const benefits = [
    {
      icon: <HeartHandshake className="w-10 h-10" />,
      title: 'Reduza o Estresse',
      description: 'Tenha tranquilidade sabendo que todos os prazos estão sob controle e você será alertado com antecedência.'
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: 'Segurança de Prazos',
      description: 'Sistema de notificações inteligente que alerta sobre prazos vencendo nas próximas 24 horas.'
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: 'Transparência com Clientes',
      description: 'Portal do cliente para acompanhar o status do processo sem necessidade de login ou senha.'
    },
    {
      icon: <Briefcase className="w-10 h-10" />,
      title: 'Colaboração em Equipe',
      description: 'Convide colegas para seu workspace e trabalhe em conjunto com controle de acessos.'
    }
  ]

  const steps = [
    {
      number: '01',
      title: 'Crie sua Conta',
      description: 'Cadastro simples e rápido. Comece gratuitamente em poucos minutos.'
    },
    {
      number: '02',
      title: 'Adicione os Processos',
      description: 'Importe ou cadastre manualmente seus processos e prazos existentes.'
    },
    {
      number: '03',
      title: 'Não Perca Mais Prazos',
      description: 'Receba alertas automáticos e mantenha tudo organizado em um só lugar.'
    }
  ]

  const plans = [
    {
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      description: 'Perfeito para iniciar',
      features: [
        'Até 5 processos',
        'Até 20 prazos/mês',
        'Gestão básica de documentos',
        '1 usuário'
      ],
      cta: 'Começar Grátis',
      href: '/register',
      highlighted: false
    },
    {
      name: 'Pro',
      price: 'R$ 97',
      period: '/mês',
      description: 'Para advogados individuais',
      features: [
        'Processos ilimitados',
        'Prazos ilimitados',
        'Gestão completa de documentos',
        'Templates de petições',
        'Timesheet',
        'Portal do cliente',
        '1 usuário'
      ],
      cta: 'Assinar Pro',
      external: true,
      whatsappMsg: 'Olá! Tenho interesse no plano Pro do JurisPocket. Gostaria de mais informações sobre assinatura.',
      highlighted: true
    },
    {
      name: 'Escritório',
      price: 'R$ 297',
      period: '/mês',
      description: 'Para equipes jurídicas',
      features: [
        'Tudo do plano Pro',
        'Até 10 usuários',
        'Colaboração em equipe',
        'Trilha de auditoria',
        'Sistema de tags avançado',
        'Suporte prioritário'
      ],
      cta: 'Falar com Vendas',
      external: true,
      whatsappMsg: 'Olá! Tenho interesse no plano Escritório do JurisPocket. Gostaria de mais informações para minha equipe.',
      highlighted: false
    }
  ]

  return (
    <div className="min-h-screen bg-[#0f1217] relative overflow-x-hidden">
      {/* Background Elements Globais */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid de pontos */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30"></div>
        
        {/* Mesh gradient suave */}
        <div className="bg-mesh"></div>
        
        {/* Partículas flutuantes */}
        <div className="particles-container">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${(i * 5) % 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${15 + (i % 10)}s`,
                width: `${2 + (i % 4)}px`,
                height: `${2 + (i % 4)}px`
              }}
            />
          ))}
        </div>
        
        {/* Formas geométricas grandes e sutis */}
        <div className="geo-shape absolute top-20 right-10 w-96 h-96 border border-[#7db2ff]/10 rounded-full"></div>
        <div className="geo-shape absolute bottom-40 left-10 w-64 h-64 border border-[#2d6cdf]/10 rounded-full" style={{ animationDirection: 'reverse', animationDuration: '40s' }}></div>
        <div className="geo-shape absolute top-1/2 right-1/4 w-32 h-32 border border-[#7db2ff]/5 rotate-45"></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0f1217]/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7db2ff] to-[#2d6cdf] flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Juris<span className="text-[#7db2ff]">Pocket</span></span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('funcionalidades')} className="text-slate-300 hover:text-white transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-slate-300 hover:text-white transition-colors">
                Como Funciona
              </button>
              <button onClick={() => scrollToSection('beneficios')} className="text-slate-300 hover:text-white transition-colors">
                Benefícios
              </button>
              <button onClick={() => scrollToSection('precos')} className="text-slate-300 hover:text-white transition-colors">
                Preços
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Link to="/login" className="text-slate-300 hover:text-white transition-colors">
                Entrar
              </Link>
              <Link to="/register" className="btn-primary px-5 py-2.5 rounded-xl font-medium">
                Teste Grátis
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0f1217]/95 backdrop-blur-xl border-b border-white/5">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('funcionalidades')} className="block w-full text-left py-2 text-slate-300">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left py-2 text-slate-300">
                Como Funciona
              </button>
              <button onClick={() => scrollToSection('beneficios')} className="block w-full text-left py-2 text-slate-300">
                Benefícios
              </button>
              <button onClick={() => scrollToSection('precos')} className="block w-full text-left py-2 text-slate-300">
                Preços
              </button>
              <div className="pt-3 border-t border-white/10 space-y-2">
                <Link to="/login" className="block w-full py-2 text-center text-slate-300">
                  Entrar
                </Link>
                <Link to="/register" className="block w-full py-2.5 text-center btn-primary rounded-xl">
                  Teste Grátis
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Effects Animados */}
        <div className="absolute inset-0 bg-gradient-radial opacity-50"></div>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#7db2ff]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#2d6cdf]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-[#7db2ff]/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-[350px] h-[350px] bg-[#2d6cdf]/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Grid pattern local na hero */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-button text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Novo: Portal do Cliente</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Um espaço de trabalho{' '}
                <span className="gradient-text">tranquilo</span>{' '}
                para advogados
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-400 max-w-xl">
                Organize processos e prazos jurídicos com facilidade. 
                Reduza o estresse, nunca perca prazos e mantenha seus clientes informados.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn-primary px-8 py-4 rounded-xl font-semibold text-center flex items-center justify-center gap-2">
                  Teste Grátis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Tenho interesse no JurisPocket e gostaria de mais informações.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-button px-8 py-4 rounded-xl font-semibold text-center flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Falar com Vendas
                </a>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                  <span>Cancelamento fácil</span>
                </div>
              </div>
              
              {/* Badges de Confiança */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="w-4 h-4 text-[#7db2ff]" />
                  <span>LGPD Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-4 h-4 text-[#7db2ff]" />
                  <span>Criptografia AES-256</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Database className="w-4 h-4 text-[#7db2ff]" />
                  <span>Backup Diário</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Award className="w-4 h-4 text-[#7db2ff]" />
                  <span>OAB Recomenda</span>
                </div>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative glass-card-strong p-6 animate-pulse-glow">
                <div className="space-y-4">
                  {/* Mock Dashboard */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7db2ff] to-[#2d6cdf]"></div>
                      <div>
                        <div className="h-4 w-32 bg-white/10 rounded"></div>
                        <div className="h-3 w-20 bg-white/5 rounded mt-1"></div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5"></div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card p-4">
                      <div className="h-8 w-8 rounded-lg bg-[#7db2ff]/20 mb-2"></div>
                      <div className="h-6 w-12 bg-white/20 rounded"></div>
                      <div className="h-3 w-16 bg-white/10 rounded mt-1"></div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="h-8 w-8 rounded-lg bg-[#eab308]/20 mb-2"></div>
                      <div className="h-6 w-12 bg-white/20 rounded"></div>
                      <div className="h-3 w-16 bg-white/10 rounded mt-1"></div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="h-8 w-8 rounded-lg bg-[#22c55e]/20 mb-2"></div>
                      <div className="h-6 w-12 bg-white/20 rounded"></div>
                      <div className="h-3 w-16 bg-white/10 rounded mt-1"></div>
                    </div>
                  </div>
                  
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                      <div className="flex-1 h-3 bg-white/10 rounded"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#eab308]"></div>
                      <div className="flex-1 h-3 bg-white/10 rounded"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                      <div className="flex-1 h-3 bg-white/10 rounded"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements com animação */}
              <div className="absolute -top-4 -right-4 glass-card p-3 animate-fade-in animate-float" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#22c55e]" />
                  <span className="text-sm">Prazo cumprido!</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 glass-card p-3 animate-fade-in animate-float" style={{ animationDelay: '0.4s', animationDirection: 'reverse' }}>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#eab308]" />
                  <span className="text-sm">24h para o prazo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <button 
          onClick={() => scrollToSection('como-funciona')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-500 hover:text-[#7db2ff] transition-colors"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 relative">
        {/* Background decoration */}
        <div className="absolute left-0 top-1/2 w-72 h-72 bg-[#7db2ff]/5 rounded-full blur-3xl -translate-y-1/2"></div>
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-[#2d6cdf]/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Como Funciona</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Comece a usar o JurisPocket em três passos simples
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="glass-card p-8 h-full hover-lift card-glow group">
                  <div className="text-5xl font-bold gradient-text mb-4 group-hover:scale-110 transition-transform duration-300">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-slate-400">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof - Números */}
      <section className="py-16 relative border-y border-white/5">
        <div className="absolute inset-0 bg-gradient-radial opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center animate-fade-in">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">2.500+</div>
              <div className="text-slate-400 text-sm">Advogados Ativos</div>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">50k+</div>
              <div className="text-slate-400 text-sm">Processos Gerenciados</div>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">99.9%</div>
              <div className="text-slate-400 text-sm">Uptime Garantido</div>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">4.9/5</div>
              <div className="text-slate-400 text-sm flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                Avaliação dos Clientes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-radial opacity-30"></div>
        <div className="absolute right-0 top-20 w-[400px] h-[400px] bg-[#7db2ff]/5 rounded-full blur-3xl"></div>
        <div className="absolute left-0 bottom-20 w-[300px] h-[300px] bg-[#2d6cdf]/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-dot-pattern opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Funcionalidades Principais</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar sua prática jurídica de forma eficiente
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-card p-6 hover-lift card-glow group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7db2ff]/20 to-[#2d6cdf]/20 flex items-center justify-center text-[#7db2ff] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-[#7db2ff] transition-colors">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="py-24 relative">
        {/* Background decoration */}
        <div className="absolute left-1/4 top-0 w-[500px] h-[500px] bg-[#7db2ff]/5 rounded-full blur-3xl"></div>
        <div className="absolute right-1/4 bottom-0 w-[400px] h-[400px] bg-[#2d6cdf]/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Por que contratar o <span className="gradient-text">JurisPocket</span>?
              </h2>
              <p className="text-slate-400 mb-8">
                Nossa plataforma foi desenvolvida por advogados para advogados, 
                entendendo as reais necessidades do dia a dia da advocacia.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index} 
                    className="space-y-3 p-4 rounded-xl hover:bg-white/5 transition-all duration-300 group animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="text-[#7db2ff] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">{benefit.icon}</div>
                    <h3 className="font-semibold group-hover:text-[#7db2ff] transition-colors">{benefit.title}</h3>
                    <p className="text-slate-400 text-sm">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="glass-card-strong p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Processos Ativos</span>
                    <span className="text-2xl font-bold">47</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-[#7db2ff] to-[#2d6cdf] rounded-full"></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Prazos no Mês</span>
                    <span className="text-2xl font-bold">128</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full"></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Taxa de Cumprimento</span>
                    <span className="text-2xl font-bold">98.5%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[98.5%] bg-gradient-to-r from-[#eab308] to-[#ca8a04] rounded-full"></div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-[#22c55e]" />
                      <span className="text-[#22c55e]">+23%</span>
                      <span className="text-slate-400">de produtividade este mês</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos e Preços */}
      <section id="precos" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-radial opacity-30"></div>
        <div className="absolute left-0 top-1/2 w-[450px] h-[450px] bg-[#7db2ff]/5 rounded-full blur-3xl -translate-y-1/2"></div>
        <div className="absolute right-0 top-1/3 w-[350px] h-[350px] bg-[#2d6cdf]/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planos e Preços</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Escolha o plano que melhor se adapta às suas necessidades
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`glass-card p-8 hover-lift transition-all duration-300 animate-fade-in flex flex-col h-full ${plan.highlighted ? 'border-[#7db2ff]/50 ring-1 ring-[#7db2ff]/30 hover:ring-[#7db2ff]/50' : ''}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {plan.highlighted && (
                  <div className="inline-block px-3 py-1 rounded-full bg-[#7db2ff]/20 text-[#7db2ff] text-xs font-medium mb-4">
                    Mais Popular
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {plan.external ? (
                  <a 
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(plan.whatsappMsg || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-3 rounded-xl font-medium text-center transition-all mt-auto ${plan.highlighted ? 'btn-primary' : 'glass-button'}`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link 
                    to={plan.href}
                    className={`block w-full py-3 rounded-xl font-medium text-center transition-all mt-auto ${plan.highlighted ? 'btn-primary' : 'glass-button'}`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-radial opacity-20"></div>
        <div className="absolute left-0 top-1/4 w-[400px] h-[400px] bg-[#7db2ff]/5 rounded-full blur-3xl"></div>
        <div className="absolute right-0 bottom-1/4 w-[300px] h-[300px] bg-[#2d6cdf]/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Dúvidas Frequentes</h2>
            <p className="text-slate-400">Tudo que você precisa saber sobre o JurisPocket</p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: 'Posso migrar meus dados de outro sistema?',
                a: 'Sim! Oferecemos importação completa de planilhas Excel e CSV. Nossa equipe pode ajudar na migração sem custo adicional para planos Pro e Escritório.'
              },
              {
                q: 'O sistema é seguro? Meus dados estão protegidos?',
                a: 'Absolutamente. Utilizamos criptografia AES-256, servidores no Brasil (LGPD compliant) e backups automáticos diários. Seus dados nunca são compartilhados com terceiros.'
              },
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim, não temos fidelidade. Você pode cancelar quando quiser diretamente no painel, sem burocracia. Seus dados ficam disponíveis para exportação por 30 dias após o cancelamento.'
              },
              {
                q: 'Como funciona o monitoramento do DataJud?',
                a: 'O sistema consulta automaticamente a API pública do CNJ para seus processos cadastrados. Quando há novas movimentações, você recebe notificação por email e WhatsApp (se configurado).'
              },
              {
                q: 'Posso usar em múltiplos dispositivos?',
                a: 'Sim, o JurisPocket é 100% web e responsivo. Acesse do seu computador, tablet ou celular. Temos também PWA para instalar como app no celular.'
              },
              {
                q: 'Qual a diferença entre o plano Pro e Escritório?',
                a: 'O plano Pro é ideal para advogados individuais (1 usuário). O Escritório permite até 10 usuários, tem recursos de colaboração em equipe, trilha de auditoria e suporte prioritário.'
              }
            ].map((faq, index) => (
              <div 
                key={index}
                className="glass-card overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-[#7db2ff] flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-slate-400 mb-4">Ainda tem dúvidas?</p>
            <a 
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Tenho algumas dúvidas sobre o JurisPocket e gostaria de mais informações.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#7db2ff] hover:text-[#2d6cdf] transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Fale com nosso time
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7db2ff]/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="glass-card-strong p-12 text-center relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#7db2ff]/10 to-transparent"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#7db2ff]/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#2d6cdf]/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para organizar sua prática jurídica?
              </h2>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                Comece gratuitamente hoje e descubra como o JurisPocket pode 
                transformar a forma como você gerencia seus processos.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn-primary px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
                  Começar Gratuitamente
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA Button */}
      {showStickyCta && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <Link 
            to="/register"
            className="btn-primary px-6 py-3 rounded-full shadow-lg shadow-blue-500/25 flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Zap className="w-5 h-5" />
            Começar Grátis
          </Link>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 relative">
        {/* Background decoration sutil */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#7db2ff]/5 to-transparent"></div>
        <div className="absolute left-1/4 bottom-0 w-[300px] h-[200px] bg-[#2d6cdf]/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7db2ff] to-[#2d6cdf] flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">Juris<span className="text-[#7db2ff]">Pocket</span></span>
              </Link>
              <p className="text-slate-400 text-sm max-w-sm">
                Sistema moderno de gestão de processos e prazos jurídicos. 
                Desenvolvido para advogados que valorizam organização e eficiência.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button onClick={() => scrollToSection('funcionalidades')} className="hover:text-white transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('precos')} className="hover:text-white transition-colors">Preços</button></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Cadastrar</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Tenho interesse no JurisPocket e gostaria de mais informações.')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contato</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="section-divider mb-8"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© 2024 JurisPocket. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <Lock className="w-4 h-4" />
              <span>Segurança garantida</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Componente auxiliar
const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
)

export default LandingPage
