import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Wallet, Users, ShoppingBag, TrendingUp, Copy, CheckCircle, Clock, Bell, Gift, CreditCard, ExternalLink } from 'lucide-react';
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

  if (effectiveStatus === 'awaiting_placement') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E20,#3B9EE220)' }}>
          <Users size={36} className="text-primary" />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">Aguardando Colocação</h2>
        <p className="text-muted-foreground mb-6">
          Seu patrocinador atingiu o limite de membros diretos. O administrador está buscando uma posição para você na rede. Você será notificado assim que confirmado.
        </p>
        {associate.sponsor_name && (
          <div className="dark-card rounded-xl p-4 text-left">
            <p className="text-sm text-muted-foreground">Indicado por: <span className="font-semibold text-primary">{associate.sponsor_name}</span></p>
          </div>
        )}
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

      {/* Link da Loja Pública */}
      {associate.invite_code && (
        <div className="dark-card rounded-2xl p-5 border-l-4 border-cyan">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-primary" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sua Loja Pública</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Compartilhe com clientes — eles compram e você ganha comissão!</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-muted-foreground truncate border border-border">
              {window.location.origin}/loja/{associate.invite_code}
            </div>
            <Button size="sm" className="font-bold gap-1.5 shrink-0" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/loja/${associate.invite_code}`);
              }}>
              <Copy size={14} />
              Copiar
            </Button>
          </div>
          <a href={`/loja/${associate.invite_code}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
            <ExternalLink size={11} /> Abrir minha loja
          </a>
        </div>
      )}

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