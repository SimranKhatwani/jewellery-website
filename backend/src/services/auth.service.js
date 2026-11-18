import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Invitation } from '../models/Invitation.js';
import { Customer } from '../models/Customer.js';
import { USER_STATUS, TENANT_STATUS, MEMBERSHIP_STATUS, SYSTEM_ROLE_SLUGS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { generateToken } from '../utils/jwt.js';
import { logAudit } from '../utils/audit.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone.js';

export const registerUser = async ({
  name,
  email,
  password,
  phoneNumber = '',
  tenantName = null,
  tenantSlug = null,
  req = null,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Pre-check for duplicate user email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError('An account with this email address already exists.');
  }

  // Pre-check slug uniqueness if tenant requested
  let targetSlug = null;
  if (tenantName) {
    targetSlug = (tenantSlug || tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const existingTenant = await Tenant.findOne({ slug: targetSlug });
    if (existingTenant) {
      throw new ConflictError(`Store slug '${targetSlug}' is already taken. Please choose another.`);
    }
  }

  // Validate and clean phone number if provided
  let cleanPhone = '';
  if (phoneNumber && String(phoneNumber).trim()) {
    cleanPhone = normalizePhoneNumber(phoneNumber);
    if (!isValidPhoneNumber(cleanPhone)) {
      throw new BadRequestError('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const session = await mongoose.startSession();
  let user;
  let createdTenant = null;
  let membership = null;

  try {
    await session.withTransaction(async () => {
      // 1. Create global User
      const [newUser] = await User.create(
        [
          {
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            phoneNumber: cleanPhone,
            status: USER_STATUS.ACTIVE,
            tokenVersion: 0,
          },
        ],
        { session }
      );
      user = newUser;

      // 2. If tenantName is provided, provision store & assign store_admin role
      if (tenantName) {
        const [newTenant] = await Tenant.create(
          [
            {
              name: tenantName.trim(),
              slug: targetSlug,
              ownerId: user._id,
              status: TENANT_STATUS.ACTIVE,
            },
          ],
          { session }
        );
        createdTenant = newTenant;

        // Resolve or create store_admin system role
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

        // Connect user to tenant via TenantMembership
        const [newMembership] = await TenantMembership.create(
          [
            {
              tenantId: createdTenant._id,
              userId: user._id,
              roleId: storeAdminRole._id,
              status: MEMBERSHIP_STATUS.ACTIVE,
            },
          ],
          { session }
        );
        membership = newMembership;
      }
    });
  } finally {
    await session.endSession();
  }

  if (createdTenant) {
    await logAudit({
      tenantId: createdTenant._id,
      userId: user._id,
      action: AUDIT_ACTIONS.TENANT_CREATE,
      resource: 'Tenant',
      resourceId: createdTenant._id,
      details: { storeName: createdTenant.name, slug: createdTenant.slug },
      req,
    });
  }

  await logAudit({
    tenantId: createdTenant?._id,
    userId: user._id,
    action: AUDIT_ACTIONS.USER_REGISTER,
    resource: 'User',
    resourceId: user._id,
    details: { email: user.email },
    req,
  });

  const token = generateToken({
    userId: user._id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion || 0,
  });

  // If registering as customer (no new tenant provisioned), store in `customers` collection
  let customerDoc = null;
  if (!createdTenant) {
    let targetTenant = null;
    const storeSlug = req?.headers?.['x-store-slug'] || req?.body?.storeSlug || req?.body?.tenantSlug;
    const tenantIdHeader = req?.headers?.['x-tenant-id'] || req?.body?.tenantId;

    if (tenantIdHeader && mongoose.Types.ObjectId.isValid(String(tenantIdHeader))) {
      targetTenant = await Tenant.findById(tenantIdHeader);
    } else if (storeSlug) {
      targetTenant = await Tenant.findOne({ slug: String(storeSlug).toLowerCase().trim() });
    } else {
      // Default to aurelle tenant
      targetTenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: TENANT_STATUS.ACTIVE }));
    }

    const tenantId = targetTenant ? targetTenant._id : null;
    customerDoc = await Customer.findOneAndUpdate(
      { email: user.email, ...(tenantId ? { tenantId } : {}) },
      {
        $set: {
          tenantId,
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: user.phoneNumber || '',
          status: 'active',
          isGuest: false,
        },
        $pull: { tags: 'guest' },
        $setOnInsert: {
          totalOrders: 0,
          totalSpent: 0,
        },
      },
      { upsert: true, new: true }
    );
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber || '',
      phoneNumber: user.phoneNumber || '',
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
    },
    customer: customerDoc,
    token,
    tenant: createdTenant,
  };
};

export const loginUser = async ({ email, password, req = null }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Find user by email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // 2. Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // 3. Status verification
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ForbiddenError(`Your account has been ${user.status}. Please contact support.`);
  }

  // 4. Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  // 5. Retrieve all active store memberships
  const memberships = await TenantMembership.find({
    userId: user._id,
    status: MEMBERSHIP_STATUS.ACTIVE,
  })
    .populate({
      path: 'tenantId',
      match: { status: { $ne: TENANT_STATUS.ARCHIVED } },
      select: 'name slug status plan settings logoUrl',
    })
    .populate('roleId', 'name slug permissions isSystemRole');

  const activeTenants = memberships
    .filter((m) => m.tenantId !== null)
    .map((m) => ({
      membershipId: m._id,
      tenantId: m.tenantId._id,
      name: m.tenantId.name,
      slug: m.tenantId.slug,
      status: m.tenantId.status,
      role: m.roleId.slug,
      roleName: m.roleId.name,
      permissions: m.roleId.permissions,
    }));

  const token = generateToken({
    userId: user._id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion || 0,
  });

  await logAudit({
    userId: user._id,
    action: AUDIT_ACTIONS.USER_LOGIN,
    resource: 'User',
    resourceId: user._id,
    details: { email: user.email, tenantCount: activeTenants.length },
    req,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber || '',
      phoneNumber: user.phoneNumber || '',
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    },
    token,
    tenants: activeTenants,
  };
};

