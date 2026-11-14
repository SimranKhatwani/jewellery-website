import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import {
  NOTIFICATION_TYPES,
  RECIPIENT_TYPES,
  MEMBERSHIP_STATUS,
  ORDER_STATUS,
} from '../config/constants.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { emitToTenantAdmins, emitToCustomer } from '../socket.js';

/**
 * Safe, idempotent notification creation.
 * If an eventKey already exists, returns the existing record without creating duplicates.
 */
export async function createNotification({
  recipientUserId,
  tenantId,
  recipientType,
  title,
  message,
  notificationType,
  relatedEntityType = 'Order',
  relatedEntityId = null,
  metadata = {},
  eventKey = undefined,
}) {
  if (!recipientUserId || !tenantId || !recipientType || !title || !message || !notificationType) {
    throw new BadRequestError('Missing required notification parameters.');
  }

  // Idempotency check: if eventKey provided and exists, return existing
  if (eventKey) {
    const existing = await Notification.findOne({ eventKey });
    if (existing) {
      return { notification: existing, isDuplicate: true };
    }
  }

  try {
    const notification = await Notification.create({
      recipientUserId,
      tenantId,
      recipientType,
      title: title.trim(),
      message: message.trim(),
      notificationType,
      relatedEntityType,
      relatedEntityId,
      metadata,
      eventKey: eventKey ? String(eventKey).trim() : undefined,
      isRead: false,
    });

    return { notification, isDuplicate: false };
  } catch (err) {
    // Gracefully handle MongoDB duplicate key error (code 11000) for eventKey
    if (err.code === 11000 && eventKey) {
      const existing = await Notification.findOne({ eventKey });
      if (existing) {
        return { notification: existing, isDuplicate: true };
      }
    }
    throw err;
  }
}

/**
 * Trigger in-app notifications when a customer order is successfully placed.
 * Notifies the authenticated customer (if logged in) and all active store staff/admins.
 */
