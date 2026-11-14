import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Receipt, 
  Truck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  User,
  Plus
} from 'lucide-react';
import { previewCheckout, fetchAddresses, createAddress, formatPrice } from '../services/storefrontService';

export const CheckoutPreviewModal = ({
  isOpen,
  onClose,
  cart,
  appliedCoupon,
  customerUser,
  onOpenAuth,
  allProducts = [],
}) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    name: customerUser ? `${customerUser.firstName || customerUser.name || ''}`.trim() : '',
    phone: customerUser?.phone || customerUser?.phoneNumber || '',
    addressLine1: '',
    addressLine2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    addressType: 'shipping',
    isDefault: true,
  });

  const [previewResult, setPreviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load addresses when customer is authenticated
  useEffect(() => {
    if (isOpen && customerUser) {
      fetchAddresses()
        .then((addrs) => {
          setAddresses(addrs);
          if (addrs.length > 0) {
            const def = addrs.find((a) => a.isDefault) || addrs[0];
            setSelectedAddressId(def._id);
          } else {
            setIsAddingNewAddress(true);
          }
        })
        .catch(() => {
          setIsAddingNewAddress(true);
        });
    }
  }, [isOpen, customerUser]);

  // Request backend checkout preview calculation
  useEffect(() => {
    if (!isOpen || !cart?.items || cart.items.length === 0) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const activeAddress = addresses.find((a) => a._id === selectedAddressId) || newAddressForm;

    previewCheckout({
      addressId: selectedAddressId || (activeAddress._id ? activeAddress._id : undefined),
      guestAddress: !selectedAddressId && !activeAddress._id ? activeAddress : undefined,
      couponCode: appliedCoupon?.code || undefined,
    })
      .then((data) => {
        if (isMounted) {
          const preview = data.checkoutPreview || data.preview || data;
          setPreviewResult(preview);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[CheckoutPreview] Live preview calculation note:', err.message);
          setError(err.message || 'Unable to prepare checkout preview.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, cart, appliedCoupon, selectedAddressId, addresses]);

  if (!isOpen) return null;

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddressForm.addressLine1 || !newAddressForm.name || !newAddressForm.phone) {
      alert('Please fill in recipient name, phone, and address line.');
      return;
    }
    if (customerUser) {
      try {
        const saved = await createAddress(newAddressForm);
        setAddresses((prev) => [saved, ...prev]);
        setSelectedAddressId(saved._id);
        setIsAddingNewAddress(false);
      } catch (err) {
        alert(err.message || 'Failed to save address');
      }
    } else {
      setIsAddingNewAddress(false);
    }
  };

  const storeCurrency = previewResult?.pricing?.currency || previewResult?.store?.currency || 'USD';
  const pricing = previewResult?.pricing;
  const items = previewResult?.items || cart?.items || [];
  const stockWarnings = previewResult?.stockWarnings || [];

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Dialog */}
      <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-xs shadow-2xl border border-[#D7C5AF]/60 overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 bg-[#F7F1E9] border-b border-[#D7C5AF]/40">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#A85F49]" />
              <h2 className="text-xl font-serif-display text-[#593D30] font-light">
                Checkout Preview & Inventory Verification
              </h2>
            </div>
            <p className="text-xs text-[#8E8172] mt-0.5">
              Authoritative pricing calculation, tenant tax assessment & stock validation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 4 Architecture Notice Banner */}
        <div className="bg-[#A85F49]/10 border-b border-[#A85F49]/20 px-6 py-3 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#A85F49] shrink-0 mt-0.5" />
          <div className="text-xs text-[#593D30]">
            <strong className="font-semibold text-[#A85F49] uppercase tracking-wider text-[11px] block">
              Phase 4 Architectural Milestone Active
            </strong>
            This screen provides verified pre-order calculation, tenant inventory check, and address management. 
            Final payment processing, order placement, and delivery tracking will occur in Phase 5.
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Customer / Guest Identity State */}
          <div className="flex items-center justify-between p-4 bg-[#F7F1E9]/60 rounded-xs border border-[#D7C5AF]/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#593D30] text-[#FFFFFF] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                {customerUser ? (
                  <div>
                    <span className="text-xs font-semibold text-[#593D30] block">
                      Signed in as {customerUser.firstName || customerUser.name || 'Valued Customer'}
                    </span>
                    <span className="text-[11px] text-[#8E8172]">{customerUser.email}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-[#593D30] block">
                      Shopping as Guest Customer
                    </span>
                    <span className="text-[11px] text-[#8E8172]">
                      Your items and delivery preferences are isolated to this session
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!customerUser && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3 py-1.5 border border-[#A85F49] text-[#A85F49] hover:bg-[#A85F49] hover:text-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs font-medium transition-colors"
              >
                Sign In / Register
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Delivery Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#D7C5AF]/30 pb-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#593D30]">
                  <MapPin className="w-4 h-4 text-[#A85F49]" />
                  <span>Delivery Address</span>
                </div>
                {customerUser && !isAddingNewAddress && (
                  <button
                    onClick={() => setIsAddingNewAddress(true)}
                    className="text-xs text-[#A85F49] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New</span>
                  </button>
                )}
              </div>

              {customerUser && addresses.length > 0 && !isAddingNewAddress ? (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr._id}
                      className={`block p-3 rounded-xs border cursor-pointer transition-all ${
                        selectedAddressId === addr._id
                          ? 'border-[#A85F49] bg-[#F7F1E9]/80 shadow-xs'
                          : 'border-[#D7C5AF]/40 hover:border-[#A85F49]/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={selectedAddressId === addr._id}
                          onChange={() => setSelectedAddressId(addr._id)}
                          className="mt-1 accent-[#A85F49]"
                        />
                        <div className="text-xs">
                          <strong className="text-[#593D30] block">{addr.name} ({addr.phone})</strong>
                          <span className="text-[#8E8172] block mt-0.5">
                            {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                          </span>
                          <span className="text-[#8E8172] block">
                            {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                /* Address Form (Guest or Add New) */
                <form onSubmit={handleSaveNewAddress} className="space-y-3 bg-[#F7F1E9]/40 p-4 rounded-xs border border-[#D7C5AF]/40 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.name}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">Contact Phone *</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.phone}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                        placeholder="+91..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#8E8172] mb-1 font-medium">Street Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      value={newAddressForm.addressLine1}
                      onChange={(e) => setNewAddressForm({ ...newAddressForm, addressLine1: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                      placeholder="House / Flat / Building, Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">City</label>
                      <input
                        type="text"
                        value={newAddressForm.city}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">State</label>
                      <input
                        type="text"
                        value={newAddressForm.state}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, state: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">Postal PIN Code</label>
                      <input
                        type="text"
                        value={newAddressForm.postalCode}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, postalCode: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">Country</label>
                      <input
                        type="text"
                        value={newAddressForm.country}
                        disabled
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF]/70 border border-[#D7C5AF] rounded-xs text-[#8E8172]"
                      />
                    </div>
                  </div>

                  {customerUser && isAddingNewAddress && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-[#A85F49] text-[#FFFFFF] rounded-xs text-xs"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(false)}
                        className="px-3 py-1.5 border border-[#D7C5AF] text-[#593D30] rounded-xs text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Right Column: Verified Order Items & Pricing Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#593D30] border-b border-[#D7C5AF]/30 pb-2">
                <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
                <span>Verified Items & Inventory</span>
              </div>

              {/* Stock Warnings Banner */}
              {stockWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Inventory Allocation Notice:</span>
                  </div>
                  {stockWarnings.map((warn, wIdx) => (
                    <p key={wIdx} className="text-[11px] text-amber-800 pl-5">
                      • {warn}
                    </p>
                  ))}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((it, idx) => {
                  const unitPrice = it.price ?? it.unitPrice ?? 0;
                  const itemTotal = it.total ?? (unitPrice * it.quantity);
                  const isUnknownInventory = it.inventoryStatus === 'unknown' || (!it.inventoryStatus && it.inStock !== false);

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-[#F7F1E9]/40 border border-[#D7C5AF]/30 rounded-xs text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <span className="font-medium text-[#593D30] block truncate">
                          {it.name || it.productId?.name || 'Artisan Jewellery'}
                        </span>
                        <span className="text-[11px] text-[#8E8172]">
                          Qty: {it.quantity} × {formatPrice(unitPrice, storeCurrency)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-medium text-[#593D30] block">
                          {formatPrice(itemTotal, storeCurrency)}
                        </span>
                        {it.inventoryStatus === 'out_of_stock' ? (
                          <span className="text-[10px] text-red-600 flex items-center gap-1 justify-end">
                            <AlertCircle className="w-3 h-3" />
                            <span>Out of stock</span>
                          </span>
                        ) : isUnknownInventory ? (
                          <span className="text-[10px] text-[#8E8172] flex items-center gap-1 justify-end">
                            <Sparkles className="w-3 h-3 text-[#A85F49]" />
                            <span>Crafted on Allocation</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#2E7D32] flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified in stock</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mathematical Summary Card (Backend Authoritative Pricing) */}
              <div className="p-4 bg-[#F7F1E9] border border-[#D7C5AF]/50 rounded-xs space-y-2 text-xs">
                <div className="flex justify-between text-[#8E8172]">
                  <span>Items Subtotal</span>
                  <span className="font-mono tabular-nums text-[#593D30]">
                    {formatPrice(pricing?.subtotal ?? cart?.subtotal, storeCurrency)}
                  </span>
                </div>

                {pricing?.discount > 0 && (
                  <div className="flex justify-between text-[#2E7D32]">
                    <span>Coupon Discount ({pricing.coupon?.code || appliedCoupon?.code})</span>
                    <span className="font-mono tabular-nums">
                      -{formatPrice(pricing.discount, storeCurrency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#8E8172]">
                  <span>Tax ({pricing?.taxRate || 'Complimentary / Inclusive'})</span>
                  <span className="font-mono tabular-nums text-[#593D30]">
                    {pricing?.taxAmount > 0
                      ? formatPrice(pricing.taxAmount, storeCurrency)
                      : 'Complimentary / Inclusive'}
                  </span>
                </div>

                <div className="flex justify-between text-[#8E8172]">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Shipping & Insurance</span>
                  </span>
                  <span className="font-mono tabular-nums text-[#593D30]">
                    {pricing?.shippingAmount > 0 ? (
                      formatPrice(pricing.shippingAmount, storeCurrency)
                    ) : (
                      <strong className="text-[#2E7D32] uppercase text-[10px]">
                        {pricing?.shippingFee || 'Complimentary Insured Delivery'}
                      </strong>
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#D7C5AF]/40 flex justify-between items-baseline text-sm font-semibold text-[#593D30]">
                  <span className="font-serif-display text-base">Authoritative Total Payable</span>
                  <span className="font-mono text-base text-[#A85F49]">
                    {formatPrice(pricing?.totalPayable ?? cart?.subtotal, storeCurrency)}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F7F1E9] border-t border-[#D7C5AF]/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-[#8E8172]">
            <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
            <span>Solid 925 Hallmark Guaranteed · 100% Insured Allocation</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#D7C5AF] text-[#593D30] hover:bg-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs font-medium transition-colors"
            >
              Modify Bag
            </button>
            <button
              onClick={() => {
                alert('Phase 4 Checkout Preview complete! Pre-order price and inventory calculations verified successfully. Phase 5 will introduce order placement and payment capture.');
                onClose();
              }}
              className="px-5 py-2 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs font-medium transition-colors shadow-xs"
            >
              Confirm Preview
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
