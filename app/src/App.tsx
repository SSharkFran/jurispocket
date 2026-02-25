import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as ToasterUI } from '@/components/ui/toaster';

// Pages
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

// Layout
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AppLayout from '@/components/AppLayout';

// Components
import { ChatbotIA } from '@/components/ChatbotIA';
import { ConvitesBanner } from '@/components/ConvitesBanner';

function RedirectToDashboardProcesso() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/app/processos/${id}`} replace />;
}

function RedirectToDashboardCliente() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/app/clientes/${id}`} replace />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
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
      <Route path="/" element={isAuthenticated ? <Navigate to="/app" /> : <LandingPage />} />

      {/* Autenticação */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/app" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/app" /> : <RegisterPage />} />

      {/* App Layout - Nova estrutura com /app como base */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppLayout />
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
        <Route path="admin" element={<AdminDashboardPage />} />
      </Route>

      {/* Dashboard Layout - Compatibilidade com rotas antigas */}
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

      {/* Redirecionamentos - Rotas antigas para novas */}
      <Route path="/financeiro" element={<Navigate to="/app/financeiro" replace />} />
      <Route path="/processos" element={<Navigate to="/app/processos" replace />} />
      <Route path="/processos/:id" element={<RedirectToDashboardProcesso />} />
      <Route path="/clientes" element={<Navigate to="/app/clientes" replace />} />
      <Route path="/clientes/:id" element={<RedirectToDashboardCliente />} />
      <Route path="/tarefas" element={<Navigate to="/app/tarefas" replace />} />
      <Route path="/prazos" element={<Navigate to="/app/prazos" replace />} />
      <Route path="/equipe" element={<Navigate to="/app/equipe" replace />} />
      <Route path="/documentos" element={<Navigate to="/app/documentos" replace />} />
      <Route path="/templates" element={<Navigate to="/app/templates" replace />} />
      <Route path="/configuracoes" element={<Navigate to="/app/configuracoes" replace />} />

      {/* Rota pública para acompanhamento processual */}
      <Route path="/publico/processo/:token" element={<PublicoProcessoPage />} />

      {/* Catch-all para rotas indefinidas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AppRoutes />
          <ConvitesBanner />
          <ChatbotIA />
          <ToasterUI />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
