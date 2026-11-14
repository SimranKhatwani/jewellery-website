import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Platform-Level Authorization Middleware
 * Enforces Platform Super Admin privileges
 */
export const requireSuperAdmin = (req, _res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required.');
  }

  if (!req.user.isSuperAdmin) {
    throw new ForbiddenError('Platform Super Admin privileges required to perform this action.');
  }

  next();
};

/**
 * Tenant-Level Permission Authorization Middleware
 * Enforces that the authenticated user's tenant membership possesses the required permission.
 *
 * @param {string|string[]} permissions - Required permission key or array of keys (ANY match)
 */
export const requireTenantPermission = (permissions) => {
  const requiredList = Array.isArray(permissions) ? permissions : [permissions];

  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!req.membership) {
      throw new ForbiddenError('Tenant membership context not resolved. Access denied.');
    }

    // Super Admin has universal permission
    if (req.user.isSuperAdmin || req.membership.isSuperAdmin) {
      next();
      return;
    }

    const userPermissions = req.membership.permissions || [];
    const hasWildcard = userPermissions.includes('*');
    const hasRequired = requiredList.some((perm) => userPermissions.includes(perm));

    if (!hasWildcard && !hasRequired) {
      throw new ForbiddenError(
        `Permission denied: Missing required permission [${requiredList.join(', ')}] in store '${req.tenant?.name || 'current'}'.`,
        { required: requiredList, granted: userPermissions }
      );
    }

    next();
  };
};

/**
 * Tenant-Level Role Authorization Middleware
 * Enforces that the user has a specific tenant role (e.g. 'store_admin')
 *
 * @param {string|string[]} roles - Allowed role slug or array of role slugs
 */
export const requireTenantRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!req.membership) {
      throw new ForbiddenError('Tenant membership context not resolved. Access denied.');
    }

    // Super Admin bypass
    if (req.user.isSuperAdmin || req.membership.isSuperAdmin) {
      next();
      return;
    }

    if (!allowedRoles.includes(req.membership.role)) {
      throw new ForbiddenError(
        `Role denied: Store role '${req.membership.role}' is not authorized. Requires: [${allowedRoles.join(', ')}].`,
        { allowedRoles, currentRole: req.membership.role }
      );
    }

    next();
  };
};

