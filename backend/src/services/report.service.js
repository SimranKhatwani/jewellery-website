import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { parseDateRange } from './analytics.service.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Helper to build regex for search queries safely
 */
function escapeRegex(text) {
  return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// =========================================================================
// 1. SALES REPORT
// =========================================================================
export async function getSalesReport(tenantId, options = {}) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { preset, startDate, endDate, orderStatus, paymentStatus, paymentMethod, search, page = 1, limit = 20, isExport = false } = options;

  const dateRange = parseDateRange({ preset: preset || 'last30days', startDate, endDate });

  const query = {
    tenantId: tenantObjectId,
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
  };

  if (orderStatus && orderStatus !== 'all') {
    query.orderStatus = orderStatus;
  }
  if (paymentStatus && paymentStatus !== 'all') {
    query.paymentStatus = paymentStatus;
  }
  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }
  if (search && search.trim()) {
    query.orderNumber = new RegExp(escapeRegex(search.trim()), 'i');
  }

  const numLimit = isExport ? 5000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  const [totalCount, orders, summaryAgg] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .select('orderNumber createdAt pricing paymentMethod paymentStatus orderStatus customerInfo cancellation')
      .lean(),
    Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          grossSubtotal: { $sum: { $ifNull: ['$pricing.subtotal', 0] } },
          totalDiscounts: { $sum: { $ifNull: ['$pricing.discount', 0] } },
          totalTax: { $sum: { $ifNull: ['$pricing.taxAmount', 0] } },
          totalShipping: { $sum: { $ifNull: ['$pricing.shippingAmount', 0] } },
          netPayable: { $sum: { $ifNull: ['$pricing.totalPayable', 0] } },
        },
      },
    ]),
  ]);

  const summary = summaryAgg[0] || {
    totalOrders: 0,
    grossSubtotal: 0,
    totalDiscounts: 0,
    totalTax: 0,
    totalShipping: 0,
    netPayable: 0,
  };

  const records = orders.map((ord) => ({
    orderDate: ord.createdAt ? new Date(ord.createdAt).toISOString() : '',
    orderDateFormatted: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    orderNumber: ord.orderNumber,
    subtotal: Math.round((ord.pricing?.subtotal || 0) * 100) / 100,
    discount: Math.round((ord.pricing?.discount || 0) * 100) / 100,
    tax: Math.round((ord.pricing?.taxAmount || 0) * 100) / 100,
    shippingCharges: Math.round((ord.pricing?.shippingAmount || 0) * 100) / 100,
    totalPayable: Math.round((ord.pricing?.totalPayable || 0) * 100) / 100,
    currency: ord.pricing?.currency || 'INR',
    currencySymbol: ord.pricing?.currencySymbol || '₹',
    paymentMethod: ord.paymentMethod || 'cod',
    paymentStatus: ord.paymentStatus || 'pending',
    orderStatus: ord.cancellation?.isCancelled ? 'cancelled' : ord.orderStatus || 'pending',
  }));

  return {
    reportType: 'sales',
    title: 'Sales Report',
    dateRange,
    pagination: {
      total: totalCount,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(totalCount / numLimit) || 1,
    },
    summary: {
      totalOrders: summary.totalOrders,
      grossSubtotal: Math.round(summary.grossSubtotal * 100) / 100,
      totalDiscounts: Math.round(summary.totalDiscounts * 100) / 100,
      totalTax: Math.round(summary.totalTax * 100) / 100,
      totalShipping: Math.round(summary.totalShipping * 100) / 100,
      netPayable: Math.round(summary.netPayable * 100) / 100,
    },
    records,
  };
}

