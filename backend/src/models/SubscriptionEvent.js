/**
 * @file SubscriptionEvent.js
 * @description Mongoose model for immutable event stream logging of SaaS subscription lifecycle changes,
 * plan upgrades/downgrades, invoice renewals, payment completions, and terminations.
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Enumeration of recognized subscription lifecycle event types
 */
export const SUBSCRIPTION_EVENTS = {
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  PLAN_CHANGED: 'PLAN_CHANGED',
  PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_SUSPENDED: 'SUBSCRIPTION_SUSPENDED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
};

/**
 * Subscription Event Schema definition
 */
const SubscriptionEventSchema = new Schema(
  {
    // Tenant who experienced the lifecycle event
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    // Reference to affected subscription
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: [true, 'Subscription ID is required'],
      index: true,
    },
    // Specific event verb
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: Object.values(SUBSCRIPTION_EVENTS),
      index: true,
    },
    // Previous plan if event is a tier migration
    fromPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null,
    },
    // Destination plan if event is a tier migration
    toPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null,
    },
    // Contextual payload (invoice IDs, gateway errors, user agent)
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Timestamp when event occurred
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Immutable event stream; no modifications allowed
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

SubscriptionEventSchema.index({ createdAt: -1 });

/**
 * Compiled SubscriptionEvent Mongoose model
 */
export const SubscriptionEvent = mongoose.model('SubscriptionEvent', SubscriptionEventSchema);

