import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateAdmin } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Rate limiting for admin login (max 10 requests per 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tenant Admin Authentication Routes
 */
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authenticateAdmin, authController.logout);
router.get('/me', authenticateAdmin, authController.getMe);

export default router;
