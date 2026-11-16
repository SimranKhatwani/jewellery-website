import React from 'react';
import { Layers } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Confirmation',
    bg: 'bg-[#B8860B]/15',
    text: 'text-[#B8860B]',
    bar: 'bg-[#B8860B]',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-[#2980B9]/15',
    text: 'text-[#2980B9]',
    bar: 'bg-[#2980B9]',
  },
  processing: {
    label: 'Processing / Atelier',
    bg: 'bg-[#8E44AD]/15',
    text: 'text-[#8E44AD]',
    bar: 'bg-[#8E44AD]',
  },
  shipped: {
    label: 'Dispatched / In Transit',
    bg: 'bg-[#A85F49]/15',
    text: 'text-[#A85F49]',
    bar: 'bg-[#A85F49]',
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-[#27AE60]/15',
    text: 'text-[#27AE60]',
    bar: 'bg-[#27AE60]',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-[#C0392B]/15',
    text: 'text-[#C0392B]',
    bar: 'bg-[#C0392B]',
  },
};

export const OrderDistributionChart = ({
  distribution,
  totalOrders = 0,
  currencySymbol = '₹',
}) => {
  const safeDistribution = distribution || [];
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#D7C5AF]/30">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A85F49]" />
            <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
              Order Status Distribution
            </h3>
          </div>
          <span className="text-xs text-[#8E8172]">
            Total: <span className="font-semibold text-[#2D2A26]">{totalOrders}</span> orders
          </span>
        </div>

        {/* Multi-segment distribution bar */}
        {totalOrders > 0 && (
          <div className="mt-5 h-3.5 w-full bg-[#FAF7F2] rounded-xs overflow-hidden flex border border-[#D7C5AF]/40">
            {safeDistribution.map((item) => {
              if (item.count === 0) return null;
              const cfg = STATUS_CONFIG[item.status] || { bar: 'bg-[#8E8172]' };
              return (
                <div
                  key={item.status}
                  style={{ width: `${item.percentage}%` }}
                  title={`${cfg.label}: ${item.count} orders (${item.percentage}%)`}
                  className={`${cfg.bar} transition-all duration-300 hover:opacity-90`}
                />
              );
            })}
          </div>
        )}

        {/* Detailed Breakdown List */}
        <div className="mt-5 space-y-3">
          {safeDistribution.map((item) => {
            const cfg = STATUS_CONFIG[item.status] || {
              label: item.status,
              bg: 'bg-gray-100',
              text: 'text-gray-700',
              bar: 'bg-gray-400',
            };

            return (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.bar} shrink-0`} />
                  <span className="text-[#2D2A26] font-medium truncate">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0">
                  <span className="text-[#8E8172] w-12 text-right">{item.percentage}%</span>
                  <span className="font-mono font-medium text-[#2D2A26] w-10 text-right">
                    {item.count}
                  </span>
                  <span className="text-[#8E8172] font-mono text-[11px] w-20 text-right">
                    {formatMoney(item.totalValue)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalOrders === 0 && (
        <div className="py-8 text-center text-xs text-[#8E8172]">
          No orders placed in this period.
        </div>
      )}
    </div>
  );
};
