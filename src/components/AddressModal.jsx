import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { useCEP } from '@/hooks/useCEP';

const EMPTY_ADDR = {
  shipping_street: '', shipping_number: '', shipping_complement: '',
  shipping_neighborhood: '', shipping_city: '', shipping_state: '', shipping_zip: '',
  billing_same_as_shipping: true,
  billing_street: '', billing_number: '', billing_complement: '',
  billing_neighborhood: '', billing_city: '', billing_state: '', billing_zip: '',
};

function AddressFields({ prefix, data, onChange, label }) {
  const { searchCEP, loading: cepLoading, error: cepError } = useCEP();
  const [localCep, setLocalCep] = useState('');
  const numberInputRef = useRef(null);

  const handleCEPSearch = async () => {
    if (!localCep) return;
    const result = await searchCEP(localCep);
    if (result) {
      onChange(`${prefix}_street`, result.street);
      onChange(`${prefix}_neighborhood`, result.neighborhood);
      onChange(`${prefix}_city`, result.city);
      onChange(`${prefix}_state`, result.state);
      onChange(`${prefix}_zip`, result.zipCode);
      onChange(`${prefix}_number`, '');
      onChange(`${prefix}_complement`, '');
      setTimeout(() => {
        if (numberInputRef.current) {
          numberInputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground flex items-center gap-2">
        <MapPin size={14} className="text-primary" /> {label}
      </p>

      {/* CEP Search */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
        <Label className="text-xs font-bold">Buscar por CEP</Label>
        <div className="flex gap-2">
          <Input
            value={localCep}
            onChange={e => setLocalCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="00000000"
            maxLength={8}
            className="text-sm"
          />
          <Button
            type="button"
            onClick={handleCEPSearch}
            disabled={cepLoading || !localCep}
            variant="outline"
            className="px-3 text-sm"
          >
            {cepLoading ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
          </Button>
        </div>
        {cepError && <p className="text-xs text-red-500">{cepError}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Rua / Logradouro</Label>
        <Input className="mt-1" placeholder="Rua das Flores" value={data[`${prefix}_street`] || ''} onChange={e => onChange(`${prefix}_street`, e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">Número <span className="text-red-500">*</span></Label>
          <Input ref={numberInputRef} className="mt-1" placeholder="123" value={data[`${prefix}_number`] || ''} onChange={e => onChange(`${prefix}_number`, e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Complemento</Label>
          <Input className="mt-1" placeholder="Apto 4B" value={data[`${prefix}_complement`] || ''} onChange={e => onChange(`${prefix}_complement`, e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Bairro</Label>
        <Input className="mt-1" placeholder="Centro" value={data[`${prefix}_neighborhood`] || ''} onChange={e => onChange(`${prefix}_neighborhood`, e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">CEP</Label>
          <Input className="mt-1" placeholder="00000000" value={data[`${prefix}_zip`] || ''} onChange={e => onChange(`${prefix}_zip`, e.target.value)} />
        </div>
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