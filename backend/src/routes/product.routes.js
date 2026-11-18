import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
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
  requireTenantPermission('products:read'),
  productController.listAdminProducts
);

router.get(
  '/admin/currency',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('products:read'),
  productController.getStoreCurrencySettings
);

router.put(
  '/admin/currency',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('products:write'),
  productController.updateStoreCurrencySettings
);

router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('products:write'),
  productController.createTenantProduct
);

router.put(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('products:write'),
  productController.updateTenantProduct
);

router.delete(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('products:write'),
  productController.deleteTenantProduct
);

router.patch(
  ['/:id/publish', '/:id/toggle-publish'],
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  requireTenantPermission('products:write'),
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
