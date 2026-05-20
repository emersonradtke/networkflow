import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const BRAIN_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

export default function Register() {
  const [step, setStep] = useState('form');
  const [sponsor, setSponsor] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', cpf: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    loadData(code);
  }, []);

  const loadData = async (code) => {
    const configs = await base44.entities.NetworkConfig.list();
    if (configs.length > 0) setConfig(configs[0]);
    if (code) {
      const sponsors = await base44.entities.Associate.filter({ invite_code: code, status: 'active' });
      if (sponsors.length > 0) setSponsor(sponsors[0]);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = await base44.auth.me();
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    await base44.entities.Associate.create({
      user_id: user.id,
      full_name: form.full_name || user.full_name,
      email: user.email,
      phone: form.phone,
      cpf: form.cpf,
      status: 'pending',
      sponsor_id: sponsor?.id || null,
      sponsor_name: sponsor?.full_name || null,
      invite_code: inviteCode,
      wallet_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      adhesion_paid: false,
    });

    setStep('pending');
    setLoading(false);
  };

  if (step === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}>
              <Clock size={36} className="text-white" />
            </div>
            <img src={LOGO_URL} alt="Bold Life" className="h-10 w-auto object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black mb-2" style={{ color: '#1B2A5E' }}>Cadastro Realizado!</h1>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Sua conta está <span className="font-semibold" style={{ color: '#3B9EE2' }}>pendente de ativação</span>.
              Realize o pagamento da adesão de{' '}
              <span className="font-bold" style={{ color: '#1B2A5E' }}>R$ {config?.adhesion_price?.toFixed(2) || '197,00'}</span>{' '}
              para ter acesso completo à plataforma.
            </p>
            <div className="rounded-xl p-4 mb-6 text-left space-y-2" style={{ background: '#F0F4FA', borderLeft: '3px solid #3B9EE2' }}>
              <p className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Próximos passos:</p>
              {['Realize o pagamento da taxa de adesão', 'Aguarde a confirmação do pagamento', 'Acesse a loja e comece a ganhar!'].map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle size={14} style={{ color: '#3B9EE2' }} />
                  <p className="text-sm text-slate-500">{t}</p>
                </div>
              ))}
            </div>
            <Button
              className="w-full font-bold text-white text-base py-6"
              style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
              onClick={() => navigate('/dashboard')}
            >
              Ir para o Painel
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}>
      {/* Left panel - decorativo */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 p-12 text-white">
        <img src={BRAIN_URL} alt="Bold Life Brain" className="w-52 h-52 object-contain mb-8 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
        <h2 className="text-4xl font-black mb-3 text-center">Bem-vindo à<br/>Bold Life</h2>
        <p className="text-white/70 text-center text-lg max-w-xs leading-relaxed">
          Transforme sua rede em resultados reais. Junte-se a uma comunidade de sucesso.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full">
          {/* Logo */}
          <div className="text-center mb-7">
            <img src={LOGO_URL} alt="Bold Life" className="h-10 w-auto object-contain mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Complete seu cadastro para começar</p>
          </div>

          {sponsor && (
            <div className="rounded-xl p-3 mb-5 flex items-center gap-3" style={{ background: '#F0F4FA', borderLeft: '3px solid #3B9EE2' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1B2A5E, #3B9EE2)' }}>
                {sponsor.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-slate-400">Convidado por</p>
                <p className="text-sm font-bold" style={{ color: '#1B2A5E' }}>{sponsor.full_name}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Nome Completo</Label>
              <Input
                className="mt-1.5 border-slate-200 focus:ring-2"
                style={{ '--tw-ring-color': '#3B9EE2' }}
                placeholder="Seu nome completo"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Telefone / WhatsApp</Label>
              <Input
                className="mt-1.5 border-slate-200"
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>CPF</Label>
              <Input
                className="mt-1.5 border-slate-200"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => setForm({ ...form, cpf: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-bold text-white text-base py-6 mt-2"
              style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
            >
              {loading ? 'Cadastrando...' : (
                <><UserPlus size={18} className="mr-2" /> Finalizar Cadastro</>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}