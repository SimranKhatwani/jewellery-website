import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ShopByCategoryProps {
  onSelectCategory: (category: 'rings' | 'anklets' | 'all') => void;
  ringCount: number;
  ankletCount: number;
}

export const ShopByCategory: React.FC<ShopByCategoryProps> = ({
  onSelectCategory,
  ringCount,
  ankletCount,
}) => {
  return (
    <section aria-label="Shop by Jewellery Category" className="py-12 md:py-16 px-6 max-w-7xl mx-auto bg-[#FFFFFF]">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
          Curated Silhouettes
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif-display font-light text-[#593D30] tracking-tight">
          Shop by Category
        </h2>
        <p className="text-sm md:text-base text-[#8E8172] mt-2 font-light">
          Sculptural statement bands and delicate chain drape, crafted in pure 925 sterling silver.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Category 1: Silver Rings */}
        <div
          onClick={() => onSelectCategory('rings')}
          className="group cursor-pointer relative aspect-4/3 sm:aspect-16/10 rounded-xs overflow-hidden bg-[#F7F1E9] border border-[#D7C5AF]/40 shadow-xs hover:shadow-md transition-shadow"
        >
          <img
            src="/src/assets/images/campaign_silver_rings_editorial_1792133668744.jpg"
            alt="Aurelle Silver Rings Category"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#593D30]/95 via-[#A85F49]/40 to-transparent" />
          
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex items-end justify-between text-[#FFFFFF]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-[#F7F1E9]/85 block mb-1">
                {ringCount} Sculptural Designs
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif-display font-light">
                Silver Rings
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-medium text-white group-hover:text-[#F7F1E9] group-hover:underline transition-all pb-1">
              <span>Explore</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Category 2: Silver Anklets */}
        <div
          onClick={() => onSelectCategory('anklets')}
          className="group cursor-pointer relative aspect-4/3 sm:aspect-16/10 rounded-xs overflow-hidden bg-[#F7F1E9] border border-[#D7C5AF]/40 shadow-xs hover:shadow-md transition-shadow"
        >
          <img
            src="/src/assets/images/campaign_silver_anklet_editorial_1792133668261.jpg"
            alt="Aurelle Silver Anklets Category"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#593D30]/95 via-[#A85F49]/40 to-transparent" />
          
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex items-end justify-between text-[#FFFFFF]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-[#F7F1E9]/85 block mb-1">
                {ankletCount} Fluid Drape Chains
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif-display font-light">
                Silver Anklets
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-medium text-white group-hover:text-[#F7F1E9] group-hover:underline transition-all pb-1">
              <span>Explore</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
