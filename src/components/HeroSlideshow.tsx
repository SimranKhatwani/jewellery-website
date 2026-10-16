import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  categoryTarget: 'rings' | 'anklets' | 'bestsellers';
  alt: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    image: '/src/assets/images/hero_silver_rings_editorial_hands_1792134608676.jpg',
    title: 'Silver, Styled Your Way',
    subtitle: 'Explore distinctive sculptural silver rings cast in solid 925 sterling silver.',
    categoryTarget: 'rings',
    alt: 'Editorial photograph of solid silver rings worn on fingers with natural lighting',
  },
  {
    id: 2,
    image: '/src/assets/images/hero_silver_anklet_lifestyle_ankle_1792134608726.jpg',
    title: 'Every Step, A Little More You',
    subtitle: 'Discover delicate silver chain anklets engineered for effortless everyday drape.',
    categoryTarget: 'anklets',
    alt: 'Lifestyle photograph of delicate silver anklet draped around ankle in warm daylight',
  },
  {
    id: 3,
    image: '/src/assets/images/hero_silver_ring_macro_detail_1792134609501.jpg',
    title: 'Details Worth Noticing',
    subtitle: 'Close-up product craftsmanship, ergonomic comfort shanks, and 925 hallmarks.',
    categoryTarget: 'rings',
    alt: 'Macro studio product photograph of sculpted silver ring on limestone pedestal',
  },
  {
    id: 4,
    image: '/src/assets/images/hero_silver_curation_composition_1792134609524.jpg',
    title: 'Everyday Silver. Effortless Elegance.',
    subtitle: 'Sculptural rings and delicate chain anklets designed for lasting presence.',
    categoryTarget: 'bestsellers',
    alt: 'Editorial still life composition of silver rings and chain anklets on stone pedestals',
  },
];

interface HeroSlideshowProps {
  onExploreClick: (target: 'rings' | 'anklets' | 'bestsellers') => void;
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({ onExploreClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Autoplay timer
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slide = SLIDES[currentSlide];

  return (
    <section
      aria-label="AURELLE Featured Jewellery Campaign"
      className="relative w-full overflow-hidden bg-[#6C6658] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Viewport */}
      <div className="relative w-full h-[60vh] min-h-[460px] max-h-[720px] sm:h-[70vh]">
        {SLIDES.map((s, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={s.image}
                alt={s.alt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              {/* Subtle scrim to guarantee high contrast text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#6C6658]/85 via-[#6C6658]/30 to-[#6C6658]/20" />
            </div>
          );
        })}

        {/* Slide Content Overlay */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-16 sm:pb-20">
          <div className="max-w-xl space-y-3.5 text-white">
            <span className="inline-block text-[11px] uppercase tracking-[0.28em] text-[#9A8E78] font-medium bg-[#FFFFFF]/90 px-2.5 py-0.5 rounded-xs">
              Aurelle Fine Silver · Solid 925
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-light tracking-tight text-[#FFFFFF] leading-[1.12]">
              {slide.title}
            </h1>
            <p className="text-sm sm:text-base text-[#FFFFFF]/90 font-light max-w-md leading-relaxed">
              {slide.subtitle}
            </p>
            <div className="pt-2">
              <button
                onClick={() => onExploreClick(slide.categoryTarget)}
                className="px-7 py-3 bg-[#93826E] text-[#FFFFFF] text-xs uppercase tracking-[0.2em] font-medium rounded-sm hover:bg-[#9A8E78] transition-colors shadow-sm"
              >
                Explore Collection
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-[#93826E]/60 text-white hover:bg-[#93826E] backdrop-blur-xs transition-colors"
          aria-label="Previous campaign slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-[#93826E]/60 text-white hover:bg-[#93826E] backdrop-blur-xs transition-colors"
          aria-label="Next campaign slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Pagination Dots & Pause/Play Indicator */}
        <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2 bg-[#93826E]/70 backdrop-blur-xs px-3 py-1.5 rounded-full">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}

          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className="ml-2 text-white/80 hover:text-white p-0.5"
            aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </section>
  );
};
