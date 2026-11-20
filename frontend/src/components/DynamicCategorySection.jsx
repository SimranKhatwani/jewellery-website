/**
 * @file DynamicCategorySection.jsx
 * @description Dynamic category collection section rendered on the storefront homepage,
 * automatically adapting to custom category keys, bespoke titles, subtitles, and piece counts.
 */

import React from 'react';
import { ProductCard } from './ProductCard';
import { isProductWishlisted } from '../services/productService';

/**
 * DynamicCategorySection Component
 * @param {Object} props
 * @param {string} props.categoryKey - Slug or identifier for this jewellery category
 * @param {string} [props.title] - Optional overridden display title
 * @param {string} [props.subtitle] - Optional overridden subtitle text
 * @param {Array} [props.products=[]] - List of products belonging to this category
 * @param {Function} props.onSelectProduct - Selection callback when piece is clicked
 * @param {Array<string>} [props.wishlistIds=[]] - Current customer wishlist IDs
 * @param {Function} props.onToggleWishlist - Callback to toggle wishlist entry
 */
export const DynamicCategorySection = ({
  categoryKey,
  title,
  subtitle,
  products = [],
  onSelectProduct,
  wishlistIds = [],
  onToggleWishlist,
}) => {
  if (!products || products.length === 0) return null;

  const defaultTitles = {
    earrings: 'Artisan Silver Earrings',
    necklaces: 'Silver Necklaces & Pendants',
    bracelets: 'Silver Bracelets & Cuffs',
    pendants: 'Silver Pendants & Charms',
  };

  const defaultSubtitles = {
    earrings: 'Delicate studs, sculpted hoops, and statement drops crafted in solid 925 sterling silver.',
    necklaces: 'Sculptured pendants and fluid chain contours designed for subtle, luminous everyday drape.',
    bracelets: 'Solid cuff silhouettes and fluid links forged with master craftsmanship.',
    pendants: 'Tactile artisanal charms and bespoke symbolic motifs in pure hallmarked silver.',
  };

  const displayTitle =
    title ||
    defaultTitles[categoryKey] ||
    `${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} Collection`;

  const displaySubtitle =
    subtitle ||
    defaultSubtitles[categoryKey] ||
    'Sculptural fine jewellery designed and hand-finished in hallmarked 925 sterling silver.';

  return (
    <section
      id={categoryKey}
      aria-label={`${displayTitle} Collection`}
      className="py-16 md:py-24 px-6 max-w-7xl mx-auto bg-[#FFFFFF] border-t border-[#D7C5AF]/30"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
            Aurelle Atelier Silhouettes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-light text-[#593D30] tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-sm md:text-base text-[#8E8172] max-w-xl mt-2 font-light">
            {displaySubtitle}
          </p>
        </div>

        {/* Piece Count Pill */}
        <div className="flex items-center gap-2 p-1.5 bg-[#FAF7F2] border border-[#D7C5AF]/50 rounded-xs self-start md:self-end">
          <span className="px-3 py-1 text-xs uppercase tracking-wider font-semibold text-[#A85F49]">
            {products.length} {products.length === 1 ? 'Design' : 'Designs'}
          </span>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id || product._id || product.slug}
            product={product}
            onSelectProduct={onSelectProduct}
            isWishlisted={isProductWishlisted(product, wishlistIds)}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  );
};
