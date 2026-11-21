import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as couponController from '../controllers/coupon.controller.js';

const router = Router();

// All admin coupon operations require authenticated admin and verified tenant membership
router.use(authenticateAdmin);
router.use(resolveLegacyTenant);
router.use(authorizeLegacyAdminTenant);

/**
 * Tenant Admin Coupon Endpoints
 */
router.get('/', requireTenantPermission('coupons:read'), couponController.listTenantCoupons);
router.get('/:id', requireTenantPermission('coupons:read'), couponController.getTenantCoupon);
router.get('/:id/usage', requireTenantPermission('coupons:read'), couponController.getTenantCouponUsage);
router.post('/', requireTenantPermission('coupons:write'), couponController.createTenantCoupon);
router.put('/:id', requireTenantPermission('coupons:write'), couponController.updateTenantCoupon);
router.patch('/:id/status', requireTenantPermission('coupons:write'), couponController.toggleTenantCouponStatus);
router.delete('/:id', requireTenantPermission('coupons:write'), couponController.deleteTenantCoupon);

export default router;
