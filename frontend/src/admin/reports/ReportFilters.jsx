/**
 * @file ReportFilters.jsx
 * @description Administrative report filter bar providing date presets (Today, 7D, 30D, Month),
 * custom calendar pickers, text search, order/payment status dropdowns, and inventory flags.
 */

import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

/**
 * ReportFilters Component
 * @param {Object} props
 * @param {Object} props.category - Active report category configuration
 * @param {Object} props.filters - Active filter values
 * @param {Function} props.onChangeFilter - Property filter update handler
 * @param {Function} props.onApply - Filter execution callback
 * @param {boolean} props.isLoading - Whether a query is in-flight
 */
export const ReportFilters = ({
  category,
  filters,
  onChangeFilter,
  onApply,
  isLoading,
}) => {
  const isDateReport = category.hasDateFilter;

  const handleTextChange = (e) => {
    onChangeFilter('search', e.target.value);
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#D7C5AF]/30">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#A85F49]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2D2A26]">
            Filter {category.name}
          </span>
        </div>

        {/* Date presets if supported */}
        {isDateReport && (
          <div className="inline-flex rounded-xs border border-[#D7C5AF]/60 p-0.5 bg-[#FFFFFF] text-[11px]">
            {[
              { id: 'today', label: 'Today' },
              { id: 'last7days', label: '7D' },
              { id: 'last30days', label: '30D' },
              { id: 'thismonth', label: 'This Month' },
              { id: 'previousmonth', label: 'Last Month' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChangeFilter('preset', p.id)}
                className={`px-2.5 py-0.5 font-medium transition-colors rounded-xs ${
                  filters.preset === p.id
                    ? 'bg-[#A85F49] text-[#FFFFFF]'
                    : 'text-[#8E8172] hover:text-[#2D2A26]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Search Input */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8E8172]" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={handleTextChange}
              placeholder={
                category.id === 'products' || category.id === 'inventory'
                  ? 'Search by name or SKU...'
                  : 'Search order #, customer, email...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
            />
          </div>
        </div>

        {/* Custom Date Range if active */}
        {isDateReport && filters.preset === 'custom' && (
          <>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onChangeFilter('startDate', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onChangeFilter('endDate', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
              />
            </div>
          </>
        )}

        {/* Category-Specific Dropdowns */}
        {(category.id === 'sales' || category.id === 'orders') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
              Order Status
            </label>
            <select
              value={filters.orderStatus || 'all'}
              onChange={(e) => onChangeFilter('orderStatus', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {(category.id === 'sales' || category.id === 'orders' || category.id === 'payments') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
              Payment Method
            </label>
            <select
              value={filters.paymentMethod || 'all'}
              onChange={(e) => onChangeFilter('paymentMethod', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
            >
              <option value="all">All Methods</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="card">Credit / Debit Card</option>
              <option value="upi">UPI</option>
            </select>
          </div>
        )}

        {(category.id === 'sales' || category.id === 'orders' || category.id === 'payments') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
              Payment Status
            </label>
            <select
              value={filters.paymentStatus || 'all'}
              onChange={(e) => onChangeFilter('paymentStatus', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        )}

        {category.id === 'products' && (
          <>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                Category
              </label>
              <select
                value={filters.category || 'all'}
                onChange={(e) => onChangeFilter('category', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
              >
                <option value="all">All Categories</option>
                <option value="rings">Rings</option>
                <option value="necklaces">Necklaces</option>
                <option value="earrings">Earrings</option>
                <option value="bracelets">Bracelets</option>
                <option value="brooches">Brooches</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                Catalogue Status
              </label>
              <select
                value={filters.isPublished || 'all'}
                onChange={(e) => onChangeFilter('isPublished', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
              >
                <option value="all">All Statuses</option>
                <option value="true">Active / Published</option>
                <option value="false">Draft / Hidden</option>
              </select>
            </div>
          </>
        )}

        {(category.id === 'products' || category.id === 'inventory') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
              Inventory Status
            </label>
            <select
              value={filters.inventoryStatus || 'all'}
              onChange={(e) => onChangeFilter('inventoryStatus', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
            >
              <option value="all">All Inventory States</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="unknown">Untracked / Unknown</option>
            </select>
          </div>
        )}

        {category.id === 'customers' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8172] font-medium mb-1">
              Account Type
            </label>
            <select
              value={filters.customerType || 'all'}
              onChange={(e) => onChangeFilter('customerType', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
            >
              <option value="all">All Customers</option>
              <option value="registered">Registered Members</option>
              <option value="guest">Guest Customers</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onApply}
          disabled={isLoading}
          className="px-4 py-1.5 bg-[#A85F49] text-[#FFFFFF] rounded-xs text-xs font-medium hover:bg-[#8D4B37] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Generating Report...' : 'Apply Filters & Refresh'}
        </button>
      </div>
    </div>
  );
};
