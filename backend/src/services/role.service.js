import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { DEFAULT_PERMISSIONS, SYSTEM_ROLE_TEMPLATES, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';

export const ensureSystemRoles = async () => {
  // Only maintain the master store_admin system template if needed
  const adminTemplate = SYSTEM_ROLE_TEMPLATES.find((t) => t.slug === 'store_admin');
  if (adminTemplate) {
    const existing = await Role.findOne({ tenantId: null, slug: adminTemplate.slug });
    if (!existing) {
      await Role.create({
        tenantId: null,
        name: adminTemplate.name,
        slug: adminTemplate.slug,
        description: adminTemplate.description,
        permissions: adminTemplate.permissions,
        isSystemRole: true,
      });
    }
  }
};

export const listAllPermissions = async () => {
  // Ensure all default permissions are registered in database
  for (const p of DEFAULT_PERMISSIONS) {
    await Permission.updateOne(
      { key: p.key },
      { $setOnInsert: { name: p.name, module: p.module, description: p.description } },
      { upsert: true }
    );
  }
  return Permission.find().sort({ module: 1, key: 1 });
};

export const listRolesForTenant = async (tenantId) => {
  await ensureSystemRoles();
  // Return custom roles created for this tenant, plus master store_admin for assignment
  const [customRoles, storeAdmin] = await Promise.all([
    Role.find({ tenantId }).sort({ createdAt: -1 }),
    Role.findOne({ tenantId: null, slug: 'store_admin' }),
  ]);
  return storeAdmin ? [storeAdmin, ...customRoles] : customRoles;
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
  let normalizedSlug = slug.toLowerCase().trim();

  // 1. Check if role slug already exists in this tenant or as a system role
  const existingRole = await Role.findOne({
    slug: normalizedSlug,
    $or: [{ tenantId: null }, { tenantId }],
  });

  if (existingRole) {
    normalizedSlug = `${normalizedSlug}-${Date.now().toString(36).slice(-4)}`;
  }

  // 2. F-06: Forbid wildcard '*' in custom tenant roles
  if (permissions.includes('*')) {
    throw new BadRequestError("Wildcard '*' permission cannot be assigned to custom roles. Universal access is reserved for system store_admin.");
  }

  // 3. Validate permission keys against valid permissions registry
  const validPermissions = (await listAllPermissions()).map((p) => p.key);
  const invalidPerms = permissions.filter((p) => !validPermissions.includes(p));
  if (invalidPerms.length > 0) {
    throw new BadRequestError(`Invalid permissions specified: ${invalidPerms.join(', ')}`);
  }

  // 4. Create custom dynamic role
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

  // F-02: Self-escalation prevention - cannot edit a role currently assigned to caller
  const selfAssigned = await TenantMembership.exists({
    tenantId,
    userId,
    roleId,
    status: 'active',
  });
  if (selfAssigned) {
    throw new ForbiddenError('Cannot modify a role that is currently assigned to your own active membership.');
  }

  if (name) role.name = name.trim();
  if (description !== undefined) role.description = description.trim();

  if (permissions) {
    // F-06: Forbid wildcard '*' in custom tenant roles
    if (permissions.includes('*')) {
      throw new BadRequestError("Wildcard '*' permission cannot be assigned to custom roles. Universal access is reserved for system store_admin.");
    }

    const validPermissions = (await listAllPermissions()).map((p) => p.key);
    const invalidPerms = permissions.filter((p) => !validPermissions.includes(p));
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

  // F-02: Prevent self-deletion of caller's own role
  const selfAssigned = await TenantMembership.exists({
    tenantId,
    userId,
    roleId,
  });
  if (selfAssigned) {
    throw new ForbiddenError('Cannot delete a role that is currently assigned to your own membership.');
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
