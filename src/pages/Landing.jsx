import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Sparkles, Wallet, Users, ShoppingBag } from 'lucide-react';

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
    base44.auth.redirectToLogin(`${window.location.origin}/dashboard`);
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1A3D] via-[#1B2A5E] to-[#3B9EE2] flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">BOLD<span className="text-cyan-300">LIFE</span></span>
        </div>
        <Button
          onClick={handleLogin}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 hover:text-white gap-2"
        >
          <LogIn size={16} /> Entrar
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full text-center space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <Sparkles size={14} className="text-cyan-300" />
            <span className="text-white/90 text-xs font-medium">Plataforma de associados</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
            Bem-vindo ao{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-white bg-clip-text text-transparent">
              Bold Life
            </span>
          </h1>

          <p className="text-white/80 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            Construa sua rede, faça vendas e acompanhe suas comissões em tempo real.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-white text-[#1B2A5E] hover:bg-white/90 font-semibold gap-2 h-12 px-8 shadow-xl"
            >
              <LogIn size={18} /> Entrar
            </Button>
            <Button
              onClick={handleRegister}
              size="lg"
              variant="outline"
              className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-semibold gap-2 h-12 px-8"
            >
              <UserPlus size={18} /> Criar conta
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12">
            {[
              { icon: Users, title: 'Sua Rede', desc: 'Acompanhe seus associados' },
              { icon: ShoppingBag, title: 'Loja', desc: 'Produtos com comissão' },
              { icon: Wallet, title: 'Carteira', desc: 'Saques e ganhos' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-300/20 flex items-center justify-center mb-3 mx-auto">
                  <Icon size={18} className="text-cyan-300" />
                </div>
                <h3 className="text-white font-semibold text-sm">{title}</h3>
                <p className="text-white/60 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <p className="text-white/50 text-xs">
          © {new Date().getFullYear()} Bold Life. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}