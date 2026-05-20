import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, ShoppingBag, Wallet, TrendingUp, UserCheck, Clock, AlertCircle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, orders: 0, commissions: 0, withdrawals: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [associates, orders, commissions, withdrawals] = await Promise.all([
      base44.entities.Associate.list(),
      base44.entities.Order.list('-created_date', 5),
      base44.entities.Commission.list(),
      base44.entities.WithdrawalRequest.filter({ status: 'pending' }),
    ]);

    const totalCommissions = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);
    setStats({
      total: associates.length,
      active: associates.filter(a => a.status === 'active').length,
      pending: associates.filter(a => a.status === 'pending').length,
      orders: orders.length,
      commissions: totalCommissions,
      withdrawals: withdrawals.length,
    });
    setRecentActivity(orders);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Painel Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da plataforma Bold Life</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Associados" value={stats.total} icon={Users} color="blue" />
        <StatCard title="Ativos" value={stats.active} icon={UserCheck} color="green" />
        <StatCard title="Pendentes" value={stats.pending} icon={Clock} color="gold" />
        <StatCard title="Comissões Totais" value={`R$ ${stats.commissions.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <StatCard title="Saques Pendentes" value={stats.withdrawals} icon={Wallet} color="gold" />
        <StatCard title="Últimos Pedidos" value={stats.orders} icon={ShoppingBag} color="blue" />
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
    </div>
  );
}