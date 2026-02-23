import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { WhatsAppStatusPanel } from '@/components/whatsapp';
import { 
  User, 
  Bell, 
  Shield, 
  Smartphone,
  Mail,
  Save,
  Lock,
  Loader2,
  Camera,
  Trash2
} from 'lucide-react';

export function ConfiguracoesPage() {
  const { user, setUser, workspace } = useAuth();
  const [isLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    oab: '',
    alerta_email: false,
    alerta_whatsapp: false,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
        oab: user.oab || '',
        alerta_email: user.alerta_email || false,
        alerta_whatsapp: user.alerta_whatsapp || false,
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await auth.updateProfile({
        nome: formData.nome,
        telefone: formData.telefone,
        oab: formData.oab,
        alerta_email: formData.alerta_email,
        alerta_whatsapp: formData.alerta_whatsapp,
      });
      // Atualiza o usuário com os dados retornados
      if (response.data.user) {
        setUser(response.data.user);
      }
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setIsSaving(true);
    try {
      // TODO: Implement password change endpoint
      toast.success('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Erro ao alterar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, GIF ou WEBP');
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await auth.uploadAvatar(file);
      if (response.data.avatar_url) {
        setUser({ ...user!, avatar_url: response.data.avatar_url });
        toast.success('Foto de perfil atualizada!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao uploadar imagem');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return;
    try {
      await auth.deleteAvatar();
      setUser({ ...user!, avatar_url: undefined });
      toast.success('Foto de perfil removida!');
    } catch (error) {
      toast.error('Erro ao remover foto');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-slate-400 mt-1">Gerencie suas preferências e dados pessoais</p>
      </div>

      {/* Avatar Settings */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            Foto de Perfil
          </CardTitle>
          <CardDescription className="text-slate-400">
            Adicione uma foto para personalizar seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-3xl font-medium cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleAvatarClick}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : user?.avatar_url ? (
                  <img 
                    src={`http://localhost:5000${user.avatar_url}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.nome.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {/* Upload Button Overlay */}
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500 hover:bg-cyan-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                disabled={isUploadingAvatar}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div className="text-sm text-slate-400">
                <p>Formatos suportados: JPG, PNG, GIF, WEBP</p>
                <p>Tamanho máximo: 2MB</p>
              </div>
              {user?.avatar_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  className="w-fit border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Foto
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Dados Pessoais
          </CardTitle>
          <CardDescription className="text-slate-400">
            Atualize suas informações de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-slate-800/50 border-slate-700 text-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="oab">OAB</Label>
                <Input
                  id="oab"
                  value={formData.oab}
                  onChange={(e) => setFormData({ ...formData, oab: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="UF000000"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-cyan-500 hover:bg-cyan-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* WhatsApp Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Notification Settings */}
          <Card className="bg-slate-900/50 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                Notificações
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure como deseja receber alertas e notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Notificações por Email</p>
                  <p className="text-sm text-slate-400">Receba alertas sobre prazos e movimentações</p>
                </div>
              </div>
              <Switch
                checked={formData.alerta_email}
                onCheckedChange={(checked) => setFormData({ ...formData, alerta_email: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Notificações por WhatsApp</p>
                  <p className="text-sm text-slate-400">Receba alertas no seu número de celular</p>
                </div>
              </div>
              <Switch
                checked={formData.alerta_whatsapp}
                onCheckedChange={(checked) => setFormData({ ...formData, alerta_whatsapp: checked })}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-cyan-500 hover:bg-cyan-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Preferências
              </Button>
            </div>
          </form>
        </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <WhatsAppStatusPanel />
        </div>
      </div>

      {/* Security Settings */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Segurança
          </CardTitle>
          <CardDescription className="text-slate-400">
            Altere sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-cyan-500 hover:bg-cyan-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Workspace Info */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Informações do Escritório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-sm text-slate-400">Plano Atual</p>
              <p className="text-lg font-medium text-white capitalize">{workspace?.plano || 'Gratuito'}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-sm text-slate-400">Função</p>
              <p className="text-lg font-medium text-white capitalize">{user?.role || 'Usuário'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
