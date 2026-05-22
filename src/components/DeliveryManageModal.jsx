import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, MapPin, Calendar } from 'lucide-react';

const deliveryStatuses = [
  { value: 'pending',    label: 'Aguardando' },
  { value: 'processing', label: 'Em separação' },
  { value: 'shipped',    label: 'Enviado' },
  { value: 'delivered',  label: 'Entregue' },
  { value: 'returned',   label: 'Devolvido' },
];

export default function DeliveryManageModal({ order, open, onClose, onSaved }) {
  const [shippingMethods, setShippingMethods] = useState([]);
  const [form, setForm] = useState({
    shipping_method_id: '',
    shipping_method_name: '',
    shipping_cost: 0,
    delivery_status: 'pending',
    tracking_code: '',
    scheduled_date: '',
    scheduled_time: '',
    delivery_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ShippingMethod.filter({ is_active: true }).then(setShippingMethods);
  }, []);

  useEffect(() => {
    if (order) {
      setForm({
        shipping_method_id: order.shipping_method_id || '',
        shipping_method_name: order.shipping_method_name || '',
        shipping_cost: order.shipping_cost || 0,
        delivery_status: order.delivery_status || 'pending',
        tracking_code: order.tracking_code || '',
        scheduled_date: order.scheduled_date || '',
        scheduled_time: order.scheduled_time || '',
        delivery_notes: order.delivery_notes || '',
      });
    }
  }, [order]);

  const handleMethodChange = (id) => {
    const method = shippingMethods.find(m => m.id === id);
    setForm(f => ({
      ...f,
      shipping_method_id: id,
      shipping_method_name: method?.name || '',
      shipping_cost: method?.price || 0,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Order.update(order.id, form);
    setSaving(false);
    onSaved?.();
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <Truck size={18} className="text-primary" /> Gerenciar Entrega
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{order.product_name} · {order.associate_name}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Envio</Label>
            <Select value={form.shipping_method_id} onValueChange={handleMethodChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecionar método de envio..." />
              </SelectTrigger>
              <SelectContent>
                {shippingMethods.length === 0 && (
                  <SelectItem value="_none" disabled>Nenhum método cadastrado</SelectItem>
                )}
                {shippingMethods.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} — R$ {(m.price || 0).toFixed(2)} {m.estimated_days ? `(${m.estimated_days}d)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Custo do Frete (R$)</Label>
              <Input className="mt-1.5" type="number" step="0.01" value={form.shipping_cost}
                onChange={e => setForm(f => ({ ...f, shipping_cost: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Status da Entrega</Label>
              <Select value={form.delivery_status} onValueChange={v => setForm(f => ({ ...f, delivery_status: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deliveryStatuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Código de Rastreio</Label>
            <Input className="mt-1.5 font-mono text-sm" placeholder="Ex: BR123456789BR" value={form.tracking_code}
              onChange={e => setForm(f => ({ ...f, tracking_code: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data do Agendamento</Label>
              <Input className="mt-1.5" type="date" value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <Label>Horário</Label>
              <Input className="mt-1.5" type="time" value={form.scheduled_time}
                onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Observações de Entrega</Label>
            <Input className="mt-1.5" placeholder="Ex: Entregar apenas com destinatário, agende com 24h antecedência..." value={form.delivery_notes}
              onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))} />
          </div>

          {/* Endereço completo de entrega */}
          {order.shipping_city && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MapPin size={12} /> Endereço de Entrega
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-foreground font-semibold">
                  {[order.shipping_street, order.shipping_number].filter(Boolean).join(', ')}
                </p>
                {order.shipping_complement && (
                  <p className="text-foreground">Complemento: {order.shipping_complement}</p>
                )}
                <p className="text-foreground">{order.shipping_neighborhood}</p>
                <p className="text-muted-foreground">
                  {order.shipping_city}, {order.shipping_state}
                  {order.shipping_zip && ` — CEP ${order.shipping_zip}`}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gold-gradient text-background font-bold">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}