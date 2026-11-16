import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Payment } from '../models/Payment.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Standardize and validate date range filters
 * Presets: 'today', 'last7days', 'last30days', 'thismonth', 'previousmonth', 'custom'
 *
 * @param {Object} options
 * @param {string} [options.preset='last30days']
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 * @returns {{ startDate: Date, endDate: Date, preset: string, label: string }}
 */
export function parseDateRange({ preset = 'last30days', startDate, endDate } = {}) {
  const now = new Date();

  // If custom date range is provided
  if (preset === 'custom' || (startDate && endDate)) {
    if (!startDate || !endDate) {
      throw new BadRequestError('Both startDate and endDate are required for custom date range.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new BadRequestError(`Invalid startDate: ${startDate}. Expected valid ISO date.`);
    }
    if (isNaN(end.getTime())) {
      throw new BadRequestError(`Invalid endDate: ${endDate}. Expected valid ISO date.`);
    }

    // Set start to beginning of the day (00:00:00.000) if only date was provided
    if (String(startDate).length <= 10) {
      start.setHours(0, 0, 0, 0);
    }
    // Set end to end of the day (23:59:59.999) if only date was provided
    if (String(endDate).length <= 10) {
      end.setHours(23, 59, 59, 999);
    }

    if (start.getTime() > end.getTime()) {
      throw new BadRequestError('startDate cannot be after endDate.');
    }

    return {
      startDate: start,
      endDate: end,
      preset: 'custom',
      label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
    };
  }

  // Preset ranges based on UTC / local midnight
  let start = new Date(now);
  let end = new Date(now);
  let label = '';

  switch (preset) {
    case 'today': {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Today';
      break;
    }
    case 'last7days': {
      start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Last 7 Days';
      break;
    }
    case 'last30days': {
      start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Last 30 Days';
      break;
    }
    case 'thismonth': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'This Month';
      break;
    }
    case 'previousmonth': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'Previous Month';
      break;
    }
    default:
      throw new BadRequestError(
        `Unsupported date preset: '${preset}'. Supported presets: today, last7days, last30days, thismonth, previousmonth, custom.`
      );
  }

  return {
    startDate: start,
    endDate: end,
    preset,
    label,
  };
}

/**
 * Common base match stage for tenant-isolated orders
 * Excludes cancelled orders for sales/revenue calculations
 */
function getValidOrderMatch(tenantObjectId, startDate, endDate) {
  return {
    tenantId: tenantObjectId,
    orderStatus: { $ne: ORDER_STATUS.CANCELLED },
    'cancellation.isCancelled': { $ne: true },
    createdAt: { $gte: startDate, $lte: endDate },
  };
}

/**
 * 1. Overview Analytics
 * Provides executive financial KPIs, catalog counts, and customer volume
 */
