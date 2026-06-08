import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, CheckCircle2, Loader2 } from 'lucide-react';

const EMPTY_ADDR = {
  shipping_street: '', shipping_number: '', shipping_complement: '',
  shipping_neighborhood: '', shipping_city: '', shipping_state: '', shipping_zip: '',
  billing_same_as_shipping: true,
  billing_street: '', billing_number: '', billing_complement: '',
  billing_neighborhood: '', billing_city: '', billing_state: '', billing_zip: '',
};

function AddressFields({ prefix, data, onChange, label }) {
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const handleCepChange = async (raw) => {
    const digits = raw.replace(/\D/g, '');
    // Formata para 00000-000
    const formatted = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5,8)}` : digits;
    onChange(`${prefix}_zip`, formatted);
    setCepError('');

    if (digits.length === 8) {
      setLoadingCep(true);
      try {
        const res = await base44.functions.invoke('searchCepAddress', { cep: digits });
        const addr = res.data;
        if (addr && !addr.erro) {
          onChange(`${prefix}_street`, addr.logradouro || '');
          onChange(`${prefix}_neighborhood`, addr.bairro || '');
          onChange(`${prefix}_city`, addr.localidade || '');
          onChange(`${prefix}_state`, addr.uf || '');
        } else {
          setCepError('CEP não encontrado.');
        }
      } catch {
        setCepError('Erro ao buscar CEP.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground flex items-center gap-2">
        <MapPin size={14} className="text-primary" /> {label}
      </p>

      {/* CEP primeiro — preenche o restante */}
      <div>
        <Label className="text-xs">CEP</Label>
        <div className="relative mt-1">
          <Input
            placeholder="00000-000"
            maxLength={9}
            value={data[`${prefix}_zip`] || ''}
            onChange={e => handleCepChange(e.target.value)}
          />
          {loadingCep && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">Rua / Logradouro</Label>
          <Input className="mt-1" placeholder="Rua das Flores" value={data[`${prefix}_street`] || ''} onChange={e => onChange(`${prefix}_street`, e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Número</Label>
          <Input className="mt-1" placeholder="123" value={data[`${prefix}_number`] || ''} onChange={e => onChange(`${prefix}_number`, e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Complemento</Label>
          <Input className="mt-1" placeholder="Apto 4B" value={data[`${prefix}_complement`] || ''} onChange={e => onChange(`${prefix}_complement`, e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Bairro</Label>
          <Input className="mt-1" placeholder="Centro" value={data[`${prefix}_neighborhood`] || ''} onChange={e => onChange(`${prefix}_neighborhood`, e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Cidade</Label>
          <Input className="mt-1" placeholder="São Paulo" value={data[`${prefix}_city`] || ''} onChange={e => onChange(`${prefix}_city`, e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Estado (UF)</Label>
          <Input className="mt-1" placeholder="SP" maxLength={2} value={data[`${prefix}_state`] || ''} onChange={e => onChange(`${prefix}_state`, e.target.value.toUpperCase())} />
        </div>
      </div>
    </div>
  );
}

export default function AddressModal({ associate, open, onClose, onSaved, forceOpen = false }) {
  const [form, setForm] = useState(EMPTY_ADDR);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (associate) {
      setForm({
        shipping_street: associate.shipping_street || '',
        shipping_number: associate.shipping_number || '',
        shipping_complement: associate.shipping_complement || '',
        shipping_neighborhood: associate.shipping_neighborhood || '',
        shipping_city: associate.shipping_city || '',
        shipping_state: associate.shipping_state || '',
        shipping_zip: associate.shipping_zip || '',
        billing_same_as_shipping: associate.billing_same_as_shipping !== false,
        billing_street: associate.billing_street || '',
        billing_number: associate.billing_number || '',
        billing_complement: associate.billing_complement || '',
        billing_neighborhood: associate.billing_neighborhood || '',
        billing_city: associate.billing_city || '',
        billing_state: associate.billing_state || '',
        billing_zip: associate.billing_zip || '',
      });
    }
  }, [associate]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, addresses_completed: true };
    if (form.billing_same_as_shipping) {
      payload.billing_street = form.shipping_street;
      payload.billing_number = form.shipping_number;
      payload.billing_complement = form.shipping_complement;
      payload.billing_neighborhood = form.shipping_neighborhood;
      payload.billing_city = form.shipping_city;
      payload.billing_state = form.shipping_state;
      payload.billing_zip = form.shipping_zip;
    }
    await base44.entities.Associate.update(associate.id, payload);
    setSaving(false);
    onSaved?.(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={forceOpen ? undefined : onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Endereços
          </DialogTitle>
          {!associate?.addresses_completed && (
            <DialogDescription>
              Complete seus endereços de entrega e faturamento para poder realizar compras.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          <AddressFields prefix="shipping" data={form} onChange={setField} label="Endereço de Entrega" />

          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="billing_same"
              checked={form.billing_same_as_shipping}
              onChange={e => setField('billing_same_as_shipping', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="billing_same" className="text-sm text-foreground cursor-pointer">
              Endereço de faturamento igual ao de entrega
            </label>
          </div>

          {!form.billing_same_as_shipping && (
            <AddressFields prefix="billing" data={form} onChange={setField} label="Endereço de Faturamento" />
          )}

          <Button type="submit" disabled={saving} className="w-full gold-gradient text-background font-bold gap-2">
            <CheckCircle2 size={16} />
            {saving ? 'Salvando...' : 'Salvar Endereços'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}