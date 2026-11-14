import mongoose, { Schema } from 'mongoose';
import { NOTIFICATION_TYPES, RECIPIENT_TYPES } from '../config/constants.js';

const NotificationSchema = new Schema(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient User ID is required'],
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    recipientType: {
      type: String,
      enum: Object.values(RECIPIENT_TYPES),
      required: [true, 'Recipient type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: 1000,
    },
    notificationType: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: [true, 'Notification type is required'],
      index: true,
    },
    relatedEntityType: {
      type: String,
      default: 'Order',
      trim: true,
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    eventKey: {
      type: String,
      default: undefined,
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

// Compound indexes for high-speed recipient listing and unread count aggregation
NotificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, recipientType: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, recipientUserId: 1, isRead: 1 });
NotificationSchema.index(
  { eventKey: 1 },
  { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } }
);

export const Notification = mongoose.model('Notification', NotificationSchema);
