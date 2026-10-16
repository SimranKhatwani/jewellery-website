import React from 'react';
import { ShieldCheck, Compass, Sparkles } from 'lucide-react';

export const BrandStorySection: React.FC = () => {
  return (
    <section id="brand-story" aria-label="Aurelle Brand Philosophy" className="py-24 md:py-32 bg-[#FFFFFF] px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Editorial Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Image Collage & Material Focus */}
          <div className="lg:col-span-5 relative">
            <div className="aspect-4/5 bg-[#F7F1E9] rounded-xs overflow-hidden shadow-xs border border-[#D7C5AF]/40">
              <img
                src="/src/assets/images/campaign_silver_rings_editorial_1792133668744.jpg"
                alt="Aurelle sterling silver metallurgical craft"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Overlapping Detail Frame: Burnt Terracotta #A85F49 */}
            <div className="hidden sm:block absolute -bottom-8 -right-8 w-48 h-48 bg-[#A85F49] p-2 rounded-xs shadow-lg border border-[#FFFFFF]">
              <img
                src="/src/assets/images/product_silver_anklet_macro_1792133670380.jpg"
                alt="Silver 925 hallmark macro detail"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Column: Editorial Narrative & Principles */}
          <div className="lg:col-span-7 space-y-8 lg:pl-6">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-3">
                The Silver Philosophy
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-light text-[#593D30] tracking-tight leading-[1.15] text-balance">
                Sculptural Form, Understated Permanence.
              </h2>
            </div>

            <p className="text-base md:text-lg text-[#593D30]/90 font-light leading-relaxed">
              At AURELLE, silver is not treated as a secondary metal, but as a medium of pure sculptural expression. We design exclusively with solid 925 sterling silver—embracing its natural weight, luminous cool reflectivity, and evolving character.
            </p>

            <p className="text-sm md:text-base text-[#8E8172] font-light leading-relaxed">
              Every ring is shaped with ergonomic contours that adapt comfortably to the finger, while each anklet chain is balanced for featherlight, snag-free movement. By blending hand-finishing with modern geometric restraint, our jewellery is crafted for effortless, confident everyday wear.
            </p>

            {/* Three Pillar Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#D7C5AF]/30">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-medium text-[#593D30]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A85F49]" />
                  <span>Solid 925 Silver</span>
                </div>
                <p className="text-xs text-[#8E8172] leading-relaxed font-light">
                  Laser-hallmarked purity, 100% nickel-free and hypoallergenic for sensitive skin.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-medium text-[#593D30]">
                  <Compass className="w-3.5 h-3.5 text-[#A85F49]" />
                  <span>Ergonomic Touch</span>
                </div>
                <p className="text-xs text-[#8E8172] leading-relaxed font-light">
                  Comfort-fit inner shanks and smooth link edges designed for continuous daily wear.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-medium text-[#593D30]">
                  <Sparkles className="w-3.5 h-3.5 text-[#A85F49]" />
                  <span>Rhodium Shield</span>
                </div>
                <p className="text-xs text-[#8E8172] leading-relaxed font-light">
                  Micro-barrier treatment preserves the mirror brilliance and repels ambient oxidation.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
