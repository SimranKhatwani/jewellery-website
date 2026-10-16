import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { Product } from '../types/jewellery';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = query.trim() === ''
    ? products.slice(0, 4) // Show curated suggestions when empty
    : products.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.finishes.some(f => f.toLowerCase().includes(q))
        );
      });

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl bg-[#FFFFFF] rounded-xs shadow-2xl border border-[#D7C5AF]/40 overflow-hidden animate-fade-in">
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#D7C5AF]/30">
          <Search className="w-5 h-5 text-[#8E8172]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search silver rings, anklets, finishes (e.g., Molten, Snake, Curb)..."
            className="flex-1 bg-transparent text-sm sm:text-base outline-none text-[#593D30] placeholder:text-[#8E8172]/70"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#8E8172] hover:text-[#593D30] transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="text-[11px] uppercase tracking-widest text-[#8E8172] mb-3 font-medium">
            {query.trim() === '' ? 'Curated Suggestions' : `Found ${results.length} Pieces`}
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xs hover:bg-[#F7F1E9] cursor-pointer transition-colors group border border-transparent hover:border-[#D7C5AF]/40"
                >
                  <div className="w-16 h-16 bg-[#F7F1E9] rounded-xs overflow-hidden shrink-0">
                    <img
                      src={product.primaryImage}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#8E8172] block font-medium">
                      {product.category === 'rings' ? 'Silver Ring' : 'Silver Anklet'}
                    </span>
                    <h4 className="text-sm font-serif-display text-[#593D30] truncate group-hover:text-[#A85F49] transition-colors">
                      {product.name}
                    </h4>
                    <span className="text-xs font-mono font-medium text-[#593D30]">
                      ${product.priceUSD} USD
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#8E8172] group-hover:text-[#A85F49] shrink-0 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-[#8E8172]">
              No jewellery pieces matching "{query}". Try "ring", "anklet", "signet", or "curb".
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
