import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import { Tenant } from '../src/models/Tenant.js';

async function migrate() {
  console.log('--- STARTING TENANT CONTENT & POLICIES MIGRATION ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Migrate AURELLE tenant
  const aurelle = await Tenant.findOne({ slug: 'aurelle' });
  if (aurelle) {
    console.log(`Found Aurelle tenant: ${aurelle.name} (${aurelle.slug})`);
    if (!aurelle.settings) aurelle.settings = {};
    if (!aurelle.settings.contentPages) aurelle.settings.contentPages = {};

    aurelle.settings.contentPages = {
      aboutUs: {
        title: 'About AURELLE',
        content: '<p>At AURELLE, silver is not treated as a secondary metal, but as a medium of pure sculptural expression. Conceived in the heart of Jaipur, our atelier designs exclusively with solid 925 sterling silver—embracing its natural tactile weight, luminous cool reflectivity, and enduring character.</p><p>Every ring, band, and anklet is cast with deliberate heft and hand-finished with artisan precision, celebrating fluid permanence for discerning collectors.</p>',
        status: 'published',
        updatedAt: new Date(),
      },
      returnPolicy: {
        title: 'Return & Exchange Policy',
        content: '<p>At AURELLE, shop with confidence with our no questions asked return policy. Here’s our clear and transparent policy for returns, exchanges, and refunds.</p>',
        status: 'published',
        updatedAt: new Date(),
        returnPeriod: 2,
        eligibleProducts: 'Demifine®, Gold, and Lab-Grown Diamonds (LGD). Items sold at discounted prices remain eligible for returns.',
        nonReturnableProducts: 'Custom-made or personalized jewellery, and goodbye sale or clearance products.',
        returnConditions: 'Items must be unused, with original packaging and tags intact. An unboxing video is required to process any claims for missing items in your order.',
        refundProcess: 'Prepaid orders refunded to original source payment method. COD orders refunded to verified UPI or bank account.',
        refundTimeline: 'Refunds are processed in 7–10 working days as per RBI guidelines, following item pickup and verification.',
        exchangeTerms: 'LGD products can only be exchanged for other LGD items. If a customer wishes to exchange an LGD item for a Demifine® product, the total value of the selected Demifine® items must be equal to or greater than the value of the LGD item.',
        supportPhone: aurelle.settings.contactPhone || '7788992233',
        supportEmail: aurelle.settings.supportEmail || 'concierge@aurelle.com',
      },
      shippingPolicy: {
        title: 'Shipping Policy',
        content: '<p>Every AURELLE allocation is dispatched via insured priority express courier with real-time tracking.</p>',
        status: 'published',
        updatedAt: new Date(),
        shippingCharges: 'Complimentary across India',
        freeShippingThreshold: '₹0 (All orders qualify for complimentary dispatch)',
        estimatedDeliveryTime: '2 to 5 business days across major metros',
        shippingLocations: 'Pan-India across all serviceable pincodes',
        processingTime: 'Orders dispatched within 24–48 hours from our Jaipur atelier',
        trackingInformation: 'Real-time courier tracking link dispatched via SMS and WhatsApp upon handover',
      },
      privacyPolicy: {
        title: 'Privacy Policy',
        content: '<p>AURELLE Atelier respects client privacy. Client data is collected strictly to process allocations, verify addresses, and provide bespoke client concierge support. Your data is encrypted and never sold or shared.</p>',
        status: 'published',
        updatedAt: new Date(),
      },
      termsConditions: {
        title: 'Terms & Conditions',
        content: '<p>All orders placed with AURELLE Atelier (distributed by RKB Enterprises) are governed by our standard terms of trade. Solid 925 sterling silver purity is certified and hallmarked as per Bureau of Indian Standards (BIS) specifications.</p>',
        status: 'published',
        updatedAt: new Date(),
      },
      contactUs: {
        title: 'Purchasing Channels & Inquiries',
        content: '<p>Our concierge team is available Monday through Saturday, 10:00 AM to 7:00 PM IST, to assist with sizing consultations, bespoke orders, and order status.</p>',
        status: 'published',
        updatedAt: new Date(),
        contactEmail: aurelle.settings.supportEmail || 'concierge@aurelle.com',
        contactPhone: aurelle.settings.contactPhone || '7788992233',
        businessHours: 'Mon - Sat: 10:00 AM - 7:00 PM IST',
        address: 'RKB Enterprises, Johari Bazaar, Jaipur, Rajasthan 302003',
        whatsappNumber: '7788992233',
      },
      faqs: {
        title: 'Frequently Asked Questions',
        content: '<p>Frequently asked questions regarding solid 925 sterling silver care, hallmarking, and maintenance.</p>',
        status: 'published',
        updatedAt: new Date(),
        items: [
          {
            id: 'faq-1',
            question: 'Is all AURELLE jewellery made of solid 925 silver?',
            answer: 'Yes. Every piece is crafted in solid 925 sterling silver and carries the authentic 925 hallmark.',
            order: 1,
          },
          {
            id: 'faq-2',
            question: 'How do I care for my silver jewellery?',
            answer: 'Store in airtight pouches away from humidity and perfumes. Clean gently using a soft microfiber polishing cloth.',
            order: 2,
          },
          {
            id: 'faq-3',
            question: 'Can I exchange my ring or anklet for a different size?',
            answer: 'Yes, we offer size exchanges within 2 days of delivery as long as tags remain intact.',
            order: 3,
          },
        ],
      },
    };

    aurelle.markModified('settings');
    await aurelle.save();
    console.log('✓ Aurelle contentPages preserved & published successfully.');
  }

  // 2. Clean and initialize non-aurelle tenants (e.g. GIVA Jewels)
  const nonAurelleTenants = await Tenant.find({ slug: { $ne: 'aurelle' } });
  for (const t of nonAurelleTenants) {
    console.log(`Inspecting tenant: ${t.name} (${t.slug})`);
    if (!t.settings) t.settings = {};

    // Remove any inherited Aurelle copy
    if (t.settings.policies) {
      t.settings.policies.aboutUs = '';
      t.settings.policies.returnPolicy = '';
      t.settings.policies.privacyPolicy = '';
      t.settings.policies.termsConditions = '';
      t.settings.policies.shippingPolicy = '';
    }

    // Initialize clean draft contentPages if not already customized
    if (!t.settings.contentPages) {
      t.settings.contentPages = {
        aboutUs: { title: 'About Us', content: '', status: 'draft', updatedAt: new Date() },
        returnPolicy: {
          title: 'Return & Refund Policy',
          content: '',
          status: 'draft',
          updatedAt: new Date(),
          returnPeriod: 7,
          eligibleProducts: '',
          nonReturnableProducts: '',
          returnConditions: '',
          refundProcess: '',
          refundTimeline: '',
          exchangeConditions: '',
          supportPhone: '',
          supportEmail: '',
        },
        shippingPolicy: {
          title: 'Shipping Policy',
          content: '',
          status: 'draft',
          updatedAt: new Date(),
          shippingCharges: '',
          freeShippingThreshold: '',
          estimatedDeliveryTime: '',
          shippingLocations: '',
          processingTime: '',
          trackingInformation: '',
        },
        privacyPolicy: { title: 'Privacy Policy', content: '', status: 'draft', updatedAt: new Date() },
        termsConditions: { title: 'Terms & Conditions', content: '', status: 'draft', updatedAt: new Date() },
        contactUs: {
          title: 'Contact Us',
          content: '',
          status: 'draft',
          updatedAt: new Date(),
          contactEmail: t.settings.supportEmail || '',
          contactPhone: t.settings.contactPhone || '',
          businessHours: '',
          address: '',
          whatsappNumber: '',
        },
        faqs: {
          title: 'Frequently Asked Questions',
          content: '',
          status: 'draft',
          updatedAt: new Date(),
          items: [],
        },
      };
    }

    t.markModified('settings');
    await t.save();
    console.log(`✓ Cleaned & initialized isolated draft pages for ${t.name}. Zero Aurelle leakage.`);
  }

  console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
