import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCEP } from '@/hooks/useCEP';

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function ProfileDataSection({ associate }) {
  const { toast } = useToast();
  const { searchCEP, loading: cepLoading, error: cepError } = useCEP();
  const [saving, setSaving] = useState(false);
  const [cep, setCep] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    cnpj: '',
    company_name: '',
    person_type: 'pf',
    address: '',
    city: '',
    state: '',
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
        address: associate.address || '',
        city: associate.city || '',
        state: associate.state || '',
      });
    }
  }, [associate]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleCEPSearch = async () => {
    if (!cep) {
      toast({ title: 'CEP obrigatório', description: 'Informe um CEP para buscar.', variant: 'destructive' });
      return;
    }
    const result = await searchCEP(cep);
    if (result) {
      set('address', result.street);
      set('neighborhood', result.neighborhood);
      set('city', result.city);
      set('state', result.state);
      toast({ title: 'Endereço encontrado!', description: 'Preencha os dados complementares.' });
    } else {
      toast({ title: 'Erro', description: cepError || 'CEP não encontrado.', variant: 'destructive' });
    }
  };

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
      await base44.entities.Associate.update(associate.id, form);
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

      {/* Informações Pessoais */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Informações Pessoais</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nome completo <span className="text-red-500">*</span></Label>
          <Input
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Seu nome completo"
          />
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
            <Input
              value={form.cpf}
              disabled
              placeholder="CPF"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">CPF não pode ser alterado.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ</Label>
              <Input
                value={form.cnpj}
                disabled
                placeholder="CNPJ"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">CNPJ não pode ser alterado.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Razão Social</Label>
              <Input
                value={form.company_name}
                onChange={e => set('company_name', e.target.value)}
                placeholder="Razão social da empresa"
              />
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
          <Input
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="seu@email.com"
            type="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Telefone</Label>
          <Input
            value={form.phone}
            onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
            placeholder="11999999999"
            maxLength={11}
          />
        </div>
      </div>

      {/* Endereço */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Localização</h3>
        </div>

        {/* CEP Search */}
        <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <Label className="text-xs font-bold">Buscar por CEP</Label>
          <div className="flex gap-2">
            <Input
              value={cep}
              onChange={e => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="00000000"
              maxLength={8}
            />
            <Button
              onClick={handleCEPSearch}
              disabled={cepLoading || !cep}
              variant="outline"
              className="px-4"
            >
              {cepLoading ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
            </Button>
          </div>
          {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Endereço (Rua)</Label>
          <Input
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Rua, avenida, etc"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Bairro</Label>
          <Input
            value={form.neighborhood || ''}
            onChange={e => set('neighborhood', e.target.value)}
            placeholder="Bairro"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Cidade</Label>
            <Input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="São Paulo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <Select value={form.state} onValueChange={v => set('state', v)}>
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full font-bold">
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  );
}