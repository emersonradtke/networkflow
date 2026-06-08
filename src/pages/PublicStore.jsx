import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  ShoppingCart, ExternalLink, Search, Package, ChevronLeft, ChevronRight,
  Share2, User, CheckCircle2, Star, Truck, ShieldCheck, CreditCard, Phone,
  Instagram, MessageCircle, ChevronDown, Zap, Users, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import PublicCartDrawer from '@/components/public/PublicCartDrawer';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/8b3076bd8_BOLDLIFE01-LOGO1.png';
const LOGO_BLUE_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/d5642ac24_BOLDLIFE02-LOGO.png';
const ICON_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/79a92f0c7_BOLDLIFE-ICON1.png';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef(null);

  useEffect(() => { loadData(); }, [invite_code]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const currentBanner = banners[bannerIndex];
    const rotateSeconds = currentBanner?.auto_rotate_seconds || 5;
    if (rotateSeconds <= 0) return;
    const timer = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), rotateSeconds * 1000);
    return () => clearInterval(timer);
  }, [banners, bannerIndex]);

  useEffect(() => {
    return () => setCart([]);
  }, []);

  const loadData = async () => {
    const [associates, prods, bannersData, configs] = await Promise.all([
      base44.entities.Associate.filter({ invite_code, status: 'active' }),
      base44.entities.Product.filter({ is_active: true }),
      base44.entities.StoreBanner.filter({ is_active: true }, 'position', 10),
      base44.entities.NetworkConfig.list(),
    ]);
    if (associates.length === 0) { setNotFound(true); setLoading(false); return; }
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

  const scrollToProducts = () => {
    if (!productsRef.current) return;
    const headerHeight = document.querySelector('header')?.offsetHeight || 0;
    const top = productsRef.current.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <img src={ICON_URL} alt="BoldLife" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
        <p className="text-slate-500 text-sm font-medium">Carregando loja...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center px-6">
        <img src={LOGO_URL} alt="BoldLife" className="h-10 mx-auto mb-8 opacity-60" />
        <Package size={48} className="text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Consultor não encontrado</h2>
        <p className="text-slate-500">O link que você acessou é inválido ou o consultor está inativo.</p>
      </div>
    </div>
  );

  const appName = config?.app_name || 'Bold Life';
  const specialOffers = products.filter(p => p.on_special_offer && p.visibility === 'public' && p.is_active);
  const categories = ['all', ...new Set(products.filter(p => p.category && p.visibility === 'public').map(p => p.category))];
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q);
    const matchCat = category === 'all' || p.category === category;
    const visibilityMatch = p.visibility === 'public' && p.is_active;
    return matchSearch && matchCat && visibilityMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      {/* ── TOP BAR ── */}
      <div className="bg-[#1B2A5E] text-white text-xs py-2 px-4 text-center">
        🚀 Você está na loja oficial da <strong>Bold Life</strong> — consultor(a) <strong>{consultant?.full_name}</strong>
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src={LOGO_URL} alt="Bold Life" className="h-8 object-contain" />
          </div>

          {/* Search bar (desktop) */}
          <div className="hidden md:flex flex-1 max-w-lg relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              placeholder="Buscar produtos, marcas, categorias..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Consultant badge */}
            <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
              {consultant?.profile_image ? (
                <img src={consultant.profile_image} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1B2A5E] flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
              )}
              <div className="leading-tight">
                <p className="text-[10px] text-slate-500">Consultor(a)</p>
                <p className="text-xs font-bold text-[#1B2A5E] max-w-[120px] truncate">{consultant?.full_name}</p>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-slate-600 hover:text-[#1B2A5E] text-xs px-3 py-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <PublicCartDrawer
              cart={cart}
              onUpdate={updateCartQty}
              onRemove={removeFromCart}
              consultant={consultant}
            />
          </div>
        </div>

        {/* Category nav */}
        {categories.length > 1 && (
          <div className="border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-0 flex gap-0 overflow-x-auto scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setPage(1); scrollToProducts(); }}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    category === cat
                      ? 'border-[#3B9EE2] text-[#1B2A5E] font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Todos os Produtos' : cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO BANNER ── */}
      {banners.length > 0 ? (
        <div className="w-full mb-0 mt-6">
          <div className="relative overflow-hidden" style={{ height: 320 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={bannerIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full cursor-pointer"
                style={{
                  backgroundColor: banners[bannerIndex]?.background_color || '#1B2A5E',
                  color: banners[bannerIndex]?.text_color || '#FFFFFF',
                }}
                onClick={async () => {
                  const banner = banners[bannerIndex];
                  if (!banner) return;
                  window.open(banner.link, '_blank');
                  try {
                    const res = await base44.functions.invoke('trackExternalLinkClick', {
                      associate_id: consultant.id,
                      banner_id: banner.id,
                      banner_name: banner.title,
                      link_type: 'banner',
                    });
                  } catch (e) {}
                }}
              >
                {banners[bannerIndex]?.image_url && (
                  <img
                    src={banners[bannerIndex].image_url}
                    alt={banners[bannerIndex].title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}

                <div className="relative flex items-center gap-6 p-8 md:p-12 h-full">
                  {banners[bannerIndex]?.logo_url && (
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden bg-white flex-shrink-0 shadow-xl">
                      <img src={banners[bannerIndex].logo_url} alt="Logo" className="w-full h-full object-contain p-3" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-4xl font-bold leading-tight">
                      {banners[bannerIndex].title}
                    </h2>
                    {banners[bannerIndex]?.description && (
                      <p className="text-base md:text-lg opacity-90 mt-3 max-w-2xl">
                        {banners[bannerIndex].description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {banners.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setBannerIndex(i => (i - 1 + banners.length) % banners.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition z-10"
                >
                  <ChevronLeft size={20} className="text-white" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setBannerIndex(i => (i + 1) % banners.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition z-10"
                >
                  <ChevronRight size={20} className="text-white" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={e => { e.stopPropagation(); setBannerIndex(idx); }}
                      className="w-2 h-2 rounded-full transition"
                      style={{
                        backgroundColor: banners[bannerIndex]?.text_color || '#FFFFFF',
                        opacity: idx === bannerIndex ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Hero padrão sem banner */
        <div className="bg-gradient-to-br from-[#1B2A5E] via-[#1e3a8a] to-[#3B9EE2] py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <img src={LOGO_BLUE_URL} alt="Bold Life" className="h-12 mx-auto mb-6 drop-shadow-xl object-contain" />
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">Ecossistema de Transformação</h1>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">Produtos premium que transformam hábitos em resultados extraordinários.</p>
            <button onClick={scrollToProducts} className="bg-[#3B9EE2] hover:bg-[#2d8fd5] text-white font-bold px-8 py-3 rounded-xl transition shadow-lg">
              Ver Produtos
            </button>
          </div>
        </div>
      )}

      {/* ── BENEFITS BAR ── */}
      <div className="mt-6 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Truck size={18} className="text-[#3B9EE2]" />, title: 'Entrega Rápida', sub: 'Em todo o Brasil' },
            { icon: <ShieldCheck size={18} className="text-[#3B9EE2]" />, title: 'Compra Segura', sub: 'Dados protegidos' },
            { icon: <CreditCard size={18} className="text-[#3B9EE2]" />, title: '10x sem juros', sub: 'Via PIX ou cartão' },
            { icon: <Award size={18} className="text-[#3B9EE2]" />, title: 'Produtos Premium', sub: 'Qualidade garantida' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">{b.icon}</div>
              <div>
                <p className="text-xs font-bold text-slate-800">{b.title}</p>
                <p className="text-xs text-slate-500">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── SPECIAL OFFERS SECTION ── */}
        {specialOffers.length > 0 && (
          <div className="space-y-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <h2 className="text-xl font-black text-red-600">Ofertas Especiais</h2>
            </div>
            <p className="text-sm text-slate-600">Produtos em promoção imperdível</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {specialOffers.slice(0, 10).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.25) }}
                >
                  <PublicProductCard product={product} onAddToCart={addToCart} cart={cart} consultant={consultant} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── MOBILE SEARCH ── */}
        <div className="md:hidden relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
            placeholder="Buscar produtos..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* ── PRODUCTS SECTION ── */}
        <div ref={productsRef}>
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-[#1B2A5E]">
                {category === 'all' ? 'Todos os Produtos' : category}
              </h2>
              <p className="text-sm text-slate-500">{filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="text-xs text-slate-500 hover:text-slate-800 underline">
                Limpar busca
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <Package size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhum produto encontrado</p>
              <p className="text-slate-400 text-sm mt-1">Tente buscar por outro termo</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {paginated.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  >
                    <PublicProductCard product={product} onAddToCart={addToCart} cart={cart} consultant={consultant} />
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-8">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="gap-1">
                    <ChevronLeft size={15} /> Anterior
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${p === safePage ? 'bg-[#1B2A5E] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="gap-1">
                    Próximo <ChevronRight size={15} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── ABOUT SECTION ── */}
        <div className="mt-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1B2A5E] to-[#2563EB] p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img src={LOGO_BLUE_URL} alt="Bold Life" className="h-9 mb-6 object-contain" />
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">
                Não são suas condições, e sim suas <span className="text-[#3B9EE2]">decisões</span> que determinam o seu destino.
              </h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                A Bold Life é um ecossistema de educação e consumo que transforma hábitos comuns em resultados extraordinários. Nascida no Vale do Aço, conecta você a +30 mil produtos e parcerias em todo o Brasil.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: <Zap size={16} />, label: '+30 mil produtos' },
                  { icon: <Users size={16} />, label: 'Rede 5 gerações' },
                  { icon: <Star size={16} />, label: 'Qualidade premium' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-[#3B9EE2]">{item.icon}</span>
                    <span className="text-white text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { n: '$200B', label: 'Mercado Global' },
                { n: '5×5', label: 'Sistema de Rede' },
                { n: '∞', label: 'Consumo Contínuo' },
              ].map((s, i) => (
                <div key={i} className="text-center bg-white/10 rounded-2xl p-4">
                  <p className="text-2xl font-black text-white">{s.n}</p>
                  <p className="text-blue-200 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="mt-12 bg-[#1B2A5E] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <img src="https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/faf4c533b_BOLDLIFE02-LOGO.png" alt="Bold Life" className="h-7 mb-3 object-contain" />
            <p className="text-blue-200 text-sm leading-relaxed">
              Ecossistema de transformação que conecta consumo inteligente a resultados extraordinários.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm tracking-wide uppercase">Seu Consultor(a)</h4>
            <div className="flex items-center gap-3 mb-3">
              {consultant?.profile_image ? (
                <img src={consultant.profile_image} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-blue-400" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#3B9EE2] flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
              )}
              <div>
                <p className="font-bold">{consultant?.full_name}</p>
                <p className="text-blue-300 text-xs">Consultor(a) Bold Life</p>
              </div>
            </div>
            {consultant?.phone && (
              <a href={`https://wa.me/${consultant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition mt-2">
                <MessageCircle size={15} /> Falar no WhatsApp
              </a>
            )}
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm tracking-wide uppercase">Segurança</h4>
            <div className="space-y-2 text-sm text-blue-200">
              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#3B9EE2]" /> Compra 100% segura</div>
              <div className="flex items-center gap-2"><CreditCard size={14} className="text-[#3B9EE2]" /> Pagamento via InfinitePay</div>
              <div className="flex items-center gap-2"><Truck size={14} className="text-[#3B9EE2]" /> Entrega em todo o Brasil</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-3 text-center text-xs text-blue-300">
          © {new Date().getFullYear()} Bold Life · Todos os direitos reservados · Powered by <span className="text-white font-bold">Bold Life</span>
        </div>
      </footer>
    </div>
  );
}

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
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <img src={ICON_URL} alt="" className="w-10 h-10 opacity-20" />
          </div>
        )}
        {product.type === 'external_link' && (
          <div className="absolute top-2 left-2">
            <span className="bg-[#3B9EE2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Externo</span>
          </div>
        )}
        {product.on_special_offer && (
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ Oferta</span>
          </div>
        )}
        {product.commission_associate > 0 && !product.on_special_offer && (
          <div className="absolute top-2 right-2">
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{product.commission_associate}</span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-slate-700 text-xs font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">Sem Estoque</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        {product.brand && <p className="text-[10px] text-[#3B9EE2] font-bold uppercase tracking-wide mb-0.5">{product.brand}</p>}
        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 flex-1">{product.name}</h3>

        <div className="mt-2 pt-2 border-t border-slate-50">
          <p className="text-lg font-black text-[#1B2A5E]">R$ {product.price?.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400 mb-2">ou 10x de R$ {(product.price / 10)?.toFixed(2)}</p>

          {product.type === 'external_link' ? (
            <button
              onClick={handleExternalClick}
              className="w-full flex items-center justify-center gap-1.5 bg-[#3B9EE2] hover:bg-[#2d8fd5] text-white text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              <ExternalLink size={12} /> Ver Produto
            </button>
          ) : (
            <button
              className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all ${
                cartItem
                  ? 'bg-[#1B2A5E] text-white'
                  : outOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#1B2A5E] hover:bg-[#243a7a] text-white'
              }`}
              onClick={() => !outOfStock && onAddToCart(product)}
              disabled={outOfStock}
            >
              <ShoppingCart size={12} />
              {cartItem ? `No carrinho (${cartItem.qty})` : outOfStock ? 'Indisponível' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}