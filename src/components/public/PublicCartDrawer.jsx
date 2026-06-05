import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ChevronLeft, CheckCircle2, Trash2, Plus, Minus, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PublicCartDrawer({ cart, onUpdate, onRemove, consultant, onCheckoutDone }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('cart'); // cart | info | success
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

      // Criar pedidos vinculados ao consultor
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

      // Criar link de pagamento
      const checkoutRes = await base44.functions.invoke('createInfinitePayCheckout', {
        order_nsu: `PUB-${cartId}`,
        items: cart.map(item => ({ description: item.name, price: item.price, quantity: item.qty })),
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone_number: customerInfo.phone || '',
        },
        redirect_url: window.location.href,
      });

      if (checkoutRes.data?.url) {
        window.location.href = checkoutRes.data.url;
      } else {
        // Se não houver URL de pagamento, apenas mostrar sucesso
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
      <button
        onClick={() => { setOpen(true); setStep('cart'); }}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
      >
        <ShoppingCart size={20} className="text-white" />
        {totalQty > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3B9EE2,#1B2A5E)' }}>
            {totalQty}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={() => { setOpen(false); setStep('cart'); }}>
        <SheetContent side="right" className="w-full max-w-sm bg-white flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <SheetTitle className="font-black flex items-center gap-2">
              {step === 'info' && (
                <button onClick={() => setStep('cart')} className="p-1 hover:bg-slate-100 rounded">
                  <ChevronLeft size={16} />
                </button>
              )}
              <ShoppingCart size={18} />
              {step === 'cart' ? 'Carrinho' : step === 'info' ? 'Seus dados' : 'Pedido Realizado!'}
            </SheetTitle>
          </SheetHeader>

          {step === 'cart' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart size={36} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-muted-foreground text-sm">Seu carrinho está vazio</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-secondary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-primary font-bold text-sm">R$ {item.price?.toFixed(2)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <button onClick={() => onUpdate(item.id, item.qty - 1)} className="w-6 h-6 rounded bg-secondary flex items-center justify-center hover:bg-border">
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={() => onUpdate(item.id, item.qty + 1)} className="w-6 h-6 rounded bg-secondary flex items-center justify-center hover:bg-border">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between font-black text-lg">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  <Button className="w-full font-bold" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
                    onClick={() => setStep('info')}>
                    Continuar
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'info' && (
            <div className="flex-1 flex flex-col p-5 gap-4">
              <p className="text-sm text-muted-foreground">Preencha seus dados para finalizar o pedido.</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome completo *</Label>
                  <Input value={customerInfo.name} onChange={e => setCustomerInfo(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">E-mail *</Label>
                  <Input type="email" value={customerInfo.email} onChange={e => setCustomerInfo(p => ({ ...p, email: e.target.value }))} placeholder="seu@email.com" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input value={customerInfo.phone} onChange={e => setCustomerInfo(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className="mt-1" />
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <div className="mt-auto space-y-2">
                <div className="flex justify-between font-black text-lg">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <Button className="w-full font-bold gap-2" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
                  onClick={handleCheckout} disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Processando...' : 'Finalizar Pedido'}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Pedido Realizado!</h3>
                <p className="text-sm text-muted-foreground mt-2">Obrigado pela compra! O consultor entrará em contato em breve.</p>
              </div>
              <Button className="w-full font-bold" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
                onClick={() => { setOpen(false); setStep('cart'); }}>
                Fechar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}