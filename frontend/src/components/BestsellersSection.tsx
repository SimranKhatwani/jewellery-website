import React from 'react';
import { Product } from '../types/jewellery';
import { ProductCard } from './ProductCard';

interface BestsellersSectionProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
}

export const BestsellersSection: React.FC<BestsellersSectionProps> = ({
  products,
  onSelectProduct,
  wishlistIds,
  onToggleWishlist,
}) => {
  const bestsellers = products.filter((p) => p.isBestseller);

  return (
    <section id="bestsellers" aria-label="Aurelle Bestsellers" className="py-20 md:py-28 px-6 max-w-7xl mx-auto bg-[#FFFFFF]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 border-b border-[#D7C5AF]/30 pb-6">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
            The Signatures
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-light text-[#593D30] tracking-tight">
            Curated Bestsellers
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {bestsellers.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelectProduct={onSelectProduct}
            isWishlisted={wishlistIds.includes(product.id)}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  );
};
