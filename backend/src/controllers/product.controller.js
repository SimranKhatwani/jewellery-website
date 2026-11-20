import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { enforceProductLimit } from '../services/subscription.service.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import { buildSafeRegexQuery } from '../utils/regex.js';

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const resolveCurrencySymbol = (curr) => {
  const c = String(curr || 'USD').toUpperCase().trim();
  switch (c) {
    case 'INR': return '₹';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'AED': return 'AED ';
    case 'CAD': return 'CA$';
    case 'AUD': return 'AU$';
    case 'JPY': return '¥';
    case 'USD':
    default:
      return '$';
  }
};

/**
 * List tenant products (Admin or Storefront)
 */
export const listTenantProducts = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.json({ success: true, count: 0, products: [] });
    }
    const tenantId = req.tenant._id;
    const {
      category,
      search,
      bestseller,
      newArrival,
      isPublished,
      inventoryStatus,
      page = 1,
      limit = 100,
      sort = 'displayOrder',
    } = req.query;

    const filter = { tenantId };

    // If caller is public storefront, only return published products
    if (req.isStorefront || req.query.publicOnly === 'true') {
      filter.isPublished = true;
    } else if (isPublished !== undefined) {
      filter.isPublished = isPublished === 'true';
    }

    if (category && category !== 'all') {
      filter.category = String(category).toLowerCase().trim();
    }

    if (bestseller === 'true') {
      filter.isBestseller = true;
    }

    if (newArrival === 'true') {
      filter.isNewArrival = true;
    }

    if (inventoryStatus) {
      filter.inventoryStatus = inventoryStatus;
    }

    if (search && String(search).trim() !== '') {
      const regexQuery = buildSafeRegexQuery(search, 'i', 100);
      if (regexQuery) {
        filter.$or = [
          { name: regexQuery },
          { subtitle: regexQuery },
          { description: regexQuery },
          { sku: regexQuery },
        ];
      }
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

    const activeCurrency = req.tenant?.settings?.currency || 'USD';
    const activeCurrencySymbol = req.tenant?.settings?.currencySymbol || resolveCurrencySymbol(activeCurrency);

    const formattedProducts = products.map((p) => ({
      ...p,
      currency: p.currency || activeCurrency,
      currencySymbol: p.currencySymbol || activeCurrencySymbol,
    }));

    res.json({
      success: true,
      count: formattedProducts.length,
      currency: activeCurrency,
      currencySymbol: activeCurrencySymbol,
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
 * Get single tenant product by slug or ID
 */
export const listStorefrontProducts = (req, res, next) => {
  req.isStorefront = true;
  return listTenantProducts(req, res, next);
};

export const listAdminProducts = (req, res, next) => {
  req.isStorefront = false;
  return listTenantProducts(req, res, next);
};

/**
 * Get single tenant product by slug or ID
 */
export const getTenantProduct = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(404).json({ success: false, message: 'Store not found.' });
    }
    const tenantId = req.tenant._id;
    const identifier = req.params.identifier || req.params.id;

    const query = { tenantId };
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      query.$or = [{ _id: identifier }, { slug: identifier.toLowerCase() }];
    } else {
      query.slug = identifier.toLowerCase();
    }

    if (req.isStorefront) {
      query.isPublished = true;
    }

    const product = await Product.findOne(query).lean();
    if (!product) {
      throw new NotFoundError(`Product '${identifier}' not found in this store.`);
    }

    const activeCurrency = req.tenant?.settings?.currency || 'USD';
    const activeCurrencySymbol = req.tenant?.settings?.currencySymbol || resolveCurrencySymbol(activeCurrency);
    product.currency = product.currency || activeCurrency;
    product.currencySymbol = product.currencySymbol || activeCurrencySymbol;

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const getStorefrontProduct = (req, res, next) => {
  req.isStorefront = true;
  return getTenantProduct(req, res, next);
};

/**
 * Create tenant product (Store Admin)
 */
export const createTenantProduct = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;

    // 1. Enforce plan maxProducts limit
    await enforceProductLimit(tenantId);

    const {
      name,
      slug,
      category,
      priceUSD,
      subtitle,
      description,
      editorialQuote,
      isBestseller,
      isNewArrival,
      isPublished,
      displayOrder,
      inStock,
      stockQuantity,
      sku,
      primaryImage,
      secondaryImage,
      detailImage,
      lifestyleImage,
      options,
      finishes,
      hasVariants,
      variants,
      specifications,
      careInstructions,
    } = req.body;

    if (!name || priceUSD === undefined || !category || !sku || !primaryImage) {
      throw new BadRequestError('Required fields missing: name, category, priceUSD, sku, and primaryImage.');
    }

    // 2. Validate category belongs to this tenant if Category collection has entries
    const normalizedCat = String(category).toLowerCase().trim();
    const existingCat = await Category.findOne({ tenantId, slug: normalizedCat });
    const categoryId = existingCat ? existingCat._id : null;

    // 3. Resolve slug and check uniqueness within tenant
    const targetSlug = slug ? slugify(slug) : slugify(name);
    const existingSlug = await Product.findOne({ tenantId, slug: targetSlug });
    if (existingSlug) {
      throw new ConflictError(`A product with slug '${targetSlug}' already exists in this store.`);
    }

    // 4. Check SKU uniqueness within tenant
    const normalizedSku = String(sku).trim().toUpperCase();
    const existingSku = await Product.findOne({ tenantId, sku: normalizedSku });
    if (existingSku) {
      throw new ConflictError(`A product with SKU '${normalizedSku}' already exists in this store.`);
    }

    // 5. Determine stockQuantity and inventoryStatus
    let finalStock = 0;
    let finalInventoryStatus = 'unknown';

    if (stockQuantity !== undefined && stockQuantity !== null && stockQuantity !== '') {
      finalStock = Math.max(0, parseInt(stockQuantity, 10));
      finalInventoryStatus = finalStock > 0 ? (finalStock <= 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
    } else if (inStock === false) {
      finalStock = 0;
      finalInventoryStatus = 'out_of_stock';
    }

    // Determine target currency and sync with tenant settings
    const targetCurrency = String(req.body.currency || req.tenant?.settings?.currency || 'USD').toUpperCase().trim();
    const targetCurrencySymbol = req.body.currencySymbol ? String(req.body.currencySymbol).trim() : resolveCurrencySymbol(targetCurrency);

    if (req.tenant) {
      req.tenant.settings = req.tenant.settings || {};
      if (req.body.currency || !req.tenant.settings.currency) {
        req.tenant.settings.currency = targetCurrency;
        req.tenant.settings.currencySymbol = targetCurrencySymbol;
        await req.tenant.save();
      }
    }

    // 6. Process variants if present
    const processedVariants = [];
    if (hasVariants && Array.isArray(variants)) {
      const variantSkus = new Set();
      for (const v of variants) {
        if (!v.sku || !v.name) {
          throw new BadRequestError('Every variant requires a name and sku.');
        }
        const vSku = String(v.sku).trim().toUpperCase();
        if (vSku === normalizedSku || variantSkus.has(vSku)) {
          throw new ConflictError(`Duplicate variant SKU '${vSku}' within product.`);
        }
        variantSkus.add(vSku);

        const vStock = v.stockQuantity !== undefined ? Math.max(0, parseInt(v.stockQuantity, 10)) : 0;
        const vStatus = v.stockQuantity !== undefined
          ? (vStock > 0 ? (vStock <= 5 ? 'low_stock' : 'in_stock') : 'out_of_stock')
          : 'unknown';

        processedVariants.push({
          sku: vSku,
          name: v.name.trim(),
          price: v.price !== undefined && v.price !== null ? Math.max(0, Number(v.price)) : null,
          attributes: v.attributes || {},
          stockQuantity: vStock,
          inventoryStatus: vStatus,
          isActive: v.isActive !== false,
        });
      }
    }

    const product = await Product.create({
      tenantId,
      name: name.trim(),
      slug: targetSlug,
      category: normalizedCat,
      categoryId,
      priceUSD: Number(priceUSD),
      currency: targetCurrency,
      currencySymbol: targetCurrencySymbol,
      subtitle: subtitle || '',
      description: description || '',
      editorialQuote: editorialQuote || '',
      isBestseller: Boolean(isBestseller),
      isNewArrival: Boolean(isNewArrival),
      isPublished: isPublished !== false,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      inStock:
        inStock !== undefined
          ? Boolean(inStock)
          : finalInventoryStatus === 'out_of_stock'
          ? false
          : finalInventoryStatus === 'unknown'
          ? true
          : finalStock > 0,
      stockQuantity: finalStock,
      lowStockThreshold: req.body.lowStockThreshold ? Number(req.body.lowStockThreshold) : 5,
      inventoryStatus: finalInventoryStatus,
      sku: normalizedSku,
      primaryImage,
      secondaryImage: secondaryImage || '',
      detailImage: detailImage || '',
      lifestyleImage: lifestyleImage || '',
      options: options || undefined,
      finishes: Array.isArray(finishes) && finishes.length > 0 ? finishes : ['High Polish Silver'],
      hasVariants: Boolean(hasVariants && processedVariants.length > 0),
      variants: processedVariants,
      specifications: specifications || undefined,
      careInstructions: careInstructions || undefined,
    });

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.PRODUCT_CREATE,
      resource: 'Product',
      resourceId: product._id,
      details: { sku: product.sku, slug: product.slug, name: product.name },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tenant product
 */
export const updateTenantProduct = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const product = await Product.findOne({ tenantId, _id: id });
    if (!product) {
      throw new NotFoundError(`Product not found in this store.`);
    }

    const updates = { ...req.body };

    // Validate slug uniqueness if changed
    if (updates.slug && updates.slug !== product.slug) {
      const targetSlug = slugify(updates.slug);
      const existing = await Product.findOne({ tenantId, slug: targetSlug, _id: { $ne: product._id } });
      if (existing) {
        throw new ConflictError(`Slug '${targetSlug}' is already in use by another product in this store.`);
      }
      updates.slug = targetSlug;
    }

    // Validate SKU uniqueness if changed
    if (updates.sku && updates.sku.toUpperCase().trim() !== product.sku) {
      const targetSku = updates.sku.toUpperCase().trim();
      const existing = await Product.findOne({ tenantId, sku: targetSku, _id: { $ne: product._id } });
      if (existing) {
        throw new ConflictError(`SKU '${targetSku}' is already in use by another product in this store.`);
      }
      updates.sku = targetSku;
    }

    // Validate category if changed
    if (updates.category) {
      updates.category = String(updates.category).toLowerCase().trim();
      const existingCat = await Category.findOne({ tenantId, slug: updates.category });
      updates.categoryId = existingCat ? existingCat._id : null;
    }

    // Numerical stock quantity updates
    if (updates.stockQuantity !== undefined && updates.stockQuantity !== null) {
      const qty = Math.max(0, parseInt(updates.stockQuantity, 10));
      updates.stockQuantity = qty;
      updates.inventoryStatus = qty > 0 ? (qty <= 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
      updates.inStock = qty > 0;
    }

    // Currency update and sync with tenant settings
    if (updates.currency) {
      const c = String(updates.currency).toUpperCase().trim();
      const sym = updates.currencySymbol ? String(updates.currencySymbol).trim() : resolveCurrencySymbol(c);
      updates.currency = c;
      updates.currencySymbol = sym;

      if (req.tenant) {
        req.tenant.settings = req.tenant.settings || {};
        req.tenant.settings.currency = c;
        req.tenant.settings.currencySymbol = sym;
        await req.tenant.save();
      }
    }
    if (updates.price !== undefined && updates.priceUSD === undefined) {
      updates.priceUSD = Number(updates.price);
    }

    Object.assign(product, updates);
    await product.save();

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.PRODUCT_UPDATE,
      resource: 'Product',
      resourceId: product._id,
      details: { sku: product.sku, slug: product.slug },
      req,
    });

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tenant product
 */
export const deleteTenantProduct = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const product = await Product.findOneAndDelete({ tenantId, _id: id });
    if (!product) {
      throw new NotFoundError(`Product not found in this store.`);
    }

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.PRODUCT_DELETE,
      resource: 'Product',
      resourceId: product._id,
      details: { sku: product.sku, slug: product.slug, name: product.name },
      req,
    });

    res.json({
      success: true,
      message: 'Product deleted successfully.',
      id: product._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle publish status
 */
export const toggleTenantProductPublish = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const product = await Product.findOne({ tenantId, _id: id });
    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    product.isPublished = !product.isPublished;
    await product.save();

    res.json({
      success: true,
      isPublished: product.isPublished,
      message: `Product is now ${product.isPublished ? 'published live' : 'unpublished'}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock / inventory atomically
 */
export const updateTenantInventory = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;
    const { stockQuantity, variantSku, delta } = req.body;

    const product = await Product.findOne({ tenantId, _id: id });
    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    if (variantSku) {
      // Update specific variant inventory
      const variant = product.variants.find((v) => v.sku === String(variantSku).trim().toUpperCase());
      if (!variant) {
        throw new NotFoundError(`Variant SKU '${variantSku}' not found on product.`);
      }

      if (delta !== undefined) {
        const newQty = variant.stockQuantity + Number(delta);
        if (newQty < 0) {
          throw new BadRequestError(`Cannot decrement stock below 0. Current stock: ${variant.stockQuantity}`);
        }
        variant.stockQuantity = newQty;
      } else if (stockQuantity !== undefined) {
        variant.stockQuantity = Math.max(0, parseInt(stockQuantity, 10));
      }

      variant.inventoryStatus = variant.stockQuantity > 0
        ? (variant.stockQuantity <= 5 ? 'low_stock' : 'in_stock')
        : 'out_of_stock';
    } else {
      // Update root product inventory
      if (delta !== undefined) {
        const newQty = product.stockQuantity + Number(delta);
        if (newQty < 0) {
          throw new BadRequestError(`Cannot decrement stock below 0. Current stock: ${product.stockQuantity}`);
        }
        product.stockQuantity = newQty;
      } else if (stockQuantity !== undefined) {
        product.stockQuantity = Math.max(0, parseInt(stockQuantity, 10));
      }

      product.inventoryStatus = product.stockQuantity > 0
        ? (product.stockQuantity <= 5 ? 'low_stock' : 'in_stock')
        : 'out_of_stock';
      product.inStock = product.stockQuantity > 0;
    }

    await product.save();

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.INVENTORY_UPDATE,
      resource: 'Product',
      resourceId: product._id,
      details: {
        sku: product.sku,
        variantSku: variantSku || null,
        stockQuantity: variantSku ? undefined : product.stockQuantity,
      },
      req,
    });

    res.json({
      success: true,
      message: 'Inventory updated successfully.',
      stockQuantity: product.stockQuantity,
      inventoryStatus: product.inventoryStatus,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active store currency settings
 */
export const getStoreCurrencySettings = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const currency = tenant?.settings?.currency || 'USD';
    const currencySymbol = tenant?.settings?.currencySymbol || resolveCurrencySymbol(currency);
    res.json({
      success: true,
      currency,
      currencySymbol,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update store currency settings (applies across store and syncs all catalogue products)
 */
export const updateStoreCurrencySettings = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (!tenant) throw new NotFoundError('Store tenant context not found.');

    const { currency, currencySymbol } = req.body;
    if (!currency) throw new BadRequestError('Currency code is required (e.g. USD, INR, EUR, GBP, AED, CAD, AUD).');

    const cleanCurrency = String(currency).toUpperCase().trim();
    const cleanSymbol = currencySymbol ? String(currencySymbol).trim() : resolveCurrencySymbol(cleanCurrency);

    tenant.settings = tenant.settings || {};
    tenant.settings.currency = cleanCurrency;
    tenant.settings.currencySymbol = cleanSymbol;
    await tenant.save();

    // Propagate currency across all existing products for this tenant
    await Product.updateMany(
      { tenantId: tenant._id },
      { $set: { currency: cleanCurrency, currencySymbol: cleanSymbol } }
    );

    await logAudit({
      tenantId: tenant._id,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.TENANT_UPDATE,
      resource: 'TenantSettings',
      resourceId: tenant._id,
      details: { currency: cleanCurrency, currencySymbol: cleanSymbol },
      req,
    });

    res.json({
      success: true,
      message: `Store currency updated to ${cleanCurrency} (${cleanSymbol}).`,
      currency: cleanCurrency,
      currencySymbol: cleanSymbol,
    });
  } catch (error) {
    next(error);
  }
};
