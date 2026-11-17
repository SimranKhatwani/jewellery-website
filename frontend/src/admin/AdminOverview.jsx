import React, { useState, useEffect } from 'react';
import {
  Package,
  Receipt,
  Bell,
  Store,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { getAdminOrders } from './api';
import { formatPrice, getStoreCurrency } from '../services/storefrontService';

export const AdminOverview = ({
  admin,
  stats = { total: 0, published: 0, unpublished: 0, bestsellers: 0, rings: 0, anklets: 0 },
  adminUnreadCount = 0,
  onNavigateTab,
  onViewStorefront,
  onOpenCreateProduct,
}) => {
  const [ordersSummary, setOrdersSummary] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const loadRecentOrdersData = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await getAdminOrders({ limit: 5 });
      setRecentOrders(data.orders || []);
      if (data.metrics) {
        setOrdersSummary({
          totalOrders: data.metrics.totalOrders || 0,
          pendingOrders: data.metrics.pendingOrders || 0,
          totalRevenue: data.metrics.totalRevenue || 0,
        });
      }
    } catch (err) {
      console.warn('Overview orders fetch error:', err.message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadRecentOrdersData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Store Health Banner */}
      <div className="bg-[#FFFFFF] p-6 border border-[#D7C5AF]/60 rounded-xs shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-[#A85F49]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Store Online & Operational</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#593D30] mt-1">
            Welcome back, {admin?.name || 'Store Administrator'}
          </h2>
          <p className="text-xs text-[#8E8172] mt-1 font-sans">
            Here is your live catalogue inventory, order fulfillment queue, and store alerts.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadRecentOrdersData}
            disabled={isLoadingOrders}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] text-xs uppercase tracking-wider rounded-xs hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5"
            title="Refresh overview metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={onViewStorefront}
            className="px-3.5 py-2 bg-[#FAF7F2] border border-[#D7C5AF] hover:border-[#A85F49] text-[#593D30] text-xs font-medium rounded-xs transition-colors flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5 text-[#A85F49]" />
            <span>Storefront</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateProduct}
            className="px-4 py-2 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-[0.16em] font-medium rounded-xs transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Primary Key Performance Metrics (Real Data Only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div
          onClick={() => onNavigateTab('catalogue')}
          className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs hover:border-[#A85F49]/60 cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider">
              Total Products
            </span>
            <Package className="w-4 h-4 text-[#8E8172] group-hover:text-[#A85F49] transition-colors" />
          </div>
          <div className="font-serif text-3xl font-light text-[#593D30] mt-2">
            {stats.total}
          </div>
          <div className="mt-2 text-[11px] text-[#8E8172] flex items-center gap-1.5">
            <span className="text-emerald-700 font-medium">{stats.published} live</span>
            <span>•</span>
            <span>{stats.unpublished} draft</span>
          </div>
        </div>

        {/* Total Orders */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs hover:border-[#A85F49]/60 cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider">
              Total Orders
            </span>
            <Receipt className="w-4 h-4 text-[#8E8172] group-hover:text-[#A85F49] transition-colors" />
          </div>
          <div className="font-serif text-3xl font-light text-[#593D30] mt-2">
            {ordersSummary.totalOrders}
          </div>
          <div className="mt-2 text-[11px] text-[#8E8172] flex items-center gap-1.5">
            {ordersSummary.pendingOrders > 0 ? (
              <span className="text-[#A85F49] font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ordersSummary.pendingOrders} awaiting fulfillment
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                All orders processed
              </span>
            )}
          </div>
        </div>

        {/* Store Sales Revenue */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs hover:border-[#A85F49]/60 cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider">
              Orders Volume
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl font-light text-[#593D30] mt-2 truncate">
            {formatPrice(ordersSummary.totalRevenue, ordersSummary.currency || getStoreCurrency())}
          </div>
          <div className="mt-2 text-[11px] text-[#8E8172]">
            Authoritative order calculations
          </div>
        </div>

        {/* Real-Time Notifications */}
        <div
          onClick={() => onNavigateTab('notifications')}
          className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs hover:border-[#A85F49]/60 cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider">
              In-App Alerts
            </span>
            <Bell className="w-4 h-4 text-[#8E8172] group-hover:text-[#A85F49] transition-colors" />
          </div>
          <div className="font-serif text-3xl font-light text-[#A85F49] mt-2">
            {adminUnreadCount}
          </div>
          <div className="mt-2 text-[11px] text-[#8E8172]">
            {adminUnreadCount > 0 ? 'Unread alerts pending review' : 'All alerts caught up'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Customer Orders */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-normal text-[#593D30]">
                Recent Orders
              </h3>
              <p className="text-[11px] text-[#8E8172]">
                Latest customer and guest orders placed on your storefront
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-[#A85F49] hover:underline font-medium flex items-center gap-1"
            >
              <span>View all orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-xs text-[#8E8172]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#A85F49] mb-2" />
              Loading real-time order records...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8E8172] border border-dashed border-[#D7C5AF]/60 rounded-xs">
              <Receipt className="w-6 h-6 mx-auto text-[#D7C5AF] mb-2" />
              No customer orders placed yet.
            </div>
          ) : (
            <div className="divide-y divide-[#D7C5AF]/30">
              {recentOrders.map((ord) => (
                <div
                  key={ord._id}
                  onClick={() => onNavigateTab('orders')}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-[#FAF7F2]/60 px-2 rounded-xs cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#593D30]">
                        #{ord.orderNumber}
                      </span>
                      {ord.customerInfo?.isGuest && (
                        <span className="px-1.5 py-0.2 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-mono rounded-xs">
                          Guest
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 bg-[#FAF7F2] text-[#8E8172] text-[9px] uppercase font-mono rounded-xs">
                        {ord.orderStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8E8172] truncate mt-0.5">
                      {ord.customerInfo?.name || 'Customer'} • {ord.items?.length || 0} items
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-medium text-xs text-[#593D30]">
                      {formatPrice(ord.pricing?.totalPayable, ord.pricing?.currency)}
                    </div>
                    <div className="text-[10px] text-[#8E8172] font-mono">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Action Shortcuts */}
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs p-5">
            <h3 className="font-serif text-base font-normal text-[#593D30] mb-3">
              Management Shortcuts
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('catalogue')}
                className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F7F1E9] border border-[#D7C5AF]/40 rounded-xs text-xs text-[#593D30] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-[#A85F49]" />
                  <span className="font-medium">Catalogue Products</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8E8172] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F7F1E9] border border-[#D7C5AF]/40 rounded-xs text-xs text-[#593D30] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-[#A85F49]" />
                  <span className="font-medium">Fulfillment Queue</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8E8172] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('notifications')}
                className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F7F1E9] border border-[#D7C5AF]/40 rounded-xs text-xs text-[#593D30] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-[#A85F49]" />
                  <span className="font-medium">Store Alerts</span>
                </div>
                {adminUnreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 bg-[#A85F49] text-[#FFFFFF] text-[9px] font-mono font-bold rounded-full">
                    {adminUnreadCount}
                  </span>
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-[#8E8172] group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              <button
                type="button"
                onClick={onViewStorefront}
                className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F7F1E9] border border-[#D7C5AF]/40 rounded-xs text-xs text-[#593D30] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-[#A85F49]" />
                  <span className="font-medium">Live Website</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#8E8172]" />
              </button>
            </div>
          </div>

          {/* Category Breakdown (Real Data) */}
          <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs p-5">
            <h3 className="font-serif text-base font-normal text-[#593D30] mb-2">
              Category Distribution
            </h3>
            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8E8172]">Fine Rings</span>
                <span className="font-mono font-medium text-[#593D30]">{stats.rings}</span>
              </div>
              <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#A85F49] h-full rounded-full"
                  style={{ width: `${stats.total ? (stats.rings / stats.total) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#8E8172]">Anklets</span>
                <span className="font-mono font-medium text-[#593D30]">{stats.anklets}</span>
              </div>
              <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#593D30] h-full rounded-full"
                  style={{ width: `${stats.total ? (stats.anklets / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
