import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ChevronLeft, CheckCircle2, Trash2, Plus, Minus, Loader2, Package } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/8b3076bd8_BOLDLIFE01-LOGO1.png';

export default function PublicCartDrawer({ cart, onUpdate, onRemove, consultant, onCheckoutDone }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('cart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const totalQty = cart.reduce((s, item) => s + item.qty, 0);

  const handleCheckout = async () => {
    if (!customerInfo.name || !customerInfo.email) {
      setError('Preencha seu nome e e-mail para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cartId = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await base44.functions.invoke('getNextOrderNumber', {});
      const orderNumber = res.data?.next_number || 1;

      for (const item of cart) {
        await base44.entities.Order.create({
          order_number: orderNumber,
          cart_id: cartId,
          associate_id: consultant.id,
          associate_name: consultant.full_name,
          product_id: item.id,
          product_name: item.name,
          product_type: item.type || 'direct_sale',
          quantity: item.qty,
          unit_price: item.price,
          amount: item.price * item.qty,
          commission_percent: item.commission_percent,
          status: 'pending',
          notes: `Venda pública via link do consultor. Cliente: ${customerInfo.name} (${customerInfo.email})${customerInfo.phone ? `, Tel: ${customerInfo.phone}` : ''}`,
        });
        if (item.type === 'direct_sale') {
          await base44.entities.Product.update(item.id, { stock: Math.max(0, (item.stock || 0) - item.qty) });
        }
      }

      const checkoutRes = await base44.functions.invoke('createInfinitePayCheckout', {
        order_nsu: `PUB-${cartId}`,
        items: cart.map(item => ({ description: item.name, price: item.price, quantity: item.qty })),
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

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => { setOpen(true); setStep('cart'); }}
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

      <Sheet open={open} onOpenChange={() => { setOpen(false); setStep('cart'); }}>
        <SheetContent side="right" className="w-full max-w-sm bg-white flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              {step === 'info' && (
                <button onClick={() => setStep('cart')} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                  <ChevronLeft size={16} />
                </button>
              )}
              <SheetTitle className="font-black text-[#1B2A5E] flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#3B9EE2]" />
                {step === 'cart' ? `Carrinho${totalQty > 0 ? ` (${totalQty})` : ''}` : step === 'info' ? 'Seus dados' : 'Pedido Confirmado!'}
              </SheetTitle>
            </div>
          </SheetHeader>

          {/* Cart step */}
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
                        <button onClick={() => onUpdate(item.id, item.qty - 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition">
                          <Minus size={11} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-slate-800">{item.qty}</span>
                        <button onClick={() => onUpdate(item.id, item.qty + 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:border-green-200 transition">
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
                    <span className="text-slate-600 font-medium">Total</span>
                    <span className="font-black text-xl text-[#1B2A5E]">R$ {total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-400 text-center">ou 10x de R$ {(total / 10).toFixed(2)} sem juros</p>
                  <button
                    onClick={() => setStep('info')}
                    className="w-full bg-[#1B2A5E] hover:bg-[#243a7a] text-white font-bold py-3 rounded-xl transition shadow-sm"
                  >
                    Continuar →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info step */}
          {step === 'info' && (
            <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-[#1B2A5E] font-medium">Preencha seus dados para finalizar o pedido via InfinitePay.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Nome completo *</Label>
                  <Input
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">E-mail *</Label>
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={e => setCustomerInfo(p => ({ ...p, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Telefone / WhatsApp</Label>
                  <Input
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-baseline font-black text-lg">
                  <span className="text-slate-700">Total</span>
                  <span className="text-[#1B2A5E]">R$ {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#1B2A5E] hover:bg-[#243a7a] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition shadow-sm"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Processando...' : 'Finalizar Pedido'}
                </button>
              </div>
            </div>
          )}

          {/* Success step */}
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
              <button
                onClick={() => { setOpen(false); setStep('cart'); }}
                className="w-full bg-[#1B2A5E] text-white font-bold py-3 rounded-xl transition hover:bg-[#243a7a]"
              >
                Fechar
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}