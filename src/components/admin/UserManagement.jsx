import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Save, X, Eye, EyeOff } from 'lucide-react';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userList = await base44.entities.DirectUser.list();
      setUsers(userList);
      const roleList = await base44.entities.Role.list();
      setRoles(roleList);
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

  const handleDelete = async (userId) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await base44.entities.DirectUser.delete(userId);
      setSuccess('Usuário deletado com sucesso!');
      loadData();
    } catch (err) {
      setError('Erro ao deletar usuário');
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
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.label}</SelectItem>
                    ))}
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
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.name}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
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