import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, LogIn, Users, Shield, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';

function formatDoc(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

const ROLES = [
  { key: 'associate', label: 'Associado', icon: Users, desc: 'Acesse sua conta de associado' },
  { key: 'franchise', label: 'Franquia', icon: Building2, desc: 'Acesse o portal da franquia' },
  { key: 'admin', label: 'Administrador', icon: Shield, desc: 'Acesso administrativo da plataforma' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('associate');
  const [doc, setDoc] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Verificar sessão existente
    const session = localStorage.getItem('associate_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.id) { navigate('/dashboard'); return; }
      } catch {}
    }
  }, []);

  const handleDocChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    setDoc(formatDoc(raw));
  };

  const handleRoleSelect = (r) => {
    setRole(r);
    setError('');
    setDoc('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'admin') {
        // Admin usa o fluxo Base44 nativo
        base44.auth.redirectToLogin(window.location.origin + '/admin');
        return;
      }

      // Associado ou Franquia: login por CPF/CNPJ
      const rawDoc = doc.replace(/\D/g, '');
      if (rawDoc.length !== 11 && rawDoc.length !== 14) {
        setError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
        setLoading(false);
        return;
      }
      if (!password) {
        setError('Informe sua senha.');
        setLoading(false);
        return;
      }

      const res = await base44.functions.invoke('associateLogin', { doc: rawDoc, password, role });
      const data = res.data;

      if (data?.error) {
        setError(data.error);
      } else if (data?.associate) {
        localStorage.setItem('associate_session', JSON.stringify({ ...data.associate, session_role: role }));
        navigate('/dashboard');
      } else {
        setError('Resposta inesperada do servidor.');
      }
    } catch (err) {
      setError('Erro ao conectar. Tente novamente.');
    }

    setLoading(false);
  };

  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Bold Life" className="h-12 mx-auto mb-5 object-contain" />
          <h1 className="text-2xl font-black text-foreground">Bem-vindo de volta</h1>
          <p className="text-muted-foreground text-sm mt-1">Selecione seu tipo de acesso</p>
        </div>

        {/* Seletor de perfil */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {ROLES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleRoleSelect(key)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                role === key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* Card de login */}
        <div className="dark-card rounded-2xl p-7">
          <p className="text-sm text-muted-foreground mb-5">
            {ROLES.find(r => r.key === role)?.desc}
          </p>

          {isAdmin ? (
            <div className="text-center py-4">
              <Shield size={32} className="text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-5">
                O acesso administrativo usa autenticação segura da plataforma.
              </p>
              <Button
                onClick={handleSubmit}
                className="w-full gold-gradient text-background font-bold h-11 gap-2"
              >
                <LogIn size={18} /> Entrar como Admin
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="doc">CPF ou CNPJ</Label>
                <Input
                  id="doc"
                  className="mt-1.5"
                  placeholder="000.000.000-00"
                  value={doc}
                  onChange={handleDocChange}
                  inputMode="numeric"
                />
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full gold-gradient text-background font-bold h-11 text-base gap-2"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  : <LogIn size={18} />
                }
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          )}

          {!isAdmin && (
            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Ainda não é associado?{' '}
                <a href="/register" className="text-primary font-semibold hover:underline">Cadastre-se</a>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Bold Life. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}