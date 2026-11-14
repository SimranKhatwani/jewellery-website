import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { logAudit } from '../utils/audit.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      phoneNumber: req.body.phoneNumber,
      tenantName: req.body.tenantName,
      tenantSlug: req.body.tenantSlug,
      req,
    });

    return sendSuccess(res, result, 'Registration successful.', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser({
      email: req.body.email,
      password: req.body.password,
      req,
    });

    return sendSuccess(res, result, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const result = await authService.getUserProfile(req.user._id);
    return sendSuccess(res, result, 'Profile retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user._id,
        action: AUDIT_ACTIONS.USER_LOGOUT,
        resource: 'User',
        resourceId: req.user._id,
        req,
      });
    }

    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

