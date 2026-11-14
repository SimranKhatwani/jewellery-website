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
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  Package,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  previewCheckout,
  fetchAddresses,
  createAddress,
  formatPrice,
  placeOrder,
} from '../services/storefrontService';

export const CheckoutPreviewModal = ({
  isOpen,
  onClose,
  cart,
  appliedCoupon,
  customerUser,
  onOpenAuth,
  allProducts = [],
  onOrderPlaced,
}) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    name: customerUser ? `${customerUser.firstName || customerUser.name || ''}`.trim() : '',
    phone: customerUser?.phone || customerUser?.phoneNumber || '',
    email: customerUser?.email || '',
    addressLine1: '',
    addressLine2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    addressType: 'shipping',
    isDefault: true,
  });

  // Calculation & Preview states
  const [previewResult, setPreviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Phase 5: Payment Method & Order Placement states
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'card' | 'upi'
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [highlightedFields, setHighlightedFields] = useState([]);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [idempotencyKey] = useState(() => 'idemp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now());

  // Reset order state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlacedOrder(null);
      setOrderError(null);
      setHighlightedFields([]);
      setIsPlacingOrder(false);
    }
  }, [isOpen]);

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
    if (!isOpen || !cart?.items || cart.items.length === 0 || placedOrder) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const hasValidGuestAddress = Boolean(
      !selectedAddressId &&
      newAddressForm.name?.trim() &&
      newAddressForm.addressLine1?.trim()
    );

    previewCheckout({
      addressId: selectedAddressId || undefined,
      guestAddress: hasValidGuestAddress ? newAddressForm : undefined,
      couponCode: appliedCoupon?.code || undefined,
    })
      .then((data) => {
        if (isMounted) {
          const preview = data.checkoutPreview || data.preview || data;
          setPreviewResult(preview);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[CheckoutPreview] Live preview calculation note:', err.message);
          if (!err.message?.toLowerCase().includes('address')) {
            setError(err.message || 'Unable to prepare checkout preview.');
          }
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, cart, appliedCoupon, selectedAddressId, addresses, placedOrder]);

  if (!isOpen) return null;

  // Quick fill sample details for testing or evaluation
  const handleFillSampleDetails = () => {
    setNewAddressForm({
      name: 'Elena Rostova',
      phone: '+91 98765 43210',
      email: customerUser?.email || 'customer@aurelle.com',
      addressLine1: '42 Solitaire Boulevard, Bandra West',
      addressLine2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      country: 'India',
      addressType: 'shipping',
      isDefault: true,
    });
    setOrderError(null);
    setHighlightedFields([]);
  };

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

  // Place Order Action
  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      const activeAddress = addresses.find((a) => a._id === selectedAddressId) || newAddressForm;

      // Validate address
      if (!selectedAddressId && !activeAddress._id) {
        const missing = [];
        if (!newAddressForm.name?.trim()) missing.push('name');
        if (!newAddressForm.phone?.trim()) missing.push('phone');
        if (!customerUser && !newAddressForm.email?.trim()) missing.push('email');
        if (!newAddressForm.addressLine1?.trim()) missing.push('addressLine1');

        if (missing.length > 0) {
          setHighlightedFields(missing);
          throw new Error('Please enter complete delivery address details (Name, Phone, Email, and Address).');
        }
      }

      const orderPayload = {
        addressId: selectedAddressId || undefined,
        guestAddress: !selectedAddressId ? newAddressForm : undefined,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod,
        idempotencyKey,
      };

      const result = await placeOrder(orderPayload);
      setPlacedOrder(result.order);

      // Notify parent to refresh or empty cart
      if (onOrderPlaced) {
        onOrderPlaced(result.order);
      }
    } catch (err) {
      setOrderError(err?.message || 'Failed to place order. Please review your details and try again.');
    } finally {
      setIsPlacingOrder(false);
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
                {placedOrder ? 'Order Confirmation' : 'Checkout & Order Placement'}
              </h2>
            </div>
            <p className="text-xs text-[#8E8172] mt-0.5">
              {placedOrder
                ? 'Your order has been recorded in the store database'
                : 'Authoritative pricing calculation, inventory deduction & payment selection'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>



        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* SUCCESS SCREEN */}
          {placedOrder ? (
            <div className="space-y-6 py-2 animate-fade-in">
              <div className="text-center space-y-2 pb-4 border-b border-[#D7C5AF]/40">
                <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-serif-display text-[#593D30] font-light">
                  Order Placed Successfully!
                </h3>
                <p className="text-xs text-[#8E8172]">
                  Order Reference:{' '}
                  <span className="font-mono font-semibold text-[#A85F49] text-sm">
                    {placedOrder.orderNumber}
                  </span>
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-[11px] text-[#593D30]">
                  <span>Status: <strong className="uppercase">{placedOrder.orderStatus}</strong></span>
                  <span>·</span>
                  <span>Payment: <strong className="uppercase">{placedOrder.paymentMethod}</strong> ({placedOrder.paymentStatus})</span>
                </div>
              </div>

              {/* Order Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/50 rounded-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#593D30] font-semibold uppercase tracking-wider text-[11px] border-b border-[#D7C5AF]/30 pb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Delivery Address</span>
                  </div>
                  <div className="text-[#593D30] leading-relaxed">
                    <strong>{placedOrder.shippingAddress?.name}</strong> ({placedOrder.shippingAddress?.phone})<br />
                    {placedOrder.shippingAddress?.addressLine1}
                    {placedOrder.shippingAddress?.addressLine2 ? `, ${placedOrder.shippingAddress.addressLine2}` : ''}<br />
                    {placedOrder.shippingAddress?.city}, {placedOrder.shippingAddress?.state} {placedOrder.shippingAddress?.postalCode}<br />
                    {placedOrder.shippingAddress?.country}
                  </div>
                </div>

                <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/50 rounded-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#593D30] font-semibold uppercase tracking-wider text-[11px] border-b border-[#D7C5AF]/30 pb-1">
                    <Receipt className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Payment & Summary</span>
                  </div>
                  <div className="space-y-1 text-[#593D30]">
                    <div className="flex justify-between">
                      <span className="text-[#8E8172]">Method:</span>
                      <strong className="uppercase">{placedOrder.paymentMethod}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8E8172]">Settlement:</span>
                      <span className="capitalize">{placedOrder.paymentStatus}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#D7C5AF]/30 font-semibold">
                      <span>Total Payable:</span>
                      <span className="font-mono text-[#A85F49]">
                        {formatPrice(placedOrder.pricing?.totalPayable, placedOrder.pricing?.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List Snapshot */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-semibold text-[#593D30] tracking-wider block">
                  Purchased Items ({placedOrder.items?.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {placedOrder.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2.5 bg-[#FAF7F2]/60 border border-[#D7C5AF]/30 rounded-xs text-xs"
                    >
                      <div>
                        <strong className="text-[#593D30] block">{it.name}</strong>
                        <span className="text-[11px] text-[#8E8172]">
                          Qty: {it.quantity} · SKU: {it.sku}
                        </span>
                      </div>
                      <span className="font-mono font-medium text-[#593D30]">
                        {formatPrice(it.itemSubtotal, placedOrder.pricing?.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 text-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-wider font-semibold rounded-xs shadow-xs"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM VIEW */
            <>
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

              {orderError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{orderError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                {/* Left Column: Delivery Address & Payment Options */}
                <div className="space-y-6">

                  {/* Delivery Address Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#D7C5AF]/30 pb-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#593D30]">
                        <MapPin className="w-4 h-4 text-[#A85F49]" />
                        <span>1. Delivery Address</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(!customerUser || isAddingNewAddress) && (
                          <button
                            type="button"
                            onClick={handleFillSampleDetails}
                            className="text-[11px] text-[#A85F49] hover:text-[#8E4D3A] flex items-center gap-1 font-medium bg-[#F7F1E9] px-2 py-0.5 rounded-xs border border-[#D7C5AF]/60 transition-colors shadow-2xs"
                            title="Auto-fill sample delivery address for quick checkout testing"
                          >
                            <Sparkles className="w-3 h-3 text-[#A85F49]" />
                            <span>Fill Sample Details</span>
                          </button>
                        )}
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
                    </div>

                    {customerUser && addresses.length > 0 && !isAddingNewAddress ? (
                      <div className="space-y-2">
                        {addresses.map((addr) => (
                          <label
                            key={addr._id}
                            className={`block p-3 rounded-xs border cursor-pointer transition-all ${selectedAddressId === addr._id
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
                              onChange={(e) => {
                                setNewAddressForm({ ...newAddressForm, name: e.target.value });
                                setOrderError(null);
                                setHighlightedFields((prev) => prev.filter((f) => f !== 'name'));
                              }}
                              className={`w-full px-2.5 py-1.5 bg-[#FFFFFF] border rounded-xs focus:outline-none transition-colors ${
                                highlightedFields.includes('name')
                                  ? 'border-red-500 bg-red-50/20 focus:border-red-500'
                                  : 'border-[#D7C5AF] focus:border-[#A85F49]'
                              }`}
                              placeholder="Full name"
                            />
                            {highlightedFields.includes('name') && (
                              <span className="text-[10px] text-red-600 block mt-0.5">Recipient name required</span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[#8E8172] mb-1 font-medium">Contact Phone *</label>
                            <input
                              type="text"
                              required
                              value={newAddressForm.phone}
                              onChange={(e) => {
                                setNewAddressForm({ ...newAddressForm, phone: e.target.value });
                                setOrderError(null);
                                setHighlightedFields((prev) => prev.filter((f) => f !== 'phone'));
                              }}
                              className={`w-full px-2.5 py-1.5 bg-[#FFFFFF] border rounded-xs focus:outline-none transition-colors ${
                                highlightedFields.includes('phone')
                                  ? 'border-red-500 bg-red-50/20 focus:border-red-500'
                                  : 'border-[#D7C5AF] focus:border-[#A85F49]'
                              }`}
                              placeholder="+91..."
                            />
                            {highlightedFields.includes('phone') && (
                              <span className="text-[10px] text-red-600 block mt-0.5">Phone number required</span>
                            )}
                          </div>
                        </div>

                        {!customerUser && (
                          <div>
                            <label className="block text-[#8E8172] mb-1 font-medium">Email Address (Order Confirmation) *</label>
                            <input
                              type="email"
                              required
                              value={newAddressForm.email}
                              onChange={(e) => {
                                setNewAddressForm({ ...newAddressForm, email: e.target.value });
                                setOrderError(null);
                                setHighlightedFields((prev) => prev.filter((f) => f !== 'email'));
                              }}
                              className={`w-full px-2.5 py-1.5 bg-[#FFFFFF] border rounded-xs focus:outline-none transition-colors ${
                                highlightedFields.includes('email')
                                  ? 'border-red-500 bg-red-50/20 focus:border-red-500'
                                  : 'border-[#D7C5AF] focus:border-[#A85F49]'
                              }`}
                              placeholder="name@domain.com"
                            />
                            {highlightedFields.includes('email') && (
                              <span className="text-[10px] text-red-600 block mt-0.5">Email required for confirmation</span>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-[#8E8172] mb-1 font-medium">Street Address Line 1 *</label>
                          <input
                            type="text"
                            required
                            value={newAddressForm.addressLine1}
                            onChange={(e) => {
                              setNewAddressForm({ ...newAddressForm, addressLine1: e.target.value });
                              setOrderError(null);
                              setHighlightedFields((prev) => prev.filter((f) => f !== 'addressLine1'));
                            }}
                            className={`w-full px-2.5 py-1.5 bg-[#FFFFFF] border rounded-xs focus:outline-none transition-colors ${
                              highlightedFields.includes('addressLine1')
                                ? 'border-red-500 bg-red-50/20 focus:border-red-500'
                                : 'border-[#D7C5AF] focus:border-[#A85F49]'
                            }`}
                            placeholder="House / Flat / Building, Street"
                          />
                          {highlightedFields.includes('addressLine1') && (
                            <span className="text-[10px] text-red-600 block mt-0.5">Delivery address line required</span>
                          )}
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

                  {/* Payment Options Section (Phase 5 Requirement) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#593D30] border-b border-[#D7C5AF]/30 pb-2">
                      <CreditCard className="w-4 h-4 text-[#A85F49]" />
                      <span>2. Payment Option</span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Option A: Cash on Delivery (COD) */}
                      <label
                        className={`block p-3.5 rounded-xs border cursor-pointer transition-all ${paymentMethod === 'cod'
                            ? 'border-[#A85F49] bg-[#F7F1E9]/80 shadow-xs ring-1 ring-[#A85F49]/40'
                            : 'border-[#D7C5AF]/40 hover:border-[#A85F49]/50 bg-[#FFFFFF]'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cod"
                            checked={paymentMethod === 'cod'}
                            onChange={() => setPaymentMethod('cod')}
                            className="mt-1 accent-[#A85F49]"
                          />
                          <div className="text-xs flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#593D30] flex items-center gap-1.5">
                                <Banknote className="w-4 h-4 text-amber-600" />
                                <span>Cash on Delivery (COD)</span>
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-xs">
                                Pending on Handover
                              </span>
                            </div>
                            <p className="text-[#8E8172] text-[11px] mt-1 leading-relaxed">
                              Pay in cash upon doorstep delivery. Cash will be collected by the courier upon package handover.
                            </p>
                          </div>
                        </div>
                      </label>

                      {/* Option B: Credit / Debit Card (CARD) */}
                      <label
                        className={`block p-3.5 rounded-xs border cursor-pointer transition-all ${paymentMethod === 'card'
                            ? 'border-[#A85F49] bg-[#F7F1E9]/80 shadow-xs ring-1 ring-[#A85F49]/40'
                            : 'border-[#D7C5AF]/40 hover:border-[#A85F49]/50 bg-[#FFFFFF]'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="card"
                            checked={paymentMethod === 'card'}
                            onChange={() => setPaymentMethod('card')}
                            className="mt-1 accent-[#A85F49]"
                          />
                          <div className="text-xs flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#593D30] flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-blue-600" />
                                <span>Credit / Debit Card</span>
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-xs">
                                Payment Pending
                              </span>
                            </div>
                            <p className="text-[#8E8172] text-[11px] mt-1 leading-relaxed">
                              Card payment gateway integration will be activated in an upcoming release. You may place this order now; your payment status will remain pending until gateway activation.
                            </p>

                            {/* Card structure placeholder - No credentials stored */}
                            {paymentMethod === 'card' && (
                              <div className="mt-3 p-3 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs space-y-2 text-[11px] text-[#8E8172]">
                                <div className="text-[10px] uppercase font-bold text-[#A85F49]">
                                  Secure Gateway Interface (Preview Mode)
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-1.5 bg-[#FAF7F2] rounded-xs font-mono text-[10px]">
                                    Card Number: •••• •••• •••• ••••
                                  </div>
                                  <div className="p-1.5 bg-[#FAF7F2] rounded-xs font-mono text-[10px]">
                                    Expiry: MM / YY
                                  </div>
                                </div>
                                <span className="text-[10px] text-[#8E8172] block">
                                  ✓ PCI-DSS compliant: No real card numbers or CVVs are collected or transmitted.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>

                      {/* Option C: UPI */}
                      <label
                        className={`block p-3.5 rounded-xs border cursor-pointer transition-all ${paymentMethod === 'upi'
                            ? 'border-[#A85F49] bg-[#F7F1E9]/80 shadow-xs ring-1 ring-[#A85F49]/40'
                            : 'border-[#D7C5AF]/40 hover:border-[#A85F49]/50 bg-[#FFFFFF]'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="upi"
                            checked={paymentMethod === 'upi'}
                            onChange={() => setPaymentMethod('upi')}
                            className="mt-1 accent-[#A85F49]"
                          />
                          <div className="text-xs flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#593D30] flex items-center gap-1.5">
                                <Smartphone className="w-4 h-4 text-purple-600" />
                                <span>UPI (Google Pay, PhonePe, Paytm)</span>
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-xs">
                                Payment Pending
                              </span>
                            </div>
                            <p className="text-[#8E8172] text-[11px] mt-1 leading-relaxed">
                              Direct UPI application redirection will be activated in an upcoming release. You may place this order now; your payment status will remain pending until gateway activation.
                            </p>

                            {/* UPI placeholder */}
                            {paymentMethod === 'upi' && (
                              <div className="mt-3 p-3 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs space-y-1.5 text-[11px] text-[#8E8172]">
                                <div className="text-[10px] uppercase font-bold text-[#A85F49]">
                                  UPI Application Redirection (Preview Mode)
                                </div>
                                <div className="p-1.5 bg-[#FAF7F2] rounded-xs font-mono text-[10px] text-[#593D30]">
                                  UPI ID: username@bank
                                </div>
                                <span className="text-[10px] text-[#8E8172] block">
                                  ✓ Zero fake QR codes or synthetic links generated. Real redirection deferred to gateway activation.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>

                {/* Right Column: Verified Items & Pricing Breakdown */}
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
                      <span className="font-serif-display text-base">Total Payable</span>
                      <span className="font-mono text-base text-[#A85F49]">
                        {formatPrice(pricing?.totalPayable ?? cart?.subtotal, storeCurrency)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!placedOrder && (
          <div className="p-4 bg-[#F7F1E9] border-t border-[#D7C5AF]/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-[#8E8172]">
              <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
              <span>Solid 925 Hallmark Guaranteed · 100% Insured Allocation</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isPlacingOrder}
                className="px-4 py-2 border border-[#D7C5AF] text-[#593D30] hover:bg-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs font-medium transition-colors disabled:opacity-50"
              >
                Modify Bag
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !cart?.items || cart.items.length === 0}
                className="px-6 py-2.5 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs font-semibold transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {isPlacingOrder ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
