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
    const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Safely disable webhook processing if no provider secret is configured
    if (!razorpaySecret && !stripeSecret) {
      return res.status(403).json({
        success: false,
        message: 'Webhook processing is disabled: No payment provider or webhook signing secret is configured.',
      });
    }

    const razorpaySig = req.headers['x-razorpay-signature'];
    const stripeSig = req.headers['stripe-signature'];
    const signature = razorpaySig || stripeSig;

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment webhook signature header.',
      });
    }

    const secret = razorpaySig ? razorpaySecret : stripeSecret;
    if (!secret) {
      return res.status(400).json({
        success: false,
        message: 'Webhook signing secret not configured for detected payment provider.',
      });
    }

    const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const isValid = paymentService.verifyWebhookSignature({
      rawBody: rawPayload,
      signature: String(signature).trim(),
      secret,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or tampered payment webhook signature.',
      });
    }

    const { providerPaymentId, providerOrderId, tenantId, subscriptionId, amount, currency } = req.body;

    if (!providerPaymentId || !tenantId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete webhook payment payload: providerPaymentId, tenantId, and subscriptionId are required.',
      });
    }

    const result = await paymentService.processPaymentSuccess({
      tenantId,
      subscriptionId,
      providerPaymentId,
      providerOrderId,
      amount: Number(amount),
      currency: currency || 'INR',
      paymentProvider: razorpaySig ? 'razorpay' : stripeSig ? 'stripe' : req.body.paymentProvider || 'manual',
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

