import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, CheckCircle, XCircle, Search, Eye, Truck, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import OrderDetailModal from '@/components/OrderDetailModal';
import DeliveryManageModal from '@/components/DeliveryManageModal';

const deliveryStatusConfig = {
  pending:    { label: 'Aguardando',    cls: 'bg-slate-500/20 text-slate-400' },
  processing: { label: 'Em separação', cls: 'bg-yellow-500/20 text-yellow-400' },
  shipped:    { label: 'Enviado',       cls: 'bg-blue-500/20 text-blue-400' },
  delivered:  { label: 'Entregue',      cls: 'bg-green-500/20 text-green-400' },
  returned:   { label: 'Devolvido',     cls: 'bg-red-500/20 text-red-400' },
};

const statusBadgeConfig = {
  pending:   { label: 'Pendente',   cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  paid:      { label: 'Pago',       cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelado',  cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  refunded:  { label: 'Reembolsado',cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// Agrupa itens por order_number / cart_id
function groupOrders(orders) {
  const groups = {};
  for (const o of orders) {
    const key = o.cart_id || o.id;
    if (!groups[key]) {
      groups[key] = {
        cart_id: key,
        order_number: o.order_number,
        associate_name: o.associate_name,
        associate_id: o.associate_id,
        status: o.status,
        delivery_status: o.delivery_status,
        shipping_city: o.shipping_city,
        shipping_state: o.shipping_state,
        shipping_method_name: o.shipping_method_name,
        tracking_code: o.tracking_code,
        scheduled_date: o.scheduled_date,
        scheduled_time: o.scheduled_time,
        created_date: o.created_date,
        items: [],
        total: 0,
        firstOrder: o,
      };
    }
    groups[key].items.push(o);
     // Total: soma dos amounts dos itens
     groups[key].total += o.amount || 0;
  }
  // Adiciona shipping_cost 1x por grupo
  for (const g of Object.values(groups)) {
    const sc = g.items[0]?.shipping_cost || 0;
    g.total += sc;
    g.shipping_cost = sc;
  }
  // Ordena por order_number desc
  return Object.values(groups).sort((a, b) => (b.order_number || 0) - (a.order_number || 0));
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState(null);
  const [deliveryOrder, setDeliveryOrder] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const data = await base44.entities.Order.list('-created_date', 500);
    setOrders(data);
    setLoading(false);
  };

  const confirmPayment = async (group) => {
    // Confirma todos os itens do grupo
    for (const order of group.items) {
      await base44.entities.Order.update(order.id, { status: 'paid' });

      const commissionAmount = (order.amount * (order.commission_percent / 100));
      const config = await base44.entities.NetworkConfig.list();
      const maxLevels = config[0]?.max_levels || 5;

      let currentAssociate = await base44.entities.Associate.filter({ id: order.associate_id });
      if (currentAssociate.length === 0) continue;

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

        await base44.entities.Associate.update(sponsor.id, {
          wallet_balance: (sponsor.wallet_balance || 0) + commissionAmount,
          total_earned: (sponsor.total_earned || 0) + commissionAmount,
        });

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
    }
    loadOrders();
  };

  const cancelGroup = async (group) => {
    for (const order of group.items) {
      await base44.entities.Order.update(order.id, { status: 'cancelled' });
    }
    loadOrders();
  };

  const statusBadge = (status) => {
    const s = statusBadgeConfig[status] || statusBadgeConfig.pending;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const groups = groupOrders(orders);

  const filtered = groups
    .filter(g => filter === 'all' || g.status === filter)
    .filter(g =>
      g.associate_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.items.some(i => i.product_name?.toLowerCase().includes(search.toLowerCase())) ||
      String(g.order_number || '').includes(search)
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie pagamentos, comissões e entregas</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={async () => {
            await base44.functions.invoke('numberExistingOrders', {});
            loadOrders();
          }}
        >
          <Hash size={13} /> Numerar pedidos antigos
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 bg-secondary border-border text-foreground" placeholder="Buscar por nº, associado ou produto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
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
            {filtered.map(group => {
              const del = deliveryStatusConfig[group.delivery_status];
              const productNames = group.items.map(i => i.product_name).filter(Boolean);
              const displayProducts = productNames.slice(0, 2).join(', ') + (productNames.length > 2 ? ` +${productNames.length - 2}` : '');

              return (
                <div key={group.cart_id} className="p-4 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {group.order_number ? (
                          <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Pedido #{group.order_number}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem número</span>
                        )}
                        <span className="text-xs text-muted-foreground">{new Date(group.created_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{displayProducts}</p>
                      <p className="text-xs text-muted-foreground">{group.associate_name} · {group.items.length} item{group.items.length !== 1 ? 's' : ''}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm font-bold text-primary">R$ {group.total.toFixed(2)}</span>
                        {group.shipping_city && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            📍 {group.shipping_city}/{group.shipping_state}
                          </span>
                        )}
                        {group.shipping_method_name && (
                          <span className="text-xs text-muted-foreground">{group.shipping_method_name}</span>
                        )}
                      </div>
                      {del && group.status === 'paid' && (
                        <Badge className={`${del.cls} text-xs mt-1`}>{del.label}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {statusBadge(group.status)}
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setDetailOrder(group)}>
                        <Eye size={11} /> Ver
                      </Button>

                      {group.status === 'paid' && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={() => setDeliveryOrder(group.firstOrder)}>
                          <Truck size={11} /> Entrega
                        </Button>
                      )}
                      {group.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 gap-1"
                            onClick={() => confirmPayment(group)}>
                            <CheckCircle size={12} /> Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300"
                            onClick={() => cancelGroup(group)}>
                            <XCircle size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OrderDetailModal order={detailOrder} open={!!detailOrder} onClose={() => setDetailOrder(null)} />
      <DeliveryManageModal order={deliveryOrder} open={!!deliveryOrder} onClose={() => setDeliveryOrder(null)} onSaved={loadOrders} />

    </div>
  );
}