// =========================================================================
// 2. ORDERS REPORT
// =========================================================================
export async function getOrdersReport(tenantId, options = {}) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { preset, startDate, endDate, orderStatus, paymentStatus, paymentMethod, search, page = 1, limit = 20, isExport = false } = options;

  const dateRange = parseDateRange({ preset: preset || 'last30days', startDate, endDate });

  const query = {
    tenantId: tenantObjectId,
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
  };

  if (orderStatus && orderStatus !== 'all') {
    query.orderStatus = orderStatus;
  }
  if (paymentStatus && paymentStatus !== 'all') {
    query.paymentStatus = paymentStatus;
  }
  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { orderNumber: rx },
      { 'customerInfo.name': rx },
      { 'customerInfo.email': rx },
      { 'customerInfo.phone': rx },
    ];
  }

  const numLimit = isExport ? 5000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  const [totalCount, orders, summaryAgg] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .select('orderNumber createdAt customerInfo items pricing paymentMethod paymentStatus orderStatus cancellation')
      .lean(),
    Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$pricing.totalPayable', 0] } },
          totalUnits: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]),
  ]);

  const summary = summaryAgg[0] || { totalOrders: 0, totalValue: 0, totalUnits: 0 };

  const records = orders.map((ord) => {
    const itemsCount = Array.isArray(ord.items)
      ? ord.items.reduce((sum, it) => sum + (it.quantity || 0), 0)
      : 0;

    return {
      orderNumber: ord.orderNumber,
      orderDate: ord.createdAt ? new Date(ord.createdAt).toISOString() : '',
      orderDateFormatted: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      customerName: ord.customerInfo?.name || 'Guest Customer',
      customerEmail: ord.customerInfo?.email || 'N/A',
      customerPhone: ord.customerInfo?.phone || ord.shippingAddress?.phone || 'N/A',
      isGuest: ord.customerInfo?.isGuest || false,
      itemsCount,
      orderTotal: Math.round((ord.pricing?.totalPayable || 0) * 100) / 100,
      currency: ord.pricing?.currency || 'INR',
      currencySymbol: ord.pricing?.currencySymbol || '₹',
      paymentMethod: ord.paymentMethod || 'cod',
      paymentStatus: ord.paymentStatus || 'pending',
      orderStatus: ord.cancellation?.isCancelled ? 'cancelled' : ord.orderStatus || 'pending',
    };
  });

  return {
    reportType: 'orders',
    title: 'Orders Report',
    dateRange,
    pagination: {
      total: totalCount,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(totalCount / numLimit) || 1,
    },
    summary: {
      totalOrders: summary.totalOrders,
      totalValue: Math.round(summary.totalValue * 100) / 100,
      totalUnits: summary.totalUnits,
    },
    records,
  };
}

// =========================================================================
// 3. PRODUCTS REPORT
// =========================================================================
export async function getProductsReport(tenantId, options = {}) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { category, inventoryStatus, isPublished, search, page = 1, limit = 20, isExport = false } = options;

  const query = { tenantId: tenantObjectId };

  if (category && category !== 'all') {
    query.category = category.toLowerCase().trim();
  }
  if (inventoryStatus && inventoryStatus !== 'all') {
    query.inventoryStatus = inventoryStatus;
  }
  if (isPublished !== undefined && isPublished !== 'all') {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ name: rx }, { sku: rx }, { slug: rx }];
  }

  const numLimit = isExport ? 5000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  const [totalCount, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .select('name sku category priceUSD inventoryStatus stockQuantity isPublished hasVariants variants')
      .lean(),
  ]);

  // Flatten variant products into distinct row entries for comprehensive reporting
  const records = [];
  products.forEach((prod) => {
    if (prod.hasVariants && Array.isArray(prod.variants) && prod.variants.length > 0) {
      prod.variants.forEach((v) => {
        records.push({
          productName: prod.name,
          sku: v.sku || prod.sku,
          category: prod.category,
          variantInfo: v.name || 'Standard Variant',
          price: v.price !== null && v.price !== undefined ? v.price : prod.priceUSD,
          inventoryStatus: v.inventoryStatus || 'unknown',
          stockQuantity: v.inventoryStatus === 'unknown' ? null : v.stockQuantity,
          isActive: v.isActive !== false && prod.isPublished,
          statusLabel: prod.isPublished ? (v.isActive !== false ? 'Active' : 'Inactive Variant') : 'Draft',
        });
      });
    } else {
      records.push({
        productName: prod.name,
        sku: prod.sku,
        category: prod.category,
        variantInfo: 'Standard',
        price: prod.priceUSD,
        inventoryStatus: prod.inventoryStatus || 'unknown',
        stockQuantity: prod.inventoryStatus === 'unknown' ? null : prod.stockQuantity,
        isActive: prod.isPublished,
        statusLabel: prod.isPublished ? 'Active' : 'Draft',
      });
    }
  });

  return {
    reportType: 'products',
    title: 'Products Report',
    pagination: {
      total: totalCount,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(totalCount / numLimit) || 1,
    },
    summary: {
      totalCatalogueProducts: totalCount,
      totalListedRows: records.length,
    },
    records,
  };
}

