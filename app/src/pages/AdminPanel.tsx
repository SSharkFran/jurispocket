import { useState, useEffect } from 'react'
import {
  Shield,
  Users,
  Building2,
  Settings,
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
  Edit,
  Save
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Usuario {
  id: number
  nome: string
  email: string
  workspace_id: number
  workspace_nome: string
  plano: string
  is_admin: boolean
  ativo: boolean
  created_at: string
}

interface Workspace {
  id: number
  nome: string
  plano: string
  owner_nome: string
  total_usuarios: number
  total_processos: number
  created_at: string
}

interface Config {
  id: number
  chave: string
  valor: string
  updated_at: string
}

interface Estatisticas {
  total_usuarios: number
  total_workspaces: number
  total_processos: number
  total_prazos: number
  distribuicao_planos: Record<string, number>
}

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [configs, setConfigs] = useState<Config[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState<Config | null>(null)
  const [configValue, setConfigValue] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      // Fetch all data in parallel
      const [usuariosRes, workspacesRes, configsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/usuarios', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/admin/workspaces', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/admin/configuracoes', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/admin/estatisticas', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (usuariosRes.ok) setUsuarios(await usuariosRes.json())
      if (workspacesRes.ok) setWorkspaces(await workspacesRes.json())
      if (configsRes.ok) setConfigs(await configsRes.json())
      if (statsRes.ok) setEstatisticas(await statsRes.json())
    } catch (error) {
      console.error('Erro ao buscar dados admin:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePlano = async (workspaceId: number, novoPlano: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`http://localhost:5000/api/admin/workspaces/${workspaceId}/plano`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plano: novoPlano })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Erro ao atualizar plano:', error)
    }
  }

  const updateConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingConfig) return

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`http://localhost:5000/api/admin/configuracoes/${editingConfig.chave}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ valor: configValue })
      })

      if (response.ok) {
        setEditingConfig(null)
        fetchData()
      }
    } catch (error) {
      console.error('Erro ao atualizar config:', error)
    }
  }

  const openEditConfig = (config: Config) => {
    setEditingConfig(config)
    setConfigValue(config.valor)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  const getPlanoColor = (plano: string) => {
    switch (plano) {
      case 'escritorio':
        return 'bg-purple-500/20 text-purple-400'
      case 'pro':
        return 'bg-[#7db2ff]/20 text-[#7db2ff]'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-[#7db2ff] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-slate-400">Gerenciamento global do sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'usuarios', label: 'Usuários', icon: Users },
          { id: 'workspaces', label: 'Workspaces', icon: Building2 },
          { id: 'configuracoes', label: 'Configurações', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#7db2ff]/20 text-[#7db2ff]'
                  : 'glass-button'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && estatisticas && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <p className="text-slate-400 text-sm mb-1">Total de Usuários</p>
              <p className="text-3xl font-bold">{estatisticas.total_usuarios}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-slate-400 text-sm mb-1">Workspaces</p>
              <p className="text-3xl font-bold">{estatisticas.total_workspaces}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-slate-400 text-sm mb-1">Processos</p>
              <p className="text-3xl font-bold">{estatisticas.total_processos}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-slate-400 text-sm mb-1">Prazos</p>
              <p className="text-3xl font-bold">{estatisticas.total_prazos}</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Distribuição de Planos</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {Object.entries(estatisticas.distribuicao_planos).map(([plano, count]) => (
                <div key={plano} className="p-4 rounded-xl bg-white/5">
                  <p className="text-slate-400 text-sm capitalize">{plano}</p>
                  <p className="text-2xl font-bold">{count as number}</p>
                  <p className="text-xs text-slate-500">
                    {((count as number) / estatisticas.total_workspaces * 100).toFixed(1)}% dos workspaces
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usuarios Tab */}
      {activeTab === 'usuarios' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Usuário</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Workspace</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Plano</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Admin</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <p className="font-medium">{usuario.nome}</p>
                      <p className="text-sm text-slate-400">{usuario.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{usuario.workspace_nome}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanoColor(usuario.plano)}`}>
                        {usuario.plano}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {usuario.is_admin ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(usuario.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workspaces Tab */}
      {activeTab === 'workspaces' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Workspace</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Proprietário</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Plano</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Membros</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Processos</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((workspace) => (
                  <tr key={workspace.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <p className="font-medium">{workspace.nome}</p>
                      <p className="text-sm text-slate-400">{formatDate(workspace.created_at)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{workspace.owner_nome}</td>
                    <td className="px-6 py-4">
                      <select
                        value={workspace.plano}
                        onChange={(e) => updatePlano(workspace.id, e.target.value)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${getPlanoColor(workspace.plano)}`}
                      >
                        <option value="gratuito">Gratuito</option>
                        <option value="pro">Pro</option>
                        <option value="escritorio">Escritório</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">{workspace.total_usuarios}</td>
                    <td className="px-6 py-4 text-sm">{workspace.total_processos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuracoes Tab */}
      {activeTab === 'configuracoes' && (
        <div className="space-y-4">
          {configs.map((config) => (
            <div key={config.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{config.chave.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-400">{config.valor}</p>
              </div>
              <button
                onClick={() => openEditConfig(config)}
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Config Modal */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent className="glass-card-strong border-white/10">
          <DialogHeader>
            <DialogTitle>Editar Configuração</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateConfig} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 capitalize">
                {editingConfig?.chave.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className="w-full glass-input px-4 py-3 rounded-xl"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingConfig(null)}
                className="flex-1 glass-button py-3 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary py-3 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Salvar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminPanel
