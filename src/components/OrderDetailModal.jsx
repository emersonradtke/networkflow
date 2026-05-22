import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, CreditCard, Package, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

const statusConfig = {
  pending:   { label: 'Pendente',    icon: Clock,        cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  paid:      { label: 'Pago',        icon: CheckCircle,  cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  cancelled: { label: 'Cancelado',   icon: XCircle,      cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
  refunded:  { label: 'Reembolsado', icon: Package,      cls: 'bg-slate-500/20 text-slate-600 border-slate-500/30' },
};

const deliveryStatusConfig = {
  pending:    { label: 'Aguardando',    cls: 'bg-slate-500/20 text-slate-600' },
  processing: { label: 'Em separação', cls: 'bg-yellow-500/20 text-yellow-600' },
  shipped:    { label: 'Enviado',       cls: 'bg-blue-500/20 text-blue-600' },
  delivered:  { label: 'Entregue',      cls: 'bg-green-500/20 text-green-600' },
  returned:   { label: 'Devolvido',     cls: 'bg-red-500/20 text-red-600' },
};

function AddressBlock({ title, icon: Icon, street, number, complement, neighborhood, city, state, zip }) {
  if (!street && !city) return null;
  const line1 = [street, number].filter(Boolean).join(', ');
  const line2 = [complement, neighborhood].filter(Boolean).join(' - ');
  const line3 = [city && state ? `${city} / ${state}` : city || state, zip].filter(Boolean).join(' - CEP: ');
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <Icon size={12} /> {title}
      </p>
      {line1 && <p className="text-sm text-foreground">{line1}</p>}
      {line2 && <p className="text-sm text-foreground">{line2}</p>}
      {line3 && <p className="text-sm text-muted-foreground">{line3}</p>}
    </div>
  );
}

export default function OrderDetailModal({ order, open, onClose }) {
  if (!order) return null;
  const st = statusConfig[order.status] || statusConfig.pending;
  const Icon = st.icon;
  const del = deliveryStatusConfig[order.delivery_status] || deliveryStatusConfig.pending;

  const hasShipping = order.shipping_street || order.shipping_city;
  const hasBilling = order.billing_street || order.billing_city;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <Package size={18} className="text-primary" /> Pedido — {order.product_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${st.cls} text-sm px-3 py-1 gap-1.5`}>
              <Icon size={12} /> {st.label}
            </Badge>
            {order.status === 'paid' && (
              <Badge className={`${del.cls} text-sm px-3 py-1`}>
                <Truck size={12} className="mr-1" /> {del.label}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(order.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Produto */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Produto</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nome</p>
                <p className="font-semibold text-foreground">{order.product_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tipo</p>
                <p className="font-semibold text-foreground">{order.product_type === 'external_link' ? 'Link Externo' : 'Venda Direta'}</p>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Valores</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Subtotal</p>
                <p className="font-bold text-foreground">R$ {((order.amount || 0) - (order.shipping_cost || 0)).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Frete</p>
                <p className="font-bold text-foreground">R$ {(order.shipping_cost || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="font-black text-primary text-base">R$ {order.amount?.toFixed(2)}</p>
              </div>
            </div>
            {order.commission_percent > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-muted-foreground">Comissão gerada: <span className="font-semibold text-green-600">{order.commission_percent}% · R$ {order.total_commission?.toFixed(2)}</span></p>
              </div>
            )}
          </div>

          {/* Envio */}
          {order.shipping_method_name && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Truck size={12} /> Envio
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="font-semibold text-foreground">{order.shipping_method_name}</p>
                </div>
                {order.tracking_code && (
                  <div>
                    <p className="text-muted-foreground text-xs">Rastreio</p>
                    <p className="font-mono font-bold text-blue-700">{order.tracking_code}</p>
                  </div>
                )}
              </div>
              {order.delivery_notes && (
                <p className="text-xs text-muted-foreground mt-2 bg-white rounded-lg p-2">{order.delivery_notes}</p>
              )}
            </div>
          )}

          {/* Endereços */}
          {hasShipping && (
            <AddressBlock
              title="Endereço de Entrega"
              icon={MapPin}
              street={order.shipping_street}
              number={order.shipping_number}
              complement={order.shipping_complement}
              neighborhood={order.shipping_neighborhood}
              city={order.shipping_city}
              state={order.shipping_state}
              zip={order.shipping_zip}
            />
          )}
          {hasBilling && (
            <AddressBlock
              title="Endereço de Faturamento"
              icon={CreditCard}
              street={order.billing_street}
              number={order.billing_number}
              complement={order.billing_complement}
              neighborhood={order.billing_neighborhood}
              city={order.billing_city}
              state={order.billing_state}
              zip={order.billing_zip}
            />
          )}

          {order.notes && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}