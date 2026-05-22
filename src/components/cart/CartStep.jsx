import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CartStep({ cart, total, onUpdate, onRemove, onContinue }) {
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-5">
        <ShoppingCart size={40} className="opacity-30" />
        <p className="text-sm">Seu carrinho está vazio.</p>
      </div>
    );
  }

  return (
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
        <Button className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </>
  );
}