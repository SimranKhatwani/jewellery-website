import mongoose, { Schema } from 'mongoose';

const CartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required in cart item'],
    },
    variantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required in cart item'],
      trim: true,
    },
    selectedOptions: {
      type: Map,
      of: String,
      default: {},
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const AppliedCouponSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
    },
    discountValue: {
      type: Number,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for cart'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    guestSessionId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    items: [CartItemSchema],
    appliedCoupon: {
      type: AppliedCouponSchema,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
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

// Compound indexes for tenant-isolated cart lookups
CartSchema.index({ tenantId: 1, userId: 1 });
CartSchema.index({ tenantId: 1, guestSessionId: 1 });

export const Cart = mongoose.model('Cart', CartSchema);
