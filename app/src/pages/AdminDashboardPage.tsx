import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { whatsappPlatform } from '@/services/whatsapp';
import type { WhatsAppCampaign, WhatsAppPlatformConfig } from '@/services/whatsapp';
import { 
  Users, 
  Crown, 
  Shield, 
  Settings, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  Loader2,
  Search,
  LogIn,
  Trash2,
  Edit2,
  QrCode,
  Key,
  RefreshCw,
  DollarSign,
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Database,
  Upload,
  CheckCircle,
  Archive,
  CreditCard,
  Calendar,
  Receipt,
  Wallet,
  AlertCircle,
  Check,
  PowerOff,
  SendHorizontal
} from 'lucide-react';

interface Estatisticas {
  total_usuarios: number;
  usuarios_ativos: number;
  total_workspaces: number;
  total_processos: number;
  mrr: number;
  usuarios_recentes: number;
  distribuicao_planos: Array<{ nome: string; count: number }>;
  logs_recentes: Array<any>;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
  telefone?: string;
  created_at: string;
  workspace_id: number;
  workspace_nome?: string;
  plano_nome?: string;
  assinatura_status?: string;
}

interface Plano {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  preco_mensal: number;
  preco_anual: number;
  ativo: boolean;
}

interface Pagamento {
  id: number;
  assinatura_id: number;
  valor_pago: number;
  data_pagamento: string;
  mes_referencia: string;
  metodo_pagamento: string;
  status: string;
  comprovante_path?: string;
  observacoes?: string;
  registrado_por_nome?: string;
}

interface Assinatura {
  id: number;
  workspace_id: number;
  plano_id: number;
  status: string;
  ciclo: string;
  valor: number;
  data_inicio: string;
  data_renovacao?: string;
  workspace_nome: string;
  plano_nome: string;
  plano_codigo: string;
  preco_mensal: number;
  preco_anual: number;
  responsavel_nome?: string;
  responsavel_email?: string;
  total_usuarios: number;
  total_processos: number;
  pagamentos: Pagamento[];
  pago_mes_atual: boolean;
}

interface ResumoAssinaturas {
  total_assinaturas_ativas: number;
  total_recebido_mes: number;
  quantidade_pagamentos_mes: number;
  assinaturas_pendentes_mes: number;
  mrr: number;
  mes_referencia: string;
}

interface Configuracao {
  chave: string;
  valor: string;
  descricao: string;
  updated_at: string;
}

interface AuditLog {
  id: number;
  user_nome: string;
  user_email: string;
  acao: string;
  entidade: string;
  created_at: string;
  ip_address: string;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se é super admin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      toast.error('Acesso restrito a Super Administradores');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const response = await api.get('/admin/estatisticas');
      setEstatisticas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-16 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Crown className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
              <p className="text-xs text-muted-foreground">Painel de Controle Global</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="border-border text-foreground">
            Voltar ao Sistema
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-border/60 bg-card/70 min-h-[calc(100vh-80px)] backdrop-blur">
          <nav className="p-4 space-y-2">
            <SidebarItem 
              icon={<TrendingUp className="w-4 h-4" />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <SidebarItem 
              icon={<Users className="w-4 h-4" />} 
              label="Usuários" 
              active={activeTab === 'usuarios'}
              onClick={() => setActiveTab('usuarios')}
            />
            <SidebarItem 
              icon={<DollarSign className="w-4 h-4" />} 
              label="Planos" 
              active={activeTab === 'planos'}
              onClick={() => setActiveTab('planos')}
            />
            <SidebarItem 
              icon={<CreditCard className="w-4 h-4" />} 
              label="Gestão de Assinaturas" 
              active={activeTab === 'assinaturas'}
              onClick={() => setActiveTab('assinaturas')}
            />
            <SidebarItem 
              icon={<Settings className="w-4 h-4" />} 
              label="Configurações" 
              active={activeTab === 'configuracoes'}
              onClick={() => setActiveTab('configuracoes')}
            />
            <SidebarItem 
              icon={<Shield className="w-4 h-4" />} 
              label="Auditoria" 
              active={activeTab === 'auditoria'}
              onClick={() => setActiveTab('auditoria')}
            />
            <SidebarItem 
              icon={<Database className="w-4 h-4" />} 
              label="Backup" 
              active={activeTab === 'backup'}
              onClick={() => setActiveTab('backup')}
            />
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8">
          {activeTab === 'dashboard' && <DashboardTab estatisticas={estatisticas} />}
          {activeTab === 'usuarios' && <UsuariosTab />}
          {activeTab === 'planos' && <PlanosTab />}
          {activeTab === 'configuracoes' && <ConfiguracoesTab />}
          {activeTab === 'auditoria' && <AuditoriaTab />}
          {activeTab === 'backup' && <BackupTab />}
          {activeTab === 'assinaturas' && <AssinaturasTab />}
        </main>
      </div>
    </div>
  );
}

