import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Scale,
  LayoutDashboard,
  FolderOpen,
  Calendar,
  FileText,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  UserCircle,
  DollarSign
} from 'lucide-react'

interface PrivateLayoutProps {
  children: React.ReactNode
}

interface Notificacao {
  id: number
  titulo: string
  mensagem: string
  tipo: string
  lida: boolean
  created_at: string
  link?: string
}

const PrivateLayout = ({ children }: PrivateLayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notificacao[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('http://localhost:5000/api/notificacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notificacoes)
        setUnreadCount(data.nao_lidas)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    }
  }

  const markAsRead = async (id: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch(`http://localhost:5000/api/notificacoes/${id}/ler`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, lida: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar notificação:', error)
    }
  }

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch('http://localhost:5000/api/notificacoes/ler-todas', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Erro ao marcar todas notificações:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/processos', label: 'Processos', icon: FolderOpen },
    { path: '/clientes', label: 'Clientes', icon: UserCircle },
    { path: '/prazos', label: 'Prazos', icon: Calendar },
    { path: '/financeiro', label: 'Financeiro', icon: DollarSign },
    { path: '/documentos', label: 'Documentos', icon: FileText },
    { path: '/templates', label: 'Templates', icon: FileText },
    { path: '/equipe', label: 'Equipe', icon: Users },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ]

  if (user?.is_admin) {
    menuItems.push({ path: '/admin', label: 'Admin', icon: Shield })
  }

  const isActive = (path: string) => {
    if (path === '/processos' && location.pathname.startsWith('/processos/')) {
      return true
    }
    return location.pathname === path
  }

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <Bell className="w-5 h-5 text-blue-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Agora'
    if (hours < 24) return `${hours}h atrás`
    if (days < 7) return `${days}d atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        w-64 flex-shrink-0 bg-sidebar border-r border-border/50
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-border/50">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gradient">JurisPocket</span>
                {user && (
                  <p className="text-xs text-slate-400 capitalize">{user.plano}</p>
                )}
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${active 
                      ? 'nav-active font-medium' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-border/50">
            {user && (
              <div className="mb-4 px-4">
                <p className="text-sm font-medium text-foreground truncate">{user.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-sidebar/90 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card-strong z-50 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <h3 className="font-semibold">Notificações</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-[#7db2ff] hover:underline"
                          >
                            Marcar todas como lidas
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">Nenhuma notificação</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.lida) markAsRead(notif.id)
                                if (notif.link) navigate(notif.link)
                                setNotificationsOpen(false)
                              }}
                              className={`
                                p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors
                                ${!notif.lida ? 'bg-[#7db2ff]/5' : ''}
                              `}
                            >
                              <div className="flex items-start gap-3">
                                {getNotificationIcon(notif.tipo)}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${!notif.lida ? 'text-white' : 'text-slate-300'}`}>
                                    {notif.titulo}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {notif.mensagem}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(notif.created_at)}
                                  </p>
                                </div>
                                {!notif.lida && (
                                  <div className="w-2 h-2 bg-[#7db2ff] rounded-full flex-shrink-0 mt-1" />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default PrivateLayout
