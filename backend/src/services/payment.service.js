import crypto from 'crypto';
import { SubscriptionPayment, PAYMENT_STATUS } from '../models/SubscriptionPayment.js';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { SubscriptionEvent, SUBSCRIPTION_EVENTS } from '../models/SubscriptionEvent.js';
import { Tenant } from '../models/Tenant.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const isPaymentConfigured = () => {
  return Boolean(
    (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) ||
    process.env.STRIPE_SECRET_KEY
  );
};

export const getPaymentProviderName = () => {
  if (process.env.RAZORPAY_KEY_ID) return 'razorpay';
  if (process.env.STRIPE_SECRET_KEY) return 'stripe';
  return 'none';
};

export const createCheckoutSession = async ({ tenantId, subscription, plan, billingInterval = 'monthly' }) => {
  const provider = getPaymentProviderName();
  const amount = plan.price;

  if (amount === 0) {
    // Free or trial plan: No payment gateway required
    return {
      requiresPayment: false,
      amount: 0,
      currency: plan.currency,
      provider: 'free',
      checkoutUrl: null,
      message: 'Plan is free/trial; no payment gateway required.',
    };
  }

  if (!isPaymentConfigured()) {
    console.warn(
      '[PaymentService] Notice: No production payment gateway credentials configured (RAZORPAY_KEY_ID, STRIPE_SECRET_KEY). Checkout operating in unconfigured interface mode.'
    );

    // Return a provider-agnostic pending payment record
    const mockOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payment = await SubscriptionPayment.create({
      tenantId,
      subscriptionId: subscription._id,
      amount,
      currency: plan.currency,
      paymentProvider: 'manual',
      providerOrderId: mockOrderId,
      status: PAYMENT_STATUS.PENDING,
      metadata: { billingInterval, planSlug: plan.slug },
    });

    return {
      requiresPayment: true,
      amount,
      currency: plan.currency,
      provider: 'manual',
      providerOrderId: mockOrderId,
      paymentId: payment._id,
      configured: false,
      message: 'Payment gateway not configured in environment. Manual or mock checkout reference created.',
    };
  }

  // Hook for live Razorpay / Stripe checkout session generation
  return {
    requiresPayment: true,
    amount,
    currency: plan.currency,
    provider,
    configured: true,
  };
};

export const verifyWebhookSignature = ({ rawBody, signature, secret }) => {
  if (!signature || !secret || !rawBody) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
};

export const processPaymentSuccess = async ({
  tenantId,
  subscriptionId,
  providerPaymentId,
  providerOrderId = null,
  amount,
  currency = 'INR',
  paymentProvider = 'manual',
  metadata = {},
}) => {
  // Idempotent processing: prevent duplicate renewals or charges
  const existingPayment = await SubscriptionPayment.findOne({
    providerPaymentId,
    status: PAYMENT_STATUS.SUCCEEDED,
  });

  if (existingPayment) {
    console.log(`[PaymentService] Idempotency: Payment ${providerPaymentId} has already been processed.`);
    return { alreadyProcessed: true, payment: existingPayment };
  }

  // Record payment
  const payment = await SubscriptionPayment.findOneAndUpdate(
    { providerOrderId },
    {
      $set: {
        tenantId,
        subscriptionId,
        amount,
        currency,
        paymentProvider,
        providerPaymentId,
        status: PAYMENT_STATUS.SUCCEEDED,
        paidAt: new Date(),
        metadata,
      },
    },
    { upsert: true, new: true }
  );

  // Extend or activate subscription
  const subscription = await Subscription.findById(subscriptionId).populate('planId');
  if (subscription) {
    const isYearly = subscription.billingConfig?.billingInterval === 'yearly';
    const periodDays = isYearly ? 365 : 30;

    subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 3600 * 1000);
    subscription.gracePeriodEnd = null;
    await subscription.save();

    // Sync Tenant plan slug
    if (subscription.planId?.slug) {
      await Tenant.findByIdAndUpdate(tenantId, { plan: subscription.planId.slug });
    }

    // Log subscription event
    await SubscriptionEvent.create({
      tenantId,
      subscriptionId,
      eventType: SUBSCRIPTION_EVENTS.PAYMENT_SUCCEEDED,
      toPlanId: subscription.planId._id,
      metadata: { amount, currency, providerPaymentId },
    });
  }

  return { alreadyProcessed: false, payment, subscription };
};

