/**
 * @file Admin.js
 * @description Mongoose model for store administrators and system operators.
 * Handles legacy administrator credentials, role management, and session token invalidation.
 */

import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Admin Schema definition
 */
const AdminSchema = new Schema(
  {
    // Unique administrator email address
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // Salted bcrypt password hash
    passwordHash: {
      type: String,
      required: true,
    },
    // Display name of administrator
    name: {
      type: String,
      default: 'Aurelle Admin',
      trim: true,
    },
    // Administrative privilege tier: 'admin' | 'superadmin'
    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin',
    },
    // Token revocation counter to invalidate stale JWTs
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // Timestamp of most recent administrator login
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

/**
 * Verifies candidate plaintext password against stored hash.
 * @param {string} candidatePassword - Plaintext password
 * @returns {Promise<boolean>} True if matching
 */
AdminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Compiled Admin Mongoose model
 */
export const Admin = mongoose.model('Admin', AdminSchema);

