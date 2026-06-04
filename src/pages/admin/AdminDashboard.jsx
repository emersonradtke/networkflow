import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, ShoppingBag, Wallet, TrendingUp, UserCheck, Clock, AlertCircle, AlertTriangle, PackagePlus, CheckCircle, XCircle, Package, CreditCard } from 'lucide-react';
import StatCard from '@/components/StatCard';
import OrderStatusModal from '@/components/OrderStatusModal';
import CommissionsModal from '@/components/CommissionsModal';
import TopProductsWidget from '@/components/admin/TopProductsWidget';
import CommissionManager from '@/components/admin/CommissionManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, orders: 0, commissions: 0, withdrawals: 0, cardCount: 0, cardRequests: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState({ pending: [], paid: [], cancelled: [], refunded: [] });
  const [allCommissions, setAllCommissions] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showCommissions, setShowCommissions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // Load essential data first
      const [associates, allOrders] = await Promise.all([
        base44.entities.Associate.list('-updated_date', 100),
        base44.entities.Order.list('-created_date', 100),
      ]);

      // Load secondary data sequentially to avoid rate limit
      const withdrawals = await base44.entities.WithdrawalRequest.filter({ status: 'pending' });
      const commissions = await base44.entities.Commission.list('-created_date', 100);
      const cardRequests = await base44.entities.CardRequest.filter({ status: 'pending' });
      const products = await base44.entities.Product.filter({ is_active: true });

      const totalCommissions = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);
      const cardCount = associates.filter(a => a.has_boldlife_card).length;
      
      const grouped = {
        pending: allOrders.filter(o => o.status === 'pending'),
        paid: allOrders.filter(o => o.status === 'paid'),
        cancelled: allOrders.filter(o => o.status === 'cancelled'),
        refunded: allOrders.filter(o => o.status === 'refunded'),
      };

      setStats({
        total: associates.length,
        active: associates.filter(a => a.status === 'active').length,
        pending: associates.filter(a => a.status === 'pending').length,
        orders: allOrders.length,
        commissions: totalCommissions,
        withdrawals: withdrawals.length,
        cardCount: cardCount,
        cardRequests: cardRequests.length,
      });
      setOrdersByStatus(grouped);
      setAllCommissions(commissions);
      setRecentActivity(allOrders.slice(0, 5));
      setLowStockProducts(products.filter(p => p.type === 'direct_sale' && p.stock_min != null && p.stock != null && p.stock <= p.stock_min));
      setLoading(false);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Painel Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da plataforma Bold Life</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="products">Produtos Top</TabsTrigger>
          <TabsTrigger value="commissions">Gerenciar Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Associados" value={stats.total} icon={Users} color="blue" />
        <StatCard title="Ativos" value={stats.active} icon={UserCheck} color="green" />
        <StatCard title="Pendentes" value={stats.pending} icon={Clock} color="gold" />
        <button onClick={() => setShowCommissions(true)} className="w-full">
          <StatCard title="Comissões Totais" value={`R$ ${stats.commissions.toFixed(2)}`} icon={TrendingUp} color="purple" />
        </button>
        <StatCard title="Saques Pendentes" value={stats.withdrawals} icon={Wallet} color="gold" />
        <StatCard title="Últimos Pedidos" value={stats.orders} icon={ShoppingBag} color="blue" />
        <StatCard title="Com Cartão BoldLife" value={stats.cardCount} icon={CreditCard} color="green" />
        <StatCard title="Solicitações de Cartão" value={stats.cardRequests} icon={CreditCard} color="gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedStatus('pending')}
          className="dark-card rounded-2xl p-4 hover:shadow-md transition text-left border border-yellow-200 hover:border-yellow-400"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock size={20} className="text-yellow-600" />
            <span className="text-2xl font-black text-yellow-600">{ordersByStatus.pending.length}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">Pedidos Pendentes</p>
          <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
        </button>

        <button
          onClick={() => setSelectedStatus('paid')}
          className="dark-card rounded-2xl p-4 hover:shadow-md transition text-left border border-green-200 hover:border-green-400"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-2xl font-black text-green-600">{ordersByStatus.paid.length}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">Pedidos Pagos</p>
          <p className="text-xs text-muted-foreground">Confirmados e processando</p>
        </button>

        <button
          onClick={() => setSelectedStatus('cancelled')}
          className="dark-card rounded-2xl p-4 hover:shadow-md transition text-left border border-red-200 hover:border-red-400"
        >
          <div className="flex items-center justify-between mb-2">
            <XCircle size={20} className="text-red-600" />
            <span className="text-2xl font-black text-red-600">{ordersByStatus.cancelled.length}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">Pedidos Cancelados</p>
          <p className="text-xs text-muted-foreground">Transações canceladas</p>
        </button>

        <button
          onClick={() => setSelectedStatus('refunded')}
          className="dark-card rounded-2xl p-4 hover:shadow-md transition text-left border border-slate-200 hover:border-slate-400"
        >
          <div className="flex items-center justify-between mb-2">
            <Package size={20} className="text-slate-600" />
            <span className="text-2xl font-black text-slate-600">{ordersByStatus.refunded.length}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">Pedidos Reembolsados</p>
          <p className="text-xs text-muted-foreground">Transações devolvidas</p>
        </button>
      </div>

      {stats.pending > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertCircle size={18} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-bold text-yellow-400">{stats.pending} associados</span> aguardando ativação.{' '}
            <a href="/admin/associates" className="text-primary hover:underline">Ver agora →</a>
          </p>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="dark-card rounded-2xl p-5 border border-orange-200 bg-orange-50/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertTriangle size={15} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Estoque Abaixo do Mínimo</h3>
              <p className="text-xs text-muted-foreground">{lowStockProducts.length} produto(s) precisam de reposição</p>
            </div>
            <a href="/admin/products" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
              <PackagePlus size={13} /> Gerenciar
            </a>
          </div>
          <div className="space-y-2">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                  {p.code && <span className="text-xs font-mono text-muted-foreground">#{p.code}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                    {p.stock} / mín {p.stock_min}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dark-card rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-4">Últimos Pedidos</h3>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-secondary rounded animate-pulse" />)}</div>
        ) : recentActivity.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum pedido ainda.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{o.product_name}</p>
                  <p className="text-xs text-muted-foreground">{o.associate_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">R$ {o.amount?.toFixed(2)}</p>
                  <Badge className={
                    o.status === 'paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    o.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/20 text-red-400'
                  }>
                    {o.status === 'paid' ? 'Pago' : o.status === 'pending' ? 'Pendente' : 'Cancelado'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OrderStatusModal
        status={selectedStatus}
        orders={selectedStatus ? ordersByStatus[selectedStatus] : []}
        open={selectedStatus !== null}
        onClose={() => setSelectedStatus(null)}
      />

      <CommissionsModal
        commissions={allCommissions}
        open={showCommissions}
        onClose={() => setShowCommissions(false)}
      />
        </TabsContent>

        <TabsContent value="products">
          <TopProductsWidget />
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}