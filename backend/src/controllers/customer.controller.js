import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { generateToken } from '../utils/jwt.js';

/**
 * GET /api/v1/customers/me
 * Retrieve current authenticated customer profile
 */
export const getCustomerProfile = async (req, res, next) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      customer: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/customers/me
 * Update customer personal details (Prevents role / permission escalation)
 */
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, phoneNumber } = req.body;

    // Reject attempt to elevate privilege or modify security-sensitive fields
    const disallowedFields = ['isSuperAdmin', 'status', 'passwordHash', 'tokenVersion', 'email', 'role'];
    for (const field of disallowedFields) {
      if (req.body[field] !== undefined) {
        delete req.body[field];
      }
    }

    if (name !== undefined) {
      if (!name.trim()) throw new BadRequestError('Name cannot be empty.');
      user.name = name.trim();
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber.trim();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      customer: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/me/change-password
 * Change password and invalidate prior sessions via tokenVersion increment
 */
export const changeCustomerPassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Both current password and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long.');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password provided is incorrect.');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    // Invalidate existing sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate fresh token for active session
    const newToken = generateToken({
      userId: user._id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      tokenVersion: user.tokenVersion,
    });

    res.json({
      success: true,
      message: 'Password changed successfully. All other active sessions have been revoked.',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
};
