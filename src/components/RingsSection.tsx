import React, { useState } from 'react';
import { Product } from '../types/jewellery';
import { ProductCard } from './ProductCard';
import { ArrowUpRight } from 'lucide-react';

interface RingsSectionProps {
  rings: Product[];
  onSelectProduct: (product: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
}

export const RingsSection: React.FC<RingsSectionProps> = ({
  rings,
  onSelectProduct,
  wishlistIds,
  onToggleWishlist,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'sculptural' | 'signet'>('all');

  const filteredRings = rings.filter((ring) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'sculptural') return ring.slug.includes('molten') || ring.slug.includes('wave') || ring.slug.includes('caldera');
    if (activeFilter === 'signet') return ring.slug.includes('signet');
    return true;
  });

  const heroRing = rings[0]; // The Sculpted Molten Band as editorial anchor

  return (
    <section id="rings" aria-label="Silver Rings Collection" className="pt-8 md:pt-12 pb-16 md:pb-20 px-6 max-w-7xl mx-auto bg-[#FFFFFF]">
      {/* Section Header with Editorial Typography */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
            Collection 01
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-light text-[#593D30] tracking-tight">
            Sculptural Silver Rings
          </h2>
          <p className="text-sm md:text-base text-[#8E8172] max-w-xl mt-2 font-light">
            Engineered in solid 925 sterling silver with tactile finishes, sculpted contours, and ergonomic comfort fits.
          </p>
        </div>

        {/* Filter Controls: Burnt Terracotta #A85F49 active buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F7F1E9] border border-[#D7C5AF]/40 rounded-xs self-start md:self-end">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === 'all'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                : 'text-[#593D30]/80 hover:text-[#A85F49]'
            }`}
          >
            All Rings ({rings.length})
          </button>
          <button
            onClick={() => setActiveFilter('sculptural')}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === 'sculptural'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                : 'text-[#593D30]/80 hover:text-[#A85F49]'
            }`}
          >
            Sculptural Wave
          </button>
          <button
            onClick={() => setActiveFilter('signet')}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === 'signet'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                : 'text-[#593D30]/80 hover:text-[#A85F49]'
            }`}
          >
            Architectural Signet
          </button>
        </div>
      </div>

      {/* Asymmetrical Editorial Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Large Editorial Product Anchor: Deep Chocolate #593D30 background */}
        {heroRing && (
          <div 
            onClick={() => onSelectProduct(heroRing)}
            className="lg:col-span-5 bg-[#593D30] text-[#FFFFFF] rounded-sm p-6 sm:p-8 flex flex-col justify-between group cursor-pointer overflow-hidden relative shadow-md min-h-[500px]"
          >
            {/* Background image with subtle overlay */}
            <div className="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity duration-700">
              <img
                src={heroRing.secondaryImage || heroRing.primaryImage}
                alt={heroRing.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#593D30] via-[#593D30]/60 to-transparent" />

            <div className="relative z-10 flex justify-between items-start">
              <span className="text-[11px] uppercase tracking-[0.25em] text-[#FFFFFF] bg-[#A85F49] px-2.5 py-1 font-medium shadow-xs">
                Signature Piece
              </span>
              <span className="text-sm font-mono tabular-nums text-[#FFFFFF] font-medium">
                ${heroRing.priceUSD} USD
              </span>
            </div>

            <div className="relative z-10 space-y-3 pt-32">
              <span className="text-xs uppercase tracking-[0.2em] text-[#F7F1E9]/85">
                Solid 925 Sterling Silver
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif-display font-light text-[#FFFFFF]">
                {heroRing.name}
              </h3>
              <p className="text-xs sm:text-sm text-[#F7F1E9]/90 font-light leading-relaxed line-clamp-2">
                {heroRing.subtitle}
              </p>
              
              <div className="pt-2 flex items-center gap-2 text-xs uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#F7F1E9] transition-colors">
                <span className="underline underline-offset-4">View Full Details & Specs</span>
                <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Pure White #FFFFFF Product Cards (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {filteredRings.map((ring) => (
            <ProductCard
              key={ring.id}
              product={ring}
              onSelectProduct={onSelectProduct}
              isWishlisted={wishlistIds.includes(ring.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

      </div>
    </section>
  );
};
