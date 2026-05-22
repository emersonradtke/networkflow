import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Trash2, Plus, Minus, CheckCircle2, AlertCircle, MapPin, Truck, ChevronRight, ChevronLeft, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressModal from './AddressModal';

// Steps: 'cart' → 'address' → 'confirm' → 'success'

export default function CartDrawer({ cart, onUpdate, onRemove, onCheckout, associate, onAssociateUpdate }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('cart'); // cart | address | confirm | success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [localAssociate, setLocalAssociate] = useState(associate);

  useEffect(() => { setLocalAssociate(associate); }, [associate]);

  useEffect(() => {
    base44.entities.ShippingMethod.filter({ is_active: true }).then(setShippingMethods);
  }, []);

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const totalQty = cart.reduce((s, item) => s + item.qty, 0);
  const shippingCost = selectedShipping?.price || 0;
  const grandTotal = total + shippingCost;

  const hasAddress = localAssociate?.shipping_street && localAssociate?.shipping_city;

  const handleOpenCheckout = () => {
    setError('');
    setStep('address');
  };

  const handleAddressSaved = (updatedFields) => {
    const updated = { ...localAssociate, ...updatedFields };
    setLocalAssociate(updated);
    onAssociateUpdate?.(updated);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const shippingData = {
        shipping_street: localAssociate.shipping_street || '',
        shipping_number: localAssociate.shipping_number || '',
        shipping_complement: localAssociate.shipping_complement || '',
        shipping_neighborhood: localAssociate.shipping_neighborhood || '',
        shipping_city: localAssociate.shipping_city || '',
        shipping_state: localAssociate.shipping_state || '',
        shipping_zip: localAssociate.shipping_zip || '',
        billing_street: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_street : (localAssociate.billing_street || ''),
        billing_number: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_number : (localAssociate.billing_number || ''),
        billing_complement: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_complement : (localAssociate.billing_complement || ''),
        billing_neighborhood: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_neighborhood : (localAssociate.billing_neighborhood || ''),
        billing_city: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_city : (localAssociate.billing_city || ''),
        billing_state: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_state : (localAssociate.billing_state || ''),
        billing_zip: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_zip : (localAssociate.billing_zip || ''),
        shipping_method_id: selectedShipping?.id || '',
        shipping_method_name: selectedShipping?.name || '',
        shipping_cost: shippingCost,
      };

      for (const item of cart) {
        await base44.entities.Order.create({
          associate_id: localAssociate.id,
          associate_name: localAssociate.full_name,
          product_id: item.id,
          product_name: item.name,
          product_type: item.type,
          amount: (item.price * item.qty) + shippingCost,
          commission_percent: item.commission_percent,
          status: 'pending',
          notes: `Qtd: ${item.qty}`,
          ...shippingData,
        });
        if (item.type === 'direct_sale') {
          await base44.entities.Product.update(item.id, { stock: Math.max(0, (item.stock || 0) - item.qty) });
        }
      }
      setStep('success');
      onCheckout();
    } catch (e) {
      setError('Erro ao finalizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('cart');
    setError('');
  };

  const shippingLine = () => {
    if (!localAssociate?.shipping_street) return 'Nenhum endereço cadastrado';
    return [localAssociate.shipping_street, localAssociate.shipping_number].filter(Boolean).join(', ')
      + (localAssociate.shipping_city ? ` — ${localAssociate.shipping_city}/${localAssociate.shipping_state}` : '');
  };

  return (
    <>
      <button onClick={() => { setOpen(true); setStep('cart'); }} className="relative p-2 rounded-xl bg-secondary hover:bg-border transition-colors">
        <ShoppingCart size={20} className="text-foreground" />
        {totalQty > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
            {totalQty}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full max-w-sm bg-white flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <SheetTitle className="font-black flex items-center gap-2">
              {step !== 'cart' && step !== 'success' && (
                <button onClick={() => setStep(step === 'confirm' ? 'address' : 'cart')} className="p-1 hover:bg-slate-100 rounded">
                  <ChevronLeft size={16} />
                </button>
              )}
              <ShoppingCart size={18} />
              {step === 'cart' && 'Carrinho'}
              {step === 'address' && 'Endereço & Envio'}
              {step === 'confirm' && 'Confirmar Pedido'}
              {step === 'success' && 'Pedido Realizado!'}
            </SheetTitle>
            {/* Progress */}
            {step !== 'success' && (
              <div className="flex gap-1 mt-2">
                {['cart', 'address', 'confirm'].map((s, i) => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all ${['cart','address','confirm'].indexOf(step) >= i ? 'bg-primary' : 'bg-slate-200'}`} />
                ))}
              </div>
            )}
          </SheetHeader>

          {/* STEP: Cart */}
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-5">
                  <ShoppingCart size={40} className="opacity-30" />
                  <p className="text-sm">Seu carrinho está vazio.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 p-5">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
                            <ShoppingCart size={20} className="text-muted-foreground opacity-40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
                          {item.code && <p className="text-xs text-muted-foreground font-mono">#{item.code}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">R$ {item.price.toFixed(2)} / un.</p>
                          <p className="text-sm font-black text-primary mt-0.5">R$ {(item.price * item.qty).toFixed(2)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => onUpdate(item.id, item.qty - 1)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-border">
                              <Minus size={11} />
                            </button>
                            <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                            <button onClick={() => onUpdate(item.id, item.qty + 1)} disabled={item.qty >= (item.stock || 999)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-border disabled:opacity-40">
                              <Plus size={11} />
                            </button>
                            <button onClick={() => onRemove(item.id)} className="ml-auto text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Subtotal</span>
                      <span className="text-xl font-black text-primary">R$ {total.toFixed(2)}</span>
                    </div>
                    <Button className="w-full font-bold text-white gap-1" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={handleOpenCheckout}>
                      Continuar <ChevronRight size={14} />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* STEP: Address & Shipping */}
          {step === 'address' && (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Endereço de entrega */}
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

                {/* Método de envio */}
                <div>
                  <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <Truck size={14} className="text-primary" /> Método de Envio
                  </p>
                  {shippingMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-slate-50 rounded-xl p-3">Nenhum método de envio disponível.</p>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedShipping(null)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${!selectedShipping ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                      >
                        <span className="text-sm text-foreground">Sem frete (retirada / incluso)</span>
                        <span className="text-sm font-bold text-green-600">Grátis</span>
                      </button>
                      {shippingMethods.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedShipping(m)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedShipping?.id === m.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
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
                  <span className="text-xl font-black text-primary">R$ {grandTotal.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full font-bold text-white gap-1"
                  style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                  onClick={() => setStep('confirm')}
                  disabled={!hasAddress}
                >
                  Revisar Pedido <ChevronRight size={14} />
                </Button>
              </div>
            </>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && (
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

                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MapPin size={11} /> Entregar em
                  </p>
                  <p className="text-sm text-foreground">{shippingLine()}</p>
                </div>

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
                    <span className="text-primary">R$ {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-lg p-3">
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
              </div>
              <div className="border-t border-border p-5">
                <Button className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Processando...' : 'Confirmar Pedido'}
                </Button>
              </div>
            </>
          )}

          {/* STEP: Success */}
          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Pedido Realizado!</h3>
                <p className="text-sm text-muted-foreground mt-2">Seu pedido foi registrado com sucesso. Aguarde a confirmação do pagamento e o envio.</p>
              </div>
              <Button className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={handleClose}>
                Fechar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AddressModal
        associate={localAssociate}
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSaved={handleAddressSaved}
      />
    </>
  );
}