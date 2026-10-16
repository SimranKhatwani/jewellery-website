import React from 'react';

/**
 * Hand-Drawn Benefits Banner
 * Preserved architectural placement: immediately below the hero slideshow.
 * Rendered on Pure White (#FFFFFF) with fine, detailed monochrome pencil-sketch
 * illustrations, Muted Mocha / Warm Taupe subtitles, and dark charcoal captions.
 */
export const HandDrawnBenefitsBanner: React.FC = () => {
  return (
    <section 
      aria-label="Aurelle Craft and Service Principles" 
      className="w-full bg-[#F7F1E9] border-y border-[#D7C5AF]/40 py-12 md:py-16 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6 items-start">
          
          {/* 1. Delivery Parcel / Van */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-[#593D30]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 22 36 L 50 22 L 78 36 L 50 50 Z" />
                <path d="M 22 36 L 22 68 L 50 82 L 50 50 Z" />
                <path d="M 78 36 L 78 68 L 50 82" />
                <path d="M 36 29 L 64 43" strokeDasharray="1.5 1" />
                <path d="M 64 29 L 36 43" strokeDasharray="1.5 1" />
                <circle cx="50" cy="36" r="3.5" strokeWidth="1" />
                <path d="M 35 57 L 35 74" />
                <path d="M 65 57 L 65 74" />
                <path d="M 26 44 L 46 54" strokeWidth="0.75" opacity="0.6" />
                <path d="M 26 49 L 46 59" strokeWidth="0.75" opacity="0.6" />
                <path d="M 26 54 L 46 64" strokeWidth="0.75" opacity="0.6" />
                <path d="M 26 59 L 46 69" strokeWidth="0.75" opacity="0.6" />
                <path d="M 52 52 L 68 44 L 71 52 L 55 60 Z" strokeWidth="0.9" opacity="0.8" />
              </svg>
            </div>
            <p className="text-sm md:text-base font-medium text-[#593D30] tracking-tight">
              Shipping Made Simple
            </p>
            <span className="text-xs text-[#8E8172] mt-1 tracking-wide">
              Secure express dispatch
            </span>
          </div>

          {/* 2. Hand-drawn Silver Ring Sketch */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-[#593D30]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse cx="50" cy="46" rx="28" ry="14" />
                <ellipse cx="50" cy="52" rx="24" ry="11" />
                <path d="M 22 46 C 22 62, 34 76, 50 76 C 66 76, 78 62, 78 46" />
                <path d="M 26 51 C 26 64, 36 71, 50 71 C 64 71, 74 64, 74 51" />
                <path d="M 32 46 Q 50 38 68 46" strokeWidth="1.4" />
                <path d="M 27 54 C 28 62, 32 68, 38 71" strokeWidth="0.8" opacity="0.7" />
                <path d="M 31 56 C 32 63, 35 67, 40 70" strokeWidth="0.8" opacity="0.7" />
                <text x="47" y="66" fontSize="5" fontFamily="sans-serif" fill="#593D30" stroke="none" opacity="0.75" letterSpacing="0.5">925</text>
              </svg>
            </div>
            <p className="text-sm md:text-base font-medium text-[#593D30] tracking-tight">
              Silver, Beautifully Detailed
            </p>
            <span className="text-xs text-[#8E8172] mt-1 tracking-wide">
              Solid 925 hallmarks
            </span>
          </div>

          {/* 3. Jewellery-making Tools */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-[#593D30]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 20 28 L 38 20 L 41 27 L 23 35 Z" />
                <path d="M 32 29 L 74 71 L 70 75 L 28 33 Z" />
                <path d="M 72 26 L 62 16 L 24 74 L 29 79 Z" strokeWidth="1" />
                <path d="M 64 24 L 67 27" strokeWidth="0.8" opacity="0.6" />
                <path d="M 59 29 L 62 32" strokeWidth="0.8" opacity="0.6" />
                <path d="M 54 34 L 57 37" strokeWidth="0.8" opacity="0.6" />
                <path d="M 49 39 L 52 42" strokeWidth="0.8" opacity="0.6" />
                <path d="M 44 44 L 47 47" strokeWidth="0.8" opacity="0.6" />
                <circle cx="50" cy="50" r="13" strokeWidth="1.2" />
                <circle cx="50" cy="50" r="10" strokeWidth="0.8" strokeDasharray="2 1" opacity="0.7" />
                <path d="M 58 58 L 68 68" strokeWidth="1.8" />
              </svg>
            </div>
            <p className="text-sm md:text-base font-medium text-[#593D30] tracking-tight">
              Thoughtfully Crafted
            </p>
            <span className="text-xs text-[#8E8172] mt-1 tracking-wide">
              Artisanal hand finishing
            </span>
          </div>

          {/* 4. Jewellery Gift Box */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-[#593D30]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 26 44 L 50 32 L 74 44 L 50 56 Z" />
                <path d="M 26 44 L 26 72 L 50 84 L 50 56 Z" />
                <path d="M 74 44 L 74 72 L 50 84" />
                <path d="M 24 42 L 50 29 L 76 42 L 50 55 Z" strokeWidth="1.4" />
                <path d="M 24 42 L 24 51 L 50 63 L 76 51 L 76 42" />
                <path d="M 46 27 C 42 22, 38 23, 44 28 C 48 31, 50 32, 50 32" strokeWidth="1.1" />
                <path d="M 54 27 C 58 22, 62 23, 56 28 C 52 31, 50 32, 50 32" strokeWidth="1.1" />
                <path d="M 28 54 L 48 64" strokeWidth="0.75" opacity="0.6" />
                <path d="M 28 59 L 48 69" strokeWidth="0.75" opacity="0.6" />
                <path d="M 28 64 L 48 74" strokeWidth="0.75" opacity="0.6" />
              </svg>
            </div>
            <p className="text-sm md:text-base font-medium text-[#593D30] tracking-tight">
              Ready for Gifting
            </p>
            <span className="text-xs text-[#8E8172] mt-1 tracking-wide">
              Signature archival box
            </span>
          </div>

          {/* 5. Everyday Styling Illustration */}
          <div className="flex flex-col items-center text-center col-span-2 md:col-span-1 group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-[#593D30]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 38 20 C 38 42, 42 60, 48 72 C 54 84, 66 88, 76 88" strokeWidth="1.4" strokeDasharray="3 1" opacity="0.5" />
                <path d="M 40 48 Q 58 64 78 52" strokeWidth="1.6" />
                <path d="M 42 54 Q 59 70 76 59" strokeWidth="1.0" />
                <circle cx="48" cy="59" r="1.5" fill="#593D30" />
                <circle cx="56" cy="64" r="1.5" fill="#593D30" />
                <circle cx="65" cy="63" r="1.5" fill="#593D30" />
                <circle cx="72" cy="60" r="1.5" fill="#593D30" />
                <path d="M 59 64 C 58 67, 57 71, 59 73 C 61 73, 62 70, 60 64" fill="#593D30" />
                <path d="M 59 44 L 59 40" strokeWidth="1" />
                <path d="M 67 46 L 70 43" strokeWidth="1" />
              </svg>
            </div>
            <p className="text-sm md:text-base font-medium text-[#593D30] tracking-tight">
              Made for Everyday Styling
            </p>
            <span className="text-xs text-[#8E8172] mt-1 tracking-wide">
              Featherlight & durable
            </span>
          </div>

        </div>
      </div>
    </section>
  );
};
