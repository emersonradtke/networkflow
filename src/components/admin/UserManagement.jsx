import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Save, X, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    cpf: '',
    role: 'user',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAdminUsername, setDeleteAdminUsername] = useState('');
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [editForm, setEditForm] = useState({ username: '', email: '', cpf: '', role: 'user' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userList = await base44.entities.DirectUser.list();
      setUsers(userList);
      const allRoles = await base44.entities.Role.list();
      // Deduplicar por name
      const seen = new Set();
      const uniqueRoles = allRoles.filter(r => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      });
      setRoles(uniqueRoles);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!form.username || !form.password || !form.cpf) {
        setError('Usuário, senha e CPF são obrigatórios');
        setLoading(false);
        return;
      }

      // Cria o usuário via função backend
      const res = await base44.functions.invoke('createDirectUser', {
        username: form.username,
        email: form.email || '',
        password: form.password,
        cpf: form.cpf,
        role: form.role,
      });

      if (res.data?.success) {
        setSuccess('Usuário criado com sucesso!');
        setForm({ username: '', email: '', password: '', cpf: '', role: 'user' });
        setShowForm(false);
        loadData();
      } else {
        setError(res.data?.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
    setDeleteAdminUsername('');
    setDeleteAdminPassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteAdminUsername || !deleteAdminPassword) {
      setDeleteError('Usuário e senha do admin são obrigatórios');
      return;
    }

    try {
      // Validar credenciais do admin
      const res = await base44.functions.invoke('loginWithCredentials', {
        username: deleteAdminUsername,
        password: deleteAdminPassword
      });

      if (!res.data?.success || res.data?.user?.role !== 'admin') {
        setDeleteError('Credenciais de admin inválidas');
        return;
      }

      // Se validado, deletar o usuário
      await base44.entities.DirectUser.delete(userToDelete.id);
      setSuccess('Usuário deletado com sucesso!');
      setShowDeleteDialog(false);
      loadData();
    } catch (err) {
      setDeleteError('Erro ao validar credenciais');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      cpf: user.cpf,
      role: user.role
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.username || !editForm.cpf) {
      setError('Usuário e CPF são obrigatórios');
      return;
    }

    try {
      await base44.entities.DirectUser.update(editingUser.id, {
        username: editForm.username,
        email: editForm.email,
        cpf: editForm.cpf,
        role: editForm.role
      });
      setSuccess('Usuário atualizado com sucesso!');
      setEditingUser(null);
      loadData();
    } catch (err) {
      setError('Erro ao atualizar usuário');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await base44.entities.DirectUser.update(userId, { role: newRole });
      setSuccess('Role atualizado com sucesso!');
      loadData();
    } catch (err) {
      setError('Erro ao atualizar role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="dark-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground">Criar Novo Usuário</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus size={16} /> {showForm ? 'Cancelar' : 'Novo Usuário'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Usuário *</Label>
                <Input
                  className="mt-1.5 bg-secondary border-border"
                  placeholder="username"
                  value={form.username}
                  onChange={(e) => setForm({...form, username: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label className="text-foreground">CPF *</Label>
                <Input
                  className="mt-1.5 bg-secondary border-border"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({...form, cpf: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground">E-mail (opcional)</Label>
              <Input
                className="mt-1.5 bg-secondary border-border"
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Senha *</Label>
                <div className="relative mt-1.5">
                  <Input
                    className="bg-secondary border-border pr-10"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({...form, password: e.target.value})}
                    required
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
                <Label className="text-foreground">Role</Label>
                <Select value={form.role} onValueChange={(val) => setForm({...form, role: val})}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length === 0 ? (
                      <>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </>
                    ) : (
                      roles.map(r => (
                        <SelectItem key={r.id} value={r.name}>{r.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="gold-gradient text-background font-bold gap-2 w-full"
            >
              <Save size={16} /> {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')}><X size={16} /></button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Usuário *</Label>
              <Input
                className="mt-1.5 bg-secondary border-border"
                placeholder="username"
                value={editForm.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-foreground">E-mail</Label>
              <Input
                className="mt-1.5 bg-secondary border-border"
                type="email"
                placeholder="email@exemplo.com"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-foreground">CPF *</Label>
              <Input
                className="mt-1.5 bg-secondary border-border"
                placeholder="000.000.000-00"
                value={editForm.cpf}
                onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-foreground">Role</Label>
              <Select value={editForm.role} onValueChange={(val) => setEditForm({...editForm, role: val})}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </>
                  ) : (
                    roles.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="gold-gradient text-background">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle size={20} />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para deletar o usuário <strong>{userToDelete?.username}</strong>, informe as credenciais de um administrador.
            </p>
            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div>
              <Label className="text-foreground">Usuário Admin *</Label>
              <Input
                className="mt-1.5 bg-secondary border-border"
                placeholder="username"
                value={deleteAdminUsername}
                onChange={(e) => setDeleteAdminUsername(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-foreground">Senha Admin *</Label>
              <div className="relative mt-1.5">
                <Input
                  className="bg-secondary border-border pr-10"
                  type={showDeletePassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={deleteAdminPassword}
                  onChange={(e) => setDeleteAdminPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              Deletar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users List */}
      <div className="dark-card rounded-2xl p-6">
        <h3 className="font-bold text-foreground mb-4">Usuários do Sistema</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-3">Usuário</th>
                <th className="text-left py-3 px-3">E-mail</th>
                <th className="text-left py-3 px-3">Role</th>
                <th className="text-right py-3 px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-muted-foreground">
                    Nenhum usuário criado ainda
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="py-3 px-3 text-foreground font-semibold">{user.username || 'N/A'}</td>
                    <td className="py-3 px-3 text-muted-foreground">{user.email || 'N/A'}</td>
                    <td className="py-3 px-3">
                      <Select value={user.role} onValueChange={(val) => handleRoleChange(user.id, val)}>
                         <SelectTrigger className="w-32 h-8 bg-secondary border-border text-xs">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {roles.length === 0 ? (
                             <>
                               <SelectItem value="user">Usuário</SelectItem>
                               <SelectItem value="admin">Admin</SelectItem>
                             </>
                           ) : (
                             roles.map(r => (
                               <SelectItem key={r.id} value={r.name}>{r.label}</SelectItem>
                             ))
                           )}
                         </SelectContent>
                       </Select>
                    </td>
                    <td className="py-3 px-3 text-right flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                        className="text-accent hover:bg-accent/10 gap-2"
                      >
                        <Edit2 size={14} /> Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(user)}
                        className="text-destructive hover:bg-destructive/10 gap-2"
                      >
                        <Trash2 size={14} /> Deletar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}