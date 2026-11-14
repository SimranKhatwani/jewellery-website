import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

// All admin notification operations require authenticated admin and verified tenant membership
router.use(authenticateAdmin);
router.use(resolveLegacyTenant);
router.use(authorizeLegacyAdminTenant);

/**
 * Tenant Admin Notification Endpoints
 */
router.get('/', notificationController.getAdminNotifications);
router.get('/unread-count', notificationController.getAdminUnreadCount);
router.patch('/:notificationId/read', notificationController.markAdminNotificationRead);
router.post('/mark-all-read', notificationController.markAllAdminNotificationsRead);

export default router;
