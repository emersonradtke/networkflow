import { ShoppingCart, X, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';

export default function CartDrawer({ cart, onUpdate, onClose, associate }) {
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const totalItems = cart.reduce((s, item) => s + item.qty, 0);

  const changeQty = (id, delta) => {
    onUpdate(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      ).filter(item => item.qty > 0);
      return updated;
    });
  };

  const remove = (id) => onUpdate(prev => prev.filter(item => item.id !== id));

  const checkout = async () => {
    setPlacing(true);
    const directItems = cart.filter(i => i.type === 'direct_sale');
    const externalItems = cart.filter(i => i.type === 'external_link');

    // Create orders for direct sale items
    await Promise.all(directItems.map(item =>
      base44.entities.Order.create({
        associate_id: associate.id,
        associate_name: associate.full_name,
        product_id: item.id,
        product_name: item.name,
        product_type: item.type,
        amount: item.price * item.qty,
        commission_percent: item.commission_percent,
        status: 'pending',
        notes: `Qtd: ${item.qty}`,
      })
    ));

    // Open external links
    externalItems.forEach(item => window.open(item.external_url, '_blank'));

    setDone(true);
    onUpdate([]);
    setPlacing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} style={{ color: '#1B2A5E' }} />
            <h2 className="font-black text-slate-800">Carrinho</h2>
            {totalItems > 0 && (
              <Badge className="text-white text-xs" style={{ background: '#3B9EE2' }}>{totalItems}</Badge>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {done ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,158,226,0.1)' }}>
                <ShoppingCart size={28} style={{ color: '#3B9EE2' }} />
              </div>
              <h3 className="font-black text-slate-800">Pedido Realizado!</h3>
              <p className="text-sm text-slate-500">Seus pedidos foram criados e aguardam confirmação de pagamento.</p>
              <Button onClick={onClose} className="mt-2 font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
                Fechar
              </Button>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <ShoppingCart size={40} className="text-slate-300" />
              <p className="text-slate-400">Seu carrinho está vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                    <ShoppingCart size={16} className="text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                  <p className="text-sm font-black" style={{ color: '#1B2A5E' }}>R$ {(item.price * item.qty).toFixed(2)}</p>
                  {item.type === 'external_link' ? (
                    <span className="text-xs text-blue-500">Link externo</span>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => changeQty(item.id, -1)}
                        className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <Minus size={11} />
                      </button>
                      <span className="text-sm font-bold text-slate-700 w-4 text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)}
                        className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <Plus size={11} />
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => remove(item.id)} className="text-slate-300 hover:text-red-400 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!done && cart.length > 0 && (
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-black" style={{ color: '#1B2A5E' }}>R$ {total.toFixed(2)}</span>
            </div>
            <Button
              className="w-full font-bold text-white"
              style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
              onClick={checkout}
              disabled={placing}
            >
              {placing ? 'Processando...' : 'Finalizar Pedido'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}