import React, { useState } from 'react';
import { Search, Heart, Menu, X } from 'lucide-react';

interface HeaderProps {
  wishlistCount: number;
  onOpenWishlist: () => void;
  onOpenSearch: () => void;
  onNavigateHome: () => void;
  onNavigateCategory: (category: 'rings' | 'anklets' | 'all') => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  wishlistCount,
  onOpenWishlist,
  onOpenSearch,
  onNavigateHome,
  onNavigateCategory,
  onNavigateSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 w-full transition-colors">
      {/* Announcement Marquee Strip: Warm Taupe #9A8E78 (Moving State) */}
      <div 
        aria-label="Announcements" 
        className="w-full bg-[#9A8E78] text-[#FFFFFF] text-[11px] sm:text-xs py-2 overflow-hidden border-b border-[#FFFFFF]/10 shadow-xs select-none"
      >
        <div className="animate-marquee whitespace-nowrap">
          {/* Loop Set 1 */}
          <div className="flex items-center gap-6 shrink-0 pr-6">
            <span className="tracking-[0.22em] uppercase font-medium">925 Sterling Silver Atelier</span>
            <span aria-hidden="true" className="opacity-70">·</span>
            <span className="tracking-[0.18em] uppercase font-light">Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart</span>
            <span aria-hidden="true" className="opacity-70">·</span>
            <span className="tracking-[0.22em] uppercase font-medium">Solid 925 Sterling Silver</span>
            <span aria-hidden="true" className="opacity-70">·</span>
            <span className="tracking-[0.18em] uppercase font-light">Complimentary Insured Express Dispatch on All Allocations</span>
            <span aria-hidden="true" className="opacity-70">·</span>
          </div>

          {/* Loop Set 2 (Identical clone for seamless infinite movement) */}
          <div aria-hidden="true" className="flex items-center gap-6 shrink-0 pr-6">
            <span className="tracking-[0.22em] uppercase font-medium">925 Sterling Silver Atelier</span>
            <span className="opacity-70">·</span>
            <span className="tracking-[0.18em] uppercase font-light">Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart</span>
            <span className="opacity-70">·</span>
            <span className="tracking-[0.22em] uppercase font-medium">Solid 925 Sterling Silver</span>
            <span className="opacity-70">·</span>
            <span className="tracking-[0.18em] uppercase font-light">Complimentary Insured Express Dispatch on All Allocations</span>
            <span className="opacity-70">·</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar: Pure White #FFFFFF */}
      <header className="w-full bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#9A8E78]/15 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5 md:py-4">
          
          {/* Brand Wordmark */}
          <button
            onClick={onNavigateHome}
            className="flex flex-col items-start text-left focus-visible:outline-none group shrink-0"
          >
            <span className="text-xl md:text-2xl font-serif-display font-light tracking-[0.28em] text-[#6C6658] uppercase whitespace-nowrap group-hover:text-[#93826E] transition-colors leading-none">
              AURELLE
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.38em] text-[#9A8E78] font-medium mt-1">
              Silver Atelier
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.18em] font-medium text-[#6C6658]/85">
            <button
              onClick={onNavigateHome}
              className="hover:text-[#93826E] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Home
            </button>
            <button
              onClick={() => onNavigateCategory('rings')}
              className="hover:text-[#93826E] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Silver Rings
            </button>
            <button
              onClick={() => onNavigateCategory('anklets')}
              className="hover:text-[#93826E] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Silver Anklets
            </button>
            <button
              onClick={() => onNavigateSection('bestsellers')}
              className="hover:text-[#93826E] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Collections
            </button>
            <button
              onClick={() => onNavigateSection('brand-story')}
              className="hover:text-[#93826E] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Our Story
            </button>
            <button
              onClick={() => onNavigateSection('contact')}
              className="hover:text-[#93826E] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Contact
            </button>
          </nav>

          {/* Search & Wishlist */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#6C6658] hover:text-[#93826E] hover:bg-[#9A8E78]/10 rounded-full transition-colors"
              title="Search collection"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenWishlist}
              className="flex items-center gap-1.5 p-2 text-[#6C6658] hover:text-[#93826E] hover:bg-[#9A8E78]/10 rounded-full transition-colors"
              title="View saved favourites"
              aria-label="Favourites"
            >
              <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-[#93826E] text-[#93826E]' : ''}`} />
              {wishlistCount > 0 && (
                <span className="text-[11px] font-medium font-mono tabular-nums text-[#93826E]">
                  ({wishlistCount})
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#6C6658] hover:text-[#93826E] hover:bg-[#9A8E78]/10 rounded-full"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFFFF] border-t border-[#9A8E78]/15 px-6 py-6 flex flex-col gap-4 text-sm font-medium tracking-wide shadow-md">
            <button
              onClick={() => {
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#6C6658] hover:text-[#93826E]"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigateCategory('rings');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#6C6658] hover:text-[#93826E]"
            >
              Silver Rings
            </button>
            <button
              onClick={() => {
                onNavigateCategory('anklets');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#6C6658] hover:text-[#93826E]"
            >
              Silver Anklets
            </button>
            <button
              onClick={() => {
                onNavigateSection('bestsellers');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#6C6658] hover:text-[#93826E]"
            >
              Collections
            </button>
            <button
              onClick={() => {
                onNavigateSection('brand-story');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#6C6658] hover:text-[#93826E]"
            >
              Our Story
            </button>
            <button
              onClick={() => {
                onNavigateSection('contact');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#6C6658] hover:text-[#93826E]"
            >
              Contact
            </button>
          </div>
        )}
      </header>
    </div>
  );
};
