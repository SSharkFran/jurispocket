import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Scale, Calendar, Clock, AlertCircle, Loader2, FileText } from 'lucide-react'

interface Processo {
  id: number
  numero: string
  titulo: string
  cliente: string
  status: string
  descricao: string
  comarca: string
  vara: string
  data_abertura: string
  workspace_nome: string
}

interface Prazo {
  titulo: string
  data_prazo: string
  status: string
  prioridade: string
}

const PortalCliente = () => {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processo, setProcesso] = useState<Processo | null>(null)
  const [prazos, setPrazos] = useState<Prazo[]>([])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/status_cliente/${token}`)
        const data = await response.json()

        if (response.ok) {
          setProcesso(data.processo)
          setPrazos(data.prazos)
        } else {
          setError(data.message || 'Processo não encontrado')
        }
      } catch (err) {
        setError('Erro de conexão com o servidor')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [token])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'concluido':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'arquivado':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Em Andamento'
      case 'concluido':
        return 'Concluído'
      case 'arquivado':
        return 'Arquivado'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1217] flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-radial opacity-50"></div>
        <div className="relative">
          <Loader2 className="w-10 h-10 text-[#7db2ff] animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1217] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gradient-radial opacity-50"></div>
        <div className="relative text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Link inválido</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link to="/" className="btn-primary px-6 py-3 rounded-xl inline-block">
            Voltar para o início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1217]">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-radial opacity-50"></div>
      <div className="fixed top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#7db2ff]/10 blur-3xl sm:h-96 sm:w-96"></div>

      {/* Header */}
      <header className="relative border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7db2ff] to-[#2d6cdf] flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Juris<span className="text-[#7db2ff]">Pocket</span></span>
            </Link>
            <div className="text-sm text-slate-400">
              Portal do Cliente
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {processo && (
          <div className="space-y-6">
            {/* Processo Header */}
            <div className="glass-card-strong p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Processo nº {processo.numero}</p>
                  <h1 className="text-2xl font-bold">{processo.titulo}</h1>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(processo.status)}`}>
                  {getStatusLabel(processo.status)}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Cliente</p>
                  <p className="font-medium">{processo.cliente}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Comarca</p>
                  <p className="font-medium">{processo.comarca || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Vara</p>
                  <p className="font-medium">{processo.vara || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Data de Abertura</p>
                  <p className="font-medium">{formatDate(processo.data_abertura)}</p>
                </div>
              </div>
            </div>

            {/* Descrição */}
            {processo.descricao && (
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-[#7db2ff]" />
                  <h2 className="font-semibold">Sobre o Processo</h2>
                </div>
                <p className="text-slate-300">{processo.descricao}</p>
              </div>
            )}

            {/* Prazos */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-[#7db2ff]" />
                <h2 className="font-semibold">Prazos em Andamento</h2>
              </div>

              {prazos.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum prazo pendente no momento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prazos.map((prazo, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                      <div className={`w-2 h-2 rounded-full ${
                        prazo.prioridade === 'urgente' ? 'bg-red-500' :
                        prazo.prioridade === 'alta' ? 'bg-orange-500' :
                        prazo.prioridade === 'media' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium">{prazo.titulo}</p>
                        <p className="text-sm text-slate-400">
                          Prazo: {formatDate(prazo.data_prazo)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        prazo.prioridade === 'urgente' ? 'bg-red-500/20 text-red-400' :
                        prazo.prioridade === 'alta' ? 'bg-orange-500/20 text-orange-400' :
                        prazo.prioridade === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {prazo.prioridade === 'urgente' ? 'Urgente' :
                         prazo.prioridade === 'alta' ? 'Alta' :
                         prazo.prioridade === 'media' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="text-center text-sm text-slate-500 pt-8">
              <p>Processo gerenciado por <span className="text-slate-300">{processo.workspace_nome}</span></p>
              <p className="mt-2">Este é um link seguro e exclusivo para acompanhamento do processo.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PortalCliente
