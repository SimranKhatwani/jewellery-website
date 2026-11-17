import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Package,
  Receipt,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  User,
  MapPin,
  Calendar
} from 'lucide-react';
import {
  getAdminOrders,
  getAdminOrderDetails,
  updateAdminOrderStatus,
  cancelAdminOrder,
} from './api';
import { formatPrice, getStoreCurrency } from '../services/storefrontService';

export const OrdersManager = ({ admin }) => {
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Selected Order for Details View
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Status Update state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Load orders from backend
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminOrders({
        search: searchTerm,
        orderStatus: statusFilter,
        paymentMethod: paymentMethodFilter,
        paymentStatus: paymentStatusFilter,
        page: pagination.page,
        limit: 20,
      });

      setOrders(data.orders);
      setPagination(data.pagination);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to connect to backend orders database.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, paymentMethodFilter, paymentStatusFilter, pagination.page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Open order details modal
  const handleViewOrder = async (orderId) => {
    setIsDetailsLoading(true);
    setDetailsError(null);
    setUpdateError(null);
    try {
      const fullOrder = await getAdminOrderDetails(orderId);
      setSelectedOrder(fullOrder);
    } catch (err) {
      setDetailsError(err?.message || 'Failed to load order details.');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Update order status
  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder) return;
    setStatusUpdating(true);
    setUpdateError(null);
    try {
      const updated = await updateAdminOrderStatus(selectedOrder._id, newStatus);
      setSelectedOrder(updated);
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      loadOrders(); // Refresh metrics
    } catch (err) {
      setUpdateError(err?.message || 'Failed to update order status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    const reason = window.prompt('Please enter a cancellation reason:', 'Cancelled by Store Admin');
    if (reason === null) return; // User pressed cancel

    setStatusUpdating(true);
    setUpdateError(null);
    try {
      const updated = await cancelAdminOrder(selectedOrder._id, reason);
      setSelectedOrder(updated);
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      loadOrders();
    } catch (err) {
      setUpdateError(err?.message || 'Failed to cancel order');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setPaymentStatusFilter('all');
  };

  // Helper for Payment Method Badge
  const renderPaymentMethodBadge = (method) => {
    const m = (method || '').toLowerCase();
    switch (m) {
      case 'cod':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Banknote className="w-3 h-3 text-amber-600" />
            COD
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
            <CreditCard className="w-3 h-3 text-blue-600" />
            CARD
          </span>
        );
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
            <Smartphone className="w-3 h-3 text-purple-600" />
            UPI
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-800 border border-gray-200">
            {method}
          </span>
        );
    }
  };

  // Helper for Order Status Badge
  const renderOrderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Package className="w-3 h-3 text-indigo-600" />
            Processing
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-600" />
            Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-green-50 text-green-800 border border-green-200">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-semibold uppercase tracking-wider bg-gray-50 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Helper for Payment Status Badge
  const renderPaymentStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-800 border border-green-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="w-2.5 h-2.5 text-red-600" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-light text-[#593D30]">
            Store Orders & Fulfillment
          </h1>
          <p className="text-xs text-[#8E8172] mt-1 font-sans">
            Real-time multi-tenant customer orders, COD tracking, and payment verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            disabled={isLoading}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] text-xs uppercase tracking-wider rounded-xs hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 shadow-xs"
            title="Refresh orders from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">Total Orders</span>
          <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">{metrics.totalOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#A85F49] tracking-wider block">Pending</span>
          <span className="font-serif text-2xl font-light text-[#A85F49] mt-1 block">{metrics.pendingOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#593D30] tracking-wider block">Confirmed</span>
          <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">{metrics.confirmedOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">Processing</span>
          <span className="font-serif text-2xl font-light text-indigo-700 mt-1 block">{metrics.processingOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider block">Shipped</span>
          <span className="font-serif text-2xl font-light text-purple-700 mt-1 block">{metrics.shippedOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-green-700 tracking-wider block">Delivered</span>
          <span className="font-serif text-2xl font-light text-green-700 mt-1 block">{metrics.deliveredOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider block">Cancelled</span>
          <span className="font-serif text-2xl font-light text-red-700 mt-1 block">{metrics.cancelledOrders}</span>
        </div>
        <div className="bg-[#FFFFFF] p-3.5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">Gross Sales</span>
          <span className="font-serif text-xl font-light text-[#593D30] mt-1 block truncate">
            {formatPrice(metrics.totalRevenue)}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xs text-red-700 text-xs flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={loadOrders} className="underline font-semibold ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Toolbar: Search & Filters */}
      <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order number, customer, SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Order Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#8E8172]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#A85F49]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#8E8172]">Payment:</span>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#A85F49]"
            >
              <option value="all">All Methods</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="card">Card (Payment Pending)</option>
              <option value="upi">UPI (Payment Pending)</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#8E8172]">Settlement:</span>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#A85F49]"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'all' || paymentMethodFilter !== 'all' || paymentStatusFilter !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#A85F49] hover:underline px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[#8E8172] text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#A85F49] mb-3" />
            <span>Loading store orders from database...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#D7C5AF] text-[#8E8172] flex items-center justify-center mx-auto">
              <Package className="w-6 h-6 text-[#A85F49]" />
            </div>
            <h3 className="font-serif text-lg font-light text-[#593D30]">No Orders Found</h3>
            <p className="text-xs text-[#8E8172] max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || paymentMethodFilter !== 'all'
                ? 'No orders match your active filter criteria. Try adjusting your search or clearing filters.'
                : 'No customer orders have been placed through this store yet. Newly placed customer orders will appear here automatically.'}
            </p>
            {(searchTerm || statusFilter !== 'all' || paymentMethodFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1.5 bg-[#593D30] text-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#D7C5AF]/60 text-[11px] uppercase tracking-wider text-[#8E8172] font-semibold">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7C5AF]/40">
                {orders.map((o) => {
                  const currency = o.pricing?.currency || getStoreCurrency();
                  const dateFormatted = new Date(o.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const itemCount = (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer group"
                      onClick={() => handleViewOrder(o._id)}
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#593D30]">
                        <span className="group-hover:text-[#A85F49] transition-colors">
                          {o.orderNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#8E8172] whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#593D30] block">
                          {o.customerInfo?.name || 'Customer'}
                        </span>
                        <span className="text-[11px] text-[#8E8172] block truncate max-w-[160px]">
                          {o.customerInfo?.email}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <span className="text-[#593D30] font-medium block">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-[10px] text-[#8E8172] block truncate max-w-[150px]">
                          {o.items?.map((it) => it.name).join(', ')}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPaymentMethodBadge(o.paymentMethod)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPaymentStatusBadge(o.paymentStatus)}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#593D30] whitespace-nowrap">
                        {formatPrice(o.pricing?.totalPayable, currency)}
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderOrderStatusBadge(o.orderStatus)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(o._id);
                          }}
                          className="px-2.5 py-1 text-xs border border-[#D7C5AF] text-[#593D30] hover:border-[#A85F49] hover:text-[#A85F49] rounded-xs transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#593D30]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-xs shadow-2xl border border-[#D7C5AF]/60 overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 bg-[#FAF7F2] border-b border-[#D7C5AF]/50">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#A85F49]" />
                  <h2 className="text-xl font-serif text-[#593D30] font-light">
                    Order Details: <span className="font-mono font-semibold">{selectedOrder.orderNumber}</span>
                  </h2>
                </div>
                <p className="text-xs text-[#8E8172] mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()} · Scoped to active store
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              
              {/* Order Status Control Strip */}
              <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">
                    Current Order Status
                  </span>
                  <div className="flex items-center gap-3">
                    {renderOrderStatusBadge(selectedOrder.orderStatus)}
                    {renderPaymentStatusBadge(selectedOrder.paymentStatus)}
                    {renderPaymentMethodBadge(selectedOrder.paymentMethod)}
                  </div>
                </div>

                {/* Permitted Status Actions */}
                <div className="flex items-center gap-2">
                  {selectedOrder.orderStatus === 'pending' && (
                    <button
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange('confirmed')}
                      className="px-3 py-1.5 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] font-medium rounded-xs transition-colors"
                    >
                      Confirm Order
                    </button>
                  )}
                  {selectedOrder.orderStatus === 'confirmed' && (
                    <button
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange('processing')}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-[#FFFFFF] font-medium rounded-xs transition-colors"
                    >
                      Mark as Processing
                    </button>
                  )}
                  {selectedOrder.orderStatus === 'processing' && (
                    <button
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange('shipped')}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-[#FFFFFF] font-medium rounded-xs transition-colors flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Mark as Shipped
                    </button>
                  )}
                  {selectedOrder.orderStatus === 'shipped' && (
                    <button
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange('delivered')}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-[#FFFFFF] font-medium rounded-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark as Delivered {selectedOrder.paymentMethod === 'cod' && '(Record COD Paid)'}
                    </button>
                  )}

                  {!['shipped', 'delivered', 'cancelled'].includes(selectedOrder.orderStatus) && (
                    <button
                      disabled={statusUpdating}
                      onClick={handleCancelOrder}
                      className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-xs transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {updateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-red-700 text-xs">
                  {updateError}
                </div>
              )}

              {/* Grid 2-col: Customer & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Details */}
                <div className="p-4 bg-[#FFFFFF] border border-[#D7C5AF]/50 rounded-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#593D30] font-semibold text-xs uppercase tracking-wider border-b border-[#D7C5AF]/30 pb-1.5">
                    <User className="w-4 h-4 text-[#A85F49]" />
                    <span>Customer Information</span>
                  </div>
                  <div>
                    <span className="text-[#8E8172] block text-[11px]">Recipient Name:</span>
                    <strong className="text-[#593D30]">{selectedOrder.customerInfo?.name}</strong>
                  </div>
                  <div>
                    <span className="text-[#8E8172] block text-[11px]">Email Address:</span>
                    <span className="text-[#593D30]">{selectedOrder.customerInfo?.email}</span>
                  </div>
                  <div>
                    <span className="text-[#8E8172] block text-[11px]">Contact Phone:</span>
                    <span className="text-[#593D30]">{selectedOrder.customerInfo?.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8E8172]">Account Type: </span>
                    <span className="text-[11px] text-[#A85F49] font-medium">
                      {selectedOrder.customerInfo?.isGuest ? 'Guest Checkout' : 'Registered Member'}
                    </span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="p-4 bg-[#FFFFFF] border border-[#D7C5AF]/50 rounded-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#593D30] font-semibold text-xs uppercase tracking-wider border-b border-[#D7C5AF]/30 pb-1.5">
                    <MapPin className="w-4 h-4 text-[#A85F49]" />
                    <span>Delivery Address</span>
                  </div>
                  <div className="text-[#593D30] leading-relaxed">
                    <strong>{selectedOrder.shippingAddress?.name}</strong> ({selectedOrder.shippingAddress?.phone})<br />
                    {selectedOrder.shippingAddress?.addressLine1}
                    {selectedOrder.shippingAddress?.addressLine2 ? `, ${selectedOrder.shippingAddress.addressLine2}` : ''}<br />
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}<br />
                    {selectedOrder.shippingAddress?.country}
                  </div>
                </div>
              </div>

              {/* Ordered Items List */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#593D30] font-semibold text-xs uppercase tracking-wider border-b border-[#D7C5AF]/30 pb-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
                  <span>Purchased Items Snapshot ({selectedOrder.items?.length})</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedOrder.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-[#FAF7F2]/60 border border-[#D7C5AF]/40 rounded-xs"
                    >
                      <div className="flex items-center gap-3">
                        {it.primaryImage && (
                          <img
                            src={it.primaryImage}
                            alt={it.name}
                            className="w-10 h-10 object-cover rounded-xs border border-[#D7C5AF]/50 bg-[#FFFFFF]"
                          />
                        )}
                        <div>
                          <strong className="text-[#593D30] block">{it.name}</strong>
                          <span className="text-[11px] text-[#8E8172]">
                            SKU: {it.sku} {it.variantName ? `· ${it.variantName}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-medium text-[#593D30] block">
                          {formatPrice(it.itemSubtotal, selectedOrder.pricing?.currency)}
                        </span>
                        <span className="text-[11px] text-[#8E8172]">
                          Qty: {it.quantity} × {formatPrice(it.unitPrice, selectedOrder.pricing?.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown Snapshot */}
              <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-1.5">
                <div className="flex justify-between text-[#8E8172]">
                  <span>Items Subtotal</span>
                  <span className="font-mono text-[#593D30]">
                    {formatPrice(selectedOrder.pricing?.subtotal, selectedOrder.pricing?.currency)}
                  </span>
                </div>

                {selectedOrder.pricing?.discount > 0 && (
                  <div className="flex justify-between text-[#2E7D32]">
                    <span>Coupon Discount ({selectedOrder.pricing?.coupon?.code})</span>
                    <span className="font-mono">
                      -{formatPrice(selectedOrder.pricing.discount, selectedOrder.pricing?.currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#8E8172]">
                  <span>Tax ({selectedOrder.pricing?.taxRate || 'Complimentary / Inclusive'})</span>
                  <span className="font-mono text-[#593D30]">
                    {selectedOrder.pricing?.taxAmount > 0
                      ? formatPrice(selectedOrder.pricing.taxAmount, selectedOrder.pricing?.currency)
                      : 'Complimentary / Inclusive'}
                  </span>
                </div>

                <div className="flex justify-between text-[#8E8172]">
                  <span>Shipping Fee</span>
                  <span className="font-mono text-[#593D30]">
                    {selectedOrder.pricing?.shippingAmount > 0
                      ? formatPrice(selectedOrder.pricing.shippingAmount, selectedOrder.pricing?.currency)
                      : 'Complimentary Insured Delivery'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#D7C5AF]/40 flex justify-between text-sm font-semibold text-[#593D30]">
                  <span>Total Payable</span>
                  <span className="font-mono text-base text-[#A85F49]">
                    {formatPrice(selectedOrder.pricing?.totalPayable, selectedOrder.pricing?.currency)}
                  </span>
                </div>
              </div>

              {/* Cancellation Audit Notice if Cancelled */}
              {selectedOrder.cancellation?.isCancelled && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-xs text-red-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Order Cancellation Record:</span>
                  </div>
                  <p className="text-[11px] text-red-700 pl-5">
                    Reason: {selectedOrder.cancellation.reason || 'None specified'}
                  </p>
                  <p className="text-[10px] text-red-600 pl-5">
                    Inventory Restored: {selectedOrder.cancellation.inventoryRestored ? 'Yes' : 'No'} · Cancelled At: {new Date(selectedOrder.cancellation.cancelledAt).toLocaleString()}
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF7F2] border-t border-[#D7C5AF]/50 flex items-center justify-between">
              <div className="text-[11px] text-[#8E8172]">
                Database Record ID: <span className="font-mono">{selectedOrder._id}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-[#593D30] text-[#FFFFFF] text-xs uppercase tracking-wider rounded-xs font-medium"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
