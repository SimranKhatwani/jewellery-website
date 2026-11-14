import * as notificationService from '../services/notification.service.js';

/**
 * -------------------------------------------------------------
 * CUSTOMER NOTIFICATION CONTROLLERS
 * -------------------------------------------------------------
 */

/**
 * GET /api/v1/customers/me/notifications
 * List notifications for the authenticated customer
 */
export const getCustomerNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await notificationService.listCustomerNotifications(userId, req.query);

    res.json({
      success: true,
      count: result.notifications.length,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/me/notifications/unread-count
 * Get unread notification count for the authenticated customer
 */
export const getCustomerUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const unreadCount = await notificationService.getCustomerUnreadCount(userId);

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/customers/me/notifications/:notificationId/read
 * Mark a single customer notification as read
 */
export const markCustomerNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notification = await notificationService.markCustomerNotificationRead(
      userId,
      req.params.notificationId
    );

    res.json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/me/notifications/mark-all-read
 * Mark all customer notifications as read
 */
export const markAllCustomerNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await notificationService.markAllCustomerNotificationsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * -------------------------------------------------------------
 * TENANT ADMIN NOTIFICATION CONTROLLERS
 * -------------------------------------------------------------
 */

/**
 * GET /api/notifications (or /api/v1/admin/notifications)
 * List notifications for the authenticated store admin
 */
export const getAdminNotifications = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const adminUserId = req.user._id;
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin || req.membership?.isSuperAdmin);
    const result = await notificationService.listAdminNotifications(tenantId, adminUserId, req.query, isSuperAdmin);

    res.json({
      success: true,
      count: result.notifications.length,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get unread count for the authenticated store admin
 */
export const getAdminUnreadCount = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const adminUserId = req.user._id;
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin || req.membership?.isSuperAdmin);
    const unreadCount = await notificationService.getAdminUnreadCount(tenantId, adminUserId, isSuperAdmin);

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single store admin notification as read
 */
export const markAdminNotificationRead = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const adminUserId = req.user._id;
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin || req.membership?.isSuperAdmin);
    const notification = await notificationService.markAdminNotificationRead(
      tenantId,
      adminUserId,
      req.params.notificationId,
      isSuperAdmin
    );

    res.json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/mark-all-read
 * Mark all store admin notifications as read
 */
export const markAllAdminNotificationsRead = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const adminUserId = req.user._id;
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin || req.membership?.isSuperAdmin);
    const result = await notificationService.markAllAdminNotificationsRead(tenantId, adminUserId, isSuperAdmin);

    res.json({
      success: true,
      message: 'All store notifications marked as read.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
