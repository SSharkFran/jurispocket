import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  LayoutDashboard,
  Users,
  FolderOpen,
  Clock,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/clientes', icon: Users, label: 'Clientes' },
  { path: '/app/processos', icon: FolderOpen, label: 'Processos' },
  { path: '/app/prazos', icon: Clock, label: 'Prazos' },
  { path: '/app/tarefas', icon: ListTodo, label: 'Tarefas' },
  { path: '/app/financeiro', icon: DollarSign, label: 'Financeiro' },
  { path: '/app/documentos', icon: FileText, label: 'Documentos' },
  { divider: true, label: 'Inteligência' },
  { path: '/app/datajud', icon: Globe, label: 'Datajud', highlight: true },
  { path: '/app/ia', icon: Bot, label: 'Copiloto IA', highlight: true },
  { path: '/app/whatsapp', icon: MessageSquare, label: 'WhatsApp', highlight: true },
  { divider: true, label: 'Sistema' },
  { path: '/app/equipe', icon: Users, label: 'Equipe' },
  { path: '/app/configuracoes', icon: Settings, label: 'Configurações' },
  { path: '/app/admin', icon: Shield, label: 'Super Admin' },
] as const;

const AppLayout = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border/50">
        <Scale className="h-7 w-7 text-primary shrink-0" />
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold">
            JurisPocket
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item, i) => {
          if ('divider' in item && item.divider) {
            return !collapsed ? (
              <div key={i} className="pt-4 pb-2 px-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{item.label}</span>
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                active ? 'nav-active font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              } ${('highlight' in item && item.highlight && !active) ? 'text-primary/70' : ''}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm shrink-0">
            {user?.nome?.charAt(0).toUpperCase() || 'U'}
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
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-sidebar">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar processos, clientes..."
                className="h-9 w-64 rounded-lg bg-secondary border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </Button>
            <span className="feature-badge text-[10px]">Pro</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
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
