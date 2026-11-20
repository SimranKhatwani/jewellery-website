/**
 * @file SubscriptionPayment.js
 * @description Mongoose model for SaaS billing invoice payments paid by tenants to the platform.
 * Supports manual invoicing, Razorpay, Stripe, and Mock payment gateways.
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Subscription payment processing states
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

/**
 * Subscription Payment Schema definition
 * Tracks SaaS platform subscription charges, payment receipts, and gateway transaction IDs.
 */
const SubscriptionPaymentSchema = new Schema(
  {
    // Tenant who is billed for the platform plan
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    // Reference to parent subscription document
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: [true, 'Subscription ID is required'],
      index: true,
    },
    // Monetary amount billed
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be non-negative'],
    },
    // Billing currency
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    // Gateway provider handling transaction
    paymentProvider: {
      type: String,
      default: 'manual',
      enum: ['manual', 'razorpay', 'stripe', 'mock'],
      index: true,
    },
    // External payment ID from gateway
    providerPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    // External order ID from gateway
    providerOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    // Transaction outcome status
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    // Timestamp when payment was verified and marked paid
    paidAt: {
      type: Date,
      default: null,
    },
    // Failure reason or gateway error code if unsuccessful
    failureReason: {
      type: String,
      default: '',
    },
    // Raw gateway webhook responses and extra audit data
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

/**
 * Compiled SubscriptionPayment Mongoose model
 */
export const SubscriptionPayment = mongoose.model('SubscriptionPayment', SubscriptionPaymentSchema);

