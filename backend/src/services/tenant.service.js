import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Invitation } from '../models/Invitation.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS, USER_STATUS, SYSTEM_ROLE_SLUGS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import { sendStaffInvitationEmail, sendStaffWelcomeEmail } from './email.service.js';
import { ensureSystemRoles } from './role.service.js';
import { sanitizeContentData } from '../utils/sanitize.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone.js';
import { config as env } from '../config/env.js';

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

  if (updateData.settings && typeof updateData.settings === 'object') {
    const sanitizedSettings = sanitizeContentData(updateData.settings);

    // Validate and normalize all phone number entries
    const checkAndNormalizePhone = (obj, prop, label) => {
      if (obj && obj[prop] !== undefined) {
        const raw = String(obj[prop] || '').trim();
        if (raw) {
          const clean = normalizePhoneNumber(raw);
          if (!isValidPhoneNumber(clean)) {
            throw new BadRequestError(`${label} must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.`);
          }
          obj[prop] = clean;
        } else {
          obj[prop] = '';
        }
      }
    };

    checkAndNormalizePhone(sanitizedSettings, 'contactPhone', 'Store contact phone');
    if (sanitizedSettings.footer) {
      checkAndNormalizePhone(sanitizedSettings.footer, 'contactPhone', 'Footer contact phone');
    }
    if (sanitizedSettings.policies?.returnPolicyConfig) {
      checkAndNormalizePhone(sanitizedSettings.policies.returnPolicyConfig, 'whatsappSupportNumber', 'WhatsApp support number');
    }
    if (sanitizedSettings.contentPages?.returnPolicy) {
      checkAndNormalizePhone(sanitizedSettings.contentPages.returnPolicy, 'supportPhone', 'Return policy support phone');
    }
    if (sanitizedSettings.contentPages?.contactUs) {
      checkAndNormalizePhone(sanitizedSettings.contentPages.contactUs, 'contactPhone', 'Contact Us support phone');
      checkAndNormalizePhone(sanitizedSettings.contentPages.contactUs, 'whatsappNumber', 'Contact Us WhatsApp number');
    }

    // If contentPages is provided, ensure updatedAt timestamps are updated
    if (sanitizedSettings.contentPages && typeof sanitizedSettings.contentPages === 'object') {
      for (const pageKey of Object.keys(sanitizedSettings.contentPages)) {
        if (sanitizedSettings.contentPages[pageKey] && typeof sanitizedSettings.contentPages[pageKey] === 'object') {
          sanitizedSettings.contentPages[pageKey].updatedAt = new Date();
        }
      }
    }

    const existing = tenant.settings ? (tenant.settings.toObject ? tenant.settings.toObject() : tenant.settings) : {};

    const deepMerge = (target, source) => {
      const output = { ...target };
      for (const key of Object.keys(source)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          !(source[key] instanceof Date) &&
          target[key] &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key]) &&
          !(target[key] instanceof Date)
        ) {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      }
      return output;
    };

    tenant.settings = deepMerge(existing, sanitizedSettings);
    tenant.markModified('settings');
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
  const superAdminEmail = (env.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();
  if (normalizedEmail === superAdminEmail || normalizedEmail.startsWith('superadmin@')) {
    throw new BadRequestError('Cannot invite platform superadmin account as store staff.');
  }

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

/**
 * Direct Staff Account Provisioning
 * Creates a User account with specified email & password, assigns tenant role,
 * synchronizes administrative credentials, and sends login information via email.
 */
export const createStaffMemberDirectly = async ({
  tenantId,
  creatorId,
  name,
  email,
  password,
  phoneNumber = '',
  roleId,
  req = null,
}) => {
  const normalizedEmail = email.toLowerCase().trim();
  const superAdminEmail = (env.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();
  if (normalizedEmail === superAdminEmail || normalizedEmail.startsWith('superadmin@')) {
    throw new BadRequestError('Cannot add platform superadmin account as store staff.');
  }

  await ensureSystemRoles();

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

  const creator = await User.findById(creatorId);

  // 2. Validate and clean phone number if provided
  let cleanPhone = '';
  if (phoneNumber && String(phoneNumber).trim()) {
    cleanPhone = normalizePhoneNumber(phoneNumber);
    if (!isValidPhoneNumber(cleanPhone)) {
      throw new BadRequestError('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
    }
  }

  // 3. Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // 4. Resolve or create User
  let user = await User.findOne({ email: normalizedEmail });
  if (user) {
    const existingMembership = await TenantMembership.findOne({
      tenantId,
      userId: user._id,
    });
    if (existingMembership && existingMembership.status === MEMBERSHIP_STATUS.ACTIVE) {
      throw new ConflictError('This user is already an active member of this store.');
    }

    user.passwordHash = passwordHash;
    user.currentPassword = password;
    if (name) user.name = name.trim();
    if (cleanPhone) user.phoneNumber = cleanPhone;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  } else {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      currentPassword: password,
      phoneNumber: cleanPhone,
      status: USER_STATUS.ACTIVE,
    });
  }

  // 5. Create or reactivate membership
  let membership = await TenantMembership.findOne({ tenantId, userId: user._id });
  if (membership) {
    membership.roleId = role._id;
    membership.status = MEMBERSHIP_STATUS.ACTIVE;
    membership.invitedBy = creatorId;
    await membership.save();
  } else {
    membership = await TenantMembership.create({
      tenantId,
      userId: user._id,
      roleId: role._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
      invitedBy: creatorId,
    });
  }

  // 6. Sync Admin account record for immediate login at /admin
  await Admin.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      name: user.name,
      passwordHash: user.passwordHash,
      role: 'admin',
      tokenVersion: user.tokenVersion || 0,
      lastLogin: new Date(),
    },
    { upsert: true, new: true }
  );

  // 7. Revoke/complete any pending invitations for this email in this store
  await Invitation.updateMany(
    { tenantId, email: normalizedEmail, status: 'pending' },
    { $set: { status: 'accepted', acceptedAt: new Date(), acceptedBy: user._id } }
  );

  // 8. Dispatch welcome email with credentials
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const loginUrl = `${frontendBase}/admin`;

  const emailResult = await sendStaffWelcomeEmail({
    email: normalizedEmail,
    storeName: tenant.name,
    inviterName: creator?.name || 'Store Administrator',
    roleName: role.name,
    password,
    loginUrl,
  });

  await logAudit({
    tenantId,
    userId: creatorId,
    action: AUDIT_ACTIONS.MEMBERSHIP_CREATE,
    resource: 'TenantMembership',
    resourceId: membership._id,
    details: { email: normalizedEmail, role: role.slug, userId: user._id },
    req,
  });

  return {
    membershipId: membership._id,
    userId: user._id,
    name: user.name,
    email: normalizedEmail,
    role: {
      id: role._id,
      name: role.name,
      slug: role.slug,
      permissions: role.permissions,
    },
    status: membership.status,
    emailDispatched: emailResult.dispatched,
    emailReason: emailResult.reason || null,
  };
};

