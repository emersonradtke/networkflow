import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [step, setStep] = useState('form'); // form | pending
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 gold-gradient rounded-full flex items-center justify-center">
            <Clock size={36} className="text-background" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Cadastro Realizado!</h1>
          <p className="text-muted-foreground mb-6">
            Sua conta está <span className="text-primary font-semibold">pendente de ativação</span>. 
            Realize o pagamento da adesão de <span className="text-primary font-bold">R$ {config?.adhesion_price?.toFixed(2) || '100,00'}</span> para ter acesso completo à plataforma.
          </p>
          <div className="dark-card rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-sm font-semibold text-primary">Próximos passos:</p>
            <p className="text-sm text-muted-foreground">1. Realize o pagamento da taxa de adesão</p>
            <p className="text-sm text-muted-foreground">2. Aguarde a confirmação do pagamento</p>
            <p className="text-sm text-muted-foreground">3. Acesse a loja e comece a ganhar!</p>
          </div>
          <Button className="w-full gold-gradient text-background font-bold" onClick={() => navigate('/dashboard')}>
            Ir para o Painel
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-black text-background">BL</span>
          </div>
          <h1 className="text-3xl font-black text-foreground">Bold Life</h1>
          <p className="text-muted-foreground mt-1">Complete seu cadastro</p>
        </div>

        {sponsor && (
          <div className="dark-card rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 gold-gradient rounded-full flex items-center justify-center font-bold text-background">
              {sponsor.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Convidado por</p>
              <p className="text-sm font-bold text-foreground">{sponsor.full_name}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="dark-card rounded-2xl p-6 space-y-5">
          <div>
            <Label className="text-foreground font-medium">Nome Completo</Label>
            <Input
              className="mt-1.5 bg-secondary border-border text-foreground"
              placeholder="Seu nome completo"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label className="text-foreground font-medium">Telefone / WhatsApp</Label>
            <Input
              className="mt-1.5 bg-secondary border-border text-foreground"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-foreground font-medium">CPF</Label>
            <Input
              className="mt-1.5 bg-secondary border-border text-foreground"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={e => setForm({ ...form, cpf: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full gold-gradient text-background font-bold text-base py-6">
            {loading ? 'Cadastrando...' : (
              <><UserPlus size={18} className="mr-2" /> Finalizar Cadastro</>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}