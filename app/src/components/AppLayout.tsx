import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  LayoutDashboard,
  Users,
  FolderOpen,
  ListTodo,
  DollarSign,
  FileText,
  Bot,
  Globe,
  MessageSquare,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Menu,
  X,
  Check,
  Trash2,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificacoes } from '@/services/api';
import { toast } from 'sonner';

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/clientes', icon: Users, label: 'Clientes' },
  { path: '/app/processos', icon: FolderOpen, label: 'Processos' },
  { path: '/app/tarefas', icon: ListTodo, label: 'Tarefas & Prazos' },
  { path: '/app/financeiro', icon: DollarSign, label: 'Financeiro' },
  { path: '/app/documentos', icon: FileText, label: 'Documentos' },
  { divider: true, label: 'Inteligência' },
  { path: '/app/datajud', icon: Globe, label: 'Datajud', highlight: true },
  { path: '/app/templates', icon: FileCode, label: 'Templates', highlight: true },
  { path: '/app/ia', icon: Bot, label: 'Copiloto IA', highlight: true },
  { path: '/app/whatsapp', icon: MessageSquare, label: 'WhatsApp', highlight: true },
  { divider: true, label: 'Sistema' },
  { path: '/app/equipe', icon: Users, label: 'Equipe' },
  { path: '/app/configuracoes', icon: Settings, label: 'Configurações' },
  { path: '/app/admin', icon: Shield, label: 'Super Admin' },
] as const;

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, workspace } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [listaNotificacoes, setListaNotificacoes] = useState<Notificacao[]>([]);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

  const availableNavItems = navItems.filter((item) => {
    if (!('path' in item)) return true;
    if (item.path === '/app/admin') return user?.role === 'superadmin';
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  // Carregar notificações
  const carregarNotificacoes = async () => {
    try {
      const response = await notificacoes.list();
      const notifs = response.data.notificacoes || response.data || [];
      setListaNotificacoes(notifs);
      setNotificacoesNaoLidas(notifs.filter((n: Notificacao) => !n.lida).length);
    } catch (error) {
      console.error('Erro ao carregar notificações');
    }
  };

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarcarLida = async (id: number) => {
    try {
      await notificacoes.marcarLida(id);
      carregarNotificacoes();
    } catch (error) {
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await notificacoes.marcarTodasLidas();
      carregarNotificacoes();
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar notificações');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const userInitials = user?.nome 
    ? user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const userAvatarUrl = user?.avatar_url ? `${API_BASE_URL}${user.avatar_url}` : '';

  useEffect(() => {
    setAvatarLoadError(false);
  }, [userAvatarUrl]);

  const formatPlano = (plano?: string) => {
    const codigo = (plano || '').toLowerCase();
    if (codigo === 'pro') return 'Pro';
    if (codigo === 'escritorio') return 'Escritório';
    if (codigo === 'enterprise') return 'Enterprise';
    if (codigo === 'gratuito' || codigo === 'free') return 'Gratuito';
    if (!plano) return 'Gratuito';
    return plano.charAt(0).toUpperCase() + plano.slice(1);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('pt-BR');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border/50 shrink-0">
        <Scale className="h-7 w-7 text-primary shrink-0" />
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold truncate">
            JurisPocket
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 min-w-0">
        {availableNavItems.map((item, i) => {
          if ('divider' in item && item.divider) {
            return !collapsed ? (
              <div key={i} className="pt-4 pb-2 px-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">{item.label}</span>
              </div>
            ) : (
              <div key={i} className="my-2 border-t border-border/30" />
            );
          }

          if (!('path' in item)) return null;

          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              title={item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 whitespace-nowrap ${
                active ? 'nav-active font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              } ${('highlight' in item && item.highlight && !active) ? 'text-primary/70' : ''}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border/50 p-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center text-primary font-medium text-sm shrink-0">
            {userAvatarUrl && !avatarLoadError ? (
              <img
                src={userAvatarUrl}
                alt={user?.nome || 'Avatar'}
                className="h-full w-full object-cover"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              userInitials
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nome || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] min-h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex flex-col border-r border-border/50 bg-sidebar shrink-0"
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 z-10 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
          style={{ left: collapsed ? 60 : 248 }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col border-r border-border/50 bg-sidebar lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-sidebar">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <form 
              className="relative hidden sm:block max-w-xs w-full"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/app/processos?search=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                }
              }}
            >
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar processos..."
                className="h-9 w-full rounded-lg bg-secondary border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Notificações */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setNotificacoesOpen(!notificacoesOpen)}
              >
                <Bell className="h-4 w-4" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>

              {/* Painel de Notificações */}
              <AnimatePresence>
                {notificacoesOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificacoesOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1rem))] glass-card z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-3 border-b border-border/50">
                        <span className="font-semibold text-sm">Notificações</span>
                        {notificacoesNaoLidas > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleMarcarTodasLidas}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar todas
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="max-h-80">
                        {listaNotificacoes.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma notificação
                          </p>
                        ) : (
                          <div className="divide-y divide-border/30">
                            {listaNotificacoes.map((n) => (
                              <div
                                key={n.id}
                                className={`p-3 hover:bg-secondary/30 transition-colors cursor-pointer ${
                                  !n.lida ? 'bg-primary/5' : ''
                                }`}
                                onClick={() => handleMarcarLida(n.id)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${!n.lida ? 'text-foreground' : 'text-muted-foreground'}`}>
                                      {n.titulo}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                                  </div>
                                  {!n.lida && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarcarLida(n.id);
                                      }}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <span className="feature-badge text-[10px]">{formatPlano(workspace?.plano)}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="safe-area-pb flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
