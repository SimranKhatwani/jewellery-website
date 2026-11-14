import { Router } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Tenant } from '../models/Tenant.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.js';
import { resolveTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

/**
 * Middleware: Resolves tenant context for legacy public & admin routes
 */
const resolveLegacyTenant = async (req, _res, next) => {
  try {
    if (req.tenant) return next();

    let rawIdentifier =
      req.headers['x-tenant-id'] ||
      req.headers['x-store-slug'] ||
      req.query.tenantId ||
      req.query.storeSlug;

    let tenant = null;
    if (rawIdentifier) {
      const id = String(rawIdentifier).trim();
      if (mongoose.Types.ObjectId.isValid(id)) {
        tenant = await Tenant.findById(id);
      } else {
        tenant = await Tenant.findOne({ slug: id.toLowerCase() });
      }
    }

    if (!tenant) {
      // Fallback to primary official AURELLE tenant or first active store
      tenant = await Tenant.findOne({ slug: 'aurelle' }) || await Tenant.findOne({ status: 'active' });
    }

    if (tenant) {
      req.tenant = tenant;
    }
    next();
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// PUBLIC / STOREFRONT CATALOG ROUTES
// -------------------------------------------------------------

/**
 * GET /api/products
 * Public endpoint: Returns published products for resolved store
 */
router.get('/', resolveLegacyTenant, (req, res, next) => {
  if (!req.tenant) {
    return res.json({ success: true, count: 0, products: [] });
  }
  req.isStorefront = true;
  return productController.listTenantProducts(req, res, next);
});

/**
 * GET /api/products/:id
 * Public endpoint: Get single product by slug or ID
 */
router.get('/:id', resolveLegacyTenant, (req, res, next) => {
  if (!req.tenant) {
    return res.status(404).json({ success: false, message: 'Store not found.' });
  }
  req.params.identifier = req.params.id;
  req.isStorefront = true;
  return productController.getTenantProduct(req, res, next);
});

// -------------------------------------------------------------
// STORE ADMIN / TENANT CATALOG ROUTES
// -------------------------------------------------------------

/**
 * GET /api/products/admin/all
 * Store Admin endpoint: Returns all products (published + drafts)
 */
router.get(
  '/admin/all',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    req.isStorefront = false;
    return productController.listTenantProducts(req, res, next);
  }
);

/**
 * POST /api/products
 * Store Admin: Create new product
 */
router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return productController.createTenantProduct(req, res, next);
  }
);

/**
 * PUT /api/products/:id
 * Store Admin: Update product
 */
router.put(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return productController.updateTenantProduct(req, res, next);
  }
);

/**
 * DELETE /api/products/:id
 * Store Admin: Delete product
 */
router.delete(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return productController.deleteTenantProduct(req, res, next);
  }
);

/**
 * PATCH /api/products/:id/publish
 * Store Admin: Toggle publication
 */
router.patch(
  '/:id/publish',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return productController.toggleTenantProductPublish(req, res, next);
  }
);

/**
 * PATCH /api/products/:id/inventory
 * Store Admin: Update numerical inventory
 */
router.patch(
  '/:id/inventory',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return productController.updateTenantInventory(req, res, next);
  }
);

export default router;
