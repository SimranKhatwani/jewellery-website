import { Router } from 'express';
import * as saasAuthController from '../controllers/saasAuth.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validateRegister, validateLogin } from '../validations/auth.validation.js';

const router = Router();

// Public auth endpoints
router.post('/register', authLimiter, validateRegister, saasAuthController.register);
router.post('/login', authLimiter, validateLogin, saasAuthController.login);
router.post('/logout', saasAuthController.logout);

// Protected user profile
router.get('/me', authenticateUser, saasAuthController.getProfile);

export default router;

