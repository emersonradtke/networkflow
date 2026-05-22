import { Store, MapPin, Truck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmStep({
  cart,
  isPickup,
  pickupType,
  selectedFranchise,
  selectedShipping,
  shippingCost,
  total,
  shippingLine,
  error,
  loading,
  onConfirm,
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">Qtd: {item.qty} × R$ {item.price.toFixed(2)}</p>
            </div>
            <p className="font-black text-primary ml-2">R$ {(item.price * item.qty).toFixed(2)}</p>
          </div>
        ))}

        {isPickup ? (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Store size={11} /> Retirada
            </p>
            {pickupType === 'store' && <p className="text-sm text-foreground font-semibold">Retirada na Loja</p>}
            {pickupType === 'franchise' && selectedFranchise && (
              <>
                <p className="text-sm text-foreground font-semibold">{selectedFranchise.trade_name || selectedFranchise.name}</p>
                {selectedFranchise.address_street && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[selectedFranchise.address_street, selectedFranchise.address_number].filter(Boolean).join(', ')}
                    {selectedFranchise.address_city ? ` — ${selectedFranchise.address_city}/${selectedFranchise.address_state}` : ''}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MapPin size={11} /> Entregar em
            </p>
            <p className="text-sm text-foreground">{shippingLine()}</p>
          </div>
        )}

        {selectedShipping && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Truck size={11} /> Envio
            </p>
            <p className="text-sm text-foreground">{selectedShipping.name} — R$ {shippingCost.toFixed(2)}</p>
            {selectedShipping.estimated_days && <p className="text-xs text-muted-foreground">{selectedShipping.estimated_days} dias úteis</p>}
          </div>
        )}

        <div className="space-y-1 pt-1 border-t border-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          {selectedShipping && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span>R$ {shippingCost.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center font-bold text-base pt-1 border-t border-slate-200">
            <span>Total</span>
            <span className="text-primary">R$ {(isPickup ? total : total + shippingCost).toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-lg p-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </div>
      <div className="border-t border-border p-5">
        <Button className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={onConfirm} disabled={loading}>
          {loading ? 'Processando...' : 'Confirmar Pedido'}
        </Button>
      </div>
    </>
  );
}