import React, { useState } from 'react';
import { Heart, ArrowUpRight } from 'lucide-react';
import { Product } from '../types/jewellery';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  aspectRatioClass?: string;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
  aspectRatioClass = 'aspect-square',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const displayImage = isHovered && product.secondaryImage && !imageError
    ? product.secondaryImage
    : product.primaryImage;

  return (
    <article
      onClick={() => onSelectProduct(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group cursor-pointer flex flex-col bg-[#FFFFFF] p-3 rounded-sm border border-[#D7C5AF]/40 hover:border-[#A85F49] transition-all duration-300 shadow-xs hover:shadow-md ${className}`}
    >
      {/* Product Image Frame */}
      <div className={`relative w-full ${aspectRatioClass} bg-[#F7F1E9] overflow-hidden rounded-xs`}>
        {!imageError ? (
          <img
            src={displayImage}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-104"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F7F1E9] text-[#593D30] p-6 text-center">
            <span className="text-xs uppercase tracking-widest text-[#8E8172]">Aurelle Silver</span>
            <span className="text-sm font-serif-display mt-1">{product.name}</span>
          </div>
        )}

        {/* Wishlist Button: Burnt Terracotta #A85F49 accent */}
        <button
          onClick={(e) => onToggleWishlist(product.id, e)}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs text-[#593D30] hover:text-[#A85F49] hover:bg-[#FFFFFF] transition-transform duration-200 active:scale-90 shadow-xs"
          title={isWishlisted ? "Remove from favourites" : "Save to favourites"}
          aria-label={isWishlisted ? "Remove from favourites" : "Save to favourites"}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? 'fill-[#A85F49] text-[#A85F49]' : 'text-[#593D30]'}`} />
        </button>

        {/* Status indicator: Burnt Terracotta #A85F49 */}
        {(product.isBestseller || product.isNewArrival) && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#FFFFFF] bg-[#A85F49] px-2 py-0.5 shadow-xs">
              {product.isBestseller ? 'Bestseller' : 'New Edition'}
            </span>
          </div>
        )}

        {/* Quick View Details Overlay: Deep Chocolate & Terracotta hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#593D30]/90 via-[#593D30]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between text-[#FFFFFF]">
          <span className="text-xs uppercase tracking-widest font-medium">View Product Details</span>
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      {/* Product Information */}
      <div className="pt-3 pb-1 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#8E8172]">
          <span>{product.category === 'rings' ? 'Silver Ring' : 'Silver Anklet'}</span>
          <span aria-hidden="true">·</span>
          <span>Solid 925</span>
        </div>

        <h3 className="text-base font-serif-display text-[#593D30] group-hover:text-[#A85F49] transition-colors line-clamp-1">
          {product.name}
        </h3>

        <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#D7C5AF]/30">
          <span className="text-sm font-medium font-mono tabular-nums text-[#593D30]">
            ${product.priceUSD} USD
          </span>
          <span className="text-[11px] text-[#8E8172]">
            {product.options.type === 'size' ? '6 Sizes Available' : 'Adjustable Drape'}
          </span>
        </div>
      </div>
    </article>
  );
};
