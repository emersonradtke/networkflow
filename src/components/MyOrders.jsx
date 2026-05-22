import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Package, ExternalLink, Truck, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  pending:   { label: 'Pendente',   icon: Clock,         cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  paid:      { label: 'Pago',       icon: CheckCircle,   cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  cancelled: { label: 'Cancelado',  icon: XCircle,       cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
  refunded:  { label: 'Reembolsado',icon: Package,       cls: 'bg-slate-500/20 text-slate-600 border-slate-500/30' },
};

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const st = statusConfig[order.status] || statusConfig.pending;
  const Icon = st.icon;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <ShoppingBag size={16} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {order.order_number && (
              <span className="text-xs font-black text-primary">#{order.order_number}</span>
            )}
            <p className="text-sm font-semibold text-slate-800 truncate">{order.product_name}</p>
          </div>
          <p className="text-xs text-slate-500">
            {new Date(order.created_date).toLocaleDateString('pt-BR')} · R$ {order.amount?.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${st.cls} text-xs`}>
            <Icon size={10} className="mr-1" />
            {st.label}
          </Badge>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Detalhes */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Produto</p>
              <p className="text-slate-700 font-medium mt-0.5">{order.product_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Valor</p>
              <p className="text-slate-700 font-bold mt-0.5">R$ {order.amount?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Tipo</p>
              <p className="text-slate-700 mt-0.5">
                {order.product_type === 'external_link' ? 'Link Externo' : 'Venda Direta'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Pagamento</p>
              <p className="text-slate-700 mt-0.5">{order.payment_method || '—'}</p>
            </div>
            {order.commission_percent > 0 && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Comissão</p>
                <p className="text-green-600 font-semibold mt-0.5">
                  {order.commission_percent}% · R$ {order.total_commission?.toFixed(2)}
                </p>
              </div>
            )}
            {order.status === 'paid' && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Status Entrega</p>
                <p className="text-slate-700 mt-0.5 flex items-center gap-1">
                  <Truck size={13} className="text-blue-500" /> Em processamento
                </p>
              </div>
            )}
          </div>

          {/* Código de rastreio */}
          {order.tracking_code && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Truck size={12} /> Código de Rastreio
              </p>
              <p className="text-sm font-mono font-bold text-blue-800">{order.tracking_code}</p>
            </div>
          )}

          {/* Notas do pedido */}
          {order.notes && (
            <div className="bg-slate-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-slate-700">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyOrders({ associateId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (associateId) {
      base44.entities.Order.filter({ associate_id: associateId }, '-created_date', 20)
        .then(data => { setOrders(data); setLoading(false); });
    }
  }, [associateId]);

  return (
    <div className="dark-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary" /> Meus Pedidos
        </h3>
        <span className="text-xs text-muted-foreground">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</span>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-6">
          <Package size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}