// =========================================================================
// 4. INVENTORY REPORT
// =========================================================================
export async function getInventoryReport(tenantId, options = {}) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { inventoryStatus, search, page = 1, limit = 20, isExport = false } = options;

  const query = { tenantId: tenantObjectId };

  if (inventoryStatus && inventoryStatus !== 'all') {
    query.inventoryStatus = inventoryStatus;
  }
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ name: rx }, { sku: rx }];
  }

  const numLimit = isExport ? 5000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  const [totalCount, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .select('name sku inventoryStatus stockQuantity lowStockThreshold hasVariants variants primaryImage')
      .lean(),
  ]);

  const records = [];
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let unknownCount = 0;
  let totalTrackedUnits = 0;

  products.forEach((prod) => {
    const threshold = prod.lowStockThreshold || 5;

    if (prod.hasVariants && Array.isArray(prod.variants) && prod.variants.length > 0) {
      prod.variants.forEach((v) => {
        if (!v.isActive) return;
        const isUnknown = v.inventoryStatus === 'unknown';
        const stock = isUnknown ? null : v.stockQuantity || 0;

        if (isUnknown) {
          unknownCount++;
        } else {
          totalTrackedUnits += stock;
          if (stock === 0) outOfStockCount++;
          else if (stock <= threshold) lowStockCount++;
          else inStockCount++;
        }

        records.push({
          productName: prod.name,
          sku: v.sku || prod.sku,
          variant: v.name || 'Standard',
          availableStock: isUnknown ? 'Untracked' : stock,
          rawStock: stock,
          lowStockThreshold: threshold,
          inventoryStatus: v.inventoryStatus || 'unknown',
          needsRestock: !isUnknown && stock <= threshold,
        });
      });
    } else {
      const isUnknown = prod.inventoryStatus === 'unknown';
      const stock = isUnknown ? null : prod.stockQuantity || 0;

      if (isUnknown) {
        unknownCount++;
      } else {
        totalTrackedUnits += stock;
        if (stock === 0) outOfStockCount++;
        else if (stock <= threshold) lowStockCount++;
        else inStockCount++;
      }

      records.push({
        productName: prod.name,
        sku: prod.sku,
        variant: 'Standard',
        availableStock: isUnknown ? 'Untracked' : stock,
        rawStock: stock,
        lowStockThreshold: threshold,
        inventoryStatus: prod.inventoryStatus || 'unknown',
        needsRestock: !isUnknown && stock <= threshold,
      });
    }
  });

  return {
    reportType: 'inventory',
    title: 'Inventory Report',
    pagination: {
      total: totalCount,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(totalCount / numLimit) || 1,
    },
    summary: {
      totalProducts: totalCount,
      totalTrackedUnits,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      unknownCount,
    },
    records,
  };
}

