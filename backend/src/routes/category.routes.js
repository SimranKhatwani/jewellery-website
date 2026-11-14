import { Router } from 'express';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

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

/**
 * GET /api/categories
 * Public endpoint: Returns all categories for resolved store
 */
router.get('/', resolveLegacyTenant, (req, res, next) => {
  if (!req.tenant) {
    return res.json({ success: true, count: 0, categories: [] });
  }
  req.isStorefront = true;
  return categoryController.listTenantCategories(req, res, next);
});

/**
 * GET /api/categories/:id
 * Public endpoint: Get single category by slug or ID
 */
router.get('/:id', resolveLegacyTenant, (req, res, next) => {
  if (!req.tenant) {
    return res.status(404).json({ success: false, message: 'Store not found.' });
  }
  req.params.identifier = req.params.id;
  return categoryController.getTenantCategory(req, res, next);
});

/**
 * POST /api/categories
 * Store Admin: Create new category
 */
router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return categoryController.createTenantCategory(req, res, next);
  }
);

/**
 * PUT /api/categories/:id
 * Store Admin: Update category
 */
router.put(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return categoryController.updateTenantCategory(req, res, next);
  }
);

/**
 * DELETE /api/categories/:id
 * Store Admin: Delete category
 */
router.delete(
  '/:id',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  (req, res, next) => {
    return categoryController.deleteTenantCategory(req, res, next);
  }
);

export default router;
