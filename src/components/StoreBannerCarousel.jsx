import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PurchaseProofModal from '@/components/PurchaseProofModal';

const animationClasses = {
  none: '',
  fade: 'animate-pulse',
  slide: '',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce'
};

const speedClasses = {
  slow: 'duration-1000',
  normal: 'duration-500',
  fast: 'duration-300'
};

export default function StoreBannerCarousel({ associate }) {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedClickId, setSelectedClickId] = useState(null);
  const [selectedBannerName, setSelectedBannerName] = useState('');

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const data = await base44.entities.StoreBanner.filter({ is_active: true }, 'position', 100);
      setBanners(data);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (banner) => {
    // Abre o link imediatamente
    window.open(banner.link, '_blank');
    try {
      const res = await base44.functions.invoke('trackExternalLinkClick', {
        associate_id: associate?.id,
        banner_id: banner.id,
        banner_name: banner.title,
        link_type: 'banner'
      });
      if (res.data?.click_id) {
        setSelectedClickId(res.data.click_id);
        setSelectedBannerName(banner.title);
      }
    } catch (e) {
      console.error('Erro ao rastrear clique', e);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const animClass = animationClasses[currentBanner.animation] || '';
  const speedClass = speedClasses[currentBanner.animation_speed] || '';

  return (
    <>
    {selectedClickId && (
      <PurchaseProofModal
        clickId={selectedClickId}
        productName={selectedBannerName}
        onClose={() => setSelectedClickId(null)}
      />
    )}
    <div className="w-full max-w-2xl mb-6">
      <div
        onClick={() => handleClick(currentBanner)}
        className={`relative w-full rounded-xl overflow-hidden cursor-pointer transition ${animClass} ${speedClass}`}
        style={{
          backgroundColor: currentBanner.background_color,
          color: currentBanner.text_color
        }}
      >
        {currentBanner.image_url && (
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}

        <div className="relative flex items-center gap-4 p-4">
          {currentBanner.logo_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              <img src={currentBanner.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold leading-tight">{currentBanner.title}</h2>
            {currentBanner.description && (
              <p className="text-xs md:text-sm opacity-90 mt-1">{currentBanner.description}</p>
            )}
          </div>
        </div>

        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-70 hover:opacity-100 transition"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-70 hover:opacity-100 transition"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <ChevronRight size={16} className="text-white" />
            </button>
          </>
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-1.5 h-1.5 rounded-full transition ${idx === currentIndex ? 'opacity-100' : 'opacity-50'}`}
                style={{ backgroundColor: currentBanner.text_color }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}