import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

// All admin order operations require authenticated admin and verified tenant membership
router.use(authenticateAdmin);
router.use(resolveLegacyTenant);
router.use(authorizeLegacyAdminTenant);

/**
 * Tenant Admin Order Management Endpoints
 */
router.get('/', orderController.getAdminOrders);
router.get('/:orderId', orderController.getAdminOrderDetails);
router.patch('/:orderId/status', orderController.updateAdminOrderStatus);
router.patch('/:orderId/payment-status', orderController.updateAdminPaymentStatus);
router.post('/:orderId/cancel', orderController.cancelAdminOrder);

export default router;
