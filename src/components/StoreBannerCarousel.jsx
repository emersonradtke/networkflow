import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function StoreBannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
    try {
      await base44.functions.invoke('trackExternalLinkClick', {
        banner_id: banner.id,
        banner_name: banner.title,
        link_type: 'banner'
      });
    } catch (e) {
      console.error('Erro ao rastrear clique', e);
    }
    window.open(banner.link, '_blank');
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
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div
        onClick={() => handleClick(currentBanner)}
        className={`relative w-full h-48 md:h-56 rounded-xl overflow-hidden cursor-pointer transition ${animClass} ${speedClass}`}
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

        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center flex flex-col items-center">
            {currentBanner.logo_url && (
              <img
                src={currentBanner.logo_url}
                alt="Logo"
                className="h-12 md:h-16 mb-3 object-contain"
              />
            )}
            <h2 className="text-xl md:text-3xl font-bold mb-2">{currentBanner.title}</h2>
            {currentBanner.description && (
              <p className="text-sm md:text-base opacity-90">{currentBanner.description}</p>
            )}
          </div>
        </div>

        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-70 hover:opacity-100 transition"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-70 hover:opacity-100 transition"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          </>
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
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
  );
}