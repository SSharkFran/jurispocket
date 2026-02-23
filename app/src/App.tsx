import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProcessosPage } from '@/pages/ProcessosPage';
import { ProcessoDetalhePage } from '@/pages/ProcessoDetalhePage';
import { ClientesPage } from '@/pages/ClientesPage';
import { ClienteDetalhePage } from '@/pages/ClienteDetalhePage';
import { TarefasPage } from '@/pages/TarefasPage';
import { PrazosPage } from '@/pages/PrazosPage';
import { FinanceiroPage } from '@/pages/FinanceiroPage';
import { EquipePage } from '@/pages/EquipePage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { DocumentosPage } from '@/pages/DocumentosPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { PublicoProcessoPage } from '@/pages/PublicoProcessoPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChatbotIA } from '@/components/ChatbotIA';
import { ConvitesBanner } from '@/components/ConvitesBanner';

function RedirectToDashboardProcesso() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/processos/${id}`} replace />;
}
function RedirectToDashboardCliente() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/clientes/${id}`} replace />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Landing Page - Página inicial pública */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
      
      {/* Autenticação */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      
      {/* Dashboard e rotas privadas */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="processos" element={<ProcessosPage />} />
        <Route path="processos/:id" element={<ProcessoDetalhePage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="clientes/:id" element={<ClienteDetalhePage />} />
        <Route path="tarefas" element={<TarefasPage />} />
        <Route path="prazos" element={<PrazosPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="equipe" element={<EquipePage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
      </Route>
      
      {/* Redirecionamentos: menu usa /financeiro etc., rotas reais são /dashboard/... */}
      <Route path="/financeiro" element={<Navigate to="/dashboard/financeiro" replace />} />
      <Route path="/processos" element={<Navigate to="/dashboard/processos" replace />} />
      <Route path="/processos/:id" element={<RedirectToDashboardProcesso />} />
      <Route path="/clientes" element={<Navigate to="/dashboard/clientes" replace />} />
      <Route path="/clientes/:id" element={<RedirectToDashboardCliente />} />
      <Route path="/tarefas" element={<Navigate to="/dashboard/tarefas" replace />} />
      <Route path="/prazos" element={<Navigate to="/dashboard/prazos" replace />} />
      <Route path="/equipe" element={<Navigate to="/dashboard/equipe" replace />} />
      <Route path="/documentos" element={<Navigate to="/dashboard/documentos" replace />} />
      <Route path="/templates" element={<Navigate to="/dashboard/templates" replace />} />
      <Route path="/configuracoes" element={<Navigate to="/dashboard/configuracoes" replace />} />
      <Route path="/app" element={<Navigate to="/dashboard" />} />
      <Route 
        path="/admin" 
        element={
          <PrivateRoute>
            <AdminDashboardPage />
          </PrivateRoute>
        } 
      />
      {/* Rota pública para acompanhamento processual */}
      <Route path="/publico/processo/:token" element={<PublicoProcessoPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ConvitesBanner />
        <ChatbotIA />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
