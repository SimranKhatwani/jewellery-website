import mongoose, { Schema } from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';

const OrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
    },
    slug: {
      type: String,
      default: '',
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU snapshot is required'],
      trim: true,
    },
    primaryImage: {
      type: String,
      default: '',
    },
    variantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    variantName: {
      type: String,
      default: '',
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
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price snapshot is required'],
      min: 0,
    },
    itemSubtotal: {
      type: Number,
      required: [true, 'Item subtotal is required'],
      min: 0,
    },
  },
  { _id: true }
);

const AddressSnapshotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, default: '', trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    addressType: { type: String, default: 'shipping' },
  },
  { _id: false }
);

const PricingSnapshotSchema = new Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    coupon: {
      code: { type: String, default: null },
      discountType: { type: String, default: null },
      discountValue: { type: Number, default: null },
      discountAmount: { type: Number, default: 0 },
    },
    taxRate: { type: String, default: '0%' },
    taxAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: String, default: 'Complimentary Insured Delivery' },
    shippingAmount: { type: Number, default: 0, min: 0 },
    totalPayable: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
  },
  { _id: false }
);

const CancellationSchema = new Schema(
  {
    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      role: { type: String, default: null }, // 'customer' or 'store_admin'
    },
    reason: { type: String, default: '', trim: true },
    inventoryRestored: { type: Boolean, default: false },
    couponRestored: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for order'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerInfo: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, default: '', trim: true },
      isGuest: { type: Boolean, default: false },
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      validate: [(val) => val.length > 0, 'Order must contain at least one item'],
    },
    shippingAddress: {
      type: AddressSnapshotSchema,
      required: [true, 'Shipping address snapshot is required'],
    },
    billingAddress: {
      type: AddressSnapshotSchema,
      default: null,
    },
    pricing: {
      type: PricingSnapshotSchema,
      required: [true, 'Pricing breakdown snapshot is required'],
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: [true, 'Payment method is required'],
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    cancellation: {
      type: CancellationSchema,
      default: () => ({}),
    },
    idempotencyKey: {
      type: String,
      default: undefined,
    },
    notes: {
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

// Tenant-scoped compound indexes
OrderSchema.index({ tenantId: 1, orderNumber: 1 });
OrderSchema.index({ tenantId: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, 'cancellation.isCancelled': 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, orderStatus: 1 });
OrderSchema.index({ tenantId: 1, paymentMethod: 1 });
OrderSchema.index({ tenantId: 1, paymentStatus: 1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export const Order = mongoose.model('Order', OrderSchema);
