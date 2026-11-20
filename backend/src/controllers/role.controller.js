/**
 * @file role.controller.js
 * @description Controller managing tenant Role-Based Access Control (RBAC):
 * listing platform permissions, fetching roles, creating custom store staff roles,
 * updating role permissions, and safely deleting non-system roles.
 */

import * as roleService from '../services/role.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Retrieves the comprehensive catalog of all system RBAC permissions.
 * @route GET /api/v1/roles/permissions
 */
export const getPermissions = async (_req, res, next) => {
  try {
    const permissions = await roleService.listAllPermissions();
    return sendSuccess(res, permissions, 'Permissions retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Lists default system roles and custom roles defined for the current tenant.
 * @route GET /api/v1/roles
 */
export const getTenantRoles = async (req, res, next) => {
  try {
    const roles = await roleService.listRolesForTenant(req.tenant._id);
    return sendSuccess(res, roles, 'Store roles retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new custom role with specific permission sets for the current store.
 * @route POST /api/v1/roles
 */
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

/**
 * Updates an existing custom role's title, description, or assigned permissions.
 * @route PUT /api/v1/roles/:roleId
 */
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

/**
 * Deletes a custom tenant role, ensuring no staff members are actively assigned to it.
 * @route DELETE /api/v1/roles/:roleId
 */
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

