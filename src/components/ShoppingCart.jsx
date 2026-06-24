import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AddressModal from './AddressModal';
import CartStep from './cart/CartStep';
import ShippingStep from './cart/ShippingStep';
import AddressStep from './cart/AddressStep';
import ConfirmStep from './cart/ConfirmStep';
import PaymentFrame from './PaymentFrame';

// Steps: 'cart' → 'shipping' → 'address' → 'confirm' → 'success'

export default function CartDrawer({ cart, onUpdate, onRemove, onCheckout, associate, onAssociateUpdate }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('cart'); // cart | shipping | address | confirm | payment | success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [noShipping, setNoShipping] = useState(true); // "Sem frete" selecionado por padrão
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [localAssociate, setLocalAssociate] = useState(associate);
  const [pickupType, setPickupType] = useState(null);
  const [franchises, setFranchises] = useState([]);
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentCartId, setPaymentCartId] = useState(null);

  useEffect(() => { setLocalAssociate(associate); }, [associate]);

  useEffect(() => {
    base44.entities.ShippingMethod.filter({ is_active: true }).then(setShippingMethods);
    base44.entities.Supplier.filter({ type: 'franchise', is_active: true }, 'name').then(setFranchises);
  }, []);

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const totalQty = cart.reduce((s, item) => s + item.qty, 0);
  const shippingCost = selectedShipping?.price || 0;

  const hasAddress = localAssociate?.shipping_street && localAssociate?.shipping_city;
  const isPickup = pickupType === 'store' || pickupType === 'franchise';
  const needsAddress = selectedShipping?.requires_address !== false;
  const canProceed = isPickup
    ? (pickupType === 'store' || (pickupType === 'franchise' && selectedFranchise))
    : needsAddress ? hasAddress : true;

  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const getFranchiseCoords = async (f) => {
    const addr = f.address_zip 
      ? `${f.address_zip}, Brasil`
      : [f.address_street, f.address_number, f.address_city, f.address_state, 'Brasil'].filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&countrycodes=br`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) {}
    return null;
  };

  const requestGeo = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        const enriched = await Promise.all(
          franchises.map(async (f) => {
            if (f._lat) return f;
            const c = await getFranchiseCoords(f);
            return c ? { ...f, _lat: c.lat, _lon: c.lon } : f;
          })
        );
        setFranchises(enriched);
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const sortedFranchises = userCoords
    ? [...franchises].sort((a, b) => {
        const da = (a._lat && a._lon) ? haversine(userCoords.lat, userCoords.lon, a._lat, a._lon) : Infinity;
        const db = (b._lat && b._lon) ? haversine(userCoords.lat, userCoords.lon, b._lat, b._lon) : Infinity;
        return da - db;
      })
    : franchises;

  const nearestFranchiseId = userCoords && sortedFranchises.length > 0 && sortedFranchises[0]._lat
    ? sortedFranchises[0].id
    : null;

  const handleAddressSaved = (updatedFields) => {
    const updated = { ...localAssociate, ...updatedFields };
    setLocalAssociate(updated);
    onAssociateUpdate?.(updated);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      if (!localAssociate) {
        setError('Dados do associado não carregados. Recarregue a página.');
        setLoading(false);
        return;
      }

      // Validar estoque disponível
      for (const item of cart) {
        if (item.type === 'direct_sale' && (item.stock || 0) < item.qty) {
          setError(`Estoque insuficiente para ${item.name}. Disponível: ${item.stock || 0}`);
          setLoading(false);
          return;
        }
      }

      const cartId = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await base44.functions.invoke('getNextOrderNumber', {});
      const orderNumber = res.data?.next_number || 1;

      const pickupStreet = pickupType === 'franchise' && selectedFranchise
        ? selectedFranchise.address_street || ''
        : pickupType === 'store' ? 'Retirada na Loja' : '';
      const pickupCity = pickupType === 'franchise' && selectedFranchise
        ? selectedFranchise.address_city || ''
        : '';
      const pickupState = pickupType === 'franchise' && selectedFranchise
        ? selectedFranchise.address_state || ''
        : '';

      const shippingData = {
        shipping_street: isPickup ? pickupStreet : (needsAddress ? (localAssociate.shipping_street || '') : ''),
        shipping_number: isPickup ? (pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_number || '' : '') : (needsAddress ? (localAssociate.shipping_number || '') : ''),
        shipping_complement: isPickup ? '' : (needsAddress ? (localAssociate.shipping_complement || '') : ''),
        shipping_neighborhood: isPickup ? (pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_neighborhood || '' : '') : (needsAddress ? (localAssociate.shipping_neighborhood || '') : ''),
        shipping_city: isPickup ? pickupCity : (needsAddress ? (localAssociate.shipping_city || '') : ''),
        shipping_state: isPickup ? pickupState : (needsAddress ? (localAssociate.shipping_state || '') : ''),
        shipping_zip: isPickup ? (pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_zip || '' : '') : (needsAddress ? (localAssociate.shipping_zip || '') : ''),
        billing_street: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_street : (localAssociate.billing_street || ''),
        billing_number: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_number : (localAssociate.billing_number || ''),
        billing_complement: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_complement : (localAssociate.billing_complement || ''),
        billing_neighborhood: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_neighborhood : (localAssociate.billing_neighborhood || ''),
        billing_city: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_city : (localAssociate.billing_city || ''),
        billing_state: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_state : (localAssociate.billing_state || ''),
        billing_zip: localAssociate.billing_same_as_shipping !== false ? localAssociate.shipping_zip : (localAssociate.billing_zip || ''),
        shipping_method_id: isPickup ? '' : (selectedShipping?.id || ''),
        shipping_method_name: isPickup
          ? (pickupType === 'store' ? 'Retirada na Loja' : `Retirada na Franquia: ${selectedFranchise?.trade_name || selectedFranchise?.name}`)
          : (selectedShipping?.name || ''),
        shipping_cost: isPickup ? 0 : shippingCost,
        notes: isPickup && pickupType === 'franchise' && selectedFranchise
          ? `Retirada: ${selectedFranchise.trade_name || selectedFranchise.name}`
          : undefined,
      };

      // Criar pedidos com status pending
      for (const item of cart) {
        const itemSubtotal = item.price * item.qty;
        const itemShipping = shippingCost / cart.length;
        await base44.entities.Order.create({
          order_number: orderNumber,
          cart_id: cartId,
          associate_id: localAssociate.id,
          associate_name: localAssociate.full_name,
          product_id: item.id,
          product_name: item.name,
          product_type: item.type,
          quantity: item.qty,
          unit_price: item.price,
          amount: itemSubtotal + itemShipping,
          commission_percent: item.commission_percent,
          status: 'pending',
          notes: `Qtd: ${item.qty}`,
          ...shippingData,
        });
      }

      // Reduzir estoque via service role
      const stockItems = cart.filter(i => i.type !== 'external_link').map(i => ({ id: i.id, stock: i.stock, qty: i.qty }));
      if (stockItems.length > 0) {
        await base44.functions.invoke('reduceProductStock', { items: stockItems });
      }

      // Calculate pontos after checkout
      await base44.functions.invoke('calculatePontosOnCheckout', {
        associate_id: localAssociate.id,
        total_amount: total
      });

      // Criar link de pagamento InfinitePay
      const grandTotal = isPickup ? total : total + shippingCost;

      const checkoutRes = await base44.functions.invoke('createInfinitePayCheckout', {
        order_nsu: `CART-${cartId}`,
        amount: grandTotal,
        description: cart.map(i => `${i.name} x${i.qty}`).join(', '),
        customer_name: localAssociate.full_name,
        customer_email: localAssociate.email,
        items: cart.map(item => ({
          description: item.name,
          price: Math.round(item.price * 100),
          quantity: item.qty,
        })),
      });

      const paymentUrl = checkoutRes.data?.checkout_url;
      if (paymentUrl) {
        onCheckout();
        setPaymentUrl(paymentUrl);
        setPaymentCartId(cartId);
        setStep('payment');
      } else {
        setError('Não foi possível gerar o link de pagamento.');
      }
    } catch (e) {
      setError('Erro ao finalizar pedido: ' + (e?.message || 'Tente novamente.'));
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

  const getStepTitle = () => {
    switch(step) {
      case 'cart': return 'Carrinho';
      case 'shipping': return 'Método de Envio';
      case 'address': return 'Endereço de Entrega';
      case 'confirm': return 'Confirmar Pedido';
      case 'payment': return 'Pagamento';
      case 'success': return 'Pedido Realizado!';
      default: return '';
    }
  };

  const getBackStep = () => {
    switch(step) {
      case 'shipping': return 'cart';
      case 'address': return 'shipping';
      case 'confirm': return 'address';
      case 'payment': return null;
      default: return null;
    }
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
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <SheetTitle className="font-black flex items-center gap-2">
              {getBackStep() && (
                <button onClick={() => setStep(getBackStep())} className="p-1 hover:bg-slate-100 rounded">
                  <ChevronLeft size={16} />
                </button>
              )}
              <ShoppingCart size={18} />
              {getStepTitle()}
            </SheetTitle>
            {step !== 'success' && step !== 'payment' && (
              <div className="flex gap-1 mt-2">
                {['cart', 'shipping', 'address', 'confirm'].map((s, i) => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all ${['cart','shipping','address','confirm'].indexOf(step) >= i ? 'bg-primary' : 'bg-slate-200'}`} />
                ))}
              </div>
            )}
          </SheetHeader>

          {step === 'cart' && (
            <CartStep
              cart={cart}
              total={total}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onContinue={() => setStep('shipping')}
            />
          )}

          {step === 'shipping' && (
            <ShippingStep
              pickupType={pickupType}
              setPickupType={setPickupType}
              selectedFranchise={selectedFranchise}
              setSelectedFranchise={setSelectedFranchise}
              franchises={franchises}
              sortedFranchises={sortedFranchises}
              geoLoading={geoLoading}
              requestGeo={requestGeo}
              userCoords={userCoords}
              haversine={haversine}
              nearestFranchiseId={nearestFranchiseId}
              shippingMethods={shippingMethods}
              selectedShipping={selectedShipping}
              setSelectedShipping={(m) => { setSelectedShipping(m); if (m) setNoShipping(false); else setNoShipping(true); }}
              noShipping={noShipping}
              setNoShipping={(v) => { setNoShipping(v); if (v) setSelectedShipping(null); }}
              shippingCost={shippingCost}
              total={total}
              canProceed={noShipping || selectedShipping !== null}
              onContinue={() => {
                const nextStep = noShipping ? 'address' : (selectedShipping?.requires_address === false ? 'confirm' : 'address');
                setStep(nextStep);
              }}
            />
          )}

          {step === 'address' && (
            <AddressStep
              selectedShipping={selectedShipping}
              localAssociate={localAssociate}
              hasAddress={hasAddress}
              setShowAddressModal={setShowAddressModal}
              total={total}
              shippingCost={shippingCost}
              canProceed={canProceed}
              onContinue={() => setStep('confirm')}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              cart={cart}
              isPickup={isPickup}
              pickupType={pickupType}
              selectedFranchise={selectedFranchise}
              selectedShipping={selectedShipping}
              shippingCost={shippingCost}
              total={total}
              shippingLine={shippingLine}
              error={error}
              loading={loading}
              onConfirm={handleConfirm}
            />
          )}

          {step === 'payment' && (
            <PaymentFrame
              paymentUrl={paymentUrl}
              cartId={paymentCartId}
              onPaymentConfirmed={() => setStep('success')}
            />
          )}

          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Pagamento Confirmado!</h3>
                <p className="text-sm text-muted-foreground mt-2">Seu pedido foi pago com sucesso. Você receberá em breve mais informações sobre o envio.</p>
              </div>
              <button className="w-full px-4 py-2 rounded-lg font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={handleClose}>
                Fechar
              </button>
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