export async function notifyOrderPlaced({ order, tenant = null, req = null }) {
  if (!order) return;

  const tenantId = order.tenantId;
  const orderNumber = order.orderNumber;
  const currencySymbol = order.pricing?.currencySymbol || '₹';
  const totalPayable = order.pricing?.totalPayable ?? 0;
  const paymentMethod = (order.paymentMethod || 'cod').toUpperCase();

  // 1. Notify Customer (if order placed by an authenticated user)
  if (order.userId) {
    const customerEventKey = `order_placed_cust_${order._id}_${order.userId}`;
    await createNotification({
      recipientUserId: order.userId,
      tenantId,
      recipientType: RECIPIENT_TYPES.CUSTOMER,
      notificationType: NOTIFICATION_TYPES.ORDER_PLACED,
      title: 'Order Placed Successfully',
      message: `Thank you! Your order #${orderNumber} for ${currencySymbol}${totalPayable} has been placed successfully.`,
      relatedEntityType: 'Order',
      relatedEntityId: order._id,
      metadata: {
        orderNumber,
        orderStatus: order.orderStatus,
        totalPayable,
        currencySymbol,
        paymentMethod: order.paymentMethod,
        itemCount: order.items?.length || 0,
      },
      eventKey: customerEventKey,
    });
  }

  // 2. Identify Tenant Admins & Staff to notify
  const adminUserIds = new Set();

  // 2.1 Fetch active tenant memberships
  const activeMembers = await TenantMembership.find({
    tenantId,
    status: MEMBERSHIP_STATUS.ACTIVE,
  }).select('userId');

  for (const m of activeMembers) {
    if (m.userId) {
      adminUserIds.add(String(m.userId));
    }
  }

  // 2.2 Include tenant owner if not already in membership
  if (tenant && tenant.ownerId) {
    adminUserIds.add(String(tenant.ownerId));
  } else {
    const tenantDoc = await Tenant.findById(tenantId).select('ownerId');
    if (tenantDoc?.ownerId) {
      adminUserIds.add(String(tenantDoc.ownerId));
    }
  }

  // 2.3 Fallback to platform administrators if no store-specific memberships found
  if (adminUserIds.size === 0) {
    const fallbackAdmins = await User.find({
      $or: [{ isSuperAdmin: true }, { role: 'admin' }],
      status: 'active',
    }).select('_id');
    for (const fa of fallbackAdmins) {
      adminUserIds.add(String(fa._id));
    }
  }

  // 2.4 Create notification for each active admin (handles both guest and logged-in orders)
  const isGuest = Boolean(order.customerInfo?.isGuest);
  const customerName = order.customerInfo?.name || (isGuest ? 'Guest Shopper' : 'Customer');
  const customerEmail = order.customerInfo?.email || '';
  const customerPhone = order.customerInfo?.phone || '';

  const adminTitle = isGuest
    ? `New Order Received: #${orderNumber} (Guest Checkout)`
    : `New Order Received: #${orderNumber}`;

  const adminMessage = isGuest
    ? `New guest order #${orderNumber} placed by ${customerName}${customerEmail ? ` (${customerEmail})` : ''} for ${currencySymbol}${totalPayable} (${paymentMethod}).`
    : `New order #${orderNumber} placed by ${customerName} for ${currencySymbol}${totalPayable} (${paymentMethod}).`;

  for (const adminId of adminUserIds) {
    const adminEventKey = `order_placed_admin_${order._id}_${adminId}`;
    await createNotification({
      recipientUserId: adminId,
      tenantId,
      recipientType: RECIPIENT_TYPES.ADMIN,
      notificationType: NOTIFICATION_TYPES.ADMIN_NEW_ORDER,
      title: adminTitle,
      message: adminMessage,
      relatedEntityType: 'Order',
      relatedEntityId: order._id,
      metadata: {
        orderNumber,
        orderStatus: order.orderStatus,
        totalPayable,
        currencySymbol,
        paymentMethod: order.paymentMethod,
        customerName,
        customerEmail,
        customerPhone,
        isGuest,
      },
      eventKey: adminEventKey,
    });
  }

  // Real-time WebSocket emission for instant push notifications
  try {
    emitToTenantAdmins(tenantId, 'notification:new_order', {
      type: NOTIFICATION_TYPES.ADMIN_NEW_ORDER,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalPayable,
        currencySymbol,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        customerInfo: order.customerInfo,
        itemsCount: order.items?.length || 0,
        createdAt: order.createdAt || new Date(),
      },
      notification: {
        title: adminTitle,
        message: adminMessage,
        createdAt: new Date(),
        metadata: {
          orderNumber,
          orderStatus: order.orderStatus,
          totalPayable,
          currencySymbol,
          paymentMethod: order.paymentMethod,
          customerName,
          customerEmail,
          isGuest,
        },
      },
    });

    if (order.userId) {
      emitToCustomer(order.userId, 'notification:order_placed', {
        type: NOTIFICATION_TYPES.ORDER_PLACED,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalPayable,
          currencySymbol,
          orderStatus: order.orderStatus,
        },
        notification: {
          title: 'Order Placed Successfully',
          message: `Thank you! Your order #${orderNumber} for ${currencySymbol}${totalPayable} has been placed successfully.`,
          createdAt: new Date(),
        },
      });
    }
  } catch (wsErr) {
    console.warn('[Socket.io] Real-time order notification emission error:', wsErr.message);
  }
}

/**
 * Trigger in-app notifications when an order status is updated by store staff.
 */
export async function notifyOrderStatusUpdated({ order, previousStatus, newStatus, updatedBy = null, req = null }) {
  if (!order || !order.userId) return; // Only customers with registered accounts receive customer notifications

  const orderNumber = order.orderNumber;
  const currencySymbol = order.pricing?.currencySymbol || '₹';

  let title = `Order Status Updated: #${orderNumber}`;
  let message = `Your order #${orderNumber} is now ${newStatus}.`;
  let notificationType = NOTIFICATION_TYPES.ORDER_PROCESSING;

  switch (newStatus) {
    case ORDER_STATUS.CONFIRMED:
      title = `Order Confirmed: #${orderNumber}`;
      message = `Your order #${orderNumber} has been verified and confirmed by the atelier.`;
      notificationType = NOTIFICATION_TYPES.ORDER_CONFIRMED;
      break;
    case ORDER_STATUS.PROCESSING:
      title = `Order Processing: #${orderNumber}`;
      message = `Your jewellery for order #${orderNumber} is currently being prepared for dispatch.`;
      notificationType = NOTIFICATION_TYPES.ORDER_PROCESSING;
      break;
    case ORDER_STATUS.SHIPPED:
      title = `Order Shipped: #${orderNumber}`;
      message = `Order #${orderNumber} has been dispatched for complimentary insured delivery.`;
      notificationType = NOTIFICATION_TYPES.ORDER_SHIPPED;
      break;
    case ORDER_STATUS.DELIVERED:
      title = `Order Delivered: #${orderNumber}`;
      message = `Your order #${orderNumber} has been safely delivered. Thank you for choosing AURELLE.`;
      notificationType = NOTIFICATION_TYPES.ORDER_DELIVERED;
      break;
    default:
      title = `Order Update: #${orderNumber}`;
      message = `Your order #${orderNumber} status has transitioned to '${newStatus}'.`;
      notificationType = NOTIFICATION_TYPES.ORDER_PROCESSING;
      break;
  }

  const eventKey = `order_status_${order._id}_${newStatus}_${order.userId}`;

  await createNotification({
    recipientUserId: order.userId,
    tenantId: order.tenantId,
    recipientType: RECIPIENT_TYPES.CUSTOMER,
    notificationType,
    title,
    message,
    relatedEntityType: 'Order',
    relatedEntityId: order._id,
    metadata: {
      orderNumber,
      previousStatus,
      newStatus,
      totalPayable: order.pricing?.totalPayable,
      currencySymbol,
    },
    eventKey,
  });

  // Real-time WebSocket emission for order status updates
  try {
    if (order.userId) {
      emitToCustomer(order.userId, 'notification:order_status', {
        type: notificationType,
        orderNumber,
        previousStatus,
        newStatus,
        orderStatus: newStatus,
        title,
        message,
        orderId: order._id,
      });
    }

    emitToTenantAdmins(order.tenantId, 'order:status_updated', {
      orderId: order._id,
      orderNumber,
      previousStatus,
      newStatus,
    });
  } catch (wsErr) {
    console.warn('[Socket.io] Real-time status update emit error:', wsErr.message);
  }
}

