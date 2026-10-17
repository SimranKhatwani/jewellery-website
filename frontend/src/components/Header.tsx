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
      {/* Announcement Marquee Strip: Burnt Terracotta #A85F49 (Moving State) */}
      <div 
        aria-label="Announcements" 
        className="w-full bg-[#A85F49] text-[#FFFFFF] text-[11px] sm:text-xs py-2 overflow-hidden border-b border-[#FFFFFF]/10 shadow-xs select-none"
      >
        <div className="animate-marquee whitespace-nowrap">
          {/* Loop Set 1 */}
          <div className="flex items-center gap-6 shrink-0 pr-6">
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">925 Sterling Silver Atelier</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">Solid 925 Sterling Silver</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Complimentary Insured Express Dispatch on All Allocations</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
          </div>

          {/* Loop Set 2 (Identical clone for seamless infinite movement) */}
          <div aria-hidden="true" className="flex items-center gap-6 shrink-0 pr-6">
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">925 Sterling Silver Atelier</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">Solid 925 Sterling Silver</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Complimentary Insured Express Dispatch on All Allocations</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar: Warm Ivory #F7F1E9 */}
      <header className="w-full bg-[#F7F1E9]/98 backdrop-blur-md border-b border-[#D7C5AF]/40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5 md:py-4">
          
          {/* Brand Wordmark */}
          <button
            onClick={onNavigateHome}
            className="flex flex-col items-start text-left focus-visible:outline-none group shrink-0"
          >
            <span className="text-xl md:text-2xl font-serif-display font-light tracking-[0.28em] text-[#593D30] uppercase whitespace-nowrap group-hover:text-[#A85F49] transition-colors leading-none">
              AURELLE
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.38em] text-[#8E8172] font-medium mt-1">
              Silver Atelier
            </span>
          </button>

          {/* Navigation Links: Deep Chocolate #593D30 with Terracotta #A85F49 Hover */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.18em] font-medium text-[#593D30]/90">
            <button
              onClick={onNavigateHome}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Home
            </button>
            <button
              onClick={() => onNavigateCategory('rings')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Silver Rings
            </button>
            <button
              onClick={() => onNavigateCategory('anklets')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Silver Anklets
            </button>
            <button
              onClick={() => onNavigateSection('bestsellers')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Collections
            </button>
            <button
              onClick={() => onNavigateSection('brand-story')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Our Story
            </button>
            <button
              onClick={() => onNavigateSection('contact')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Contact
            </button>
          </nav>

          {/* Search & Wishlist */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
              title="Search collection"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenWishlist}
              className="flex items-center gap-1.5 p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
              title="View saved favourites"
              aria-label="Favourites"
            >
              <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-[#A85F49] text-[#A85F49]' : ''}`} />
              {wishlistCount > 0 && (
                <span className="text-[11px] font-medium font-mono tabular-nums text-[#A85F49]">
                  ({wishlistCount})
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F7F1E9] border-t border-[#D7C5AF]/35 px-6 py-6 flex flex-col gap-4 text-sm font-medium tracking-wide shadow-md">
            <button
              onClick={() => {
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigateCategory('rings');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Silver Rings
            </button>
            <button
              onClick={() => {
                onNavigateCategory('anklets');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Silver Anklets
            </button>
            <button
              onClick={() => {
                onNavigateSection('bestsellers');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Collections
            </button>
            <button
              onClick={() => {
                onNavigateSection('brand-story');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Our Story
            </button>
            <button
              onClick={() => {
                onNavigateSection('contact');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Contact
            </button>
          </div>
        )}
      </header>
    </div>
  );
};