export async function getOverviewAnalytics(tenantId, dateFilter) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { startDate, endDate, preset, label } = parseDateRange(dateFilter);

  // Run catalog counts in parallel
  const [totalProducts, publishedProducts, draftProducts] = await Promise.all([
    Product.countDocuments({ tenantId: tenantObjectId }),
    Product.countDocuments({ tenantId: tenantObjectId, isPublished: true }),
    Product.countDocuments({ tenantId: tenantObjectId, isPublished: false }),
  ]);

  // Aggregate Order KPIs for the period
  const orderStats = await Order.aggregate([
    {
      $match: {
        tenantId: tenantObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        orderStatus: 1,
        isCancelled: {
          $or: [
            { $eq: ['$orderStatus', ORDER_STATUS.CANCELLED] },
            { $eq: ['$cancellation.isCancelled', true] },
          ],
        },
        paymentStatus: 1,
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
        subtotal: { $ifNull: ['$pricing.subtotal', 0] },
        discount: { $ifNull: ['$pricing.discount', 0] },
        taxAmount: { $ifNull: ['$pricing.taxAmount', 0] },
        shippingAmount: { $ifNull: ['$pricing.shippingAmount', 0] },
        itemsCount: { $sum: '$items.quantity' },
        userId: 1,
        customerEmail: { $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', ''] } } } },
      },
    },
    {
      $group: {
        _id: null,
        totalOrdersCount: { $sum: 1 },
        validOrdersCount: {
          $sum: { $cond: [{ $eq: ['$isCancelled', false] }, 1, 0] },
        },
        cancelledOrdersCount: {
          $sum: { $cond: [{ $eq: ['$isCancelled', true] }, 1, 0] },
        },
        totalUnitsSold: {
          $sum: { $cond: [{ $eq: ['$isCancelled', false] }, '$itemsCount', 0] },
        },
        grossOrderValue: {
          // Gross before discounts for valid orders
          $sum: {
            $cond: [
              { $eq: ['$isCancelled', false] },
              { $add: ['$subtotal', '$taxAmount', '$shippingAmount'] },
              0,
            ],
          },
        },
        netSales: {
          // Total payable after discounts for valid orders
          $sum: { $cond: [{ $eq: ['$isCancelled', false] }, '$totalPayable', 0] },
        },
        collectedRevenue: {
          // Amount actually confirmed paid
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isCancelled', false] },
                  { $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] },
                ],
              },
              '$totalPayable',
              0,
            ],
          },
        },
        pendingPaymentAmount: {
          // Outstanding payment for valid orders
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isCancelled', false] },
                  { $eq: ['$paymentStatus', PAYMENT_STATUS.PENDING] },
                ],
              },
              '$totalPayable',
              0,
            ],
          },
        },
      },
    },
  ]);

  const metrics = orderStats[0] || {
    totalOrdersCount: 0,
    validOrdersCount: 0,
    cancelledOrdersCount: 0,
    totalUnitsSold: 0,
    grossOrderValue: 0,
    netSales: 0,
    collectedRevenue: 0,
    pendingPaymentAmount: 0,
  };

  // Average Order Value (AOV): Net Sales / Valid Orders Count
  const averageOrderValue =
    metrics.validOrdersCount > 0
      ? Math.round((metrics.netSales / metrics.validOrdersCount) * 100) / 100
      : 0;

  // Customer Analytics for the period
  const customerMetrics = await getCustomerCounts(tenantObjectId, startDate, endDate);

  return {
    dateRange: {
      preset,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    orders: {
      totalOrders: metrics.totalOrdersCount,
      validOrders: metrics.validOrdersCount,
      cancelledOrders: metrics.cancelledOrdersCount,
      totalUnitsSold: metrics.totalUnitsSold,
    },
    catalog: {
      totalProducts,
      publishedProducts,
      draftProducts,
    },
    financials: {
      grossOrderValue: Math.round(metrics.grossOrderValue * 100) / 100,
      netSales: Math.round(metrics.netSales * 100) / 100,
      collectedRevenue: Math.round(metrics.collectedRevenue * 100) / 100,
      pendingPaymentAmount: Math.round(metrics.pendingPaymentAmount * 100) / 100,
      averageOrderValue,
    },
    customers: customerMetrics,
  };
}

/**
 * Helper to compute new vs returning customers accurately
 */
