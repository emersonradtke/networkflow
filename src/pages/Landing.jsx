import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const BRAIN_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, checkUserAuth } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && isAuthenticated) {
      // Se autenticado, redireciona baseado no role
      const directUserData = sessionStorage.getItem('directUser');
      if (directUserData) {
        const directUser = JSON.parse(directUserData);
        if (directUser.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, isLoadingAuth, isLoadingPublicSettings, navigate]);

  useEffect(() => {
    if (justLoggedIn && isAuthenticated) {
      const directUserData = sessionStorage.getItem('directUser');
      if (directUserData) {
        const directUser = JSON.parse(directUserData);
        console.log('Redirecting after login to', directUser.role === 'admin' ? '/admin' : '/dashboard');
        if (directUser.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [justLoggedIn, isAuthenticated, navigate]);

  const handleLoginClick = () => {
    setShowLoginForm(true);
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Chama o backend function para validar credenciais
      const response = await base44.functions.invoke('loginWithCredentials', { username, password });
      
      console.log('Login response:', response.data);
      
      if (response.data?.success && response.data?.user) {
        // Salva o usuário em sessionStorage
        sessionStorage.setItem('directUser', JSON.stringify(response.data.user));
        console.log('User saved, triggering auth check');
        
        // Revalidar autenticação no contexto
        await checkUserAuth();
        
        // Flag que faz redirect no useEffect
        setJustLoggedIn(true);
      } else {
        setError(response.data?.error || 'Usuário ou senha inválidos');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Usuário ou senha inválidos');
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

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
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="Bold Life" className="h-10 w-auto object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black" style={{ color: '#1B2A5E' }}>
              {showLoginForm ? 'Entrar na conta' : 'Bem-vindo'}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {showLoginForm ? 'Digite suas credenciais' : 'Construa sua rede e ganhe comissões'}
            </p>
          </div>

          {showLoginForm ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: '#FEE2E2', borderLeft: '3px solid #EF4444' }}>
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Usuário</Label>
                <Input
                  type="text"
                  placeholder="seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 border-slate-200"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-200 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-bold text-white text-base py-6 mt-2"
                style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
              >
                {loading ? 'Entrando...' : <><LogIn size={18} className="mr-2" /> Entrar</>}
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setShowLoginForm(false);
                  setError('');
                  setUsername('');
                  setPassword('');
                }}
                variant="ghost"
                className="w-full text-slate-500"
              >
                Voltar
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleLoginClick}
                className="w-full font-bold text-white text-base py-6"
                style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
              >
                <LogIn size={18} className="mr-2" /> Entrar
              </Button>

              <Button
                onClick={handleRegister}
                variant="outline"
                className="w-full font-semibold py-6 border-slate-300"
              >
                <UserPlus size={18} className="mr-2" /> Criar conta
              </Button>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center mt-8">
            Ao entrar, você concorda com nossos{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
              Termos de Serviço
            </a>
            {' '}e{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
              Política de Privacidade
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}