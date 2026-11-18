import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

// Tenant Admin Authentication & Store Membership Verification
router.use(authenticateAdmin);
router.use(resolveLegacyTenant);
router.use(authorizeLegacyAdminTenant);
router.use(requireTenantPermission('analytics:view'));

/**
 * Tenant Admin Analytics Routes
 */
router.get('/overview', analyticsController.getOverview);
router.get('/sales-trends', analyticsController.getSalesTrends);
router.get('/orders', analyticsController.getOrderDistribution);
router.get('/bestsellers', analyticsController.getBestsellers);
router.get('/customers', analyticsController.getCustomerInsights);
router.get('/payments', analyticsController.getPaymentBreakdown);
router.get('/inventory', analyticsController.getInventoryInsights);

export default router;
