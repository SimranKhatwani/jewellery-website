import mongoose, { Schema } from 'mongoose';

const PermissionSchema = new Schema(
  {
    key: {
      type: String,
      required: [true, 'Permission key is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      trim: true,
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
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

export const Permission = mongoose.model('Permission', PermissionSchema);

