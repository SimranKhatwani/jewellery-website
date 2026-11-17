import * as orderService from '../services/order.service.js';

/**
 * POST /api/v1/storefront/:storeSlug/orders
 * Public Storefront Order Placement API (Guest + Authenticated Customer)
 */
export const placeStorefrontOrder = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.body.guestSessionId;
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

    const {
      addressId,
      guestAddress,
      couponCode,
      paymentMethod,
      notes,
    } = req.body;

    const result = await orderService.placeStorefrontOrder({
      tenant,
      userId,
      guestSessionId,
      addressId,
      guestAddress,
      couponCode,
      paymentMethod,
      idempotencyKey,
      notes,
      req,
    });

    const statusCode = result.isDuplicate ? 200 : 201;

    res.status(statusCode).json({
      success: true,
      message: result.isDuplicate
        ? 'Existing order returned (idempotent request).'
        : 'Order placed successfully. Thank you for shopping with us.',
      order: result.order,
      isDuplicate: result.isDuplicate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders (or /api/v1/admin/orders)
 * Tenant Admin Orders List with metrics, search and filters
 */
export const getAdminOrders = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const result = await orderService.listTenantOrders(tenantId, req.query);

    res.json({
      success: true,
      count: result.orders.length,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/:orderId
 * Tenant Admin Order Details
 */
export const getAdminOrderDetails = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const order = await orderService.getTenantOrderById(tenantId, req.params.orderId);

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/orders/:orderId/status
 * Tenant Admin Update Order Status
 */
export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const order = await orderService.updateTenantOrderStatus(tenantId, req.params.orderId, {
      newStatus: req.body.orderStatus,
      notes: req.body.notes,
      adminUser: req.user,
      req,
    });

    res.json({
      success: true,
      message: 'Order status updated successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/orders/:orderId/payment-status
 * Tenant Admin Update Order Payment Status
 */
export const updateAdminPaymentStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const order = await orderService.updateTenantOrderPaymentStatus(tenantId, req.params.orderId, {
      newPaymentStatus: req.body.paymentStatus,
      adminUser: req.user,
      req,
    });

    res.json({
      success: true,
      message: 'Order payment status updated successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/orders/:orderId/cancel
 * Tenant Admin Cancel Order
 */
export const cancelAdminOrder = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const order = await orderService.getTenantOrderById(tenantId, req.params.orderId);
    const updated = await orderService.cancelOrderInternal(order, {
      cancelledBy: req.user?._id,
      role: 'store_admin',
      reason: req.body.reason || 'Cancelled by Store Admin',
      req,
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully and inventory restored.',
      order: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/me/orders
 * Authenticated Customer Orders List
 */
export const getCustomerOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await orderService.listCustomerOrders(userId, req.query);

    res.json({
      success: true,
      count: result.orders.length,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/me/orders/:orderId
 * Authenticated Customer Order Details
 */
export const getCustomerOrderDetails = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const order = await orderService.getCustomerOrderById(userId, req.params.orderId);

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/me/orders/:orderId/cancel
 * Authenticated Customer Order Cancellation
 */
export const cancelCustomerOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const order = await orderService.customerCancelOrder(userId, req.params.orderId, {
      reason: req.body.reason,
      req,
    });

    res.json({
      success: true,
      message: 'Your order has been cancelled and stock has been restored.',
      order,
    });
  } catch (error) {
    next(error);
  }
};
