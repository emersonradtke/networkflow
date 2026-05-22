import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { loadRoles } from '@/lib/role-helpers';

export default function UserCreationForm({ open, onOpenChange, onSuccess }) {
  const [roles, setRoles] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [associateId, setAssociateId] = useState('');
  const [searchAssociate, setSearchAssociate] = useState('');

  useEffect(() => {
    if (open) {
      loadRolesData();
      loadAssociatesData();
    }
  }, [open]);

  const loadRolesData = async () => {
    setLoadingRoles(true);
    try {
      const rolesData = await loadRoles(true);
      setRoles(rolesData);
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      toast.error('Erro ao carregar roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadAssociatesData = async () => {
    try {
      const data = await base44.entities.Associate.list('-created_date', 100);
      setAssociates(data);
    } catch (error) {
      console.error('Erro ao carregar associados:', error);
    }
  };

  const filteredAssociates = associates.filter(a =>
    a.full_name?.toLowerCase().includes(searchAssociate.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchAssociate.toLowerCase())
  );

  const handleCreate = async () => {
    if (!email || !fullName || !selectedRole) {
      toast.error('Preencha email, nome e role');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke('createUserWithRole', {
        email,
        full_name: fullName,
        role: selectedRole,
        associate_id: associateId || null
      });

      if (result?.data?.success) {
        toast.success('Usuário criado com sucesso');
        setEmail('');
        setFullName('');
        setSelectedRole('');
        setAssociateId('');
        setSearchAssociate('');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result?.data?.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error?.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleData = roles.find(r => r.name === selectedRole);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Email *</label>
            <Input
              placeholder="usuario@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Nome Completo *</label>
            <Input
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Role *</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger disabled={loadingRoles}>
                <SelectValue placeholder="Selecione um role" />
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

          {selectedRoleData && (
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Permissões:</p>
              <div className="flex flex-wrap gap-1">
                {selectedRoleData.permissions?.map((perm, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {selectedRole === 'associate' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Associado Relacionado (opcional)</label>
              <Input
                placeholder="Buscar por nome ou email"
                value={searchAssociate}
                onChange={(e) => setSearchAssociate(e.target.value)}
              />
              {searchAssociate && filteredAssociates.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-32 overflow-y-auto">
                  {filteredAssociates.map(associate => (
                    <button
                      key={associate.id}
                      className="w-full text-left px-3 py-2 hover:bg-secondary border-b last:border-b-0 text-sm"
                      onClick={() => {
                        setAssociateId(associate.id);
                        setSearchAssociate('');
                      }}
                    >
                      <div className="font-medium">{associate.full_name}</div>
                      <div className="text-xs text-muted-foreground">{associate.email}</div>
                    </button>
                  ))}
                </div>
              )}
              {associateId && (
                <div className="mt-2 p-2 bg-primary/10 rounded text-sm">
                  Associado vinculado: {associates.find(a => a.id === associateId)?.full_name}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-primary">
            {loading ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}