import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { DEFAULT_PERMISSIONS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';

export const listAllPermissions = async () => {
  let permissions = await Permission.find().sort({ module: 1, key: 1 });
  // If collection empty, return defaults
  if (permissions.length === 0) {
    return DEFAULT_PERMISSIONS;
  }
  return permissions;
};

export const listRolesForTenant = async (tenantId) => {
  // Returns system templates (tenantId: null) AND custom roles for this tenant
  return Role.find({
    $or: [{ tenantId: null }, { tenantId }],
  }).sort({ isSystemRole: -1, name: 1 });
};

export const createCustomTenantRole = async ({
  tenantId,
  name,
  slug,
  description = '',
  permissions = [],
  userId,
  req = null,
}) => {
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Check if role slug already exists in this tenant or as a system role
  const existingRole = await Role.findOne({
    slug: normalizedSlug,
    $or: [{ tenantId: null }, { tenantId }],
  });

  if (existingRole) {
    throw new ConflictError(`A role with slug '${normalizedSlug}' already exists.`);
  }

  // 2. Validate permission keys against valid permissions
  const validPermissions = (await listAllPermissions()).map((p) => p.key);
  const invalidPerms = permissions.filter((p) => p !== '*' && !validPermissions.includes(p));
  if (invalidPerms.length > 0) {
    throw new BadRequestError(`Invalid permissions specified: ${invalidPerms.join(', ')}`);
  }

  // 3. Create custom dynamic role
  const role = await Role.create({
    tenantId,
    name: name.trim(),
    slug: normalizedSlug,
    description: description.trim(),
    isSystemRole: false,
    permissions,
  });

  await logAudit({
    tenantId,
    userId,
    action: AUDIT_ACTIONS.ROLE_CREATE,
    resource: 'Role',
    resourceId: role._id,
    details: { name: role.name, slug: role.slug, permissions },
    req,
  });

  return role;
};

export const updateCustomTenantRole = async ({
  tenantId,
  roleId,
  name,
  description,
  permissions,
  userId,
  req = null,
}) => {
  const role = await Role.findOne({ _id: roleId, tenantId });
  if (!role) {
    throw new NotFoundError('Custom role not found in this store.');
  }

  if (role.isSystemRole) {
    throw new ForbiddenError('System-defined roles cannot be modified.');
  }

  if (name) role.name = name.trim();
  if (description !== undefined) role.description = description.trim();

  if (permissions) {
    const validPermissions = (await listAllPermissions()).map((p) => p.key);
    const invalidPerms = permissions.filter((p) => p !== '*' && !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      throw new BadRequestError(`Invalid permissions specified: ${invalidPerms.join(', ')}`);
    }
    role.permissions = permissions;
  }

  await role.save();

  await logAudit({
    tenantId,
    userId,
    action: AUDIT_ACTIONS.ROLE_UPDATE,
    resource: 'Role',
    resourceId: role._id,
    details: { name: role.name, permissions: role.permissions },
    req,
  });

  return role;
};

export const deleteCustomTenantRole = async ({ tenantId, roleId, userId, req = null }) => {
  const role = await Role.findOne({ _id: roleId, tenantId });
  if (!role) {
    throw new NotFoundError('Custom role not found in this store.');
  }

  if (role.isSystemRole) {
    throw new ForbiddenError('System-defined roles cannot be deleted.');
  }

  // Ensure no active memberships are using this role
  const assignedCount = await TenantMembership.countDocuments({
    tenantId,
    roleId: role._id,
  });

  if (assignedCount > 0) {
    throw new BadRequestError(`Cannot delete role: Assigned to ${assignedCount} active staff member(s). Reassign them first.`);
  }

  await Role.deleteOne({ _id: roleId, tenantId });

  await logAudit({
    tenantId,
    userId,
    action: AUDIT_ACTIONS.ROLE_DELETE,
    resource: 'Role',
    resourceId: roleId,
    details: { name: role.name, slug: role.slug },
    req,
  });

  return { message: 'Custom role deleted successfully.' };
};

