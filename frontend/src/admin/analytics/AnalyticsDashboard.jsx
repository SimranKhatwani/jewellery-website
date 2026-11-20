import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RotateCw,
  AlertCircle,
  BarChart3,
  Check,
} from 'lucide-react';
import {
  getAnalyticsOverview,
  getAnalyticsSalesTrends,
  getAnalyticsOrders,
  getAnalyticsBestsellers,
  getAnalyticsCustomers,
  getAnalyticsPayments,
  getAnalyticsInventory,
} from '../api';

import { AnalyticsOverviewCards } from './AnalyticsOverviewCards';
import { SalesTrendChart } from './SalesTrendChart';
import { OrderDistributionChart } from './OrderDistributionChart';
import { PaymentBreakdownChart } from './PaymentBreakdownChart';
import { BestsellingProducts } from './BestsellingProducts';
import { CustomerInsights } from './CustomerInsights';
import { InventoryInsights } from './InventoryInsights';

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'last30days', label: 'Last 30 Days' },
  { id: 'thismonth', label: 'This Month' },
  { id: 'previousmonth', label: 'Previous Month' },
  { id: 'custom', label: 'Custom Range' },
];

export const AnalyticsDashboard = ({ admin, onNavigateCatalogue }) => {
  // Filter States
  const [preset, setPreset] = useState('last30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [trendGroupBy, setTrendGroupBy] = useState('day');
  const [bestsellerSort, setBestsellerSort] = useState('units');

  // Data States
  const [overviewData, setOverviewData] = useState({
    financials: { netSales: 0, grossOrderValue: 0, collectedRevenue: 0, pendingPaymentAmount: 0, averageOrderValue: 0 },
    orders: { totalOrders: 0, validOrders: 0, cancelledOrders: 0, totalUnitsSold: 0 },
    customers: { totalUniqueCustomers: 0, newCustomers: 0, returningCustomers: 0 },
  });
  const [salesTrends, setSalesTrends] = useState([]);
  const [orderDistribution, setOrderDistribution] = useState([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [bestsellers, setBestsellers] = useState([]);
  const [customerInsights, setCustomerInsights] = useState({
    totalUniqueCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    newCustomerPercentage: 0,
    returningCustomerPercentage: 0,
    frequency: { oneOrder: 0, twoOrders: 0, threeToFive: 0, moreThanFive: 0 },
  });
  const [paymentBreakdown, setPaymentBreakdown] = useState({ byMethod: [], byStatus: [] });
  const [inventoryInsights, setInventoryInsights] = useState({
    totalProducts: 0,
    totalTrackedStockUnits: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    unknownCount: 0,
    lowStockItems: [],
    outOfStockItems: [],
    unknownInventoryItems: [],
  });

  // Status & Error
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Load All Analytics
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const filterParams = {
      preset,
      ...(preset === 'custom' && customStart && customEnd
        ? { startDate: customStart, endDate: customEnd }
        : {}),
    };

    try {
      const [
        overviewRes,
        trendsRes,
        ordersRes,
        bestsellersRes,
        customersRes,
        paymentsRes,
        inventoryRes,
      ] = await Promise.all([
        getAnalyticsOverview(filterParams),
        getAnalyticsSalesTrends({ ...filterParams, groupBy: trendGroupBy }),
        getAnalyticsOrders(filterParams),
        getAnalyticsBestsellers({ ...filterParams, sortBy: bestsellerSort, limit: 8 }),
        getAnalyticsCustomers(filterParams),
        getAnalyticsPayments(filterParams),
        getAnalyticsInventory(),
      ]);

      if (overviewRes.currencySymbol) {
        setCurrencySymbol(overviewRes.currencySymbol);
      }

      setOverviewData(overviewRes.data);
      setSalesTrends(trendsRes.data?.trends || []);
      setOrderDistribution(ordersRes.data?.distribution || []);
      setTotalOrdersCount(ordersRes.data?.totalOrders || 0);
      setBestsellers(bestsellersRes.data?.products || []);
      setCustomerInsights(customersRes.data || null);
      setPaymentBreakdown({
        byMethod: paymentsRes.data?.byMethod || [],
        byStatus: paymentsRes.data?.byStatus || [],
      });
      setInventoryInsights(inventoryRes.data || null);
    } catch (err) {
      console.error('Analytics load error:', err?.message || err);
      setErrorMsg(err.message || 'Failed to load store analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [preset, customStart, customEnd, trendGroupBy, bestsellerSort]);

  // Initial load and reload when filters change
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) {
      alert('Start date cannot be after end date.');
      return;
    }
    setPreset('custom');
    setIsCustomModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#D7C5AF]/40 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#A85F49]" />
            <h1 className="text-2xl font-serif text-[#2D2A26] tracking-wide">
              Store Analytics & Intelligence
            </h1>
          </div>
          <p className="text-xs text-[#8E8172] mt-1">
            Authoritative financial performance, live revenue flow and catalogue demand for {admin?.storeName || 'AURELLE'}
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <div className="inline-flex rounded-xs border border-[#D7C5AF]/60 p-0.5 bg-[#FFFFFF] shadow-2xs text-xs">
            {DATE_PRESETS.map((p) => {
              if (p.id === 'custom') {
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setIsCustomModalOpen(true)}
                    className={`px-3 py-1 font-medium transition-colors rounded-xs flex items-center gap-1.5 ${
                      preset === 'custom'
                        ? 'bg-[#A85F49] text-[#FFFFFF]'
                        : 'text-[#8E8172] hover:text-[#2D2A26]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {preset === 'custom' && customStart && customEnd
                        ? `${customStart.slice(5)} to ${customEnd.slice(5)}`
                        : 'Custom'}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1 font-medium transition-colors rounded-xs ${
                    preset === p.id
                      ? 'bg-[#A85F49] text-[#FFFFFF]'
                      : 'text-[#8E8172] hover:text-[#2D2A26]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={isLoading}
            className="p-2 rounded-xs border border-[#D7C5AF]/60 bg-[#FFFFFF] text-[#2D2A26] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RotateCw className={`w-4 h-4 text-[#A85F49] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xs bg-[#FDF2F2] border border-[#F87171]/40 flex items-start justify-between text-xs text-[#991B1B]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            className="underline font-medium hover:text-[#7F1D1D]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2A26]/40 backdrop-blur-2xs p-4">
          <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs shadow-xl max-w-sm w-full p-5">
            <h3 className="text-sm font-semibold text-[#2D2A26] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#A85F49]" />
              Select Custom Date Range
            </h3>
            <form onSubmit={handleApplyCustomDates} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] text-[#8E8172] uppercase font-medium">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-1.5 border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8E8172] uppercase font-medium">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-1.5 border border-[#D7C5AF] rounded-xs text-xs focus:outline-hidden focus:border-[#A85F49]"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#D7C5AF]/30">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#8E8172] hover:text-[#2D2A26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#A85F49] text-[#FFFFFF] rounded-xs hover:bg-[#8D4B37] font-medium"
                >
                  Apply Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Overview Financials & KPI Cards */}
      <AnalyticsOverviewCards
        financials={overviewData?.financials}
        orders={overviewData?.orders}
        customers={overviewData?.customers}
        currencySymbol={currencySymbol}
      />

      {/* 2. Sales Trend Interactive SVG Chart */}
      <SalesTrendChart
        trends={salesTrends}
        groupBy={trendGroupBy}
        onGroupByChange={setTrendGroupBy}
        currencySymbol={currencySymbol}
        isLoading={isLoading}
      />

      {/* 3. Distribution & Retention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrderDistributionChart
          distribution={orderDistribution}
          totalOrders={totalOrdersCount}
          currencySymbol={currencySymbol}
        />
        <CustomerInsights customers={customerInsights} />
      </div>

      {/* 4. Payment Settlement & Inventory Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentBreakdownChart
          byMethod={paymentBreakdown.byMethod}
          byStatus={paymentBreakdown.byStatus}
          currencySymbol={currencySymbol}
        />
        <InventoryInsights
          inventory={inventoryInsights}
          onNavigateCatalogue={onNavigateCatalogue}
        />
      </div>

      {/* 5. Bestselling Products from Order Snapshots */}
      <BestsellingProducts
        products={bestsellers}
        sortBy={bestsellerSort}
        onSortChange={setBestsellerSort}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
