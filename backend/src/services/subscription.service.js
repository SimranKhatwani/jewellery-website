import mongoose from 'mongoose';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { PlanFeature } from '../models/PlanFeature.js';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { SubscriptionEvent, SUBSCRIPTION_EVENTS } from '../models/SubscriptionEvent.js';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { DEFAULT_SUBSCRIPTION_PLANS, AUDIT_ACTIONS } from '../config/constants.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';

// =============================================================================
// Super Admin Plan Management
// =============================================================================

export const createPlan = async (planData, req = null) => {
  const normalizedSlug = planData.slug.toLowerCase().trim();

  const existingPlan = await SubscriptionPlan.findOne({ slug: normalizedSlug });
  if (existingPlan) {
    throw new ConflictError(`Subscription plan with slug '${normalizedSlug}' already exists.`);
  }

  // Validate submitted features against PlanFeature registry if any exists
  if (planData.features && planData.features.length > 0) {
    const registeredFeatures = (await PlanFeature.find()).map((f) => f.key);
    if (registeredFeatures.length > 0) {
      const invalid = planData.features.filter((f) => !registeredFeatures.includes(f));
      if (invalid.length > 0) {
        throw new BadRequestError(`Invalid plan features specified: ${invalid.join(', ')}`);
      }
    }
  }

  const plan = await SubscriptionPlan.create({
    name: planData.name.trim(),
    slug: normalizedSlug,
    description: planData.description ? planData.description.trim() : '',
    price: Number(planData.price),
    currency: planData.currency ? planData.currency.toUpperCase().trim() : 'INR',
    billingInterval: planData.billingInterval || 'monthly',
    features: planData.features || [],
    limits: {
      maxProducts: planData.limits?.maxProducts ?? 50,
      maxStaff: planData.limits?.maxStaff ?? 2,
      maxStorageMB: planData.limits?.maxStorageMB ?? 500,
      customDomainAllowed: Boolean(planData.limits?.customDomainAllowed),
    },
    trialDays: planData.trialDays !== undefined ? Number(planData.trialDays) : 14,
    isActive: planData.isActive !== undefined ? Boolean(planData.isActive) : true,
    isPublic: planData.isPublic !== undefined ? Boolean(planData.isPublic) : true,
    displayOrder: planData.displayOrder ? Number(planData.displayOrder) : 0,
  });

  await logAudit({
    userId: req?.user?._id,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CREATE,
    resource: 'SubscriptionPlan',
    resourceId: plan._id,
    details: { name: plan.name, slug: plan.slug, price: plan.price },
    req,
  });

  return plan;
};

export const listAllPlans = async ({ includeInactive = false } = {}) => {
  const query = includeInactive ? {} : { isActive: true };
  return SubscriptionPlan.find(query).sort({ displayOrder: 1, price: 1 });
};

export const getPlanById = async (planId) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new NotFoundError('Subscription plan not found.');
  }
  return plan;
};

export const updatePlan = async (planId, updateData, req = null) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new NotFoundError('Subscription plan not found.');
  }

  if (updateData.name) plan.name = updateData.name.trim();
  if (updateData.description !== undefined) plan.description = updateData.description.trim();
  if (updateData.price !== undefined) plan.price = Number(updateData.price);
  if (updateData.billingInterval) plan.billingInterval = updateData.billingInterval;
  if (updateData.features) plan.features = updateData.features;
  if (updateData.limits) plan.limits = { ...plan.limits, ...updateData.limits };
  if (updateData.trialDays !== undefined) plan.trialDays = Number(updateData.trialDays);
  if (updateData.isActive !== undefined) plan.isActive = Boolean(updateData.isActive);
  if (updateData.isPublic !== undefined) plan.isPublic = Boolean(updateData.isPublic);
  if (updateData.displayOrder !== undefined) plan.displayOrder = Number(updateData.displayOrder);

  await plan.save();

  await logAudit({
    userId: req?.user?._id,
    action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATE,
    resource: 'SubscriptionPlan',
    resourceId: plan._id,
    details: updateData,
    req,
  });

  return plan;
};

