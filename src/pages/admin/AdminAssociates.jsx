import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, UserCheck, UserX, CheckCircle, XCircle, ChevronDown, Pencil, Trash2, Network } from 'lucide-react';
import PlacementModal from '@/components/PlacementModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Máscaras
const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const maskCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '').replace(/\.(\.|-)/, '.');
};

const validateCPF = (cpf) => {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
};

const validatePhone = (phone) => phone.replace(/\D/g, '').length >= 10;

export default function AdminAssociates() {
  const [associates, setAssociates] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editAssociate, setEditAssociate] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [placingAssociate, setPlacingAssociate] = useState(null);

  useEffect(() => { loadAssociates(); }, []);

  const loadAssociates = async () => {
    const data = await base44.entities.Associate.list('-created_date');
    setAssociates(data);
    setLoading(false);
  };

  const activate = async (assoc) => {
    // Verificar se o patrocinador atingiu o limite de níveis
    if (assoc.sponsor_id) {
      const [configs, sponsorDownline] = await Promise.all([
        base44.entities.NetworkConfig.list(),
        base44.entities.Associate.filter({ sponsor_id: assoc.sponsor_id }),
      ]);
      const maxLevels = configs[0]?.max_levels || 5;
      if (sponsorDownline.length >= maxLevels) {
        // Colocar em aguardando colocação em vez de ativar
        await base44.entities.Associate.update(assoc.id, { status: 'awaiting_placement', adhesion_paid: true });
        await base44.entities.Notification.create({
          associate_id: assoc.id,
          title: 'Aguardando Colocação na Rede',
          message: `Seu patrocinador ${assoc.sponsor_name || ''} já atingiu o limite de membros diretos. O administrador irá alocar você em outra posição da rede em breve.`,
          type: 'system',
          is_read: false,
        });
        loadAssociates();
        return;
      }
    }
    await base44.entities.Associate.update(assoc.id, { status: 'active', adhesion_paid: true });
    await base44.entities.Notification.create({
      associate_id: assoc.id,
      title: 'Conta Ativada! 🎉',
      message: 'Seu pagamento foi confirmado. Bem-vindo à Bold Life! Acesse a loja e comece a ganhar.',
      type: 'activation',
      is_read: false,
    });
    loadAssociates();
  };

  const block = async (id) => {
    await base44.entities.Associate.update(id, { status: 'blocked' });
    loadAssociates();
  };

  const unblock = async (id) => {
    await base44.entities.Associate.update(id, { status: 'active' });
    loadAssociates();
  };

  const deleteAssociate = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este associado? Esta ação não pode ser desfeita.')) return;
    await base44.entities.Associate.delete(id);
    loadAssociates();
  };

  const openEdit = (a) => {
    setEditForm({
      full_name: a.full_name || '',
      email: a.email || '',
      phone: a.phone ? maskPhone(a.phone) : '',
      cpf: a.cpf ? maskCPF(a.cpf) : '',
      pix_key: a.pix_key || '',
      address: a.address || '',
      city: a.city || '',
      state: a.state || '',
      status: a.status || 'pending',
    });
    setErrors({});
    setEditAssociate(a);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (editForm.cpf && !validateCPF(editForm.cpf)) errs.cpf = 'CPF inválido';
    if (editForm.phone && !validatePhone(editForm.phone)) errs.phone = 'Telefone inválido';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    await base44.entities.Associate.update(editAssociate.id, {
      ...editForm,
      phone: editForm.phone.replace(/\D/g, ''),
      cpf: editForm.cpf.replace(/\D/g, ''),
    });
    setEditAssociate(null);
    loadAssociates();
    setSaving(false);
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
      active: { label: 'Ativo', cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
      blocked: { label: 'Bloqueado', cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
      inactive: { label: 'Inativo', cls: 'bg-secondary text-muted-foreground' },
      awaiting_placement: { label: 'Ag. Colocação', cls: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
    };
    const s = map[status] || map.inactive;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const filtered = associates
    .filter(a => filter === 'all' || a.status === filter || (filter === 'awaiting_placement' && a.status === 'awaiting_placement'))
    .filter(a =>
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.cpf?.includes(search.replace(/\D/g, ''))
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Associados</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie todos os membros da rede</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, email ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'active', 'awaiting_placement', 'blocked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
              style={filter === f ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'active' ? 'Ativos' : f === 'awaiting_placement' ? 'Ag. Colocação' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum associado encontrado.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 text-sm"
                  style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                  {a.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {a.phone && <p className="text-xs text-muted-foreground">{maskPhone(a.phone)}</p>}
                    {a.cpf && <p className="text-xs text-muted-foreground">CPF: {maskCPF(a.cpf)}</p>}
                    {a.sponsor_name && <p className="text-xs text-muted-foreground">Patroc.: <span className="text-primary">{a.sponsor_name}</span></p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(a.status)}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(a)}>
                    <Pencil size={14} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {a.status === 'pending' && (
                        <DropdownMenuItem onClick={() => activate(a)} className="text-green-600 gap-2">
                          <CheckCircle size={14} /> Ativar
                        </DropdownMenuItem>
                      )}
                      {a.status === 'awaiting_placement' && (
                        <DropdownMenuItem onClick={() => setPlacingAssociate(a)} className="text-blue-600 gap-2">
                          <Network size={14} /> Alocar na Rede
                        </DropdownMenuItem>
                      )}
                      {a.status === 'active' && (
                        <DropdownMenuItem onClick={() => block(a.id)} className="text-red-500 gap-2">
                          <XCircle size={14} /> Bloquear
                        </DropdownMenuItem>
                      )}
                      {a.status === 'blocked' && (
                        <DropdownMenuItem onClick={() => unblock(a.id)} className="text-green-600 gap-2">
                          <CheckCircle size={14} /> Desbloquear
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => deleteAssociate(a.id)} className="text-red-500 gap-2">
                        <Trash2 size={14} /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Alocação */}
      {placingAssociate && (
        <PlacementModal
          associate={placingAssociate}
          onClose={() => setPlacingAssociate(null)}
          onPlaced={loadAssociates}
        />
      )}

      {/* Modal Edição */}
      <Dialog open={!!editAssociate} onOpenChange={() => setEditAssociate(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-black">Editar Associado</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo</Label>
                <Input className="mt-1.5" value={editForm.full_name || ''} onChange={e => setEditForm(f => ({...f, full_name: e.target.value}))} required />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input className="mt-1.5" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} required />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  className={`mt-1.5 ${errors.phone ? 'border-red-400' : ''}`}
                  value={editForm.phone || ''}
                  placeholder="(00) 00000-0000"
                  onChange={e => setEditForm(f => ({...f, phone: maskPhone(e.target.value)}))}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  className={`mt-1.5 ${errors.cpf ? 'border-red-400' : ''}`}
                  value={editForm.cpf || ''}
                  placeholder="000.000.000-00"
                  onChange={e => setEditForm(f => ({...f, cpf: maskCPF(e.target.value)}))}
                />
                {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
              </div>
              <div className="col-span-2">
                <Label>Chave Pix</Label>
                <Input className="mt-1.5" placeholder="CPF, email, telefone ou chave aleatória" value={editForm.pix_key || ''} onChange={e => setEditForm(f => ({...f, pix_key: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input className="mt-1.5" value={editForm.address || ''} onChange={e => setEditForm(f => ({...f, address: e.target.value}))} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input className="mt-1.5" value={editForm.city || ''} onChange={e => setEditForm(f => ({...f, city: e.target.value}))} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input className="mt-1.5" placeholder="SP" maxLength={2} value={editForm.state || ''} onChange={e => setEditForm(f => ({...f, state: e.target.value.toUpperCase()}))} />
              </div>
              <div className="col-span-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({...f, status: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="awaiting_placement">Ag. Colocação</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}