import React from 'react';
import { Award, ArrowUpDown, Package } from 'lucide-react';
import { resolveMediaUrl } from '../../services/productService';

export const BestsellingProducts = ({
  products,
  sortBy = 'units',
  onSortChange,
  currencySymbol = '₹',
}) => {
  const safeProducts = products || [];
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D7C5AF]/30 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#A85F49]" />
            <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
              Bestselling Products
            </h3>
          </div>
          <p className="text-xs text-[#8E8172] mt-0.5">
            Historical performance aggregated strictly from order item snapshots
          </p>
        </div>

        {/* Sort Controls */}
        <div className="inline-flex rounded-xs border border-[#D7C5AF]/60 p-0.5 bg-[#FAF7F2] text-xs">
          <button
            type="button"
            onClick={() => onSortChange && onSortChange('units')}
            className={`px-3 py-1 font-medium transition-colors rounded-xs ${
              sortBy === 'units'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-2xs'
                : 'text-[#8E8172] hover:text-[#2D2A26]'
            }`}
          >
            By Units Sold
          </button>
          <button
            type="button"
            onClick={() => onSortChange && onSortChange('sales')}
            className={`px-3 py-1 font-medium transition-colors rounded-xs ${
              sortBy === 'sales'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-2xs'
                : 'text-[#8E8172] hover:text-[#2D2A26]'
            }`}
          >
            By Revenue Value
          </button>
        </div>
      </div>

      {safeProducts.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#8E8172] flex flex-col items-center justify-center">
          <Package className="w-8 h-8 text-[#D7C5AF] mb-2" />
          <p className="font-medium text-[#2D2A26]">No product sales recorded</p>
          <p className="text-[11px] text-[#8E8172] mt-0.5">
            Bestsellers will appear once orders are placed in this period.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D7C5AF]/40 text-[#8E8172] uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2 font-medium">Rank & Product</th>
                <th className="py-3 px-2 font-medium">SKU</th>
                <th className="py-3 px-2 font-medium text-right">Units Sold</th>
                <th className="py-3 px-2 font-medium text-right">Orders</th>
                <th className="py-3 px-2 font-medium text-right">Sales Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7C5AF]/30">
              {safeProducts.map((p, idx) => (
                <tr key={`${p.sku}-${idx}`} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center font-serif text-sm font-semibold text-[#A85F49]">
                        #{idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/40 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.primaryImage ? (
                          <img
                            src={resolveMediaUrl(p.primaryImage)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-[#8E8172]" />
                        )}
                      </div>
                      <span className="font-medium text-[#2D2A26] max-w-xs truncate">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-mono text-[11px] text-[#8E8172]">
                    {p.sku || 'N/A'}
                  </td>
                  <td className="py-3 px-2 font-mono font-medium text-[#2D2A26] text-right">
                    {p.unitsSold}
                  </td>
                  <td className="py-3 px-2 text-[#8E8172] text-right font-mono text-[11px]">
                    {p.ordersCount}
                  </td>
                  <td className="py-3 px-2 font-medium text-[#A85F49] text-right font-mono">
                    {formatMoney(p.salesValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
