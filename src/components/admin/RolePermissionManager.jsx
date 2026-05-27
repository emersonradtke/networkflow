import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_PERMISSIONS = [
  'all',
  'view_store',
  'make_purchases',
  'view_network',
  'view_wallet',
  'view_orders',
  'manage_shipping',
  'view_products',
  'manage_products',
  'manage_users',
  'manage_associates',
  'manage_withdrawals'
];

export default function RolePermissionManager() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    color: 'bg-blue-100 text-blue-800',
    permissions: []
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const allRoles = await base44.entities.Role.list('-created_date', 100);
      
      // Deduplicar por name — manter apenas o primeiro encontrado por nome
      const seen = new Set();
      const uniqueRoles = allRoles.filter(r => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      });

      setRoles(uniqueRoles);
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      toast.error('Erro ao carregar roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        label: role.label,
        description: role.description || '',
        color: role.color || 'bg-blue-100 text-blue-800',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        label: '',
        description: '',
        color: 'bg-blue-100 text-blue-800',
        permissions: []
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.label) {
      toast.error('Nome e label são obrigatórios');
      return;
    }

    try {
      if (editingRole) {
        // Se é um role do sistema, criar uma override na entidade Role
        if (editingRole.is_system && editingRole.id.startsWith('system_')) {
          // Procurar se já existe uma override
          const existing = await base44.entities.Role.filter({ name: editingRole.name });
          if (existing.length > 0) {
            await base44.entities.Role.update(existing[0].id, formData);
          } else {
            await base44.entities.Role.create(formData);
          }
        } else {
          await base44.entities.Role.update(editingRole.id, formData);
        }
        toast.success('Role atualizado');
      } else {
        await base44.entities.Role.create(formData);
        toast.success('Role criado');
      }
      await loadRoles();
      setShowDialog(false);
    } catch (error) {
      console.error('Erro ao salvar role:', error);
      toast.error('Erro ao salvar role');
    }
  };

  const handleDelete = async (role) => {
    if (role.is_system) {
      toast.error('Não é possível deletar roles do sistema');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja deletar o role "${role.label}"?`)) {
      return;
    }

    try {
      // Apenas deletar se tiver um ID real da entidade (não é sistema)
      if (!role.id.startsWith('system_')) {
        await base44.entities.Role.delete(role.id);
      }
      await loadRoles();
      toast.success('Role deletado');
    } catch (error) {
      console.error('Erro ao deletar role:', error);
      toast.error('Erro ao deletar role');
    }
  };

  const togglePermission = (permission) => {
    if (formData.permissions.includes(permission)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permission)
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission]
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Gerenciar Roles e Permissões</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-primary">
          <Plus size={18} className="mr-2" />
          Novo Role
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum role encontrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className={`p-4 rounded-lg border border-border ${role.color}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{role.label}</h3>
                  <p className="text-xs opacity-75 mt-1">{role.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(role)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit size={14} />
                  </Button>
                  {!role.is_system && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(role)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">Permissões:</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.length === 0 ? (
                    <span className="text-xs opacity-60">Sem permissões</span>
                  ) : (
                    role.permissions.map(perm => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {perm === 'all' ? 'Acesso Total' : perm.replace('_', ' ')}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Role' : 'Novo Role'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: franchise"
                  disabled={editingRole ? true : false}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Label</label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: Franquia"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Descrição</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do role"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Cor</label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3"
              >
                <option value="bg-blue-100 text-blue-800">Azul</option>
                <option value="bg-red-100 text-red-800">Vermelho</option>
                <option value="bg-green-100 text-green-800">Verde</option>
                <option value="bg-purple-100 text-purple-800">Roxo</option>
                <option value="bg-orange-100 text-orange-800">Laranja</option>
                <option value="bg-gray-100 text-gray-800">Cinza</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Permissões</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm text-foreground">
                      {perm === 'all' ? 'Acesso Total' : perm.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary">
              {editingRole ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}