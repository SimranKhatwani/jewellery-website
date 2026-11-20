import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { User } from '../models/User.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS, USER_STATUS } from '../config/constants.js';
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { escapeRegex, isValidTenantSlug, buildSafeExactRegex } from '../utils/regex.js';

/**
 * Standard platform hostnames that should not be treated as tenant custom domains
 */
const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'aurelle.com',
  'api.aurelle.com',
  'jewellery-website-eta-flax.vercel.app',
]);

/**
 * Tenant Resolution & Access Isolation Middleware
 * Resolves tenant from headers, route parameters, query string, or verified custom domain.
 * Validates store status and enforces strict tenant membership isolation.
 *
 * @param {Object} options
 * @param {boolean} [options.requireMembership=true] - Whether to enforce active membership check for req.user
 */
export const resolveTenant = (options = { requireMembership: true }) => {
  return async (req, _res, next) => {
    try {
      let rawIdentifier =
        req.headers['x-tenant-id'] ||
        req.headers['x-store-slug'] ||
        req.params.tenantId ||
        req.params.storeSlug ||
        req.query.tenantId;

      let tenant = null;

      if (rawIdentifier) {
        const identifier = String(rawIdentifier).trim().toLowerCase();
        if (mongoose.Types.ObjectId.isValid(identifier)) {
          tenant = await Tenant.findById(identifier);
        } else if (isValidTenantSlug(identifier)) {
          tenant = await Tenant.findOne({
            $or: [
              { slug: identifier },
              ...(identifier === 'giva' ? [{ slug: 'giva-jewels' }] : []),
              ...(identifier === 'giva-jewels' ? [{ slug: 'giva' }] : []),
              { slug: `${identifier}-jewels` },
              { slug: buildSafeExactRegex(identifier) },
            ],
          });
        }
      } else {
        // F-07: Custom-domain resolution from Host header
        const rawHost = req.headers.host || req.hostname || '';
        const normalizedHost = rawHost.split(':')[0].toLowerCase().trim();

        const isPlatformHost =
          PLATFORM_HOSTS.has(normalizedHost) ||
          normalizedHost.endsWith('.vercel.app') ||
          normalizedHost.endsWith('.localhost');

        if (normalizedHost && !isPlatformHost) {
          // Only resolve verified custom domains
          tenant = await Tenant.findOne({
            customDomain: normalizedHost,
            customDomainVerified: true,
          });
        }
      }

      if (!tenant) {
        if (rawIdentifier) {
          throw new NotFoundError(`Store '${rawIdentifier}' was not found.`);
        }
        throw new BadRequestError(
          'Tenant context required. Provide X-Tenant-ID header, route parameter, or access via a verified custom domain.'
        );
      }

      // Check tenant operational status
      if (tenant.status === TENANT_STATUS.SUSPENDED) {
        throw new ForbiddenError('This store account is currently suspended. Please contact platform support.');
      }

      if (tenant.status === TENANT_STATUS.ARCHIVED) {
        throw new ForbiddenError('This store account has been closed or archived.');
      }

      // Attach tenant to request object
      req.tenant = tenant;

      // If membership check is not required (e.g. public storefront browsing), proceed
      if (!options.requireMembership) {
        next();
        return;
      }

      // If membership check is required, verify authentication exists
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to access store context.');
      }

      // Platform Super Admin bypasses tenant membership with global auditor/admin permissions
      if (req.user.isSuperAdmin) {
        req.membership = {
          role: 'superadmin',
          roleName: 'Platform Super Admin',
          permissions: ['*'],
          isSuperAdmin: true,
          status: 'active',
        };
        next();
        return;
      }

      const membership = await TenantMembership.findOne({
        tenantId: tenant._id,
        userId: req.user._id,
      }).populate('roleId');

      if (!membership) {
        throw new ForbiddenError(
          `Access denied. You are not a member of store '${tenant.name}' (${tenant.slug}).`,
          { tenantId: tenant._id, tenantSlug: tenant.slug }
        );
      }

      if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
        throw new ForbiddenError(
          `Your membership in store '${tenant.name}' is ${membership.status}. Access is restricted.`,
          { membershipStatus: membership.status }
        );
      }

      if (!membership.roleId) {
        throw new ForbiddenError('No valid role assigned to your store membership.');
      }

      req.membership = {
        id: membership._id,
        role: membership.roleId.slug,
        roleName: membership.roleId.name,
        permissions: membership.roleId.permissions || [],
        status: membership.status,
        joinedAt: membership.joinedAt,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Resolve Legacy Tenant Middleware
 * Resolves tenant context from headers or query for legacy routes, falling back to aurelle.
 */
export const resolveLegacyTenant = async (req, _res, next) => {
  try {
    if (req.tenant) return next();

    let rawIdentifier =
      req.headers['x-tenant-id'] ||
      req.headers['x-store-slug'] ||
      req.query.tenantId ||
      req.query.storeSlug;

    let tenant = null;
    if (rawIdentifier) {
      const id = String(rawIdentifier).trim().toLowerCase();
      if (mongoose.Types.ObjectId.isValid(id)) {
        tenant = await Tenant.findById(id);
      } else if (isValidTenantSlug(id)) {
        tenant = await Tenant.findOne({
          $or: [
            { slug: id },
            ...(id === 'giva' ? [{ slug: 'giva-jewels' }] : []),
            ...(id === 'giva-jewels' ? [{ slug: 'giva' }] : []),
            { slug: `${id}-jewels` },
            { slug: buildSafeExactRegex(id) },
          ],
        });
      }
    }

    if (!tenant) {
      // Check if JWT payload carries tenantId or storeSlug
      if (req.admin?.tenantId && mongoose.Types.ObjectId.isValid(String(req.admin.tenantId))) {
        tenant = await Tenant.findById(req.admin.tenantId);
      } else if (req.admin?.storeSlug) {
        tenant = await Tenant.findOne({ slug: String(req.admin.storeSlug).toLowerCase().trim() });
      }
    }

    if (!tenant) {
      // Only resolve from membership if accessing an explicit administrative endpoint
      const isAdminRoute = req.originalUrl?.includes('/admin') || req.path?.includes('/admin') || req.headers['x-admin-request'];
      if (isAdminRoute) {
        const authUserId = req.user?._id || req.admin?.userId || req.admin?.id;
        if (authUserId && mongoose.Types.ObjectId.isValid(String(authUserId))) {
          const membership = await TenantMembership.findOne({
            userId: authUserId,
            status: 'active',
          }).populate('tenantId');
          if (membership?.tenantId && membership.tenantId.status !== 'archived') {
            tenant = membership.tenantId;
          }
        }
      }
    }

    // Default platform store is ALWAYS Aurelle
    if (!tenant) {
      tenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    }

    if (tenant) {
      req.tenant = tenant;
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Authorize Legacy Admin Tenant Middleware
 * Ensures an authenticated admin user genuinely belongs to the resolved tenant.
 * Prevents cross-tenant manipulation on legacy routes by strictly validating active membership.
 */
export const authorizeLegacyAdminTenant = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant store context required.',
      });
    }

    // Resolve user entity from req.user or req.admin
    let user = req.user;
    if (!user && req.admin) {
      const userId = req.admin.userId || req.admin.id;
      if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
        user = await User.findById(userId);
      }
      if (!user && req.admin.email) {
        user = await User.findOne({ email: String(req.admin.email).toLowerCase().trim() });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated administrative identity could not be verified.',
      });
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Access is restricted.`,
      });
    }

    // Platform Super Admin bypasses with universal access
    if (user.isSuperAdmin) {
      req.user = user;
      req.membership = {
        role: 'superadmin',
        roleName: 'Platform Super Admin',
        permissions: ['*'],
        isSuperAdmin: true,
        status: 'active',
      };
      return next();
    }

    // Verify active TenantMembership for the target tenant
    const membership = await TenantMembership.findOne({
      tenantId: req.tenant._id,
      userId: user._id,
    }).populate('roleId');

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You do not have an active membership for store '${req.tenant.name}'.`,
      });
    }

    if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Your membership for store '${req.tenant.name}' is ${membership.status}. Access is restricted.`,
      });
    }

    req.user = user;
    req.membership = {
      id: membership._id,
      role: membership.roleId?.slug,
      roleName: membership.roleId?.name,
      permissions: membership.roleId?.permissions || [],
      status: membership.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};
