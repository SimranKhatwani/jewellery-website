import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS } from '../config/constants.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Tenant Resolution & Access Isolation Middleware
 * Resolves tenant from headers, route parameters, or query string.
 * Validates store status and enforces strict tenant membership isolation.
 *
 * @param {Object} options
 * @param {boolean} [options.requireMembership=true] - Whether to enforce active membership check for req.user
 */
export const resolveTenant = (options = { requireMembership: true }) => {
  return async (req, _res, next) => {
    try {
      const rawIdentifier =
        req.headers['x-tenant-id'] ||
        req.headers['x-store-slug'] ||
        req.params.tenantId ||
        req.params.storeSlug ||
        req.query.tenantId;

      if (!rawIdentifier) {
        throw new BadRequestError('Tenant context required. Provide X-Tenant-ID header or route parameter.');
      }

      const identifier = String(rawIdentifier).trim();
      let tenant;

      if (mongoose.Types.ObjectId.isValid(identifier)) {
        tenant = await Tenant.findById(identifier);
      } else {
        tenant = await Tenant.findOne({ slug: identifier.toLowerCase() });
      }

      if (!tenant) {
        throw new NotFoundError(`Store '${identifier}' not found.`);
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

      // If user is authenticated, verify their membership in this specific tenant
      if (req.user) {
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
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

