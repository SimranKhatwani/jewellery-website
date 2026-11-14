import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  LogOut, 
  MapPin, 
  Lock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Package,
  Clock,
  ChevronRight
} from 'lucide-react';
import { 
  fetchCustomerProfile, 
  updateCustomerProfile, 
  changeCustomerPassword, 
  fetchAddresses, 
  createAddress, 
  deleteAddress, 
  customerLogout,
  fetchCustomerOrders,
  cancelCustomerOrder,
  formatPrice
} from '../services/storefrontService';

export const CustomerProfileModal = ({
  isOpen,
  onClose,
  customerUser,
  onUserUpdated,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'orders' | 'addresses' | 'security'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Profile Form
  const [firstName, setFirstName] = useState(customerUser?.firstName || '');
  const [lastName, setLastName] = useState(customerUser?.lastName || '');
  const [phone, setPhone] = useState(customerUser?.phone || '');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: customerUser ? `${customerUser.firstName || ''} ${customerUser.lastName || ''}`.trim() : '',
    phone: customerUser?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    addressType: 'shipping',
    isDefault: false,
  });

  useEffect(() => {
    if (customerUser) {
      setFirstName(customerUser.firstName || '');
      setLastName(customerUser.lastName || '');
      setPhone(customerUser.phone || '');
    }
  }, [customerUser]);

  useEffect(() => {
    if (isOpen && activeTab === 'addresses') {
      loadAddresses();
    } else if (isOpen && activeTab === 'orders') {
      loadOrders();
    }
  }, [isOpen, activeTab]);

  const loadAddresses = async () => {
    try {
      const addrs = await fetchAddresses();
      setAddresses(addrs);
    } catch (err) {
      console.warn('Failed to load addresses:', err);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetchCustomerOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.warn('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingOrderId(orderId);
    setError(null);
    try {
      await cancelCustomerOrder(orderId, 'Cancelled by customer via profile modal');
      setSuccess('Order has been cancelled successfully.');
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (!isOpen || !customerUser) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCustomerProfile({ firstName, lastName, phone });
      setSuccess('Profile updated successfully.');
      onUserUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await changeCustomerPassword(currentPassword, newPassword);
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await createAddress(newAddress);
      setAddresses([created, ...addresses]);
      setIsAddingAddress(false);
      setSuccess('Address added successfully.');
    } catch (err) {
      setError(err.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      await deleteAddress(id);
      setAddresses(addresses.filter((a) => a._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const handlePerformLogout = () => {
    customerLogout();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] w-full max-w-xl rounded-xs shadow-2xl border border-[#D7C5AF]/60 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-[#F7F1E9] border-b border-[#D7C5AF]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#593D30] text-[#FFFFFF] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif-display text-[#593D30]">
                {customerUser.firstName || 'Customer'} {customerUser.lastName || ''}
              </h2>
              <span className="text-xs text-[#8E8172]">{customerUser.email}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[#D7C5AF]/40 text-xs">
          <button
            onClick={() => { setActiveTab('profile'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 font-medium text-center uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#A85F49] text-[#A85F49] bg-[#FFFFFF]'
                : 'border-transparent text-[#8E8172] bg-[#F7F1E9]/30 hover:text-[#593D30]'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 font-medium text-center uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'orders'
                ? 'border-[#A85F49] text-[#A85F49] bg-[#FFFFFF]'
                : 'border-transparent text-[#8E8172] bg-[#F7F1E9]/30 hover:text-[#593D30]'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => { setActiveTab('addresses'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 font-medium text-center uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'addresses'
                ? 'border-[#A85F49] text-[#A85F49] bg-[#FFFFFF]'
                : 'border-transparent text-[#8E8172] bg-[#F7F1E9]/30 hover:text-[#593D30]'
            }`}
          >
            Address Book
          </button>
          <button
            onClick={() => { setActiveTab('security'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 font-medium text-center uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'security'
                ? 'border-[#A85F49] text-[#A85F49] bg-[#FFFFFF]'
                : 'border-transparent text-[#8E8172] bg-[#F7F1E9]/30 hover:text-[#593D30]'
            }`}
          >
            Security
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xs flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xs flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={customerUser.email}
                  className="w-full px-3 py-2 text-xs bg-[#F7F1E9]/50 border border-[#D7C5AF] rounded-xs text-[#8E8172] cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-[#8E8172] font-semibold">
                  Order History ({orders.length})
                </span>
                <button
                  onClick={loadOrders}
                  disabled={ordersLoading}
                  className="text-xs text-[#A85F49] hover:underline font-medium"
                >
                  {ordersLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {ordersLoading ? (
                <div className="py-8 text-center text-xs text-[#8E8172]">
                  Loading your orders...
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const isCancellable = order.orderStatus === 'pending' || order.orderStatus === 'confirmed';
                    return (
                      <div
                        key={order._id}
                        className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-[#D7C5AF]/30 pb-2">
                          <div>
                            <span className="font-mono font-semibold text-[#593D30] block">
                              {order.orderNumber}
                            </span>
                            <span className="text-[11px] text-[#8E8172]">
                              Placed {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                order.orderStatus === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : order.orderStatus === 'shipped'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.orderStatus === 'processing'
                                  ? 'bg-purple-100 text-purple-800'
                                  : order.orderStatus === 'confirmed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.orderStatus === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {order.orderStatus}
                            </span>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-1.5">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-[#593D30] truncate max-w-[280px]">
                                {it.quantity}x {it.name} {it.variantName ? `(${it.variantName})` : ''}
                              </span>
                              <span className="text-[#8E8172] font-mono">
                                {order.pricing?.currencySymbol || '₹'}{it.itemSubtotal}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary & Actions */}
                        <div className="pt-2 border-t border-[#D7C5AF]/30 flex items-center justify-between">
                          <div className="text-[11px] text-[#8E8172]">
                            Payment: <strong className="uppercase text-[#593D30]">{order.paymentMethod}</strong> ({order.paymentStatus})
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-[#593D30] text-xs">
                              Total: {order.pricing?.currencySymbol || '₹'}{order.pricing?.totalPayable}
                            </span>
                            {isCancellable && (
                              <button
                                onClick={() => handleCancelOrder(order._id)}
                                disabled={cancellingOrderId === order._id}
                                className="px-2.5 py-1 text-[11px] text-red-700 hover:bg-red-50 border border-red-300 rounded-xs transition-colors disabled:opacity-50"
                              >
                                {cancellingOrderId === order._id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Package className="w-8 h-8 text-[#D7C5AF] mx-auto" />
                  <p className="text-xs text-[#8E8172]">
                    No past orders found in your account.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-[#8E8172] font-semibold">
                  Saved Delivery Addresses ({addresses.length})
                </span>
                {!isAddingAddress && (
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="text-xs text-[#A85F49] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New</span>
                  </button>
                )}
              </div>

              {isAddingAddress ? (
                <form onSubmit={handleAddAddress} className="space-y-3 p-4 bg-[#F7F1E9]/60 rounded-xs border border-[#D7C5AF]/50 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">Contact Phone *</label>
                      <input
                        type="text"
                        required
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#8E8172] mb-1 font-medium">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      value={newAddress.addressLine1}
                      onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs"
                      placeholder="Street, Building"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">City</label>
                      <input
                        type="text"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">State</label>
                      <input
                        type="text"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8172] mb-1 font-medium">PIN Code</label>
                      <input
                        type="text"
                        value={newAddress.postalCode}
                        onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 py-1.5 bg-[#A85F49] text-[#FFFFFF] rounded-xs text-xs font-medium"
                    >
                      Save Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-3 py-1.5 border border-[#D7C5AF] text-[#593D30] rounded-xs text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : addresses.length > 0 ? (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className="p-3 bg-[#F7F1E9]/40 border border-[#D7C5AF]/40 rounded-xs flex items-start justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-[#593D30] block">{addr.name} ({addr.phone})</strong>
                        <span className="text-[#8E8172] block">{addr.addressLine1}</span>
                        <span className="text-[#8E8172] block">{addr.city}, {addr.state} {addr.postalCode}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="text-[#8E8172] hover:text-red-700 transition-colors p-1"
                        title="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8E8172] italic py-4 text-center">
                  No saved delivery addresses found. Add an address for expedited checkout.
                </p>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7F1E9] border-t border-[#D7C5AF]/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#8E8172]">
            <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
            <span>Storefront Customer Session</span>
          </div>

          <button
            onClick={handlePerformLogout}
            className="flex items-center gap-1.5 text-xs text-red-700 hover:text-red-900 font-medium px-3 py-1.5 rounded-xs border border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
};
