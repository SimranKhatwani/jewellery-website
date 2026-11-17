import mongoose, { Schema } from 'mongoose';

const ProductOptionSchema = new Schema(
  {
    type: { type: String, enum: ['size', 'length'], default: 'size' },
    name: { type: String, default: 'Ring Size (US)' },
    values: { type: [String], default: [] },
    default: { type: String, default: '' },
  },
  { _id: false }
);

const ProductSpecificationSchema = new Schema(
  {
    purity: { type: String, default: 'Solid 925 Sterling Silver' },
    hallmark: { type: String, default: 'Laser-engraved 925 authenticity hallmark' },
    finish: { type: String, default: 'Mirror polished' },
    weight: { type: String, default: '' },
    dimensions: { type: String, default: '' },
    hypoallergenic: { type: String, default: '100% Nickel-free & skin-safe' },
    protection: { type: String, default: 'Protective rhodium barrier' },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema(
  {
    sku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Variant name is required'],
      trim: true,
    },
    price: {
      type: Number,
      default: null, // null falls back to parent product priceUSD
      min: 0,
    },
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    inventoryStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock', 'unknown'],
      default: 'unknown',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ProductSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for product'],
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    priceUSD: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    currencySymbol: {
      type: String,
      default: '$',
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    editorialQuote: {
      type: String,
      default: '',
      trim: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    inventoryStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock', 'unknown'],
      default: 'unknown',
      index: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
    },
    primaryImage: {
      type: String,
      required: [true, 'Primary image is required'],
    },
    secondaryImage: {
      type: String,
      default: '',
    },
    detailImage: {
      type: String,
      default: '',
    },
    lifestyleImage: {
      type: String,
      default: '',
    },
    options: {
      type: ProductOptionSchema,
      default: () => ({
        type: 'size',
        name: 'Ring Size (US)',
        values: ['US 5', 'US 6', 'US 7', 'US 8', 'US 9'],
        default: 'US 7',
      }),
    },
    finishes: {
      type: [String],
      default: ['High Polish Silver'],
    },
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [ProductVariantSchema],
    specifications: {
      type: ProductSpecificationSchema,
      default: () => ({
        purity: 'Solid 925 Sterling Silver',
        hallmark: 'Laser-engraved 925 hallmark',
        finish: 'Mirror polished',
        weight: '8.0 grams',
        dimensions: 'Standard fit',
        hypoallergenic: '100% Nickel-free',
        protection: 'Protective rhodium barrier',
      }),
    },
    careInstructions: {
      type: [String],
      default: [
        'Wipe gently with microfibre cloth after wear.',
        'Store in anti-tarnish suede pouch away from moisture.',
      ],
    },
    stockistInquiryAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.slug || ret._id;
        if (ret.price === undefined && ret.priceUSD !== undefined) {
          ret.price = ret.priceUSD;
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

ProductSchema.virtual('price').get(function () {
  return this.priceUSD;
});

// Compound unique indexes: slug and SKU must be unique per tenant
ProductSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, isPublished: 1, displayOrder: 1 });

export const Product = mongoose.model('Product', ProductSchema);
