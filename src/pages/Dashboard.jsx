import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Wallet, Users, ShoppingBag, TrendingUp, Copy, CheckCircle, Clock, Bell, Gift, CreditCard } from 'lucide-react';
const LOGO_URL = 'https://res.cloudinary.com/dm5qnmz7b/image/upload/v1721593625/boldlife/logo_v2.webp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import StatCard from '@/components/StatCard';
import MyOrders from '@/components/MyOrders';
import PendingPlacements from '@/components/PendingPlacements';
import AddressModal from '@/components/AddressModal';
import PurchaseIntentsCard from '@/components/PurchaseIntentsCard';
import SubscriptionPaymentModal from '@/components/SubscriptionPaymentModal';
import BoldLifeCardSection from '@/components/BoldLifeCardSection';

export default function Dashboard() {
  const { user, associate } = useOutletContext();
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [networkCount, setNetworkCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [networkConfig, setNetworkConfig] = useState(null);
  const [freshStatus, setFreshStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (associate?.id) {
      loadData();
      const loadConfig = async () => {
        const config = await base44.entities.NetworkConfig.list();
        setNetworkConfig(config[0] || null);
      };
      loadConfig();
    }
  }, [associate]);

  useEffect(() => {
    if (associate?.id && associate.status === 'pending') {
      setCheckingStatus(true);
      base44.entities.Associate.filter({ id: associate.id }).then(res => {
        if (res.length > 0) setFreshStatus(res[0].status);
        setCheckingStatus(false);
      }).catch(() => setCheckingStatus(false));
    }
  }, [associate?.id]);

  const loadData = async () => {
    try {
      // Load data sequentially to avoid rate limit
      const commissions = await base44.entities.Commission.filter({ beneficiary_id: associate.id }, '-created_date', 5);
      await new Promise(r => setTimeout(r, 100));
      
      const networkMembers = await base44.entities.Associate.filter({ sponsor_id: associate.id });
      await new Promise(r => setTimeout(r, 100));
      
      const notifs = await base44.entities.Notification.filter({ associate_id: associate.id, is_read: false }, '-created_date', 3);
      await new Promise(r => setTimeout(r, 100));
      
      const subs = await base44.entities.Subscription.filter({ associate_id: associate.id });
      
      setRecentCommissions(commissions);
      setNetworkCount(networkMembers.length);
      setNotifications(notifs);
      setSubscription(subs[0] || null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/register?ref=${associate?.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!associate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const effectiveStatus = freshStatus || associate?.status;

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando status da conta...</p>
        </div>
      </div>
    );
  }

  if (effectiveStatus !== 'active') {
    if (!networkConfig) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}>
            <Clock size={48} className="text-white" />
          </div>

          {/* Logo */}
          <img src={LOGO_URL} alt="Bold Life" className="h-8 w-auto object-contain mx-auto" />

          {/* Title */}
          <h1 className="text-2xl font-black text-foreground">Cadastro Realizado!</h1>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sua conta está <span className="text-primary font-semibold">pendente de ativação</span>. Realize o pagamento da adesão de <span className="font-bold text-foreground">R$ {networkConfig.adhesion_price?.toFixed(2)}</span> para ter acesso completo à plataforma.
          </p>

          {/* Next Steps */}
          <div className="bg-blue-50 border-l-4 border-primary rounded-lg p-4 text-left space-y-3">
            <p className="text-sm font-bold text-primary">Próximos passos:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span>Realize o pagamento da taxa de adesão</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span>Aguarde a confirmação do pagamento</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span>Acesse a loja e comece a ganhar!</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <Button 
            onClick={() => setShowSubscriptionModal(true)}
            className="w-full font-bold text-white text-base py-6"
            style={{ background: 'linear-gradient(135deg, #1B2A5E 0%, #3B9EE2 100%)' }}
          >
            <CreditCard size={18} className="mr-2" />
            Pagar Adesão — R$ {networkConfig.adhesion_price?.toFixed(2)}
          </Button>

          {/* Alternative Link */}
          <Link to="/wallet" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Pagar depois → Ir para o Painel
          </Link>

          <SubscriptionPaymentModal
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            associate={associate}
            networkConfig={networkConfig}
            onSuccess={loadData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">
          Olá, {associate.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo da sua rede e ganhos</p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Bell size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prompt de endereço */}
      {!associate.addresses_completed && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
          <span className="text-xl">📍</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800">Complete seu endereço</p>
            <p className="text-xs text-blue-600 mt-0.5">Adicione seu endereço de entrega e faturamento para poder realizar compras.</p>
          </div>
          <button onClick={() => setShowAddressModal(true)} className="text-xs font-bold text-blue-700 border border-blue-300 bg-white px-3 py-1.5 rounded-lg hover:bg-blue-50 shrink-0">
            Preencher
          </button>
        </div>
      )}

      {/* Invite Link */}
      <div className="dark-card rounded-2xl p-5 glow-gold">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Seu Link de Convite</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-muted-foreground truncate border border-border">
            {window.location.origin}/register?ref={associate.invite_code}
          </div>
          <Button size="sm" className="gold-gradient text-background font-bold gap-1.5 shrink-0" onClick={copyInviteLink}>
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
      </div>

      {/* Cartão BoldLife */}
      <BoldLifeCardSection 
        associate={associate} 
        networkConfig={networkConfig}
        onUpdate={loadData}
      />

      {/* Solicitações de Colocação */}
      <PendingPlacements associateId={associate.id} onAccepted={loadData} />

      {/* Subscription Status */}
      {subscription?.status === 'active' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Assinatura Ativa</p>
            <p className="text-xs text-green-600">Renovação em: {new Date(subscription.renewal_date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo" value={`R$ ${(associate.wallet_balance || 0).toFixed(2)}`} icon={Wallet} color="gold" />
        <StatCard title="Total Ganho" value={`R$ ${(associate.total_earned || 0).toFixed(2)}`} icon={TrendingUp} color="green" />
        <StatCard title="Diretos" value={networkCount} icon={Users} color="blue" />
        <StatCard title="Pontos" value={`${(associate.total_pontos || 0).toLocaleString('pt-BR')}`} icon={Gift} color="purple" />
      </div>

      {/* Recent Commissions */}
      <div className="dark-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">Últimas Comissões</h3>
          <Link to="/wallet" className="text-xs text-primary hover:underline">Ver todas</Link>
        </div>
        {recentCommissions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma comissão ainda. Compartilhe seu link!</p>
        ) : (
          <div className="space-y-3">
            {recentCommissions.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.product_name}</p>
                  <p className="text-xs text-muted-foreground">Nível {c.network_level} · {c.originator_name}</p>
                </div>
                <span className="text-sm font-bold text-green-400">+R$ {c.commission_amount?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Intents */}
      <PurchaseIntentsCard associateId={associate?.id} />

      {/* My Orders */}
      <MyOrders associateId={associate?.id} />

      <AddressModal
        associate={associate}
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSaved={() => { setShowAddressModal(false); }}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/store">
          <div className="dark-card rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group">
            <ShoppingBag size={22} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-foreground text-sm">Loja Virtual</p>
            <p className="text-xs text-muted-foreground mt-0.5">Compre e ganhe</p>
          </div>
        </Link>
        <Link to="/network">
          <div className="dark-card rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group">
            <Users size={22} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-foreground text-sm">Minha Rede</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ver estrutura</p>
          </div>
        </Link>
      </div>
    </div>
  );
}