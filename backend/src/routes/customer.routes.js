import { Router } from 'express';
import { authenticateUser, authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as customerController from '../controllers/customer.controller.js';
import * as addressController from '../controllers/address.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

/**
 * -------------------------------------------------------------
 * 1. Customer Self-Service Endpoints (Profile, Addresses, etc.)
 * Guarded by authenticateUser (Customer JWT session)
 * -------------------------------------------------------------
 */
router.get('/me', authenticateUser, customerController.getCustomerProfile);
router.put('/me', authenticateUser, customerController.updateCustomerProfile);
router.patch('/me', authenticateUser, customerController.updateCustomerProfile);
router.post('/me/change-password', authenticateUser, customerController.changeCustomerPassword);

// Aliases for profile routes
router.get('/profile', authenticateUser, customerController.getCustomerProfile);
router.patch('/profile', authenticateUser, customerController.updateCustomerProfile);
router.put('/profile', authenticateUser, customerController.updateCustomerProfile);
router.post('/change-password', authenticateUser, customerController.changeCustomerPassword);

/**
 * Customer Address Management Endpoints
 */
router.get('/me/addresses', authenticateUser, addressController.listCustomerAddresses);
router.post('/me/addresses', authenticateUser, addressController.createCustomerAddress);
router.put('/me/addresses/:addressId', authenticateUser, addressController.updateCustomerAddress);
router.delete('/me/addresses/:addressId', authenticateUser, addressController.deleteCustomerAddress);
router.patch('/me/addresses/:addressId/default', authenticateUser, addressController.setDefaultCustomerAddress);

// Aliases for address routes
router.get('/addresses', authenticateUser, addressController.listCustomerAddresses);
router.post('/addresses', authenticateUser, addressController.createCustomerAddress);
router.put('/addresses/:addressId', authenticateUser, addressController.updateCustomerAddress);
router.delete('/addresses/:addressId', authenticateUser, addressController.deleteCustomerAddress);

/**
 * Customer Order History & Cancellation Endpoints
 */
router.get('/me/orders', authenticateUser, orderController.getCustomerOrders);
router.get('/me/orders/:orderId', authenticateUser, orderController.getCustomerOrderDetails);
router.post('/me/orders/:orderId/cancel', authenticateUser, orderController.cancelCustomerOrder);

// Aliases for orders
router.get('/orders', authenticateUser, orderController.getCustomerOrders);
router.get('/orders/:orderId', authenticateUser, orderController.getCustomerOrderDetails);
router.post('/orders/:orderId/cancel', authenticateUser, orderController.cancelCustomerOrder);

/**
 * Customer In-App Notification Endpoints
 */
router.get('/me/notifications', authenticateUser, notificationController.getCustomerNotifications);
router.get('/me/notifications/unread-count', authenticateUser, notificationController.getCustomerUnreadCount);
router.patch('/me/notifications/:notificationId/read', authenticateUser, notificationController.markCustomerNotificationRead);
router.post('/me/notifications/mark-all-read', authenticateUser, notificationController.markAllCustomerNotificationsRead);

// Aliases for notifications
router.get('/notifications', authenticateUser, notificationController.getCustomerNotifications);
router.get('/notifications/unread-count', authenticateUser, notificationController.getCustomerUnreadCount);
router.patch('/notifications/:notificationId/read', authenticateUser, notificationController.markCustomerNotificationRead);
router.post('/notifications/mark-all-read', authenticateUser, notificationController.markAllCustomerNotificationsRead);

/**
 * -------------------------------------------------------------
 * 2. Store Admin Customer Management Endpoints
 * Scoped to Tenant (e.g. aurelle) from `customers` collection
 * -------------------------------------------------------------
 */
router.get('/', authenticateAdmin, resolveLegacyTenant, authorizeLegacyAdminTenant, requireTenantPermission('customers:read'), customerController.listStoreCustomers);
router.get('/:id', authenticateAdmin, resolveLegacyTenant, authorizeLegacyAdminTenant, requireTenantPermission('customers:read'), customerController.getStoreCustomerById);
router.patch('/:id', authenticateAdmin, resolveLegacyTenant, authorizeLegacyAdminTenant, requireTenantPermission('customers:read'), customerController.updateStoreCustomer);

export default router;
