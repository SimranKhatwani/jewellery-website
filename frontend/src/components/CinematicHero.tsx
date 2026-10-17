import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';

// Cinematic photography assets generated specifically for AURELLE
import connectionHandsImg from '../assets/images/cinematic_connection_hands.jpg';
import diamondMacroImg from '../assets/images/cinematic_scene_b_diamond.jpg';
import pendantMacroImg from '../assets/images/cinematic_scene_c_pendant.jpg';
import homepageHeroImg from '../assets/images/cinematic_scene_d_hero.jpg';

interface CinematicHeroProps {
  onExploreClick: (target: 'rings' | 'anklets' | 'bestsellers') => void;
}

interface SceneData {
  id: number;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  alt: string;
  duration: number; // in milliseconds
}

const SCENES: SceneData[] = [
  {
    id: 0,
    label: '01 Connection',
    badge: 'AURELLE CINEMA · ACT I',
    title: 'A Story of Connection',
    subtitle: 'Moments of intimacy and warmth, sealed in pure solid 925 sterling silver.',
    image: connectionHandsImg,
    alt: 'Cinematic photograph of two hands touching gently in warm golden light wearing solid silver jewellery',
    duration: 3400,
  },
  {
    id: 1,
    label: '02 The Gemstone',
    badge: 'AURELLE CRAFTSMANSHIP · ACT II',
    title: 'Brilliance Unbound',
    subtitle: 'A solitary round brilliant-cut stone tumbling through light, alive with prismatic dispersion.',
    image: diamondMacroImg,
    alt: 'Extreme macro photograph of an authentic brilliant-cut diamond floating in warm atmospheric light',
    duration: 3400,
  },
  {
    id: 2,
    label: '03 The Setting',
    badge: 'SIGNATURE INNOVATION · ACT III',
    title: 'The Dancing Stone',
    subtitle: 'Suspended freely between sapphire crystals, the stone glides with natural gravity in solid silver.',
    image: pendantMacroImg,
    alt: 'Macro photograph of AURELLE 925 sterling silver circular pendant with floating dancing diamond',
    duration: 3400,
  },
  {
    id: 3,
    label: '04 Collection',
    badge: 'AURELLE FINE SILVER JEWELLERY',
    title: 'A Little Extraordinary',
    subtitle: 'Hand-finished 925 sterling silver with freely dancing stones that capture light with every breath.',
    image: homepageHeroImg,
    alt: 'AURELLE moving diamond sterling silver pendant campaign hero with warm ivory linen texture',
    duration: 0, // Permanent hero scene
  },
];

