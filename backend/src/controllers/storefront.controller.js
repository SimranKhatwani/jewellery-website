import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get public store info
 */
export const getStoreInfo = async (req, res, next) => {
  try {
    const tenant = req.tenant;

    const currency = tenant.settings?.currency || 'USD';
    const currencySymbol = tenant.settings?.currencySymbol || (currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$')));

    res.json({
      success: true,
      store: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain || null,
        settings: tenant.settings || {},
        logoUrl: tenant.logoUrl || null,
        currency,
        currencySymbol,
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
