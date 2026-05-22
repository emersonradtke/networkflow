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
import { Shield, Edit, Search, Plus } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newRole, setNewRole] = useState('associate');

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

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    try {
      await base44.auth.updateMe({ role: newRole });
      await loadUsers();
      setShowDialog(false);
      setSelectedUser(null);
    } catch (error) {
      alert('Erro ao atualizar role');
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
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Usuário</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Data Criação</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">{user.full_name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-3">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">
                      {new Date(user.created_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role || 'associate');
                          setShowDialog(true);
                        }}
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Role do Usuário</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Usuário</p>
                <p className="font-semibold text-foreground">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Novo Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {config.label} - {config.description}
                        </span>
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
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} className="bg-primary">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}