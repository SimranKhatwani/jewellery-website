import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Package, 
  Ruler, 
  Check,
  ShoppingBag
} from 'lucide-react';
import { Product } from '../types/jewellery';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onOpenSizeGuide: (category: 'rings' | 'anklets') => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  onBack,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
  onOpenSizeGuide,
}) => {
  // Gallery state
  const images = [
    product.primaryImage,
    product.secondaryImage,
    product.detailImage,
  ].filter(Boolean) as string[];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Selection states
  const [selectedOption, setSelectedOption] = useState<string>(product.options.default);
  const [selectedFinish, setSelectedFinish] = useState<string>(product.finishes[0] || 'High Polish');
  
  // Accordion tabs
  const [activeTab, setActiveTab] = useState<'specifications' | 'care' | 'shipping'>('specifications');

  // Reset image and selections when product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setSelectedOption(product.options.default);
    setSelectedFinish(product.finishes[0] || 'High Polish');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Related products from same category or complementary
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#593D30] py-8 md:py-12 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation Breadcrumb / Back Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#D7C5AF]/30">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#593D30] hover:text-[#A85F49] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Catalogue</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#8E8172] tracking-wider uppercase">
            <span>Aurelle</span>
            <span>/</span>
            <span>{product.category === 'rings' ? 'Silver Rings' : 'Silver Anklets'}</span>
            <span>/</span>
            <span className="text-[#593D30] font-medium">{product.name}</span>
          </div>
        </div>

        {/* Main Product Stage: 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Image Gallery (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-28">
            
            {/* Primary Large Image with Magnifier Zoom */}
            <div
              className="relative aspect-square sm:aspect-4/3 lg:aspect-square w-full bg-[#F7F1E9] border border-[#D7C5AF]/40 overflow-hidden rounded-xs cursor-crosshair group shadow-xs"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img
                src={images[activeImageIndex]}
                alt={`${product.name} angle ${activeImageIndex + 1}`}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-transform duration-200 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
                style={
                  isZoomed
                    ? {
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      }
                    : undefined
                }
              />

              {/* Prev / Next Controls: Burnt Terracotta hover */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#FFFFFF]/90 text-[#593D30] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#A85F49] hover:text-[#FFFFFF] shadow-xs"
                    aria-label="Previous photograph"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#FFFFFF]/90 text-[#593D30] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#A85F49] hover:text-[#FFFFFF] shadow-xs"
                    aria-label="Next photograph"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Expand Lightbox Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="absolute bottom-3 right-3 p-2 rounded-full bg-[#FFFFFF]/90 text-[#593D30] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#A85F49] hover:text-[#FFFFFF] shadow-xs"
                title="Open fullscreen view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-3 pointer-events-none opacity-70 group-hover:opacity-0 transition-opacity text-[10px] uppercase tracking-wider text-[#593D30] bg-[#FFFFFF]/90 px-2 py-0.5 rounded-xs">
                Hover to magnify details
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xs overflow-hidden border transition-all shrink-0 ${
                      activeImageIndex === idx
                        ? 'border-[#A85F49] ring-2 ring-[#A85F49]/40'
                        : 'border-[#D7C5AF]/60 hover:border-[#A85F49] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Editorial Quote */}
            {product.editorialQuote && (
              <div className="p-6 bg-[#F7F1E9] border border-[#D7C5AF]/40 rounded-xs shadow-xs">
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#8E8172] block mb-2 font-medium">
                  Design Note
                </span>
                <p className="font-serif-display text-lg italic text-[#593D30] leading-relaxed">
                  “{product.editorialQuote}”
                </p>
              </div>
            )}

          </div>

          {/* Right Column: Product Information & Purchase Notice (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium">
                  {product.category === 'rings' ? 'Silver Ring' : 'Silver Anklet'} · Solid 925
                </span>
                <span className="text-[11px] font-mono text-[#8E8172]">
                  SKU: {product.sku}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-serif-display text-[#593D30] font-light mt-2 tracking-tight">
                {product.name}
              </h1>

              {/* Price & availability */}
              <div className="flex items-baseline gap-4 mt-3">
                <span className="text-2xl font-mono tabular-nums font-medium text-[#593D30]">
                  ${product.priceUSD} USD
                </span>
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Authentic Studio Catalogue
                </span>
              </div>

              <p className="text-sm text-[#8E8172] mt-3 leading-relaxed font-light">
                {product.subtitle}
              </p>
            </div>

            {/* Options Selector A: Surface Finish (Burnt Terracotta #A85F49 active) */}
            {product.finishes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#D7C5AF]/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="uppercase tracking-wider text-[#8E8172] font-medium">Surface Finish</span>
                  <span className="text-[#593D30] font-medium">{selectedFinish}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.finishes.map((finish) => (
                    <button
                      key={finish}
                      onClick={() => setSelectedFinish(finish)}
                      className={`px-3 py-2 text-xs rounded-xs border transition-all ${
                        selectedFinish === finish
                          ? 'border-[#A85F49] bg-[#A85F49] text-[#FFFFFF] font-medium shadow-xs'
                          : 'border-[#D7C5AF] bg-[#FFFFFF] text-[#593D30] hover:border-[#A85F49]'
                      }`}
                    >
                      {finish}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Options Selector B: Available Size or Length */}
            <div className="space-y-2 pt-2 border-t border-[#D7C5AF]/30">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-wider text-[#8E8172] font-medium">
                  Available {product.category === 'rings' ? 'Ring Size (US)' : 'Size / Fit'}
                </span>
                <button
                  onClick={() => onOpenSizeGuide(product.category)}
                  className="flex items-center gap-1 text-[#A85F49] hover:text-[#8E4D3A] underline underline-offset-4 font-medium"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Size & Drape Guide</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {product.options.values.map((val) => (
                  <button
                    key={val}
                    onClick={() => setSelectedOption(val)}
                    className={`py-2 px-2 text-xs text-center rounded-xs border transition-all truncate ${
                      selectedOption === val
                        ? 'border-[#A85F49] bg-[#A85F49] text-[#FFFFFF] font-medium shadow-xs'
                        : 'border-[#D7C5AF] bg-[#FFFFFF] text-[#593D30] hover:border-[#A85F49]'
                    }`}
                    title={val}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Save to Favourites Action */}
            <div className="pt-2">
              <button
                onClick={(e) => onToggleWishlist(product.id, e)}
                className={`w-full py-2.5 px-4 rounded-xs border text-xs uppercase tracking-wider font-medium flex items-center justify-center gap-2 transition-colors ${
                  isWishlisted
                    ? 'border-[#A85F49] bg-[#A85F49] text-[#FFFFFF]'
                    : 'border-[#D7C5AF] bg-[#FFFFFF] text-[#593D30] hover:border-[#A85F49] hover:text-[#A85F49]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                <span>{isWishlisted ? 'Saved in Favourites' : 'Save to Favourites'}</span>
              </button>
            </div>

            {/* Persistent Purchase Information Line for RKB Enterprises: Warm Ivory with Terracotta border */}
            <div className="p-5 bg-[#F7F1E9] border border-[#A85F49]/35 rounded-xs shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-medium text-[#A85F49]">
                <ShoppingBag className="w-3.5 h-3.5 text-[#A85F49]" />
                <span>Purchase Information</span>
              </div>
              <p className="text-sm font-medium text-[#593D30] leading-relaxed">
                To purchase, contact RKB Enterprises or find us on Amazon and Flipkart.
              </p>
              <p className="text-xs text-[#8E8172] leading-relaxed font-light">
                Please reference item name <strong className="font-medium text-[#593D30]">{product.name}</strong> ({product.sku}) with your selected {product.category === 'rings' ? 'ring size' : 'size'} ({selectedOption}) and finish ({selectedFinish}).
              </p>
            </div>

            {/* Accordion Tabs for Specifications, Care, and Shipping */}
            <div className="mt-2 border-t border-[#D7C5AF]/30 divide-y divide-[#D7C5AF]/20">
              
              {/* Tab 1: Specifications */}
              <div className="py-3">
                <button
                  onClick={() => setActiveTab(activeTab === 'specifications' ? 'care' : 'specifications')}
                  className="w-full flex items-center justify-between text-left text-xs uppercase tracking-wider font-medium text-[#593D30] py-1"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Materials & Technical Specifications</span>
                  </div>
                  <span className="text-[#8E8172]">{activeTab === 'specifications' ? '−' : '+'}</span>
                </button>

                {activeTab === 'specifications' && (
                  <div className="mt-3 space-y-2 text-xs text-[#593D30]/90 animate-fade-in pl-5">
                    <div className="flex justify-between py-1 border-b border-[#D7C5AF]/20">
                      <span className="text-[#8E8172]">Purity</span>
                      <span className="font-medium text-right">{product.specifications.purity}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D7C5AF]/20">
                      <span className="text-[#8E8172]">Hallmark</span>
                      <span className="font-medium text-right">{product.specifications.hallmark}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D7C5AF]/20">
                      <span className="text-[#8E8172]">Weight</span>
                      <span className="font-mono tabular-nums text-right">{product.specifications.weight}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D7C5AF]/20">
                      <span className="text-[#8E8172]">Dimensions</span>
                      <span className="font-mono tabular-nums text-right">{product.specifications.dimensions}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D7C5AF]/20">
                      <span className="text-[#8E8172]">Hypoallergenic</span>
                      <span className="text-right">{product.specifications.hypoallergenic}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D7C5AF]/20">
                      <span className="text-[#8E8172]">Finish Protection</span>
                      <span className="text-right">{product.specifications.protection}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab 2: Care Instructions */}
              <div className="py-3">
                <button
                  onClick={() => setActiveTab(activeTab === 'care' ? 'specifications' : 'care')}
                  className="w-full flex items-center justify-between text-left text-xs uppercase tracking-wider font-medium text-[#593D30] py-1"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Silver Care & Preservation</span>
                  </div>
                  <span className="text-[#8E8172]">{activeTab === 'care' ? '−' : '+'}</span>
                </button>

                {activeTab === 'care' && (
                  <ul className="mt-3 space-y-2 text-xs text-[#8E8172] animate-fade-in pl-5 list-disc list-outside">
                    {product.careInstructions.map((instruction, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {instruction}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Tab 3: Packaging & Delivery */}
              <div className="py-3">
                <button
                  onClick={() => setActiveTab(activeTab === 'shipping' ? 'specifications' : 'shipping')}
                  className="w-full flex items-center justify-between text-left text-xs uppercase tracking-wider font-medium text-[#593D30] py-1"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Packaging & Verification</span>
                  </div>
                  <span className="text-[#8E8172]">{activeTab === 'shipping' ? '−' : '+'}</span>
                </button>

                {activeTab === 'shipping' && (
                  <div className="mt-3 space-y-2 text-xs text-[#8E8172] animate-fade-in pl-5">
                    <p className="leading-relaxed">
                      Every Aurelle piece is presented in a signature archival gift box with anti-tarnish microfibre suede pouch and care cloth.
                    </p>
                    <p className="leading-relaxed text-[#593D30] font-medium">
                      Insured express dispatch with certificate of 925 silver metallurgical purity.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* Bottom Section: Related Pieces: Pure White #FFFFFF cards */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-12 border-t border-[#D7C5AF]/30">
            <div className="flex justify-between items-end mb-8">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-1">
                  Catalogue Curation
                </span>
                <h3 className="text-2xl font-serif-display text-[#593D30]">
                  Complementary {product.category === 'rings' ? 'Silver Rings' : 'Silver Anklets'}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectProduct(rel)}
                  className="group cursor-pointer flex flex-col bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/40 hover:border-[#A85F49] transition-all shadow-xs"
                >
                  <div className="aspect-square bg-[#F7F1E9] overflow-hidden rounded-xs mb-3">
                    <img
                      src={rel.primaryImage}
                      alt={rel.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#8E8172]">
                    Solid 925 Silver
                  </span>
                  <h4 className="text-sm font-serif-display text-[#593D30] mt-0.5 group-hover:text-[#A85F49] transition-colors line-clamp-1">
                    {rel.name}
                  </h4>
                  <span className="text-xs font-mono font-medium mt-1 text-[#593D30]">
                    ${rel.priceUSD} USD
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-[#593D30]/95 backdrop-blur-md flex items-center justify-center p-6">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-[#FFFFFF]/10 text-[#FFFFFF] hover:bg-[#FFFFFF]/25 transition-colors"
            aria-label="Close fullscreen view"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] relative flex items-center justify-center">
            <img
              src={images[activeImageIndex]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-xs"
            />
          </div>
        </div>
      )}

    </div>
  );
};
