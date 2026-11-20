/**
 * @file Invitation.js
 * @description Mongoose model managing secure staff member invitations to tenant workspaces,
 * including cryptographic token hashes, expiration deadlines, and role assignments.
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Invitation Schema definition
 * Manages email invitations sent to prospective staff members to join a store tenant.
 */
const InvitationSchema = new Schema(
  {
    // Tenant store the invitee is being welcomed to
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    // Invitee destination email address
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    // Role to be granted upon invitation acceptance
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
    },
    // One-way cryptographic hash of the invitation acceptance token
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true,
    },
    // Staff/Admin user who created and dispatched this invitation
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter user ID is required'],
    },
    // Expiration timestamp after which token cannot be redeemed
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    // Lifecycle state: 'pending' | 'accepted' | 'expired' | 'revoked'
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    // Timestamp when invitation was accepted
    acceptedAt: {
      type: Date,
      default: null,
    },
    // User account created or associated when accepted
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.tokenHash;
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

/**
 * Compiled Invitation Mongoose model
 */
export const Invitation = mongoose.model('Invitation', InvitationSchema);

