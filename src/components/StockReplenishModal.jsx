import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PackagePlus } from 'lucide-react';

export default function StockReplenishModal({ product, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    const add = parseInt(qty);
    if (!add || add <= 0) return;
    setSaving(true);
    const newStock = (product.stock || 0) + add;
    await base44.entities.Product.update(product.id, { stock: newStock });
    setSaving(false);
    onDone();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <PackagePlus size={18} /> Repor Estoque
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          <span className="font-semibold text-foreground">{product.name}</span>
          {product.code && <span className="ml-1 font-mono text-xs text-primary">#{product.code}</span>}
        </p>
        <div className="flex justify-between text-sm text-muted-foreground bg-secondary rounded-lg p-3">
          <span>Estoque atual: <strong className="text-foreground">{product.stock ?? 0}</strong></span>
          <span>Máximo: <strong className="text-foreground">{product.stock_max ?? '—'}</strong></span>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label>Quantidade a adicionar</Label>
            <Input
              className="mt-1.5"
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full font-bold text-white"
            style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
            {saving ? 'Salvando...' : 'Confirmar Reposição'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}