export const deletePlan = async (planId, req = null) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new NotFoundError('Subscription plan not found.');
  }

  // Prevent deletion if any subscriptions (active, trialing, past_due) are currently linked
  const activeSubsCount = await Subscription.countDocuments({
    planId: plan._id,
    status: { $in: [SUBSCRIPTION_STATUS.TRIALING, SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.PAST_DUE] },
  });

  if (activeSubsCount > 0) {
    throw new BadRequestError(
      `Cannot delete plan '${plan.name}': It has ${activeSubsCount} active subscriber(s). Deactivate or archive it instead.`
    );
  }

  await SubscriptionPlan.deleteOne({ _id: planId });

  await logAudit({
    userId: req?.user?._id,
    action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATE,
    resource: 'SubscriptionPlan',
    resourceId: planId,
    details: { message: `Plan '${plan.name}' deleted.` },
    req,
  });

  return { message: `Plan '${plan.name}' deleted successfully.` };
};

// =============================================================================
// Tenant Subscription Management & Backward-Compatible Provisioning
// =============================================================================

export const getOrCreateTenantSubscription = async (tenantId) => {
  let subscription = await Subscription.findOne({ tenantId }).populate('planId');

  if (!subscription) {
    // Backward compatibility: If no Subscription record exists for an existing tenant, lazily provision Starter
    let defaultPlan = await SubscriptionPlan.findOne({ slug: 'starter' });
    if (!defaultPlan) {
      defaultPlan = await SubscriptionPlan.findOne({ price: 0 }) || await SubscriptionPlan.findOne();
    }

    if (!defaultPlan) {
      // Seed starter plan on the fly if collection is empty
      defaultPlan = await SubscriptionPlan.create(DEFAULT_SUBSCRIPTION_PLANS[0]);
    }

    const trialDays = defaultPlan.trialDays || 14;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + trialDays * 24 * 3600 * 1000);

    subscription = await Subscription.create({
      tenantId,
      planId: defaultPlan._id,
      status: SUBSCRIPTION_STATUS.TRIALING,
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: now,
      trialEnd: periodEnd,
      billingConfig: { billingInterval: 'monthly', autoRenew: true },
    });

    subscription = await Subscription.findById(subscription._id).populate('planId');

    await SubscriptionEvent.create({
      tenantId,
      subscriptionId: subscription._id,
      eventType: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED,
      toPlanId: defaultPlan._id,
      metadata: { note: 'Auto-provisioned default trial subscription' },
    });
  }

  return subscription;
};

export const getTenantSubscriptionDetails = async (tenantId) => {
  const subscription = await getOrCreateTenantSubscription(tenantId);
  const usage = await getTenantUsageMetrics(tenantId, subscription.planId);

  return {
    subscription,
    plan: subscription.planId,
    usage,
  };
};

export const changeTenantPlan = async ({ tenantId, newPlanId, userId, req = null }) => {
  const targetPlan = await SubscriptionPlan.findById(newPlanId);
  if (!targetPlan || !targetPlan.isActive) {
    throw new BadRequestError('The selected subscription plan is invalid or currently unavailable.');
  }

  const currentSub = await getOrCreateTenantSubscription(tenantId);
  const oldPlanId = currentSub.planId?._id || currentSub.planId;

  // Validate: cannot re-subscribe to the exact same plan
  if (oldPlanId.toString() === newPlanId.toString()) {
    throw new BadRequestError('Your store is already subscribed to this plan.');
  }

  // Check current usage against target plan limits (prevent silent corruption on downgrade)
  const currentUsage = await getTenantUsageMetrics(tenantId, targetPlan);
  if (targetPlan.limits.maxStaff !== -1 && currentUsage.currentStaff > targetPlan.limits.maxStaff) {
    throw new BadRequestError(
      `Cannot change to plan '${targetPlan.name}': Store has ${currentUsage.currentStaff} staff member(s), but plan limit is ${targetPlan.limits.maxStaff}. Reassign or remove excess staff first.`
    );
  }

  const previousPlanId = currentSub.planId._id;
  currentSub.planId = targetPlan._id;
  currentSub.status = targetPlan.price === 0 ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.ACTIVE;
  currentSub.currentPeriodStart = new Date();
  currentSub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  currentSub.cancelAtPeriodEnd = false;
  await currentSub.save();

  // Sync Tenant model's plan slug
  await Tenant.findByIdAndUpdate(tenantId, { plan: targetPlan.slug });

  // Record subscription event
  await SubscriptionEvent.create({
    tenantId,
    subscriptionId: currentSub._id,
    eventType: SUBSCRIPTION_EVENTS.PLAN_CHANGED,
    fromPlanId: previousPlanId,
    toPlanId: targetPlan._id,
    metadata: { changedBy: userId, newPlanSlug: targetPlan.slug },
  });

  await logAudit({
    tenantId,
    userId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATE,
    resource: 'Subscription',
    resourceId: currentSub._id,
    details: { fromPlanId: previousPlanId, toPlanId: targetPlan._id, newPlan: targetPlan.name },
    req,
  });

  return {
    subscription: currentSub,
    newPlan: targetPlan,
  };
};

