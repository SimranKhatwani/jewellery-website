/**
 * @file PlanFeature.js
 * @description Mongoose model cataloging modular platform capabilities and feature flags
 * (e.g. custom domain, advanced analytics, staff accounts) attached to subscription plans.
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Plan Feature Schema definition
 */
const PlanFeatureSchema = new Schema(
  {
    // Programmatic identifier key (e.g. 'custom_domain', 'bulk_export')
    key: {
      type: String,
      required: [true, 'Feature key is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Human-friendly display title
    name: {
      type: String,
      required: [true, 'Feature name is required'],
      trim: true,
    },
    // Detailed explanation of feature benefits
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Functional grouping category for plan comparison tables
    category: {
      type: String,
      enum: ['catalog', 'inventory', 'analytics', 'staff', 'marketing', 'domain', 'support'],
      default: 'catalog',
      index: true,
    },
    // Feature mechanism: boolean (enabled/disabled) or limit (numerical threshold)
    type: {
      type: String,
      enum: ['boolean', 'limit'],
      default: 'boolean',
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
 * Compiled PlanFeature Mongoose model
 */
export const PlanFeature = mongoose.model('PlanFeature', PlanFeatureSchema);

