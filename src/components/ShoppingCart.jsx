import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Trash2, Plus, Minus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

export default function CartDrawer({ cart, onUpdate, onRemove, onCheckout, associate }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const totalQty = cart.reduce((s, item) => s + item.qty, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      for (const item of cart) {
        await base44.entities.Order.create({
          associate_id: associate.id,
          associate_name: associate.full_name,
          product_id: item.id,
          product_name: item.name,
          product_type: item.type,
          amount: item.price * item.qty,
          commission_percent: item.commission_percent,
          status: 'pending',
          notes: `Qtd: ${item.qty}`,
        });
        if (item.type === 'direct_sale') {
          await base44.entities.Product.update(item.id, {
            stock: Math.max(0, (item.stock || 0) - item.qty),
          });
        }
      }
      setSuccess(true);
      onCheckout();
    } catch (e) {
      setError('Erro ao finalizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    setConfirmOpen(false);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-xl bg-secondary hover:bg-border transition-colors"
      >
        <ShoppingCart size={20} className="text-foreground" />
        {totalQty > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
            {totalQty}
          </span>
        )}
      </button>

      {/* Drawer do Carrinho */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-sm bg-white flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-black flex items-center gap-2">
              <ShoppingCart size={18} /> Carrinho
              {totalQty > 0 && <Badge className="bg-primary text-white">{totalQty} {totalQty === 1 ? 'item' : 'itens'}</Badge>}
            </SheetTitle>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <ShoppingCart size={40} className="opacity-30" />
              <p className="text-sm">Seu carrinho está vazio.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 py-4">
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
                        <button
                          onClick={() => onUpdate(item.id, item.qty - 1)}
                          className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-border"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                        <button
                          onClick={() => onUpdate(item.id, item.qty + 1)}
                          disabled={item.qty >= (item.stock || 999)}
                          className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-border disabled:opacity-40"
                        >
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

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-black text-primary">R$ {total.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full font-bold text-white"
                  style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                  onClick={() => { setError(''); setConfirmOpen(true); }}
                >
                  Finalizar Pedido
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de Confirmação / Resultado */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!loading) { setConfirmOpen(v); if (!v) setSuccess(false); } }}>
        <DialogContent className="max-w-sm">
          {success ? (
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Pedido Realizado!</h3>
                <p className="text-sm text-muted-foreground mt-1">Seu pedido foi registrado com sucesso. Aguarde a confirmação do pagamento.</p>
              </div>
              <Button className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={handleCloseSuccess}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-black">Confirmar Pedido</DialogTitle>
                <DialogDescription>Revise os itens antes de finalizar.</DialogDescription>
              </DialogHeader>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.qty} × R$ {item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-black text-primary ml-2">R$ {(item.price * item.qty).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-black text-primary">R$ {total.toFixed(2)}</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>Cancelar</Button>
                <Button
                  className="font-bold text-white"
                  style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? 'Processando...' : 'Confirmar Pedido'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}