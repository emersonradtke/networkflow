import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const currentBanner = banners[currentIndex];
    const rotateSeconds = currentBanner?.auto_rotate_seconds || 5;
    
    if (rotateSeconds <= 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, rotateSeconds * 1000);

    return () => clearInterval(timer);
  }, [banners, currentIndex]);

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
    <div className="w-full mb-6">
      <div
        onClick={() => handleClick(currentBanner)}
        className={`relative w-full rounded-lg overflow-hidden cursor-pointer transition ${animClass} ${speedClass}`}
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

        <div className="relative flex items-center gap-4 p-6 md:p-8">
          {currentBanner.logo_url && (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              <img src={currentBanner.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold leading-tight">{currentBanner.title}</h2>
            {currentBanner.description && (
              <p className="text-sm md:text-base opacity-90 mt-2">{currentBanner.description}</p>
            )}
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition ${idx === currentIndex ? 'opacity-100' : 'opacity-50'}`}
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