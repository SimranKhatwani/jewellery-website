import { AppError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { checkFeatureEntitlement, checkUsageLimit, getOrCreateTenantSubscription } from '../services/subscription.service.js';
import { SUBSCRIPTION_STATUS } from '../models/Subscription.js';

/**
 * Middleware: Requires store to have an active or trialing subscription
 */
export const requireActiveSubscription = async (req, _res, next) => {
  try {
    if (!req.tenant) {
      throw new ForbiddenError('Tenant context required.');
    }

    // Platform Super Admin bypasses tenant subscription checks
    if (req.user?.isSuperAdmin) {
      next();
      return;
    }

    const subscription = await getOrCreateTenantSubscription(req.tenant._id);
    const validStatuses = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING];

    if (!validStatuses.includes(subscription.status)) {
      throw new AppError(
        `Store subscription is currently ${subscription.status}. Access is restricted until renewed.`,
        403,
        'SUBSCRIPTION_INACTIVE',
        { code: 'SUBSCRIPTION_INACTIVE', status: subscription.status }
      );
    }

    if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
      throw new AppError(
        'Store subscription billing cycle has expired. Please renew your plan.',
        403,
        'SUBSCRIPTION_EXPIRED',
        { code: 'SUBSCRIPTION_EXPIRED', expiresAt: subscription.currentPeriodEnd }
      );
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Requires a specific SaaS feature to be enabled in the store's subscription plan
 * @param {string} featureKey - e.g. 'inventory:advanced', 'staff:custom_roles', 'domain:custom'
 */
export const requirePlanFeature = (featureKey) => {
  return async (req, _res, next) => {
    try {
      if (!req.tenant) {
        throw new ForbiddenError('Tenant context required.');
      }

      // Super Admin bypass
      if (req.user?.isSuperAdmin) {
        next();
        return;
      }

      const entitlement = await checkFeatureEntitlement(req.tenant._id, featureKey);
      if (!entitlement.allowed) {
        throw new AppError(entitlement.reason, 403, entitlement.code, {
          code: entitlement.code,
          requiredFeature: featureKey,
          planName: entitlement.planName,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Enforces usage limit before performing an operation (e.g. staff creation)
 * @param {string} limitType - 'staff' | 'products' | 'storage'
 */
export const enforcePlanLimit = (limitType) => {
  return async (req, _res, next) => {
    try {
      if (!req.tenant) {
        throw new ForbiddenError('Tenant context required.');
      }

      if (req.user?.isSuperAdmin) {
        next();
        return;
      }

      const result = await checkUsageLimit(req.tenant._id, limitType);
      if (!result.allowed) {
        throw new AppError(result.reason, 403, result.code, {
          code: result.code,
          limit: result.limit,
          current: result.current,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
