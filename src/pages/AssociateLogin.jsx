import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, LogIn, UserCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function AssociateLogin() {
  const navigate = useNavigate();
  const [doc, setDoc] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    base44.entities.NetworkConfig.list().then(c => { if (c.length > 0) setConfig(c[0]); });

    // Se já tem sessão de associado salva, redirecionar
    const session = localStorage.getItem('associate_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.id) navigate('/dashboard');
      } catch {}
    }
  }, []);

  const handleDocChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    setDoc(formatDoc(raw));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

    try {
      const res = await base44.functions.invoke('associateLogin', { doc: rawDoc, password });
      const data = res.data;
      if (data?.error) {
        setError(data.error);
      } else if (data?.associate) {
        localStorage.setItem('associate_session', JSON.stringify(data.associate));
        navigate('/dashboard');
      } else {
        setError('Resposta inesperada do servidor.');
      }
    } catch (err) {
      setError('Erro ao conectar. Tente novamente.');
    }

    setLoading(false);
  };

  const appName = config?.app_name || 'Bold Life';
  const appLogo = config?.app_logo;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Marca */}
        <div className="text-center mb-8">
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-16 mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 glow-gold">
              <span className="text-background font-black text-2xl">BL</span>
            </div>
          )}
          <h1 className="text-2xl font-black text-foreground">{appName}</h1>
          <p className="text-muted-foreground text-sm mt-1">Portal do Associado</p>
        </div>

        {/* Card de login */}
        <div className="dark-card rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <UserCircle size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground">Entrar na sua conta</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="doc">CPF ou CNPJ</Label>
              <Input
                id="doc"
                className="mt-1.5"
                placeholder="000.000.000-00"
                value={doc}
                onChange={handleDocChange}
                autoComplete="username"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
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
              {loading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não é associado?{' '}
              <a href="/register" className="text-primary font-semibold hover:underline">Cadastre-se</a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}