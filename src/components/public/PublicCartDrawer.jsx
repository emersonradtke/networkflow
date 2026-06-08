import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ShoppingCart, ChevronLeft, ChevronRight, CheckCircle2, Trash2, Plus, Minus,
  Loader2, Package, Truck, Store, Navigation, MapPin, CreditCard, AlertCircle
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/8b3076bd8_BOLDLIFE01-LOGO1.png';

// Steps: cart → info → shipping → address → confirm → (redirect to InfinitePay)
export default function PublicCartDrawer({ cart, onUpdate, onRemove, consultant, onCheckoutDone }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('cart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Customer info
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });

  // Shipping
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [noShipping, setNoShipping] = useState(true);
  const [pickupType, setPickupType] = useState(null);
  const [franchises, setFranchises] = useState([]);
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Delivery address (public user fills manually)
  const [deliveryAddress, setDeliveryAddress] = useState({
    zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: ''
  });
  const [cepLoading, setCepLoading] = useState(false);

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const totalQty = cart.reduce((s, item) => s + item.qty, 0);
  const shippingCost = selectedShipping?.price || 0;
  const isPickup = pickupType === 'store' || pickupType === 'franchise';
  const needsAddress = !isPickup && selectedShipping?.requires_address !== false && !noShipping;
  const grandTotal = isPickup ? total : total + shippingCost;

  useEffect(() => {
    base44.entities.ShippingMethod.filter({ is_active: true }).then(setShippingMethods);
    base44.entities.Supplier.filter({ type: 'franchise', is_active: true }, 'name').then(setFranchises);
  }, []);

  // Geo helpers (same as ShoppingCart)
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
    } catch {}
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
    ? sortedFranchises[0].id : null;

  // CEP lookup
  const handleCepBlur = async () => {
    const cep = deliveryAddress.zip.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await base44.functions.invoke('searchCepAddress', { cep });
      const d = res.data;
      if (d && !d.error) {
        setDeliveryAddress(prev => ({
          ...prev,
          street: d.logradouro || prev.street,
          neighborhood: d.bairro || prev.neighborhood,
          city: d.localidade || prev.city,
          state: d.uf || prev.state,
        }));
      }
    } catch {}
    setCepLoading(false);
  };

  const hasDeliveryAddress = deliveryAddress.street && deliveryAddress.city && deliveryAddress.zip;

  // Step navigation
  const getNextStep = () => {
    if (step === 'cart') return 'info';
    if (step === 'info') return 'shipping';
    if (step === 'shipping') {
      if (isPickup || noShipping || selectedShipping?.requires_address === false) return 'confirm';
      return 'address';
    }
    if (step === 'address') return 'confirm';
    return null;
  };

  const getBackStep = () => {
    if (step === 'info') return 'cart';
    if (step === 'shipping') return 'info';
    if (step === 'address') return 'shipping';
    if (step === 'confirm') return needsAddress ? 'address' : 'shipping';
    return null;
  };

  const stepTitles = { cart: 'Carrinho', info: 'Seus dados', shipping: 'Entrega', address: 'Endereço', confirm: 'Confirmar Pedido' };
  const stepKeys = ['cart', 'info', 'shipping', 'address', 'confirm'];
  const stepsToShow = needsAddress ? stepKeys : stepKeys.filter(s => s !== 'address');

  const handleNextStep = () => {
    setError('');
    if (step === 'info') {
      if (!customerInfo.name || !customerInfo.email) {
        setError('Preencha seu nome e e-mail.');
        return;
      }
    }
    if (step === 'shipping') {
      if (!noShipping && !selectedShipping && !isPickup) {
        setError('Selecione um método de envio.');
        return;
      }
      if (pickupType === 'franchise' && !selectedFranchise) {
        setError('Selecione uma franquia para retirada.');
        return;
      }
    }
    if (step === 'address') {
      if (!hasDeliveryAddress) {
        setError('Preencha o endereço de entrega.');
        return;
      }
    }
    const next = getNextStep();
    if (next) setStep(next);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const pickupStreet = pickupType === 'franchise' && selectedFranchise
        ? selectedFranchise.address_street || ''
        : pickupType === 'store' ? 'Retirada na Loja' : '';

      const shippingData = isPickup ? {
        shipping_street: pickupStreet,
        shipping_number: pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_number || '' : '',
        shipping_city: pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_city || '' : '',
        shipping_state: pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_state || '' : '',
        shipping_zip: pickupType === 'franchise' && selectedFranchise ? selectedFranchise.address_zip || '' : '',
        shipping_method_name: pickupType === 'store' ? 'Retirada na Loja' : `Retirada: ${selectedFranchise?.trade_name || selectedFranchise?.name}`,
        shipping_cost: 0,
      } : {
        shipping_street: deliveryAddress.street,
        shipping_number: deliveryAddress.number,
        shipping_complement: deliveryAddress.complement,
        shipping_neighborhood: deliveryAddress.neighborhood,
        shipping_city: deliveryAddress.city,
        shipping_state: deliveryAddress.state,
        shipping_zip: deliveryAddress.zip,
        shipping_method_id: selectedShipping?.id || '',
        shipping_method_name: selectedShipping?.name || 'Sem frete',
        shipping_cost: shippingCost,
      };

      const orderRes = await base44.functions.invoke('createPublicOrder', {
        cart,
        consultant_id: consultant.id,
        consultant_name: consultant.full_name,
        customer_info: customerInfo,
        shipping_data: shippingData,
        shipping_cost: isPickup ? 0 : shippingCost,
      });

      const cartId = orderRes.data?.cart_id || `pub_${Date.now()}`;

      const checkoutItems = cart.map(item => ({
        description: item.name,
        price: item.price + (shippingCost / cart.length),
        quantity: item.qty,
      }));

      const checkoutRes = await base44.functions.invoke('createCheckout', {
        order_nsu: `PUB-${cartId}`,
        items: checkoutItems,
        customer: { name: customerInfo.name, email: customerInfo.email, phone_number: customerInfo.phone || '' },
        redirect_url: window.location.href,
      });

      if (checkoutRes.data?.url) {
        window.location.href = checkoutRes.data.url;
      } else {
        setStep('success');
        onCheckoutDone?.();
      }
    } catch (e) {
      setError('Erro ao finalizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => { setOpen(true); setStep('cart'); setError(''); };
  const handleClose = () => { setOpen(false); setStep('cart'); setError(''); };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-2 bg-[#1B2A5E] hover:bg-[#243a7a] text-white px-4 py-2.5 rounded-xl transition-all shadow-sm"
      >
        <ShoppingCart size={18} />
        <span className="hidden sm:inline text-sm font-semibold">Carrinho</span>
        {totalQty > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#3B9EE2] text-white text-xs font-bold flex items-center justify-center shadow">
            {totalQty}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full max-w-sm bg-white flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              {getBackStep() && step !== 'success' && (
                <button onClick={() => setStep(getBackStep())} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                  <ChevronLeft size={16} />
                </button>
              )}
              <SheetTitle className="font-black text-[#1B2A5E] flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#3B9EE2]" />
                {step === 'success' ? 'Pedido Confirmado!' : stepTitles[step]}
              </SheetTitle>
            </div>
            {step !== 'success' && (
              <div className="flex gap-1 mt-2">
                {stepsToShow.map((s, i) => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all ${stepsToShow.indexOf(step) >= i ? 'bg-[#3B9EE2]' : 'bg-slate-200'}`} />
                ))}
              </div>
            )}
          </SheetHeader>

          {/* CART STEP */}
          {step === 'cart' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart size={24} className="text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-600 mb-1">Seu carrinho está vazio</p>
                    <p className="text-slate-400 text-sm">Adicione produtos para continuar</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="flex gap-3 bg-slate-50 rounded-xl p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-[#1B2A5E] font-black text-sm mt-0.5">R$ {(item.price * item.qty).toFixed(2)}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <button onClick={() => onUpdate(item.id, item.qty - 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition">
                          <Minus size={11} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-slate-800">{item.qty}</span>
                        <button onClick={() => onUpdate(item.id, item.qty + 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:border-green-200 transition">
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-400 transition p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-5 pb-6 pt-4 border-t border-slate-100 bg-white space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Subtotal</span>
                    <span className="font-black text-xl text-[#1B2A5E]">R$ {total.toFixed(2)}</span>
                  </div>
                  <button onClick={() => setStep('info')} className="w-full bg-[#1B2A5E] hover:bg-[#243a7a] text-white font-bold py-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
                    Continuar <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* INFO STEP */}
          {step === 'info' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-sm text-[#1B2A5E] font-medium">Preencha seus dados para finalizar o pedido.</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Nome completo *</Label>
                  <Input value={customerInfo.name} onChange={e => setCustomerInfo(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome completo" className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">E-mail *</Label>
                  <Input type="email" value={customerInfo.email} onChange={e => setCustomerInfo(p => ({ ...p, email: e.target.value }))} placeholder="seu@email.com" className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Telefone / WhatsApp</Label>
                  <Input value={customerInfo.phone} onChange={e => setCustomerInfo(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className="mt-1 rounded-xl" />
                </div>
                {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1"><AlertCircle size={13} />{error}</p>}
              </div>
              <div className="border-t border-slate-100 p-5">
                <button onClick={handleNextStep} className="w-full bg-[#1B2A5E] hover:bg-[#243a7a] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Continuar <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* SHIPPING STEP */}
          {step === 'shipping' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Métodos de envio */}
                <div>
                  <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Truck size={14} className="text-[#3B9EE2]" /> Método de Envio
                  </p>
                  {shippingMethods.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">Nenhum método de envio disponível.</p>
                  ) : (
                    <div className="space-y-2">
                      <button onClick={() => { setNoShipping(true); setSelectedShipping(null); setPickupType(null); }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${noShipping ? 'border-[#3B9EE2] bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                        <span className="text-sm text-slate-800">Sem frete (incluso)</span>
                        <span className="text-sm font-bold text-green-600">Grátis</span>
                      </button>
                      {shippingMethods.map(m => (
                        <button key={m.id} onClick={() => { setSelectedShipping(m); setNoShipping(false); setPickupType(null); }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${!noShipping && selectedShipping?.id === m.id ? 'border-[#3B9EE2] bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                            {m.estimated_days && <p className="text-xs text-slate-500">{m.estimated_days} dias úteis</p>}
                          </div>
                          <span className="text-sm font-bold text-[#1B2A5E] shrink-0 ml-3">
                            {(m.price || 0) === 0 ? 'Grátis' : `R$ ${m.price.toFixed(2)}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Retirada */}
                {shippingMethods.some(m => m.requires_address === false) && (
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Store size={14} className="text-[#3B9EE2]" /> Retirada
                    </p>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pickupType === 'store' ? 'border-[#3B9EE2] bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                        <input type="radio" checked={pickupType === 'store'} onChange={() => { setPickupType('store'); setNoShipping(false); setSelectedShipping(null); }} className="w-4 h-4 accent-[#3B9EE2]" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Retirada na Loja</p>
                          <p className="text-xs text-slate-500">Retire diretamente no estabelecimento</p>
                        </div>
                      </label>
                      {franchises.length > 0 && (
                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pickupType === 'franchise' ? 'border-[#3B9EE2] bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                          <input type="radio" checked={pickupType === 'franchise'} onChange={() => { setPickupType('franchise'); setNoShipping(false); setSelectedShipping(null); setSelectedFranchise(null); }} className="w-4 h-4 accent-[#3B9EE2]" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Retirada na Franquia</p>
                            <p className="text-xs text-slate-500">Escolha uma franquia para retirar</p>
                          </div>
                        </label>
                      )}
                    </div>

                    {pickupType === 'franchise' && (
                      <div className="mt-3 space-y-2">
                        <button onClick={requestGeo} disabled={geoLoading}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[#3B9EE2]/40 bg-blue-50 text-[#3B9EE2] text-xs font-semibold hover:bg-blue-100 transition disabled:opacity-60">
                          <Navigation size={13} />
                          {geoLoading ? 'Localizando...' : userCoords ? 'Atualizar localização' : 'Ordenar por proximidade'}
                        </button>
                        {sortedFranchises.map(f => {
                          const addr = [f.address_street, f.address_number].filter(Boolean).join(', ');
                          const city = [f.address_city, f.address_state].filter(Boolean).join('/');
                          const dist = userCoords && f._lat && f._lon ? haversine(userCoords.lat, userCoords.lon, f._lat, f._lon) : null;
                          return (
                            <button key={f.id} onClick={() => setSelectedFranchise(f)}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${selectedFranchise?.id === f.id ? 'border-[#3B9EE2] bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800">{f.trade_name || f.name}</p>
                                {dist !== null && (
                                  <span className="text-[10px] text-slate-500 shrink-0">{dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}</span>
                                )}
                              </div>
                              {addr && <p className="text-xs text-slate-500 mt-0.5">{addr}{city ? ` — ${city}` : ''}</p>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1"><AlertCircle size={13} />{error}</p>}
              </div>
              <div className="border-t border-slate-100 p-5 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span><span className="font-semibold">R$ {total.toFixed(2)}</span>
                </div>
                {selectedShipping && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Frete ({selectedShipping.name})</span><span className="font-semibold">R$ {shippingCost.toFixed(2)}</span>
                  </div>
                )}
                <button onClick={handleNextStep} className="w-full bg-[#1B2A5E] hover:bg-[#243a7a] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Continuar <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ADDRESS STEP */}
          {step === 'address' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={14} className="text-[#3B9EE2]" /> Endereço de Entrega
                </p>
                <div>
                  <Label className="text-xs font-bold text-slate-700">CEP *</Label>
                  <div className="relative mt-1">
                    <Input
                      value={deliveryAddress.zip}
                      onChange={e => setDeliveryAddress(p => ({ ...p, zip: e.target.value }))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className="rounded-xl"
                      maxLength={9}
                    />
                    {cepLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Rua *</Label>
                    <Input value={deliveryAddress.street} onChange={e => setDeliveryAddress(p => ({ ...p, street: e.target.value }))} placeholder="Rua / Av." className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Número *</Label>
                    <Input value={deliveryAddress.number} onChange={e => setDeliveryAddress(p => ({ ...p, number: e.target.value }))} placeholder="Nº" className="mt-1 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Complemento</Label>
                  <Input value={deliveryAddress.complement} onChange={e => setDeliveryAddress(p => ({ ...p, complement: e.target.value }))} placeholder="Apto, sala..." className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Bairro</Label>
                  <Input value={deliveryAddress.neighborhood} onChange={e => setDeliveryAddress(p => ({ ...p, neighborhood: e.target.value }))} placeholder="Bairro" className="mt-1 rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Cidade *</Label>
                    <Input value={deliveryAddress.city} onChange={e => setDeliveryAddress(p => ({ ...p, city: e.target.value }))} placeholder="Cidade" className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-700">UF</Label>
                    <Input value={deliveryAddress.state} onChange={e => setDeliveryAddress(p => ({ ...p, state: e.target.value }))} placeholder="UF" maxLength={2} className="mt-1 rounded-xl" />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1"><AlertCircle size={13} />{error}</p>}
              </div>
              <div className="border-t border-slate-100 p-5">
                <button onClick={handleNextStep} className="w-full bg-[#1B2A5E] hover:bg-[#243a7a] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Revisar Pedido <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM STEP */}
          {step === 'confirm' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Items */}
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">Qtd: {item.qty} × R$ {item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-black text-[#1B2A5E] ml-2">R$ {(item.price * item.qty).toFixed(2)}</p>
                  </div>
                ))}

                {/* Cliente */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-slate-800">{customerInfo.name}</p>
                  <p className="text-xs text-slate-500">{customerInfo.email}{customerInfo.phone ? ` · ${customerInfo.phone}` : ''}</p>
                </div>

                {/* Entrega */}
                {isPickup ? (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Store size={11} /> Retirada</p>
                    {pickupType === 'store' && <p className="text-sm font-semibold text-slate-800">Retirada na Loja</p>}
                    {pickupType === 'franchise' && selectedFranchise && (
                      <>
                        <p className="text-sm font-semibold text-slate-800">{selectedFranchise.trade_name || selectedFranchise.name}</p>
                        {selectedFranchise.address_street && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[selectedFranchise.address_street, selectedFranchise.address_number].filter(Boolean).join(', ')}
                            {selectedFranchise.address_city ? ` — ${selectedFranchise.address_city}/${selectedFranchise.address_state}` : ''}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : needsAddress && hasDeliveryAddress ? (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin size={11} /> Entregar em</p>
                    <p className="text-sm font-semibold text-slate-800">{deliveryAddress.street}, {deliveryAddress.number}</p>
                    <p className="text-xs text-slate-500">{[deliveryAddress.neighborhood, deliveryAddress.city, deliveryAddress.state].filter(Boolean).join(' / ')}{deliveryAddress.zip ? ` — CEP ${deliveryAddress.zip}` : ''}</p>
                  </div>
                ) : null}

                {selectedShipping && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Truck size={11} /> Envio</p>
                    <p className="text-sm text-slate-800">{selectedShipping.name} — R$ {shippingCost.toFixed(2)}</p>
                    {selectedShipping.estimated_days && <p className="text-xs text-slate-500">{selectedShipping.estimated_days} dias úteis</p>}
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
                  {!isPickup && shippingCost > 0 && (
                    <div className="flex justify-between text-sm text-slate-600"><span>Frete</span><span>R$ {shippingCost.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between items-center font-bold text-base pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span className="text-[#1B2A5E]">R$ {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-lg p-3">
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 p-5 space-y-2">
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#1B2A5E] hover:bg-[#243a7a] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  {loading ? 'Processando...' : 'Ir para Pagamento'}
                </button>
                <p className="text-xs text-center text-slate-400">Você será redirecionado ao checkout seguro da InfinitePay</p>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1B2A5E]">Pedido Realizado!</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Obrigado pela sua compra! O consultor <strong>{consultant?.full_name}</strong> entrará em contato em breve.
                </p>
              </div>
              <img src={LOGO_URL} alt="Bold Life" className="h-8 opacity-60 mt-2" />
              <button onClick={handleClose} className="w-full bg-[#1B2A5E] text-white font-bold py-3 rounded-xl transition hover:bg-[#243a7a]">
                Fechar
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}