import * as roleService from '../services/role.service.js';
import { sendSuccess } from '../utils/response.js';

export const getPermissions = async (_req, res, next) => {
  try {
    const permissions = await roleService.listAllPermissions();
    return sendSuccess(res, permissions, 'Permissions retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

export const getTenantRoles = async (req, res, next) => {
  try {
    const roles = await roleService.listRolesForTenant(req.tenant._id);
    return sendSuccess(res, roles, 'Store roles retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createCustomTenantRole({
      tenantId: req.tenant._id,
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      permissions: req.body.permissions,
      userId: req.user._id,
      req,
    });

    return sendSuccess(res, role, 'Custom store role created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const updated = await roleService.updateCustomTenantRole({
      tenantId: req.tenant._id,
      roleId: req.params.roleId,
      name: req.body.name,
      description: req.body.description,
      permissions: req.body.permissions,
      userId: req.user._id,
      req,
    });

    return sendSuccess(res, updated, 'Custom store role updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const result = await roleService.deleteCustomTenantRole({
      tenantId: req.tenant._id,
      roleId: req.params.roleId,
      userId: req.user._id,
      req,
    });

    return sendSuccess(res, result, 'Custom store role deleted successfully.');
  } catch (error) {
    next(error);
  }
};

