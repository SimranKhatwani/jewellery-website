/**
 * @file SubscriptionPlan.js
 * @description Mongoose model defining the tiers, pricing, features, and quotas
 * for SaaS subscription plans (e.g. Starter, Growth, Enterprise).
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Subscription Plan Schema
 * Defines pricing intervals, resource limits, and feature availability for tenant stores.
 */
const SubscriptionPlanSchema = new Schema(
  {
    // Human-readable plan name (e.g., "Growth Tier")
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [50, 'Plan name cannot exceed 50 characters'],
    },
    // URL-safe identifier for the plan
    slug: {
      type: String,
      required: [true, 'Plan slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    // Marketing description of plan tier
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    // Recurring or one-time cost in specified currency
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
    },
    // Currency denomination (default: INR)
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    // Recurring frequency: 'monthly' | 'yearly' | 'lifetime'
    billingInterval: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
      index: true,
    },
    // Array of feature bullet points shown on pricing page
    features: {
      type: [String],
      default: [],
    },
    // Resource ceilings enforced by middleware and controllers
    limits: {
      maxProducts: {
        type: Number,
        default: 50, // -1 indicates unlimited
      },
      maxStaff: {
        type: Number,
        default: 2, // -1 indicates unlimited
      },
      maxStorageMB: {
        type: Number,
        default: 500, // -1 indicates unlimited
      },
      customDomainAllowed: {
        type: Boolean,
        default: false,
      },
    },
    // Free trial window duration in days
    trialDays: {
      type: Number,
      default: 14,
      min: 0,
    },
    // Toggle whether this plan can currently be subscribed to
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Visibility flag on public pricing cards
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Sort ordering on checkout and pricing displays
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
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
 * Compiled SubscriptionPlan Mongoose model
 */
export const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

