import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, Check, AlertCircle } from 'lucide-react';
import { formatPrice } from '../services/storefrontService';

export const CartDrawer = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponError,
  couponLoading,
  onSelectProduct,
  allProducts = [],
}) => {
  const [couponInput, setCouponInput] = useState('');

  if (!isOpen) return null;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart?.totalItems || items.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    onApplyCoupon(couponInput.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/70 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer */}
      <aside className="w-full max-w-md bg-[#FFFFFF] h-full shadow-2xl flex flex-col justify-between border-l border-[#D7C5AF]/40 animate-slide-left">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#D7C5AF]/30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#A85F49]" />
            <h2 className="text-base font-serif-display text-[#593D30] tracking-wide font-medium">
              Shopping Cart ({totalItems})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length > 0 ? (
            items.map((item) => {
              const matchedProduct = allProducts.find(
                (p) => String(p._id) === String(item.productId?._id || item.productId) || p.slug === item.productId?.slug
              );
              const imgUrl = item.productId?.primaryImage || matchedProduct?.primaryImage || '/placeholder.png';
              const productName = item.productId?.name || matchedProduct?.name || 'Artisan Jewellery';
              const sku = item.sku || item.productId?.sku || matchedProduct?.sku || '';

              return (
                <div
                  key={item._id || item.productId}
                  className="flex items-start gap-4 p-3.5 rounded-xs bg-[#F7F1E9] border border-[#D7C5AF]/40"
                >
                  <div
                    onClick={() => {
                      if (matchedProduct) {
                        onSelectProduct(matchedProduct);
                        onClose();
                      }
                    }}
                    className="w-20 h-20 bg-[#FFFFFF] rounded-xs overflow-hidden shrink-0 cursor-pointer border border-[#D7C5AF]/30"
                  >
                    <img
                      src={imgUrl}
                      alt={productName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        onClick={() => {
                          if (matchedProduct) {
                            onSelectProduct(matchedProduct);
                            onClose();
                          }
                        }}
                        className="text-sm font-serif-display text-[#593D30] truncate cursor-pointer hover:text-[#A85F49] transition-colors font-medium"
                      >
                        {productName}
                      </h3>
                      <button
                        onClick={() => onRemoveItem(item._id)}
                        className="text-[#8E8172] hover:text-red-700 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sku && (
                      <span className="text-[10px] font-mono text-[#8E8172] block">
                        SKU: {sku}
                      </span>
                    )}

                    {/* Selected options */}
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-[#593D30]/80">
                        {Object.entries(item.selectedOptions).map(([key, val]) => (
                          <span key={key} className="bg-[#FFFFFF] border border-[#D7C5AF]/50 px-1.5 py-0.5 rounded-xs capitalize">
                            {key}: <strong className="font-medium text-[#593D30]">{val}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-mono font-medium text-[#593D30]">
                        {formatPrice(item.price)}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-[#D7C5AF] rounded-xs bg-[#FFFFFF]">
                        <button
                          onClick={() => onUpdateQuantity(item._id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 text-[#593D30] hover:bg-[#F7F1E9] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-1 text-xs font-mono font-medium text-[#593D30] select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                          className="px-2 py-1 text-[#593D30] hover:bg-[#F7F1E9] transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#F7F1E9] flex items-center justify-center text-[#8E8172]">
                <ShoppingBag className="w-8 h-8 stroke-1 text-[#A85F49]" />
              </div>
              <h3 className="text-base font-serif-display text-[#593D30]">Your Cart is Empty</h3>
              <p className="text-xs text-[#8E8172] max-w-xs leading-relaxed">
                Explore our handcrafted 925 sterling silver rings and anklets to discover your signature piece.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-[#8E4D3A] transition-colors shadow-xs"
              >
                Discover Collections
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer / Totals & Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#D7C5AF]/40 bg-[#F7F1E9] space-y-4">
            {/* Coupon Code Input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-[#FFFFFF] border border-[#2E7D32]/40 rounded-xs text-xs">
                  <div className="flex items-center gap-2 text-[#2E7D32] font-medium">
                    <Check className="w-4 h-4" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied</span>
                  </div>
                  <button
                    onClick={onRemoveCoupon}
                    className="text-[#8E8172] hover:text-red-700 text-[11px] underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8172]" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Coupon or Promo Code"
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-[#A85F49]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-3.5 py-1.5 bg-[#593D30] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-[#A85F49] disabled:opacity-40 transition-colors"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>{couponError}</span>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#8E8172]">
                <span>Items Subtotal ({totalItems})</span>
                <span className="font-mono tabular-nums font-medium text-[#593D30]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-[#2E7D32]">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-mono tabular-nums font-medium">
                    -{formatPrice(appliedCoupon.discountAmount || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#8E8172] text-[11px]">
                <span>Estimated Shipping & Taxes</span>
                <span>Calculated at preview</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#D7C5AF]/40 text-sm font-medium text-[#593D30]">
                <span className="font-serif-display">Subtotal</span>
                <span className="font-mono tabular-nums font-semibold text-[#A85F49]">
                  {formatPrice(subtotal - (appliedCoupon?.discountAmount || 0))}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={onProceedToCheckout}
                className="w-full py-3 px-4 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Proceed to Checkout Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex justify-between items-center text-[11px] text-[#8E8172] pt-1">
                <button
                  onClick={onClearCart}
                  className="hover:text-red-700 transition-colors underline"
                >
                  Clear Shopping Bag
                </button>
                <span>Solid 925 Guaranteed</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
