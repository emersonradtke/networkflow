import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AddressFields } from '@/components/AddressModal';
import { saveAssociateAddress, addressFormFromAssociate } from '@/lib/saveAssociateAddress';

export default function ProfileDataSection({ associate }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    cnpj: '',
    company_name: '',
    person_type: 'pf',
    ...addressFormFromAssociate({}),
  });

  useEffect(() => {
    if (associate) {
      setForm({
        full_name: associate.full_name || '',
        email: associate.email || '',
        phone: associate.phone || '',
        cpf: associate.cpf || '',
        cnpj: associate.cnpj || '',
        company_name: associate.company_name || '',
        person_type: associate.person_type || 'pf',
        ...addressFormFromAssociate(associate),
      });
    }
  }, [associate]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.full_name?.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe seu nome completo.', variant: 'destructive' });
      return;
    }
    if (!form.email?.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe seu e-mail.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Salva dados pessoais
      await base44.entities.Associate.update(associate.id, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        company_name: form.company_name,
      });
      // Salva endereço usando a função centralizada
      await saveAssociateAddress(associate.id, form);
      toast({ title: 'Dados atualizados!', description: 'Suas informações foram salvas com sucesso.' });
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-foreground">Dados de Cadastro</h2>
        <p className="text-sm text-muted-foreground mt-1">Visualize e atualize suas informações pessoais.</p>
      </div>

      {/* Documento */}
      <div className="dark-card rounded-2xl p-5 space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          {form.person_type === 'pf' ? 'CPF' : 'CNPJ'}
        </p>
        <p className="text-2xl font-black text-foreground">
          {form.person_type === 'pf' ? form.cpf : form.cnpj}
        </p>
      </div>

      {/* Informações Pessoais */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Informações Pessoais</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nome completo <span className="text-red-500">*</span></Label>
          <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Seu nome completo" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de pessoa</Label>
          <Select value={form.person_type} onValueChange={v => set('person_type', v)}>
            <SelectTrigger disabled>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pf">Pessoa Física</SelectItem>
              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Tipo não pode ser alterado após cadastro.</p>
        </div>

        {form.person_type === 'pf' ? (
          <div className="space-y-1.5">
            <Label className="text-xs">CPF</Label>
            <Input value={form.cpf} disabled placeholder="CPF" className="bg-muted" />
            <p className="text-xs text-muted-foreground">CPF não pode ser alterado.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ</Label>
              <Input value={form.cnpj} disabled placeholder="CNPJ" className="bg-muted" />
              <p className="text-xs text-muted-foreground">CNPJ não pode ser alterado.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Razão Social</Label>
              <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Razão social da empresa" />
            </div>
          </>
        )}
      </div>

      {/* Contato */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Contato</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">E-mail <span className="text-red-500">*</span></Label>
          <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" type="email" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Telefone</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="11999999999" maxLength={11} />
        </div>
      </div>

      {/* Endereço — usando o mesmo AddressFields do AddressModal */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Endereço de Entrega</h3>
        </div>

        <AddressFields prefix="shipping" data={form} onChange={set} label="" />

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="billing_same_profile"
            checked={form.billing_same_as_shipping}
            onChange={e => set('billing_same_as_shipping', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="billing_same_profile" className="text-sm text-foreground cursor-pointer">
            Endereço de faturamento igual ao de entrega
          </label>
        </div>

        {!form.billing_same_as_shipping && (
          <AddressFields prefix="billing" data={form} onChange={set} label="Endereço de Faturamento" />
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full font-bold">
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  );
}