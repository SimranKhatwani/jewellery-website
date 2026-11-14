import mongoose, { Schema } from 'mongoose';

const PlanFeatureSchema = new Schema(
  {
    key: {
      type: String,
      required: [true, 'Feature key is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Feature name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['catalog', 'inventory', 'analytics', 'staff', 'marketing', 'domain', 'support'],
      default: 'catalog',
      index: true,
    },
    type: {
      type: String,
      enum: ['boolean', 'limit'],
      default: 'boolean',
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

export const PlanFeature = mongoose.model('PlanFeature', PlanFeatureSchema);

