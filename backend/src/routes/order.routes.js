import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

// All admin order operations require authenticated admin and verified tenant membership
router.use(authenticateAdmin);
router.use(resolveLegacyTenant);
router.use(authorizeLegacyAdminTenant);

/**
 * Tenant Admin Order Management Endpoints
 */
router.get('/', requireTenantPermission('orders:read'), orderController.getAdminOrders);
router.get('/:orderId', requireTenantPermission('orders:read'), orderController.getAdminOrderDetails);
router.patch('/:orderId/status', requireTenantPermission('orders:write'), orderController.updateAdminOrderStatus);
router.patch('/:orderId/payment-status', requireTenantPermission('orders:write'), orderController.updateAdminPaymentStatus);
router.post('/:orderId/cancel', requireTenantPermission('orders:write'), orderController.cancelAdminOrder);

export default router;
