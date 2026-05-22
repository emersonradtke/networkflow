import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const BRAIN_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && isAuthenticated) {
      // Se autenticado, redireciona via role
      navigate('/role-redirect', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, isLoadingPublicSettings, navigate]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(`${window.location.origin}/role-redirect`);
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
            <h1 className="text-2xl font-black" style={{ color: '#1B2A5E' }}>Bem-vindo</h1>
            <p className="text-slate-500 text-sm mt-2">Construa sua rede e ganhe comissões</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleLogin}
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

          <p className="text-xs text-slate-400 text-center mt-8">
            Ao entrar, você concorda com nossos Termos de Serviço
          </p>
        </motion.div>
      </div>
    </div>
  );
}