async function getCustomerCounts(tenantObjectId, startDate, endDate) {
  // Find all distinct customers with valid orders in the date window
  const activeCustomers = await Order.aggregate([
    {
      $match: getValidOrderMatch(tenantObjectId, startDate, endDate),
    },
    {
      $project: {
        customerKey: {
          $cond: [
            { $ne: ['$userId', null] },
            { $concat: ['user:', { $toString: '$userId' }] },
            {
              $concat: [
                'guest:',
                { $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', 'unknown'] } } } },
              ],
            },
          ],
        },
        userId: 1,
        customerEmail: {
          $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', ''] } } },
        },
      },
    },
    {
      $group: {
        _id: '$customerKey',
        userId: { $first: '$userId' },
        email: { $first: '$customerEmail' },
      },
    },
  ]);

  if (activeCustomers.length === 0) {
    return {
      totalUniqueCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
    };
  }

  // For each customer, check if they have any prior valid order before startDate
  let returningCount = 0;
  let newCount = 0;

  await Promise.all(
    activeCustomers.map(async (cust) => {
      let priorMatch = {
        tenantId: tenantObjectId,
        orderStatus: { $ne: ORDER_STATUS.CANCELLED },
        'cancellation.isCancelled': { $ne: true },
        createdAt: { $lt: startDate },
      };

      if (cust.userId) {
        priorMatch.userId = cust.userId;
      } else if (cust.email) {
        priorMatch['customerInfo.email'] = new RegExp(`^${cust.email}$`, 'i');
      }

      const priorOrder = await Order.findOne(priorMatch).select('_id').lean();
      if (priorOrder) {
        returningCount++;
      } else {
        newCount++;
      }
    })
  );

  return {
    totalUniqueCustomers: activeCustomers.length,
    newCustomers: newCount,
    returningCustomers: returningCount,
  };
}

/**
 * 2. Sales Trend Analytics
 * Daily, weekly, or monthly aggregation with zero-filled continuity
 */
export async function getSalesTrends(tenantId, dateFilter, groupBy = 'day') {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { startDate, endDate, preset, label } = parseDateRange(dateFilter);

  let dateFormat = '%Y-%m-%d';
  if (groupBy === 'month') {
    dateFormat = '%Y-%m';
  } else if (groupBy === 'week') {
    dateFormat = '%Y-W%V'; // ISO Week format
  }

  const rawTrends = await Order.aggregate([
    {
      $match: getValidOrderMatch(tenantObjectId, startDate, endDate),
    },
    {
      $project: {
        dateStr: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
        paymentStatus: 1,
        itemsCount: { $sum: '$items.quantity' },
      },
    },
    {
      $group: {
        _id: '$dateStr',
        ordersCount: { $sum: 1 },
        salesAmount: { $sum: '$totalPayable' },
        collectedAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$totalPayable', 0],
          },
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PENDING] }, '$totalPayable', 0],
          },
        },
        unitsSold: { $sum: '$itemsCount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const trendsMap = new Map();
  for (const item of rawTrends) {
    trendsMap.set(item._id, item);
  }

  // Fill intervals for chart continuity
  const filledTrends = [];
  const current = new Date(startDate);

  if (groupBy === 'day') {
    while (current <= endDate) {
      const dateKey = current.toISOString().slice(0, 10);
      const existing = trendsMap.get(dateKey);
      filledTrends.push({
        date: dateKey,
        label: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ordersCount: existing ? existing.ordersCount : 0,
        salesAmount: existing ? Math.round(existing.salesAmount * 100) / 100 : 0,
        collectedAmount: existing ? Math.round(existing.collectedAmount * 100) / 100 : 0,
        pendingAmount: existing ? Math.round(existing.pendingAmount * 100) / 100 : 0,
        unitsSold: existing ? existing.unitsSold : 0,
      });
      current.setDate(current.getDate() + 1);
    }
  } else if (groupBy === 'month') {
    const endMonth = new Date(endDate);
    while (
      current.getFullYear() < endMonth.getFullYear() ||
      (current.getFullYear() === endMonth.getFullYear() && current.getMonth() <= endMonth.getMonth())
    ) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const dateKey = `${year}-${month}`;
      const existing = trendsMap.get(dateKey);
      filledTrends.push({
        date: dateKey,
        label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        ordersCount: existing ? existing.ordersCount : 0,
        salesAmount: existing ? Math.round(existing.salesAmount * 100) / 100 : 0,
        collectedAmount: existing ? Math.round(existing.collectedAmount * 100) / 100 : 0,
        pendingAmount: existing ? Math.round(existing.pendingAmount * 100) / 100 : 0,
        unitsSold: existing ? existing.unitsSold : 0,
      });
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    // Week or fallback
    for (const item of rawTrends) {
      filledTrends.push({
        date: item._id,
        label: item._id,
        ordersCount: item.ordersCount,
        salesAmount: Math.round(item.salesAmount * 100) / 100,
        collectedAmount: Math.round(item.collectedAmount * 100) / 100,
        pendingAmount: Math.round(item.pendingAmount * 100) / 100,
        unitsSold: item.unitsSold,
      });
    }
  }

  return {
    dateRange: {
      preset,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    groupBy,
    trends: filledTrends,
  };
}

/**
 * 3. Order Distribution Analytics
 * Breakdown by actual orderStatus and lifecycle over time
 */
export async function getOrderAnalytics(tenantId, dateFilter) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { startDate, endDate, preset, label } = parseDateRange(dateFilter);

  const statusAggregation = await Order.aggregate([
    {
      $match: {
        tenantId: tenantObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        orderStatus: 1,
        isCancelled: {
          $or: [
            { $eq: ['$orderStatus', ORDER_STATUS.CANCELLED] },
            { $eq: ['$cancellation.isCancelled', true] },
          ],
        },
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
      },
    },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$isCancelled', true] }, ORDER_STATUS.CANCELLED, '$orderStatus'],
        },
        count: { $sum: 1 },
        totalValue: { $sum: '$totalPayable' },
      },
    },
  ]);

  const statusMap = new Map();
  let totalOrders = 0;
  for (const s of statusAggregation) {
    statusMap.set(s._id, { count: s.count, totalValue: Math.round(s.totalValue * 100) / 100 });
    totalOrders += s.count;
  }

  // Canonical statuses
  const canonicalStatuses = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ];

  const distribution = canonicalStatuses.map((st) => {
    const data = statusMap.get(st) || { count: 0, totalValue: 0 };
    const percentage = totalOrders > 0 ? Math.round((data.count / totalOrders) * 1000) / 10 : 0;
    return {
      status: st,
      count: data.count,
      totalValue: data.totalValue,
      percentage,
    };
  });

  return {
    dateRange: {
      preset,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalOrders,
    distribution,
  };
}

