import { MapPin, Edit2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddressStep({
  selectedShipping,
  localAssociate,
  hasAddress,
  setShowAddressModal,
  total,
  shippingCost,
  canProceed,
  onContinue,
}) {
  // Se o método NÃO requer endereço, não mostrar este passo
  if (selectedShipping?.requires_address === false) {
    return null;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Endereço de Entrega
          </p>
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-start gap-3">
            <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {hasAddress ? (
                <>
                  <p className="text-sm font-medium text-foreground">{[localAssociate.shipping_street, localAssociate.shipping_number].filter(Boolean).join(', ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {[localAssociate.shipping_neighborhood, localAssociate.shipping_city, localAssociate.shipping_state].filter(Boolean).join(' / ')}
                    {localAssociate.shipping_zip && ` — CEP ${localAssociate.shipping_zip}`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
              )}
            </div>
            <button onClick={() => setShowAddressModal(true)} className="text-primary hover:text-primary/80 shrink-0">
              <Edit2 size={14} />
            </button>
          </div>
          {!hasAddress && (
            <Button size="sm" variant="outline" className="w-full mt-2 gap-1" onClick={() => setShowAddressModal(true)}>
              <MapPin size={13} /> Adicionar Endereço
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">R$ {total.toFixed(2)}</span>
        </div>
        {selectedShipping && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frete ({selectedShipping.name})</span>
            <span className="font-semibold">R$ {shippingCost.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-slate-100 pt-2">
          <span className="font-bold text-foreground">Total</span>
          <span className="text-xl font-black text-primary">R$ {(total + shippingCost).toFixed(2)}</span>
        </div>
        <Button
          className="w-full font-bold text-white gap-1"
          style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
          onClick={onContinue}
          disabled={!canProceed}
        >
          Revisar Pedido <ChevronRight size={14} />
        </Button>
      </div>
    </>
  );
}