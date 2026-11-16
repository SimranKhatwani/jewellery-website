import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { USER_STATUS } from '../config/constants.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { config } from '../config/env.js';

/**
 * Legacy Admin Authentication Middleware
 * Preserved for existing single-store admin panel compatibility
 * Also resolves and attaches the underlying User identity for multi-tenant verification
 */
export const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. No bearer token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = config.jwt.secret;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.admin = decoded;

    // Check tokenVersion revocation for legacy Admin model
    const adminId = decoded.id || decoded.userId;
    let adminDoc = null;
    if (adminId) {
      adminDoc = await Admin.findById(adminId);
    }
    if (!adminDoc && decoded.email) {
      adminDoc = await Admin.findOne({ email: String(decoded.email).toLowerCase().trim() });
    }

    if (adminDoc) {
      const decodedVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
      if (decodedVersion !== (adminDoc.tokenVersion || 0)) {
        return res.status(401).json({
          success: false,
          message: 'Admin session has expired or was revoked. Please log in again.',
        });
      }
    }

    // Resolve unified User entity for multi-tenant RBAC / membership checks
    const userId = decoded.userId || decoded.id;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        req.user = user;
      }
    }
    if (!req.user && decoded.email) {
      const email = String(decoded.email).toLowerCase().trim();
      let userByEmail = await User.findOne({ email });
      if (!userByEmail) {
        // Auto-bridge legacy Admin model into unified User model
        if (!adminDoc) {
          adminDoc = await Admin.findOne({ email });
        }
        if (adminDoc) {
          userByEmail = await User.create({
            name: adminDoc.name || 'Aurelle Admin',
            email: adminDoc.email,
            passwordHash: adminDoc.passwordHash,
            isSuperAdmin: adminDoc.role === 'superadmin',
            status: USER_STATUS.ACTIVE,
            tokenVersion: adminDoc.tokenVersion || 0,
          });
        }
      }
      if (userByEmail) {
        req.user = userByEmail;
      }
    }

    if (req.user) {
      if (req.user.status !== USER_STATUS.ACTIVE) {
        return res.status(403).json({
          success: false,
          message: `Account is ${req.user.status}. Access denied.`,
        });
      }
      if (decoded.tokenVersion !== undefined && decoded.tokenVersion < (req.user.tokenVersion || 0)) {
        return res.status(401).json({
          success: false,
          message: 'Admin session has expired or was revoked. Please log in again.',
        });
      }
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.',
    });
  }
};

/**
 * Universal SaaS User Authentication Middleware
 * Authenticates Super Admin, Store Admin, Staff, and Customers
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required. No bearer token provided.');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      throw new UnauthorizedError('Invalid token payload.');
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists.');
    }

    // Account status check
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ForbiddenError(
        `Your account has been ${user.status}. Please contact platform support.`,
        { status: user.status }
      );
    }

    // Token version check (Session invalidation on logout / password change)
    const tokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
    if (tokenVersion !== (user.tokenVersion || 0)) {
      throw new UnauthorizedError('Session has expired or was revoked. Please log in again.');
    }

    // Attach user entity to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional User Authentication Middleware
 * Populates req.user if valid bearer token is presented, otherwise proceeds with req.user = null
 */
export const optionalAuthenticateUser = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      req.user = null;
      return next();
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId);
    if (user && user.status === USER_STATUS.ACTIVE && (decoded.tokenVersion || 0) === (user.tokenVersion || 0)) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  } catch {
    req.user = null;
    next();
  }
};