/**
 * 4. Bestselling Products Analytics
 * Grouped strictly by historical Order item snapshots (name, sku, unitPrice)
 * Excludes cancelled orders
 */
export async function getBestsellingProducts(
  tenantId,
  dateFilter,
  { sortBy = 'units', limit = 10, page = 1 } = {}
) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { startDate, endDate, preset, label } = parseDateRange(dateFilter);

  const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const skip = (numPage - 1) * numLimit;

  const sortField = sortBy === 'sales' ? 'salesValue' : 'unitsSold';

  const pipeline = [
    {
      $match: getValidOrderMatch(tenantObjectId, startDate, endDate),
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          productId: '$items.productId',
          sku: '$items.sku',
          name: '$items.name',
        },
        productId: { $first: '$items.productId' },
        name: { $first: '$items.name' },
        sku: { $first: '$items.sku' },
        primaryImage: { $first: '$items.primaryImage' },
        unitsSold: { $sum: '$items.quantity' },
        salesValue: { $sum: '$items.itemSubtotal' },
        orderIds: { $addToSet: '$_id' },
      },
    },
    {
      $project: {
        _id: 0,
        productId: 1,
        name: 1,
        sku: 1,
        primaryImage: 1,
        unitsSold: 1,
        salesValue: { $round: ['$salesValue', 2] },
        ordersCount: { $size: '$orderIds' },
      },
    },
    { $sort: { [sortField]: -1, unitsSold: -1 } },
  ];

  const [countResult, products] = await Promise.all([
    Order.aggregate([...pipeline, { $count: 'total' }]),
    Order.aggregate([...pipeline, { $skip: skip }, { $limit: numLimit }]),
  ]);

  const total = countResult[0]?.total || 0;

  return {
    dateRange: {
      preset,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      pages: Math.ceil(total / numLimit) || 1,
    },
    sortBy,
    products,
  };
}

/**
 * 5. Customer Analytics
 * Distinct identity (userId or guest email), new vs returning, and order frequency
 */
