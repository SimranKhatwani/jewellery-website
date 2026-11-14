import mongoose, { Schema } from 'mongoose';

const WishlistItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required in wishlist item'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const WishlistSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for wishlist'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for wishlist'],
      index: true,
    },
    items: [WishlistItemSchema],
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

// Unique compound index: One wishlist per user per tenant
WishlistSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export const Wishlist = mongoose.model('Wishlist', WishlistSchema);