// =========================================================================
// 5. CUSTOMERS REPORT
// =========================================================================
export async function getCustomersReport(tenantId, options = {}) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { preset, startDate, endDate, customerType, search, page = 1, limit = 20, isExport = false } = options;

  const dateRange = parseDateRange({ preset: preset || 'last30days', startDate, endDate });

  const numLimit = isExport ? 5000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  // Pipeline grouping distinct tenant orders by customer identifier
  const matchStage = {
    tenantId: tenantObjectId,
    orderStatus: { $ne: ORDER_STATUS.CANCELLED },
    'cancellation.isCancelled': { $ne: true },
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
  };

  const pipeline = [
    { $match: matchStage },
    {
      $project: {
        customerKey: {
          $cond: [
            { $ne: ['$userId', null] },
            { $concat: ['user:', { $toString: '$userId' }] },
            { $concat: ['guest:', { $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', 'unknown'] } } } }] },
          ],
        },
        userId: 1,
        customerName: { $ifNull: ['$customerInfo.name', '$shippingAddress.name'] },
        customerEmail: { $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', ''] } } } },
        customerPhone: { $ifNull: ['$customerInfo.phone', '$shippingAddress.phone'] },
        isGuest: { $ifNull: ['$customerInfo.isGuest', false] },
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
        createdAt: 1,
      },
    },
    {
      $group: {
        _id: '$customerKey',
        userId: { $first: '$userId' },
        name: { $first: '$customerName' },
        email: { $first: '$customerEmail' },
        phone: { $first: '$customerPhone' },
        isGuest: { $first: '$isGuest' },
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalPayable' },
        firstOrderInWindow: { $min: '$createdAt' },
        latestOrderInWindow: { $max: '$createdAt' },
      },
    },
  ];

  if (customerType === 'registered') {
    pipeline.push({ $match: { isGuest: false } });
  } else if (customerType === 'guest') {
    pipeline.push({ $match: { isGuest: true } });
  }

  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    pipeline.push({
      $match: {
        $or: [{ name: rx }, { email: rx }, { phone: rx }],
      },
    });
  }

  pipeline.push({ $sort: { totalSpent: -1, totalOrders: -1 } });

  const [countResult, customerGroups] = await Promise.all([
    Order.aggregate([...pipeline, { $count: 'total' }]),
    Order.aggregate([...pipeline, { $skip: skip }, { $limit: numLimit }]),
  ]);

  const total = countResult[0]?.total || 0;

  // Determine lifetime first order & new/returning classification
  const records = await Promise.all(
    customerGroups.map(async (c) => {
      let priorMatch = {
        tenantId: tenantObjectId,
        orderStatus: { $ne: ORDER_STATUS.CANCELLED },
        'cancellation.isCancelled': { $ne: true },
        createdAt: { $lt: dateRange.startDate },
      };

      if (c.userId) {
        priorMatch.userId = c.userId;
      } else if (c.email) {
        priorMatch['customerInfo.email'] = new RegExp(`^${c.email}$`, 'i');
      }

      const priorOrder = await Order.findOne(priorMatch).select('createdAt').sort({ createdAt: 1 }).lean();
      const isReturning = !!priorOrder;
      const lifetimeFirst = priorOrder ? priorOrder.createdAt : c.firstOrderInWindow;

      return {
        customerName: c.name || 'Valued Patron',
        email: c.email || 'N/A',
        phone: c.phone || 'N/A',
        isGuest: c.isGuest,
        customerType: c.isGuest ? 'Guest' : 'Registered Member',
        relationship: isReturning ? 'Returning Patron' : 'New Client',
        totalOrders: c.totalOrders,
        totalOrderValue: Math.round(c.totalSpent * 100) / 100,
        firstOrderDate: lifetimeFirst ? new Date(lifetimeFirst).toISOString() : '',
        firstOrderFormatted: lifetimeFirst ? new Date(lifetimeFirst).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        mostRecentOrderDate: c.latestOrderInWindow ? new Date(c.latestOrderInWindow).toISOString() : '',
        mostRecentOrderFormatted: c.latestOrderInWindow ? new Date(c.latestOrderInWindow).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      };
    })
  );

  return {
    reportType: 'customers',
    title: 'Customers Report',
    dateRange,
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(total / numLimit) || 1,
    },
    summary: {
      totalUniqueCustomers: total,
    },
    records,
  };
}

// =========================================================================
// 6. PAYMENTS REPORT
// =========================================================================
export async function getPaymentsReport(tenantId, options = {}) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { preset, startDate, endDate, paymentMethod, paymentStatus, search, page = 1, limit = 20, isExport = false } = options;

  const dateRange = parseDateRange({ preset: preset || 'last30days', startDate, endDate });

  const query = {
    tenantId: tenantObjectId,
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
  };

  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }
  if (paymentStatus && paymentStatus !== 'all') {
    query.paymentStatus = paymentStatus;
  }
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { orderNumber: rx },
      { 'customerInfo.name': rx },
      { 'customerInfo.email': rx },
    ];
  }

  const numLimit = isExport ? 5000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numPage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  const [totalCount, orders, summaryAgg] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .select('orderNumber createdAt customerInfo paymentMethod paymentStatus pricing cancellation')
      .lean(),
    Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ['$pricing.totalPayable', 0] } },
          collectedAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$pricing.totalPayable', 0],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PENDING] }, '$pricing.totalPayable', 0],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.REFUNDED] }, '$pricing.totalPayable', 0],
            },
          },
        },
      },
    ]),
  ]);

  const summary = summaryAgg[0] || {
    totalAmount: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    refundedAmount: 0,
  };

  const records = orders.map((ord) => ({
    orderNumber: ord.orderNumber,
    customerName: ord.customerInfo?.name || 'Guest Customer',
    customerEmail: ord.customerInfo?.email || 'N/A',
    paymentMethod: ord.paymentMethod || 'cod',
    paymentMethodLabel: (ord.paymentMethod || 'cod').toUpperCase(),
    paymentStatus: ord.paymentStatus || 'pending',
    amount: Math.round((ord.pricing?.totalPayable || 0) * 100) / 100,
    currency: ord.pricing?.currency || 'INR',
    currencySymbol: ord.pricing?.currencySymbol || '₹',
    paymentDate: ord.createdAt ? new Date(ord.createdAt).toISOString() : '',
    paymentDateFormatted: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
  }));

  return {
    reportType: 'payments',
    title: 'Payments Report',
    dateRange,
    pagination: {
      total: totalCount,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(totalCount / numLimit) || 1,
    },
    summary: {
      totalAmount: Math.round(summary.totalAmount * 100) / 100,
      collectedAmount: Math.round(summary.collectedAmount * 100) / 100,
      pendingAmount: Math.round(summary.pendingAmount * 100) / 100,
      refundedAmount: Math.round(summary.refundedAmount * 100) / 100,
    },
    records,
  };
}

