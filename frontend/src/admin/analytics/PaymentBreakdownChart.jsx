import React from 'react';
import { CreditCard, Wallet, Banknote, ShieldAlert } from 'lucide-react';

const METHOD_ICONS = {
  cod: Banknote,
  card: CreditCard,
  upi: Wallet,
};

export const PaymentBreakdownChart = ({
  byMethod,
  byStatus,
  currencySymbol = '₹',
}) => {
  const safeByMethod = byMethod || [];
  const safeByStatus = byStatus || [];

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-[#D7C5AF]/30">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#A85F49]" />
          <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
            Payment Methods & Settlement
          </h3>
        </div>
        <span className="text-xs text-[#8E8172]">Multi-option checkout</span>
      </div>

      {/* Methods Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {safeByMethod.map((item) => {
          const Icon = METHOD_ICONS[item.method] || CreditCard;
          return (
            <div
              key={item.method}
              className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-[#2D2A26]">
                    {item.label}
                  </span>
                  <div className="p-1.5 rounded-xs bg-[#FFFFFF] border border-[#D7C5AF]/40 text-[#A85F49]">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-lg font-light text-[#2D2A26]">
                    {formatMoney(item.totalAmount)}
                  </span>
                  <p className="text-[11px] text-[#8E8172] mt-0.5">
                    {item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'} placed
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D7C5AF]/40 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8E8172]">Collected:</span>
                  <span className="text-[#27AE60] font-medium font-mono">
                    {formatMoney(item.collectedAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E8172]">Pending:</span>
                  <span className="text-[#B8860B] font-medium font-mono">
                    {formatMoney(item.pendingAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Status Summary Badges */}
      <div className="mt-5 pt-4 border-t border-[#D7C5AF]/30">
        <p className="text-xs font-medium text-[#8E8172] mb-3">Settlement Status Breakdown:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {safeByStatus.map((st) => (
            <div
              key={st.status}
              className="p-2.5 rounded-xs border border-[#D7C5AF]/30 bg-[#FFFFFF] flex flex-col"
            >
              <span className="capitalize text-[11px] text-[#8E8172]">{st.status}</span>
              <span className="font-semibold text-[#2D2A26] mt-0.5">
                {formatMoney(st.totalAmount)}
              </span>
              <span className="text-[10px] text-[#8E8172]">{st.orderCount} orders</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
