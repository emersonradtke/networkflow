import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckCircle, Building2, Key, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '041', name: 'Banrisul' },
  { code: '070', name: 'BRB' },
  { code: '077', name: 'Banco Inter' },
  { code: '084', name: 'Uniprime' },
  { code: '085', name: 'Cooperativa Central de Crédito - AILOS' },
  { code: '097', name: 'Credisis' },
  { code: '099', name: 'Uniprime Norte do Paraná' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '133', name: 'Cresol' },
  { code: '136', name: 'Unicred' },
  { code: '197', name: 'Stone Pagamentos' },
  { code: '208', name: 'BTG Pactual' },
  { code: '212', name: 'Banco Original' },
  { code: '218', name: 'BS2' },
  { code: '237', name: 'Bradesco' },
  { code: '260', name: 'Nu Pagamentos (Nubank)' },
  { code: '290', name: 'PagBank (PagSeguro)' },
  { code: '318', name: 'BMG' },
  { code: '323', name: 'MercadoPago' },
  { code: '336', name: 'C6 Bank' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '348', name: 'XP Investimentos' },
  { code: '380', name: 'PicPay' },
  { code: '389', name: 'Banco Mercantil do Brasil' },
  { code: '422', name: 'Banco Safra' },
  { code: '505', name: 'Credit Suisse' },
  { code: '623', name: 'Banco Pan' },
  { code: '633', name: 'Banco Rendimento' },
  { code: '637', name: 'Sofisa Direto' },
  { code: '655', name: 'Votorantim' },
  { code: '707', name: 'Daycoval' },
  { code: '735', name: 'Neon' },
  { code: '748', name: 'Sicredi' },
  { code: '756', name: 'Sicoob (Bancoob)' },
];

const PIX_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
];

function buildForm(associate) {
  return {
    pix_key_type: associate.pix_key_type || '',
    pix_key: associate.pix_key || '',
    bank_code: associate.bank_code || '',
    bank_name: associate.bank_name || '',
    bank_account_type: associate.bank_account_type || '',
    bank_agency: associate.bank_agency || '',
    bank_agency_digit: associate.bank_agency_digit || '',
    bank_account: associate.bank_account || '',
    bank_account_digit: associate.bank_account_digit || '',
  };
}

