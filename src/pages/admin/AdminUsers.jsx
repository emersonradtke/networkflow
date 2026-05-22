import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Shield, Edit, Search, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { loadRoles } from '@/lib/role-helpers';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    loadUsers();
    loadRolesData();
  }, []);

  const loadRolesData = async () => {
    try {
      const rolesData = await loadRoles(true);
      setRoles(rolesData);
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Aplicar setups pendentes a usuários recém-criados
      try {
        await base44.functions.invoke('applyAllPendingSetups', {});
      } catch (e) {
        // Não bloqueia o carregamento se falhar
        console.warn('Erro ao aplicar setups pendentes:', e);
      }

      const allUsers = await base44.entities.User.list('-created_date', 100);
      setUsers(allUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const updates = {};
      if (editName !== selectedUser.full_name) {
        updates.full_name = editName;
      }
      if (editEmail !== selectedUser.email) {
        updates.email = editEmail;
      }
      if (editRole !== selectedUser.role) {
        updates.role = editRole;
      }
      
      if (Object.keys(updates).length > 0) {
        await base44.entities.User.update(selectedUser.id, updates);
      }
      
      if (editPassword && editPassword.trim()) {
        await base44.functions.invoke('updateUserPassword', {
          userId: selectedUser.id,
          newPassword: editPassword
        });
      }
      
      await loadUsers();
      setShowDialog(false);
      setSelectedUser(null);
      setEditPassword('');
      setShowPassword(false);
      toast.success('Usuário atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleSendPasswordReset = async () => {
    if (!selectedUser) return;
    try {
      await base44.functions.invoke('sendPasswordReset', {
        userId: selectedUser.id,
        email: selectedUser.email,
        userName: selectedUser.full_name
      });
      toast.success('Email de reset enviado para ' + selectedUser.email);
    } catch (error) {
      console.error('Erro ao enviar reset:', error);
      toast.error('Erro ao enviar email de reset');
    }
  };

  const handleDeleteUser = (user) => {
    if (user.role === 'admin') {
      toast.error('Não é permitido remover usuários admin');
      return;
    }
    setUserToDelete(user);
    setDeletePassword('');
    setDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      toast.error('Digite sua senha para confirmar');
      return;
    }
    try {
      await base44.entities.User.delete(userToDelete.id);
      await loadUsers();
      setDeleteConfirmDialog(false);
      setUserToDelete(null);
      setDeletePassword('');
      toast.success('Usuário removido');
    } catch (error) {
      toast.error('Erro ao remover usuário');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield size={32} className="text-primary" />
          Gerenciamento de Usuários
        </h1>
        <p className="text-muted-foreground mt-2">Controle de roles e permissões</p>
      </div>

      {/* Role Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map(role => (
          <div key={role.id} className="p-4 rounded-lg border border-border bg-card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${role.color}`}>
              <Shield size={20} />
            </div>
            <h3 className="font-semibold text-foreground">{role.label}</h3>
            <p className="text-xs text-muted-foreground mt-2">{role.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {role.permissions?.slice(0, 2).map((perm, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Nome</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Data Criação</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-foreground">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {user.role && (
                        <Badge className={roles.find(r => r.name === user.role)?.color || 'bg-gray-100 text-gray-800'}>
                          {roles.find(r => r.name === user.role)?.label || user.role}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">
                      {new Date(user.created_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setSelectedUser(user);
                          setEditName(user.full_name || '');
                          setEditEmail(user.email || '');
                          setEditPassword('');
                          setEditRole(user.role || '');
                          if (roles.length === 0) {
                            await loadRolesData();
                          }
                          setShowDialog(true);
                        }}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteUser(user)}
                        disabled={user.role === 'admin'}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog - Edit */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nome</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nova Senha (opcional)</label>
                <div className="relative">
                  <Input
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Role</label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editRole && roles.find(r => r.name === editRole) && (
                <div className="p-3 rounded-lg bg-secondary">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Permissões:</p>
                  <div className="flex flex-wrap gap-1">
                    {roles.find(r => r.name === editRole)?.permissions?.map((perm, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDialog(false);
                setShowPassword(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateUser}
              className="bg-primary"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Confirmar Exclusão */}
      <Dialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.full_name}</strong>? Esta ação não pode ser desfeita.
            </p>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Digite sua senha para confirmar</label>
              <Input
                type="password"
                placeholder="Sua senha"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteConfirmDialog(false);
                setDeletePassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Remover Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}