import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { saveAssociateAddress, addressFormFromAssociate } from '@/lib/saveAssociateAddress';

// Campos de um endereço com busca de CEP automática
export function AddressFields({ prefix, data, onChange, label }) {
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const handleCepChange = async (raw) => {
    const digits = raw.replace(/\D/g, '');
    const formatted = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5,8)}` : digits;
    onChange(`${prefix}_zip`, formatted);
    setCepError('');

    if (digits.length === 8) {
      setLoadingCep(true);
      try {
        const res = await base44.functions.invoke('searchCepAddress', { cep: digits });
        const addr = res.data;
        if (addr && !addr.erro) {
          onChange(`${prefix}_street`, addr.logradouro || addr.address || '');
          onChange(`${prefix}_neighborhood`, addr.bairro || addr.neighborhood || '');
          onChange(`${prefix}_city`, addr.localidade || addr.city || '');
          onChange(`${prefix}_state`, addr.uf || addr.state || '');
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
  const [form, setForm] = useState(addressFormFromAssociate({}));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (associate) setForm(addressFormFromAssociate(associate));
  }, [associate]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const saved = await saveAssociateAddress(associate.id, form);
    setSaving(false);
    onSaved?.(saved);
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