// ==================== BACKUP TAB ====================
function BackupTab() {
  const [carregando, setCarregando] = useState(false);
  const [backupInfo, setBackupInfo] = useState<any>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [verificacao, setVerificacao] = useState<any>(null);
  const [modoRestauracao, setModoRestauracao] = useState<'replace' | 'merge'>('replace');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [resultadoRestauracao, setResultadoRestauracao] = useState<any>(null);

  useEffect(() => {
    carregarInfoBackup();
  }, []);

  const carregarInfoBackup = async () => {
    try {
      const response = await api.get('/admin/backup/automatico');
      setBackupInfo(response.data);
    } catch (error) {
      console.log('Erro ao carregar info de backup');
    }
  };

  const handleExportarBackup = async () => {
    setCarregando(true);
    try {
      const response = await api.get('/admin/backup', {
        responseType: 'blob'
      });
      
      // Criar link para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `jurispocket_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Backup exportado com sucesso!');
      carregarInfoBackup();
    } catch (error) {
      toast.error('Erro ao exportar backup');
    } finally {
      setCarregando(false);
    }
  };

  const handleVerificarArquivo = async () => {
    if (!arquivoSelecionado) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    const formData = new FormData();
    formData.append('arquivo', arquivoSelecionado);

    try {
      const response = await api.post('/admin/backup/verificar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVerificacao(response.data);
      toast.success('Arquivo verificado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao verificar arquivo');
    }
  };

  const handleRestaurar = async () => {
    if (!arquivoSelecionado || !verificacao?.valido) return;

    setCarregando(true);
    try {
      const conteudo = await arquivoSelecionado.text();
      const backup = JSON.parse(conteudo);

      const response = await api.post('/admin/backup/restaurar', {
        backup,
        opcoes: {
          modo: modoRestauracao,
          tabelas: [] // Todas as tabelas
        }
      });

      setResultadoRestauracao(response.data);
      toast.success('Backup restaurado com sucesso!');
      setShowRestoreDialog(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao restaurar backup');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Backup e Restauração</h2>

      {/* Cards de Ação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exportar Backup */}
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Exportar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Exporte todos os dados do sistema em formato JSON. 
              O arquivo inclui workspaces, usuários, processos, clientes e todas as configurações.
            </p>
            
            {backupInfo?.ultimo_backup && (
              <div className="p-3 bg-secondary/40 rounded-lg">
                <p className="text-muted-foreground text-xs">Último backup:</p>
                <p className="text-foreground text-sm">
                  {new Date(backupInfo.ultimo_backup.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  por {backupInfo.ultimo_backup.user_nome}
                </p>
              </div>
            )}

            <Button 
              onClick={handleExportarBackup} 
              disabled={carregando}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {carregando ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              {carregando ? 'Gerando...' : 'Gerar Backup Agora'}
            </Button>
          </CardContent>
        </Card>

        {/* Restaurar Backup */}
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              Restaurar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Restaure dados de um arquivo de backup anterior. 
              <strong className="text-amber-400"> Atenção:</strong> Esta ação não pode ser desfeita!
            </p>

            <div className="space-y-3">
              <Input
                type="file"
                accept=".json"
                onChange={(e) => {
                  setArquivoSelecionado(e.target.files?.[0] || null);
                  setVerificacao(null);
                  setResultadoRestauracao(null);
                }}
                className="bg-secondary border-border file:text-foreground"
              />

              <div className="space-y-2">
                <Label>Modo de restauração</Label>
                <Select
                  value={modoRestauracao}
                  onValueChange={(v) => setModoRestauracao((v as 'replace' | 'merge') || 'replace')}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="replace">Replace (limpa dados atuais)</SelectItem>
                    <SelectItem value="merge">Merge (mescla sem limpar)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {modoRestauracao === 'replace'
                    ? 'Recomendado para recuperar ambiente apos duplicacoes: limpa os dados e restaura o snapshot.'
                    : 'Mantem os dados atuais e mescla com o backup. Use quando quiser complementar dados.'}
                </p>
              </div>
              
              {arquivoSelecionado && (
                <Button 
                  variant="outline" 
                  onClick={handleVerificarArquivo}
                  className="w-full border-border"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verificar Arquivo
                </Button>
              )}
            </div>

            {verificacao?.valido && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Arquivo válido!</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Exportado em: {new Date(verificacao.data_exportacao).toLocaleString('pt-BR')}
                </p>
                <p className="text-muted-foreground text-sm">
                  Por: {verificacao.exportado_por}
                </p>
                <p className="text-muted-foreground text-sm">
                  Total de registros: {verificacao.total_registros}
                </p>
                <Button 
                  onClick={() => setShowRestoreDialog(true)}
                  className="w-full mt-3 bg-amber-600 hover:bg-amber-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Iniciar Restauração
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dicas de Segurança */}
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Boas Práticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Faça backup regularmente, pelo menos uma vez por semana
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Armazene os backups em local seguro fora do servidor
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Teste a restauração periodicamente para garantir que funciona
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              Sempre faça backup antes de grandes operações ou atualizações
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Resultado da Restauração */}
      {resultadoRestauracao && (
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Resultado da Restauração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(resultadoRestauracao.resultados).map(([tabela, resultado]: [string, any]) => (
                <div key={tabela} className="flex items-center justify-between p-2 bg-secondary/40 rounded">
                  <span className="text-foreground capitalize">{tabela}</span>
                  <Badge 
                    variant="outline" 
                    className={resultado.status === 'sucesso' ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'}
                  >
                    {resultado.importados !== undefined 
                      ? `${resultado.importados} importados${resultado.atualizados ? `, ${resultado.atualizados} atualizados` : ''}` 
                      : resultado.mensagem}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Restauração
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-foreground">
              Você está prestes a restaurar <strong>{verificacao?.total_registros}</strong> registros de um backup.
            </p>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                <strong>Atenção:</strong>{' '}
                {modoRestauracao === 'replace'
                  ? 'Esta operação irá limpar os dados atuais das tabelas restauradas e substituir pelo backup.'
                  : 'Esta operação irá mesclar os dados do backup com os dados existentes.'}{' '}
                Recomendamos fazer um backup atual antes de prosseguir.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button 
              onClick={handleRestaurar}
              disabled={carregando}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {carregando ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Confirmar Restauração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active 
          ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm shadow-primary/10' 
          : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab({ estatisticas }: { estatisticas: Estatisticas | null }) {
  if (!estatisticas) return null;

  const cards = [
    { icon: Users, label: 'Total de Usuários', value: estatisticas.total_usuarios, color: 'text-primary', bg: 'bg-primary/20' },
    { icon: DollarSign, label: 'Receita Mensal (MRR)', value: `R$ ${estatisticas.mrr.toFixed(2)}`, color: 'text-green-400', bg: 'bg-green-500/20' },
    { icon: Activity, label: 'Usuários Ativos', value: estatisticas.usuarios_ativos, color: 'text-accent', bg: 'bg-accent/20' },
    { icon: TrendingUp, label: 'Novos (30 dias)', value: estatisticas.usuarios_recentes, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="glass-card border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Plano */}
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {estatisticas.distribuicao_planos.map((plano) => (
                <div key={plano.nome} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                  <span className="text-foreground">{plano.nome}</span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {plano.count} usuários
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs Recentes */}
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {estatisticas.logs_recentes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
                ) : (
                  estatisticas.logs_recentes.map((log: any) => (
                    <div key={log.id} className="p-3 bg-secondary/40 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">{log.acao}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {log.user_nome} • {log.entidade}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== USUÁRIOS TAB ====================
function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPlanoDialog, setShowPlanoDialog] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState('');
  const [cicloSelecionado, setCicloSelecionado] = useState('mensal');

  useEffect(() => {
    carregarUsuarios();
    carregarPlanos();
  }, [page, search]);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/usuarios', {
        params: { search, page, per_page: 20 }
      });
      setUsuarios(response.data.usuarios);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const carregarPlanos = async () => {
    try {
      const response = await api.get('/admin/planos');
      setPlanos(response.data);
    } catch (error) {
      console.error('Erro ao carregar planos');
    }
  };

  const handleAlterarPlano = async () => {
    if (!usuarioSelecionado || !planoSelecionado) return;
    try {
      const plano = planos.find(p => p.id === Number(planoSelecionado));
      await api.post('/admin/assinaturas', {
        workspace_id: usuarioSelecionado.workspace_id,
        plano_id: Number(planoSelecionado),
        ciclo: cicloSelecionado,
        valor: cicloSelecionado === 'anual' ? plano?.preco_anual : plano?.preco_mensal
      });
      toast.success('Plano alterado com sucesso!');
      setShowPlanoDialog(false);
      carregarUsuarios();
    } catch (error) {
      toast.error('Erro ao alterar plano');
    }
  };

  const handleImpersonate = async (userId: number) => {
    try {
      const response = await api.post(`/admin/impersonate/${userId}`);
      const { token, user } = response.data;
      
      // Salvar token atual do admin
      const adminToken = localStorage.getItem('token');
      localStorage.setItem('admin_token_backup', adminToken || '');
      
      // Substituir pelo token do usuário
      localStorage.setItem('token', token);
      toast.success(`Logado como ${user.nome}`);
      window.location.href = '/';
    } catch (error) {
      toast.error('Erro ao impersonar usuário');
    }
  };

  const handleUpdateUsuario = async (data: Partial<Usuario>) => {
    if (!usuarioSelecionado) return;
    try {
      await api.put(`/admin/usuarios/${usuarioSelecionado.id}`, data);
      toast.success('Usuário atualizado com sucesso!');
      setShowEditDialog(false);
      carregarUsuarios();
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleResetSenha = async (senha: string) => {
    if (!usuarioSelecionado) return;
    try {
      const response = await api.post(`/admin/usuarios/${usuarioSelecionado.id}/reset-senha`, { senha });
      toast.success(`Senha resetada! Nova senha: ${response.data.senha_temporaria}`);
      setShowResetDialog(false);
    } catch (error) {
      toast.error('Erro ao resetar senha');
    }
  };

  const handleDeleteUsuario = async () => {
    if (!usuarioSelecionado) return;
    try {
      await api.delete(`/admin/usuarios/${usuarioSelecionado.id}`);
      toast.success('Usuário desativado com sucesso!');
      setShowDeleteDialog(false);
      carregarUsuarios();
    } catch (error) {
      toast.error('Erro ao desativar usuário');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      superadmin: 'bg-accent/20 text-accent border-accent/30',
      admin: 'bg-primary/20 text-primary border-primary/30',
      user: 'bg-secondary/60 text-muted-foreground border-border/30',
      inativo: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[role] || styles.user;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button onClick={carregarUsuarios} variant="outline" className="border-border">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card className="glass-card border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Plano</TableHead>
                <TableHead className="text-muted-foreground">Função</TableHead>
                <TableHead className="text-muted-foreground">Cadastro</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id} className="border-border">
                    <TableCell className="text-foreground">{usuario.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {usuario.plano_nome || 'Gratuito'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadge(usuario.role)}>
                        {usuario.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImpersonate(usuario.id)}
                          className="text-primary hover:text-primary"
                          title="Login como usuário"
                        >
                          <LogIn className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { 
                            setUsuarioSelecionado(usuario); 
                            setPlanoSelecionado('');
                            setShowPlanoDialog(true); 
                          }}
                          className="text-emerald-400 hover:text-emerald-300"
                          title="Alterar Plano"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setUsuarioSelecionado(usuario); setShowEditDialog(true); }}
                          className="text-amber-400 hover:text-amber-300"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setUsuarioSelecionado(usuario); setShowResetDialog(true); }}
                          className="text-accent hover:text-accent"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setUsuarioSelecionado(usuario); setShowDeleteDialog(true); }}
                          className="text-red-400 hover:text-red-300"
                          disabled={usuario.role === 'superadmin'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="border-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="border-border"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {usuarioSelecionado && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input 
                  defaultValue={usuarioSelecionado.nome}
                  onChange={(e) => usuarioSelecionado.nome = e.target.value}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  defaultValue={usuarioSelecionado.email}
                  onChange={(e) => usuarioSelecionado.email = e.target.value}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label>Função</Label>
                <Select 
                  defaultValue={usuarioSelecionado.role}
                  onValueChange={(v) => usuarioSelecionado.role = v}
                >
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button 
              onClick={() => handleUpdateUsuario({
                nome: usuarioSelecionado?.nome,
                email: usuarioSelecionado?.email,
                role: usuarioSelecionado?.role
              })}
              className="bg-primary hover:bg-primary/90"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Alterar Plano */}
      <Dialog open={showPlanoDialog} onOpenChange={setShowPlanoDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Alterar Plano do Usuário
            </DialogTitle>
          </DialogHeader>
          {usuarioSelecionado && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-muted-foreground text-sm">Usuário</p>
                <p className="text-foreground font-medium">{usuarioSelecionado.nome}</p>
                <p className="text-muted-foreground text-sm">{usuarioSelecionado.email}</p>
              </div>
              
              <div>
                <Label>Plano Atual</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {usuarioSelecionado.plano_nome || 'Gratuito'}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Novo Plano *</Label>
                <Select 
                  value={planoSelecionado} 
                  onValueChange={setPlanoSelecionado}
                >
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    {planos.map((plano) => (
                      <SelectItem key={plano.id} value={plano.id.toString()}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{plano.nome}</span>
                          <span className="text-muted-foreground text-sm">
                            R$ {plano.preco_mensal?.toFixed(2)}/mês
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ciclo de Cobrança</Label>
                <Select 
                  value={cicloSelecionado} 
                  onValueChange={setCicloSelecionado}
                >
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {planoSelecionado && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-400 text-sm">
                    Valor: {' '}
                    <strong>
                      R$ {cicloSelecionado === 'anual' 
                        ? planos.find(p => p.id === Number(planoSelecionado))?.preco_anual?.toFixed(2)
                        : planos.find(p => p.id === Number(planoSelecionado))?.preco_mensal?.toFixed(2)
                      }
                    </strong>
                    {' '}{cicloSelecionado === 'anual' ? '/ano' : '/mês'}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanoDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button 
              onClick={handleAlterarPlano}
              disabled={!planoSelecionado}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Alterar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reset de Senha */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja resetar a senha de <strong className="text-foreground">{usuarioSelecionado?.nome}</strong>?
          </p>
          <div>
            <Label>Nova Senha (opcional)</Label>
            <Input 
              placeholder="Deixe em branco para senha padrão"
              id="nova-senha"
              className="bg-secondary border-border mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                const senha = (document.getElementById('nova-senha') as HTMLInputElement)?.value || 'Juris@123';
                handleResetSenha(senha);
              }}
              className="bg-accent hover:bg-accent/90"
            >
              Resetar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Desativar Usuário</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-foreground">
              Esta ação irá desativar o usuário <strong className="text-foreground">{usuarioSelecionado?.nome}</strong>. 
              O usuário não poderá mais acessar o sistema.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteUsuario}
              className="bg-red-600 hover:bg-red-700"
            >
              Desativar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== PLANOS TAB ====================
function PlanosTab() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarPlanos();
  }, []);

  const carregarPlanos = async () => {
    try {
      const response = await api.get('/admin/planos');
      setPlanos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold text-foreground">Planos e Preços</h2>
        <Button className="bg-primary hover:bg-primary/90">
          <DollarSign className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planos.map((plano) => (
          <Card key={plano.id} className="glass-card border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">{plano.nome}</CardTitle>
                {plano.ativo ? (
                  <Badge className="bg-green-500/20 text-green-400">Ativo</Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400">Inativo</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{plano.descricao}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mensal:</span>
                  <span className="text-foreground font-medium">
                    R$ {plano.preco_mensal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anual:</span>
                  <span className="text-foreground font-medium">
                    R$ {plano.preco_anual?.toFixed(2) || '-'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" className="flex-1 border-border">
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== CONFIGURAÇÕES TAB ====================
function ConfiguracoesTab() {
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformForm, setPlatformForm] = useState<WhatsAppPlatformConfig | null>(null);
  const [platformStatus, setPlatformStatus] = useState<{
    connected?: boolean;
    state?: string;
    configurado?: boolean;
    provider?: string;
  } | null>(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformQrCode, setPlatformQrCode] = useState<string | null>(null);
  const [showPlatformQr, setShowPlatformQr] = useState(false);
  const [workspacesAviso, setWorkspacesAviso] = useState<Workspace[]>([]);
  const [workspaceIdsAviso, setWorkspaceIdsAviso] = useState<number[]>([]);
  const [somenteAdminsAviso, setSomenteAdminsAviso] = useState(true);
  const [mensagemAviso, setMensagemAviso] = useState('');
  const [enviandoAviso, setEnviandoAviso] = useState(false);
  const [agendamentoAviso, setAgendamentoAviso] = useState('');
  const [agendandoAviso, setAgendandoAviso] = useState(false);
  const [campanhasWhatsapp, setCampanhasWhatsapp] = useState<WhatsAppCampaign[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
    carregarWhatsAppPlataforma();
    carregarWorkspacesAviso();
    carregarCampanhasWhatsapp();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const response = await api.get('/admin/configuracoes');
      setConfiguracoes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const carregarWhatsAppPlataforma = async () => {
    try {
      setPlatformLoading(true);
      const [configRes, statusRes] = await Promise.all([
        whatsappPlatform.getConfig(),
        whatsappPlatform.status(),
      ]);
      setPlatformForm(configRes.data.config);
      setPlatformStatus({
        connected: statusRes.data.connected,
        state: statusRes.data.state,
        configurado: statusRes.data.configurado,
        provider: statusRes.data.provider,
      });
    } catch (error) {
      toast.error('Erro ao carregar WhatsApp da plataforma');
    } finally {
      setPlatformLoading(false);
    }
  };

  const carregarWorkspacesAviso = async () => {
    try {
      const response = await api.get('/admin/workspaces');
      setWorkspacesAviso(response.data || []);
    } catch (error) {
      toast.error('Erro ao carregar workspaces para envio de aviso');
    }
  };

  const carregarCampanhasWhatsapp = async () => {
    try {
      setLoadingCampanhas(true);
      const response = await whatsappPlatform.listarCampanhas({ limit: 20 });
      setCampanhasWhatsapp(response.data.campanhas || []);
    } catch (error) {
      toast.error('Erro ao carregar campanhas agendadas');
    } finally {
      setLoadingCampanhas(false);
    }
  };

  const handleSavePlatform = async () => {
    if (!platformForm) return;
    try {
      setPlatformLoading(true);
      const response = await whatsappPlatform.updateConfig({
        display_name: platformForm.display_name || '',
        phone_number: platformForm.phone_number || '',
        enabled: Boolean(platformForm.enabled),
      });
      setPlatformForm(response.data.config);
      toast.success('WhatsApp da plataforma atualizado');
      await carregarWhatsAppPlataforma();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao salvar WhatsApp da plataforma');
    } finally {
      setPlatformLoading(false);
    }
  };

  const handlePlatformQr = async () => {
    setShowPlatformQr(true);
    setPlatformQrCode(null);
    try {
      const response = await whatsappPlatform.getQRCode();
      const rawQr = response.data?.qrcode as unknown;

      let qrValue: string | undefined;
      if (typeof rawQr === 'string') {
        qrValue = rawQr;
      } else if (rawQr && typeof rawQr === 'object') {
        qrValue = (rawQr as any).qrcode || (rawQr as any).base64;
      }

      if (response.data.sucesso && response.data.connected && !qrValue) {
        toast.success('WhatsApp da plataforma ja conectado');
        setShowPlatformQr(false);
      } else if (response.data.sucesso && qrValue) {
        setPlatformQrCode(qrValue.startsWith('data:image') ? qrValue : `data:image/png;base64,${qrValue}`);
      } else if (response.data.pending) {
        toast.info('Preparando QR Code da plataforma. Tente novamente.');
      } else {
        toast.error(response.data.erro || 'Erro ao gerar QR Code da plataforma');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao gerar QR Code da plataforma');
    } finally {
      carregarWhatsAppPlataforma();
    }
  };

  const handlePlatformDisconnect = async () => {
    try {
      setPlatformLoading(true);
      const response = await whatsappPlatform.disconnect();
      if (response.data?.sucesso) {
        toast.success('WhatsApp da plataforma desconectado');
      } else {
        toast.error(response.data?.erro || 'Nao foi possivel desconectar');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao desconectar WhatsApp da plataforma');
    } finally {
      setPlatformLoading(false);
      carregarWhatsAppPlataforma();
    }
  };

  const toggleWorkspaceAviso = (workspaceId: number) => {
    setWorkspaceIdsAviso((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const handleEnviarAvisoWhatsapp = async () => {
    const mensagem = mensagemAviso.trim();
    if (!mensagem) {
      toast.error('Escreva a mensagem do aviso');
      return;
    }

    setEnviandoAviso(true);
    try {
      const response = await whatsappPlatform.enviarAviso({
        mensagem,
        workspace_ids: workspaceIdsAviso,
        somente_admins: somenteAdminsAviso,
      });

      if (response.data.sucesso) {
        const processados = response.data.processados ?? 0;
        const confirmados = response.data.confirmados ?? response.data.enviados ?? 0;
        const pendentes = response.data.pendentes_confirmacao ?? 0;
        const sufixoPendentes = pendentes > 0 ? `, ${pendentes} pendente(s)` : '';
        toast.success(
          `Aviso enviado para ${processados} destino(s), ${confirmados} confirmada(s)${sufixoPendentes}`
        );
        setMensagemAviso('');
      } else {
        toast.error(response.data.erro || 'Falha no envio do aviso');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao enviar aviso via WhatsApp');
    } finally {
      setEnviandoAviso(false);
    }
  };

  const handleAgendarAvisoWhatsapp = async () => {
    const mensagem = mensagemAviso.trim();
    if (!mensagem) {
      toast.error('Escreva a mensagem do aviso antes de agendar');
      return;
    }
    if (!agendamentoAviso) {
      toast.error('Escolha data e hora do agendamento');
      return;
    }

    const agendamentoDate = new Date(agendamentoAviso);
    if (Number.isNaN(agendamentoDate.getTime())) {
      toast.error('Data/hora inválida');
      return;
    }

    if (agendamentoDate.getTime() <= Date.now()) {
      toast.error('O agendamento precisa estar no futuro');
      return;
    }

    setAgendandoAviso(true);
    try {
      const response = await whatsappPlatform.agendarCampanha({
        mensagem,
        scheduled_for: agendamentoDate.toISOString(),
        workspace_ids: workspaceIdsAviso,
        somente_admins: somenteAdminsAviso,
      });

      if (response.data.sucesso) {
        toast.success('Campanha agendada com sucesso');
        setAgendamentoAviso('');
        await carregarCampanhasWhatsapp();
      } else {
        toast.error('Não foi possível agendar a campanha');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao agendar campanha WhatsApp');
    } finally {
      setAgendandoAviso(false);
    }
  };

  const handleCancelarCampanha = async (campaignId: number) => {
    try {
      const response = await whatsappPlatform.cancelarCampanha(campaignId);
      if (response.data.sucesso) {
        toast.success('Campanha cancelada');
        await carregarCampanhasWhatsapp();
      } else {
        toast.error(response.data.erro || 'Falha ao cancelar campanha');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao cancelar campanha');
    }
  };

  const handleUpdateConfig = async (chave: string, valor: string) => {
    try {
      await api.put(`/admin/configuracoes/${chave}`, { valor });
      toast.success('Configuração atualizada!');
      carregarConfiguracoes();
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Configurações Globais</h2>

      <Card className="glass-card border-border/60">
        <CardContent className="p-6">
          <div className="space-y-6">
            {configuracoes.map((config) => (
              <div key={config.chave} className="flex items-center justify-between p-4 bg-secondary/40 rounded-lg">
                <div>
                  <p className="text-foreground font-medium">{config.chave}</p>
                  <p className="text-muted-foreground text-sm">{config.descricao}</p>
                </div>
                <div className="flex items-center gap-3">
                  {config.chave === 'modo_manutencao' ? (
                    <Select 
                      value={config.valor} 
                      onValueChange={(v) => handleUpdateConfig(config.chave, v)}
                    >
                      <SelectTrigger className="w-32 bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="true">Ativado</SelectItem>
                        <SelectItem value="false">Desativado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={config.valor}
                      onChange={(e) => handleUpdateConfig(config.chave, e.target.value)}
                      className="w-48 bg-secondary border-border"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-foreground">WhatsApp da Plataforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-foreground">Nome de exibição</Label>
              <Input
                value={platformForm?.display_name || ''}
                onChange={(e) =>
                  setPlatformForm((prev) => ({ ...(prev || {}), display_name: e.target.value }))
                }
                className="mt-1 bg-secondary border-border"
                placeholder="JurisPocket"
              />
            </div>
            <div>
              <Label className="text-foreground">Telefone</Label>
              <Input
                value={platformForm?.phone_number || ''}
                onChange={(e) =>
                  setPlatformForm((prev) => ({ ...(prev || {}), phone_number: e.target.value }))
                }
                className="mt-1 bg-secondary border-border"
                placeholder="5511999999999"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={Boolean(platformForm?.enabled)}
              onChange={(e) =>
                setPlatformForm((prev) => ({ ...(prev || {}), enabled: e.target.checked }))
              }
            />
            Ativar WhatsApp da plataforma
          </label>

          <div className="rounded-lg bg-secondary/40 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={platformStatus?.connected ? 'text-emerald-400' : 'text-amber-400'}>
                {platformStatus?.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="text-foreground">{platformStatus?.state || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provedor</span>
              <span className="text-foreground">{platformStatus?.provider || '-'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSavePlatform} disabled={platformLoading}>
              <Check className="w-4 h-4 mr-2" /> Salvar
            </Button>
            <Button variant="outline" onClick={carregarWhatsAppPlataforma} disabled={platformLoading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar status
            </Button>
            <Button variant="outline" onClick={handlePlatformQr} disabled={platformLoading}>
              <QrCode className="w-4 h-4 mr-2" /> Gerar QR
            </Button>
            <Button variant="outline" onClick={handlePlatformDisconnect} disabled={platformLoading}>
              <PowerOff className="w-4 h-4 mr-2" /> Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-foreground">Aviso Manual via WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-foreground">Mensagem do aviso</Label>
            <Textarea
              value={mensagemAviso}
              onChange={(e) => setMensagemAviso(e.target.value)}
              rows={5}
              className="mt-1 bg-secondary border-border"
              placeholder="Ex: Sistema em manutenção hoje às 22h. Previsão de retorno às 23h30."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={somenteAdminsAviso}
              onChange={(e) => setSomenteAdminsAviso(e.target.checked)}
            />
            Enviar apenas para admins/superadmins
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">
                Workspaces alvo ({workspaceIdsAviso.length || workspacesAviso.length})
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground"
                  onClick={() => setWorkspaceIdsAviso(workspacesAviso.map((w) => w.id))}
                >
                  Marcar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground"
                  onClick={() => setWorkspaceIdsAviso([])}
                >
                  Todos (sem filtro)
                </Button>
              </div>
            </div>
            <ScrollArea className="h-40 rounded-md border border-border p-2">
              <div className="space-y-1">
                {workspacesAviso.map((workspace) => (
                  <label
                    key={workspace.id}
                    className="flex items-center justify-between gap-3 rounded px-2 py-1 text-sm text-foreground hover:bg-secondary/60"
                  >
                    <span className="truncate">{workspace.nome}</span>
                    <input
                      type="checkbox"
                      checked={workspaceIdsAviso.includes(workspace.id)}
                      onChange={() => toggleWorkspaceAviso(workspace.id)}
                    />
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Se nenhum workspace estiver marcado, o envio cobre todos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleEnviarAvisoWhatsapp}
              disabled={enviandoAviso || !mensagemAviso.trim()}
            >
              {enviandoAviso ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SendHorizontal className="w-4 h-4 mr-2" />
              )}
              Enviar aviso agora
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <Label className="text-foreground">Agendar envio</Label>
            <Input
              type="datetime-local"
              value={agendamentoAviso}
              onChange={(e) => setAgendamentoAviso(e.target.value)}
              className="bg-secondary border-border"
            />
            <Button
              type="button"
              variant="outline"
              className="border-border text-foreground"
              onClick={handleAgendarAvisoWhatsapp}
              disabled={agendandoAviso || !mensagemAviso.trim() || !agendamentoAviso}
            >
              {agendandoAviso ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Agendar campanha
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Campanhas agendadas</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border text-foreground"
                onClick={carregarCampanhasWhatsapp}
                disabled={loadingCampanhas}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingCampanhas ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            <ScrollArea className="h-48 rounded-md border border-border p-2">
              <div className="space-y-2">
                {campanhasWhatsapp.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-2">Nenhuma campanha registrada.</p>
                ) : (
                  campanhasWhatsapp.map((campanha) => {
                    const statusColor =
                      campanha.status === 'enviado'
                        ? 'text-emerald-400 border-emerald-700'
                        : campanha.status === 'parcial'
                        ? 'text-amber-400 border-amber-700'
                        : campanha.status === 'falhou'
                        ? 'text-red-400 border-red-700'
                        : campanha.status === 'cancelado'
                        ? 'text-muted-foreground border-border'
                        : 'text-primary border-primary/40';

                    return (
                      <div
                        key={campanha.id}
                        className="rounded-md border border-border bg-secondary/40 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground font-medium truncate">
                              #{campanha.id} - {campanha.mensagem}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Agendado para:{' '}
                              {campanha.scheduled_for
                                ? new Date(String(campanha.scheduled_for).replace(' ', 'T')).toLocaleString('pt-BR')
                                : '-'}
                            </p>
                          </div>
                          <Badge variant="outline" className={statusColor}>
                            {campanha.status}
                          </Badge>
                        </div>
                        {campanha.result_summary && (
                          <p className="text-xs text-muted-foreground">
                            Processados: {campanha.result_summary.processados || 0} | Confirmados:{' '}
                            {campanha.result_summary.confirmados || 0} | Falhas:{' '}
                            {campanha.result_summary.falhas || 0}
                          </p>
                        )}
                        {campanha.last_error && (
                          <p className="text-xs text-red-400">Erro: {campanha.last_error}</p>
                        )}
                        {(campanha.status === 'pendente' || campanha.status === 'falhou') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-700 text-red-300"
                            onClick={() => handleCancelarCampanha(campanha.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPlatformQr} onOpenChange={setShowPlatformQr}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp da Plataforma</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Escaneie o QR Code pelo WhatsApp em "Aparelhos conectados".
            </p>
            {platformQrCode ? (
              <div className="bg-white p-4 rounded-lg">
                <img src={platformQrCode} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== AUDITORIA TAB ====================
function AuditoriaTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    try {
      const response = await api.get('/admin/auditoria');
      setLogs(response.data.logs);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Logs de Auditoria</h2>

      <Card className="glass-card border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Usuário</TableHead>
                <TableHead className="text-muted-foreground">Ação</TableHead>
                <TableHead className="text-muted-foreground">Entidade</TableHead>
                <TableHead className="text-muted-foreground">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-border">
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-foreground text-sm">{log.user_nome}</p>
                      <p className="text-muted-foreground text-xs">{log.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {log.acao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{log.entidade}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{log.ip_address}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ASSINATURAS TAB ====================
function AssinaturasTab() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [resumo, setResumo] = useState<ResumoAssinaturas | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [assinaturaSelecionada, setAssinaturaSelecionada] = useState<Assinatura | null>(null);
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false);
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [pagamentoParaDeletar, setPagamentoParaDeletar] = useState<Pagamento | null>(null);
  const [showDeletePagamentoDialog, setShowDeletePagamentoDialog] = useState(false);
  const [assinaturaParaExcluir, setAssinaturaParaExcluir] = useState<Assinatura | null>(null);
  const [showDeleteAssinaturaDialog, setShowDeleteAssinaturaDialog] = useState(false);
  
  const [pagamentoForm, setPagamentoForm] = useState({
    valor_pago: '',
    mes_referencia: new Date().toISOString().slice(0, 7),
    metodo_pagamento: 'pix',
    status: 'confirmado',
    observacoes: ''
  });

  useEffect(() => {
    carregarDados();
  }, [search, statusFilter]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [assinaturasRes, resumoRes] = await Promise.all([
        api.get('/admin/assinaturas', { params: { search, status: statusFilter === 'todos' ? '' : statusFilter } }),
        api.get('/admin/assinaturas/resumo')
      ]);
      setAssinaturas(assinaturasRes.data);
      setResumo(resumoRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPagamento = async () => {
    if (!assinaturaSelecionada) return;
    
    try {
      const response = await api.post(`/admin/assinaturas/${assinaturaSelecionada.id}/pagamentos`, {
        valor_pago: parseFloat(pagamentoForm.valor_pago),
        mes_referencia: pagamentoForm.mes_referencia,
        metodo_pagamento: pagamentoForm.metodo_pagamento,
        status: pagamentoForm.status,
        observacoes: pagamentoForm.observacoes
      });
      
      // Se tem comprovante, faz upload
      if (comprovanteFile && response.data.id) {
        const formData = new FormData();
        formData.append('comprovante', comprovanteFile);
        formData.append('pagamento_id', response.data.id);
        
        await api.post(`/admin/assinaturas/${assinaturaSelecionada.id}/comprovante`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success('Pagamento registrado com sucesso!');
      setShowPagamentoDialog(false);
      setComprovanteFile(null);
      setPagamentoForm({
        valor_pago: '',
        mes_referencia: new Date().toISOString().slice(0, 7),
        metodo_pagamento: 'pix',
        status: 'confirmado',
        observacoes: ''
      });
      carregarDados();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleDeletarPagamento = async () => {
    if (!assinaturaSelecionada || !pagamentoParaDeletar) return;
    
    try {
      await api.delete(`/admin/assinaturas/${assinaturaSelecionada.id}/pagamentos/${pagamentoParaDeletar.id}`);
      toast.success('Pagamento excluído com sucesso!');
      setShowDeletePagamentoDialog(false);
      setPagamentoParaDeletar(null);
      
      // Atualiza a lista de assinaturas
      await carregarDados();
      
      // Atualiza o histórico local
      if (assinaturaSelecionada) {
        const updatedAssinatura = { ...assinaturaSelecionada };
        updatedAssinatura.pagamentos = updatedAssinatura.pagamentos?.filter(
          p => p.id !== pagamentoParaDeletar.id
        ) || [];
        setAssinaturaSelecionada(updatedAssinatura);
      }
    } catch (error) {
      toast.error('Erro ao excluir pagamento');
    }
  };

  const handleExcluirAssinatura = async () => {
    if (!assinaturaParaExcluir) return;
    
    try {
      await api.delete(`/admin/assinaturas/${assinaturaParaExcluir.id}`);
      toast.success('Assinatura excluída com sucesso!');
      setShowDeleteAssinaturaDialog(false);
      setAssinaturaParaExcluir(null);
      carregarDados();
    } catch (error) {
      toast.error('Erro ao excluir assinatura');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ativo: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
      suspenso: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      pendente: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return styles[status] || styles.pendente;
  };

  const getMetodoLabel = (metodo: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      cartao: 'Cartão',
      boleto: 'Boleto',
      transferencia: 'Transferência'
    };
    return labels[metodo] || metodo;
  };

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-foreground">{resumo?.total_assinaturas_ativas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Recebido no Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {(resumo?.total_recebido_mes || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{resumo?.assinaturas_pendentes_mes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">MRR</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {(resumo?.mrr || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por workspace ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={carregarDados} variant="outline" className="border-border">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card className="glass-card border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Workspace</TableHead>
                <TableHead className="text-muted-foreground">Plano</TableHead>
                <TableHead className="text-muted-foreground">Ciclo</TableHead>
                <TableHead className="text-muted-foreground">Valor</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Pagamento</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : !assinaturas || assinaturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                assinaturas?.map((assinatura) => (
                  <TableRow key={assinatura.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="text-foreground font-medium">{assinatura.workspace_nome}</p>
                        <p className="text-muted-foreground text-sm">{assinatura.responsavel_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {assinatura.plano_nome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground capitalize">{assinatura.ciclo}</TableCell>
                    <TableCell className="text-foreground">
                      R$ {assinatura.valor?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(assinatura.status)}>
                        {assinatura.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assinatura.pago_mes_atual ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <Check className="w-4 h-4" />
                          <span className="text-sm">Pago</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Pendente</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssinaturaSelecionada(assinatura);
                            setPagamentoForm(prev => ({
                              ...prev,
                              valor_pago: assinatura.valor?.toString() || ''
                            }));
                            setShowPagamentoDialog(true);
                          }}
                          className="text-green-400 hover:text-green-300"
                          title="Registrar Pagamento"
                        >
                          <Wallet className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssinaturaSelecionada(assinatura);
                            setShowHistoricoDialog(true);
                          }}
                          className="text-primary hover:text-primary"
                          title="Ver Histórico"
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssinaturaParaExcluir(assinatura);
                            setShowDeleteAssinaturaDialog(true);
                          }}
                          className="text-red-400 hover:text-red-300"
                          title="Excluir Assinatura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Registrar Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-400" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          
          {assinaturaSelecionada && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-muted-foreground text-sm">Workspace</p>
                <p className="text-foreground font-medium">{assinaturaSelecionada.workspace_nome}</p>
                <p className="text-muted-foreground text-sm mt-1">Plano: {assinaturaSelecionada.plano_nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Pago *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pagamentoForm.valor_pago}
                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor_pago: e.target.value })}
                    placeholder="0,00"
                    className="bg-secondary border-border mt-1"
                  />
                </div>
                <div>
                  <Label>Mês de Referência *</Label>
                  <Input
                    type="month"
                    value={pagamentoForm.mes_referencia}
                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, mes_referencia: e.target.value })}
                    className="bg-secondary border-border mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Método de Pagamento</Label>
                <Select 
                  value={pagamentoForm.metodo_pagamento}
                  onValueChange={(v) => setPagamentoForm({ ...pagamentoForm, metodo_pagamento: v })}
                >
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={pagamentoForm.status}
                  onValueChange={(v) => setPagamentoForm({ ...pagamentoForm, status: v })}
                >
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Comprovante (opcional)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
                  className="bg-secondary border-border mt-1 file:text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG ou PNG (máx. 5MB)
                </p>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={pagamentoForm.observacoes}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                  rows={2}
                  className="bg-secondary border-border mt-1 resize-none"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarPagamento}
              disabled={!pagamentoForm.valor_pago || !pagamentoForm.mes_referencia}
              className="bg-green-600 hover:bg-green-700"
            >
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={showHistoricoDialog} onOpenChange={setShowHistoricoDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Histórico de Pagamentos
            </DialogTitle>
          </DialogHeader>
          
          {assinaturaSelecionada && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-muted-foreground text-sm">Workspace</p>
                <p className="text-foreground font-medium">{assinaturaSelecionada.workspace_nome}</p>
              </div>

              {!assinaturaSelecionada?.pagamentos || assinaturaSelecionada.pagamentos.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {assinaturaSelecionada?.pagamentos?.map((pagamento) => (
                    <div key={pagamento.id} className="p-3 bg-secondary rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          pagamento.status === 'confirmado' ? 'bg-green-500/20' : 'bg-amber-500/20'
                        }`}>
                          {pagamento.status === 'confirmado' ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            R$ {pagamento.valor_pago?.toFixed(2)}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {getMetodoLabel(pagamento.metodo_pagamento)} • {pagamento.mes_referencia}
                          </p>
                          {pagamento.observacoes && (
                            <p className="text-muted-foreground text-xs">{pagamento.observacoes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-muted-foreground text-sm">
                            {new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')}
                          </p>
                          {pagamento.registrado_por_nome && (
                            <p className="text-muted-foreground text-xs">por {pagamento.registrado_por_nome}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPagamentoParaDeletar(pagamento);
                            setShowDeletePagamentoDialog(true);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Excluir pagamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowHistoricoDialog(false)} className="border-border">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão de Pagamento */}
      <Dialog open={showDeletePagamentoDialog} onOpenChange={setShowDeletePagamentoDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-foreground">
              Tem certeza que deseja excluir este pagamento?
            </p>
            
            {pagamentoParaDeletar && (
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-foreground font-medium">
                  R$ {pagamentoParaDeletar.valor_pago?.toFixed(2)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {getMetodoLabel(pagamentoParaDeletar.metodo_pagamento)} • {pagamentoParaDeletar.mes_referencia}
                </p>
              </div>
            )}
            
            <p className="text-muted-foreground text-sm">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeletePagamentoDialog(false)} 
              className="border-border"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeletarPagamento}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão de Assinatura */}
      <Dialog open={showDeleteAssinaturaDialog} onOpenChange={setShowDeleteAssinaturaDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão da Assinatura
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-foreground">
              Tem certeza que deseja excluir esta assinatura permanentemente?
            </p>
            
            {assinaturaParaExcluir && (
              <div className="p-3 bg-secondary rounded-lg space-y-1">
                <p className="text-foreground font-medium">{assinaturaParaExcluir.workspace_nome}</p>
                <p className="text-muted-foreground text-sm">Plano: {assinaturaParaExcluir.plano_nome}</p>
                <p className="text-muted-foreground text-sm">Responsável: {assinaturaParaExcluir.responsavel_email}</p>
                <p className="text-muted-foreground text-sm">Valor: R$ {assinaturaParaExcluir.valor?.toFixed(2)}/{assinaturaParaExcluir.ciclo}</p>
              </div>
            )}
            
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm font-medium">⚠️ Atenção</p>
              <p className="text-red-300/80 text-sm mt-1">
                Todos os pagamentos associados também serão excluídos. Esta ação não pode ser desfeita!
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteAssinaturaDialog(false)} 
              className="border-border"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleExcluirAssinatura}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
