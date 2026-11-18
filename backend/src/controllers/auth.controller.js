import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { USER_STATUS, MEMBERSHIP_STATUS } from '../config/constants.js';
import { config } from '../config/env.js';

/**
 * POST /api/auth/login
 * Public endpoint for admin authentication
 * Supports unified login across legacy Admin and multi-tenant User/Store Admins
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Look up user across both Admin and unified User models
    let admin = await Admin.findOne({ email: normalizedEmail });
    let user = await User.findOne({ email: normalizedEmail });

    if (!admin && !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.',
      });
      return;
    }

    // 2. Validate password against available identity records
    let isMatch = false;
    if (admin) {
      isMatch = await admin.comparePassword(password);
    }
    if (!isMatch && user) {
      isMatch = await user.comparePassword(password);
    }

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.',
      });
      return;
    }

    // 3. If User exists, verify account status
    if (user && user.status && user.status !== USER_STATUS.ACTIVE) {
      res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      });
      return;
    }

    // 4. Resolve Store Admin & Multi-Tenant Authority
    let userMemberships = [];
    if (user) {
      userMemberships = await TenantMembership.find({
        userId: user._id,
        status: MEMBERSHIP_STATUS.ACTIVE,
      })
        .populate('tenantId', '_id name slug status')
        .populate('roleId', 'name slug permissions');
    }

    // Check if the user has administrative privileges:
    // Either legacy Admin model, User.isSuperAdmin, or active TenantMembership (store_admin, etc.)
    const hasStoreAccess =
      Boolean(admin) ||
      Boolean(user?.isSuperAdmin) ||
      userMemberships.length > 0;

    if (!hasStoreAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied: This account does not possess store administrative privileges.',
      });
      return;
    }

    const superAdminEmail = (config.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();
    const isPlatformSuperAdmin = normalizedEmail === superAdminEmail || (Boolean(user?.isSuperAdmin) && normalizedEmail.startsWith('superadmin@'));

    // 5. Auto-bridge / sync between User and Admin models
    if (!admin && user) {
      admin = await Admin.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          name: user.name || 'Store Admin',
          passwordHash: user.passwordHash,
          role: isPlatformSuperAdmin ? 'superadmin' : 'admin',
          tokenVersion: user.tokenVersion || 0,
          lastLogin: new Date(),
        },
        { upsert: true, new: true }
      );
    } else if (admin && user) {
      // Sync password hash from the successful match
      if (admin.passwordHash !== user.passwordHash) {
        admin.passwordHash = user.passwordHash;
      }
      admin.role = isPlatformSuperAdmin ? 'superadmin' : 'admin';
      admin.lastLogin = new Date();
      await admin.save();
    } else if (admin && !user) {
      // Bridge legacy Admin to User
      user = await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
          name: admin.name || 'Aurelle Admin',
          email: admin.email,
          passwordHash: admin.passwordHash,
          isSuperAdmin: isPlatformSuperAdmin,
          status: USER_STATUS.ACTIVE,
          tokenVersion: admin.tokenVersion || 0,
        },
        { upsert: true, new: true }
      );
    }

    // 6. Determine primary store tenant for this admin
    let primaryTenant = null;
    if (userMemberships.length > 0) {
      primaryTenant = userMemberships[0].tenantId;
    } else {
      // Check if user owns a tenant directly
      primaryTenant = await Tenant.findOne({ ownerId: user?._id || admin._id, status: { $ne: 'archived' } });
      if (!primaryTenant) {
        // Fallback for platform superadmin or default admin
        primaryTenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
      }
    }

    // Sync token versions across both records
    const currentAdminVersion = admin.tokenVersion || 0;
    const currentUserVersion = user?.tokenVersion || 0;
    const targetVersion = Math.max(currentAdminVersion, currentUserVersion);

    admin.tokenVersion = targetVersion;
    admin.lastLogin = new Date();
    await admin.save();

    if (user && (user.tokenVersion || 0) !== targetVersion) {
      user.tokenVersion = targetVersion;
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Sign JWT with tokenVersion and tenant metadata
    const jwtSecret = config.jwt.secret;
    const expiresIn = config.jwt.expiresIn;

    const token = jwt.sign(
      {
        id: admin._id,
        userId: user?._id || admin._id,
        email: admin.email,
        role: admin.role,
        isSuperAdmin: isPlatformSuperAdmin,
        tenantId: primaryTenant?._id,
        storeSlug: primaryTenant?.slug,
        tokenVersion: targetVersion,
      },
      jwtSecret,
      { expiresIn }
    );

    // Determine resolved role and permissions for response
    const primaryMembership = userMemberships.length > 0 ? userMemberships[0] : null;
    const resolvedRoleSlug = primaryMembership?.roleId?.slug || (isPlatformSuperAdmin ? 'superadmin' : 'store_admin');
    const resolvedRoleName = primaryMembership?.roleId?.name || (resolvedRoleSlug === 'superadmin' ? 'Platform Super Admin' : 'Store Administrator');
    const resolvedPermissions = isPlatformSuperAdmin
      ? ['*']
      : (primaryMembership?.roleId?.permissions || (resolvedRoleSlug === 'store_admin' ? ['*'] : []));

    res.json({
      success: true,
      message: 'Admin session authenticated successfully.',
      token,
      admin: {
        id: admin._id,
        userId: user?._id || admin._id,
        email: admin.email,
        name: admin.name,
        role: resolvedRoleSlug,
        roleName: resolvedRoleName,
        permissions: resolvedPermissions,
        isSuperAdmin: isPlatformSuperAdmin,
        tenantId: primaryTenant?._id,
        storeSlug: primaryTenant?.slug,
        storeName: primaryTenant?.name,
        tokenVersion: targetVersion,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Terminate admin session and increment tokenVersion to revoke active token
 */
