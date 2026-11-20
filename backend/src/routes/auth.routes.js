import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { strictAuthLimiter } from '../config/rateLimit.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

/**
 * Tenant Admin Authentication Routes
 */
router.post('/login', strictAuthLimiter, authController.login);
router.post('/logout', authenticateAdmin, authController.logout);
router.get('/me', authenticateAdmin, authController.getMe);

export default router;
