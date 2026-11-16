import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';

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

/**
 * List categories for tenant
 */
export const listTenantCategories = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.json({ success: true, count: 0, categories: [] });
    }
    const tenantId = req.tenant._id;
    const filter = { tenantId };

    if (req.isStorefront || req.query.activeOnly === 'true') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
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
 * Storefront Category List (Public)
 */
export const listStorefrontCategories = (req, res, next) => {
  req.isStorefront = true;
  return listTenantCategories(req, res, next);
};

/**
 * Get single category by slug or ID
 */
export const getTenantCategory = async (req, res, next) => {
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

    const category = await Category.findOne(query).lean();
    if (!category) {
      throw new NotFoundError(`Category '${identifier}' not found in this store.`);
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Storefront Get Category Detail (Public)
 */
export const getStorefrontCategory = (req, res, next) => {
  req.isStorefront = true;
  return getTenantCategory(req, res, next);
};

/**
 * Create category for tenant
 */
export const createTenantCategory = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { name, slug, description, displayOrder, isActive, parentId, imageUrl } = req.body;

    if (!name) {
      throw new BadRequestError('Category name is required.');
    }

    const targetSlug = slug ? slugify(slug) : slugify(name);
    const existing = await Category.findOne({ tenantId, slug: targetSlug });
    if (existing) {
      throw new ConflictError(`Category with slug '${targetSlug}' already exists in this store.`);
    }

    let validParentId = null;
    if (parentId) {
      const parent = await Category.findOne({ tenantId, _id: parentId });
      if (!parent) {
        throw new NotFoundError(`Parent category '${parentId}' not found in this store.`);
      }
      validParentId = parent._id;
    }

    const category = await Category.create({
      tenantId,
      name: name.trim(),
      slug: targetSlug,
      description: description || '',
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isActive: isActive !== false,
      parentId: validParentId,
      imageUrl: imageUrl || '',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category for tenant
 */
export const updateTenantCategory = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const category = await Category.findOne({ tenantId, _id: id });
    if (!category) {
      throw new NotFoundError('Category not found in this store.');
    }

    const updates = { ...req.body };

    if (updates.slug && updates.slug !== category.slug) {
      const targetSlug = slugify(updates.slug);
      const existing = await Category.findOne({ tenantId, slug: targetSlug, _id: { $ne: category._id } });
      if (existing) {
        throw new ConflictError(`Category slug '${targetSlug}' is already in use in this store.`);
      }
      updates.slug = targetSlug;
    }

    if (updates.parentId) {
      if (String(updates.parentId) === String(category._id)) {
        throw new BadRequestError('Category cannot be its own parent.');
      }
      const parent = await Category.findOne({ tenantId, _id: updates.parentId });
      if (!parent) {
        throw new NotFoundError('Parent category not found in this store.');
      }
    }

    Object.assign(category, updates);
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category for tenant (Prevent deletion if products still reference it)
 */
export const deleteTenantCategory = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const category = await Category.findOne({ tenantId, _id: id });
    if (!category) {
      throw new NotFoundError('Category not found in this store.');
    }

    // Check if products reference this category
    const productCount = await Product.countDocuments({
      tenantId,
      $or: [{ categoryId: category._id }, { category: category.slug }],
    });

    if (productCount > 0) {
      throw new BadRequestError(
        `Cannot delete category '${category.name}' because ${productCount} product(s) in this store still reference it. Please reassign the products first.`
      );
    }

    await Category.deleteOne({ _id: category._id });

    res.json({
      success: true,
      message: 'Category deleted successfully.',
      id: category._id,
    });
  } catch (error) {
    next(error);
  }
};
