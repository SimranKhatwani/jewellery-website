import mongoose from 'mongoose';
import crypto from 'crypto';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Invitation } from '../models/Invitation.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS, SYSTEM_ROLE_SLUGS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import { sendStaffInvitationEmail } from './email.service.js';

export const createTenant = async ({ userId, name, slug, customDomain = null, req = null }) => {
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Check slug uniqueness
  const existingTenant = await Tenant.findOne({ slug: normalizedSlug });
  if (existingTenant) {
    throw new ConflictError(`Store slug '${normalizedSlug}' is already in use.`);
  }

  // 2. Check custom domain uniqueness if supplied
  if (customDomain) {
    const normalizedDomain = customDomain.toLowerCase().trim();
    const existingDomain = await Tenant.findOne({ customDomain: normalizedDomain });
    if (existingDomain) {
      throw new ConflictError(`Custom domain '${normalizedDomain}' is already bound to another store.`);
    }
  }

  const session = await mongoose.startSession();
  let tenant;

  try {
    await session.withTransaction(async () => {
      // Create Tenant
      const [newTenant] = await Tenant.create(
        [
          {
            name: name.trim(),
            slug: normalizedSlug,
            customDomain: customDomain ? customDomain.toLowerCase().trim() : undefined,
            customDomainVerified: false,
            ownerId: userId,
            status: TENANT_STATUS.ACTIVE,
          },
        ],
        { session }
      );
      tenant = newTenant;

      // Resolve or create store_admin role
      let storeAdminRole = await Role.findOne({
        tenantId: null,
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
      }).session(session);

      if (!storeAdminRole) {
        const [newRole] = await Role.create(
          [
            {
              tenantId: null,
              name: 'Store Admin',
              slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
              description: 'Complete administrative access to store operations',
              isSystemRole: true,
              permissions: ['*'],
            },
          ],
          { session }
        );
        storeAdminRole = newRole;
      }

      // Create Store Owner Membership
      await TenantMembership.create(
        [
          {
            tenantId: tenant._id,
            userId,
            roleId: storeAdminRole._id,
            status: MEMBERSHIP_STATUS.ACTIVE,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

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
    if (updateData.customDomain) {
      const normalizedDomain = updateData.customDomain.toLowerCase().trim();
      const existingDomain = await Tenant.findOne({
        customDomain: normalizedDomain,
        _id: { $ne: tenantId },
      });
      if (existingDomain) {
        throw new ConflictError(`Custom domain '${normalizedDomain}' is already bound to another store.`);
      }
      tenant.customDomain = normalizedDomain;
      tenant.customDomainVerified = false; // Requires explicit DNS verification
    } else {
      tenant.customDomain = undefined;
      tenant.customDomainVerified = false;
    }
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

export const transferTenantOwnership = async ({ tenantId, currentOwnerId, newOwnerId, isSuperAdmin = false, req = null }) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new NotFoundError('Store not found.');
  }

  // Validate authorization: Only actual current owner or Super Admin can initiate ownership transfer
  if (!isSuperAdmin && !tenant.ownerId.equals(currentOwnerId)) {
    throw new ForbiddenError('Only the current store owner can transfer store ownership.');
  }

  if (tenant.ownerId.equals(newOwnerId)) {
    throw new BadRequestError('The designated recipient is already the store owner.');
  }

  // Validate target user exists and is active
  const targetUser = await User.findById(newOwnerId);
  if (!targetUser || targetUser.status !== 'active') {
    throw new BadRequestError('Recipient user account not found or is inactive.');
  }

  // Validate recipient is an active member of this store
  const targetMembership = await TenantMembership.findOne({
    tenantId,
    userId: newOwnerId,
    status: MEMBERSHIP_STATUS.ACTIVE,
  });

  if (!targetMembership) {
    throw new BadRequestError('Recipient must be an active staff member of this store before ownership transfer.');
  }

  // Resolve store_admin role
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

  const previousOwnerId = tenant.ownerId;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Assign new owner on tenant
      tenant.ownerId = newOwnerId;
      await tenant.save({ session });

      // 2. Ensure new owner has store_admin role
      targetMembership.roleId = storeAdminRole._id;
      await targetMembership.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await logAudit({
    tenantId,
    userId: currentOwnerId,
    action: AUDIT_ACTIONS.TENANT_OWNERSHIP_TRANSFER,
    resource: 'Tenant',
    resourceId: tenant._id,
    details: { previousOwnerId, newOwnerId },
    req,
  });

  return {
    message: 'Store ownership transferred successfully.',
    previousOwnerId,
    newOwnerId,
    storeId: tenant._id,
  };
};

export const inviteStaffMember = async ({ tenantId, inviterId, email, roleId, req = null }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Verify Role exists and is applicable to this tenant
  const role = await Role.findOne({
    _id: roleId,
    $or: [{ tenantId: null }, { tenantId }],
  });

  if (!role) {
    throw new NotFoundError('Role not found or not available for this store.');
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new NotFoundError('Store not found.');
  }

  const inviter = await User.findById(inviterId);

  // 2. Check if user is already an active member of this store
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const existingMembership = await TenantMembership.findOne({
      tenantId,
      userId: existingUser._id,
    });
    if (existingMembership && existingMembership.status === MEMBERSHIP_STATUS.ACTIVE) {
      throw new ConflictError('This user is already an active member of this store.');
    }
  }

  // 3. Generate cryptographically secure invitation token (single-use, 48h expiry)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours

  // Invalidate any prior pending invitations for this email in this store
  await Invitation.updateMany(
    { tenantId, email: normalizedEmail, status: 'pending' },
    { $set: { status: 'revoked' } }
  );

  const invitation = await Invitation.create({
    tenantId,
    email: normalizedEmail,
    roleId: role._id,
    tokenHash,
    invitedBy: inviterId,
    expiresAt,
    status: 'pending',
  });

  // Construct invitation URL for email notification
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const inviteUrl = `${frontendBase}/accept-invitation?token=${rawToken}`;

  // Dispatch invitation email via abstraction
  const emailResult = await sendStaffInvitationEmail({
    email: normalizedEmail,
    storeName: tenant.name,
    inviterName: inviter?.name || 'A Store Administrator',
    inviteUrl,
  });

  await logAudit({
    tenantId,
    userId: inviterId,
    action: AUDIT_ACTIONS.INVITATION_CREATE,
    resource: 'Invitation',
    resourceId: invitation._id,
    details: { email: normalizedEmail, role: role.slug },
    req,
  });

  return {
    invitationId: invitation._id,
    email: normalizedEmail,
    role: role.slug,
    expiresAt,
    emailDispatched: emailResult.dispatched,
    emailReason: emailResult.reason || null,
    // Note: token is only provided in dev/test environment if email not configured
    ...(process.env.NODE_ENV !== 'production' && !emailResult.dispatched ? { inviteToken: rawToken } : {}),
  };
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

  // F-02: Self-escalation prevention
  if (membership.userId.equals(updaterId)) {
    throw new ForbiddenError('Users cannot modify their own membership role or status.');
  }

  // F-01: Owner protection
  const tenant = await Tenant.findById(tenantId);
  if (tenant && tenant.ownerId.equals(membership.userId)) {
    throw new ForbiddenError('Cannot demote, suspend, or modify the store owner membership.');
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
    details: { targetUserId: membership.userId, status, roleId },
    req,
  });

  return membership;
};

export const removeStaffMember = async ({ tenantId, membershipId, removerId, req = null }) => {
  const membership = await TenantMembership.findOne({ _id: membershipId, tenantId });
  if (!membership) {
    throw new NotFoundError('Membership record not found in this store.');
  }

  // F-02: Self-removal restriction via staff removal API
  if (membership.userId.equals(removerId)) {
    throw new ForbiddenError('Users cannot remove their own store membership via staff management.');
  }

  // F-01: Prevent removing store owner
  const tenant = await Tenant.findById(tenantId);
  if (tenant && tenant.ownerId.equals(membership.userId)) {
    throw new ForbiddenError('Cannot remove the store owner from store membership.');
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