export async function getCustomerAnalytics(tenantId, dateFilter) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { startDate, endDate, preset, label } = parseDateRange(dateFilter);

  // Group valid orders by customer key
  const customerOrders = await Order.aggregate([
    {
      $match: getValidOrderMatch(tenantObjectId, startDate, endDate),
    },
    {
      $project: {
        customerKey: {
          $cond: [
            { $ne: ['$userId', null] },
            { $concat: ['user:', { $toString: '$userId' }] },
            {
              $concat: [
                'guest:',
                { $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', 'unknown'] } } } },
              ],
            },
          ],
        },
        userId: 1,
        customerEmail: {
          $toLower: { $trim: { input: { $ifNull: ['$customerInfo.email', ''] } } },
        },
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
      },
    },
    {
      $group: {
        _id: '$customerKey',
        userId: { $first: '$userId' },
        email: { $first: '$customerEmail' },
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$totalPayable' },
      },
    },
  ]);

  const totalCustomers = customerOrders.length;
  let newCount = 0;
  let returningCount = 0;

  // Frequency buckets
  let oneOrder = 0;
  let twoOrders = 0;
  let threeToFive = 0;
  let moreThanFive = 0;

  for (const c of customerOrders) {
    if (c.orderCount === 1) oneOrder++;
    else if (c.orderCount === 2) twoOrders++;
    else if (c.orderCount <= 5) threeToFive++;
    else moreThanFive++;
  }

  // Check prior orders to distinguish new vs returning
  if (totalCustomers > 0) {
    await Promise.all(
      customerOrders.map(async (cust) => {
        let priorMatch = {
          tenantId: tenantObjectId,
          orderStatus: { $ne: ORDER_STATUS.CANCELLED },
          'cancellation.isCancelled': { $ne: true },
          createdAt: { $lt: startDate },
        };

        if (cust.userId) {
          priorMatch.userId = cust.userId;
        } else if (cust.email) {
          priorMatch['customerInfo.email'] = new RegExp(`^${cust.email}$`, 'i');
        }

        const priorOrder = await Order.findOne(priorMatch).select('_id').lean();
        if (priorOrder) {
          returningCount++;
        } else {
          newCount++;
        }
      })
    );
  }

  return {
    dateRange: {
      preset,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalUniqueCustomers: totalCustomers,
    newCustomers: newCount,
    returningCustomers: returningCount,
    newCustomerPercentage: totalCustomers > 0 ? Math.round((newCount / totalCustomers) * 1000) / 10 : 0,
    returningCustomerPercentage:
      totalCustomers > 0 ? Math.round((returningCount / totalCustomers) * 1000) / 10 : 0,
    frequency: {
      oneOrder,
      twoOrders,
      threeToFive,
      moreThanFive,
    },
  };
}

/**
 * 6. Payment Analytics
 * Breakdown by method (COD, CARD, UPI) and status (Pending, Paid, Failed, Refunded)
 * Respects that CARD/UPI orders are pending until real payment gateway confirmation
 */
export async function getPaymentAnalytics(tenantId, dateFilter) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));
  const { startDate, endDate, preset, label } = parseDateRange(dateFilter);

  // Aggregation by Payment Method
  const methodAggregation = await Order.aggregate([
    {
      $match: getValidOrderMatch(tenantObjectId, startDate, endDate),
    },
    {
      $project: {
        paymentMethod: 1,
        paymentStatus: 1,
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
      },
    },
    {
      $group: {
        _id: '$paymentMethod',
        orderCount: { $sum: 1 },
        totalAmount: { $sum: '$totalPayable' },
        collectedAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$totalPayable', 0],
          },
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PENDING] }, '$totalPayable', 0],
          },
        },
      },
    },
  ]);

  const methodMap = new Map();
  for (const m of methodAggregation) {
    methodMap.set(m._id, m);
  }

  const supportedMethods = [PAYMENT_METHODS.COD, PAYMENT_METHODS.CARD, PAYMENT_METHODS.UPI];
  const byMethod = supportedMethods.map((m) => {
    const data = methodMap.get(m) || {
      orderCount: 0,
      totalAmount: 0,
      collectedAmount: 0,
      pendingAmount: 0,
    };
    return {
      method: m,
      label: m.toUpperCase(),
      orderCount: data.orderCount,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      collectedAmount: Math.round(data.collectedAmount * 100) / 100,
      pendingAmount: Math.round(data.pendingAmount * 100) / 100,
    };
  });

  // Aggregation by Payment Status
  const statusAggregation = await Order.aggregate([
    {
      $match: getValidOrderMatch(tenantObjectId, startDate, endDate),
    },
    {
      $project: {
        paymentStatus: 1,
        totalPayable: { $ifNull: ['$pricing.totalPayable', 0] },
      },
    },
    {
      $group: {
        _id: '$paymentStatus',
        orderCount: { $sum: 1 },
        totalAmount: { $sum: '$totalPayable' },
      },
    },
  ]);

  const statusMap = new Map();
  for (const s of statusAggregation) {
    statusMap.set(s._id, s);
  }

  const supportedStatuses = [
    PAYMENT_STATUS.PENDING,
    PAYMENT_STATUS.PAID,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.REFUNDED,
  ];

  const byStatus = supportedStatuses.map((s) => {
    const data = statusMap.get(s) || { orderCount: 0, totalAmount: 0 };
    return {
      status: s,
      orderCount: data.orderCount,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
    };
  });

  return {
    dateRange: {
      preset,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    byMethod,
    byStatus,
  };
}

