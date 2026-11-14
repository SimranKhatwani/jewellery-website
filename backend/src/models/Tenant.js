import mongoose, { Schema } from 'mongoose';
import { TENANT_STATUS } from '../config/constants.js';

const TenantSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [100, 'Store name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Store slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    customDomain: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    status: {
      type: String,
      enum: Object.values(TENANT_STATUS),
      default: TENANT_STATUS.ACTIVE,
      index: true,
    },
    plan: {
      type: String,
      default: 'starter',
      enum: ['starter', 'growth', 'enterprise'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    settings: {
      currency: {
        type: String,
        default: 'INR',
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      logoUrl: {
        type: String,
        default: '',
      },
      supportEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
      contactPhone: {
        type: String,
        trim: true,
        default: '',
      },
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

export const Tenant = mongoose.model('Tenant', TenantSchema);

