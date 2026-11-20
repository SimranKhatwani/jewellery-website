/**
 * @file AuditLog.js
 * @description Mongoose model for immutable security audit logging across tenant actions,
 * permission changes, authentication events, platform administration, and sensitive resources.
 */

import mongoose, { Schema } from 'mongoose';

/**
 * Audit Log Schema definition
 * Captures user identity, IP address, user agent, target resource, and delta payloads.
 */
const AuditLogSchema = new Schema(
  {
    // Associated tenant store (null if platform-level SuperAdmin action)
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    // User account who performed the audited operation
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Audited event verb (e.g., 'TENANT_CREATE', 'PRODUCT_UPDATE', 'STAFF_ROLE_CHANGE')
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true,
    },
    // Resource entity affected (e.g., 'Tenant', 'Product', 'Order', 'Role')
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      index: true,
    },
    // Identifier string for the target document/resource
    resourceId: {
      type: String,
      default: null,
      index: true,
    },
    // Outcome status of the executed command: 'SUCCESS' | 'FAILURE'
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
      index: true,
    },
    // Granular change delta, query parameters, or error descriptions
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Originating IP address of request
    ipAddress: {
      type: String,
      default: '',
    },
    // Client browser / device user agent string
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    // Audit logs are append-only; updatedAt is disabled to guarantee log immutability
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

// High-performance index for reverse chronological audit streams
AuditLogSchema.index({ createdAt: -1 });

/**
 * Compiled AuditLog Mongoose model
 */
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

