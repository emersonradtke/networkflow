import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Building2, Key, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Tabela FEBRABAN — principais bancos do Brasil
const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '041', name: 'Banrisul' },
  { code: '070', name: 'BRB' },
  { code: '077', name: 'Banco Inter' },
  { code: '084', name: 'Uniprime' },
  { code: '085', name: 'Cooperativa Central de Crédito - AILOS' },
  { code: '094', name: 'Banco Finaxis' },
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
  { code: '246', name: 'Banco ABC Brasil' },
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
  { code: '604', name: 'Industrial do Brasil' },
  { code: '611', name: 'Banco Paulista' },
  { code: '623', name: 'Banco Pan' },
  { code: '633', name: 'Banco Rendimento' },
  { code: '634', name: 'Banco Triângulo' },
  { code: '637', name: 'Sofisa Direto' },
  { code: '641', name: 'Banco Alvorada' },
  { code: '655', name: 'Votorantim' },
  { code: '707', name: 'Daycoval' },
  { code: '735', name: 'Neon' },
  { code: '739', name: 'Cetelem' },
  { code: '745', name: 'Citibank' },
  { code: '748', name: 'Sicredi' },
  { code: '756', name: 'Sicoob (Bancoob)' },
  { code: '757', name: 'KEB Hana Bank' },
];

const PIX_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
];

export default function BankDataSection({ associate, onUpdate }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [form, setForm] = useState({
    pix_key_type: '',
    pix_key: '',
    bank_code: '',
    bank_name: '',
    bank_account_type: '',
    bank_agency: '',
    bank_agency_digit: '',
    bank_account: '',
    bank_account_digit: '',
  });

  useEffect(() => {
    if (associate) {
      setForm({
        pix_key_type: associate.pix_key_type || '',
        pix_key: associate.pix_key || '',
        bank_code: associate.bank_code || '',
        bank_name: associate.bank_name || '',
        bank_account_type: associate.bank_account_type || '',
        bank_agency: associate.bank_agency || '',
        bank_agency_digit: associate.bank_agency_digit || '',
        bank_account: associate.bank_account || '',
        bank_account_digit: associate.bank_account_digit || '',
      });
    }
  }, [associate]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleBankSelect = (code) => {
    const bank = BANKS.find(b => b.code === code);
    setForm(f => ({ ...f, bank_code: code, bank_name: bank?.name || '' }));
  };

  const filteredBanks = BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    b.code.includes(bankSearch)
  );

  const validate = () => {
    if (form.bank_code && (!form.bank_account || !form.bank_account_digit)) {
      toast({ title: 'Dados bancários incompletos', description: 'Informe a conta corrente e o dígito.', variant: 'destructive' });
      return false;
    }
    if (form.bank_code && !form.bank_agency) {
      toast({ title: 'Dados bancários incompletos', description: 'Informe o número da agência.', variant: 'destructive' });
      return false;
    }
    if (form.bank_code && !form.bank_account_type) {
      toast({ title: 'Dados bancários incompletos', description: 'Selecione o tipo de conta.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await base44.entities.Associate.update(associate.id, form);
    toast({ title: 'Dados bancários salvos!', description: 'Suas informações foram atualizadas.' });
    onUpdate && onUpdate();
    setSaving(false);
  };

  const hasBankData = associate?.bank_code && associate?.bank_account;
  const hasPixData = associate?.pix_key;

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
                <p className="text-xs text-green-600 truncate">{associate.pix_key}</p>
              </div>
            </div>
          )}
          {hasBankData && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 flex-1">
              <Building2 size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800">{associate.bank_name}</p>
                <p className="text-xs text-blue-600">Ag {associate.bank_agency} · Cc {associate.bank_account}-{associate.bank_account_digit}</p>
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
          <Select value={`${form.pix_key_type}:${form.pix_key}`} onValueChange={(val) => {
            const [type, key] = val.split(':');
            setForm(f => ({ ...f, pix_key_type: type, pix_key: key }));
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma chave PIX" />
            </SelectTrigger>
            <SelectContent>
              {associate?.cpf && (
                <SelectItem value={`cpf:${associate.cpf}`}>
                  CPF — {associate.cpf}
                </SelectItem>
              )}
              {associate?.cnpj && (
                <SelectItem value={`cnpj:${associate.cnpj}`}>
                  CNPJ — {associate.cnpj}
                </SelectItem>
              )}
              {associate?.email && (
                <SelectItem value={`email:${associate.email}`}>
                  E-mail — {associate.email}
                </SelectItem>
              )}
              {associate?.phone && (
                <SelectItem value={`phone:${associate.phone}`}>
                  Telefone — {associate.phone}
                </SelectItem>
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

        {/* Busca e seleção do banco */}
        <div className="space-y-1.5">
          <Label className="text-xs">Banco <span className="text-muted-foreground">(FEBRABAN)</span></Label>
          <Input
            placeholder="Pesquisar banco por nome ou código..."
            value={bankSearch}
            onChange={e => setBankSearch(e.target.value)}
            className="mb-1"
          />
          <Select value={form.bank_code} onValueChange={handleBankSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o banco">
                {form.bank_code ? `${form.bank_code} - ${form.bank_name}` : 'Selecione o banco'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredBanks.map(b => (
                <SelectItem key={b.code} value={b.code}>
                  {b.code} — {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de conta */}
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

        {/* Agência */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Agência <span className="text-red-500">*</span></Label>
            <Input
              value={form.bank_agency}
              onChange={e => set('bank_agency', e.target.value.replace(/\D/g, ''))}
              placeholder="0001"
              maxLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dígito da agência <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              value={form.bank_agency_digit}
              onChange={e => set('bank_agency_digit', e.target.value.replace(/\D/g, ''))}
              placeholder="X"
              maxLength={2}
            />
          </div>
        </div>

        {/* Conta corrente */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Conta corrente <span className="text-red-500">*</span></Label>
            <Input
              value={form.bank_account}
              onChange={e => set('bank_account', e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              maxLength={12}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dígito <span className="text-red-500">*</span></Label>
            <Input
              value={form.bank_account_digit}
              onChange={e => set('bank_account_digit', e.target.value.replace(/[^0-9xX]/g, '').slice(0, 1))}
              placeholder="0"
              maxLength={1}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full font-bold">
        {saving ? 'Salvando...' : 'Salvar Dados Bancários'}
      </Button>
    </div>
  );
}