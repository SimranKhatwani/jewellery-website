/**
 * @file User.js
 * @description Mongoose model for platform users, including tenant owners, staff members,
 * and platform SuperAdmins. Handles password hashing comparisons and session token versioning.
 */

import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_STATUS } from '../config/constants.js';

/**
 * User Schema definition
 */
const UserSchema = new Schema(
  {
    // Full name of user
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    // Unique login email address
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    // Bcrypt salted password hash
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    // Optional field retained for migration/profile update operations
    currentPassword: {
      type: String,
      default: '',
    },
    // Indian standard 10-digit mobile contact number
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
      match: [/^([6-9]\d{9})?$/, 'Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9'],
    },
    // High-privilege flag granting platform-wide superadmin authority
    isSuperAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Account active or suspended status
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    // Last authentication timestamp
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Arbitrary key-value metadata store
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Incrementing counter used to invalidate all active JWT sessions on logout/password reset
    tokenVersion: {
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
        delete ret.passwordHash;
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

/**
 * Validates a plain text candidate password against the stored bcrypt hash.
 * @param {string} candidatePassword - Plaintext password to test
 * @returns {Promise<boolean>} True if password matches hash
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Compiled User Mongoose model
 */
export const User = mongoose.model('User', UserSchema);

