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
    customDomainVerified: {
      type: Boolean,
      default: false,
      index: true,
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
      currencySymbol: {
        type: String,
        default: '₹',
      },
      taxRate: {
        type: Number,
        default: 0,
      },
      shippingFee: {
        type: Number,
        default: 0,
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      logoUrl: {
        type: String,
        default: '',
      },
      description: {
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
        match: [/^([6-9]\d{9})?$/, 'Contact phone must be a valid 10-digit mobile number starting with 6, 7, 8, or 9'],
      },
      businessAddress: {
        addressLine1: { type: String, default: '' },
        addressLine2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: 'India' },
      },
      branding: {
        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },
        primaryColor: { type: String, default: '#593D30' },
        secondaryColor: { type: String, default: '#F7F1E9' },
        accentColor: { type: String, default: '#A85F49' },
        tagline: { type: String, default: 'Fine Jewellery Atelier' },
      },
      announcement: {
        enabled: { type: Boolean, default: true },
        text: { type: String, default: '' },
        link: { type: String, default: '' },
        bgColor: { type: String, default: '#A85F49' },
        textColor: { type: String, default: '#FFFFFF' },
      },
      hero: {
        heading: { type: String, default: '' },
        subheading: { type: String, default: '' },
        description: { type: String, default: '' },
        desktopImageUrl: { type: String, default: '' },
        mobileImageUrl: { type: String, default: '' },
        ctaText: { type: String, default: 'Explore Collection' },
        ctaLink: { type: String, default: '#categories' },
      },
      sections: {
        categories: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'Shop by Category' },
        },
        bestsellers: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'Curated Bestsellers' },
        },
        newArrivals: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'New Editions' },
        },
        brandStory: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'Sculptural Form, Understated Permanence' },
          subtitle: { type: String, default: 'The Philosophy' },
          content: { type: String, default: '' },
          imageUrl: { type: String, default: '' },
        },
        whyChooseUs: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'Why Choose Us' },
        },
        contact: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'Purchasing Channels & Client Inquiries' },
        },
        newsletter: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: 'Private Releases' },
        },
      },
      footer: {
        description: { type: String, default: '' },
        contactEmail: { type: String, default: '' },
        contactPhone: { type: String, default: '' },
        address: { type: String, default: '' },
        socialLinks: {
          instagram: { type: String, default: '' },
          facebook: { type: String, default: '' },
          twitter: { type: String, default: '' },
          pinterest: { type: String, default: '' },
          youtube: { type: String, default: '' },
        },
        copyrightText: { type: String, default: '' },
      },
      policies: {
        aboutUs: { type: String, default: '' },
        returnPolicy: { type: String, default: '' },
        privacyPolicy: { type: String, default: '' },
        termsConditions: { type: String, default: '' },
        shippingPolicy: { type: String, default: '' },
        returnPolicyConfig: {
          returnWindowDays: { type: Number, default: 7 },
          policyOverview: { type: String, default: '' },
          windowDetails: { type: String, default: '' },
          returnConditions: { type: String, default: '' },
          refundTimeline: { type: String, default: '' },
          exchangeTerms: { type: String, default: '' },
          nonReturnableItems: { type: String, default: '' },
          whatsappSupportNumber: {
            type: String,
            trim: true,
            default: '',
            match: [/^([6-9]\d{9})?$/, 'WhatsApp number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9'],
          },
          whatsappMessage: { type: String, default: '' },
        },
      },
      contentPages: {
        aboutUs: {
          title: { type: String, default: 'About Us' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
        },
        returnPolicy: {
          title: { type: String, default: 'Return & Refund Policy' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
          returnPeriod: { type: Number, default: 7 },
          eligibleProducts: { type: String, default: '' },
          nonReturnableProducts: { type: String, default: '' },
          returnConditions: { type: String, default: '' },
          refundProcess: { type: String, default: '' },
          refundTimeline: { type: String, default: '' },
          exchangeConditions: { type: String, default: '' },
          supportPhone: {
            type: String,
            trim: true,
            default: '',
            match: [/^([6-9]\d{9})?$/, 'Support phone must be a valid 10-digit mobile number starting with 6, 7, 8, or 9'],
          },
          supportEmail: { type: String, default: '' },
        },
        shippingPolicy: {
          title: { type: String, default: 'Shipping Policy' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
          shippingCharges: { type: String, default: '' },
          freeShippingThreshold: { type: String, default: '' },
          estimatedDeliveryTime: { type: String, default: '' },
          shippingLocations: { type: String, default: '' },
          processingTime: { type: String, default: '' },
          trackingInformation: { type: String, default: '' },
        },
        privacyPolicy: {
          title: { type: String, default: 'Privacy Policy' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
        },
        termsConditions: {
          title: { type: String, default: 'Terms & Conditions' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
        },
        contactUs: {
          title: { type: String, default: 'Contact Us' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
          contactEmail: { type: String, default: '' },
          contactPhone: {
            type: String,
            trim: true,
            default: '',
            match: [/^([6-9]\d{9})?$/, 'Contact phone must be a valid 10-digit mobile number starting with 6, 7, 8, or 9'],
          },
          businessHours: { type: String, default: '' },
          address: { type: String, default: '' },
          whatsappNumber: {
            type: String,
            trim: true,
            default: '',
            match: [/^([6-9]\d{9})?$/, 'WhatsApp number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9'],
          },
        },
        faqs: {
          title: { type: String, default: 'Frequently Asked Questions' },
          content: { type: String, default: '' },
          status: { type: String, enum: ['draft', 'published'], default: 'draft' },
          updatedAt: { type: Date, default: Date.now },
          items: [
            {
              id: { type: String },
              question: { type: String },
              answer: { type: String },
              order: { type: Number, default: 0 },
            },
          ],
        },
      },
      seo: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        ogImageUrl: { type: String, default: '' },
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