/**
 * 7. Inventory Analytics
 * Tracked stock, low-stock, out-of-stock, and untracked/unknown inventory
 * Respects variants without double counting
 */
export async function getInventoryAnalytics(tenantId) {
  const tenantObjectId = new mongoose.Types.ObjectId(String(tenantId));

  const products = await Product.find({ tenantId: tenantObjectId })
    .select('name sku primaryImage stockQuantity inventoryStatus lowStockThreshold hasVariants variants isPublished')
    .lean();

  let totalProducts = products.length;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let unknownCount = 0;
  let totalTrackedStockUnits = 0;

  const lowStockItems = [];
  const outOfStockItems = [];
  const unknownInventoryItems = [];

  for (const prod of products) {
    // Check if product is variant-driven
    if (prod.hasVariants && Array.isArray(prod.variants) && prod.variants.length > 0) {
      // Sum variant stock, avoid double counting product-level stockQuantity
      let variantStockSum = 0;
      let hasUnknown = false;
      let allOutOfStock = true;

      for (const v of prod.variants) {
        if (!v.isActive) continue;
        if (v.inventoryStatus === 'unknown') {
          hasUnknown = true;
        } else {
          variantStockSum += v.stockQuantity || 0;
          if ((v.stockQuantity || 0) > 0) {
            allOutOfStock = false;
          }
        }
      }

      if (hasUnknown && variantStockSum === 0) {
        unknownCount++;
        unknownInventoryItems.push({
          id: prod._id,
          name: prod.name,
          sku: prod.sku,
          primaryImage: prod.primaryImage,
          inventoryStatus: 'unknown',
          reason: 'Variant stock unconfigured',
        });
      } else {
        totalTrackedStockUnits += variantStockSum;
        const threshold = prod.lowStockThreshold || 5;

        if (variantStockSum === 0 || allOutOfStock) {
          outOfStockCount++;
          outOfStockItems.push({
            id: prod._id,
            name: prod.name,
            sku: prod.sku,
            primaryImage: prod.primaryImage,
            stockQuantity: variantStockSum,
            inventoryStatus: 'out_of_stock',
          });
        } else if (variantStockSum <= threshold) {
          lowStockCount++;
          lowStockItems.push({
            id: prod._id,
            name: prod.name,
            sku: prod.sku,
            primaryImage: prod.primaryImage,
            stockQuantity: variantStockSum,
            threshold,
            inventoryStatus: 'low_stock',
          });
        } else {
          inStockCount++;
        }
      }
    } else {
      // Simple product without variants
      if (prod.inventoryStatus === 'unknown') {
        unknownCount++;
        unknownInventoryItems.push({
          id: prod._id,
          name: prod.name,
          sku: prod.sku,
          primaryImage: prod.primaryImage,
          inventoryStatus: 'unknown',
          reason: 'Untracked / unknown inventory status',
        });
      } else {
        const qty = prod.stockQuantity || 0;
        totalTrackedStockUnits += qty;
        const threshold = prod.lowStockThreshold || 5;

        if (prod.inventoryStatus === 'out_of_stock' || qty === 0) {
          outOfStockCount++;
          outOfStockItems.push({
            id: prod._id,
            name: prod.name,
            sku: prod.sku,
            primaryImage: prod.primaryImage,
            stockQuantity: qty,
            inventoryStatus: 'out_of_stock',
          });
        } else if (prod.inventoryStatus === 'low_stock' || qty <= threshold) {
          lowStockCount++;
          lowStockItems.push({
            id: prod._id,
            name: prod.name,
            sku: prod.sku,
            primaryImage: prod.primaryImage,
            stockQuantity: qty,
            threshold,
            inventoryStatus: 'low_stock',
          });
        } else {
          inStockCount++;
        }
      }
    }
  }

  return {
    totalProducts,
    totalTrackedStockUnits,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    unknownCount,
    lowStockItems: lowStockItems.slice(0, 10),
    outOfStockItems: outOfStockItems.slice(0, 10),
    unknownInventoryItems: unknownInventoryItems.slice(0, 10),
  };
}
