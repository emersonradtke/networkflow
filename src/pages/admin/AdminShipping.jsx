import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const EMPTY = { name: '', description: '', price: 0, estimated_days: '', is_active: true };

export default function AdminShipping() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.ShippingMethod.list('-created_date');
    setMethods(data);
    setLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ name: m.name, description: m.description || '', price: m.price || 0, estimated_days: m.estimated_days || '', is_active: m.is_active !== false }); setDialogOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) || 0, estimated_days: parseInt(form.estimated_days) || null };
    if (editing) {
      await base44.entities.ShippingMethod.update(editing.id, payload);
    } else {
      await base44.entities.ShippingMethod.create(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir este método de envio?')) return;
    await base44.entities.ShippingMethod.delete(id);
    load();
  };

  const toggleActive = async (m) => {
    await base44.entities.ShippingMethod.update(m.id, { is_active: !m.is_active });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Métodos de Envio</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure os tipos de envio disponíveis na loja</p>
        </div>
        <Button onClick={openNew} className="gold-gradient text-background font-bold gap-2">
          <Plus size={16} /> Novo Método
        </Button>
      </div>

      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : methods.length === 0 ? (
          <div className="p-8 text-center">
            <Truck size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">Nenhum método de envio cadastrado.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={openNew}>Criar primeiro método</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {methods.map(m => (
              <div key={m.id} className="p-4 hover:bg-secondary/20 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Truck size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{m.name}</p>
                    <Badge className={m.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-secondary text-muted-foreground'}>
                      {m.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="font-semibold text-primary">R$ {(m.price || 0).toFixed(2)}</span>
                    {m.estimated_days && <span>{m.estimated_days} dias úteis</span>}
                    {m.description && <span>{m.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleActive(m)} title={m.is_active ? 'Desativar' : 'Ativar'}>
                    {m.is_active ? <XCircle size={15} className="text-muted-foreground" /> : <CheckCircle size={15} className="text-green-500" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(m)}>
                    <Pencil size={14} className="text-muted-foreground" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete(m.id)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">{editing ? 'Editar Método' : 'Novo Método de Envio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input className="mt-1.5" placeholder="Ex: PAC, SEDEX, Motoboy" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço (R$)</Label>
                <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>Prazo (dias úteis)</Label>
                <Input className="mt-1.5" type="number" placeholder="5" value={form.estimated_days} onChange={e => setForm(f => ({ ...f, estimated_days: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1.5" placeholder="Informações adicionais" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active_check" className="w-4 h-4 accent-primary" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="active_check" className="text-sm cursor-pointer">Ativo (disponível na loja)</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="gold-gradient text-background font-bold">
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}