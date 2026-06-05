import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ExternalLink, Search, Package, ChevronLeft, ChevronRight, Share2, User, CheckCircle2, Star, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f1c3f 0%,#1B2A5E 50%,#243a7a 100%)' }}>
      <div className="text-center">
        <div className="mb-6">
          <BoldLifeLogo size="lg" />
        </div>
        <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-sm">Carregando loja...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f1c3f,#1B2A5E)' }}>
      <div className="text-center px-6">
        <BoldLifeLogo size="lg" className="mb-8" />
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
          <Package size={28} className="text-white/50" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Consultor não encontrado</h2>
        <p className="text-white/60 text-sm">O link que você acessou é inválido ou o consultor está inativo.</p>
      </div>
    </div>
  );

  const appName = config?.app_name || 'Bold Life';
  const appLogo = config?.app_logo;
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
    <div className="min-h-screen bg-slate-50">
      {/* Header Hero */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f1c3f 0%,#1B2A5E 60%,#1e3a8a 100%)' }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#3B9EE2,transparent)' }} />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#3B9EE2,transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px opacity-10" style={{ background: 'linear-gradient(90deg,transparent,#3B9EE2,transparent)' }} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between">
          {/* Logo */}
          <BoldLifeLogo logo={appLogo} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
            >
              {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Share2 size={14} />}
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

        {/* Consultant profile */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {consultant?.profile_image ? (
                <img src={consultant.profile_image} alt={consultant.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-xl" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-blue-600/30 border-2 border-white/20 flex items-center justify-center shadow-xl">
                  <User size={28} className="text-white/70" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white shadow-sm" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium tracking-wider uppercase">Consultora oficial</p>
              <h1 className="text-white font-black text-xl sm:text-2xl leading-tight">{consultant?.full_name}</h1>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />)}
                <span className="text-white/50 text-xs ml-1">Bold Life</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banners */}
      {banners.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 -mt-4 relative z-20">
          <div
            className="relative w-full rounded-2xl overflow-hidden cursor-pointer shadow-2xl"
            style={{
              minHeight: 160,
              backgroundColor: banners[bannerIndex]?.background_color || '#1B2A5E',
            }}
            onClick={async () => {
              const banner = banners[bannerIndex];
              if (!banner) return;
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
              <img src={banners[bannerIndex].image_url} alt={banners[bannerIndex].title}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(11,21,58,0.85) 0%,rgba(11,21,58,0.3) 100%)' }} />
            <div className="relative p-6 md:p-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-3xl font-black text-white leading-tight">{banners[bannerIndex]?.title}</h2>
                {banners[bannerIndex]?.description && (
                  <p className="text-sm text-white/80 mt-1 max-w-md">{banners[bannerIndex].description}</p>
                )}
                {banners[bannerIndex]?.link && (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors">
                    Ver oferta <ArrowRight size={12} />
                  </span>
                )}
              </div>
              <Zap size={48} className="text-white/20 flex-shrink-0 hidden md:block" />
            </div>
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" onClick={e => e.stopPropagation()}>
                {banners.map((_, idx) => (
                  <button key={idx} onClick={() => setBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === bannerIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Search + Categories */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-10 focus-visible:ring-blue-400"
              placeholder="Buscar produtos..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    category === cat
                      ? 'text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={category === cat ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 font-medium px-1">
              {filtered.length} produto{filtered.length !== 1 ? 's' : ''} disponíve{filtered.length !== 1 ? 'is' : 'l'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {paginated.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}>
                  <PublicProductCard product={product} onAddToCart={addToCart} cart={cart} consultant={consultant} />
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft size={15} />
                </Button>
                <span className="text-sm text-slate-500 font-medium">Página {safePage} de {totalPages}</span>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <ChevronRight size={15} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center pt-6 pb-2 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-400">Powered by</span>
            <BoldLifeLogo size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bold Life Logo Component ────────────────────────────────────────────────
function BoldLifeLogo({ logo, size = 'md', className = '' }) {
  const sizes = {
    sm: { img: 'h-5', text: 'text-sm', dot: 'w-1.5 h-1.5' },
    md: { img: 'h-8', text: 'text-lg', dot: 'w-2 h-2' },
    lg: { img: 'h-12', text: 'text-2xl', dot: 'w-2.5 h-2.5' },
  };
  const s = sizes[size] || sizes.md;

  if (logo) {
    return <img src={logo} alt="Bold Life" className={`${s.img} object-contain ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`${s.dot} rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-sm`} />
      <span className={`font-black text-white tracking-tight ${s.text}`}>
        Bold<span className="text-cyan-400">Life</span>
      </span>
    </div>
  );
}

// ─── Product Card ────────────────────────────────────────────────────────────
function PublicProductCard({ product, onAddToCart, cart, consultant }) {
  const cartItem = cart.find(i => i.id === product.id);
  const outOfStock = product.type === 'direct_sale' && (product.stock == null || product.stock <= 0);

  const handleExternalClick = async () => {
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
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ShoppingCart size={24} className="text-slate-300" />
            <span className="text-xs text-slate-300">Sem foto</span>
          </div>
        )}
        {product.type === 'external_link' && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
              Externo
            </span>
          </div>
        )}
        {cartItem && (
          <div className="absolute top-2 right-2">
            <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-md" style={{ background: '#1B2A5E' }}>
              {cartItem.qty}
            </span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">Sem estoque</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        {product.brand && <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider mb-0.5">{product.brand}</p>}
        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 flex-1">{product.name}</h3>
        <div className="mt-2 pt-2 border-t border-slate-50">
          <p className="text-base font-black text-slate-900">
            R$ {product.price?.toFixed(2).replace('.', ',')}
          </p>
          {product.type === 'external_link' ? (
            <button
              onClick={handleExternalClick}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
            >
              <ExternalLink size={12} /> Ver Produto
            </button>
          ) : (
            <button
              onClick={() => onAddToCart(product)}
              disabled={outOfStock}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: cartItem ? '#0f1c3f' : 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
            >
              <ShoppingCart size={12} />
              {cartItem ? `No carrinho (${cartItem.qty})` : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}