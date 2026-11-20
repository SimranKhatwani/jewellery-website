/**
 * @file Subscription.js
 * @description Mongoose model managing active tenant subscriptions, lifecycle states,
 * billing renewal windows, trial periods, and cancellation schedules.
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Standard subscription status lifecycle enumeration
 */
export const SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

/**
 * Subscription Schema definition
 * Maps a Tenant to their currently active SubscriptionPlan and tracks billing windows.
 */
const SubscriptionSchema = new Schema(
  {
    // Associated tenant account
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      unique: true,
      index: true,
    },
    // Subscribed plan tier reference
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Plan ID is required'],
      index: true,
    },
    // Current subscription lifecycle status
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.TRIALING,
      index: true,
    },
    // Initial start date of the subscription agreement
    startDate: {
      type: Date,
      default: Date.now,
    },
    // Timestamp when the current billing interval opened
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    // Expiration date for the current billing interval
    currentPeriodEnd: {
      type: Date,
      required: [true, 'Current period end date is required'],
      index: true,
    },
    // Timestamp when trial began
    trialStart: {
      type: Date,
      default: Date.now,
    },
    // Timestamp when trial concludes
    trialEnd: {
      type: Date,
      default: null,
    },
    // Whether subscription is flagged for termination at the end of the current period
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    // Exact timestamp when cancellation was requested
    cancelledAt: {
      type: Date,
      default: null,
    },
    // Extended grace period cutoff before account is suspended
    gracePeriodEnd: {
      type: Date,
      default: null,
    },
    // Billing interval and automatic renewal configuration
    billingConfig: {
      billingInterval: {
        type: String,
        enum: ['monthly', 'yearly', 'lifetime'],
        default: 'monthly',
      },
      autoRenew: {
        type: Boolean,
        default: true,
      },
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
 * Compiled Subscription Mongoose model
 */
export const Subscription = mongoose.model('Subscription', SubscriptionSchema);

