import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';

// Real high-definition luxury jewellery campaign video clips
import modelPortraitVideoSrc from '../assets/videos/model_portrait_elegant.mp4';
import modelGraceVideoSrc from '../assets/videos/model_grace_smile.mp4';
import silverCraftVideoSrc from '../assets/videos/silver_bracelet_closeup.mp4';
import diamondSpinVideoSrc from '../assets/videos/diamond_macro_spin.mp4';
import diamondLightVideoSrc from '../assets/videos/diamond_ring_light.mp4';
import wristVideoSrc from '../assets/videos/bracelet_wrist.mp4';

// High-resolution fallback / poster image
import posterHeroImg from '../assets/images/cinematic_scene_d_hero.jpg';

interface CampaignHeroVideoProps {
  onExploreClick: (target: 'rings' | 'anklets' | 'bestsellers') => void;
}

interface CampaignScene {
  id: number;
  videoSrc: string;
  startTime: number;
  duration: number; // Duration in seconds before transitioning to next scene
}

const CAMPAIGN_SCENES: CampaignScene[] = [
  {
    id: 0,
    videoSrc: modelPortraitVideoSrc,
    startTime: 0.2,
    duration: 4.8,
  },
  {
    id: 1,
    videoSrc: modelGraceVideoSrc,
    startTime: 0.5,
    duration: 4.8,
  },
  {
    id: 2,
    videoSrc: silverCraftVideoSrc,
    startTime: 0.2,
    duration: 4.5,
  },
  {
    id: 3,
    videoSrc: diamondSpinVideoSrc,
    startTime: 0.2,
    duration: 4.6,
  },
  {
    id: 4,
    videoSrc: wristVideoSrc,
    startTime: 0.5,
    duration: 4.5,
  },
  {
    id: 5,
    videoSrc: diamondLightVideoSrc,
    startTime: 0.5,
    duration: 4.8,
  },
];

export const CampaignHeroVideo: React.FC<CampaignHeroVideoProps> = ({ onExploreClick }) => {
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');

  // Video element references for seamless zero-gap double buffering
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const currentScene = CAMPAIGN_SCENES[currentSceneIdx];

  // Transition to next scene in the circular campaign loop
  const goToNextScene = useCallback(() => {
    setCurrentSceneIdx((prev) => (prev + 1) % CAMPAIGN_SCENES.length);
  }, []);

  // Sync double-buffered video playback
  useEffect(() => {
    if (prefersReducedMotion || hasVideoError) return;

    const nextBuffer = activeBuffer === 'A' ? 'B' : 'A';
    const activeVideo = activeBuffer === 'A' ? videoRefA.current : videoRefB.current;
    const standbyVideo = nextBuffer === 'B' ? videoRefB.current : videoRefA.current;

    if (activeVideo) {
      activeVideo.currentTime = currentScene.startTime;
      activeVideo.play().catch(() => {
        // Autoplay policy fallback
      });
    }

    // Preload next scene in standby buffer
    const nextScene = CAMPAIGN_SCENES[(currentSceneIdx + 1) % CAMPAIGN_SCENES.length];
    if (standbyVideo) {
      if (standbyVideo.src !== nextScene.videoSrc) {
        standbyVideo.src = nextScene.videoSrc;
      }
      standbyVideo.currentTime = nextScene.startTime;
    }

    // Schedule next cut
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveBuffer(nextBuffer);
      goToNextScene();
    }, currentScene.duration * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSceneIdx, prefersReducedMotion, hasVideoError, goToNextScene, activeBuffer, currentScene]);

  return (
    <section
      aria-label="AURELLE Luxury Jewellery Campaign Video"
      className="relative w-full overflow-hidden bg-[#593D30] text-[#FFFFFF] min-h-[640px] lg:h-[calc(100vh-112px)] max-h-[860px] flex items-end justify-center border-b border-[#D7C5AF]/30"
    >
      {/* 1. Double-Buffered Campaign Video Player (Zero black frames, zero stutter) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Poster Fallback Image */}
        <img
          src={posterHeroImg}
          alt="AURELLE Moving Diamond Fine Silver Jewellery Campaign"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {!prefersReducedMotion && !hasVideoError && (
          <>
            {/* Video Buffer A */}
            <video
              ref={videoRefA}
              src={CAMPAIGN_SCENES[0].videoSrc}
              muted
              playsInline
              loop={false}
              preload="auto"
              onError={() => setHasVideoError(true)}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                activeBuffer === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            />

            {/* Video Buffer B */}
            <video
              ref={videoRefB}
              src={CAMPAIGN_SCENES[1].videoSrc}
              muted
              playsInline
              loop={false}
              preload="auto"
              onError={() => setHasVideoError(true)}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                activeBuffer === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            />
          </>
        )}

        {/* Sophisticated Editorial Scrims in Existing Terracotta Soft Palette */}
        {/* Bottom-to-top gradient framing bottom-center typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#593D30]/95 via-[#593D30]/55 to-transparent z-15" />
        {/* Subtle overall cinematic radial vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#593D30]/15 to-[#593D30]/65 z-15 pointer-events-none" />
      </div>

      {/* 2. Simplified Minimal Luxury Overlay: Bottom & Center Aligned */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-6 md:px-12 pb-14 md:pb-18 pt-12 flex flex-col justify-end items-center text-center">
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2.5">
            <span className="text-xs font-mono uppercase tracking-[0.28em] text-[#D7C5AF] font-semibold block">
              AURELLE FINE SILVER
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif-display text-[#FFFFFF] leading-[1.08] tracking-tight drop-shadow-md">
              A Little Extraordinary
            </h1>
          </div>

          {/* Single Primary Call-to-Action Centered */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => onExploreClick('rings')}
              className="px-8 py-3.5 rounded-full bg-[#A85F49] hover:bg-[#8F4E3A] text-[#FFFFFF] text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
