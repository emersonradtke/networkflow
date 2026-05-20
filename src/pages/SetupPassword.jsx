import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const ICON_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

export default function SetupPassword({ onDone }) {
  const [form, setForm] = useState({ newPass: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPass.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.newPass !== form.confirm) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await base44.auth.updatePassword(form.newPass);
      onDone();
    } catch {
      setError('Erro ao definir senha. Tente novamente.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#EEF2F7' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <img src={ICON_URL} alt="" className="h-9 w-9 object-contain" />
          <img src={LOGO_URL} alt="Bold Life" className="h-6 w-auto object-contain" />
        </div>

        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(59,158,226,0.12)' }}>
            <Lock size={22} style={{ color: '#3B9EE2' }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#1B2A5E' }}>Crie sua Senha</h1>
          <p className="text-slate-500 text-sm mt-1">Antes de continuar, defina uma senha segura para sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {['newPass', 'confirm'].map((field, i) => (
            <div key={field}>
              <Label className="font-semibold" style={{ color: '#1B2A5E' }}>
                {i === 0 ? 'Nova Senha' : 'Confirmar Senha'}
              </Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPw ? 'text' : 'password'}
                  className="pr-10"
                  placeholder={i === 0 ? 'Mínimo 6 caracteres' : 'Repita a senha'}
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  required
                />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full font-bold text-white py-5"
            style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
            {saving ? 'Salvando...' : <><ArrowRight size={16} /> Definir Senha e Continuar</>}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}