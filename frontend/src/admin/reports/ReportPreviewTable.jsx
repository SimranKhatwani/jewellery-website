import React from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export const ReportPreviewTable = ({
  category,
  records = [],
  pagination = {},
  onPageChange,
  currencySymbol = '₹',
  isLoading = false,
}) => {
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    let style = 'bg-gray-100 text-gray-700';
    if (['paid', 'delivered', 'in_stock', 'active'].includes(s)) {
      style = 'bg-[#DCFCE7] text-[#166534]';
    } else if (['pending', 'confirmed', 'low_stock'].includes(s)) {
      style = 'bg-[#FEF3C7] text-[#92400E]';
    } else if (['cancelled', 'failed', 'out_of_stock'].includes(s)) {
      style = 'bg-[#FEE2E2] text-[#991B1B]';
    } else if (['unknown', 'draft'].includes(s)) {
      style = 'bg-[#F3F4F6] text-[#4B5563]';
    }
    return (
      <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-medium uppercase tracking-wide ${style}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#D7C5AF]/40 text-[#8E8172] uppercase tracking-wider text-[10px]">
            {category.id === 'sales' && (
              <tr>
                <th className="py-3 px-3 font-medium">Date</th>
                <th className="py-3 px-3 font-medium">Order Number</th>
                <th className="py-3 px-3 font-medium text-right">Subtotal</th>
                <th className="py-3 px-3 font-medium text-right">Discount</th>
                <th className="py-3 px-3 font-medium text-right">Tax</th>
                <th className="py-3 px-3 font-medium text-right">Shipping</th>
                <th className="py-3 px-3 font-medium text-right">Total Payable</th>
                <th className="py-3 px-3 font-medium">Method</th>
                <th className="py-3 px-3 font-medium">Payment</th>
                <th className="py-3 px-3 font-medium">Status</th>
              </tr>
            )}

            {category.id === 'orders' && (
              <tr>
                <th className="py-3 px-3 font-medium">Order Number</th>
                <th className="py-3 px-3 font-medium">Date</th>
                <th className="py-3 px-3 font-medium">Customer</th>
                <th className="py-3 px-3 font-medium">Contact</th>
                <th className="py-3 px-3 font-medium text-right">Items</th>
                <th className="py-3 px-3 font-medium text-right">Order Total</th>
                <th className="py-3 px-3 font-medium">Method</th>
                <th className="py-3 px-3 font-medium">Payment</th>
                <th className="py-3 px-3 font-medium">Status</th>
              </tr>
            )}

            {category.id === 'products' && (
              <tr>
                <th className="py-3 px-3 font-medium">Product Name</th>
                <th className="py-3 px-3 font-medium">SKU</th>
                <th className="py-3 px-3 font-medium">Category</th>
                <th className="py-3 px-3 font-medium">Variant</th>
                <th className="py-3 px-3 font-medium text-right">Price</th>
                <th className="py-3 px-3 font-medium">Inventory State</th>
                <th className="py-3 px-3 font-medium text-right">Stock</th>
                <th className="py-3 px-3 font-medium">Status</th>
              </tr>
            )}

            {category.id === 'inventory' && (
              <tr>
                <th className="py-3 px-3 font-medium">Product Name</th>
                <th className="py-3 px-3 font-medium">SKU</th>
                <th className="py-3 px-3 font-medium">Variant</th>
                <th className="py-3 px-3 font-medium text-right">Available Stock</th>
                <th className="py-3 px-3 font-medium text-right">Restock Threshold</th>
                <th className="py-3 px-3 font-medium">Inventory Status</th>
              </tr>
            )}

            {category.id === 'customers' && (
              <tr>
                <th className="py-3 px-3 font-medium">Customer</th>
                <th className="py-3 px-3 font-medium">Email</th>
                <th className="py-3 px-3 font-medium">Phone</th>
                <th className="py-3 px-3 font-medium">Account Type</th>
                <th className="py-3 px-3 font-medium">Relationship</th>
                <th className="py-3 px-3 font-medium text-right">Orders</th>
                <th className="py-3 px-3 font-medium text-right">Lifetime Spend</th>
                <th className="py-3 px-3 font-medium">Latest Order</th>
              </tr>
            )}

            {category.id === 'payments' && (
              <tr>
                <th className="py-3 px-3 font-medium">Order Number</th>
                <th className="py-3 px-3 font-medium">Customer</th>
                <th className="py-3 px-3 font-medium">Method</th>
                <th className="py-3 px-3 font-medium">Payment Status</th>
                <th className="py-3 px-3 font-medium text-right">Amount</th>
                <th className="py-3 px-3 font-medium">Payment Date</th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-[#D7C5AF]/30">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-xs text-[#8E8172]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#A85F49] border-t-transparent rounded-full animate-spin" />
                    <span>Loading report records...</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-xs text-[#8E8172]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-[#D7C5AF]" />
                    <p className="font-medium text-[#2D2A26]">No records found</p>
                    <p className="text-[11px] text-[#8E8172]">
                      Try adjusting the date range or filters to inspect other records.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((r, idx) => (
                <tr key={idx} className="hover:bg-[#FAF7F2]/50 transition-colors">
                  {category.id === 'sales' && (
                    <>
                      <td className="py-3 px-3 text-[#8E8172] font-mono text-[11px]">
                        {r.orderDateFormatted || r.orderDate}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[#2D2A26]">
                        {r.orderNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-[#8E8172]">
                        {formatMoney(r.subtotal)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-[#8E8172]">
                        {r.discount > 0 ? `-${formatMoney(r.discount)}` : '₹0.00'}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-[#8E8172]">
                        {formatMoney(r.tax)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-[#8E8172]">
                        {formatMoney(r.shippingCharges)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-[#A85F49]">
                        {formatMoney(r.totalPayable)}
                      </td>
                      <td className="py-3 px-3 uppercase text-[11px] font-medium text-[#2D2A26]">
                        {r.paymentMethod}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(r.paymentStatus)}</td>
                      <td className="py-3 px-3">{getStatusBadge(r.orderStatus)}</td>
                    </>
                  )}

                  {category.id === 'orders' && (
                    <>
                      <td className="py-3 px-3 font-mono font-medium text-[#2D2A26]">
                        {r.orderNumber}
                      </td>
                      <td className="py-3 px-3 text-[#8E8172] font-mono text-[11px]">
                        {r.orderDateFormatted || r.orderDate}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#2D2A26]">{r.customerName}</td>
                      <td className="py-3 px-3 text-[#8E8172] text-[11px] font-mono">{r.customerEmail}</td>
                      <td className="py-3 px-3 font-mono text-right text-[#2D2A26]">{r.itemsCount}</td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-[#A85F49]">
                        {formatMoney(r.orderTotal)}
                      </td>
                      <td className="py-3 px-3 uppercase text-[11px] font-medium text-[#2D2A26]">
                        {r.paymentMethod}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(r.paymentStatus)}</td>
                      <td className="py-3 px-3">{getStatusBadge(r.orderStatus)}</td>
                    </>
                  )}

                  {category.id === 'products' && (
                    <>
                      <td className="py-3 px-3 font-medium text-[#2D2A26]">{r.productName}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#8E8172]">{r.sku}</td>
                      <td className="py-3 px-3 capitalize text-[#8E8172]">{r.category}</td>
                      <td className="py-3 px-3 text-[#8E8172]">{r.variantInfo}</td>
                      <td className="py-3 px-3 font-mono text-right text-[#2D2A26]">
                        {formatMoney(r.price)}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(r.inventoryStatus)}</td>
                      <td className="py-3 px-3 font-mono text-right">
                        {r.stockQuantity === null ? (
                          <span className="text-[#8E8172] italic text-[11px]">Untracked</span>
                        ) : (
                          <span className="font-semibold text-[#2D2A26]">{r.stockQuantity}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(r.statusLabel)}</td>
                    </>
                  )}

                  {category.id === 'inventory' && (
                    <>
                      <td className="py-3 px-3 font-medium text-[#2D2A26]">{r.productName}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#8E8172]">{r.sku}</td>
                      <td className="py-3 px-3 text-[#8E8172]">{r.variant}</td>
                      <td className="py-3 px-3 font-mono text-right font-bold">
                        {r.availableStock === 'Untracked' ? (
                          <span className="text-[#8E8172] italic text-[11px]">Untracked</span>
                        ) : (
                          <span className={r.needsRestock ? 'text-[#B8860B]' : 'text-[#27AE60]'}>
                            {r.availableStock}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-[#8E8172]">
                        {r.lowStockThreshold}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(r.inventoryStatus)}</td>
                    </>
                  )}

                  {category.id === 'customers' && (
                    <>
                      <td className="py-3 px-3 font-medium text-[#2D2A26]">{r.customerName}</td>
                      <td className="py-3 px-3 text-[#8E8172] font-mono text-[11px]">{r.email}</td>
                      <td className="py-3 px-3 text-[#8E8172] font-mono text-[11px]">{r.phone}</td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-[#8E8172]">{r.customerType}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-medium ${
                            r.relationship === 'Returning Patron'
                              ? 'bg-[#DCFCE7] text-[#166534]'
                              : 'bg-[#DBEAFE] text-[#1E40AF]'
                          }`}
                        >
                          {r.relationship}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-semibold text-[#2D2A26]">
                        {r.totalOrders}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-[#A85F49]">
                        {formatMoney(r.totalOrderValue)}
                      </td>
                      <td className="py-3 px-3 text-[#8E8172] font-mono text-[11px]">
                        {r.mostRecentOrderFormatted || r.mostRecentOrderDate || 'N/A'}
                      </td>
                    </>
                  )}

                  {category.id === 'payments' && (
                    <>
                      <td className="py-3 px-3 font-mono font-medium text-[#2D2A26]">
                        {r.orderNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#2D2A26]">{r.customerName}</td>
                      <td className="py-3 px-3 uppercase text-[11px] font-medium text-[#2D2A26]">
                        {r.paymentMethodLabel}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(r.paymentStatus)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-[#A85F49]">
                        {formatMoney(r.amount)}
                      </td>
                      <td className="py-3 px-3 text-[#8E8172] font-mono text-[11px]">
                        {r.paymentDateFormatted || r.paymentDate}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.pages > 1 && (
        <div className="p-3 bg-[#FAF7F2] border-t border-[#D7C5AF]/40 flex items-center justify-between text-xs text-[#8E8172]">
          <span>
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded-xs border border-[#D7C5AF] bg-[#FFFFFF] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">{pagination.page}</span>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1 rounded-xs border border-[#D7C5AF] bg-[#FFFFFF] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
