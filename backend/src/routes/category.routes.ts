import { Router, Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

const slugify = (text: string): string => {
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
 * GET /api/categories
 * Public endpoint: Return active categories
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/admin/all
 * Protected endpoint: Return all categories for admin
 */
router.get('/admin/all', authenticateAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Category.find()
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories
 * Protected endpoint: Create category
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, displayOrder, isActive } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
      return;
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);

    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'A category with this slug already exists.',
      });
      return;
    }

    const category = new Category({
      name,
      slug: finalSlug,
      description: description || '',
      displayOrder: displayOrder !== undefined ? displayOrder : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/categories/:id
 * Protected endpoint: Update category
 */
router.put('/:id', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.name && !updates.slug) {
      updates.slug = slugify(updates.name);
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug);
    }

    const updated = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Category updated successfully.',
      category: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:id
 * Protected endpoint: Delete category
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Category deleted successfully.',
      id: deleted._id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
