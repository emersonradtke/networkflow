import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Package, ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emptyForm = { name: '', description: '', price: '', commission_percent: '', image_url: '', type: 'direct_sale', external_url: '', category: '', is_active: true };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const data = await base44.entities.Product.list('-created_date');
    setProducts(data);
    setLoading(false);
  };

  const openCreate = () => { setForm(emptyForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (p) => {
    setForm({ ...p, price: p.price?.toString(), commission_percent: p.commission_percent?.toString() });
    setEditId(p.id);
    setDialogOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price), commission_percent: parseFloat(form.commission_percent) };
    if (editId) await base44.entities.Product.update(editId, data);
    else await base44.entities.Product.create(data);
    setDialogOpen(false);
    loadProducts();
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Remover produto?')) return;
    await base44.entities.Product.delete(id);
    loadProducts();
  };

  const toggleActive = async (p) => {
    await base44.entities.Product.update(p.id, { is_active: !p.is_active });
    loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o catálogo da loja virtual</p>
        </div>
        <Button className="gold-gradient text-background font-bold gap-2" onClick={openCreate}>
          <Plus size={16} /> Novo Produto
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 dark-card rounded-xl animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
          <Button className="mt-4 gold-gradient text-background font-bold gap-2" onClick={openCreate}><Plus size={16} /> Adicionar Produto</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className={`dark-card rounded-xl p-4 flex gap-4 ${!p.is_active ? 'opacity-50' : ''}`}>
              <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden shrink-0">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={20} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-base font-black text-primary">R$ {p.price?.toFixed(2)}</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{p.commission_percent}% comissão</Badge>
                  <Badge className={p.type === 'external_link' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs' : 'bg-green-500/20 text-green-400 border-green-500/30 text-xs'}>
                    {p.type === 'external_link' ? <><ExternalLink size={10} className="mr-1" />Externo</> : <><ShoppingBag size={10} className="mr-1" />Direto</>}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-foreground gap-1" onClick={() => openEdit(p)}>
                    <Pencil size={12} /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300 gap-1" onClick={() => remove(p.id)}>
                    <Trash2 size={12} /> Remover
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-black">{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-foreground">Nome</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="col-span-2">
                <Label className="text-foreground">Descrição</Label>
                <Textarea className="mt-1.5 bg-secondary border-border text-foreground resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div>
                <Label className="text-foreground">Preço (R$)</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
              </div>
              <div>
                <Label className="text-foreground">Comissão (%)</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" type="number" step="0.1" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} required />
              </div>
              <div>
                <Label className="text-foreground">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="direct_sale">Venda Direta</SelectItem>
                    <SelectItem value="external_link">Link Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Categoria</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" placeholder="Ex: Suplementos" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label className="text-foreground">URL da Imagem</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" placeholder="https://..." value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} />
              </div>
              {form.type === 'external_link' && (
                <div className="col-span-2">
                  <Label className="text-foreground">URL do Marketplace</Label>
                  <Input className="mt-1.5 bg-secondary border-border text-foreground" placeholder="https://marketplace.com/produto" value={form.external_url} onChange={e => setForm({...form, external_url: e.target.value})} />
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving} className="w-full gold-gradient text-background font-bold">
              {saving ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}