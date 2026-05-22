import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ExternalLink, Percent, Search, Package, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import CartDrawer from '@/components/ShoppingCart';

export default function Store() {
  const { associate, reloadUser } = useOutletContext();
  const [localAssociate, setLocalAssociate] = useState(null);

  useEffect(() => { setLocalAssociate(associate); }, [associate]);

  const handleAssociateUpdate = (updated) => {
    setLocalAssociate(updated);
  };
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [prods, configs] = await Promise.all([
      base44.entities.Product.filter({ is_active: true }),
      base44.entities.NetworkConfig.list(),
    ]);
    setProducts(prods);
    if (configs.length > 0 && configs[0].store_page_size) {
      setPageSize(configs[0].store_page_size);
    }
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
    loadData();
  };

  const currentAssociate = localAssociate || associate;

  if (currentAssociate?.status !== 'active') {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // reset page when filter/search changes
  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleCategory = (v) => { setCategory(v); setPage(1); };

  // grid cols based on pageSize
  const gridCols = pageSize <= 12
    ? 'grid-cols-2 lg:grid-cols-3'
    : pageSize <= 24
    ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : pageSize <= 48
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

  const cardCompact = pageSize >= 48;

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
          associate={currentAssociate}
          onAssociateUpdate={handleAssociateUpdate}
        />
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, código ou categoria..." value={search} onChange={e => handleSearch(e.target.value)} />
      </div>

      {/* Categorias */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
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
        <div className={`grid ${gridCols} gap-4`}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="dark-card rounded-xl h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
        </div>
      ) : (
        <>
          {/* Info da paginação */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} de {filtered.length} produtos
            </span>
            {totalPages > 1 && (
              <span>Página {safePage} de {totalPages}</span>
            )}
          </div>

          <div className={`grid ${gridCols} gap-3`}>
            {paginated.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                <ProductCard product={product} onAddToCart={addToCart} cart={cart} compact={cardCompact} />
              </motion.div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft size={15} />
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 flex items-center text-muted-foreground text-sm">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                          safePage === n
                            ? 'text-white'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                        style={safePage === n ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
                      >
                        {n}
                      </button>
                    )
                  )}
              </div>

              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart, cart, compact }) {
  const cartItem = cart.find(i => i.id === product.id);
  const outOfStock = product.type === 'direct_sale' && (product.stock == null || product.stock <= 0);

  if (compact) {
    return (
      <div className="dark-card rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-all duration-200 group">
        <div className="relative aspect-square bg-secondary overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart size={20} className="text-muted-foreground opacity-40" />
            </div>
          )}
          <div className="absolute top-1 right-1">
            <Badge className="bg-primary/90 text-primary-foreground text-xs px-1 py-0">
              <Percent size={8} /> {product.commission_percent}%
            </Badge>
          </div>
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs font-bold bg-red-600 px-1.5 py-0.5 rounded-full">Sem Estoque</span>
            </div>
          )}
        </div>
        <div className="p-2 flex flex-col gap-1">
          <p className="font-bold text-foreground text-xs leading-tight line-clamp-2">{product.name}</p>
          <p className="text-sm font-black text-primary">R$ {product.price?.toFixed(2)}</p>
          {product.type === 'external_link' ? (
            <Button size="sm" className="w-full text-xs h-7 gold-gradient text-background font-bold gap-1" onClick={() => window.open(product.external_url, '_blank')}>
              <ExternalLink size={10} /> Ver
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs h-7 font-bold gap-1"
              style={cartItem ? { background: '#1B2A5E', color: '#fff' } : { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)', color: '#fff' }}
              onClick={() => onAddToCart(product)}
              disabled={outOfStock}
            >
              <ShoppingCart size={10} />
              {cartItem ? `(${cartItem.qty})` : 'Add'}
            </Button>
          )}
        </div>
      </div>
    );
  }

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
        {product.brand && (
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
            <Button size="sm" className="w-full mt-2 gold-gradient text-background font-bold gap-1.5" onClick={() => window.open(product.external_url, '_blank')}>
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