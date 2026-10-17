import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { authenticateAdmin, AuthRequest } from '../middleware/auth.js';

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
 * POST /api/auth/login
 * Public endpoint for secure admin authentication
 */
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.',
      });
      return;
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.',
      });
      return;
    }

    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();

    // Sign JWT
    const jwtSecret = process.env.JWT_SECRET || 'aurelle_luxury_jwt_secret_change_in_production_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      jwtSecret,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      success: true,
      message: 'Admin session authenticated successfully.',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Acknowledge admin logout
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Admin session terminated.',
  });
});

/**
 * GET /api/auth/me
 * Protected endpoint returning active admin details
 */
router.get('/me', authenticateAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await Admin.findById(req.admin?.id).select('-passwordHash');

    if (!admin) {
      res.status(404).json({
        success: false,
        message: 'Admin user not found.',
      });
      return;
    }

    res.json({
      success: true,
      admin,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
