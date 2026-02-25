import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Processos from "./pages/Processos";
import Tarefas from "./pages/Tarefas";
import Financeiro from "./pages/Financeiro";
import Documentos from "./pages/Documentos";
import Datajud from "./pages/Datajud";
import CopilotIA from "./pages/CopilotIA";
import WhatsApp from "./pages/WhatsApp";
import Equipe from "./pages/Equipe";
import Configuracoes from "./pages/Configuracoes";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="processos" element={<Processos />} />
            <Route path="prazos" element={<Tarefas />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="documentos" element={<Documentos />} />
            <Route path="datajud" element={<Datajud />} />
            <Route path="ia" element={<CopilotIA />} />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="equipe" element={<Equipe />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="admin" element={<SuperAdmin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
