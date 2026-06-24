import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Package, Clock, CheckCircle, XCircle, Truck, Search, Eye, Star, MessageSquare } from 'lucide-react';
import DeliveryActionsModal from '@/components/DeliveryActionsModal';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import OrderDetailModal from '@/components/OrderDetailModal';
import ReviewModal from '@/components/ReviewModal';

const statusConfig = {
  pending:   { label: 'Pendente',    icon: Clock,        cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  paid:      { label: 'Pago',        icon: CheckCircle,  cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  cancelled: { label: 'Cancelado',   icon: XCircle,      cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
  refunded:  { label: 'Reembolsado', icon: Package,      cls: 'bg-slate-500/20 text-slate-600 border-slate-500/30' },
  submitted: { label: 'Aguardando Aprovação', icon: Clock, cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  approved:  { label: 'Aprovado',    icon: CheckCircle,  cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  rejected:  { label: 'Rejeitado',   icon: XCircle,      cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
};

const deliveryStatusConfig = {
  pending:    { label: 'Ag. Envio',   cls: 'bg-slate-100 text-slate-500' },
  processing: { label: 'Preparando',  cls: 'bg-blue-100 text-blue-600' },
  shipped:    { label: 'Enviado',      cls: 'bg-yellow-100 text-yellow-600' },
  delivered:  { label: 'Entregue',    cls: 'bg-green-100 text-green-700' },
  returned:   { label: 'Em Disputa',  cls: 'bg-red-100 text-red-600' },
};

function OrderCard({ order, onView, onReview, onDeliveryAction, isExternalLink = false }) {
  const st = statusConfig[order.status] || statusConfig.pending;
  const Icon = st.icon;
  const dSt = isExternalLink ? null : (deliveryStatusConfig[order.delivery_status] || deliveryStatusConfig.pending);
  const canAct = !isExternalLink && order.status === 'paid' && order.delivery_status === 'shipped';

  return (
    <div className={`border rounded-xl p-4 flex items-center gap-3 ${
      isExternalLink 
        ? 'border-cyan-300/50 bg-cyan-50/40' 
        : 'border-slate-200 bg-white'
    }`}>
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <ShoppingBag size={16} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {order.order_number && (
              <span className="text-xs font-black text-primary">#{order.order_number}</span>
            )}
            <span className="text-xs text-slate-500">{new Date(order.clicked_at || order.created_date).toLocaleDateString('pt-BR')}</span>
            {dSt && order.delivery_status && order.delivery_status !== 'pending' && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${dSt.cls}`}>{dSt.label}</span>
            )}
          </div>
        <p className="text-sm font-semibold text-slate-800 truncate">{order.product_name || order.banner_name}</p>
        <p className="text-xs text-slate-500">
          R$ {(order.amount || order.purchase_amount)?.toFixed(2)}
          {order.shipping_city && ` · ${order.shipping_city}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={`${st.cls} text-xs`}>
          <Icon size={10} className="mr-1" />{st.label}
        </Badge>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onView(order)}>
          <Eye size={11} /> Ver
        </Button>
        {canAct && (
          <Button size="sm" className="h-7 gap-1 text-xs font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={() => onDeliveryAction(order)}>
            <Truck size={11} /> Entrega
          </Button>
        )}
        {!isExternalLink && order.status === 'paid' && order.delivery_status !== 'shipped' && (
           <Button size="sm" className="h-7 gap-1 text-xs bg-primary" onClick={() => onReview(order)}>
             <Star size={11} /> Avaliar
           </Button>
         )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { associate } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [deliveryOrder, setDeliveryOrder] = useState(null);

  useEffect(() => {
    if (associate?.id) {
      Promise.all([
        base44.entities.Order.filter({ associate_id: associate.id }, '-created_date', 50),
        base44.entities.ExternalLinkClick.filter(
          { associate_id: associate.id, status: { $in: ['submitted', 'approved'] } },
          '-clicked_at',
          50
        ),
      ]).then(([orders, externalLinks]) => {
        // Combinar ambos os tipos, marcando os ExternalLinkClick
        const combined = [
          ...orders,
          ...externalLinks.map(e => ({ ...e, _isExternalLink: true })),
        ].sort((a, b) => new Date(b.clicked_at || b.created_date) - new Date(a.clicked_at || a.created_date));
        setOrders(combined);
        setLoading(false);
      });
    }
  }, [associate]);

  const filtered = orders.filter(o => {
    const name = o.product_name || o.banner_name || '';
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount || 0), 0);
  const totalCommission = orders
    .filter(o => o.status === 'paid' || o.status === 'approved')
    .reduce((s, o) => s + (o.total_commission || o.commission_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Meus Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1">Histórico de compras realizadas</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Pedidos</p>
          <p className="text-2xl font-black text-foreground mt-1">{orders.length}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pago</p>
          <p className="text-2xl font-black text-primary mt-1">R$ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Comissão Gerada</p>
          <p className="text-2xl font-black text-green-600 mt-1">R$ {totalCommission.toFixed(2)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
           {['all', 'pending', 'paid', 'submitted', 'approved', 'cancelled'].map(s => (
             <button
               key={s}
               onClick={() => setStatusFilter(s)}
               className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                 statusFilter === s ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
               }`}
             >
               {{ 
                 all: 'Todos', 
                 pending: 'Pendente', 
                 paid: 'Pago', 
                 submitted: 'Aguardando', 
                 approved: 'Aprovado',
                 cancelled: 'Cancelado' 
               }[s]}
             </button>
           ))}
         </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={36} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
          </div>
        ) : (
           filtered.map(o => <OrderCard 
             key={o.id} 
             order={o} 
             onView={setSelectedOrder} 
             onReview={setReviewOrder} 
             onDeliveryAction={setDeliveryOrder}
             isExternalLink={o._isExternalLink}
           />)
         )}
        </div>

        <OrderDetailModal order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
        <ReviewModal order={reviewOrder} isOpen={!!reviewOrder} onClose={() => setReviewOrder(null)} onSubmit={() => setReviewOrder(null)} />
        <DeliveryActionsModal
          order={deliveryOrder}
          open={!!deliveryOrder}
          onClose={() => setDeliveryOrder(null)}
          onDone={() => {
            base44.entities.Order.filter({ associate_id: associate.id }, '-created_date', 50).then(setOrders);
          }}
        />
    </div>
  );
}