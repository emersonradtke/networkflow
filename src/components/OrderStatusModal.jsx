import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Clock, CheckCircle, XCircle, Package } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500/20 text-yellow-600' },
  paid: { label: 'Pago', icon: CheckCircle, color: 'bg-green-500/20 text-green-600' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-red-500/20 text-red-600' },
  refunded: { label: 'Reembolsado', icon: Package, color: 'bg-slate-500/20 text-slate-600' },
};

export default function OrderStatusModal({ status, orders, open, onClose }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const total = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon size={20} className="text-primary" />
            Pedidos {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Total de Pedidos</p>
              <p className="text-xl font-bold text-foreground">{orders.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-xl font-bold text-foreground">
                R$ {(total / orders.length || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="border border-border rounded-lg p-3 space-y-2 hover:bg-secondary/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <ShoppingBag size={16} className="text-primary" />
                      Pedido #{order.order_number || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.product_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">R$ {order.amount?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {order.quantity || 1}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Associado: </span>
                    <span className="font-medium text-foreground">{order.associate_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo: </span>
                    <span className="font-medium text-foreground">
                      {order.product_type === 'external_link' ? 'Link Externo' : 'Venda Direta'}
                    </span>
                  </div>
                  {order.shipping_method_name && (
                    <div>
                      <span className="text-muted-foreground">Envio: </span>
                      <span className="font-medium text-foreground">{order.shipping_method_name}</span>
                    </div>
                  )}
                  {order.shipping_city && (
                    <div>
                      <span className="text-muted-foreground">Destino: </span>
                      <span className="font-medium text-foreground">{order.shipping_city} / {order.shipping_state}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_date).toLocaleDateString('pt-BR')}
                  </span>
                  {order.commission_percent && (
                    <Badge className="bg-blue-500/20 text-blue-600 text-xs">
                      Comissão: {order.commission_percent}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}