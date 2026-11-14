import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { USER_STATUS } from '../config/constants.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { config } from '../config/env.js';

/**
 * Legacy Admin Authentication Middleware
 * Preserved for existing single-store admin panel compatibility
 */
export const authenticateAdmin = (req, res, next) => {
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
