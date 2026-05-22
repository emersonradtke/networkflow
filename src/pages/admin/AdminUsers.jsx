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
import { ROLE_CONFIG, getRoleLabel, getRoleColor } from '@/lib/roles-config';
import { Shield, Edit, Search, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('edit'); // 'edit' ou 'create'
  const [newRole, setNewRole] = useState('associate');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newCpf, setNewCpf] = useState('');
  const [createMode, setCreateMode] = useState('invite'); // 'invite' ou 'direct'

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
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
      const updates = { role: newRole };
      if (editName && editName !== selectedUser.full_name) {
        updates.full_name = editName;
      }
      if (editEmail && editEmail !== selectedUser.email) {
        updates.email = editEmail;
      }
      
      await base44.entities.User.update(selectedUser.id, updates);
      
      // Se houver senha, enviar para função backend para atualizar
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
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleSendPasswordReset = async () => {
    if (!selectedUser) return;
    try {
      // Chamar função backend para enviar reset de senha
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

  const handleCreateUser = async () => {
    if (createMode === 'direct') {
      if (!newCpf || !newName) {
        toast.error('Preencha CPF e nome');
        return;
      }
      try {
        await base44.functions.invoke('createDirectUser', {
          cpf: newCpf,
          full_name: newName,
          email: newEmail,
          role: newRole
        });
        await loadUsers();
        setShowDialog(false);
        setNewEmail('');
        setNewName('');
        setNewCpf('');
        setNewRole('user');
        setCreateMode('invite');
        toast.success('Usuário criado com sucesso');
      } catch (error) {
        toast.error('Erro ao criar usuário');
      }
    } else {
      if (!newEmail || !newName) {
        toast.error('Preencha email e nome');
        return;
      }
      try {
        await base44.users.inviteUser(newEmail, newRole);
        await loadUsers();
        setShowDialog(false);
        setNewEmail('');
        setNewName('');
        setNewRole('associate');
        setCreateMode('invite');
        toast.success('Usuário convidado com sucesso');
      } catch (error) {
        toast.error('Erro ao convidar usuário');
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      await base44.entities.User.delete(userId);
      await loadUsers();
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
        {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => (
          <div key={roleKey} className="p-4 rounded-lg border border-border bg-card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${config.color}`}>
              <Shield size={20} />
            </div>
            <h3 className="font-semibold text-foreground">{config.label}</h3>
            <p className="text-xs text-muted-foreground mt-2">{config.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {config.permissions.slice(0, 2).map((perm, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {perm.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Add */}
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
        <Button
          onClick={() => {
            setDialogMode('create');
            setNewEmail('');
            setNewName('');
            setNewCpf('');
            setNewRole('user');
            setCreateMode('invite');
            setShowDialog(true);
          }}
          className="bg-primary"
        >
          <Plus size={18} className="mr-2" />
          Novo Usuário
        </Button>
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
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">
                      {new Date(user.created_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialogMode('edit');
                          setSelectedUser(user);
                          setEditName(user.full_name || '');
                          setEditEmail(user.email || '');
                          setEditPassword('');
                          setNewRole(user.role || 'associate');
                          setShowDialog(true);
                        }}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteUser(user.id)}
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

      {/* Dialog - Edit or Create */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'edit' ? 'Editar Role do Usuário' : 'Convidar Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {dialogMode === 'create' ? (
              <>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={createMode === 'invite' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCreateMode('invite')}
                    className="flex-1"
                  >
                    Convidar
                  </Button>
                  <Button
                    variant={createMode === 'direct' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCreateMode('direct')}
                    className="flex-1"
                  >
                    Criar Direto
                  </Button>
                </div>

                {createMode === 'direct' && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">CPF</label>
                    <Input
                      placeholder="00000000000"
                      value={newCpf}
                      onChange={(e) => setNewCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      maxLength="11"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Nome</label>
                  <Input
                    placeholder="Nome completo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    {createMode === 'direct' ? 'Email (opcional)' : 'Email'}
                  </label>
                  <Input
                    placeholder="email@example.com"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </>
            ) : selectedUser ? (
              <>
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
              </>
            ) : null}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label} - {config.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRole && (
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Permissões:</p>
                <div className="flex flex-wrap gap-1">
                  {ROLE_CONFIG[newRole].permissions.map((perm, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {perm === 'all' ? 'Acesso Total' : perm.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

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
              onClick={dialogMode === 'edit' ? handleUpdateUser : handleCreateUser}
              className="bg-primary"
            >
              {dialogMode === 'edit' ? 'Salvar Alterações' : createMode === 'direct' ? 'Criar Usuário' : 'Convidar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}