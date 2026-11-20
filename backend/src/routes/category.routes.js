import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

/**
 * Public Storefront Category Routes
 */
router.get('/', resolveLegacyTenant, categoryController.listStorefrontCategories);
router.get('/:id', resolveLegacyTenant, categoryController.getStorefrontCategory);

/**
 * Tenant Admin Category Management Routes
 * Strictly enforces 'categories:write' permission for all mutating operations
 */
router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('categories:write'),
  categoryController.createTenantCategory
);

router.put(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('categories:write'),
  categoryController.updateTenantCategory
);

router.delete(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('categories:write'),
  categoryController.deleteTenantCategory
);

export default router;
