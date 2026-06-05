import { Truck, Store, Navigation, MapPin, Edit2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShippingStep({
  pickupType,
  setPickupType,
  selectedFranchise,
  setSelectedFranchise,
  franchises,
  sortedFranchises,
  geoLoading,
  requestGeo,
  userCoords,
  haversine,
  nearestFranchiseId,
  shippingMethods,
  selectedShipping,
  setSelectedShipping,
  noShipping,
  setNoShipping,
  shippingCost,
  total,
  canProceed,
  onContinue,
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* Método de Envio PRIMEIRO */}
        <div>
          <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Truck size={14} className="text-primary" /> Método de Envio
          </p>
          {shippingMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-slate-50 rounded-xl p-3">Nenhum método de envio disponível.</p>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => { setNoShipping(true); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${noShipping ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
              >
                <span className="text-sm text-foreground">Sem frete (incluso)</span>
                <span className="text-sm font-bold text-green-600">Grátis</span>
              </button>
              {shippingMethods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedShipping(m)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${!noShipping && selectedShipping?.id === m.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    {m.estimated_days && <p className="text-xs text-muted-foreground">{m.estimated_days} dias úteis</p>}
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0 ml-3">
                    {(m.price || 0) === 0 ? 'Grátis' : `R$ ${m.price.toFixed(2)}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Retirada ou Endereço — conforme método selecionado */}
        {selectedShipping?.requires_address === false ? (
          // Método NÃO requer endereço → mostrar retirada
          <div>
            <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Store size={14} className="text-primary" /> Retirada
            </p>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pickupType === 'store' ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                <input type="checkbox" checked={pickupType === 'store'} onChange={() => setPickupType(p => p === 'store' ? null : 'store')} className="w-4 h-4 accent-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Retirada na Loja</p>
                  <p className="text-xs text-muted-foreground">Retire diretamente no estabelecimento</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pickupType === 'franchise' ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                <input type="checkbox" checked={pickupType === 'franchise'} onChange={() => { setPickupType(p => p === 'franchise' ? null : 'franchise'); setSelectedFranchise(null); }} className="w-4 h-4 accent-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Retirada na Franquia</p>
                  <p className="text-xs text-muted-foreground">Escolha uma franquia para retirar</p>
                </div>
              </label>
            </div>

            {pickupType === 'franchise' && (
              <div className="mt-3 space-y-2">
                <button
                  onClick={requestGeo}
                  disabled={geoLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-all disabled:opacity-60"
                >
                  <Navigation size={13} />
                  {geoLoading ? 'Localizando...' : userCoords ? 'Atualizar localização' : 'Usar minha localização para ordenar por proximidade'}
                </button>

                {franchises.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-slate-50 rounded-xl p-3">Nenhuma franquia cadastrada.</p>
                ) : (
                  sortedFranchises.map(f => {
                    const addr = [f.address_street, f.address_number].filter(Boolean).join(', ');
                    const city = [f.address_city, f.address_state].filter(Boolean).join('/');
                    const dist = userCoords && f._lat && f._lon
                      ? haversine(userCoords.lat, userCoords.lon, f._lat, f._lon)
                      : null;
                    const isNearest = f.id === nearestFranchiseId;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFranchise(f)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${selectedFranchise?.id === f.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{f.trade_name || f.name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {isNearest && (
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Mais próxima</span>
                            )}
                            {dist !== null && (
                              <span className="text-[10px] text-muted-foreground font-medium">{dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}</span>
                            )}
                          </div>
                        </div>
                        {addr && <p className="text-xs text-muted-foreground mt-0.5">{addr}{city ? ` — ${city}` : ''}</p>}
                        {f.address_zip && <p className="text-xs text-muted-foreground">CEP {f.address_zip}</p>}
                        {f.phone && <p className="text-xs text-muted-foreground">{f.phone}</p>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : null}
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
          <span className="text-xl font-black text-primary">R$ {(selectedShipping?.requires_address === false ? total : total + shippingCost).toFixed(2)}</span>
        </div>
        <Button
          className="w-full font-bold text-white gap-1"
          style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
          onClick={onContinue}
          disabled={!canProceed}
        >
          Continuar <ChevronRight size={14} />
        </Button>
      </div>
    </>
  );
}