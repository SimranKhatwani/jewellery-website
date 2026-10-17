import React, { useState } from 'react';
import { Product } from '../types/jewellery';
import { ProductCard } from './ProductCard';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AnkletsSectionProps {
  anklets: Product[];
  onSelectProduct: (product: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
}

export const AnkletsSection: React.FC<AnkletsSectionProps> = ({
  anklets,
  onSelectProduct,
  wishlistIds,
  onToggleWishlist,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'curb' | 'snake' | 'beaded'>('all');

  const filteredAnklets = anklets.filter((anklet) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'curb') return anklet.slug.includes('curb') || anklet.slug.includes('teardrop');
    if (activeTab === 'snake') return anklet.slug.includes('snake');
    if (activeTab === 'beaded') return anklet.slug.includes('beaded') || anklet.slug.includes('orbit');
    return true;
  });

  const featuredAnklet = anklets[0];

  return (
    <section id="anklets" aria-label="Silver Anklets Collection" className="py-20 md:py-28 bg-[#F7F1E9] border-y border-[#D7C5AF]/40">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header & Sub-narrative */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-light text-[#593D30] tracking-tight">
              Delicate Silver Anklets
            </h2>
            <p className="text-sm md:text-base text-[#8E8172] max-w-xl mt-2 font-light">
              Featherlight diamond-cut curb links, fluid snake ribbons, and custom artisan clasps designed for effortless everyday drape.
            </p>
          </div>

          {/* Segmented Filter: Burnt Terracotta #A85F49 active tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FFFFFF] border border-[#D7C5AF]/40 rounded-xs self-start md:self-end overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'all'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                  : 'text-[#593D30]/80 hover:text-[#A85F49]'
              }`}
            >
              All Anklets ({anklets.length})
            </button>
            <button
              onClick={() => setActiveTab('curb')}
              className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'curb'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                  : 'text-[#593D30]/80 hover:text-[#A85F49]'
              }`}
            >
              Curb & Teardrop
            </button>
            <button
              onClick={() => setActiveTab('snake')}
              className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'snake'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                  : 'text-[#593D30]/80 hover:text-[#A85F49]'
              }`}
            >
              Snake Ribbon
            </button>
            <button
              onClick={() => setActiveTab('beaded')}
              className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'beaded'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                  : 'text-[#593D30]/80 hover:text-[#A85F49]'
              }`}
            >
              Beaded Orbit
            </button>
          </div>
        </div>

        {/* Feature Spotlight: The Fluid Drape Banner (Pure White card #FFFFFF) */}
        {featuredAnklet && (
          <div 
            onClick={() => onSelectProduct(featuredAnklet)}
            className="mb-12 bg-[#FFFFFF] rounded-xs border border-[#D7C5AF]/40 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center cursor-pointer group hover:border-[#A85F49] transition-all shadow-xs"
          >
            <div className="md:col-span-7 aspect-16/10 bg-[#F7F1E9] overflow-hidden rounded-xs relative">
              <img
                src={featuredAnklet.primaryImage}
                alt={featuredAnklet.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-[#A85F49] text-[#FFFFFF] px-3 py-1 text-[11px] uppercase tracking-widest font-medium shadow-xs">
                Curated Spotlight
              </div>
            </div>

            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8E8172] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#A85F49]" />
                <span>Fluid Metallurgy & Drape</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif-display text-[#593D30] group-hover:text-[#A85F49] transition-colors">
                {featuredAnklet.name}
              </h3>
              <p className="text-sm text-[#8E8172] font-light leading-relaxed">
                {featuredAnklet.description}
              </p>
              
              <div className="pt-2 flex items-center justify-between border-t border-[#D7C5AF]/30">
                <div>
                  <span className="text-xs text-[#8E8172] block">Price</span>
                  <span className="text-lg font-mono tabular-nums font-medium text-[#593D30]">
                    ${featuredAnklet.priceUSD} USD
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-medium text-[#A85F49] group-hover:text-[#8E4D3A] transition-colors">
                  <span>Explore Details</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Curated Product Grid: Pure White #FFFFFF Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {filteredAnklets.map((anklet) => (
            <ProductCard
              key={anklet.id}
              product={anklet}
              onSelectProduct={onSelectProduct}
              isWishlisted={wishlistIds.includes(anklet.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

      </div>
    </section>
  );
};
