/**
 * @file AnalyticsOverviewCards.jsx
 * @description Administrative KPI cards displaying high-level financial metrics:
 * Net Sales, Collected Revenue, Pending Payments, Average Order Value (AOV), and customer volumes.
 */

import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react';

/**
 * AnalyticsOverviewCards Component
 * @param {Object} props
 * @param {Object} props.financials - Revenue and sales figures
 * @param {Object} props.orders - Order count and velocity metrics
 * @param {Object} props.customers - Customer acquisition figures
 * @param {string} [props.currencySymbol='₹'] - Store currency symbol
 */
export const AnalyticsOverviewCards = ({
  financials,
  orders,
  customers,
  currencySymbol = '₹',
}) => {
  const safeFinancials = financials || {};
  const safeOrders = orders || {};
  const safeCustomers = customers || {};

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const cards = [
    {
      title: 'Net Sales',
      value: formatMoney(safeFinancials.netSales),
      subtitle: `Gross: ${formatMoney(safeFinancials.grossOrderValue)}`,
      icon: DollarSign,
      accent: 'text-[#A85F49]',
      bgAccent: 'bg-[#A85F49]/10',
    },
    {
      title: 'Collected Revenue',
      value: formatMoney(safeFinancials.collectedRevenue),
      subtitle: 'Confirmed paid orders',
      icon: CheckCircle2,
      accent: 'text-[#2E7D32]',
      bgAccent: 'bg-[#2E7D32]/10',
    },
    {
      title: 'Pending Payments',
      value: formatMoney(safeFinancials.pendingPaymentAmount),
      subtitle: 'CARD / UPI awaiting collection',
      icon: Clock,
      accent: 'text-[#B8860B]',
      bgAccent: 'bg-[#B8860B]/10',
    },
    {
      title: 'Average Order Value',
      value: formatMoney(safeFinancials.averageOrderValue),
      subtitle: `${safeOrders.validOrders || 0} valid orders`,
      icon: TrendingUp,
      accent: 'text-[#4A6B82]',
      bgAccent: 'bg-[#4A6B82]/10',
    },
    {
      title: 'Total Orders',
      value: (safeOrders.totalOrders || 0).toLocaleString(),
      subtitle: `${safeOrders.validOrders || 0} valid • ${safeOrders.cancelledOrders || 0} cancelled`,
      icon: ShoppingBag,
      accent: 'text-[#8E44AD]',
      bgAccent: 'bg-[#8E44AD]/10',
    },
    {
      title: 'Total Customers',
      value: (safeCustomers.totalUniqueCustomers || 0).toLocaleString(),
      subtitle: `${safeCustomers.newCustomers || 0} new • ${safeCustomers.returningCustomers || 0} returning`,
      icon: Users,
      accent: 'text-[#34495E]',
      bgAccent: 'bg-[#34495E]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-5 shadow-xs transition-all hover:border-[#A85F49]/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium tracking-wide uppercase text-[#8E8172]">
                  {card.title}
                </p>
                <h3 className="mt-2 text-2xl font-light text-[#2D2A26] tracking-tight">
                  {card.value}
                </h3>
                <p className="mt-1 text-xs text-[#8E8172]">{card.subtitle}</p>
              </div>
              <div className={`p-2.5 rounded-xs ${card.bgAccent} ${card.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
