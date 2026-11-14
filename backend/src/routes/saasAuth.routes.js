import { Router } from 'express';
import * as saasAuthController from '../controllers/saasAuth.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validateRegister, validateLogin } from '../validations/auth.validation.js';

const router = Router();

// Public auth endpoints
router.post('/register', authLimiter, validateRegister, saasAuthController.register);
router.post('/login', authLimiter, validateLogin, saasAuthController.login);

// Public invitation onboarding
router.get('/invitation/:token', saasAuthController.getInvitation);
router.post('/accept-invitation', authLimiter, saasAuthController.acceptInvitation);

// Protected endpoints
router.post('/logout', authenticateUser, saasAuthController.logout);
router.get('/me', authenticateUser, saasAuthController.getProfile);

export default router;
