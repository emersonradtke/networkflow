import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const data = await base44.entities.Order.list('-created_date');
    setOrders(data);
    setLoading(false);
  };

  const confirmPayment = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'paid' });

    // Calculate and distribute commissions
    const commissionAmount = (order.amount * (order.commission_percent / 100));
    const config = await base44.entities.NetworkConfig.list();
    const maxLevels = config[0]?.max_levels || 5;

    // Walk up the network and distribute commissions
    let currentAssociate = await base44.entities.Associate.filter({ id: order.associate_id });
    if (currentAssociate.length === 0) {
      loadOrders();
      return;
    }

    let current = currentAssociate[0];
    let level = 1;

    while (current.sponsor_id && level <= maxLevels) {
      const sponsors = await base44.entities.Associate.filter({ id: current.sponsor_id, status: 'active' });
      if (sponsors.length === 0) break;
      const sponsor = sponsors[0];

      await base44.entities.Commission.create({
        order_id: order.id,
        beneficiary_id: sponsor.id,
        beneficiary_name: sponsor.full_name,
        originator_id: order.associate_id,
        originator_name: order.associate_name,
        product_id: order.product_id,
        product_name: order.product_name,
        network_level: level,
        order_amount: order.amount,
        commission_percent: order.commission_percent,
        commission_amount: commissionAmount,
        status: 'credited',
      });

      // Update sponsor wallet
      const newBalance = (sponsor.wallet_balance || 0) + commissionAmount;
      const newTotal = (sponsor.total_earned || 0) + commissionAmount;
      await base44.entities.Associate.update(sponsor.id, {
        wallet_balance: newBalance,
        total_earned: newTotal,
      });

      // Notify sponsor
      await base44.entities.Notification.create({
        associate_id: sponsor.id,
        title: 'Nova Comissão Recebida! 💰',
        message: `Você recebeu R$ ${commissionAmount.toFixed(2)} de comissão sobre a compra de ${order.product_name} (Nível ${level}).`,
        type: 'commission',
        is_read: false,
      });

      current = sponsor;
      level++;
    }

    loadOrders();
  };

  const cancelOrder = async (id) => {
    await base44.entities.Order.update(id, { status: 'cancelled' });
    loadOrders();
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      paid: { label: 'Pago', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
      cancelled: { label: 'Cancelado', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };
    const s = map[status] || map.pending;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o =>
      o.associate_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie pagamentos e distribua comissões</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 bg-secondary border-border text-foreground" placeholder="Buscar pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'paid', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground'}`}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'paid' ? 'Pagos' : 'Cancelados'}
            </button>
          ))}
        </div>
      </div>

      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(o => (
              <div key={o.id} className="p-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground">{o.associate_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">R$ {o.amount?.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{o.commission_percent}% comissão</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(o.status)}
                    {o.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 gap-1" onClick={() => confirmPayment(o)}>
                          <CheckCircle size={12} /> Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300" onClick={() => cancelOrder(o.id)}>
                          <XCircle size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}