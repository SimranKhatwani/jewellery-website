import mongoose, { Document, Schema } from 'mongoose';

export interface IProductSpecification {
  purity: string;
  hallmark: string;
  finish: string;
  weight: string;
  dimensions: string;
  hypoallergenic: string;
  protection: string;
}

export interface IProductOption {
  type: 'size' | 'length';
  name: string;
  values: string[];
  default: string;
}

export interface IProduct extends Document {
  slug: string;
  name: string;
  category: string; // 'rings' | 'anklets' or custom category slug
  priceUSD: number;
  subtitle: string;
  description: string;
  editorialQuote?: string;
  isBestseller: boolean;
  isNewArrival: boolean;
  isPublished: boolean;
  displayOrder: number;
  inStock: boolean;
  sku: string;
  primaryImage: string; // e.g. "/api/media/67123..." or local static asset fallback
  secondaryImage?: string;
  detailImage?: string;
  lifestyleImage?: string;
  options: IProductOption;
  finishes: string[];
  specifications: IProductSpecification;
  careInstructions: string[];
  stockistInquiryAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductOptionSchema = new Schema<IProductOption>(
  {
    type: { type: String, enum: ['size', 'length'], default: 'size' },
    name: { type: String, default: 'Ring Size (US)' },
    values: { type: [String], default: [] },
    default: { type: String, default: '' },
  },
  { _id: false }
);

const ProductSpecificationSchema = new Schema<IProductSpecification>(
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

const ProductSchema = new Schema<IProduct>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    priceUSD: {
      type: Number,
      required: true,
      min: 0,
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
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    primaryImage: {
      type: String,
      required: true,
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
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret.slug || ret._id;
        return ret;
      },
    },
  }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
