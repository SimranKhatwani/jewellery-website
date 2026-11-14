import * as subscriptionService from '../services/subscription.service.js';
import * as paymentService from '../services/payment.service.js';
import { sendSuccess } from '../utils/response.js';

export const getSubscription = async (req, res, next) => {
  try {
    const details = await subscriptionService.getTenantSubscriptionDetails(req.tenant._id);
    return sendSuccess(res, details, 'Tenant subscription details retrieved.');
  } catch (error) {
    next(error);
  }
};

export const listAvailablePlans = async (_req, res, next) => {
  try {
    const plans = await subscriptionService.listAllPlans({ includeInactive: false });
    return sendSuccess(res, plans, 'Available subscription plans retrieved.');
  } catch (error) {
    next(error);
  }
};

export const checkout = async (req, res, next) => {
  try {
    const { planId, billingInterval } = req.body;
    const plan = await subscriptionService.getPlanById(planId);
    const subscription = await subscriptionService.getOrCreateTenantSubscription(req.tenant._id);

    const session = await paymentService.createCheckoutSession({
      tenantId: req.tenant._id,
      subscription,
      plan,
      billingInterval: billingInterval || 'monthly',
    });

    return sendSuccess(res, session, 'Checkout session initiated.', 201);
  } catch (error) {
    next(error);
  }
};

export const changePlan = async (req, res, next) => {
  try {
    const result = await subscriptionService.changeTenantPlan({
      tenantId: req.tenant._id,
      newPlanId: req.body.planId,
      userId: req.user._id,
      req,
    });
    return sendSuccess(res, result, 'Subscription plan changed successfully.');
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const result = await subscriptionService.cancelTenantSubscription({
      tenantId: req.tenant._id,
      userId: req.user._id,
      req,
    });
    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const { providerPaymentId, providerOrderId, tenantId, subscriptionId, amount, currency } = req.body;

    const result = await paymentService.processPaymentSuccess({
      tenantId,
      subscriptionId,
      providerPaymentId,
      providerOrderId,
      amount: Number(amount),
      currency: currency || 'INR',
      paymentProvider: req.body.paymentProvider || 'manual',
      metadata: req.body.metadata || {},
    });

    return sendSuccess(
      res,
      result,
      result.alreadyProcessed ? 'Webhook already processed (idempotent).' : 'Payment recorded and subscription updated.'
    );
  } catch (error) {
    next(error);
  }
};

