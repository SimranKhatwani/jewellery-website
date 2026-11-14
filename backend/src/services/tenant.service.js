import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS, SYSTEM_ROLE_SLUGS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';

export const createTenant = async ({ userId, name, slug, customDomain = null, req = null }) => {
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Check slug uniqueness
  const existingTenant = await Tenant.findOne({ slug: normalizedSlug });
  if (existingTenant) {
    throw new ConflictError(`Store slug '${normalizedSlug}' is already in use.`);
  }

  // 2. Create Tenant
  const tenant = await Tenant.create({
    name: name.trim(),
    slug: normalizedSlug,
    customDomain: customDomain ? customDomain.toLowerCase().trim() : undefined,
    ownerId: userId,
    status: TENANT_STATUS.ACTIVE,
  });

  // 3. Resolve store_admin role
  let storeAdminRole = await Role.findOne({ tenantId: null, slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN });
  if (!storeAdminRole) {
    storeAdminRole = await Role.create({
      tenantId: null,
      name: 'Store Admin',
      slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
      description: 'Complete administrative access to store operations',
      isSystemRole: true,
      permissions: ['*'],
    });
  }

  // 4. Create Store Owner Membership
  await TenantMembership.create({
    tenantId: tenant._id,
    userId,
    roleId: storeAdminRole._id,
    status: MEMBERSHIP_STATUS.ACTIVE,
  });

  await logAudit({
    tenantId: tenant._id,
    userId,
    action: AUDIT_ACTIONS.TENANT_CREATE,
    resource: 'Tenant',
    resourceId: tenant._id,
    details: { name: tenant.name, slug: tenant.slug },
    req,
  });

  return tenant;
};

export const getTenantDetails = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).populate('ownerId', 'name email');
  if (!tenant) {
    throw new NotFoundError('Store not found.');
  }
  return tenant;
};

export const updateTenantDetails = async (tenantId, updateData, userId, req = null) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new NotFoundError('Store not found.');
  }

  if (updateData.name) tenant.name = updateData.name.trim();
  if (updateData.customDomain !== undefined) {
    tenant.customDomain = updateData.customDomain ? updateData.customDomain.toLowerCase().trim() : undefined;
  }
  if (updateData.settings) {
    tenant.settings = { ...tenant.settings, ...updateData.settings };
  }

  await tenant.save();

  await logAudit({
    tenantId: tenant._id,
    userId,
    action: AUDIT_ACTIONS.TENANT_UPDATE,
    resource: 'Tenant',
    resourceId: tenant._id,
    details: updateData,
    req,
  });

  return tenant;
};

export const inviteStaffMember = async ({ tenantId, inviterId, email, roleId, name = '', req = null }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Verify Role exists and is applicable to this tenant (either system role or tenant-specific)
  const role = await Role.findOne({
    _id: roleId,
    $or: [{ tenantId: null }, { tenantId }],
  });

  if (!role) {
    throw new NotFoundError('Role not found or not available for this store.');
  }

  // 2. Find or register placeholder user
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // Generate a temporary secure password for invited user
    const tempPassword = `Invite#${Math.random().toString(36).substring(2, 10)}!`;
    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    user = await User.create({
      name: name ? name.trim() : normalizedEmail.split('@')[0],
      email: normalizedEmail,
      passwordHash,
      status: 'active',
    });
  }

  // 3. Check if membership already exists in this tenant
  const existingMembership = await TenantMembership.findOne({
    tenantId,
    userId: user._id,
  });

  if (existingMembership) {
    if (existingMembership.status === MEMBERSHIP_STATUS.ACTIVE) {
      throw new ConflictError('This user is already an active member of this store.');
    }
    // Reactivate with new role
    existingMembership.roleId = role._id;
    existingMembership.status = MEMBERSHIP_STATUS.ACTIVE;
    existingMembership.invitedBy = inviterId;
    await existingMembership.save();

    await logAudit({
      tenantId,
      userId: inviterId,
      action: AUDIT_ACTIONS.MEMBERSHIP_UPDATE,
      resource: 'TenantMembership',
      resourceId: existingMembership._id,
      details: { targetUserId: user._id, email: user.email, role: role.slug },
      req,
    });

    return existingMembership;
  }

  // 4. Create new membership
  const membership = await TenantMembership.create({
    tenantId,
    userId: user._id,
    roleId: role._id,
    status: MEMBERSHIP_STATUS.ACTIVE,
    invitedBy: inviterId,
  });

  await logAudit({
    tenantId,
    userId: inviterId,
    action: AUDIT_ACTIONS.MEMBERSHIP_INVITE,
    resource: 'TenantMembership',
    resourceId: membership._id,
    details: { targetUserId: user._id, email: user.email, role: role.slug },
    req,
  });

  return membership;
};

export const listTenantStaffMembers = async (tenantId) => {
  return TenantMembership.find({ tenantId })
    .populate('userId', 'name email status lastLoginAt')
    .populate('roleId', 'name slug permissions isSystemRole')
    .populate('invitedBy', 'name email');
};

export const updateStaffMembership = async ({ tenantId, membershipId, status, roleId, updaterId, req = null }) => {
  const membership = await TenantMembership.findOne({ _id: membershipId, tenantId });
  if (!membership) {
    throw new NotFoundError('Membership record not found in this store.');
  }

  if (roleId) {
    const role = await Role.findOne({
      _id: roleId,
      $or: [{ tenantId: null }, { tenantId }],
    });
    if (!role) {
      throw new NotFoundError('Role not found for this store.');
    }
    membership.roleId = role._id;
  }

  if (status) {
    membership.status = status;
  }

  await membership.save();

  await logAudit({
    tenantId,
    userId: updaterId,
    action: AUDIT_ACTIONS.MEMBERSHIP_UPDATE,
    resource: 'TenantMembership',
    resourceId: membership._id,
    details: { status, roleId },
    req,
  });

  return membership;
};

export const removeStaffMember = async ({ tenantId, membershipId, removerId, req = null }) => {
  const membership = await TenantMembership.findOne({ _id: membershipId, tenantId });
  if (!membership) {
    throw new NotFoundError('Membership record not found in this store.');
  }

  // Prevent store owner from removing their own membership
  const tenant = await Tenant.findById(tenantId);
  if (tenant && tenant.ownerId.equals(membership.userId)) {
    throw new BadRequestError('Cannot remove the store owner from store membership.');
  }

  await TenantMembership.deleteOne({ _id: membershipId, tenantId });

  await logAudit({
    tenantId,
    userId: removerId,
    action: AUDIT_ACTIONS.MEMBERSHIP_REMOVE,
    resource: 'TenantMembership',
    resourceId: membershipId,
    details: { targetUserId: membership.userId },
    req,
  });

  return { message: 'Staff member removed successfully.' };
};

