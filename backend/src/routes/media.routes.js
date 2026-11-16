import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { resolveLegacyTenant, authorizeLegacyAdminTenant } from '../middleware/tenant.js';
import * as mediaController from '../controllers/media.controller.js';

const router = Router();

/**
 * Tenant Media & GridFS Binary Storage Routes
 */

// Public endpoint to stream image binary from MongoDB GridFS with caching
router.get('/:id', mediaController.streamMedia);

// Protected endpoints for store admins
router.post(
  '/',
  authenticateAdmin,
  resolveLegacyTenant,
  authorizeLegacyAdminTenant,
  mediaController.uploadSingleImage,
  mediaController.uploadMedia
);

router.delete(
  '/:id',
  authenticateAdmin,
  mediaController.deleteMedia
);

export default router;
