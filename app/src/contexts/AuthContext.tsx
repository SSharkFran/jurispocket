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
  avatar_url?: string;
  workspace_id: number;
}

interface Workspace {
  id: number;
  nome: string;
  slug: string;
  plano: 'free' | 'pro' | 'enterprise';
  max_users: number;
  max_processos: number;
  max_storage_mb: number;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  workspace: Workspace | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; nome: string; phone?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      localStorage.removeItem('token');
      setUser(null);
      setWorkspace(null);
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

  const register = async (data: { email: string; password: string; nome: string; phone?: string }) => {
    const response = await auth.register(data);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setWorkspace(null);
    window.location.href = '/login';
  };

  const updateProfile = async (data: Partial<User>) => {
    await auth.updateProfile(data);
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        workspace,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
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
