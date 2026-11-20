/**
 * @file Permission.js
 * @description Mongoose model for granular Role-Based Access Control (RBAC) permissions.
 * Dictates specific action authorizations across modules (e.g. products:create, orders:refund).
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Permission Schema definition
 */
const PermissionSchema = new Schema(
  {
    // Unique authorization key formatted as 'module:action' (e.g., 'orders:read')
    key: {
      type: String,
      required: [true, 'Permission key is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Human-readable title
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      trim: true,
    },
    // Application module (e.g. 'products', 'orders', 'analytics', 'settings')
    module: {
      type: String,
      required: [true, 'Module is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    // Detailed explanation of what privilege this grants
    description: {
      type: String,
      default: '',
      trim: true,
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
 * Compiled Permission Mongoose model
 */
export const Permission = mongoose.model('Permission', PermissionSchema);