// =========================================================================
// 7. EXPORT ENGINE: CSV GENERATOR
// =========================================================================
export function generateCSV(reportType, reportData, tenant) {
  const records = reportData.records || [];
  const currencySymbol = tenant?.settings?.currencySymbol || '₹';

  let headers = [];
  let rowExtractor = () => [];

  switch (reportType) {
    case 'sales':
      headers = [
        'Order Date',
        'Order Number',
        'Subtotal',
        'Discount',
        'Tax',
        'Shipping Charges',
        'Total Payable',
        'Currency',
        'Payment Method',
        'Payment Status',
        'Order Status',
      ];
      rowExtractor = (r) => [
        r.orderDateFormatted || r.orderDate,
        r.orderNumber,
        r.subtotal,
        r.discount,
        r.tax,
        r.shippingCharges,
        r.totalPayable,
        r.currency,
        r.paymentMethod.toUpperCase(),
        r.paymentStatus,
        r.orderStatus,
      ];
      break;

    case 'orders':
      headers = [
        'Order Number',
        'Order Date',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Items Count',
        'Order Total',
        'Payment Method',
        'Payment Status',
        'Order Status',
      ];
      rowExtractor = (r) => [
        r.orderNumber,
        r.orderDateFormatted || r.orderDate,
        r.customerName,
        r.customerEmail,
        r.customerPhone,
        r.itemsCount,
        r.orderTotal,
        r.paymentMethod.toUpperCase(),
        r.paymentStatus,
        r.orderStatus,
      ];
      break;

    case 'products':
      headers = [
        'Product Name',
        'SKU',
        'Category',
        'Variant',
        'Price',
        'Inventory Status',
        'Stock Quantity',
        'Status',
      ];
      rowExtractor = (r) => [
        r.productName,
        r.sku,
        r.category,
        r.variantInfo,
        r.price,
        r.inventoryStatus,
        r.stockQuantity === null ? 'Untracked' : r.stockQuantity,
        r.statusLabel,
      ];
      break;

    case 'inventory':
      headers = [
        'Product Name',
        'SKU',
        'Variant',
        'Available Stock',
        'Low Stock Threshold',
        'Inventory Status',
      ];
      rowExtractor = (r) => [
        r.productName,
        r.sku,
        r.variant,
        r.availableStock,
        r.lowStockThreshold,
        r.inventoryStatus,
      ];
      break;

    case 'customers':
      headers = [
        'Customer Name',
        'Email',
        'Phone',
        'Account Type',
        'Classification',
        'Total Orders',
        'Total Spent',
        'First Order Date',
        'Most Recent Order Date',
      ];
      rowExtractor = (r) => [
        r.customerName,
        r.email,
        r.phone,
        r.customerType,
        r.relationship,
        r.totalOrders,
        r.totalOrderValue,
        r.firstOrderFormatted || r.firstOrderDate,
        r.mostRecentOrderFormatted || r.mostRecentOrderDate,
      ];
      break;

    case 'payments':
      headers = [
        'Order Number',
        'Customer Name',
        'Customer Email',
        'Payment Method',
        'Payment Status',
        'Amount',
        'Currency',
        'Payment Date',
      ];
      rowExtractor = (r) => [
        r.orderNumber,
        r.customerName,
        r.customerEmail,
        r.paymentMethodLabel,
        r.paymentStatus,
        r.amount,
        r.currency,
        r.paymentDateFormatted || r.paymentDate,
      ];
      break;

    default:
      throw new BadRequestError(`Unsupported report type for CSV export: ${reportType}`);
  }

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...records.map((rec) => rowExtractor(rec).map(escapeCSV).join(',')),
  ];

  // Return with UTF-8 BOM for accurate Excel rendering
  return '\uFEFF' + csvLines.join('\r\n');
}

