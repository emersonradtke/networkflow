import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Clock, CheckCircle, AlertCircle, Building2, User, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const BRAIN_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

// Máscaras
const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const maskCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const maskCNPJ = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const validateCPF = (cpf) => {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
};

const validateCNPJ = (cnpj) => {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (d, len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(d, 12) === parseInt(d[12]) && calc(d, 13) === parseInt(d[13]);
};

const validatePhone = (phone) => phone.replace(/\D/g, '').length >= 10;

export default function Register() {
  const [step, setStep] = useState('form');
  const [sponsor, setSponsor] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [personType, setPersonType] = useState('pf'); // 'pf' | 'pj'
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', cpf: '', cnpj: '', company_name: ''
  });
  const [newAssociateId, setNewAssociateId] = useState(null);
  const [errors, setErrors] = useState({});
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

  const setField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Nome obrigatório';
    if (!form.email.trim()) errs.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido';
    if (!form.phone.trim()) errs.phone = 'Telefone obrigatório';
    else if (!validatePhone(form.phone)) errs.phone = 'Telefone inválido';

    if (personType === 'pf') {
      if (!form.cpf.trim()) errs.cpf = 'CPF obrigatório';
      else if (!validateCPF(form.cpf)) errs.cpf = 'CPF inválido';
    } else {
      if (!form.cnpj.trim()) errs.cnpj = 'CNPJ obrigatório';
      else if (!validateCNPJ(form.cnpj)) errs.cnpj = 'CNPJ inválido';
      if (!form.company_name.trim()) errs.company_name = 'Razão social obrigatória';
    }
    return errs;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);

    try {
      const res = await base44.functions.invoke('registerAssociateWithInvite', {
        full_name: form.full_name,
        email: form.email.trim() || '',
        phone: form.phone,
        cpf: personType === 'pf' ? form.cpf : '',
        cnpj: personType === 'pj' ? form.cnpj : '',
        company_name: personType === 'pj' ? form.company_name : '',
        person_type: personType,
        sponsor_id: sponsor?.id || null,
        sponsor_name: sponsor?.full_name || null,
      });

      setNewAssociateId(res.data?.associate_id);
      setStep('pending');
    } catch (error) {
      setErrors({ submit: error.response?.data?.error || 'Erro ao registrar' });
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = (key) =>
    `mt-1.5 border-slate-200 ${errors[key] ? 'border-red-400 focus:ring-red-400' : ''}`;

  const handlePayAdhesion = async () => {
    if (!newAssociateId || !config?.adhesion_price) return;
    setPayLoading(true);
    try {
      const res = await base44.functions.invoke('createInfinitePayCheckout', {
        order_nsu: `ADES-${newAssociateId}`,
        items: [{
          description: config.adhesion_description || 'Taxa de Adesão Bold Life',
          price: config.adhesion_price,
          quantity: 1,
        }],
        customer: {
          name: form.full_name,
          email: form.email,
          phone_number: form.phone.replace(/\D/g, ''),
        },
        redirect_url: `${window.location.origin}/dashboard`,
      });
      const url = res.data?.url;
      if (url) window.open(url, '_blank');
    } catch (e) {
      console.error('Erro ao gerar link de pagamento', e);
    } finally {
      setPayLoading(false);
    }
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
              className="w-full font-bold text-white text-base py-6 mb-3 gap-2"
              style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
              onClick={handlePayAdhesion}
              disabled={payLoading || !newAssociateId}
            >
              {payLoading ? 'Gerando link...' : `💳 Pagar Adesão — R$ ${config?.adhesion_price?.toFixed(2) || '197,00'}`}
            </Button>
            <button
              className="w-full text-sm text-slate-400 hover:text-slate-600 underline"
              onClick={() => navigate('/dashboard')}
            >
              Pagar depois → Ir para o Painel
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 p-12 text-white">
        <img src={BRAIN_URL} alt="Bold Life Brain" className="w-52 h-52 object-contain mb-8 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
        <h2 className="text-4xl font-black mb-3 text-center">Bem-vindo à<br/>Bold Life</h2>
        <p className="text-white/70 text-center text-lg max-w-xs leading-relaxed">
          Transforme sua rede em resultados reais. Junte-se a uma comunidade de sucesso.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full my-6">
          <div className="text-center mb-6">
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

          {/* Tipo de pessoa */}
          <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setPersonType('pf'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                personType === 'pf' ? 'bg-white shadow text-[#1B2A5E]' : 'text-slate-500'
              }`}
            >
              <User size={15} /> Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => { setPersonType('pj'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                personType === 'pj' ? 'bg-white shadow text-[#1B2A5E]' : 'text-slate-500'
              }`}
            >
              <Building2 size={15} /> Pessoa Jurídica
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nome */}
            <div>
              <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>
                {personType === 'pj' ? 'Nome do Responsável' : 'Nome Completo'}
              </Label>
              <Input className={fieldCls('full_name')} placeholder="Seu nome completo" value={form.full_name} onChange={e => setField('full_name', e.target.value)} />
              {errors.full_name && <FieldError msg={errors.full_name} />}
            </div>

            {/* Razão Social (PJ) */}
            {personType === 'pj' && (
              <div>
                <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Razão Social</Label>
                <Input className={fieldCls('company_name')} placeholder="Nome da empresa" value={form.company_name} onChange={e => setField('company_name', e.target.value)} />
                {errors.company_name && <FieldError msg={errors.company_name} />}
              </div>
            )}

            {/* Email (opcional) */}
            <div>
              <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>E-mail</Label>
              <Input className={fieldCls('email')} type="email" placeholder="seuemail@exemplo.com" value={form.email} onChange={e => setField('email', e.target.value)} />
              {errors.email && <FieldError msg={errors.email} />}
            </div>

            {/* Telefone */}
            <div>
              <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Telefone / WhatsApp</Label>
              <Input
                className={fieldCls('phone')}
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={e => setField('phone', maskPhone(e.target.value))}
              />
              {errors.phone && <FieldError msg={errors.phone} />}
            </div>

            {/* CPF (PF) */}
            {personType === 'pf' && (
              <div>
                <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>CPF</Label>
                <Input
                  className={fieldCls('cpf')}
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={e => setField('cpf', maskCPF(e.target.value))}
                />
                {errors.cpf && <FieldError msg={errors.cpf} isError />}
              </div>
            )}

            {/* CNPJ (PJ) */}
            {personType === 'pj' && (
              <div>
                <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>CNPJ</Label>
                <Input
                  className={fieldCls('cnpj')}
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={e => setField('cnpj', maskCNPJ(e.target.value))}
                />
                {errors.cnpj && <FieldError msg={errors.cnpj} isError />}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-bold text-white text-base py-6 mt-2"
              style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
            >
              {loading ? 'Verificando...' : <><UserPlus size={18} className="mr-2" /> Finalizar Cadastro</>}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function FieldError({ msg, isError }) {
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle size={11} /> {msg}
    </p>
  );
}