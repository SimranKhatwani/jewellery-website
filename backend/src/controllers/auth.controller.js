import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { config } from '../config/env.js';

/**
 * POST /api/auth/login
 * Public endpoint for admin authentication
 */
export const login = async (req, res, next) => {
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

    // Sign JWT with tokenVersion for session invalidation
    const jwtSecret = config.jwt.secret;
    const expiresIn = config.jwt.expiresIn;

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        tokenVersion: admin.tokenVersion || 0,
      },
      jwtSecret,
      { expiresIn }
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
};

/**
 * POST /api/auth/logout
 * Terminate admin session and increment tokenVersion to revoke active token
 */
export const logout = async (req, res, next) => {
  try {
    const adminId = req.admin?.id || req.admin?.userId;
    if (adminId) {
      await Admin.findByIdAndUpdate(adminId, { $inc: { tokenVersion: 1 } });
    }
    if (req.user) {
      req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
      await req.user.save();
    }
    res.json({
      success: true,
      message: 'Admin session terminated and token revoked.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Protected endpoint returning active authenticated admin details
 */
export const getMe = async (req, res, next) => {
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
};