/**
 * Trigger in-app notifications when an order is cancelled.
 */
export async function notifyOrderCancelled({ order, cancelledBy = null, role = 'store_admin', reason = '', req = null }) {
  if (!order) return;

  const orderNumber = order.orderNumber;
  const currencySymbol = order.pricing?.currencySymbol || '₹';
  const cleanReason = String(reason || '').trim();

  // Case A: Cancelled by Store Admin -> Notify Customer
  if (role === 'store_admin' && order.userId) {
    const customerEventKey = `order_cancelled_cust_${order._id}_${order.userId}`;
    await createNotification({
      recipientUserId: order.userId,
      tenantId: order.tenantId,
      recipientType: RECIPIENT_TYPES.CUSTOMER,
      notificationType: NOTIFICATION_TYPES.ORDER_CANCELLED,
      title: `Order Cancelled: #${orderNumber}`,
      message: `Your order #${orderNumber} was cancelled by the store.${cleanReason ? ` Reason: ${cleanReason}` : ''}`,
      relatedEntityType: 'Order',
      relatedEntityId: order._id,
      metadata: {
        orderNumber,
        reason: cleanReason,
        cancelledByRole: 'store_admin',
        totalPayable: order.pricing?.totalPayable,
        currencySymbol,
      },
      eventKey: customerEventKey,
    });
  }

  // Case B: Cancelled by Customer -> Notify Tenant Admins
  if (role === 'customer') {
    const adminUserIds = new Set();
    const activeMembers = await TenantMembership.find({
      tenantId: order.tenantId,
      status: MEMBERSHIP_STATUS.ACTIVE,
    }).select('userId');

    for (const m of activeMembers) {
      if (m.userId) adminUserIds.add(String(m.userId));
    }

    const tenantDoc = await Tenant.findById(order.tenantId).select('ownerId');
    if (tenantDoc?.ownerId) adminUserIds.add(String(tenantDoc.ownerId));

    const customerName = order.customerInfo?.name || 'Customer';

    for (const adminId of adminUserIds) {
      const adminEventKey = `order_cancelled_admin_${order._id}_${adminId}`;
      await createNotification({
        recipientUserId: adminId,
        tenantId: order.tenantId,
        recipientType: RECIPIENT_TYPES.ADMIN,
        notificationType: NOTIFICATION_TYPES.ADMIN_ORDER_CANCELLED,
        title: `Order Cancelled by Customer: #${orderNumber}`,
        message: `${customerName} cancelled order #${orderNumber}.${cleanReason ? ` Reason: ${cleanReason}` : ''}`,
        relatedEntityType: 'Order',
        relatedEntityId: order._id,
        metadata: {
          orderNumber,
          customerName,
          reason: cleanReason,
          cancelledByRole: 'customer',
          totalPayable: order.pricing?.totalPayable,
          currencySymbol,
        },
        eventKey: adminEventKey,
      });
    }
  }

  // Real-time WebSocket emission for cancellation events
  try {
    emitToTenantAdmins(order.tenantId, 'notification:order_cancelled', {
      type: NOTIFICATION_TYPES.ADMIN_ORDER_CANCELLED,
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: cleanReason,
      cancelledByRole: role,
    });

    if (order.userId) {
      emitToCustomer(order.userId, 'notification:order_cancelled', {
        type: NOTIFICATION_TYPES.ORDER_CANCELLED,
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: cleanReason,
        cancelledByRole: role,
      });
    }
  } catch (wsErr) {
    console.warn('[Socket.io] Real-time cancel emit error:', wsErr.message);
  }
}

