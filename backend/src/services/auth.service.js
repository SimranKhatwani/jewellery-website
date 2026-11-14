import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { USER_STATUS, TENANT_STATUS, MEMBERSHIP_STATUS, SYSTEM_ROLE_SLUGS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { generateToken } from '../utils/jwt.js';
import { logAudit } from '../utils/audit.js';

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

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError('An account with this email address already exists.');
  }

  // 2. Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Create global User
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    phoneNumber: phoneNumber.trim(),
    status: USER_STATUS.ACTIVE,
  });

  let createdTenant = null;
  let membership = null;

  // 4. If tenantName is provided, provision store & assign store_admin role
  if (tenantName) {
    const slug = (tenantSlug || tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    // Check if slug taken
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      throw new ConflictError(`Store slug '${slug}' is already taken. Please choose another.`);
    }

    createdTenant = await Tenant.create({
      name: tenantName.trim(),
      slug,
      ownerId: user._id,
      status: TENANT_STATUS.ACTIVE,
    });

    // Resolve or create store_admin system role
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

    // Connect user to tenant via TenantMembership
    membership = await TenantMembership.create({
      tenantId: createdTenant._id,
      userId: user._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

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
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
    },
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

  // Filter out any populated memberships where tenant was not matched
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
      phoneNumber: user.phoneNumber,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    },
    token,
    tenants: activeTenants,
  };
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

