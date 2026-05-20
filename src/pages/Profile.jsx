import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { User, Lock, Phone, MapPin, CreditCard, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function Profile() {
  const { associate, reloadUser } = useOutletContext();
  const [form, setForm] = useState({ phone: '', cpf: '', pix_key: '', address: '', city: '', state: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (associate) {
      setForm({
        phone: associate.phone || '',
        cpf: associate.cpf || '',
        pix_key: associate.pix_key || '',
        address: associate.address || '',
        city: associate.city || '',
        state: associate.state || '',
      });
    }
  }, [associate]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Associate.update(associate.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (passwordForm.newPass.length < 6) { setPwError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setPwError('As senhas não coincidem.'); return; }
    setSavingPw(true);
    try {
      await base44.auth.updatePassword(passwordForm.newPass);
      setPwSaved(true);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError('Erro ao alterar senha. Tente novamente.');
    }
    setSavingPw(false);
  };

  if (!associate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    active: { label: 'Ativo', cls: 'bg-green-500/15 text-green-600 border-green-300', icon: CheckCircle },
    pending: { label: 'Pendente', cls: 'bg-yellow-500/15 text-yellow-600 border-yellow-300', icon: Clock },
    blocked: { label: 'Bloqueado', cls: 'bg-red-500/15 text-red-600 border-red-300', icon: User },
    inactive: { label: 'Inativo', cls: 'bg-slate-100 text-slate-500', icon: User },
  };
  const sc = statusConfig[associate.status] || statusConfig.inactive;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seus dados pessoais e senha</p>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #1B2A5E, #3B9EE2)' }}>
          {associate.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg text-slate-800">{associate.full_name}</p>
          <p className="text-sm text-slate-500">{associate.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${sc.cls} flex items-center gap-1 text-xs`}>
              <StatusIcon size={11} /> {sc.label}
            </Badge>
            {associate.invite_code && (
              <span className="text-xs text-slate-400">Código: <span className="font-mono font-bold text-slate-600">{associate.invite_code}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <User size={16} style={{ color: '#3B9EE2' }} /> Dados Pessoais
        </h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input className="mt-1.5" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input className="mt-1.5" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Chave Pix</Label>
              <Input className="mt-1.5" placeholder="CPF, e-mail, celular ou chave aleatória" value={form.pix_key} onChange={e => setForm({...form, pix_key: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input className="mt-1.5" placeholder="Rua, número, complemento" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input className="mt-1.5" placeholder="Cidade" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input className="mt-1.5" placeholder="UF" maxLength={2} value={form.state} onChange={e => setForm({...form, state: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
            {saved ? <><CheckCircle size={15} /> Salvo!</> : saving ? 'Salvando...' : 'Salvar Dados'}
          </Button>
        </form>
      </div>

      {/* Senha */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lock size={16} style={{ color: '#3B9EE2' }} /> Alterar Senha
        </h2>
        <form onSubmit={savePassword} className="space-y-4">
          {['newPass', 'confirm'].map((field, i) => (
            <div key={field} className="relative">
              <Label>{i === 0 ? 'Nova Senha' : 'Confirmar Nova Senha'}</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPw ? 'text' : 'password'}
                  className="pr-10"
                  placeholder={i === 0 ? 'Mínimo 6 caracteres' : 'Repita a nova senha'}
                  value={passwordForm[field]}
                  onChange={e => setPasswordForm({...passwordForm, [field]: e.target.value})}
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          {pwSaved && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Senha alterada com sucesso!</p>}
          <Button type="submit" disabled={savingPw} variant="outline" className="font-bold border-slate-300">
            {savingPw ? 'Salvando...' : 'Alterar Senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}