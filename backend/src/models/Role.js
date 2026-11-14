import mongoose, { Schema } from 'mongoose';

const RoleSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Role slug is required'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    isSystemRole: {
      type: Boolean,
      default: false,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
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

// Unique role slug per tenant (null tenantId is system role)
RoleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export const Role = mongoose.model('Role', RoleSchema);

