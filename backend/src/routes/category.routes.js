import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

/**
 * Public Storefront Category Routes
 */
router.get('/', resolveLegacyTenant, categoryController.listStorefrontCategories);
router.get('/:id', resolveLegacyTenant, categoryController.getStorefrontCategory);

/**
 * Tenant Admin Category Management Routes
 */
router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  categoryController.createTenantCategory
);

router.put(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  categoryController.updateTenantCategory
);

router.delete(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  categoryController.deleteTenantCategory
);

export default router;
