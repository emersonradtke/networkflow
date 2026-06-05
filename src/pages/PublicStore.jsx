import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ExternalLink, Percent, Search, Package, Hash, ChevronLeft, ChevronRight, Share2, User, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import PublicCartDrawer from '@/components/public/PublicCartDrawer';

export default function PublicStore() {
  const { invite_code } = useParams();
  const [consultant, setConsultant] = useState(null);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [config, setConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => { loadData(); }, [invite_code]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners]);

  const loadData = async () => {
    const [associates, prods, bannersData, configs] = await Promise.all([
      base44.entities.Associate.filter({ invite_code, status: 'active' }),
      base44.entities.Product.filter({ is_active: true }),
      base44.entities.StoreBanner.filter({ is_active: true }, 'position', 10),
      base44.entities.NetworkConfig.list(),
    ]);

    if (associates.length === 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setConsultant(associates[0]);
    setProducts(prods);
    setBanners(bannersData);
    if (configs.length > 0) setConfig(configs[0]);
    setLoading(false);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: Math.min(i.qty + 1, product.stock || 999) } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, qty) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Loja de ${consultant?.full_name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Carregando loja...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Package size={48} className="text-muted-foreground mx-auto mb-4 opacity-40" />
        <h2 className="text-xl font-bold text-foreground mb-2">Consultor não encontrado</h2>
        <p className="text-muted-foreground">O link que você acessou é inválido ou o consultor está inativo.</p>
      </div>
    </div>
  );

  const appName = config?.app_name || 'Bold Life';
  const categories = ['all', ...new Set(products.filter(p => p.category).map(p => p.category))];
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q);
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header do Consultor */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'linear-gradient(135deg,#1B2A5E,#243a7a)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {consultant?.profile_image ? (
              <img src={consultant.profile_image} alt={consultant.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white/70 text-xs">Consultor(a)</p>
              <p className="text-white font-bold text-sm leading-tight truncate">{consultant?.full_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {copied ? <CheckCircle2 size={14} /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <PublicCartDrawer
              cart={cart}
              onUpdate={updateCartQty}
              onRemove={removeFromCart}
              consultant={consultant}
              onCheckoutDone={() => setCart([])}
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banners */}
        {banners.length > 0 && (
          <div
            className="relative w-full rounded-xl overflow-hidden cursor-pointer"
            style={{ backgroundColor: banners[bannerIndex]?.background_color || '#1B2A5E' }}
            onClick={async () => {
              const banner = banners[bannerIndex];
              if (!banner) return;
              // Registrar intenção de clique no banner
              await base44.entities.ExternalLinkClick.create({
                associate_id: consultant.id,
                banner_id: banner.id,
                banner_name: banner.title,
                link_type: 'banner',
                status: 'intent',
                clicked_at: new Date().toISOString(),
              });
              if (banner.link) window.open(banner.link, '_blank');
            }}
          >
            {banners[bannerIndex]?.image_url && (
              <img src={banners[bannerIndex].image_url} alt={banners[bannerIndex].title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            )}
            <div className="relative p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-white">{banners[bannerIndex]?.title}</h2>
              {banners[bannerIndex]?.description && (
                <p className="text-sm text-white/80 mt-1">{banners[bannerIndex].description}</p>
              )}
              {banners[bannerIndex]?.link && (
                <span className="inline-flex items-center gap-1 mt-3 text-xs text-white/70 bg-white/10 px-3 py-1 rounded-full">
                  <ExternalLink size={11} /> Ver oferta
                </span>
              )}
            </div>
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2" onClick={e => e.stopPropagation()}>
                {banners.map((_, idx) => (
                  <button key={idx} onClick={() => setBannerIndex(idx)} className={`w-2 h-2 rounded-full transition ${idx === bannerIndex ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar produtos..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Categorias */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${category === cat ? 'text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                style={category === cat ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Produtos */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {paginated.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                  <PublicProductCard product={product} onAddToCart={addToCart} cart={cart} consultant={consultant} />
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft size={15} />
                </Button>
                <span className="text-sm text-muted-foreground">Página {safePage} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <ChevronRight size={15} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Rodapé */}
        <div className="text-center py-6 border-t border-border">
          <p className="text-xs text-muted-foreground">Powered by <span className="font-bold text-primary">{appName}</span></p>
        </div>
      </div>
    </div>
  );
}

function PublicProductCard({ product, onAddToCart, cart, consultant }) {
  const cartItem = cart.find(i => i.id === product.id);
  const outOfStock = product.type === 'direct_sale' && (product.stock == null || product.stock <= 0);

  const handleExternalClick = async () => {
    // Registrar intenção de compra para o associado indicante
    await base44.entities.ExternalLinkClick.create({
      associate_id: consultant.id,
      product_id: product.id,
      product_name: product.name,
      link_type: 'product',
      status: 'intent',
      clicked_at: new Date().toISOString(),
    });
    if (product.external_url) window.open(product.external_url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow group">
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={28} className="text-muted-foreground opacity-40" />
          </div>
        )}
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
        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{product.name}</h3>
        {product.brand && <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>}
        <div className="mt-auto pt-2">
          <p className="text-lg font-black text-primary">R$ {product.price?.toFixed(2)}</p>
          {product.type === 'external_link' ? (
            <Button size="sm" className="w-full mt-2 gold-gradient text-background font-bold gap-1.5" onClick={handleExternalClick}>
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