/**
 * Retrieve notifications for an authenticated customer.
 * Strictly scoped to req.user._id and recipientType: 'customer'.
 */
export async function listCustomerNotifications(userId, query = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    recipientUserId: userId,
    recipientType: RECIPIENT_TYPES.CUSTOMER,
  };

  if (String(unreadOnly) === 'true') {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      recipientUserId: userId,
      recipientType: RECIPIENT_TYPES.CUSTOMER,
      isRead: false,
    }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    unreadCount,
  };
}

/**
 * Unread notification count for an authenticated customer.
 */
export async function getCustomerUnreadCount(userId) {
  return await Notification.countDocuments({
    recipientUserId: userId,
    recipientType: RECIPIENT_TYPES.CUSTOMER,
    isRead: false,
  });
}

/**
 * Mark a specific customer notification as read.
 */
export async function markCustomerNotificationRead(userId, notificationId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new BadRequestError('Invalid notification ID.');
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientUserId: userId, recipientType: RECIPIENT_TYPES.CUSTOMER },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    throw new NotFoundError('Notification not found or does not belong to your account.');
  }

  return notification;
}

/**
 * Mark all notifications as read for an authenticated customer.
 */
export async function markAllCustomerNotificationsRead(userId) {
  const result = await Notification.updateMany(
    { recipientUserId: userId, recipientType: RECIPIENT_TYPES.CUSTOMER, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { updatedCount: result.modifiedCount };
}

/**
 * Retrieve notifications for an authenticated Tenant Admin.
 * Strictly scoped to req.tenant._id and req.user._id (or all tenant admin notifications for Super Admin).
 */
export async function listAdminNotifications(tenantId, adminUserId, query = {}, isSuperAdmin = false) {
  const { page = 1, limit = 20, unreadOnly = false } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    tenantId,
    recipientType: RECIPIENT_TYPES.ADMIN,
  };

  if (!isSuperAdmin) {
    filter.recipientUserId = adminUserId;
  } else {
    filter.$or = [
      { recipientUserId: adminUserId },
      { recipientType: RECIPIENT_TYPES.ADMIN },
    ];
  }

  if (String(unreadOnly) === 'true') {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      ...filter,
      isRead: false,
    }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    unreadCount,
  };
}

/**
 * Unread notification count for an authenticated Tenant Admin.
 */
export async function getAdminUnreadCount(tenantId, adminUserId, isSuperAdmin = false) {
  const filter = {
    tenantId,
    recipientType: RECIPIENT_TYPES.ADMIN,
    isRead: false,
  };

  if (!isSuperAdmin) {
    filter.recipientUserId = adminUserId;
  } else {
    filter.$or = [
      { recipientUserId: adminUserId },
      { recipientType: RECIPIENT_TYPES.ADMIN },
    ];
  }

  return await Notification.countDocuments(filter);
}

/**
 * Mark a specific Admin notification as read.
 */
export async function markAdminNotificationRead(tenantId, adminUserId, notificationId, isSuperAdmin = false) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new BadRequestError('Invalid notification ID.');
  }

  const filter = {
    _id: notificationId,
    tenantId,
    recipientType: RECIPIENT_TYPES.ADMIN,
  };

  if (!isSuperAdmin) {
    filter.recipientUserId = adminUserId;
  }

  const notification = await Notification.findOneAndUpdate(
    filter,
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    throw new NotFoundError('Notification not found or access restricted.');
  }

  return notification;
}

/**
 * Mark all notifications as read for an authenticated Tenant Admin.
 */
export async function markAllAdminNotificationsRead(tenantId, adminUserId, isSuperAdmin = false) {
  const filter = {
    tenantId,
    recipientType: RECIPIENT_TYPES.ADMIN,
    isRead: false,
  };

  if (!isSuperAdmin) {
    filter.recipientUserId = adminUserId;
  }

  const result = await Notification.updateMany(
    filter,
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { updatedCount: result.modifiedCount };
}
