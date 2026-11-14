import mongoose, { Schema } from 'mongoose';

const SubscriptionPlanSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [50, 'Plan name cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Plan slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    billingInterval: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
      index: true,
    },
    features: {
      type: [String],
      default: [],
    },
    limits: {
      maxProducts: {
        type: Number,
        default: 50, // -1 indicates unlimited
      },
      maxStaff: {
        type: Number,
        default: 2, // -1 indicates unlimited
      },
      maxStorageMB: {
        type: Number,
        default: 500, // -1 indicates unlimited
      },
      customDomainAllowed: {
        type: Boolean,
        default: false,
      },
    },
    trialDays: {
      type: Number,
      default: 14,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
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
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

