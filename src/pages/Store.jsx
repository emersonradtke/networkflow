import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ExternalLink, Tag, Percent, Plus, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import CartDrawer from '@/components/CartDrawer';

export default function Store() {
  const { associate } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const prods = await base44.entities.Product.filter({ is_active: true });
    setProducts(prods);
    setLoading(false);
  };

  // Store locked if not active
  if (associate?.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5">
          <Lock size={32} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Loja Bloqueada</h2>
        <p className="text-slate-500 max-w-xs">Sua conta ainda está <span className="font-semibold text-yellow-600">pendente de ativação</span>. Após a confirmação do pagamento, você terá acesso completo à loja.</p>
      </div>
    );
  }

  const totalCartItems = cart.reduce((s, i) => s + i.qty, 0);
  const categories = ['all', ...new Set(products.filter(p => p.category).map(p => p.category))];
  const filtered = category === 'all' ? products : products.filter(p => p.category === category);

  const addToCart = (product) => {
    if (product.type === 'external_link') {
      // External products: open in new tab immediately or add as single item
      setCart(prev => {
        const exists = prev.find(i => i.id === product.id);
        if (exists) return prev;
        return [...prev, { ...product, qty: 1 }];
      });
      setCartOpen(true);
      return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Loja Virtual</h1>
          <p className="text-muted-foreground text-sm mt-1">Compre produtos e gere comissões para sua rede</p>
        </div>
        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white"
          style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
        >
          <ShoppingCart size={17} />
          <span className="text-sm">Carrinho</span>
          {totalCartItems > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full text-xs font-black flex items-center justify-center" style={{ color: '#1B2A5E' }}>
              {totalCartItems}
            </span>
          )}
        </button>
      </div>

      {/* Categories */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat ? 'text-white' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
              style={category === cat ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
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
          <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard
                product={product}
                inCart={!!cart.find(c => c.id === product.id)}
                onAdd={() => addToCart(product)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          onUpdate={setCart}
          onClose={() => setCartOpen(false)}
          associate={associate}
        />
      )}
    </div>
  );
}

function ProductCard({ product, inCart, onAdd }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden flex flex-col border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={32} className="text-slate-300" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="text-white text-xs flex items-center gap-1" style={{ background: '#1B2A5E' }}>
            <Percent size={10} /> {product.commission_percent}%
          </Badge>
        </div>
        {product.type === 'external_link' && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500 text-white text-xs">Externo</Badge>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-slate-800 text-sm leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 flex-1">{product.description}</p>
        )}
        <div className="mt-3">
          <p className="text-lg font-black" style={{ color: '#1B2A5E' }}>R$ {product.price?.toFixed(2)}</p>
          <p className="text-xs text-slate-400">{product.commission_percent}% de comissão</p>
          <Button
            size="sm"
            className="w-full mt-2 font-bold text-white gap-1.5"
            style={{ background: inCart ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
            onClick={onAdd}
          >
            {product.type === 'external_link' ? (
              <><ExternalLink size={13} /> Ver Produto</>
            ) : inCart ? (
              <><Check size={13} /> No Carrinho</>
            ) : (
              <><Plus size={13} /> Adicionar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}