/**
 * @file Payment.js
 * @description Mongoose model for customer order payments across multiple providers
 * (Cash on Delivery, Cards, UPI, Razorpay, Stripe, and Manual transfers).
 */

import mongoose, { Schema } from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';

/**
 * Payment Schema definition
 * Records financial transactions, payment gateway IDs, status, and currency for store orders.
 */
const PaymentSchema = new Schema(
  {
    // Associated store tenant
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for payment'],
      index: true,
    },
    // Associated customer order
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required for payment'],
      index: true,
    },
    // Optional reference to registered customer account (null for guest checkout)
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Gateway provider or payment method
    provider: {
      type: String,
      enum: ['cod', 'card', 'upi', 'razorpay', 'stripe', 'manual'],
      required: [true, 'Payment provider is required'],
      default: 'cod',
    },
    // External order ID assigned by payment gateway
    providerOrderId: {
      type: String,
      default: null,
    },
    // External transaction/payment ID assigned by gateway
    providerPaymentId: {
      type: String,
      default: null,
    },
    // Total charged amount
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: 0,
    },
    // Transaction currency code
    currency: {
      type: String,
      default: 'INR',
    },
    // Payment settlement status: 'pending' | 'completed' | 'failed' | 'refunded'
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    // Raw webhook payload and supplementary metadata from provider
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
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

// Compound indexing for rapid lookups and tenant reporting
PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, createdAt: -1 });

/**
 * Compiled Payment Mongoose model
 */
export const Payment = mongoose.model('Payment', PaymentSchema);
