import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ExternalLink, Tag, Percent, Search, Package, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import CartDrawer from '@/components/ShoppingCart';

export default function Store() {
  const { associate } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const prods = await base44.entities.Product.filter({ is_active: true });
    setProducts(prods);
    setLoading(false);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: Math.min(i.qty + 1, product.stock || 999) } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, qty) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const onCheckout = () => {
    setCart([]);
    loadProducts();
  };

  if (associate?.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <ShoppingCart size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Loja Bloqueada</h2>
        <p className="text-muted-foreground">Sua conta precisa estar ativa para acessar a loja.</p>
      </div>
    );
  }

  const categories = ['all', ...new Set(products.filter(p => p.category).map(p => p.category))];

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q);
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Loja Virtual</h1>
          <p className="text-muted-foreground text-sm mt-1">Compre produtos e gere comissões para sua rede</p>
        </div>
        <CartDrawer
          cart={cart}
          onUpdate={updateCartQty}
          onRemove={removeFromCart}
          onCheckout={onCheckout}
          associate={associate}
        />
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, código ou categoria..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Categorias */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="dark-card rounded-xl h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <ProductCard product={product} onAddToCart={addToCart} cart={cart} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart, cart }) {
  const cartItem = cart.find(i => i.id === product.id);
  const outOfStock = product.type === 'direct_sale' && (product.stock == null || product.stock <= 0);

  const handleExternalLink = () => window.open(product.external_url, '_blank');

  return (
    <div className="dark-card rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-all duration-200 group">
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={32} className="text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary/90 text-primary-foreground text-xs flex items-center gap-1">
            <Percent size={10} /> {product.commission_percent}%
          </Badge>
        </div>
        {product.type === 'external_link' && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500/80 text-white text-xs">Externo</Badge>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-red-600 px-2 py-1 rounded-full">Sem Estoque</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-foreground text-sm leading-tight">{product.name}</h3>
        {product.code && (
          <p className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-1">
            <Hash size={10} />#{product.code}
          </p>
        )}
        {(product.brand) && (
          <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
        )}
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{product.description}</p>
        )}
        {product.type === 'direct_sale' && product.stock != null && (
          <p className="text-xs text-muted-foreground mt-1">
            Estoque: <span className={product.stock <= (product.stock_min || 0) ? 'text-yellow-600 font-semibold' : 'text-foreground font-medium'}>{product.stock}</span>
          </p>
        )}
        <div className="mt-3">
          <p className="text-lg font-black text-primary">R$ {product.price?.toFixed(2)}</p>
          {product.type === 'external_link' ? (
            <Button size="sm" className="w-full mt-2 gold-gradient text-background font-bold gap-1.5" onClick={handleExternalLink}>
              <ExternalLink size={13} /> Ver Produto
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full mt-2 font-bold gap-1.5"
              style={cartItem ? { background: '#1B2A5E', color: '#fff' } : { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
              onClick={() => onAddToCart(product)}
              disabled={outOfStock}
            >
              <ShoppingCart size={13} />
              {cartItem ? `No carrinho (${cartItem.qty})` : 'Adicionar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}