export const CinematicHero: React.FC<CinematicHeroProps> = ({ onExploreClick }) => {
  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Initial scene: If reduced motion, start at permanent Scene D (index 3)
  const [currentScene, setCurrentScene] = useState<number>(prefersReducedMotion ? 3 : 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(!prefersReducedMotion);
  const [hasVisitedHero, setHasVisitedHero] = useState<boolean>(prefersReducedMotion);
  const [imageError, setImageError] = useState<boolean>(false);

  // Interactive mouse tracking for realistic specular highlights on Scene D
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Transition timer for cinematic progression (Scenes 0 -> 1 -> 2 -> 3)
  useEffect(() => {
    if (!isPlaying) return;
    if (currentScene >= 3) {
      // Reached Scene D (permanent hero)
      setHasVisitedHero(true);
      return;
    }

    const duration = SCENES[currentScene].duration;
    const timer = setTimeout(() => {
      setCurrentScene((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setHasVisitedHero(true);
        }
        return next;
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [currentScene, isPlaying]);

  // Jump directly to permanent homepage hero
  const skipToHero = useCallback(() => {
    setCurrentScene(3);
    setIsPlaying(false);
    setHasVisitedHero(true);
  }, []);

  // Replay cinematic narrative from Scene A
  const replayStory = useCallback(() => {
    setCurrentScene(0);
    setIsPlaying(true);
  }, []);

  // Jump to specific scene
  const goToScene = useCallback((index: number) => {
    setCurrentScene(index);
    if (index === 3) {
      setHasVisitedHero(true);
    }
  }, []);

  // Mouse move handler for interactive lighting and subtle diamond inertia
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const isPermanentHero = currentScene === 3;
  const scene = SCENES[currentScene];

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="AURELLE Cinematic Jewellery Experience"
      className="relative w-full overflow-hidden bg-[#F7F1E9] border-b border-[#D7C5AF]/40 transition-colors duration-700 min-h-[640px] lg:h-[calc(100vh-112px)] max-h-[860px] flex items-center"
    >
      {/* 1. Cinematic Background Layer: Cross-dissolving high-fidelity scenes */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {SCENES.map((s, index) => {
          const isActive = currentScene === index;
          return (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={s.image}
                alt={s.alt}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover object-center transition-transform duration-[6000ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                style={{
                  transform:
                    isPermanentHero && isActive
                      ? `scale(1.03) translate(${mousePos.x * -8}px, ${mousePos.y * -6}px)`
                      : undefined,
                }}
              />

              {/* Editorial cinematic scrims tailored to Terracotta Soft art direction */}
              {index < 3 ? (
                // Scenes A, B, C: Atmospheric vignette framing the storytelling
                <div className="absolute inset-0 bg-gradient-to-t from-[#593D30]/90 via-[#593D30]/40 to-transparent" />
              ) : (
                // Scene D (Permanent Hero): Clean editorial gradient providing perfect contrast for typography
                <>
                  {/* Left-side subtle gradient for desktop text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F7F1E9]/95 via-[#F7F1E9]/80 to-transparent lg:w-3/5" />
                  {/* Bottom scrim for mobile viewports */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#F7F1E9] via-[#F7F1E9]/70 to-transparent lg:hidden" />
                </>
              )}
            </div>
          );
        })}

        {/* Interactive Specular Shimmer on the moving stone (Scene D) */}
        {isPermanentHero && (
          <div
            className="absolute right-[22%] top-[45%] w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen opacity-40 transition-transform duration-150 ease-out hidden lg:block"
            style={{
              transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 18}px)`,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(215,197,175,0.4) 40%, transparent 70%)',
            }}
          />
        )}
      </div>

      {/* 2. Primary Foreground Content: Storytelling overlays & Permanent Hero UI */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16 flex flex-col justify-between h-full">
        {/* Top Bar inside Hero: Cinema Act Badge & Narrative Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF]/85 backdrop-blur-md border border-[#D7C5AF]/60 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#A85F49]" />
            <span className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-[#593D30] font-medium">
              {scene.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isPermanentHero ? (
              // Skip Intro Control during Scenes A - C
              <button
                type="button"
                onClick={skipToHero}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider text-[#FFFFFF] bg-[#593D30]/75 hover:bg-[#A85F49] backdrop-blur-md border border-[#FFFFFF]/30 transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Skip cinematic introduction and view homepage"
              >
                <span>Skip to Collection</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              // Replay Story Control during Scene D
              <button
                type="button"
                onClick={replayStory}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider text-[#593D30] hover:text-[#A85F49] bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] backdrop-blur-md border border-[#D7C5AF]/60 transition-all duration-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Replay cinematic jewelry story"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay Story</span>
              </button>
            )}

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="p-1.5 rounded-full text-[#593D30] bg-[#FFFFFF]/85 hover:bg-[#FFFFFF] border border-[#D7C5AF]/60 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause sequence' : 'Play sequence'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center / Lower Content: Dynamic depending on Scene */}
        <div className="my-auto max-w-2xl py-6">
          {!isPermanentHero ? (
            // Scenes A, B, C: Storytelling Typography
            <div className="space-y-4 animate-fade-in text-[#FFFFFF]">
              <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#D7C5AF] font-medium">
                Chapter {currentScene + 1} of 3
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display leading-tight tracking-tight drop-shadow-sm">
                {scene.title}
              </h1>
              <p className="text-sm md:text-base text-[#F7F1E9]/90 max-w-xl font-light leading-relaxed">
                {scene.subtitle}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => goToScene(currentScene + 1)}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FFFFFF] hover:text-[#D7C5AF] transition-colors cursor-pointer"
                >
                  <span>Continue narrative</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            // Scene D: The Permanent Editorial Homepage Hero
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-widest text-[#A85F49] font-semibold block">
                  Original Fine Silver Jewellery
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif-display text-[#593D30] leading-[1.08] tracking-tight">
                  A Little Extraordinary
                </h1>
                <p className="text-sm md:text-base text-[#8E8172] max-w-lg leading-relaxed pt-1">
                  Discover AURELLE&apos;s signature dancing stone collection—handcrafted in solid 925 sterling silver
                  with a brilliant-cut gemstone suspended freely between sapphire crystals to capture light with every breath.
                </p>
              </div>

              {/* Primary Call-to-Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onExploreClick('rings')}
                  className="px-7 py-3.5 rounded-full bg-[#A85F49] hover:bg-[#8F4E3A] text-[#FFFFFF] text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Explore Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onExploreClick('anklets')}
                  className="px-6 py-3.5 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#593D30] hover:text-[#A85F49] border border-[#D7C5AF] text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-xs cursor-pointer"
                >
                  <span>Discover Silver Anklets</span>
                </button>
              </div>

              {/* Craftsmanship Micro-Highlights */}
              <div className="pt-4 border-t border-[#D7C5AF]/40 flex flex-wrap items-center gap-6 text-[11px] font-mono text-[#8E8172]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A85F49]" />
                  <span>Solid 925 Sterling Silver</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A85F49]" />
                  <span>Freely Suspended Dancing Stone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A85F49]" />
                  <span>Curated Catalogue by RKB Enterprises</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar: Timeline scene step indicators */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#D7C5AF]/30">
          <div className="flex items-center gap-2 sm:gap-3">
            {SCENES.map((s, index) => {
              const isActive = currentScene === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToScene(index)}
                  className={`group flex items-center gap-2 text-left cursor-pointer transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                  }`}
                  title={`View ${s.label}`}
                >
                  <div
                    className={`h-1.5 transition-all duration-500 rounded-full ${
                      isActive
                        ? 'w-8 sm:w-12 bg-[#A85F49]'
                        : isPermanentHero
                        ? 'w-3 sm:w-4 bg-[#D7C5AF]'
                        : 'w-3 sm:w-4 bg-[#FFFFFF]/50'
                    }`}
                  />
                  <span
                    className={`text-[10px] sm:text-xs font-mono uppercase tracking-wider hidden md:inline-block ${
                      isActive
                        ? isPermanentHero
                          ? 'text-[#593D30] font-semibold'
                          : 'text-[#FFFFFF] font-semibold'
                        : isPermanentHero
                        ? 'text-[#8E8172]'
                        : 'text-[#F7F1E9]/70'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-[#8E8172]">
            {isPermanentHero ? 'Catalogue Ready · Scroll to Browse' : 'Cinematic Storytelling'}
          </div>
        </div>
      </div>
    </section>
  );
};
