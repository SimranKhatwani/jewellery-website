import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  Clock,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Shield,
  MapPin,
  Package,
  TrendingUp,
  Filter
} from 'lucide-react';
import {
  getAdminCustomers,
  getAdminCustomerDetails,
  updateAdminCustomer
} from './api';
import { formatPrice } from '../services/storefrontService';

export const CustomersManager = ({ admin }) => {
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    registeredCount: 0,
    guestCount: 0,
    totalRevenue: 0,
    totalOrders: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all'); // 'all' | 'registered' | 'guest'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Customer Detail Modal / Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('purchases'); // 'purchases' | 'profile'

  // Edit / Notes state
  const [adminNotes, setAdminNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesFeedback, setNotesFeedback] = useState(null);

  // Fetch customers list
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminCustomers({
        search: searchTerm,
        customerType: customerTypeFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: 20,
      });

      setCustomers(data.customers || []);
      setPagination({
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 20,
        totalPages: data.totalPages || 1,
      });
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load customers from database.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, customerTypeFilter, statusFilter, sortBy, sortOrder, pagination.page]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Open Customer Details Drawer
  const handleOpenDetails = async (customerId) => {
    setSelectedCustomerId(customerId);
    setIsLoadingDetails(true);
    setDetailsError(null);
    setNotesFeedback(null);
    try {
      const data = await getAdminCustomerDetails(customerId);
      setCustomerDetails(data.customer);
      setAdminNotes(data.customer?.notes || '');
    } catch (err) {
      setDetailsError(err.message || 'Failed to load customer profile details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Close Customer Details Drawer
  const handleCloseDetails = () => {
    setSelectedCustomerId(null);
    setCustomerDetails(null);
    setDetailsError(null);
    setNotesFeedback(null);
  };

  // Save Notes
  const handleSaveNotes = async () => {
    if (!selectedCustomerId) return;
    setIsSavingNotes(true);
    setNotesFeedback(null);
    try {
      await updateAdminCustomer(selectedCustomerId, { notes: adminNotes });
      setNotesFeedback({ type: 'success', message: 'Customer notes saved successfully.' });
      loadCustomers();
    } catch (err) {
      setNotesFeedback({ type: 'error', message: err.message || 'Failed to update notes.' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle Customer Status
  const handleToggleStatus = async () => {
    if (!customerDetails) return;
    const newStatus = customerDetails.status === 'active' ? 'inactive' : 'active';
    try {
      await updateAdminCustomer(customerDetails._id, { status: newStatus });
      setCustomerDetails((prev) => ({ ...prev, status: newStatus }));
      loadCustomers();
    } catch (err) {
      setDetailsError(err.message || 'Failed to change customer status.');
    }
  };

  // Helper: check if customer is guest
  const isGuestCustomer = (c) => {
    if (!c) return false;
    return Boolean(c.isGuest || !c.userId || c.tags?.includes('guest'));
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D7C5AF]/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#A85F49]">
              Customer Management Module
            </span>

          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-light text-[#593D30] tracking-wide mt-1">
            Store Customers & Purchases
          </h1>
          <p className="text-xs text-[#8E8172] mt-0.5">
            Synchronized directly from the MongoDB <code className="text-[#593D30] font-mono">customers</code> collection — accounts with created IDs, order history, and guest checkout shoppers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadCustomers}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider font-medium text-[#593D30] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#D7C5AF] rounded-xs transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh customers list from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/60 shadow-2xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-sans uppercase tracking-wider font-medium">Total Customers</span>
            <Users className="w-4 h-4 text-[#A85F49]" />
          </div>
          <div className="font-serif text-2xl font-light text-[#593D30]">
            {metrics.totalCustomers.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8E8172] mt-1">
            Recorded in store database
          </div>
        </div>

        {/* Registered Members */}
        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/60 shadow-2xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-sans uppercase tracking-wider font-medium">Registered Accounts</span>
            <UserCheck className="w-4 h-4 text-[#2E6B47]" />
          </div>
          <div className="font-serif text-2xl font-light text-[#2E6B47]">
            {metrics.registeredCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8E8172] mt-1">
            Created an account ID
          </div>
        </div>

        {/* Guest Shoppers */}
        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/60 shadow-2xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-sans uppercase tracking-wider font-medium">Guest Shoppers</span>
            <UserX className="w-4 h-4 text-[#A85F49]" />
          </div>
          <div className="font-serif text-2xl font-light text-[#A85F49]">
            {metrics.guestCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8E8172] mt-1">
            Orders made without account
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/60 shadow-2xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-sans uppercase tracking-wider font-medium">Customer Spend</span>
            <TrendingUp className="w-4 h-4 text-[#593D30]" />
          </div>
          <div className="font-serif text-2xl font-light text-[#593D30]">
            {formatPrice(metrics.totalRevenue)}
          </div>
          <div className="text-[11px] text-[#8E8172] mt-1">
            Across {metrics.totalOrders.toLocaleString()} purchases
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/60 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers by name, email, or phone number..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] placeholder-[#8E8172] focus:outline-none focus:border-[#A85F49] focus:bg-[#FFFFFF] transition-colors"
            />
          </div>

          {/* Account Type Tabs */}
          <div className="flex items-center border border-[#D7C5AF] rounded-xs overflow-hidden bg-[#FAF7F2] p-0.5">
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-xs transition-colors ${customerTypeFilter === 'all'
                  ? 'bg-[#593D30] text-[#FFFFFF]'
                  : 'text-[#8E8172] hover:text-[#593D30]'
                }`}
            >
              All ({metrics.totalCustomers})
            </button>
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('registered')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 ${customerTypeFilter === 'registered'
                  ? 'bg-[#593D30] text-[#FFFFFF]'
                  : 'text-[#8E8172] hover:text-[#593D30]'
                }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Registered ({metrics.registeredCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('guest')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 ${customerTypeFilter === 'guest'
                  ? 'bg-[#593D30] text-[#FFFFFF]'
                  : 'text-[#8E8172] hover:text-[#593D30]'
                }`}
            >
              <UserX className="w-3 h-3" />
              <span>Guests ({metrics.guestCount})</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Status</option>
            <option value="inactive">Inactive Status</option>
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="totalSpent-desc">Highest Total Spend</option>
            <option value="totalOrders-desc">Most Purchases</option>
            <option value="name-asc">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 bg-[#FBEBE8] border border-[#EAC4BD] rounded-xs flex items-center gap-3 text-xs text-[#A85F49]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Customer List Table */}
      <div className="bg-[#FFFFFF] rounded-xs border border-[#D7C5AF]/60 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F1E9] border-b border-[#D7C5AF]/60 text-[11px] font-sans uppercase tracking-wider text-[#8E8172]">
                <th className="py-3 px-4 font-semibold">Customer Identity</th>
                <th className="py-3 px-4 font-semibold">Account Type</th>
                <th className="py-3 px-4 font-semibold text-center">Purchases</th>
                <th className="py-3 px-4 font-semibold text-right">Lifetime Spend</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">First Seen / ID Created</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7C5AF]/30 text-xs text-[#593D30]">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#8E8172]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A85F49]" />
                    <span>Synchronizing customers from database...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#8E8172]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#593D30]" />
                    <p className="font-serif text-sm text-[#593D30]">No customers found</p>
                    <p className="text-xs text-[#8E8172] mt-0.5">
                      {searchTerm ? 'Try adjusting your search criteria.' : 'Customer records will populate when customers register an ID or make a purchase.'}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isGuest = isGuestCustomer(c);
                  return (
                    <tr
                      key={c._id}
                      onClick={() => handleOpenDetails(c._id)}
                      className="hover:bg-[#FAF7F2] transition-colors cursor-pointer group"
                    >
                      {/* Customer Identity with Tag in Front */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          {/* Avatar Circle */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium uppercase ${isGuest ? 'bg-[#F5EBE1] text-[#A85F49]' : 'bg-[#EBF3ED] text-[#2E6B47]'
                            }`}>
                            {(c.name || c.email || 'C')[0]}
                          </div>

                          <div>
                            {/* Name with GUEST / MEMBER Tag IN FRONT */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isGuest ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#F5EBE1] text-[#A85F49] border border-[#D7C5AF]/60">
                                  <UserX className="w-2.5 h-2.5" />
                                  <span>GUEST</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#EBF3ED] text-[#2E6B47] border border-[#C5DDCB]">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  <span>MEMBER</span>
                                </span>
                              )}
                              <span className="font-serif font-medium text-sm text-[#593D30] group-hover:text-[#A85F49] transition-colors">
                                {c.name || 'Store Customer'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-[11px] text-[#8E8172]">
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3 h-3 opacity-70" />
                                <span>{c.email}</span>
                              </span>
                              {c.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-3 h-3 opacity-70" />
                                  <span>{c.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Type */}
                      <td className="py-3.5 px-4">
                        {isGuest ? (
                          <div>
                            <span className="text-xs text-[#8E8172]">Guest Shopper</span>
                            <span className="block text-[10px] text-[#8E8172]/80">No account created</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs text-[#2E6B47] font-medium">Registered Member</span>
                            <span className="block text-[10px] text-[#8E8172]">Active user ID</span>
                          </div>
                        )}
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#593D30]">
                          <ShoppingBag className="w-3 h-3 text-[#A85F49]" />
                          <span>{c.totalOrders || 0}</span>
                        </span>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3.5 px-4 text-right font-medium text-[#593D30]">
                        {formatPrice(c.totalSpent || 0)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${c.status === 'active'
                              ? 'bg-[#EBF3ED] text-[#2E6B47]'
                              : 'bg-[#F2ECE4] text-[#8E8172]'
                            }`}
                        >
                          {c.status || 'active'}
                        </span>
                      </td>

                      {/* First Seen */}
                      <td className="py-3.5 px-4 text-[11px] text-[#8E8172]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(c._id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#593D30] hover:text-[#A85F49] hover:bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/60 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Purchases</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#FAF7F2] border-t border-[#D7C5AF]/60 text-xs text-[#8E8172]">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total customers)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-2.5 py-1 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-2.5 py-1 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Purchases & Profile Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-[#593D30]/80 backdrop-blur-xs flex items-center justify-end animate-fade-in">
          <div className="bg-[#FFFFFF] w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-[#D7C5AF]/60 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 bg-[#F7F1E9] border-b border-[#D7C5AF]/60 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {customerDetails && isGuestCustomer(customerDetails) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#F5EBE1] text-[#A85F49] border border-[#D7C5AF]">
                      <UserX className="w-3 h-3" />
                      <span>GUEST CUSTOMER</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#EBF3ED] text-[#2E6B47] border border-[#C5DDCB]">
                      <UserCheck className="w-3 h-3" />
                      <span>REGISTERED MEMBER ID</span>
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#8E8172]">
                    ID: {selectedCustomerId.slice(-6).toUpperCase()}
                  </span>
                </div>

                <h2 className="font-serif text-2xl font-light text-[#593D30] tracking-wide mt-1">
                  {customerDetails?.name || 'Customer Details'}
                </h2>
                <div className="flex items-center gap-4 text-xs text-[#8E8172] mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>{customerDetails?.email}</span>
                  </span>
                  {customerDetails?.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#A85F49]" />
                      <span>{customerDetails?.phone}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                className="p-1.5 text-[#8E8172] hover:text-[#593D30] hover:bg-[#FAF7F2] rounded-xs transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Bar */}
            {customerDetails && (
              <div className="grid grid-cols-3 bg-[#FAF7F2] p-4 border-b border-[#D7C5AF]/40 text-center divide-x divide-[#D7C5AF]/40">
                <div>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#8E8172] block">Total Orders</span>
                  <span className="font-serif text-lg text-[#593D30] font-medium">
                    {customerDetails.totalOrders || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#8E8172] block">Total Spent</span>
                  <span className="font-serif text-lg text-[#593D30] font-medium">
                    {formatPrice(customerDetails.totalSpent || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#8E8172] block">Status</span>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className={`mt-0.5 inline-block px-2.5 py-0.5 text-[10px] uppercase font-semibold rounded-full transition-colors ${customerDetails.status === 'active'
                        ? 'bg-[#EBF3ED] text-[#2E6B47] hover:bg-[#DDF0E1]'
                        : 'bg-[#FBEBE8] text-[#A85F49] hover:bg-[#F7D8D3]'
                      }`}
                    title="Click to toggle active/inactive status"
                  >
                    {customerDetails.status === 'active' ? '● Active' : '○ Inactive'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab Selector */}
            <div className="flex border-b border-[#D7C5AF]/40 bg-[#FFFFFF] px-6">
              <button
                type="button"
                onClick={() => setActiveDetailTab('purchases')}
                className={`py-3 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeDetailTab === 'purchases'
                    ? 'border-[#A85F49] text-[#A85F49]'
                    : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
                  }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Purchases & Orders ({customerDetails?.orders?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('profile')}
                className={`ml-6 py-3 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeDetailTab === 'profile'
                    ? 'border-[#A85F49] text-[#A85F49]'
                    : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Profile & Notes</span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="py-20 text-center text-[#8E8172]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#A85F49]" />
                  <span>Loading customer purchases and history...</span>
                </div>
              ) : detailsError ? (
                <div className="p-4 bg-[#FBEBE8] border border-[#EAC4BD] rounded-xs text-xs text-[#A85F49]">
                  {detailsError}
                </div>
              ) : activeDetailTab === 'purchases' ? (
                /* Tab 1: Purchases & Orders List */
                <div className="space-y-4">
                  {!customerDetails?.orders || customerDetails.orders.length === 0 ? (
                    <div className="py-12 text-center bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/40 p-6">
                      <ShoppingBag className="w-8 h-8 text-[#8E8172] mx-auto mb-2 opacity-50" />
                      <p className="font-serif text-sm text-[#593D30]">No purchases on record</p>
                      <p className="text-xs text-[#8E8172] mt-1">
                        {isGuestCustomer(customerDetails)
                          ? 'This guest record has no completed orders.'
                          : 'This customer has registered their store account and is ready to place their first order.'}
                      </p>
                    </div>
                  ) : (
                    customerDetails.orders.map((order) => (
                      <div
                        key={order._id}
                        className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-4 shadow-2xs space-y-3"
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-[#D7C5AF]/30">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#593D30]">
                              {order.orderNumber}
                            </span>
                            <span className="block text-[10px] text-[#8E8172]">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${order.orderStatus === 'delivered' ? 'bg-[#EBF3ED] text-[#2E6B47]' :
                                order.orderStatus === 'shipped' ? 'bg-[#E8F1FB] text-[#295F98]' :
                                  order.orderStatus === 'cancelled' ? 'bg-[#FBEBE8] text-[#A85F49]' :
                                    'bg-[#FAF7F2] text-[#8E8172] border border-[#D7C5AF]'
                              }`}>
                              {order.orderStatus || 'pending'}
                            </span>
                            <span className="text-xs font-serif font-bold text-[#593D30]">
                              {formatPrice(order.pricing?.totalPayable || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-9 h-9 object-cover rounded-xs border border-[#D7C5AF]/40"
                                  />
                                ) : (
                                  <div className="w-9 h-9 bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs flex items-center justify-center text-[10px] text-[#8E8172]">
                                    <Package className="w-4 h-4 text-[#8E8172]" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-[#593D30]">{item.name}</p>
                                  {item.variantName && (
                                    <span className="text-[10px] text-[#8E8172] block">
                                      Size/Fit: {item.variantName}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[#8E8172]">
                                    Qty: {item.quantity} × {formatPrice(item.unitPrice || 0)}
                                  </span>
                                </div>
                              </div>
                              <span className="font-medium text-[#593D30]">
                                {formatPrice((item.quantity || 1) * (item.unitPrice || 0))}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer / Shipping Details */}
                        {order.shippingAddress && (
                          <div className="pt-2 border-t border-[#D7C5AF]/30 text-[11px] text-[#8E8172] flex items-center justify-between">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#A85F49]" />
                              <span>
                                {order.shippingAddress.city}, {order.shippingAddress.state} ({order.shippingAddress.postalCode})
                              </span>
                            </span>
                            <span className="uppercase text-[10px] font-mono tracking-wider text-[#593D30]">
                              Payment: {order.paymentMethod?.toUpperCase()} ({order.paymentStatus || 'pending'})
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Tab 2: Customer Profile & Admin Notes */
                <div className="space-y-5">
                  {/* General Info */}
                  <div className="bg-[#FAF7F2] p-4 rounded-xs border border-[#D7C5AF]/60 space-y-2.5 text-xs">
                    <h3 className="font-serif text-sm text-[#593D30] font-medium border-b border-[#D7C5AF]/40 pb-1.5">
                      Customer Profile Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#8E8172] block text-[10px] uppercase">Full Name</span>
                        <span className="font-medium text-[#593D30]">{customerDetails?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#8E8172] block text-[10px] uppercase">Email Address</span>
                        <span className="font-medium text-[#593D30]">{customerDetails?.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#8E8172] block text-[10px] uppercase">Phone Number</span>
                        <span className="font-medium text-[#593D30]">{customerDetails?.phone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-[#8E8172] block text-[10px] uppercase">Account Type</span>
                        <span className="font-medium text-[#593D30]">
                          {isGuestCustomer(customerDetails) ? 'Guest Customer (No Account)' : 'Registered Store Member'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8E8172] block text-[10px] uppercase">First Seen / Registered</span>
                        <span className="font-medium text-[#593D30]">
                          {customerDetails?.createdAt ? new Date(customerDetails.createdAt).toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8E8172] block text-[10px] uppercase">Last Order Date</span>
                        <span className="font-medium text-[#593D30]">
                          {customerDetails?.lastOrderDate ? new Date(customerDetails.lastOrderDate).toLocaleString('en-IN') : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Internal Admin Notes */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-semibold">
                      Internal Store Notes
                    </label>
                    <textarea
                      rows="4"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add private administrative notes regarding this customer (e.g. VIP client, preferred sizing, courier instructions)..."
                      className="w-full p-3 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] placeholder-[#8E8172] focus:outline-none focus:border-[#A85F49] focus:bg-[#FFFFFF] transition-colors"
                    />

                    {notesFeedback && (
                      <div className={`p-2.5 rounded-xs text-xs flex items-center gap-2 ${notesFeedback.type === 'success' ? 'bg-[#EBF3ED] text-[#2E6B47]' : 'bg-[#FBEBE8] text-[#A85F49]'
                        }`}>
                        {notesFeedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{notesFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                        className="px-4 py-2 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs transition-colors disabled:opacity-50"
                      >
                        {isSavingNotes ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-[#FAF7F2] border-t border-[#D7C5AF]/60 flex items-center justify-between text-xs text-[#8E8172]">
              <span>Customer ID: {selectedCustomerId}</span>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="px-4 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] hover:bg-[#F2ECE4] rounded-xs transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
