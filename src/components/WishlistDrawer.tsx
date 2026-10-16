import React from 'react';
import { X, Heart, Trash2, ArrowRight } from 'lucide-react';
import { Product } from '../types/jewellery';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onRemoveFromWishlist: (productId: string) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  products,
  onSelectProduct,
  onRemoveFromWishlist,
}) => {
  if (!isOpen) return null;

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-[#6C6658]/70 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer */}
      <aside className="w-full max-w-md bg-[#FFFFFF] h-full shadow-2xl flex flex-col justify-between border-l border-[#9A8E78]/25 animate-slide-left">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#9A8E78]/20">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 fill-[#93826E] text-[#93826E]" />
            <h2 className="text-base font-serif-display text-[#6C6658] tracking-wide font-medium">
              Saved Pieces ({wishlistedProducts.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#9A8E78] hover:text-[#6C6658] transition-colors"
            aria-label="Close saved pieces"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {wishlistedProducts.length > 0 ? (
            wishlistedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-start gap-4 p-3 rounded-xs bg-[#E4E1DB]/35 border border-[#9A8E78]/20 group"
              >
                <div
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="w-20 h-20 bg-[#E4E1DB] rounded-xs overflow-hidden shrink-0 cursor-pointer"
                >
                  <img
                    src={product.primaryImage}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#9A8E78] block font-medium">
                    {product.category === 'rings' ? 'Silver Ring' : 'Silver Anklet'}
                  </span>
                  <h3
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className="text-sm font-serif-display text-[#6C6658] truncate cursor-pointer hover:text-[#93826E] transition-colors"
                  >
                    {product.name}
                  </h3>
                  <span className="text-xs font-mono font-medium block mt-1 text-[#6C6658]">
                    ${product.priceUSD} USD
                  </span>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="text-[11px] uppercase tracking-wider text-[#6C6658] hover:text-[#93826E] font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemoveFromWishlist(product.id)}
                      className="text-[11px] text-[#9A8E78] hover:text-red-700 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-3">
              <Heart className="w-8 h-8 text-[#9A8E78]/40 mx-auto" />
              <p className="text-sm text-[#6C6658]/80 font-light">
                Your favourites list is currently empty.
              </p>
              <p className="text-xs text-[#9A8E78]">
                Click the heart icon on any ring or anklet to keep track of your preferred designs.
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {wishlistedProducts.length > 0 && (
          <div className="p-6 border-t border-[#9A8E78]/20 bg-[#FFFFFF] space-y-2">
            <div className="flex justify-between text-xs text-[#9A8E78]">
              <span>Saved Selection Value</span>
              <span className="font-mono tabular-nums text-[#6C6658] font-medium">
                ${wishlistedProducts.reduce((sum, p) => sum + p.priceUSD, 0)} USD
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#93826E] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs hover:bg-[#9A8E78] transition-colors shadow-xs"
            >
              Continue Exploring Catalogue
            </button>
          </div>
        )}

      </aside>
    </div>
  );
};
