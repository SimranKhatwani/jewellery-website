import React from 'react';
import { Archive, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { resolveMediaUrl } from '../../services/productService';

export const InventoryInsights = ({
  inventory,
  onNavigateCatalogue,
}) => {
  const safeInventory = inventory || {};
  const {
    totalProducts = 0,
    totalTrackedStockUnits = 0,
    inStockCount = 0,
    lowStockCount = 0,
    outOfStockCount = 0,
    unknownCount = 0,
    lowStockItems = [],
    outOfStockItems = [],
    unknownInventoryItems = [],
  } = safeInventory;

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D7C5AF]/30 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[#A85F49]" />
            <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
              Inventory Health & Stock Velocity
            </h3>
          </div>
          <p className="text-xs text-[#8E8172] mt-0.5">
            {totalTrackedStockUnits} tracked units across {totalProducts} catalogue pieces
          </p>
        </div>

        {onNavigateCatalogue && (
          <button
            type="button"
            onClick={onNavigateCatalogue}
            className="text-xs text-[#A85F49] hover:underline font-medium"
          >
            Manage in Catalogue &rarr;
          </button>
        )}
      </div>

      {/* Stock Health Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <div className="p-3.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/40">
          <span className="text-[11px] text-[#8E8172] uppercase font-medium">In Stock</span>
          <p className="text-xl font-light text-[#27AE60] mt-1">{inStockCount}</p>
          <span className="text-[10px] text-[#8E8172]">Healthy inventory</span>
        </div>

        <div className="p-3.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/40">
          <span className="text-[11px] text-[#8E8172] uppercase font-medium">Low Stock</span>
          <p className="text-xl font-light text-[#B8860B] mt-1">{lowStockCount}</p>
          <span className="text-[10px] text-[#8E8172]">Needs restocking</span>
        </div>

        <div className="p-3.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/40">
          <span className="text-[11px] text-[#8E8172] uppercase font-medium">Out of Stock</span>
          <p className="text-xl font-light text-[#C0392B] mt-1">{outOfStockCount}</p>
          <span className="text-[10px] text-[#8E8172]">Zero available</span>
        </div>

        <div className="p-3.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/40">
          <span className="text-[11px] text-[#8E8172] uppercase font-medium">Untracked</span>
          <p className="text-xl font-light text-[#8E8172] mt-1">{unknownCount}</p>
          <span className="text-[10px] text-[#8E8172]">Unconfigured status</span>
        </div>
      </div>

      {/* Actionable Restock Attention List */}
      {(lowStockItems.length > 0 || unknownInventoryItems.length > 0) && (
        <div className="mt-5 pt-4 border-t border-[#D7C5AF]/30">
          <p className="text-xs font-medium text-[#2D2A26] mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B8860B]" />
            Items Requiring Attention:
          </p>

          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div
                key={item.sku}
                className="flex items-center justify-between p-2 rounded-xs bg-[#FFFDF9] border border-[#B8860B]/30 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xs bg-[#FAF7F2] overflow-hidden shrink-0 border border-[#D7C5AF]/40">
                    <img
                      src={resolveMediaUrl(item.primaryImage)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#2D2A26] truncate block">{item.name}</span>
                    <span className="text-[10px] text-[#8E8172] font-mono">{item.sku}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-semibold text-[#B8860B]">
                    {item.stockQuantity} left
                  </span>
                  <span className="text-[10px] text-[#8E8172] block">Threshold: {item.threshold}</span>
                </div>
              </div>
            ))}

            {unknownInventoryItems.map((item) => (
              <div
                key={item.sku}
                className="flex items-center justify-between p-2 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/40 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xs bg-[#FFFFFF] overflow-hidden shrink-0 border border-[#D7C5AF]/40 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-[#8E8172]" />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#2D2A26] truncate block">{item.name}</span>
                    <span className="text-[10px] text-[#8E8172] font-mono">{item.sku}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-[#8E8172] px-2 py-0.5 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs">
                    Untracked
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
