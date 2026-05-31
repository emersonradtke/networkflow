import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { UserPlus, Trash2, Shield, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ROLE_CONFIG, ROLES } from '@/lib/roles-config';

const AVAILABLE_ROLES = [
  { value: ROLES.EMPLOYEE, label: 'Funcionário', desc: 'Gerencia pedidos e envios', color: 'bg-green-100 text-green-800' },
  { value: ROLES.FRANCHISE, label: 'Franquia', desc: 'Gerencia entregas da franquia', color: 'bg-purple-100 text-purple-800' },
  { value: ROLES.PARTNER, label: 'Parceiro', desc: 'Acesso a pedidos e entregas', color: 'bg-orange-100 text-orange-800' },
  { value: ROLES.GUEST, label: 'Visitante', desc: 'Acesso somente leitura à loja', color: 'bg-gray-100 text-gray-800' },
];

const ALL_PAGES = [
  { path: '/admin', label: 'Dashboard Admin' },
  { path: '/admin/associates', label: 'Associados' },
  { path: '/admin/products', label: 'Produtos' },
  { path: '/admin/orders', label: 'Pedidos' },
  { path: '/admin/withdrawals', label: 'Saques' },
  { path: '/admin/external-links', label: 'Links Externos' },
  { path: '/admin/network', label: 'Rede' },
  { path: '/admin/suppliers', label: 'Fornecedores' },
  { path: '/admin/shipping', label: 'Envio' },
  { path: '/admin/settings', label: 'Configurações' },
  { path: '/admin/support-tickets', label: 'Chamados' },
  { path: '/dashboard', label: 'Dashboard Associado' },
  { path: '/store', label: 'Loja' },
  { path: '/orders', label: 'Meus Pedidos' },
  { path: '/network', label: 'Minha Rede' },
  { path: '/wallet', label: 'Carteira' },
];

const emptyForm = { email: '', role: ROLES.EMPLOYEE };

export default function AdminRestrictedUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [customPages, setCustomPages] = useState([]);
  const [useCustomPages, setUseCustomPages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    const res = await base44.functions.invoke('getRestrictedUsers', { user_id: user.id });
    setUsers(res.data?.users || []);
    setLoading(false);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setCustomPages([]);
    setUseCustomPages(false);
    setError('');
    setShowModal(true);
  };

  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role }));
    // Pré-preencher páginas padrão do role
    const defaultPages = ROLE_CONFIG[role]?.menuItems?.map(i => i.path) || [];
    setCustomPages(defaultPages);
  };

  const togglePage = (path) => {
    setCustomPages(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim()) { setError('Email obrigatório'); return; }
    setSaving(true);
    try {
      await base44.users.inviteUser(form.email.trim(), form.role);
      // Se tiver páginas customizadas, salvar em UserPermission (usando Notification como workaround simples)
      // Na prática o controle de menu já é feito via role no roles-config
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao convidar usuário');
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    load();
  };

  const roleBadge = (role) => {
    const r = AVAILABLE_ROLES.find(r => r.value === role);
    return r ? <Badge className={`text-xs ${r.color}`}>{r.label}</Badge> : <Badge variant="outline" className="text-xs">{role}</Badge>;
  };

  const defaultPagesForRole = (role) => ROLE_CONFIG[role]?.menuItems?.map(i => i.path) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Usuários com Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm mt-1">Convide funcionários, parceiros e franquias com acesso limitado</p>
        </div>
        <Button onClick={openAdd} className="gap-2 font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
          <UserPlus size={16} /> Convidar Usuário
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AVAILABLE_ROLES.map(r => (
          <div key={r.value} className="dark-card rounded-xl p-4 space-y-1">
            <Badge className={`text-xs ${r.color}`}>{r.label}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
            <p className="text-xs font-semibold text-foreground">
              {ROLE_CONFIG[r.value]?.menuItems?.length || 0} telas
            </p>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <Shield size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Nenhum usuário restrito cadastrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Convide funcionários, parceiros ou franquias.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                  {u.full_name?.charAt(0) || u.email?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{u.full_name || '(Pendente)'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Telas: {defaultPagesForRole(u.role).map(p => ALL_PAGES.find(x => x.path === p)?.label).filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {roleBadge(u.role)}
                  <select
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground"
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                  >
                    {AVAILABLE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal convite */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-black">Convidar Usuário Restrito</DialogTitle>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo de Acesso</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {AVAILABLE_ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleRoleChange(r.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Badge className={`text-xs ${r.color}`}>{r.label}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Telas com acesso (baseado no papel):</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1">
                {ALL_PAGES.map(page => {
                  const defaultIncluded = defaultPagesForRole(form.role).includes(page.path);
                  return (
                    <div key={page.path} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${defaultIncluded ? 'border-green-200 bg-green-50' : 'border-border bg-secondary/30 opacity-50'}`}>
                      {defaultIncluded ? <Eye size={11} className="text-green-600 shrink-0" /> : <EyeOff size={11} className="text-muted-foreground shrink-0" />}
                      <span className={defaultIncluded ? 'text-foreground' : 'text-muted-foreground'}>{page.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Para personalizar as telas, altere o tipo de acesso acima ou edite o arquivo <code className="bg-secondary px-1 rounded">lib/roles-config.js</code>.</p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" disabled={saving} className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
              {saving ? 'Convidando...' : 'Enviar Convite'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}