export default function BankDataSection({ associate, onUpdate }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [form, setForm] = useState(() => buildForm(associate));

  // Re-sincroniza o form quando o associate é recarregado do banco
  useEffect(() => {
    setForm(buildForm(associate));
  }, [associate?.id]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleBankSelect = (code) => {
    const bank = BANKS.find(b => b.code === code);
    setForm(f => ({ ...f, bank_code: code, bank_name: bank?.name || '' }));
    setBankOpen(false);
  };

  const handlePixSelect = (val) => {
    const [type, ...keyParts] = val.split(':');
    const key = keyParts.join(':');
    setForm(f => ({ ...f, pix_key_type: type, pix_key: key }));
  };

  const pixOptions = [
    associate?.cpf ? { value: `cpf:${associate.cpf}`, label: `CPF — ${associate.cpf}` } : null,
    associate?.cnpj ? { value: `cnpj:${associate.cnpj}`, label: `CNPJ — ${associate.cnpj}` } : null,
    associate?.email ? { value: `email:${associate.email}`, label: `E-mail — ${associate.email}` } : null,
    associate?.phone ? { value: `phone:${associate.phone}`, label: `Telefone — ${associate.phone}` } : null,
  ].filter(Boolean);

  const currentPixValue = (form.pix_key_type && form.pix_key)
    ? `${form.pix_key_type}:${form.pix_key}`
    : '';

  const handleSave = async () => {
    if (!associate?.id && !associate?.cpf && !associate?.email) {
      toast({ title: 'Erro', description: 'Cadastro não identificado.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const result = await base44.functions.invoke('saveBankData', {
        associate_id: associate.id || null,
        cpf: associate.cpf || null,
        email: associate.email || null,
        bankData: form,
      });
      if (result?.data?.error) {
        toast({ title: 'Erro ao salvar', description: result.data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Dados bancários salvos!', description: 'Suas informações foram atualizadas.' });
        onUpdate && onUpdate({ ...form });
      }
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const hasBankData = form.bank_code && form.bank_account;
  const hasPixData = form.pix_key;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-black text-foreground">Dados Bancários</h2>
        <p className="text-sm text-muted-foreground mt-1">Informe seus dados para receber comissões e saques.</p>
      </div>

      {/* Status resumido */}
      {(hasBankData || hasPixData) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {hasPixData && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex-1">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">PIX cadastrado</p>
                <p className="text-xs text-green-600 truncate">{form.pix_key}</p>
              </div>
            </div>
          )}
          {hasBankData && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 flex-1">
              <Building2 size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800">{form.bank_name}</p>
                <p className="text-xs text-blue-600">Ag {form.bank_agency} · Cc {form.bank_account}-{form.bank_account_digit}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chave PIX */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Chave PIX</h3>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Selecione uma chave PIX</Label>
          <Select value={currentPixValue} onValueChange={handlePixSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma chave PIX" />
            </SelectTrigger>
            <SelectContent>
              {pixOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma chave disponível. Complete seu perfil.</div>
              ) : (
                pixOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {form.pix_key_type && form.pix_key && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-800 mb-1">Chave selecionada</p>
            <p className="text-sm text-green-700">
              <span className="font-semibold">{PIX_TYPES.find(t => t.value === form.pix_key_type)?.label}</span>: {form.pix_key}
            </p>
          </div>
        )}
      </div>

      {/* Dados Bancários */}
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Conta Bancária</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Banco <span className="text-muted-foreground">(FEBRABAN)</span></Label>
          <Popover open={bankOpen} onOpenChange={setBankOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={bankOpen}
                className="w-full justify-between font-normal h-9 text-sm">
                {form.bank_code ? `${form.bank_code} — ${form.bank_name}` : 'Selecione o banco...'}
                <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandInput placeholder="Pesquisar banco por nome ou código..." />
                <CommandList className="max-h-56">
                  <CommandEmpty>Banco não encontrado.</CommandEmpty>
                  <CommandGroup>
                    {BANKS.map(b => (
                      <CommandItem key={b.code} value={`${b.code} ${b.name}`}
                        onSelect={() => handleBankSelect(b.code)} className="text-sm">
                        <Check size={14} className={cn('mr-2 shrink-0', form.bank_code === b.code ? 'opacity-100' : 'opacity-0')} />
                        {b.code} — {b.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de conta <span className="text-red-500">*</span></Label>
          <Select value={form.bank_account_type} onValueChange={v => set('bank_account_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Conta Poupança</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Agência <span className="text-red-500">*</span></Label>
            <Input value={form.bank_agency}
              onChange={e => set('bank_agency', e.target.value.replace(/\D/g, ''))}
              placeholder="0001" maxLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dígito da agência <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input value={form.bank_agency_digit}
              onChange={e => set('bank_agency_digit', e.target.value.replace(/\D/g, ''))}
              placeholder="X" maxLength={2} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Conta corrente <span className="text-red-500">*</span></Label>
            <Input value={form.bank_account}
              onChange={e => set('bank_account', e.target.value.replace(/\D/g, ''))}
              placeholder="000000" maxLength={12} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dígito <span className="text-red-500">*</span></Label>
            <Input value={form.bank_account_digit}
              onChange={e => set('bank_account_digit', e.target.value.replace(/[^0-9xX]/g, '').slice(0, 1))}
              placeholder="0" maxLength={1} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full font-bold">
        {saving ? 'Salvando...' : 'Salvar Dados Bancários'}
      </Button>
    </div>
  );
}