// =========================================================================
// 8. EXPORT ENGINE: LUXURY PRINT / PDF HTML GENERATOR
// =========================================================================
export function generatePrintHTML(reportType, reportData, tenant) {
  const records = reportData.records || [];
  const storeName = tenant?.name || 'AURELLE Maison';
  const currencySymbol = tenant?.settings?.currencySymbol || '₹';
  const title = reportData.title || `${reportType.toUpperCase()} Report`;
  const dateLabel = reportData.dateRange?.label || 'All Available Records';
  const generatedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let thCols = [];
  let tdCols = (r) => '';

  switch (reportType) {
    case 'sales':
      thCols = ['Date', 'Order #', 'Subtotal', 'Discount', 'Tax', 'Shipping', 'Total', 'Method', 'Payment', 'Status'];
      tdCols = (r) => `
        <td>${r.orderDateFormatted || r.orderDate}</td>
        <td class="font-mono">${r.orderNumber}</td>
        <td class="num">${currencySymbol}${r.subtotal.toLocaleString()}</td>
        <td class="num">${currencySymbol}${r.discount.toLocaleString()}</td>
        <td class="num">${currencySymbol}${r.tax.toLocaleString()}</td>
        <td class="num">${currencySymbol}${r.shippingCharges.toLocaleString()}</td>
        <td class="num font-bold">${currencySymbol}${r.totalPayable.toLocaleString()}</td>
        <td>${r.paymentMethod.toUpperCase()}</td>
        <td><span class="badge ${r.paymentStatus}">${r.paymentStatus}</span></td>
        <td><span class="badge ${r.orderStatus}">${r.orderStatus}</span></td>
      `;
      break;

    case 'orders':
      thCols = ['Order #', 'Date', 'Customer', 'Email', 'Items', 'Total', 'Method', 'Payment', 'Status'];
      tdCols = (r) => `
        <td class="font-mono font-bold">${r.orderNumber}</td>
        <td>${r.orderDateFormatted || r.orderDate}</td>
        <td>${r.customerName}</td>
        <td>${r.customerEmail}</td>
        <td class="num font-mono">${r.itemsCount}</td>
        <td class="num font-bold">${currencySymbol}${r.orderTotal.toLocaleString()}</td>
        <td>${r.paymentMethod.toUpperCase()}</td>
        <td><span class="badge ${r.paymentStatus}">${r.paymentStatus}</span></td>
        <td><span class="badge ${r.orderStatus}">${r.orderStatus}</span></td>
      `;
      break;

    case 'products':
      thCols = ['Product', 'SKU', 'Category', 'Variant', 'Price', 'Inventory', 'Stock', 'Status'];
      tdCols = (r) => `
        <td class="font-bold">${r.productName}</td>
        <td class="font-mono">${r.sku}</td>
        <td>${r.category}</td>
        <td>${r.variantInfo}</td>
        <td class="num font-mono">${currencySymbol}${r.price.toLocaleString()}</td>
        <td><span class="badge ${r.inventoryStatus}">${r.inventoryStatus}</span></td>
        <td class="num font-mono">${r.stockQuantity === null ? 'Untracked' : r.stockQuantity}</td>
        <td>${r.statusLabel}</td>
      `;
      break;

    case 'inventory':
      thCols = ['Product', 'SKU', 'Variant', 'Available Stock', 'Threshold', 'Status'];
      tdCols = (r) => `
        <td class="font-bold">${r.productName}</td>
        <td class="font-mono">${r.sku}</td>
        <td>${r.variant}</td>
        <td class="num font-bold font-mono">${r.availableStock}</td>
        <td class="num font-mono">${r.lowStockThreshold}</td>
        <td><span class="badge ${r.inventoryStatus}">${r.inventoryStatus}</span></td>
      `;
      break;

    case 'customers':
      thCols = ['Customer Name', 'Email', 'Phone', 'Type', 'Relationship', 'Orders', 'Total Spent', 'First Order', 'Latest Order'];
      tdCols = (r) => `
        <td class="font-bold">${r.customerName}</td>
        <td>${r.email}</td>
        <td>${r.phone}</td>
        <td>${r.customerType}</td>
        <td>${r.relationship}</td>
        <td class="num font-mono">${r.totalOrders}</td>
        <td class="num font-bold font-mono">${currencySymbol}${r.totalOrderValue.toLocaleString()}</td>
        <td>${r.firstOrderFormatted || r.firstOrderDate}</td>
        <td>${r.mostRecentOrderFormatted || r.mostRecentOrderDate}</td>
      `;
      break;

    case 'payments':
      thCols = ['Order #', 'Customer', 'Method', 'Status', 'Amount', 'Payment Date'];
      tdCols = (r) => `
        <td class="font-mono font-bold">${r.orderNumber}</td>
        <td>${r.customerName}</td>
        <td>${r.paymentMethodLabel}</td>
        <td><span class="badge ${r.paymentStatus}">${r.paymentStatus}</span></td>
        <td class="num font-bold font-mono">${currencySymbol}${r.amount.toLocaleString()}</td>
        <td>${r.paymentDateFormatted || r.paymentDate}</td>
      `;
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${storeName} — ${title}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2D2A26; background: #FFF; margin: 0; padding: 20px; font-size: 11px; }
    .header { border-bottom: 2px solid #A85F49; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .store-name { font-size: 20px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; color: #A85F49; margin: 0; }
    .report-title { font-size: 16px; font-weight: 600; margin: 4px 0 0; color: #2D2A26; }
    .meta { font-size: 10px; color: #8E8172; text-align: right; }
    .summary-strip { background: #FAF7F2; border: 1px solid #D7C5AF; padding: 10px 14px; margin-bottom: 18px; border-radius: 4px; display: flex; gap: 24px; }
    .summary-item { font-size: 10px; color: #8E8172; text-transform: uppercase; }
    .summary-val { font-size: 14px; font-weight: 600; color: #2D2A26; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #FAF7F2; color: #8E8172; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #D7C5AF; padding: 7px 6px; text-align: left; }
    td { padding: 6px; border-bottom: 1px solid #EEE; vertical-align: middle; }
    tr:nth-child(even) { background-color: #FAFAFA; }
    .num { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 600; }
    .badge { display: inline-block; padding: 2px 6px; font-size: 9px; border-radius: 3px; font-weight: 500; text-transform: uppercase; }
    .badge.paid, .badge.delivered, .badge.in_stock { background: #DCFCE7; color: #166534; }
    .badge.pending, .badge.confirmed, .badge.low_stock { background: #FEF3C7; color: #92400E; }
    .badge.cancelled, .badge.failed, .badge.out_of_stock { background: #FEE2E2; color: #991B1B; }
    .badge.unknown { background: #F3F4F6; color: #4B5563; }
    .footer { margin-top: 24px; font-size: 9px; color: #8E8172; text-align: center; border-top: 1px solid #EEE; padding-top: 10px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="background: #A85F49; color: #FFF; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <h1 class="store-name">${storeName}</h1>
      <h2 class="report-title">${title}</h2>
    </div>
    <div class="meta">
      <div><strong>Filter Period:</strong> ${dateLabel}</div>
      <div><strong>Generated:</strong> ${generatedAt}</div>
      <div><strong>Records:</strong> ${records.length} items</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>${thCols.map((c) => `<th class="${c.includes('Total') || c.includes('Price') || c.includes('Subtotal') || c.includes('Spent') || c.includes('Stock') || c.includes('Items') || c.includes('Tax') || c.includes('Shipping') ? 'num' : ''}">${c}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${records.length === 0 ? `<tr><td colspan="${thCols.length}" style="text-align: center; padding: 30px; color: #8E8172;">No records found for the selected criteria.</td></tr>` : records.map((r) => `<tr>${tdCols(r)}</tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">
    AURELLE SaaS Platform &bull; Confirmed Authoritative Tenant Report &bull; Page 1 of 1
  </div>
</body>
</html>`;
}
