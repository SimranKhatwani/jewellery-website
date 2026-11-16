import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

/**
 * Public Storefront Product Catalog Routes
 */
router.get('/', resolveLegacyTenant, productController.listStorefrontProducts);
router.get('/:id', resolveLegacyTenant, productController.getStorefrontProduct);

/**
 * Tenant Admin Product Management Routes
 */
router.get(
  '/admin/all',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  productController.listAdminProducts
);

router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  productController.createTenantProduct
);

router.put(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  productController.updateTenantProduct
);

router.delete(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  productController.deleteTenantProduct
);

router.patch(
  ['/:id/publish', '/:id/toggle-publish'],
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  productController.toggleTenantProductPublish
);

router.patch(
  '/:id/inventory',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  productController.updateTenantInventory
);

export default router;
