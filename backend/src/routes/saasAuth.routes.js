import { Router } from 'express';
import * as saasAuthController from '../controllers/saasAuth.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { strictAuthLimiter } from '../config/rateLimit.js';
import { validateRegister, validateLogin } from '../validations/auth.validation.js';

const router = Router();

// Public auth endpoints
router.post('/register', strictAuthLimiter, validateRegister, saasAuthController.register);
router.post('/login', strictAuthLimiter, validateLogin, saasAuthController.login);

// Public invitation onboarding
router.get('/invitation/:token', strictAuthLimiter, saasAuthController.getInvitation);
router.post('/accept-invitation', strictAuthLimiter, saasAuthController.acceptInvitation);

// Protected endpoints
router.post('/logout', authenticateUser, saasAuthController.logout);
router.get('/me', authenticateUser, saasAuthController.getProfile);

export default router;
