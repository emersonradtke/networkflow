import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [loginMode, setLoginMode] = useState(null); // 'regular' ou 'firstAccess'
  const [firstAccessStep, setFirstAccessStep] = useState('cpf'); // 'cpf' ou 'password'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [validatedCpf, setValidatedCpf] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('Construa sua rede e ganhe comissões');

  useEffect(() => {
    loadWelcomeMessage();
  }, []);

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

  const loadWelcomeMessage = async () => {
    try {
      const configs = await base44.entities.NetworkConfig.list();
      if (configs.length > 0 && configs[0].welcome_message) {
        setWelcomeMessage(configs[0].welcome_message);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagem de boas-vindas:', err);
    }
  };

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

  const maskCPF = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleLoginClick = () => {
    setLoginMode('regular');
    setError('');
  };

  const handleFirstAccessClick = () => {
    setLoginMode('firstAccess');
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('loginWithCredentials', { username, password });
      
      console.log('Login response:', response.data);
      
      if (response.data?.success && response.data?.user) {
        sessionStorage.setItem('directUser', JSON.stringify(response.data.user));
        console.log('User saved, triggering auth check');
        
        await checkUserAuth();
        
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

  const handleFirstAccessCpfSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Valida se CPF existe no sistema
      const response = await base44.functions.invoke('validateCpfForFirstAccess', { cpf: cpf.replace(/\D/g, '') });
      
      if (response.data?.success) {
        setValidatedCpf(cpf.replace(/\D/g, ''));
        setFirstAccessStep('password');
        setLoading(false);
      } else if (response.data?.already_registered) {
        // Usuário já tem senha cadastrada
        setError(response.data?.error || 'Já existe uma senha para este CPF');
        setFirstAccessStep('already_registered');
        setLoading(false);
      } else {
        setError(response.data?.error || 'CPF não encontrado ou já ativado');
        setLoading(false);
      }
    } catch (err) {
      console.error('CPF validation error:', err);
      setError('Erro ao validar CPF');
      setLoading(false);
    }
  };

  const handleFirstAccessPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Cria usuário com a nova senha usando CPF
      const response = await base44.functions.invoke('createFirstAccessUser', { 
        cpf: validatedCpf, 
        password: newPassword 
      });
      
      if (response.data?.success && response.data?.user) {
        sessionStorage.setItem('directUser', JSON.stringify(response.data.user));
        await checkUserAuth();
        setJustLoggedIn(true);
      } else {
        setError(response.data?.error || 'Erro ao criar acesso');
        setLoading(false);
      }
    } catch (err) {
      console.error('First access password error:', err);
      setError('Erro ao criar acesso');
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-stretch justify-center" style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}>
      {/* Left panel - Welcome */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-sm p-8 text-white">
        <img src={BRAIN_URL} alt="Bold Life Brain" className="w-40 h-40 object-contain mb-6 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
        <h2 className="text-3xl font-black mb-3 text-center">Bem-vindo à<br/>Bold Life</h2>
        <p className="text-white/70 text-center text-base max-w-xs leading-relaxed">
          {welcomeMessage}
        </p>
      </div>

      {/* Right panel - Login */}
      <div className="flex-1 max-w-md flex items-center justify-center p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full my-6">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="Bold Life" className="h-10 w-auto object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black" style={{ color: '#1B2A5E' }}>
              {loginMode === 'regular' ? 'Entrar na conta' : loginMode === 'firstAccess' ? 'Primeiro Acesso' : 'Bem-vindo'}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {loginMode === 'regular' ? 'Digite suas credenciais' : loginMode === 'firstAccess' ? 'Use seu CPF e senha' : 'Construa sua rede e ganhe comissões'}
            </p>
          </div>

          {loginMode === 'regular' ? (
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
                 setLoginMode(null);
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
          ) : loginMode === 'firstAccess' ? (
            <>
              {firstAccessStep === 'cpf' ? (
                <form onSubmit={handleFirstAccessCpfSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: '#FEE2E2', borderLeft: '3px solid #EF4444' }}>
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="rounded-lg p-3 bg-blue-50 border border-blue-200 flex items-start gap-2">
                    <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">Informe seu CPF para validar sua conta</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>CPF</Label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(maskCPF(e.target.value))}
                      className="mt-1.5 border-slate-200"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold text-white text-base py-6 mt-2"
                    style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
                  >
                    {loading ? 'Validando...' : <>Continuar</>}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setLoginMode(null);
                      setError('');
                      setCpf('');
                    }}
                    variant="ghost"
                    className="w-full text-slate-500"
                  >
                    Voltar
                  </Button>
                </form>
              ) : firstAccessStep === 'already_registered' ? (
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: '#FEE2E2', borderLeft: '3px solid #EF4444' }}>
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="rounded-lg p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-2">Conta já ativada</p>
                      <p className="text-xs text-amber-800">Este CPF já possui uma senha cadastrada. Se você esqueceu sua senha, utilize a opção de recuperação.</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleLoginClick}
                    className="w-full font-bold text-white text-base py-6"
                    style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
                  >
                    <LogIn size={18} className="mr-2" /> Entrar com seu usuário
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setLoginMode(null);
                      setFirstAccessStep('cpf');
                      setError('');
                      setCpf('');
                    }}
                    variant="ghost"
                    className="w-full text-slate-500"
                  >
                    Voltar
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleFirstAccessPasswordSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: '#FEE2E2', borderLeft: '3px solid #EF4444' }}>
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="rounded-lg p-3 bg-green-50 border border-green-200 flex items-start gap-2">
                    <Sparkles size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700">CPF validado! Agora crie sua senha de acesso</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Nova Senha</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border-slate-200 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold" style={{ color: '#1B2A5E' }}>Confirmar Senha</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                    {loading ? 'Criando acesso...' : <><LogIn size={18} className="mr-2" /> Acessar</>}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setFirstAccessStep('cpf');
                      setError('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    variant="ghost"
                    className="w-full text-slate-500"
                  >
                    Voltar
                  </Button>
                </form>
              )}
            </>
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
               onClick={handleFirstAccessClick}
               variant="outline"
               className="w-full font-semibold py-6 border-slate-300"
             >
               <Sparkles size={18} className="mr-2" /> Primeiro Acesso
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
            <Link to="/terms" className="underline hover:text-slate-600">
              Termos de Serviço
            </Link>
            {' '}e{' '}
            <Link to="/privacy" className="underline hover:text-slate-600">
              Política de Privacidade
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}