export const logoutUser = async (userId, req = null) => {
  if (!userId) return;

  // Invalidate all tokens for this user by incrementing tokenVersion
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });

  await logAudit({
    userId,
    action: AUDIT_ACTIONS.USER_LOGOUT,
    resource: 'User',
    resourceId: userId,
    details: { message: 'All active sessions revoked via tokenVersion increment.' },
    req,
  });
};

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const memberships = await TenantMembership.find({
    userId: user._id,
  })
    .populate('tenantId', 'name slug status plan settings')
    .populate('roleId', 'name slug permissions');

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
    memberships: memberships.map((m) => ({
      membershipId: m._id,
      tenant: m.tenantId,
      role: m.roleId,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
  };
};

export const getInvitationDetails = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new BadRequestError('Invitation token is required.');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  const invitation = await Invitation.findOne({
    tokenHash,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('tenantId', 'name slug logoUrl')
    .populate('roleId', 'name slug description');

  if (!invitation) {
    throw new BadRequestError('Invitation token is invalid, expired, or has already been used.');
  }

  return {
    email: invitation.email,
    store: invitation.tenantId,
    role: invitation.roleId,
    expiresAt: invitation.expiresAt,
  };
};

export const acceptInvitation = async ({ token, name, password, req = null }) => {
  if (!token || !password) {
    throw new BadRequestError('Invitation token and password are required.');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const invitation = await Invitation.findOne({
    tokenHash,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new BadRequestError('Invitation token is invalid, expired, or has already been used.');
  }

  const session = await mongoose.startSession();
  let user;

  try {
    await session.withTransaction(async () => {
      // Check if global user already exists
      user = await User.findOne({ email: invitation.email }).session(session);

      if (!user) {
        if (!name || name.trim().length < 2) {
          throw new BadRequestError('Name is required for new user account registration.');
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const [newUser] = await User.create(
          [
            {
              name: name.trim(),
              email: invitation.email,
              passwordHash,
              status: USER_STATUS.ACTIVE,
              tokenVersion: 0,
            },
          ],
          { session }
        );
        user = newUser;
      } else {
        // If user exists and provided password, update password hash
        if (password) {
          const salt = await bcrypt.genSalt(12);
          user.passwordHash = await bcrypt.hash(password, salt);
          user.tokenVersion = (user.tokenVersion || 0) + 1;
          await user.save({ session });
        }
      }

      // Upsert membership for this store
      let membership = await TenantMembership.findOne({
        tenantId: invitation.tenantId,
        userId: user._id,
      }).session(session);

      if (membership) {
        membership.roleId = invitation.roleId;
        membership.status = MEMBERSHIP_STATUS.ACTIVE;
        membership.invitedBy = invitation.invitedBy;
        await membership.save({ session });
      } else {
        await TenantMembership.create(
          [
            {
              tenantId: invitation.tenantId,
              userId: user._id,
              roleId: invitation.roleId,
              status: MEMBERSHIP_STATUS.ACTIVE,
              invitedBy: invitation.invitedBy,
            },
          ],
          { session }
        );
      }

      // Mark invitation as accepted (single-use restriction enforced)
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      invitation.acceptedBy = user._id;
      await invitation.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await logAudit({
    tenantId: invitation.tenantId,
    userId: user._id,
    action: AUDIT_ACTIONS.INVITATION_ACCEPT,
    resource: 'Invitation',
    resourceId: invitation._id,
    details: { email: invitation.email, tenantId: invitation.tenantId },
    req,
  });

  const authToken = generateToken({
    userId: user._id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion || 0,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
    },
    token: authToken,
  };
};
