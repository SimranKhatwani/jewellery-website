import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

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
    await authService.logoutUser(req.user._id, req);
    return sendSuccess(res, null, 'Logged out successfully. All active sessions have been invalidated.');
  } catch (error) {
    next(error);
  }
};

export const getInvitation = async (req, res, next) => {
  try {
    const details = await authService.getInvitationDetails(req.params.token);
    return sendSuccess(res, details, 'Invitation details verified.');
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (req, res, next) => {
  try {
    const result = await authService.acceptInvitation({
      token: req.body.token,
      name: req.body.name,
      password: req.body.password,
      req,
    });
    return sendSuccess(res, result, 'Invitation accepted successfully. Account configured.');
  } catch (error) {
    next(error);
  }
};