export const listTenantStaffMembers = async (tenantId) => {
  const [memberships, invitations] = await Promise.all([
    TenantMembership.find({ tenantId })
      .populate('userId', 'name email status lastLoginAt phoneNumber isSuperAdmin currentPassword')
      .populate('roleId', 'name slug permissions isSystemRole')
      .populate('invitedBy', 'name email'),
    Invitation.find({ tenantId, status: 'pending' })
      .populate('roleId', 'name slug permissions isSystemRole')
      .populate('invitedBy', 'name email'),
  ]);

  const superAdminEmail = (env.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();

  // Strict isolation: Never expose platform superadmin accounts in tenant store staff
  const members = memberships.filter((m) => {
    if (!m.userId) return false;
    if (m.userId.isSuperAdmin) return false;
    const email = (m.userId.email || '').toLowerCase().trim();
    if (email === superAdminEmail || email.startsWith('superadmin@') || email.includes('superadmin')) {
      return false;
    }
    return true;
  });

  const pendingInvitations = invitations.filter((inv) => {
    const email = (inv.email || '').toLowerCase().trim();
    if (email === superAdminEmail || email.startsWith('superadmin@') || email.includes('superadmin')) {
      return false;
    }
    return true;
  });

  return {
    members,
    pendingInvitations,
  };
};

export const updateStaffMembership = async ({
  tenantId,
  membershipId,
  status,
  roleId,
  name,
  email,
  password,
  phoneNumber,
  updaterId,
  req = null,
}) => {
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

  // Find user associated with this membership
  const user = await User.findById(membership.userId);
  if (!user) {
    throw new NotFoundError('User account associated with this membership was not found.');
  }

  // Prevent modifying platform superadmin accounts from store admin panel
  const superAdminEmail = (env.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();
  if (user.isSuperAdmin || (user.email && (user.email.toLowerCase() === superAdminEmail || user.email.toLowerCase().startsWith('superadmin@')))) {
    throw new ForbiddenError('Platform superadmin accounts cannot be modified from the store admin panel.');
  }

  let oldEmail = user.email;

  // 1. Update Name
  if (name && typeof name === 'string' && name.trim()) {
    user.name = name.trim();
  }

  // 2. Update Email
  if (email && typeof email === 'string' && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== user.email) {
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        throw new ConflictError('A user account with this email address already exists.');
      }
      user.email = normalizedEmail;
    }
  }

  // 3. Update Phone Number (strict 10 digits validation)
  if (phoneNumber !== undefined) {
    const rawPhone = String(phoneNumber || '').trim();
    if (rawPhone) {
      const cleanPhone = normalizePhoneNumber(rawPhone);
      if (!isValidPhoneNumber(cleanPhone)) {
        throw new BadRequestError('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      }
      user.phoneNumber = cleanPhone;
    } else {
      user.phoneNumber = '';
    }
  }

  // 4. Update Password if provided
  if (password && typeof password === 'string' && password.trim()) {
    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long.');
    }
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.currentPassword = password.trim();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  await user.save();

  // 5. Sync with Admin credentials
  if (oldEmail && oldEmail !== user.email) {
    await Admin.deleteOne({ email: oldEmail });
  }
  await Admin.findOneAndUpdate(
    { email: user.email },
    {
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: 'admin',
      tokenVersion: user.tokenVersion || 0,
    },
    { upsert: true, new: true }
  );

  // 6. Update Role if provided
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

  // 7. Update Status if provided
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
    details: {
      targetUserId: membership.userId,
      status: membership.status,
      roleId: membership.roleId,
      emailUpdated: oldEmail !== user.email,
      passwordReset: Boolean(password && password.trim()),
    },
    req,
  });

  const updatedMembership = await TenantMembership.findById(membership._id)
    .populate('userId', 'name email status lastLoginAt phoneNumber')
    .populate('roleId', 'name slug permissions isSystemRole')
    .populate('invitedBy', 'name email');

  return updatedMembership;
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

  // Prevent modifying or removing platform superadmin accounts from store admin panel
  const superAdminEmail = (env.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();
  const targetUser = await User.findById(membership.userId);
  if (targetUser && (targetUser.isSuperAdmin || (targetUser.email && (targetUser.email.toLowerCase() === superAdminEmail || targetUser.email.toLowerCase().startsWith('superadmin@'))))) {
    throw new ForbiddenError('Platform superadmin accounts cannot be modified or removed from store admin panel.');
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
