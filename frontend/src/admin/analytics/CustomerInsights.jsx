import React from 'react';
import { Users, UserPlus, UserCheck, Repeat } from 'lucide-react';

export const CustomerInsights = ({
  customers,
}) => {
  const safeCustomers = customers || {};
  const {
    totalUniqueCustomers = 0,
    newCustomers = 0,
    returningCustomers = 0,
    newCustomerPercentage = 0,
    returningCustomerPercentage = 0,
    frequency = {},
  } = safeCustomers;

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#D7C5AF]/30">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#A85F49]" />
            <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
              Customer Retention & Identity
            </h3>
          </div>
          <span className="text-xs text-[#8E8172]">
            Total: <span className="font-semibold text-[#2D2A26]">{totalUniqueCustomers}</span> clients
          </span>
        </div>

        {/* New vs Returning ratio cards */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-4">
            <div className="flex items-center gap-2 text-[#2980B9]">
              <UserPlus className="w-4 h-4" />
              <span className="text-xs font-medium text-[#2D2A26]">New Clients</span>
            </div>
            <p className="mt-2 text-xl font-light text-[#2D2A26]">{newCustomers}</p>
            <p className="text-[11px] text-[#8E8172] mt-0.5">{newCustomerPercentage}% of total</p>
          </div>

          <div className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-4">
            <div className="flex items-center gap-2 text-[#27AE60]">
              <UserCheck className="w-4 h-4" />
              <span className="text-xs font-medium text-[#2D2A26]">Returning Clients</span>
            </div>
            <p className="mt-2 text-xl font-light text-[#2D2A26]">{returningCustomers}</p>
            <p className="text-[11px] text-[#8E8172] mt-0.5">{returningCustomerPercentage}% of total</p>
          </div>
        </div>

        {/* Order Frequency Breakdown */}
        <div className="mt-5 pt-4 border-t border-[#D7C5AF]/30">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#2D2A26] mb-3">
            <Repeat className="w-3.5 h-3.5 text-[#A85F49]" />
            <span>Order Velocity & Frequency</span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: 'Single purchase (1 order)', count: frequency.oneOrder || 0 },
              { label: 'Repeat patron (2 orders)', count: frequency.twoOrders || 0 },
              { label: 'Frequent buyer (3–5 orders)', count: frequency.threeToFive || 0 },
              { label: 'VIP maison collector (>5 orders)', count: frequency.moreThanFive || 0 },
            ].map((f, idx) => {
              const pct =
                totalUniqueCustomers > 0
                  ? Math.round((f.count / totalUniqueCustomers) * 100)
                  : 0;
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[#8E8172] text-[11px]">{f.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#2D2A26] font-medium">{f.count}</span>
                    <span className="text-[#8E8172] font-mono text-[10px] w-8 text-right">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {totalUniqueCustomers === 0 && (
        <div className="py-8 text-center text-xs text-[#8E8172]">
          No customer activity recorded in this period.
        </div>
      )}
    </div>
  );
};
