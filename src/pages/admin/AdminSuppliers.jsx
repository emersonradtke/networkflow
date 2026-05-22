import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Building2, MapPin, Phone, Mail, Globe, Search, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emptyForm = {
  type: 'supplier', person_type: 'pj', name: '', trade_name: '', cnpj: '', cpf: '',
  contact_name: '', email: '', phone: '', phone2: '', website: '', category: '',
  address_street: '', address_number: '', address_complement: '', address_neighborhood: '',
  address_city: '', address_state: '', address_zip: '', notes: '', is_active: true,
};

const maskPhone = v => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const maskCNPJ = v => v.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/[-.]$/, '');
const maskCPF = v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '');
const maskZip = v => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');

export default function AdminSuppliers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.Supplier.list('-created_date');
    setItems(data);
    setLoading(false);
  };

  const openCreate = (type = 'supplier') => {
    setForm({ ...emptyForm, type });
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setForm({ ...emptyForm, ...item });
    setEditId(item.id);
    setDialogOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editId) await base44.entities.Supplier.update(editId, form);
    else await base44.entities.Supplier.create(form);
    setDialogOpen(false);
    load();
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Remover cadastro?')) return;
    await base44.entities.Supplier.delete(id);
    load();
  };

  const toggleActive = async (item) => {
    await base44.entities.Supplier.update(item.id, { is_active: !item.is_active });
    load();
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchType = typeFilter === 'all' || i.type === typeFilter;
    const matchSearch = !q ||
      i.name?.toLowerCase().includes(q) ||
      i.trade_name?.toLowerCase().includes(q) ||
      i.cnpj?.includes(q) ||
      i.city?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.contact_name?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const suppliers = items.filter(i => i.type === 'supplier').length;
  const franchises = items.filter(i => i.type === 'franchise').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Fornecedores & Franquias</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="font-semibold text-primary">{suppliers}</span> fornecedores · <span className="font-semibold text-primary">{franchises}</span> franquias
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-primary/30 text-primary" onClick={() => openCreate('franchise')}>
            <Store size={15} /> Nova Franquia
          </Button>
          <Button className="gold-gradient text-white font-bold gap-2" onClick={() => openCreate('supplier')}>
            <Plus size={15} /> Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos ({items.length})</TabsTrigger>
            <TabsTrigger value="supplier">Fornecedores ({suppliers})</TabsTrigger>
            <TabsTrigger value="franchise">Franquias ({franchises})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, CNPJ, cidade, categoria..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 dark-card rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">Nenhum cadastro encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div key={item.id} className={`dark-card rounded-xl p-4 space-y-3 ${!item.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={item.type === 'franchise'
                      ? 'bg-purple-100 text-purple-700 border-purple-200 text-xs'
                      : 'bg-blue-100 text-blue-700 border-blue-200 text-xs'}>
                      {item.type === 'franchise' ? <><Store size={10} className="mr-1" />Franquia</> : <><Building2 size={10} className="mr-1" />Fornecedor</>}
                    </Badge>
                    {item.category && <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{item.category}</span>}
                  </div>
                  <p className="font-bold text-foreground mt-1">{item.name}</p>
                  {item.trade_name && <p className="text-xs text-muted-foreground">{item.trade_name}</p>}
                  {(item.cnpj || item.cpf) && <p className="text-xs font-mono text-muted-foreground">{item.cnpj || item.cpf}</p>}
                </div>
                <Switch checked={!!item.is_active} onCheckedChange={() => toggleActive(item)} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {item.contact_name && <span className="flex items-center gap-1 truncate"><Building2 size={11} />{item.contact_name}</span>}
                {item.phone && <span className="flex items-center gap-1 truncate"><Phone size={11} />{item.phone}</span>}
                {item.email && <span className="flex items-center gap-1 truncate col-span-2"><Mail size={11} />{item.email}</span>}
                {item.website && <span className="flex items-center gap-1 truncate col-span-2"><Globe size={11} />{item.website}</span>}
                {(item.address_city || item.address_state) && (
                  <span className="flex items-center gap-1 truncate col-span-2">
                    <MapPin size={11} />
                    {[item.address_street && `${item.address_street}${item.address_number ? `, ${item.address_number}` : ''}`, item.address_neighborhood, item.address_city, item.address_state].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-1 border-t border-border">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)}>
                  <Pencil size={12} /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-red-400 hover:text-red-600" onClick={() => remove(item.id)}>
                  <Trash2 size={12} /> Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-black">
              {editId ? 'Editar' : 'Novo'} {form.type === 'franchise' ? 'Franquia' : 'Fornecedor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">

            {/* Tipo */}
            <div className="flex gap-3">
              {['supplier', 'franchise'].map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${form.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {t === 'franchise' ? <><Store size={15} /> Franquia</> : <><Building2 size={15} /> Fornecedor</>}
                </button>
              ))}
            </div>

            {/* Pessoa */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Pessoa</Label>
                <Select value={form.person_type} onValueChange={v => set('person_type', v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria / Segmento</Label>
                <Input className="mt-1.5" placeholder="Ex: Alimentos, Tecnologia..." value={form.category} onChange={e => set('category', e.target.value)} />
              </div>
            </div>

            {/* Nome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{form.person_type === 'pj' ? 'Razão Social' : 'Nome Completo'} *</Label>
                <Input className="mt-1.5" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <Label>{form.person_type === 'pj' ? 'Nome Fantasia' : 'Apelido'}</Label>
                <Input className="mt-1.5" value={form.trade_name} onChange={e => set('trade_name', e.target.value)} />
              </div>
            </div>

            {/* Doc */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{form.person_type === 'pj' ? 'CNPJ' : 'CPF'}</Label>
                <Input className="mt-1.5 font-mono"
                  value={form.person_type === 'pj' ? form.cnpj : form.cpf}
                  onChange={e => set(form.person_type === 'pj' ? 'cnpj' : 'cpf', form.person_type === 'pj' ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                  placeholder={form.person_type === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                />
              </div>
              <div>
                <Label>Responsável / Contato</Label>
                <Input className="mt-1.5" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
              </div>
            </div>

            {/* Contatos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input className="mt-1.5" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Telefone 2</Label>
                <Input className="mt-1.5" value={form.phone2} onChange={e => set('phone2', maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <Input className="mt-1.5" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <Label>Website</Label>
                <Input className="mt-1.5" placeholder="https://..." value={form.website} onChange={e => set('website', e.target.value)} />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2"><MapPin size={14} className="text-primary" /> Endereço</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Logradouro / Rua</Label>
                  <Input className="mt-1.5" value={form.address_street} onChange={e => set('address_street', e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input className="mt-1.5" value={form.address_number} onChange={e => set('address_number', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Complemento</Label>
                  <Input className="mt-1.5" value={form.address_complement} onChange={e => set('address_complement', e.target.value)} />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input className="mt-1.5" value={form.address_neighborhood} onChange={e => set('address_neighborhood', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>CEP</Label>
                  <Input className="mt-1.5 font-mono" value={form.address_zip} onChange={e => set('address_zip', maskZip(e.target.value))} placeholder="00000-000" />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input className="mt-1.5" value={form.address_city} onChange={e => set('address_city', e.target.value)} />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input className="mt-1.5 uppercase" maxLength={2} value={form.address_state} onChange={e => set('address_state', e.target.value.toUpperCase())} placeholder="SP" />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informações adicionais, condições comerciais, etc..." />
            </div>

            <Button type="submit" disabled={saving} className="w-full font-bold text-white"
              style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
              {saving ? 'Salvando...' : editId ? 'Salvar Alterações' : `Cadastrar ${form.type === 'franchise' ? 'Franquia' : 'Fornecedor'}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}