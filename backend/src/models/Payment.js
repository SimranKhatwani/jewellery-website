import mongoose, { Schema } from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';

const PaymentSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for payment'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required for payment'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    provider: {
      type: String,
      enum: ['cod', 'card', 'upi', 'razorpay', 'stripe', 'manual'],
      required: [true, 'Payment provider is required'],
      default: 'cod',
    },
    providerOrderId: {
      type: String,
      default: null,
    },
    providerPaymentId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
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

PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', PaymentSchema);
