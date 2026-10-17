import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface FooterProps {
  onNavigateCategory: (category: 'rings' | 'anklets' | 'all') => void;
  onOpenSizeGuide: (category: 'rings' | 'anklets') => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateCategory,
  onOpenSizeGuide,
  onNavigateSection,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="w-full bg-[#593D30] text-[#FFFFFF] pt-16 pb-12 px-6 border-t border-[#D7C5AF]/25 shadow-md">
      <div className="max-w-7xl mx-auto">
        
        {/* Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b border-[#D7C5AF]/20">
          
          {/* Col 1: Brand & Purchase Statement (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <span className="text-2xl font-serif-display font-light tracking-[0.25em] text-[#FFFFFF] block">
              AURELLE
            </span>
            <p className="text-xs text-[#F7F1E9]/85 font-light leading-relaxed max-w-sm">
              Sculptural fine jewellery conceived exclusively in solid 925 sterling silver. Celebrating tactile weights, fluid drape, and timeless personal expression.
            </p>
            <div className="p-3.5 bg-[#F7F1E9] rounded-xs border border-[#D7C5AF]/50 space-y-1 shadow-xs text-[#593D30]">
              <span className="text-[10px] uppercase tracking-wider text-[#A85F49] font-medium block">
                Purchasing Aurelle
              </span>
              <p className="text-xs text-[#593D30] leading-relaxed font-medium">
                To purchase, contact RKB Enterprises or find us on Amazon and Flipkart.
              </p>
            </div>
          </div>

          {/* Col 2: Collection Navigation (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#FFFFFF] font-medium block">
              Collections
            </span>
            <ul className="space-y-2 text-xs text-[#F7F1E9]/85">
              <li>
                <button
                  onClick={() => onNavigateCategory('rings')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Silver Rings
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('anklets')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Silver Anklets
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('bestsellers')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Bestsellers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('new-arrivals')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  New Editions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Fitting (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#FFFFFF] font-medium block">
              Client Fitting & Story
            </span>
            <ul className="space-y-2 text-xs text-[#F7F1E9]/85">
              <li>
                <button
                  onClick={() => onOpenSizeGuide('rings')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Ring Sizing Standard (US 5–10)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenSizeGuide('anklets')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Anklet Drape & Extender Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('brand-story')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Our Metallurgical Story
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('contact')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Contact RKB Enterprises
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Private Release Allocations (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#FFFFFF] font-medium block">
              Private Releases
            </span>
            <p className="text-xs text-[#F7F1E9]/85 font-light leading-relaxed">
              Stay informed on new small-batch 925 silver creations and allocations.
            </p>
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="space-y-2 pt-1">
                <div className="flex items-center border border-[#D7C5AF]/50 rounded-xs overflow-hidden bg-[#FFFFFF]">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full text-xs px-3 py-2.5 bg-transparent text-[#593D30] outline-none placeholder:text-[#8E8172]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-xs uppercase tracking-wider text-[#FFFFFF] bg-[#A85F49] hover:bg-[#8E4D3A] transition-colors shrink-0 font-medium"
                  >
                    Join
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#FFFFFF] font-medium pt-1">
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Subscribed to private releases.</span>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Row: Legal & Plain-text Purchase Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#F7F1E9]/75">
          <p>© {new Date().getFullYear()} AURELLE. Distributed by RKB Enterprises.</p>
          <div className="flex items-center gap-6">
            <span>Solid 925 Sterling Silver</span>
            <span>Hallmarked Quality</span>
            <span>Amazon and Flipkart</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
