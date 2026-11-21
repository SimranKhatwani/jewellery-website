import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  History,
  TrendingUp,
  Percent,
  Banknote,
  ArrowRight,
  X,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
  getAdminCouponUsage,
} from './api';

export const CouponsManager = ({ admin }) => {
  const [coupons, setCoupons] = useState([]);
  const [summary, setSummary] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUsage: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive | expired
  const [typeFilter, setTypeFilter] = useState('all'); // all | percentage | fixed_amount

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null); // null for create, object for edit

  const [usageModalCoupon, setUsageModalCoupon] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  const [deleteModalCoupon, setDeleteModalCoupon] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minimumOrderAmount: '',
    maximumDiscountAmount: '',
    startDate: '',
    expiryDate: '',
    usageLimit: '',
    perCustomerUsageLimit: '1',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clipboard copy tracker
  const [copiedCode, setCopiedCode] = useState(null);

  // Permission Checks
  const userPermissions = useMemo(() => admin?.permissions || [], [admin]);
  const isSuperOrStoreAdmin = useMemo(
    () =>
      admin?.isSuperAdmin ||
      admin?.role === 'superadmin' ||
      admin?.role === 'store_admin' ||
      userPermissions.includes('*'),
    [admin, userPermissions]
  );
  const canWrite = isSuperOrStoreAdmin || userPermissions.includes('coupons:write');

  const currencySymbol = admin?.currencySymbol || '₹';

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Fetch Coupons
  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminCoupons({
        search: searchTerm,
        status: statusFilter,
        discountType: typeFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setCoupons(data.coupons || []);
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Copy code handler
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Open Create Form
  const handleOpenCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setEditingCoupon(null);
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minimumOrderAmount: '',
      maximumDiscountAmount: '',
      startDate: today,
      expiryDate: defaultExpiry,
      usageLimit: '',
      perCustomerUsageLimit: '1',
      status: 'active',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: String(coupon.discountValue || ''),
      minimumOrderAmount: coupon.minimumOrderAmount ? String(coupon.minimumOrderAmount) : '',
      maximumDiscountAmount: coupon.maximumDiscountAmount ? String(coupon.maximumDiscountAmount) : '',
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perCustomerUsageLimit: coupon.perCustomerUsageLimit ? String(coupon.perCustomerUsageLimit) : '1',
      status: coupon.status || 'active',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.code.trim()) {
      errors.code = 'Coupon code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code.trim())) {
      errors.code = 'Code must contain only letters, numbers, hyphens, and underscores';
    }

    if (!formData.discountValue || isNaN(Number(formData.discountValue)) || Number(formData.discountValue) <= 0) {
      errors.discountValue = 'Please enter a valid positive discount value';
    } else if (formData.discountType === 'percentage' && Number(formData.discountValue) > 100) {
      errors.discountValue = 'Percentage discount cannot exceed 100%';
    }

    if (!formData.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else if (formData.startDate && new Date(formData.expiryDate) <= new Date(formData.startDate)) {
      errors.expiryDate = 'Expiry date must be later than the start date';
    }

    if (formData.minimumOrderAmount !== '' && (isNaN(Number(formData.minimumOrderAmount)) || Number(formData.minimumOrderAmount) < 0)) {
      errors.minimumOrderAmount = 'Minimum order amount cannot be negative';
    }

    if (formData.maximumDiscountAmount !== '' && (isNaN(Number(formData.maximumDiscountAmount)) || Number(formData.maximumDiscountAmount) < 0)) {
      errors.maximumDiscountAmount = 'Maximum discount cannot be negative';
    }

    if (formData.usageLimit !== '' && (isNaN(parseInt(formData.usageLimit, 10)) || parseInt(formData.usageLimit, 10) < 1)) {
      errors.usageLimit = 'Usage limit must be a positive number';
    }

    if (formData.perCustomerUsageLimit !== '' && (isNaN(parseInt(formData.perCustomerUsageLimit, 10)) || parseInt(formData.perCustomerUsageLimit, 10) < 1)) {
      errors.perCustomerUsageLimit = 'Customer usage limit must be at least 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create or Edit
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minimumOrderAmount: formData.minimumOrderAmount ? Number(formData.minimumOrderAmount) : 0,
        maximumDiscountAmount: formData.maximumDiscountAmount ? Number(formData.maximumDiscountAmount) : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        expiryDate: new Date(formData.expiryDate).toISOString(),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        perCustomerUsageLimit: formData.perCustomerUsageLimit ? parseInt(formData.perCustomerUsageLimit, 10) : 1,
        status: formData.status,
      };

      if (editingCoupon) {
        await updateAdminCoupon(editingCoupon._id || editingCoupon.id, payload);
        showToast(`Coupon '${payload.code}' updated successfully.`);
      } else {
        await createAdminCoupon(payload);
        showToast(`Coupon '${payload.code}' created successfully.`);
      }

      setIsFormModalOpen(false);
      fetchCoupons();
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, submit: err.message || 'Operation failed' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (coupon) => {
    if (!canWrite) return;
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
    try {
      await toggleAdminCouponStatus(coupon._id || coupon.id, newStatus);
      showToast(`Coupon '${coupon.code}' is now ${newStatus}.`);
      fetchCoupons();
    } catch (err) {
      alert(err.message || 'Failed to update coupon status');
    }
  };

  // Open Usage History Modal
  const handleOpenUsageModal = async (coupon) => {
    setUsageModalCoupon(coupon);
    setIsLoadingUsage(true);
    try {
      const data = await getAdminCouponUsage(coupon._id || coupon.id);
      setUsageData(data.usages || []);
    } catch (err) {
      alert(err.message || 'Failed to fetch coupon usage history');
    } finally {
      setIsLoadingUsage(false);
    }
  };

  // Delete Action
  const handleDeleteCoupon = async () => {
    if (!deleteModalCoupon) return;
    setIsDeleting(true);
    try {
      await deleteAdminCoupon(deleteModalCoupon._id || deleteModalCoupon.id);
      showToast(`Coupon '${deleteModalCoupon.code}' deleted.`);
      setDeleteModalCoupon(null);
      fetchCoupons();
    } catch (err) {
      alert(err.message || 'Failed to delete coupon');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#2E7D32] text-white px-4 py-3 rounded-xs shadow-lg text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#D7C5AF]/60">
        <div>
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#A85F49] block">
            MARKETING & PROMOTIONS
          </span>
          <h1 className="font-serif text-2xl font-light text-[#593D30] tracking-wide mt-1">
            Store Coupons & Promotional Discounts
          </h1>
          <p className="text-xs text-[#8E8172] mt-0.5">
            Create, monitor, and regulate promotional discount codes with real-time checkout validation and usage tracking.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#593D30] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-[#4A3227] transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Coupon</span>
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/70 shadow-xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Coupons</span>
            <Tag className="w-4 h-4 text-[#A85F49]" />
          </div>
          <div className="text-2xl font-serif text-[#593D30]">{summary.totalCoupons}</div>
          <div className="text-[10px] text-[#8E8172] mt-1">Configured for this store</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/70 shadow-xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Codes</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="text-2xl font-serif text-[#2E7D32]">{summary.activeCoupons}</div>
          <div className="text-[10px] text-[#8E8172] mt-1">Ready for customer checkout</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/70 shadow-xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Expired</span>
            <Clock className="w-4 h-4 text-[#A85F49]" />
          </div>
          <div className="text-2xl font-serif text-[#8E8172]">{summary.expiredCoupons}</div>
          <div className="text-[10px] text-[#8E8172] mt-1">Past validity window</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/70 shadow-xs">
          <div className="flex items-center justify-between text-[#8E8172] mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Redemptions</span>
            <TrendingUp className="w-4 h-4 text-[#593D30]" />
          </div>
          <div className="text-2xl font-serif text-[#593D30]">{summary.totalUsage}</div>
          <div className="text-[10px] text-[#8E8172] mt-1">Orders with coupon applied</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xs border border-[#D7C5AF]/70 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8172]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search coupons by code or description..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F7F1E9]/50 border border-[#D7C5AF] rounded-xs text-[#593D30] placeholder:text-[#8E8172] focus:outline-none focus:border-[#A85F49]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#8E8172]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-[#F7F1E9]/50 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Discount Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#8E8172]">
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-[#F7F1E9]/50 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ({currencySymbol})</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchCoupons}
            title="Refresh List"
            className="p-2 border border-[#D7C5AF] rounded-xs hover:bg-[#F7F1E9] text-[#593D30] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/70 rounded-xs overflow-hidden shadow-xs">
        {isLoading && coupons.length === 0 ? (
          <div className="p-12 text-center text-[#8E8172] text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#A85F49]" />
            <span>Loading store promotional coupons...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-8 text-center text-red-600 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <span>{errorMsg}</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-[#D7C5AF] mx-auto mb-3" />
            <h3 className="font-serif text-base text-[#593D30] mb-1">No coupons found</h3>
            <p className="text-xs text-[#8E8172] max-w-sm mx-auto mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No promotional coupons matched your search or filter parameters.'
                : 'You have not created any promotional coupons yet. Attract shoppers by offering introductory codes.'}
            </p>
            {canWrite && !searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-[#593D30] text-[#FFFFFF] text-xs font-medium rounded-xs hover:bg-[#4A3227]"
              >
                Create First Coupon
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F1E9] text-[#593D30] font-medium border-b border-[#D7C5AF]/60 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Conditions</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7C5AF]/40 text-[#593D30]">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.expiryDate) < new Date();
                  const isPercentage = coupon.discountType === 'percentage';
                  return (
                    <tr key={coupon._id || coupon.id} className="hover:bg-[#F7F1E9]/30 transition-colors">
                      {/* Code & Description */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold tracking-wider text-[#A85F49] bg-[#F7F1E9] px-2 py-0.5 rounded-xs border border-[#D7C5AF]/60">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy Code"
                            className="text-[#8E8172] hover:text-[#593D30] transition-colors p-1"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <div className="text-[11px] text-[#8E8172] mt-0.5 max-w-[200px] truncate" title={coupon.description}>
                            {coupon.description}
                          </div>
                        )}
                      </td>

                      {/* Discount Value */}
                      <td className="py-3 px-4">
                        <div className="font-medium flex items-center gap-1">
                          {isPercentage ? (
                            <>
                              <Percent className="w-3.5 h-3.5 text-[#A85F49]" />
                              <span>{coupon.discountValue}% OFF</span>
                            </>
                          ) : (
                            <>
                              <Banknote className="w-3.5 h-3.5 text-[#2E7D32]" />
                              <span>
                                {currencySymbol}
                                {coupon.discountValue.toLocaleString('en-IN')} OFF
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-[#8E8172]">
                          {isPercentage ? 'Percentage of cart' : 'Flat deduction'}
                        </div>
                      </td>

                      {/* Conditions */}
                      <td className="py-3 px-4 text-[11px]">
                        <div>
                          <span className="text-[#8E8172]">Min Order: </span>
                          <span className="font-mono">
                            {coupon.minimumOrderAmount > 0
                              ? `${currencySymbol}${coupon.minimumOrderAmount.toLocaleString('en-IN')}`
                              : 'None'}
                          </span>
                        </div>
                        {isPercentage && coupon.maximumDiscountAmount && (
                          <div>
                            <span className="text-[#8E8172]">Max Cap: </span>
                            <span className="font-mono">
                              {currencySymbol}
                              {coupon.maximumDiscountAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4 text-[11px]">
                        <div>
                          <span className="text-[#8E8172]">Expires: </span>
                          <span className={`font-mono ${isExpired ? 'text-red-600 font-semibold' : ''}`}>
                            {new Date(coupon.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8E8172]">
                          Started: {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : 'Immediate'}
                        </div>
                      </td>

                      {/* Redemptions */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium">
                          {coupon.usedCount || 0}
                          <span className="text-[#8E8172] font-normal">
                            {' / '}
                            {coupon.usageLimit !== null ? coupon.usageLimit : '∞'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenUsageModal(coupon)}
                          className="text-[10px] text-[#A85F49] hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <History className="w-2.5 h-2.5" />
                          <span>View History</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-medium rounded-xs">
                            <Clock className="w-3 h-3" />
                            Expired
                          </span>
                        ) : coupon.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium rounded-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-medium rounded-xs">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Toggle Active Status */}
                          {canWrite && !isExpired && (
                            <button
                              onClick={() => handleToggleStatus(coupon)}
                              title={coupon.status === 'active' ? 'Deactivate Coupon' : 'Activate Coupon'}
                              className={`px-2 py-1 text-[10px] font-medium rounded-xs border transition-colors ${
                                coupon.status === 'active'
                                  ? 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {coupon.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {/* Edit */}
                          {canWrite && (
                            <button
                              onClick={() => handleOpenEditModal(coupon)}
                              title="Edit Coupon"
                              className="p-1.5 border border-[#D7C5AF] rounded-xs text-[#593D30] hover:bg-[#F7F1E9] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canWrite && (
                            <button
                              onClick={() => setDeleteModalCoupon(coupon)}
                              title="Delete Coupon"
                              className="p-1.5 border border-red-200 rounded-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT COUPON MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#593D30]/60 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs w-full max-w-xl shadow-xl max-h-[90vh] flex flex-col animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#D7C5AF]/60 flex items-center justify-between bg-[#F7F1E9]/40">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A85F49] block">
                  {editingCoupon ? 'UPDATE COUPON' : 'NEW PROMOTION'}
                </span>
                <h3 className="font-serif text-lg text-[#593D30]">
                  {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promotional Coupon'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-[#8E8172] hover:text-[#593D30] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCoupon} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {formErrors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] uppercase tracking-wider mb-1">
                    Coupon Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })
                    }
                    placeholder="e.g. WELCOME10"
                    className="w-full px-3 py-2 uppercase font-mono tracking-wider bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  {formErrors.code && <p className="text-red-600 text-[10px] mt-1">{formErrors.code}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  >
                    <option value="active">Active (Usable by customers)</option>
                    <option value="inactive">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#593D30] uppercase tracking-wider mb-1">
                  Description / Campaign Notes
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Introductory 10% discount on festive silver collection"
                  className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              {/* Discount Structure */}
              <div className="p-3 bg-[#F7F1E9]/50 border border-[#D7C5AF]/60 rounded-xs space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A85F49] block">
                  Discount Value & Type
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#593D30] mb-1">Discount Type</label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          value="percentage"
                          checked={formData.discountType === 'percentage'}
                          onChange={() => setFormData({ ...formData, discountType: 'percentage' })}
                          className="accent-[#A85F49]"
                        />
                        <span>Percentage (%)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          value="fixed_amount"
                          checked={formData.discountType === 'fixed_amount'}
                          onChange={() => setFormData({ ...formData, discountType: 'fixed_amount' })}
                          className="accent-[#A85F49]"
                        />
                        <span>Fixed Amount ({currencySymbol})</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                      Discount Value <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step={formData.discountType === 'percentage' ? '0.1' : '1'}
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        placeholder={formData.discountType === 'percentage' ? '15' : '500'}
                        className="w-full px-3 py-2 pr-8 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8172] font-medium">
                        {formData.discountType === 'percentage' ? '%' : currencySymbol}
                      </span>
                    </div>
                    {formErrors.discountValue && (
                      <p className="text-red-600 text-[10px] mt-1">{formErrors.discountValue}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                    Minimum Order Subtotal ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimumOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minimumOrderAmount: e.target.value })}
                    placeholder="0 (No minimum)"
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  {formErrors.minimumOrderAmount && (
                    <p className="text-red-600 text-[10px] mt-1">{formErrors.minimumOrderAmount}</p>
                  )}
                  <span className="text-[10px] text-[#8E8172] mt-0.5 block">
                    Customer cart must meet or exceed this amount before checkout.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                    Maximum Discount Cap ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maximumDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maximumDiscountAmount: e.target.value })}
                    placeholder="Leave empty for uncapped"
                    disabled={formData.discountType === 'fixed_amount'}
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49] disabled:opacity-50"
                  />
                  {formErrors.maximumDiscountAmount && (
                    <p className="text-red-600 text-[10px] mt-1">{formErrors.maximumDiscountAmount}</p>
                  )}
                  <span className="text-[10px] text-[#8E8172] mt-0.5 block">
                    {formData.discountType === 'percentage'
                      ? 'Cap max savings on high-value orders.'
                      : 'Fixed amount discounts are naturally capped.'}
                  </span>
                </div>
              </div>

              {/* Date Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  {formErrors.expiryDate && (
                    <p className="text-red-600 text-[10px] mt-1">{formErrors.expiryDate}</p>
                  )}
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                    Total Store Redemptions Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  {formErrors.usageLimit && (
                    <p className="text-red-600 text-[10px] mt-1">{formErrors.usageLimit}</p>
                  )}
                  <span className="text-[10px] text-[#8E8172] mt-0.5 block">
                    e.g. First 100 shoppers only.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                    Usage Limit Per Customer
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perCustomerUsageLimit}
                    onChange={(e) => setFormData({ ...formData, perCustomerUsageLimit: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-[#F7F1E9]/40 border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  {formErrors.perCustomerUsageLimit && (
                    <p className="text-red-600 text-[10px] mt-1">{formErrors.perCustomerUsageLimit}</p>
                  )}
                  <span className="text-[10px] text-[#8E8172] mt-0.5 block">
                    Restricts multiple redemptions by the same customer.
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#D7C5AF]/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-[#D7C5AF] rounded-xs text-[#593D30] hover:bg-[#F7F1E9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#593D30] text-[#FFFFFF] font-medium rounded-xs hover:bg-[#4A3227] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USAGE HISTORY MODAL */}
      {usageModalCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#593D30]/60 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col animate-fadeIn">
            <div className="p-4 sm:p-5 border-b border-[#D7C5AF]/60 flex items-center justify-between bg-[#F7F1E9]/40">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A85F49] block">
                  REDEMPTION LOG
                </span>
                <h3 className="font-serif text-lg text-[#593D30]">
                  Usage History: {usageModalCoupon.code}
                </h3>
                <p className="text-[11px] text-[#8E8172]">
                  Total Redemptions: {usageModalCoupon.usedCount || usageData.length} order(s)
                </p>
              </div>
              <button
                onClick={() => setUsageModalCoupon(null)}
                className="text-[#8E8172] hover:text-[#593D30] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto text-xs">
              {isLoadingUsage ? (
                <div className="p-8 text-center text-[#8E8172]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A85F49]" />
                  <span>Loading order redemptions...</span>
                </div>
              ) : usageData.length === 0 ? (
                <div className="p-8 text-center text-[#8E8172]">
                  <History className="w-8 h-8 text-[#D7C5AF] mx-auto mb-2" />
                  <p>No customer has redeemed this coupon yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#D7C5AF]/40">
                  {usageData.map((usage, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono font-bold text-[#593D30]">{usage.orderNumber}</div>
                        <div className="text-[11px] text-[#8E8172] mt-0.5">
                          {usage.customerName} ({usage.customerEmail})
                        </div>
                        <div className="text-[10px] text-[#8E8172]">
                          Redeemed on {new Date(usage.redeemedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-serif font-bold text-[#2E7D32]">
                          -{currencySymbol}
                          {usage.discountAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-[#8E8172]">
                          Order Total: {currencySymbol}
                          {usage.orderTotal.toLocaleString('en-IN')}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-medium uppercase px-1.5 py-0.2 bg-[#F7F1E9] border border-[#D7C5AF] rounded-xs text-[#593D30]">
                          {usage.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#D7C5AF]/60 flex justify-end">
              <button
                onClick={() => setUsageModalCoupon(null)}
                className="px-4 py-1.5 bg-[#593D30] text-[#FFFFFF] rounded-xs text-xs font-medium hover:bg-[#4A3227]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deleteModalCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#593D30]/60 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs w-full max-w-md shadow-xl p-5 animate-fadeIn">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-serif text-lg text-[#593D30]">Delete Coupon</h3>
            </div>

            {deleteModalCoupon.usedCount > 0 ? (
              <div>
                <p className="text-xs text-[#593D30] mb-3">
                  Coupon <strong className="font-mono">{deleteModalCoupon.code}</strong> has already been redeemed in{' '}
                  <strong>{deleteModalCoupon.usedCount} order(s)</strong>.
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs text-xs mb-4">
                  To protect order audit integrity and sales reporting, redeemed coupons cannot be permanently deleted.
                  You can safely <strong>deactivate</strong> the coupon instead to prevent future use.
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setDeleteModalCoupon(null)}
                    className="px-4 py-2 border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] hover:bg-[#F7F1E9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleToggleStatus(deleteModalCoupon);
                      setDeleteModalCoupon(null);
                    }}
                    className="px-4 py-2 bg-[#593D30] text-[#FFFFFF] rounded-xs text-xs font-medium hover:bg-[#4A3227]"
                  >
                    Deactivate Coupon Instead
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#593D30] mb-4">
                  Are you sure you want to permanently delete coupon{' '}
                  <strong className="font-mono text-[#A85F49]">{deleteModalCoupon.code}</strong>?
                  This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setDeleteModalCoupon(null)}
                    className="px-4 py-2 border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] hover:bg-[#F7F1E9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCoupon}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-[#FFFFFF] rounded-xs text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
