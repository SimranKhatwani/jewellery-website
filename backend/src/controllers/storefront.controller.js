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
    policies: s.policies || {},
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
        name: tenant.name,
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