export const cancelTenantSubscription = async ({ tenantId, userId, req = null }) => {
  const subscription = await getOrCreateTenantSubscription(tenantId);

  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
    throw new BadRequestError('Subscription is already cancelled.');
  }

  subscription.cancelAtPeriodEnd = true;
  subscription.cancelledAt = new Date();
  await subscription.save();

  await SubscriptionEvent.create({
    tenantId,
    subscriptionId: subscription._id,
    eventType: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED,
    toPlanId: subscription.planId._id || subscription.planId,
    metadata: { cancelledBy: userId, cancellationEffectiveDate: subscription.currentPeriodEnd },
  });

  await logAudit({
    tenantId,
    userId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CANCEL,
    resource: 'Subscription',
    resourceId: subscription._id,
    details: { effectiveDate: subscription.currentPeriodEnd },
    req,
  });

  return {
    message: 'Subscription marked for cancellation at the end of the current billing period.',
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
};

// =============================================================================
// Usage Metrics & Entitlement Checking
// =============================================================================

export const getTenantUsageMetrics = async (tenantId, plan = null) => {
  // Count actual active staff members
  const currentStaff = await TenantMembership.countDocuments({
    tenantId,
    status: 'active',
  });

  // Placeholder for product count (connected to Product model in Phase 3)
  const currentProducts = 0;
  const currentStorageMB = 0;

  return {
    currentStaff,
    currentProducts,
    currentStorageMB,
    limits: plan?.limits || {},
  };
};

export const checkFeatureEntitlement = async (tenantId, featureKey) => {
  const subscription = await getOrCreateTenantSubscription(tenantId);

  // Check subscription operational status
  const validStatuses = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING];
  if (!validStatuses.includes(subscription.status)) {
    return {
      allowed: false,
      reason: `Subscription is ${subscription.status}. Active subscription required.`,
      code: 'SUBSCRIPTION_INACTIVE',
    };
  }

  // Check if period expired
  if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
    return {
      allowed: false,
      reason: 'Subscription period has expired. Please renew.',
      code: 'SUBSCRIPTION_EXPIRED',
    };
  }

  const plan = subscription.planId;
  const planFeatures = plan?.features || [];

  if (!planFeatures.includes(featureKey)) {
    return {
      allowed: false,
      reason: `Feature '${featureKey}' is not included in the store's current subscription plan ('${plan?.name || 'Starter'}').`,
      code: 'FEATURE_NOT_IN_PLAN',
      requiredFeature: featureKey,
      planName: plan?.name,
    };
  }

  return { allowed: true, plan };
};

export const checkUsageLimit = async (tenantId, limitType, increment = 1) => {
  const subscription = await getOrCreateTenantSubscription(tenantId);
  const plan = subscription.planId;

  if (limitType === 'staff') {
    const maxStaff = plan.limits?.maxStaff ?? 2;
    if (maxStaff === -1) return { allowed: true }; // Unlimited

    const currentStaff = await TenantMembership.countDocuments({ tenantId, status: 'active' });
    if (currentStaff + increment > maxStaff) {
      return {
        allowed: false,
        reason: `Store has reached its maximum staff limit of ${maxStaff} for plan '${plan.name}'. Upgrade plan to invite more staff.`,
        current: currentStaff,
        limit: maxStaff,
        code: 'STAFF_LIMIT_EXCEEDED',
      };
    }
  }

  return { allowed: true };
};

