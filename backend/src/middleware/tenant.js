import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS } from '../config/constants.js';
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';

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
        const identifier = String(rawIdentifier).trim();
        if (mongoose.Types.ObjectId.isValid(identifier)) {
          tenant = await Tenant.findById(identifier);
        } else {
          tenant = await Tenant.findOne({ slug: identifier.toLowerCase() });
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
