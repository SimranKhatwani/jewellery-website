import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as reportController from '../controllers/report.controller.js';

const router = Router();

// Enforce authenticated store admin and verified tenant membership
router.use(authenticateAdmin);
router.use(resolveLegacyTenant);
router.use(authorizeLegacyAdminTenant);
router.use(requireTenantPermission('analytics:view'));

/**
 * Tenant Admin Reports Endpoints
 */
router.get('/sales', reportController.getSalesReport);
router.get('/orders', reportController.getOrdersReport);
router.get('/products', reportController.getProductsReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/customers', reportController.getCustomersReport);
router.get('/payments', reportController.getPaymentsReport);
router.get('/:reportType/export', reportController.exportReport);

export default router;
