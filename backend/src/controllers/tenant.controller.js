import * as tenantService from '../services/tenant.service.js';
import { sendSuccess } from '../utils/response.js';

export const create = async (req, res, next) => {
  try {
    const tenant = await tenantService.createTenant({
      userId: req.user._id,
      name: req.body.name,
      slug: req.body.slug,
      customDomain: req.body.customDomain,
      req,
    });

    return sendSuccess(res, tenant, 'Store created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const getDetails = async (req, res, next) => {
  try {
    // req.tenant is already resolved and verified by resolveTenant middleware
    const tenant = await tenantService.getTenantDetails(req.tenant._id);
    return sendSuccess(res, tenant, 'Store details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const updated = await tenantService.updateTenantDetails(
      req.tenant._id,
      req.body,
      req.user._id,
      req
    );
    return sendSuccess(res, updated, 'Store updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const inviteStaff = async (req, res, next) => {
  try {
    const membership = await tenantService.inviteStaffMember({
      tenantId: req.tenant._id,
      inviterId: req.user._id,
      email: req.body.email,
      roleId: req.body.roleId,
      name: req.body.name,
      req,
    });

    return sendSuccess(res, membership, 'Staff member invited successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const listStaff = async (req, res, next) => {
  try {
    const staff = await tenantService.listTenantStaffMembers(req.tenant._id);
    return sendSuccess(res, staff, 'Store staff retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const updated = await tenantService.updateStaffMembership({
      tenantId: req.tenant._id,
      membershipId: req.params.membershipId,
      status: req.body.status,
      roleId: req.body.roleId,
      updaterId: req.user._id,
      req,
    });

    return sendSuccess(res, updated, 'Staff membership updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const removeStaff = async (req, res, next) => {
  try {
    const result = await tenantService.removeStaffMember({
      tenantId: req.tenant._id,
      membershipId: req.params.membershipId,
      removerId: req.user._id,
      req,
    });

    return sendSuccess(res, result, 'Staff member removed successfully.');
  } catch (error) {
    next(error);
  }
};

