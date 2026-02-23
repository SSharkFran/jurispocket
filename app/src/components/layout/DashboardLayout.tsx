import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Briefcase,
  Users,
  CheckSquare,
  Calendar,
  DollarSign,
  Settings,
  UserPlus,
  Menu,
  LogOut,
  Bell,
  ChevronDown,
  Gavel,
  FileText,
  FileCode,
  Crown,
} from 'lucide-react';
import { notificacoes } from '@/services/api';
import { toast } from 'sonner';

const getNavItems = (isSuperAdmin: boolean) => [
  { path: '/', label: 'Dashboard', icon: Briefcase },
  { path: '/processos', label: 'Processos', icon: Gavel },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { path: '/prazos', label: 'Prazos', icon: Calendar },
  { path: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { path: '/documentos', label: 'Documentos', icon: FileText },
  { path: '/templates', label: 'Templates', icon: FileCode },
  { path: '/equipe', label: 'Equipe', icon: UserPlus },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ...(isSuperAdmin ? [{ path: '/admin', label: 'Super Admin', icon: Crown }] : []),
];

export function DashboardLayout() {
  const { user, workspace, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificacoesList, setNotificacoesList] = useState<any[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  // Buscar notificações
  useEffect(() => {
    const loadNotificacoes = async () => {
      try {
        const response = await notificacoes.list();
        setNotificacoesList(response.data.notificacoes || []);
        setNaoLidas(response.data.nao_lidas || 0);
      } catch (error) {
        console.log('Erro ao carregar notificações:', error);
      }
    };
    loadNotificacoes();
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const marcarLida = async (id: number) => {
    try {
      await notificacoes.marcarLida(id);
      setNotificacoesList(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      setNaoLidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log('Erro ao marcar como lida:', error);
    }
  };

  const marcarTodasLidas = async () => {
    try {
      await notificacoes.marcarTodasLidas();
      setNotificacoesList(prev => prev.map(n => ({ ...n, lida: true })));
      setNaoLidas(0);
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      console.log('Erro ao marcar todas como lidas:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">JurisPocket</h1>
            <p className="text-xs text-slate-400">{workspace?.nome}</p>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-1">
          {getNavItems(user?.role === 'superadmin').map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
          <Avatar className="w-10 h-10 border-2 border-cyan-500/30">
            <AvatarImage 
              src={user?.avatar_url ? `http://localhost:5000${user.avatar_url}` : undefined} 
              alt={user?.nome}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-sm">
              {user?.nome ? getInitials(user.nome) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 bg-slate-900/80 backdrop-blur-xl border-r border-white/10">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-r border-white/10">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-r border-white/10">
                  <NavContent />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center gap-3">
              {/* Notificações */}
              <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-slate-400 hover:text-white"
                  >
                    <Bell className="w-5 h-5" />
                    {naoLidas > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-slate-900 border-white/10">
                  <DropdownMenuLabel className="text-slate-300 flex items-center justify-between">
                    <span>Notificações</span>
                    {naoLidas > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={marcarTodasLidas}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Marcar todas como lidas
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <ScrollArea className="h-64">
                    {notificacoesList.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Nenhuma notificação
                      </div>
                    ) : (
                      notificacoesList.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          onClick={() => !notif.lida && marcarLida(notif.id)}
                          className={`flex flex-col items-start p-3 cursor-pointer ${
                            notif.lida ? 'opacity-60' : 'bg-slate-800/50'
                          }`}
                        >
                          <p className="text-sm text-white font-medium">{notif.titulo}</p>
                          <p className="text-xs text-slate-400">{notif.mensagem}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(notif.created_at).toLocaleString('pt-BR')}
                          </p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-slate-300 hover:text-white">
                    <Avatar className="w-8 h-8 border border-white/20">
                      <AvatarImage 
                        src={user?.avatar_url ? `http://localhost:5000${user.avatar_url}` : undefined} 
                        alt={user?.nome}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xs">
                        {user?.nome ? getInitials(user.nome) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">{user?.nome?.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10">
                  <DropdownMenuLabel className="text-slate-300">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => window.location.href = '/configuracoes'}
                    className="text-slate-300 focus:text-white focus:bg-white/10"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
