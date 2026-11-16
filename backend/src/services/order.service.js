import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Address } from '../models/Address.js';
import { Coupon } from '../models/Coupon.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  AUDIT_ACTIONS,
} from '../config/constants.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import * as notificationService from './notification.service.js';

/**
 * Generate a unique, tamper-resistant order number.
 * Format: AUR-<TIMESTAMP_BASE36>-<RANDOM_ALPHANUMERIC>
 * Example: AUR-M1X8K-9A2E
 */
export function generateOrderNumber(prefix = 'AUR') {
  const cleanPrefix = String(prefix || 'AUR').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanPrefix}-${timestampPart}-${randomPart}`;
}

/**
 * Place a customer order with authoritative revalidation, atomic inventory deduction,
 * and idempotency protection.
 */
export async function placeStorefrontOrder({
  tenant,
  userId = null,
  guestSessionId = null,
  addressId = null,
  guestAddress = null,
  couponCode = null,
  paymentMethod = PAYMENT_METHODS.COD,
  idempotencyKey = null,
  notes = '',
  req = null,
}) {
  const tenantId = tenant._id;

  // 1. Idempotency Check: Prevent duplicate orders from network retries or double-clicks
  if (idempotencyKey) {
    const existingOrder = await Order.findOne({
      tenantId,
      idempotencyKey: String(idempotencyKey).trim(),
    });
    if (existingOrder) {
      return { order: existingOrder, isDuplicate: true };
    }
  }

  // 2. Validate Payment Method
  const validMethods = Object.values(PAYMENT_METHODS);
  if (!paymentMethod || !validMethods.includes(paymentMethod.toLowerCase())) {
    throw new BadRequestError(
      `Invalid payment method '${paymentMethod}'. Supported options: ${validMethods.join(', ')}.`
    );
  }
  const selectedPaymentMethod = paymentMethod.toLowerCase();

  // 3. Resolve Cart
  let cart = null;
  if (userId) {
    cart = await Cart.findOne({ tenantId, userId });
  } else if (guestSessionId) {
    cart = await Cart.findOne({ tenantId, guestSessionId });
  }

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw new BadRequestError('Cannot place an order with an empty shopping cart.');
  }

  // 4. Resolve Customer Identity & Shipping Address Snapshot
  let customerName = '';
  let customerEmail = '';
  let customerPhone = '';
  let isGuest = false;
  let shippingAddressSnapshot = null;

  if (userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Customer user account not found.');
    customerName = user.name;
    customerEmail = user.email;
    customerPhone = user.phoneNumber || '';

    if (addressId) {
      const address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        throw new NotFoundError('Selected address was not found or does not belong to your account.');
      }
      shippingAddressSnapshot = {
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state || '',
        postalCode: address.postalCode,
        country: address.country || 'India',
        addressType: address.addressType || 'shipping',
      };
    } else if (guestAddress) {
      if (!guestAddress.name || !guestAddress.phone || !guestAddress.addressLine1 || !guestAddress.city || !guestAddress.postalCode) {
        throw new BadRequestError('Incomplete delivery address details provided.');
      }
      let cleanPhone = String(guestAddress.phone).replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.slice(2);
      }
      if (cleanPhone.length !== 10) {
        throw new BadRequestError('Contact phone must be a valid 10-digit number.');
      }
      shippingAddressSnapshot = {
        name: guestAddress.name.trim(),
        phone: cleanPhone,
        addressLine1: guestAddress.addressLine1.trim(),
        addressLine2: (guestAddress.addressLine2 || '').trim(),
        city: guestAddress.city.trim(),
        state: (guestAddress.state || '').trim(),
        postalCode: guestAddress.postalCode.trim(),
        country: (guestAddress.country || 'India').trim(),
        addressType: 'shipping',
      };
    } else {
      throw new BadRequestError('Delivery address is required to place an order.');
    }
  } else {
    // Guest customer checkout
    isGuest = true;
    if (!guestAddress || !guestAddress.name || !guestAddress.phone || !guestAddress.addressLine1 || !guestAddress.city || !guestAddress.postalCode) {
      throw new BadRequestError('Incomplete guest delivery address details provided.');
    }
    if (!guestAddress.email) {
      throw new BadRequestError('Customer email address is required for guest order confirmation.');
    }
    let cleanPhone = String(guestAddress.phone).replace(/\D/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (cleanPhone.length !== 10) {
      throw new BadRequestError('Contact phone must be a valid 10-digit number.');
    }
    customerName = guestAddress.name.trim();
    customerEmail = guestAddress.email.trim().toLowerCase();
    customerPhone = cleanPhone;
    shippingAddressSnapshot = {
      name: customerName,
      phone: cleanPhone,
      addressLine1: guestAddress.addressLine1.trim(),
      addressLine2: (guestAddress.addressLine2 || '').trim(),
      city: guestAddress.city.trim(),
      state: (guestAddress.state || '').trim(),
      postalCode: guestAddress.postalCode.trim(),
      country: (guestAddress.country || 'India').trim(),
      addressType: 'shipping',
    };
  }

  // 5. Authoritative Product & Variant Revalidation (Stock, Price, Status)
  const productIds = cart.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, tenantId }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let subtotal = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = productMap.get(String(item.productId));
    if (!product || !product.isPublished) {
      throw new BadRequestError(`Product '${item.sku}' is no longer active in this store.`);
    }

    let unitPrice = product.priceUSD;
    let verifiedSku = product.sku;
    let variantName = '';

    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
      if (!variant || !variant.isActive) {
        throw new BadRequestError(`Selected variant for '${product.name}' is no longer available.`);
      }
      if (variant.inventoryStatus === 'out_of_stock') {
        throw new BadRequestError(`Variant '${variant.name}' is currently out of stock.`);
      }
      if (variant.price !== null && variant.price !== undefined) {
        unitPrice = variant.price;
      }
      verifiedSku = variant.sku;
      variantName = variant.name;

      if (variant.inventoryStatus !== 'unknown' && variant.stockQuantity < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for '${variant.name}'. Only ${variant.stockQuantity} unit(s) remaining.`
        );
      }
    } else {
      if (product.inventoryStatus === 'out_of_stock' || product.inStock === false) {
        throw new BadRequestError(`Product '${product.name}' is currently out of stock.`);
      }
      if (product.inventoryStatus !== 'unknown' && product.stockQuantity > 0 && product.stockQuantity < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for '${product.name}'. Only ${product.stockQuantity} unit(s) remaining.`
        );
      }
    }

    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      sku: verifiedSku,
      primaryImage: product.primaryImage,
      variantId: item.variantId || null,
      variantName,
      selectedOptions: item.selectedOptions || {},
      quantity: item.quantity,
      unitPrice,
      itemSubtotal,
    });
  }

  // 6. Authoritative Coupon Revalidation & Discount Calculation
  let discount = 0;
  let verifiedCouponSnapshot = null;
  const targetCouponCode = couponCode || cart.appliedCoupon?.code;

  if (targetCouponCode) {
    const normalized = String(targetCouponCode).trim().toLowerCase();
    const coupon = await Coupon.findOne({ tenantId, normalizedCode: normalized });

    if (coupon && coupon.status === 'active') {
      const now = new Date();
      const isValidDate = (!coupon.startDate || now >= coupon.startDate) && now <= coupon.expiryDate;
      const meetsMinimum = subtotal >= coupon.minimumOrderAmount;
      const withinUsage = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit;

      if (isValidDate && meetsMinimum && withinUsage) {
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maximumDiscountAmount !== null && discount > coupon.maximumDiscountAmount) {
            discount = coupon.maximumDiscountAmount;
          }
        } else if (coupon.discountType === 'fixed_amount') {
          discount = Math.min(subtotal, coupon.discountValue);
        }

        discount = Math.round(discount * 100) / 100;
        verifiedCouponSnapshot = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: discount,
        };
      } else {
        throw new BadRequestError(`Coupon '${targetCouponCode}' is expired or does not meet order requirements.`);
      }
    } else {
      throw new BadRequestError(`Coupon '${targetCouponCode}' is invalid or inactive.`);
    }
  }

  // 7. Authoritative Tax & Delivery Calculation from Tenant Settings
  const taxRate = tenant.settings?.taxRate ? Number(tenant.settings.taxRate) : 0;
  const taxAmount = taxRate > 0 ? Math.round(((subtotal - discount) * taxRate) / 100) : 0;

  const configuredShipping = tenant.settings?.shippingFee !== undefined ? Number(tenant.settings.shippingFee) : 0;
  const shippingAmount = configuredShipping;

  const totalPayable = Math.max(0, subtotal - discount + taxAmount + shippingAmount);
  const currency = tenant.settings?.currency || 'INR';
  const currencySymbol =
    tenant.settings?.currencySymbol ||
    (currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$');

  // 8. Atomic Inventory Deduction & Order Creation via MongoDB Session / Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 8.1 Deduct stock atomically for all tracked items
    for (const item of orderItems) {
      if (item.variantId) {
        const variantUpd = await Product.updateOne(
          {
            _id: item.productId,
            tenantId,
            'variants._id': item.variantId,
            'variants.inventoryStatus': { $ne: 'unknown' },
            'variants.stockQuantity': { $gte: item.quantity },
          },
          {
            $inc: { 'variants.$.stockQuantity': -item.quantity },
          },
          { session }
        );

        // If the item has tracked inventory but insufficient stock was available:
        const prodDoc = productMap.get(String(item.productId));
        const varDoc = (prodDoc.variants || []).find((v) => String(v._id) === String(item.variantId));
        if (varDoc && varDoc.inventoryStatus !== 'unknown' && variantUpd.matchedCount === 0) {
          throw new BadRequestError(
            `Stock level changed during checkout for variant '${item.variantName}'. Please review your cart.`
          );
        }
      } else {
        const prodDoc = productMap.get(String(item.productId));
        if (prodDoc && prodDoc.inventoryStatus !== 'unknown' && prodDoc.stockQuantity > 0) {
          const prodUpd = await Product.updateOne(
            {
              _id: item.productId,
              tenantId,
              inventoryStatus: { $ne: 'unknown' },
              stockQuantity: { $gte: item.quantity },
            },
            {
              $inc: { stockQuantity: -item.quantity },
            },
            { session }
          );

          if (prodUpd.matchedCount === 0) {
            throw new BadRequestError(
              `Insufficient stock available for '${item.name}' to complete checkout.`
            );
          }
        }
      }
    }

    // 8.2 Atomic coupon redemption count increment
    if (verifiedCouponSnapshot) {
      const couponUpd = await Coupon.updateOne(
        {
          tenantId,
          normalizedCode: verifiedCouponSnapshot.code.toLowerCase().trim(),
          $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
        },
        {
          $inc: { usedCount: 1 },
        },
        { session }
      );

      if (couponUpd.matchedCount === 0) {
        throw new BadRequestError(
          `Coupon '${verifiedCouponSnapshot.code}' usage limit has been exhausted.`
        );
      }
    }

    // 8.3 Generate unique order number
    const orderNumber = generateOrderNumber(tenant.slug ? tenant.slug.substring(0, 3) : 'AUR');

    // 8.4 Create Order Record
    const [createdOrder] = await Order.create(
      [
        {
          tenantId,
          userId: userId || null,
          customerInfo: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            isGuest,
          },
          orderNumber,
          items: orderItems,
          shippingAddress: shippingAddressSnapshot,
          billingAddress: shippingAddressSnapshot,
          pricing: {
            subtotal,
            discount,
            coupon: verifiedCouponSnapshot,
            taxRate: taxRate > 0 ? `${taxRate}%` : 'Complimentary / Inclusive',
            taxAmount,
            shippingFee: shippingAmount === 0 ? 'Complimentary Insured Delivery' : shippingAmount,
            shippingAmount,
            totalPayable: Math.round(totalPayable * 100) / 100,
            currency,
            currencySymbol,
          },
          paymentMethod: selectedPaymentMethod,
          paymentStatus: PAYMENT_STATUS.PENDING, // All Phase 5 payment options begin as pending
          orderStatus: ORDER_STATUS.PENDING,
          idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : undefined,
          notes: String(notes || '').trim(),
        },
      ],
      { session }
    );

    // 8.5 Clear the shopping cart
    cart.items = [];
    cart.subtotal = 0;
    cart.appliedCoupon = null;
    await cart.save({ session });

    await session.commitTransaction();

    // 8.5.1 Authoritative Customer sync into `customers` collection
    try {
      await Customer.findOneAndUpdate(
        { tenantId, email: customerEmail },
        {
          $set: {
            tenantId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone || '',
            status: 'active',
            ...(userId ? { userId } : {}),
            lastOrderDate: new Date(),
          },
          $inc: {
            totalOrders: 1,
            totalSpent: Math.round(createdOrder.pricing.totalPayable * 100) / 100,
          },
        },
        { upsert: true, new: true }
      );
    } catch (custErr) {
      console.warn('[OrderService] Non-fatal customer record sync:', custErr.message);
    }

    // 8.6 Audit Logging
    await logAudit({
      tenantId,
      userId: userId || null,
      action: AUDIT_ACTIONS.ORDER_CREATE,
      resource: 'Order',
      resourceId: createdOrder._id,
      details: {
        orderNumber: createdOrder.orderNumber,
        itemCount: createdOrder.items.length,
        totalPayable: createdOrder.pricing.totalPayable,
        paymentMethod: selectedPaymentMethod,
        isGuest,
      },
      req,
    });

    // 8.7 Safe in-app notification creation
    try {
      await notificationService.notifyOrderPlaced({ order: createdOrder, tenant, req });
    } catch (notifErr) {
      console.error('[NotificationService] Failed to generate order placed notifications:', notifErr.message);
    }

    return { order: createdOrder, isDuplicate: false };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * List tenant orders with pagination, status filters, payment filters, and summary metrics.
 * Strictly scoped to authenticated tenant.
 */
export async function listTenantOrders(tenantId, query = {}) {
  const {
    search,
    orderStatus,
    paymentMethod,
    paymentStatus,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = query;

  const filter = { tenantId };

  if (orderStatus && orderStatus !== 'all') {
    filter.orderStatus = String(orderStatus).toLowerCase().trim();
  }

  if (paymentMethod && paymentMethod !== 'all') {
    filter.paymentMethod = String(paymentMethod).toLowerCase().trim();
  }

  if (paymentStatus && paymentStatus !== 'all') {
    filter.paymentStatus = String(paymentStatus).toLowerCase().trim();
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  if (search && String(search).trim() !== '') {
    const q = String(search).trim();
    filter.$or = [
      { orderNumber: { $regex: q, $options: 'i' } },
      { 'customerInfo.name': { $regex: q, $options: 'i' } },
      { 'customerInfo.email': { $regex: q, $options: 'i' } },
      { 'customerInfo.phone': { $regex: q, $options: 'i' } },
      { 'items.sku': { $regex: q, $options: 'i' } },
      { 'items.name': { $regex: q, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total, metricsAggregation] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ['$orderStatus', ORDER_STATUS.CANCELLED] }, '$pricing.totalPayable', 0],
            },
          },
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.PENDING] }, 1, 0] },
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.CONFIRMED] }, 1, 0] },
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.PROCESSING] }, 1, 0] },
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.SHIPPED] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.DELIVERED] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', ORDER_STATUS.CANCELLED] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const metrics = metricsAggregation[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };

  return {
    orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    metrics,
  };
}

/**
 * Get tenant order by ID with strict tenant boundary enforcement.
 */
export async function getTenantOrderById(tenantId, orderId) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new BadRequestError('Invalid order ID provided.');
  }

  const order = await Order.findOne({ _id: orderId, tenantId });
  if (!order) {
    throw new NotFoundError(`Order was not found in this store.`);
  }

  return order;
}

/**
 * Update order status by Tenant Admin with validation of permitted state transitions,
 * atomic stock restoration on cancellation, and restriction against arbitrary paid status.
 */
export async function updateTenantOrderStatus(tenantId, orderId, { newStatus, notes, adminUser, req }) {
  if (!newStatus) {
    throw new BadRequestError('New order status is required.');
  }

  const normalizedStatus = String(newStatus).toLowerCase().trim();
  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(normalizedStatus)) {
    throw new BadRequestError(
      `Invalid order status '${newStatus}'. Permitted values: ${validStatuses.join(', ')}.`
    );
  }

  const order = await getTenantOrderById(tenantId, orderId);

  // If status is unchanged, return existing
  if (order.orderStatus === normalizedStatus) {
    return order;
  }

  // Permitted status transition matrix
  const ALLOWED_TRANSITIONS = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
  };

  const allowedNext = ALLOWED_TRANSITIONS[order.orderStatus] || [];
  if (!allowedNext.includes(normalizedStatus)) {
    throw new BadRequestError(
      `Cannot transition order status from '${order.orderStatus}' to '${normalizedStatus}'.`
    );
  }

  // Handle Cancellation transition
  if (normalizedStatus === ORDER_STATUS.CANCELLED) {
    return await cancelOrderInternal(order, {
      cancelledBy: adminUser?._id,
      role: 'store_admin',
      reason: notes || 'Cancelled by Store Admin',
      req,
    });
  }

  // Handle Normal Progression
  const previousStatus = order.orderStatus;
  order.orderStatus = normalizedStatus;

  // For COD orders: When order is delivered, COD payment collection is recorded
  if (normalizedStatus === ORDER_STATUS.DELIVERED && order.paymentMethod === PAYMENT_METHODS.COD) {
    order.paymentStatus = PAYMENT_STATUS.PAID;
  }

  if (notes) {
    order.notes = notes.trim();
  }

  await order.save();

  await logAudit({
    tenantId,
    userId: adminUser?._id,
    action: AUDIT_ACTIONS.ORDER_STATUS_UPDATE,
    resource: 'Order',
    resourceId: order._id,
    details: {
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: normalizedStatus,
      paymentStatus: order.paymentStatus,
    },
    req,
  });

  try {
    await notificationService.notifyOrderStatusUpdated({
      order,
      previousStatus,
      newStatus: normalizedStatus,
      updatedBy: adminUser?._id,
      req,
    });
  } catch (notifErr) {
    console.error('[NotificationService] Failed to notify order status update:', notifErr.message);
  }

  return order;
}

/**
 * Internal atomic order cancellation: restores tracked stock quantities exactly once,
 * reverses coupon usage count, and transitions status to cancelled.
 */
export async function cancelOrderInternal(order, { cancelledBy = null, role = 'store_admin', reason = '', req = null }) {
  if (order.cancellation?.isCancelled || order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw new BadRequestError('This order is already cancelled.');
  }

  const NON_CANCELLABLE = [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED];
  if (NON_CANCELLABLE.includes(order.orderStatus)) {
    throw new BadRequestError(
      `Orders in '${order.orderStatus}' status cannot be cancelled.`
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Atomic inventory restoration for tracked items
    if (!order.cancellation?.inventoryRestored) {
      for (const item of order.items) {
        if (item.variantId) {
          await Product.updateOne(
            {
              _id: item.productId,
              tenantId: order.tenantId,
              'variants._id': item.variantId,
              'variants.inventoryStatus': { $ne: 'unknown' },
            },
            {
              $inc: { 'variants.$.stockQuantity': item.quantity },
            },
            { session }
          );
        } else {
          await Product.updateOne(
            {
              _id: item.productId,
              tenantId: order.tenantId,
              inventoryStatus: { $ne: 'unknown' },
            },
            {
              $inc: { stockQuantity: item.quantity },
            },
            { session }
          );
        }
      }
    }

    // 2. Atomic coupon usage reversal
    if (order.pricing?.coupon?.code && !order.cancellation?.couponRestored) {
      await Coupon.updateOne(
        {
          tenantId: order.tenantId,
          normalizedCode: order.pricing.coupon.code.trim().toLowerCase(),
          usedCount: { $gt: 0 },
        },
        {
          $inc: { usedCount: -1 },
        },
        { session }
      );
    }

    // 3. Update order state
    order.orderStatus = ORDER_STATUS.CANCELLED;
    order.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: {
        userId: cancelledBy,
        role,
      },
      reason: String(reason || '').trim(),
      inventoryRestored: true,
      couponRestored: Boolean(order.pricing?.coupon?.code),
    };

    await order.save({ session });
    await session.commitTransaction();

    await logAudit({
      tenantId: order.tenantId,
      userId: cancelledBy,
      action: AUDIT_ACTIONS.ORDER_CANCEL,
      resource: 'Order',
      resourceId: order._id,
      details: {
        orderNumber: order.orderNumber,
        cancelledByRole: role,
        reason,
        inventoryRestored: true,
      },
      req,
    });

    try {
      await notificationService.notifyOrderCancelled({
        order,
        cancelledBy,
        role,
        reason,
        req,
      });
    } catch (notifErr) {
      console.error('[NotificationService] Failed to notify order cancelled:', notifErr.message);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * List orders belonging to an authenticated customer.
 */
export async function listCustomerOrders(userId, query = {}) {
  const { tenantId, page = 1, limit = 20 } = query;

  const filter = { userId };
  if (tenantId) {
    filter.tenantId = tenantId;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('tenantId', 'name slug logoUrl settings.currency settings.currencySymbol')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Get customer order by ID with strict customer ownership enforcement.
 */
export async function getCustomerOrderById(userId, orderId) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new BadRequestError('Invalid order ID provided.');
  }

  const order = await Order.findOne({ _id: orderId, userId }).populate(
    'tenantId',
    'name slug logoUrl settings.currency settings.currencySymbol'
  );

  if (!order) {
    throw new NotFoundError('Order not found or does not belong to your account.');
  }

  return order;
}

/**
 * Customer self-service cancellation of eligible orders.
 */
export async function customerCancelOrder(userId, orderId, { reason = '', req = null }) {
  const order = await getCustomerOrderById(userId, orderId);

  return await cancelOrderInternal(order, {
    cancelledBy: userId,
    role: 'customer',
    reason: reason || 'Cancelled by customer',
    req,
  });
}
