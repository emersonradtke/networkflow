import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Search, Loader2, Package } from 'lucide-react';

// Modal para adicionar/remover itens de um pedido pendente (agrupado por cart_id)
export default function OrderEditModal({ cartId, orderNumber, open, onClose, onSaved }) {
  const [items, setItems] = useState([]);      // itens atuais do pedido
  const [products, setProducts] = useState([]); // catálogo de produtos
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && cartId) {
      loadData();
    }
  }, [open, cartId]);

  const loadData = async () => {
    setLoading(true);
    const [orderItems, prods] = await Promise.all([
      base44.entities.Order.filter({ cart_id: cartId }),
      base44.entities.Product.filter({ is_active: true }),
    ]);
    setItems(orderItems);
    setProducts(prods);
    setLoading(false);
  };

  const handleRemoveItem = async (orderId, item) => {
    setSaving(true);
    // Repõe estoque se necessário
    if (item.product_type === 'direct_sale') {
      const prods = await base44.entities.Product.filter({ id: item.product_id });
      if (prods.length > 0) {
        await base44.entities.Product.update(item.product_id, {
          stock: (prods[0].stock || 0) + (item.quantity || 1),
        });
      }
    }
    await base44.entities.Order.delete(orderId);
    await loadData();
    setSaving(false);
    onSaved?.();
  };

  const handleAddProduct = async (product) => {
    if (items.length === 0) return;
    const ref = items[0]; // usa dados do primeiro item como referência para shipping, etc.

    // Verifica estoque
    if (product.type === 'direct_sale' && (product.stock == null || product.stock <= 0)) return;

    setSaving(true);
    await base44.entities.Order.create({
      order_number: ref.order_number,
      cart_id: cartId,
      associate_id: ref.associate_id,
      associate_name: ref.associate_name,
      product_id: product.id,
      product_name: product.name,
      product_type: product.type,
      quantity: 1,
      unit_price: product.price,
      amount: product.price + (ref.shipping_cost || 0),
      commission_percent: product.commission_percent,
      status: 'pending',
      shipping_method_id: ref.shipping_method_id || '',
      shipping_method_name: ref.shipping_method_name || '',
      shipping_cost: ref.shipping_cost || 0,
      shipping_street: ref.shipping_street || '',
      shipping_number: ref.shipping_number || '',
      shipping_complement: ref.shipping_complement || '',
      shipping_neighborhood: ref.shipping_neighborhood || '',
      shipping_city: ref.shipping_city || '',
      shipping_state: ref.shipping_state || '',
      shipping_zip: ref.shipping_zip || '',
      billing_street: ref.billing_street || '',
      billing_number: ref.billing_number || '',
      billing_complement: ref.billing_complement || '',
      billing_neighborhood: ref.billing_neighborhood || '',
      billing_city: ref.billing_city || '',
      billing_state: ref.billing_state || '',
      billing_zip: ref.billing_zip || '',
      notes: `Qtd: 1`,
    });

    if (product.type === 'direct_sale') {
      await base44.entities.Product.update(product.id, { stock: Math.max(0, (product.stock || 0) - 1) });
    }

    await loadData();
    setSaving(false);
    onSaved?.();
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q);
  });

  const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Editar Pedido #{orderNumber}
            <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 ml-2">Pendente</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Itens atuais */}
            <div>
              <p className="text-sm font-bold text-foreground mb-2">Itens do Pedido</p>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum item no pedido.</p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {item.quantity || 1} · R$ {item.unit_price?.toFixed(2) || item.amount?.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-primary shrink-0">
                        R$ {((item.unit_price || item.amount) * (item.quantity || 1)).toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 shrink-0"
                        disabled={saving}
                        onClick={() => handleRemoveItem(item.id, item)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-black text-primary">R$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Adicionar produtos */}
            <div>
              <p className="text-sm font-bold text-foreground mb-2">Adicionar Produto</p>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredProducts.slice(0, 20).map(product => {
                  const outOfStock = product.type === 'direct_sale' && (product.stock == null || product.stock <= 0);
                  return (
                    <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-primary/30 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {product.price?.toFixed(2)}
                          {product.type === 'direct_sale' && ` · Estoque: ${product.stock ?? 0}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 gap-1 text-xs shrink-0"
                        style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
                        disabled={saving || outOfStock}
                        onClick={() => handleAddProduct(product)}
                      >
                        <Plus size={11} />
                        {outOfStock ? 'Sem estoque' : 'Adicionar'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}