export const logout = async (req, res, next) => {
  try {
    const adminId = req.admin?.id || req.admin?.userId;
    if (adminId && mongoose.Types.ObjectId.isValid(String(adminId))) {
      await Admin.findByIdAndUpdate(adminId, { $inc: { tokenVersion: 1 } });
    }
    if (req.user) {
      req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
      await req.user.save();
    }
    res.json({
      success: true,
      message: 'Admin session terminated and token revoked.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Protected endpoint returning active authenticated admin details
 */
export const getMe = async (req, res, next) => {
  try {
    const adminId = req.admin?.id || req.admin?.userId;
    let admin = null;
    if (adminId && mongoose.Types.ObjectId.isValid(String(adminId))) {
      admin = await Admin.findById(adminId).select('-passwordHash').lean();
    }
    if (!admin && req.admin?.email) {
      admin = await Admin.findOne({ email: req.admin.email }).select('-passwordHash').lean();
    }
    if (!admin && req.user) {
      admin = {
        _id: req.user._id,
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.isSuperAdmin ? 'superadmin' : 'admin',
      };
    }

    if (!admin) {
      res.status(404).json({
        success: false,
        message: 'Admin user not found.',
      });
      return;
    }

    // Attach storeSlug, tenant details, and RBAC permissions
    const superAdminEmail = (config.superAdmin?.email || 'superadmin@aurelle.com').toLowerCase().trim();
    const currentEmail = (req.user?.email || admin.email || '').toLowerCase().trim();
    const isPlatformSuperAdmin = currentEmail === superAdminEmail || (Boolean(req.user?.isSuperAdmin) && currentEmail.startsWith('superadmin@'));

    let primaryTenant = null;
    let resolvedRoleSlug = isPlatformSuperAdmin ? 'superadmin' : (admin.role === 'superadmin' ? 'store_admin' : admin.role);
    let resolvedRoleName = isPlatformSuperAdmin ? 'Platform Super Admin' : 'Store Administrator';
    let resolvedPermissions = isPlatformSuperAdmin ? ['*'] : [];

    const userId = req.user?._id || admin.id || admin._id;
    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      const membership = await TenantMembership.findOne({
        userId,
        status: MEMBERSHIP_STATUS.ACTIVE,
      })
        .populate('tenantId', '_id name slug')
        .populate('roleId', 'name slug permissions');

      if (membership?.tenantId) {
        primaryTenant = membership.tenantId;
      }
      if (membership?.roleId) {
        resolvedRoleSlug = isPlatformSuperAdmin ? 'superadmin' : (membership.roleId.slug || resolvedRoleSlug);
        resolvedRoleName = isPlatformSuperAdmin ? 'Platform Super Admin' : (membership.roleId.name || resolvedRoleName);
        resolvedPermissions = isPlatformSuperAdmin ? ['*'] : (membership.roleId.permissions || []);
      } else if (isPlatformSuperAdmin) {
        resolvedPermissions = ['*'];
      } else {
        resolvedPermissions = ['*']; // Default fallback for store owner
      }
    }

    if (!primaryTenant) {
      primaryTenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    }

    res.json({
      success: true,
      admin: {
        ...admin,
        role: resolvedRoleSlug,
        roleName: resolvedRoleName,
        permissions: resolvedPermissions,
        tenantId: primaryTenant?._id,
        storeSlug: primaryTenant?.slug,
        storeName: primaryTenant?.name,
      },
    });
  } catch (error) {
    next(error);
  }
};
