import React from 'react';
import { ArrowRight } from 'lucide-react';
import { resolveMediaUrl } from '../services/productService';

export const ShopByCategory = ({
  onSelectCategory,
  ringCount = 0,
  ankletCount = 0,
  categories = [],
  products = [],
}) => {
  // Built-in editorial category fallback metadata
  const categoryMeta = {
    rings: {
      image: '/src/assets/images/campaign_silver_rings_editorial_1792133668744.jpg',
      label: 'Silver Rings',
      subtext: `${ringCount} Sculptural Designs`,
    },
    anklets: {
      image: '/src/assets/images/campaign_silver_anklet_editorial_1792133668261.jpg',
      label: 'Silver Anklets',
      subtext: `${ankletCount} Fluid Styles`,
    },
  };

  // Determine active categories to show
  const activeItems = categories && categories.length > 0 ? categories : [
    { slug: 'rings', label: 'Silver Rings', count: ringCount },
    { slug: 'anklets', label: 'Silver Anklets', count: ankletCount },
  ];

  const gridClass =
    activeItems.length <= 2
      ? 'grid-cols-1 md:grid-cols-2'
      : activeItems.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

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
          Sculptural statement bands, delicate chain drape, and artisanal drops crafted in pure 925 sterling silver.
        </p>
      </div>

      <div className={`grid ${gridClass} gap-6 md:gap-8`}>
        {activeItems.map((cat) => {
          // Find any product in this category to use its real image
          const matchedProd = products.find(
            (p) => p.category === cat.slug && p.primaryImage
          );

          let coverImage = '';
          if (cat.slug === 'rings') {
            coverImage = categoryMeta.rings.image;
          } else if (cat.slug === 'anklets') {
            coverImage = categoryMeta.anklets.image;
          } else if (matchedProd?.primaryImage) {
            coverImage = resolveMediaUrl(matchedProd.primaryImage);
          } else if (cat.image) {
            coverImage = resolveMediaUrl(cat.image);
          } else {
            coverImage = '/src/assets/images/campaign_silver_rings_editorial_1792133668744.jpg';
          }

          const label = cat.label || (cat.slug.charAt(0).toUpperCase() + cat.slug.slice(1));
          const subtext = cat.count !== undefined ? `${cat.count} Designs` : 'Fine Designs';

          return (
            <div
              key={cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
              className="group cursor-pointer relative aspect-4/3 sm:aspect-16/10 rounded-xs overflow-hidden bg-[#F7F1E9] border border-[#D7C5AF]/40 shadow-xs hover:shadow-md transition-shadow"
            >
              <img
                src={coverImage}
                alt={`Aurelle ${label} Category`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-700"
                onError={(e) => {
                  e.target.src = '/src/assets/images/campaign_silver_rings_editorial_1792133668744.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#593D30]/95 via-[#A85F49]/40 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-end justify-between text-[#FFFFFF]">
                <div>
                  <span className="text-[10.5px] uppercase tracking-[0.25em] text-[#F7F1E9]/85 block mb-1">
                    {subtext}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif-display font-light">
                    {label}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs uppercase tracking-widest font-medium text-white group-hover:text-[#F7F1E9] group-hover:underline transition-all pb-1 shrink-0">
                  <span>Explore</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

