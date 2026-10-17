import React from 'react';
import { Product } from '../types/jewellery';
import { ProductCard } from './ProductCard';

interface NewArrivalsSectionProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
}

export const NewArrivalsSection: React.FC<NewArrivalsSectionProps> = ({
  products,
  onSelectProduct,
  wishlistIds,
  onToggleWishlist,
}) => {
  const newArrivals = products.filter((p) => p.isNewArrival);

  return (
    <section id="new-arrivals" aria-label="Aurelle New Arrivals" className="py-20 md:py-28 bg-[#F7F1E9] border-t border-[#D7C5AF]/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#D7C5AF]/30 pb-6">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
              Recent Casts
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-light text-[#593D30] tracking-tight">
              New Editions & Silhouettes
            </h2>
          </div>
          
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {newArrivals.map((product) => (
            <div key={product.id} className="[&_article]:bg-[#FFFFFF] [&_h3]:text-[#593D30]">
              <ProductCard
                product={product}
                onSelectProduct={onSelectProduct}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
