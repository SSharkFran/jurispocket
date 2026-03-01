import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth } from '@/services/api';

interface User {
  id: number;
  email: string;
  nome: string;
  role: 'user' | 'admin' | 'superadmin';
  oab?: string;
  telefone?: string;
  alerta_email?: boolean;
  alerta_whatsapp?: boolean;
  resumo_diario?: boolean;
  avatar_url?: string;
  workspace_id: number;
}

interface Workspace {
  id: number;
  nome: string;
  slug: string;
  plano: string;
  max_users: number;
  max_processos: number;
  max_storage_mb: number;
  plano_nome?: string;
  limites?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  workspace: Workspace | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; nome: string; phone?: string; workspace_nome?: string }) => Promise<{
    requires_verification?: boolean;
    email?: string;
    telefone?: string;
    masked_phone?: string;
    expires_in_minutes?: number;
    message?: string;
  }>;
  verifyRegisterPhone: (telefone: string, code: string) => Promise<void>;
  logout: () => void;
  finishLogoutTransition: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setWorkspace(null);
  };

  useEffect(() => {
    console.log('🔐 AuthProvider montado');
    const token = localStorage.getItem('token');
    console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      console.log('🔄 Atualizando dados do usuário...');
      const response = await auth.me();
      console.log('✅ Usuário recebido:', response.data.user);
      setUser(response.data.user);
      setWorkspace(response.data.workspace);
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('🔑 Tentando login...', { email, apiUrl: import.meta.env.VITE_API_URL });
    try {
      const response = await auth.login(email, password);
      console.log('✅ Login sucesso:', response.data);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      await refreshUser();
    } catch (error: any) {
      console.error('❌ Login erro:', error);
      console.error('❌ Response:', error.response);
      console.error('❌ Message:', error.message);
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; nome: string; phone?: string; workspace_nome?: string }) => {
    const response = await auth.register(data);
    if (response.data?.requires_verification) {
      return response.data;
    }

    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    await refreshUser();
    return { requires_verification: false };
  };

  const verifyRegisterPhone = async (telefone: string, code: string) => {
    const response = await auth.verifyRegister({ telefone, code });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    await refreshUser();
  };

  const logout = () => {
    setIsLoggingOut(true);
    clearSession();
  };

  const finishLogoutTransition = () => {
    setIsLoggingOut(false);
  };

  const updateProfile = async (data: Partial<User>) => {
    await auth.updateProfile(data);
    await refreshUser();
  };

  useEffect(() => {
    const handleForcedLogout = (_event: Event) => {
      setIsLoggingOut(true);
      clearSession();
    };

    window.addEventListener('jurispocket:force-logout', handleForcedLogout);
    return () => window.removeEventListener('jurispocket:force-logout', handleForcedLogout);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        workspace,
        isLoading,
        isLoggingOut,
        isAuthenticated: !!user,
        refreshUser,
        login,
        register,
        verifyRegisterPhone,
        logout,
        finishLogoutTransition,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
