import { Router, Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

// Helper to generate a URL-safe slug from a product name
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
 * GET /api/products
 * Public endpoint: Returns all published products sorted by displayOrder
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, search, bestseller, newArrival } = req.query;

    const filter: Record<string, unknown> = {
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

    const products = await Product.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/admin/all
 * Protected endpoint: Returns ALL products (published & unpublished) for admin management
 */
router.get('/admin/all', authenticateAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:slugOrId
 * Public endpoint: Find a single product by slug or MongoDB ObjectId
 */
router.get('/:slugOrId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slugOrId = (req.params.slugOrId as string) || '';

    const query: Record<string, unknown> = {
      $or: [
        { slug: slugOrId.toLowerCase() },
        ...(slugOrId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: slugOrId }] : []),
      ],
    };

    const product = await Product.findOne(query).lean();

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found in catalogue.',
      });
      return;
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products
 * Protected endpoint: Create a new product in the database
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = req.body;

    if (!payload.name || !payload.category || payload.priceUSD === undefined) {
      res.status(400).json({
        success: false,
        message: 'Product name, category, and priceUSD are required fields.',
      });
      return;
    }

    // Generate or format slug
    let baseSlug = payload.slug ? slugify(payload.slug) : slugify(payload.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await Product.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    payload.slug = finalSlug;

    // Generate SKU if missing
    if (!payload.sku) {
      const catCode = payload.category.substring(0, 3).toUpperCase();
      payload.sku = `AUR-${catCode}-${Date.now().toString().slice(-4)}`;
    }

    const newProduct = new Product(payload);
    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product successfully created and saved to catalogue.',
      product: newProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/products/:id
 * Protected endpoint: Update an existing product
 */
router.put('/:id', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If slug is changed, ensure it is unique and slugified
    if (updates.slug) {
      updates.slug = slugify(updates.slug);
      const existing = await Product.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'Another product with this slug already exists.',
        });
        return;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      res.status(404).json({
        success: false,
        message: 'Product not found to update.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Product successfully updated.',
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/products/:id
 * Protected endpoint: Remove a product from the database
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Product not found to delete.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Product successfully deleted from catalogue.',
      id: deleted._id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/products/:id/toggle-publish
 * Protected endpoint: Quickly toggle publish status
 */
router.patch('/:id/toggle-publish', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    product.isPublished = !product.isPublished;
    await product.save();

    res.json({
      success: true,
      message: `Product is now ${product.isPublished ? 'published' : 'unpublished'}.`,
      isPublished: product.isPublished,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
