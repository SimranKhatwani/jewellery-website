import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Build fully resolved white-label storefront configuration with sensible defaults.
 * Preserves exact AURELLE defaults for tenant 'aurelle', while dynamically adapting for other tenants.
 */
export function getResolvedStorefrontConfig(tenant) {
  const isAurelle = tenant.slug === 'aurelle';
  const name = tenant.name || (isAurelle ? 'AURELLE' : 'Fine Jewellery');
  const s = tenant.settings || {};

  const currency = s.currency || 'INR';
  const currencySymbol =
    s.currencySymbol ||
    (currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$')));

  const branding = {
    logoUrl: s.branding?.logoUrl || s.logoUrl || '',
    faviconUrl: s.branding?.faviconUrl || '',
    primaryColor: s.branding?.primaryColor || '#593D30',
    secondaryColor: s.branding?.secondaryColor || '#F7F1E9',
    accentColor: s.branding?.accentColor || '#A85F49',
    tagline: s.branding?.tagline || (isAurelle ? 'Silver Atelier' : `${name} Atelier`),
  };

  const announcement = {
    enabled: s.announcement?.enabled !== undefined ? s.announcement.enabled : true,
    text:
      s.announcement?.text ||
      (isAurelle
        ? '925 Sterling Silver Atelier · Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart · Solid 925 Sterling Silver · Complimentary Insured Express Dispatch on All Allocations'
        : `Welcome to ${name} · Solid 925 Sterling Silver Collections · Complimentary Insured Express Dispatch on All Orders`),
    link: s.announcement?.link || '',
    bgColor: s.announcement?.bgColor || '#A85F49',
    textColor: s.announcement?.textColor || '#FFFFFF',
  };

  const hero = {
    heading: s.hero?.heading || (isAurelle ? 'A Little Extraordinary' : `${name} Collections`),
    subheading:
      s.hero?.subheading || (isAurelle ? 'AURELLE FINE SILVER' : `${name.toUpperCase()} FINE JEWELLERY`),
    description:
      s.hero?.description ||
      `Sculptural fine jewellery conceived in solid 925 sterling silver. Celebrating tactile weights, fluid drape, and timeless personal expression.`,
    desktopImageUrl: s.hero?.desktopImageUrl || '',
    mobileImageUrl: s.hero?.mobileImageUrl || '',
    ctaText: s.hero?.ctaText || 'Explore Collection',
    ctaLink: s.hero?.ctaLink || '#categories',
  };

  const sections = {
    categories: {
      enabled: s.sections?.categories?.enabled !== undefined ? s.sections.categories.enabled : true,
      title: s.sections?.categories?.title || 'Shop by Category',
    },
    bestsellers: {
      enabled: s.sections?.bestsellers?.enabled !== undefined ? s.sections.bestsellers.enabled : true,
      title: s.sections?.bestsellers?.title || 'Curated Bestsellers',
    },
    newArrivals: {
      enabled: s.sections?.newArrivals?.enabled !== undefined ? s.sections.newArrivals.enabled : true,
      title: s.sections?.newArrivals?.title || 'New Editions',
    },
    brandStory: {
      enabled: s.sections?.brandStory?.enabled !== undefined ? s.sections.brandStory.enabled : true,
      title:
        s.sections?.brandStory?.title ||
        (isAurelle ? 'Sculptural Form, Understated Permanence.' : `Crafted with Passion at ${name}`),
      subtitle: s.sections?.brandStory?.subtitle || (isAurelle ? 'The Silver Philosophy' : 'Our Metallurgical Story'),
      content:
        s.sections?.brandStory?.content ||
        (isAurelle
          ? 'At AURELLE, silver is not treated as a secondary metal, but as a medium of pure sculptural expression. We design exclusively with solid 925 sterling silver—embracing its natural weight, luminous cool reflectivity, and evolving character.'
          : `At ${name}, every piece is designed with utmost precision and devotion. We craft timeless fine jewellery with solid 925 sterling silver, ensuring purity, durability, and contemporary elegance for effortless everyday wear.`),
      imageUrl: s.sections?.brandStory?.imageUrl || '',
    },
    whyChooseUs: {
      enabled: s.sections?.whyChooseUs?.enabled !== undefined ? s.sections.whyChooseUs.enabled : true,
      title: s.sections?.whyChooseUs?.title || 'Why Choose Us',
    },
    contact: {
      enabled: s.sections?.contact?.enabled !== undefined ? s.sections.contact.enabled : true,
      title: s.sections?.contact?.title || 'Purchasing Channels & Inquiries',
    },
    newsletter: {
      enabled: s.sections?.newsletter?.enabled !== undefined ? s.sections.newsletter.enabled : true,
      title: s.sections?.newsletter?.title || 'Private Releases',
    },
  };

  const footer = {
    description:
      s.footer?.description ||
      s.description ||
      (isAurelle
        ? 'Sculptural fine jewellery conceived exclusively in solid 925 sterling silver. Celebrating tactile weights, fluid drape, and timeless personal expression.'
        : `${name} fine jewellery crafted in solid 925 sterling silver. Timeless elegance and modern craftsmanship.`),
    contactEmail: s.footer?.contactEmail || s.supportEmail || '',
    contactPhone: s.footer?.contactPhone || s.contactPhone || '',
    address:
      s.footer?.address ||
      (s.businessAddress?.addressLine1
        ? `${s.businessAddress.addressLine1}, ${s.businessAddress.city || ''} ${s.businessAddress.state || ''} ${s.businessAddress.country || ''}`.trim()
        : isAurelle
        ? 'RKB Enterprises, Jaipur, Rajasthan'
        : ''),
    socialLinks: s.footer?.socialLinks || { instagram: '', facebook: '', twitter: '', pinterest: '', youtube: '' },
    copyrightText:
      s.footer?.copyrightText ||
      (isAurelle
        ? `© ${new Date().getFullYear()} AURELLE. Distributed by RKB Enterprises.`
        : `© ${new Date().getFullYear()} ${name}. All rights reserved.`),
  };

  const seo = {
    title: s.seo?.title || `${name} | 925 Sterling Silver Fine Jewellery`,
    description:
      s.seo?.description ||
      s.description ||
      `Explore ${name} handcrafted solid 925 sterling silver jewellery collections.`,
    ogImageUrl: s.seo?.ogImageUrl || branding.logoUrl || '',
  };

  const pol = s.policies || {};
  const returnCfg = pol.returnPolicyConfig || {};
  const returnWindowDays = returnCfg.returnWindowDays || (isAurelle ? 2 : 7);

  // Default authentic content for Aurelle if not yet saved in DB
  const aurelleDefaultPages = isAurelle
    ? {
        aboutUs: {
          title: 'About AURELLE',
          content: `<p>At AURELLE, silver is not treated as a secondary metal, but as a medium of pure sculptural expression. Conceived in the heart of Jaipur, our atelier designs exclusively with solid 925 sterling silver—embracing its natural tactile weight, luminous cool reflectivity, and enduring character.</p><p>Every ring, band, and anklet is cast with deliberate heft and hand-finished with artisan precision, celebrating fluid permanence for discerning collectors.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
        },
        returnPolicy: {
          title: 'Return & Refund Policy',
          content: `<p>At AURELLE, shop with confidence with our no questions asked return policy. Here’s our clear and transparent policy for returns, exchanges, and refunds.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
          returnPeriod: 2,
          eligibleProducts: 'Demifine®, Gold, and Lab-Grown Diamonds (LGD). Items sold at discounted prices remain eligible for returns.',
          nonReturnableProducts: 'Custom-made or personalized jewellery, and final clearance products.',
          returnConditions: 'Items must be unused, with original luxury atelier packaging and security tags intact. An unboxing video is required for missing/damaged claims.',
          refundProcess: 'Prepaid orders refunded to source payment method. COD orders refunded via verified UPI or bank transfer.',
          refundTimeline: '7–10 working days as per RBI guidelines following doorstep inspection.',
          exchangeTerms: 'LGD items can be exchanged for other LGD items. If exchanging for Demifine®, value must be equal or greater, with remaining balance issued as store credit.',
          supportPhone: s.contactPhone || '7788992233',
          supportEmail: s.supportEmail || 'concierge@aurelle.com',
        },
        shippingPolicy: {
          title: 'Shipping & Delivery Policy',
          content: `<p>Every AURELLE creation is dispatched in secure tamper-evident luxury presentation packaging with full transit insurance.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
          shippingCharges: 'Complimentary across India',
          freeShippingThreshold: '₹0 (All orders qualify for free express shipping)',
          estimatedDeliveryTime: '2 to 5 business days across major metros',
          shippingLocations: 'Pan-India across all serviceable pincodes',
          processingTime: 'Orders dispatched within 24–48 hours from our Jaipur atelier',
          trackingInformation: 'Live real-time courier tracking link dispatched via SMS and WhatsApp upon handoff',
        },
        privacyPolicy: {
          title: 'Privacy Policy',
          content: `<p>AURELLE Atelier respects your personal privacy. We collect client contact and shipping data solely to fulfill allocations, process secure payments, and provide tailored concierge customer care. Your data is encrypted and never sold to third parties.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
        },
        termsConditions: {
          title: 'Terms & Conditions',
          content: `<p>All orders placed with AURELLE Atelier (distributed by RKB Enterprises) are governed by our standard terms of trade. Solid 925 sterling silver purity is certified and hallmarked as per Bureau of Indian Standards (BIS) specifications.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
        },
        contactUs: {
          title: 'Purchasing Channels & Inquiries',
          content: `<p>Our concierge team is available Monday through Saturday, 10:00 AM to 7:00 PM IST, to assist with sizing consultations, bespoke orders, and order status.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
          contactEmail: s.supportEmail || 'concierge@aurelle.com',
          contactPhone: s.contactPhone || '7788992233',
          businessHours: 'Mon - Sat: 10:00 AM - 7:00 PM IST',
          address: 'RKB Enterprises, Johari Bazaar, Jaipur, Rajasthan 302003',
          whatsappNumber: '7788992233',
        },
        faqs: {
          title: 'Frequently Asked Questions',
          content: `<p>Frequently asked questions regarding 925 sterling silver authenticity, sizing, hallmarking, and maintenance.</p>`,
          status: 'published',
          updatedAt: new Date('2026-01-01'),
          items: [
            {
              id: 'faq-1',
              question: 'Is all AURELLE jewellery made of genuine solid 925 silver?',
              answer: 'Yes. Every piece is crafted in solid 925 sterling silver (92.5% pure silver alloyed for tensile strength) and carries the authentic 925 hallmark.',
              order: 1,
            },
            {
              id: 'faq-2',
              question: 'How do I care for and clean my silver jewellery?',
              answer: 'Store in airtight pouches away from humidity and perfumes. Clean gently using a microfiber polishing cloth or mild soapy warm water.',
              order: 2,
            },
            {
              id: 'faq-3',
              question: 'Can I exchange my ring or anklet for a different size?',
              answer: 'Yes! We offer size exchanges within 2 days of delivery as long as the security tags remain intact.',
              order: 3,
            },
          ],
        },
      }
    : {};

  const rawPages = s.contentPages || {};
  const contentPages = {};
  const pageKeys = ['aboutUs', 'returnPolicy', 'shippingPolicy', 'privacyPolicy', 'termsConditions', 'contactUs', 'faqs'];
  for (const key of pageKeys) {
    if (rawPages[key]) {
      contentPages[key] = {
        ...rawPages[key],
        status: rawPages[key].status || (isAurelle ? 'published' : 'draft'),
      };
    } else if (aurelleDefaultPages[key]) {
      contentPages[key] = aurelleDefaultPages[key];
    } else {
      contentPages[key] = {
        title:
          key === 'aboutUs'
            ? 'About Us'
            : key === 'returnPolicy'
            ? 'Return & Refund Policy'
            : key === 'shippingPolicy'
            ? 'Shipping Policy'
            : key === 'privacyPolicy'
            ? 'Privacy Policy'
            : key === 'termsConditions'
            ? 'Terms & Conditions'
            : key === 'contactUs'
            ? 'Contact Us'
            : 'Frequently Asked Questions',
        content: '',
        status: 'draft',
        updatedAt: null,
      };
    }
  }

  const resolvedPolicies = {
    aboutUs: contentPages.aboutUs?.content || pol.aboutUs || '',
    privacyPolicy: contentPages.privacyPolicy?.content || pol.privacyPolicy || '',
    termsConditions: contentPages.termsConditions?.content || pol.termsConditions || '',
    shippingPolicy: contentPages.shippingPolicy?.content || pol.shippingPolicy || '',
    returnPolicy: contentPages.returnPolicy?.content || pol.returnPolicy || '',
    returnPolicyConfig: {
      returnWindowDays: contentPages.returnPolicy?.returnPeriod || returnCfg.returnWindowDays || (isAurelle ? 2 : 7),
      policyOverview:
        contentPages.returnPolicy?.content ||
        returnCfg.policyOverview ||
        (isAurelle ? 'At AURELLE, shop with confidence with our no questions asked return policy. Here’s our clear and transparent policy for returns, exchanges, and refunds.' : ''),
      windowDetails:
        returnCfg.windowDetails ||
        (isAurelle
          ? 'You can raise a return request from here within 2 days of the delivery of the order.'
          : (contentPages.returnPolicy?.eligibleProducts || '')),
      returnConditions:
        contentPages.returnPolicy?.returnConditions ||
        returnCfg.returnConditions ||
        (isAurelle ? 'Items must be unused, with original packaging and tags intact. An unboxing video is required to process any claims for missing items in your order.' : ''),
      refundTimeline:
        contentPages.returnPolicy?.refundTimeline ||
        returnCfg.refundTimeline ||
        (isAurelle ? 'Refunds are processed in 7–10 working days as per RBI guidelines, following item pickup and verification.' : ''),
      exchangeTerms:
        contentPages.returnPolicy?.exchangeConditions ||
        returnCfg.exchangeTerms ||
        (isAurelle ? 'LGD products can only be exchanged for other LGD items. If a customer wishes to exchange an LGD item for a Demifine® product, the total value of the selected Demifine® items must be equal to or greater than the value of the LGD item.' : ''),
      nonReturnableItems:
        contentPages.returnPolicy?.nonReturnableProducts ||
        returnCfg.nonReturnableItems ||
        (isAurelle ? 'Custom-made or personalized Jewellery, and goodbye sale or clearance products (as mentioned on product page).' : ''),
      whatsappSupportNumber:
        contentPages.returnPolicy?.supportPhone ||
        returnCfg.whatsappSupportNumber ||
        s.contactPhone ||
        s.footer?.contactPhone ||
        '',
      whatsappMessage:
        returnCfg.whatsappMessage ||
        (isAurelle ? 'Hello AURELLE Support, I would like to raise a return / exchange request for my order.' : `Hello ${name} Support, I would like to raise a return / exchange request.`),
    },
  };

  return {
    currency,
    currencySymbol,
    branding,
    announcement,
    hero,
    sections,
    footer,
    seo,
    businessAddress: s.businessAddress || {},
    policies: resolvedPolicies,
    contentPages,
  };
}

/**
 * Get public store info
 */
export const getStoreInfo = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const config = getResolvedStorefrontConfig(tenant);

    res.json({
      success: true,
      store: {
        id: tenant._id,
        name: tenant.slug === 'aurelle' ? 'AURELLE' : tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain || null,
        status: tenant.status,
        logoUrl: config.branding.logoUrl || tenant.settings?.logoUrl || null,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        settings: {
          ...tenant.settings,
          ...config,
        },
        config,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public storefront product catalogue listing
 */
export const getStorefrontProducts = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const {
      category,
      search,
      bestseller,
      newArrival,
      page = 1,
      limit = 100,
      sort = 'displayOrder',
    } = req.query;

    const filter = {
      tenantId,
      isPublished: true,
    };

    if (category && category !== 'all') {
      filter.category = String(category).toLowerCase().trim();
    }

    if (bestseller === 'true') {
      filter.isBestseller = true;
    }

    if (newArrival === 'true') {
      filter.isNewArrival = true;
    }

    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { subtitle: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { displayOrder: 1, createdAt: -1 };
    if (sort === 'priceAsc') sortOption = { priceUSD: 1 };
    else if (sort === 'priceDesc') sortOption = { priceUSD: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Format products for storefront response
    const formattedProducts = products.map((p) => ({
      ...p,
      id: p.slug || p._id,
      price: p.priceUSD,
      // For stock availability in customer storefront:
      // If stockQuantity is explicitly tracked, check stockQuantity > 0.
      // Otherwise, preserve inStock boolean while flagging status.
      isAvailable: p.inventoryStatus === 'out_of_stock' ? false : Boolean(p.inStock),
    }));

    res.json({
      success: true,
      count: formattedProducts.length,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
      products: formattedProducts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public storefront product detail
 */
export const getStorefrontProductDetail = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { productSlug } = req.params;

    const product = await Product.findOne({
      tenantId,
      slug: productSlug.toLowerCase(),
      isPublished: true,
    }).lean();

    if (!product) {
      throw new NotFoundError(`Product '${productSlug}' not found in this store.`);
    }

    const formattedProduct = {
      ...product,
      id: product.slug || product._id,
      price: product.priceUSD,
      isAvailable: product.inventoryStatus === 'out_of_stock' ? false : Boolean(product.inStock),
    };

    res.json({
      success: true,
      product: formattedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public storefront categories
 */
export const getStorefrontCategories = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;

    const categories = await Category.find({
      tenantId,
      isActive: true,
    })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public storefront informational & policy pages list (only published)
 */
export const getStorefrontPages = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const config = getResolvedStorefrontConfig(tenant);
    const contentPages = config.contentPages || {};

    const pageSlugs = {
      aboutUs: 'about-us',
      returnPolicy: 'return-policy',
      shippingPolicy: 'shipping-policy',
      privacyPolicy: 'privacy-policy',
      termsConditions: 'terms-and-conditions',
      contactUs: 'contact-us',
      faqs: 'faqs',
    };

    const pages = Object.entries(contentPages)
      .filter(([_, page]) => page && page.status === 'published')
      .map(([key, page]) => ({
        key,
        slug: pageSlugs[key] || key,
        title: page.title,
        updatedAt: page.updatedAt,
        status: 'published',
      }));

    res.json({
      success: true,
      storeName: tenant.name,
      storeSlug: tenant.slug,
      count: pages.length,
      pages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public storefront page detail
 */
export const getStorefrontPageDetail = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const { pageSlug } = req.params;
    const config = getResolvedStorefrontConfig(tenant);
    const contentPages = config.contentPages || {};

    const normalizedSlug = (pageSlug || '').toLowerCase().trim();
    const PAGE_SLUG_MAP = {
      'about-us': 'aboutUs',
      'about': 'aboutUs',
      'return-policy': 'returnPolicy',
      'return-and-refund-policy': 'returnPolicy',
      'returns': 'returnPolicy',
      'shipping-policy': 'shippingPolicy',
      'shipping': 'shippingPolicy',
      'privacy-policy': 'privacyPolicy',
      'privacy': 'privacyPolicy',
      'terms-and-conditions': 'termsConditions',
      'terms': 'termsConditions',
      'contact-us': 'contactUs',
      'contact': 'contactUs',
      'faqs': 'faqs',
      'faq': 'faqs',
    };

    const pageKey = PAGE_SLUG_MAP[normalizedSlug];
    if (!pageKey || !contentPages[pageKey]) {
      throw new NotFoundError(`Page '${pageSlug}' not found.`);
    }

    const page = contentPages[pageKey];

    // If page is draft or not published, do NOT leak unpublished content or generic text
    if (page.status !== 'published') {
      return res.json({
        success: true,
        published: false,
        page: {
          key: pageKey,
          slug: normalizedSlug,
          title: page.title || 'Page Unavailable',
          status: 'draft',
          message: `The ${page.title || 'requested policy'} for ${tenant.name} is currently in preparation. Please contact the store directly for assistance.`,
          contactEmail: tenant.settings?.supportEmail || '',
          contactPhone: tenant.settings?.contactPhone || '',
        },
      });
    }

    // Published page
    return res.json({
      success: true,
      published: true,
      page: {
        ...page,
        key: pageKey,
        slug: normalizedSlug,
        storeName: tenant.name,
        storeSlug: tenant.slug,
      },
    });
  } catch (error) {
    next(error);
  }
};
