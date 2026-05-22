import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Package, Clock, CheckCircle, XCircle, Truck, Search, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import OrderDetailModal from '@/components/OrderDetailModal';

const statusConfig = {
  pending:   { label: 'Pendente',    icon: Clock,        cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  paid:      { label: 'Pago',        icon: CheckCircle,  cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  cancelled: { label: 'Cancelado',   icon: XCircle,      cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
  refunded:  { label: 'Reembolsado', icon: Package,      cls: 'bg-slate-500/20 text-slate-600 border-slate-500/30' },
};

function OrderCard({ order, onView }) {
  const st = statusConfig[order.status] || statusConfig.pending;
  const Icon = st.icon;

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <ShoppingBag size={16} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{order.product_name}</p>
        <p className="text-xs text-slate-500">
          {new Date(order.created_date).toLocaleDateString('pt-BR')} · R$ {order.amount?.toFixed(2)}
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

  useEffect(() => {
    if (associate?.id) {
      base44.entities.Order.filter({ associate_id: associate.id }, '-created_date', 50)
        .then(data => { setOrders(data); setLoading(false); });
    }
  }, [associate]);

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.product_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount || 0), 0);
  const totalCommission = orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total_commission || 0), 0);

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
        <div className="flex gap-2">
          {['all', 'pending', 'paid', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                statusFilter === s ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {{ all: 'Todos', pending: 'Pendente', paid: 'Pago', cancelled: 'Cancelado' }[s]}
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
          filtered.map(o => <OrderCard key={o.id} order={o} onView={setSelectedOrder} />)
        )}
      </div>

      <OrderDetailModal order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}