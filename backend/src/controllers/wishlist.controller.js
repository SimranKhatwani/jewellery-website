import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';
import { Cart } from '../models/Cart.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Get customer wishlist for tenant
 */
export const getWishlist = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user._id;

    let wishlist = await Wishlist.findOne({ tenantId, userId }).populate({
      path: 'items.productId',
      select: 'name slug priceUSD primaryImage category isPublished inStock inventoryStatus stockQuantity',
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ tenantId, userId, items: [] });
    }

    // Filter out unpublished or deleted products
    const validItems = (wishlist.items || [])
      .filter((i) => i.productId && i.productId.isPublished !== false)
      .map((i) => ({
        _id: i._id,
        productId: i.productId._id,
        name: i.productId.name,
        slug: i.productId.slug,
        priceUSD: i.productId.priceUSD,
        primaryImage: i.productId.primaryImage,
        category: i.productId.category,
        inStock: i.productId.inStock,
        inventoryStatus: i.productId.inventoryStatus,
        addedAt: i.addedAt,
      }));

    res.json({
      success: true,
      count: validItems.length,
      wishlist: {
        id: wishlist._id,
        tenantId,
        items: validItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add product to customer wishlist
 */
export const addWishlistItem = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      throw new BadRequestError('Product ID is required.');
    }

    // Validate product belongs to tenant and is active
    const product = await Product.findOne({ _id: productId, tenantId });
    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    let wishlist = await Wishlist.findOne({ tenantId, userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ tenantId, userId, items: [] });
    }

    // Check if already in wishlist
    const exists = wishlist.items.some((i) => String(i.productId) === String(product._id));
    if (!exists) {
      wishlist.items.push({ productId: product._id });
      await wishlist.save();
    }

    res.json({
      success: true,
      message: 'Product added to your wishlist.',
      count: wishlist.items.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove product from customer wishlist
 */
export const removeWishlistItem = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user._id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ tenantId, userId });
    if (!wishlist) {
      return res.json({ success: true, message: 'Item removed from wishlist.' });
    }

    wishlist.items = wishlist.items.filter((i) => String(i.productId) !== String(productId));
    await wishlist.save();

    res.json({
      success: true,
      message: 'Product removed from your wishlist.',
      count: wishlist.items.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move product from wishlist to cart
 */
export const moveWishlistToCart = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user._id;
    const { productId } = req.params;

    const product = await Product.findOne({ _id: productId, tenantId, isPublished: true });
    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    // 1. Add to customer cart
    let cart = await Cart.findOne({ tenantId, userId });
    if (!cart) {
      cart = await Cart.create({ tenantId, userId, items: [] });
    }

    const existingIndex = cart.items.findIndex((i) => String(i.productId) === String(product._id) && !i.variantId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += 1;
    } else {
      cart.items.push({
        productId: product._id,
        sku: product.sku,
        quantity: 1,
        price: product.priceUSD,
      });
    }
    cart.lastActivityAt = new Date();
    await cart.save();

    // 2. Remove from wishlist
    await Wishlist.updateOne(
      { tenantId, userId },
      { $pull: { items: { productId: product._id } } }
    );

    res.json({
      success: true,
      message: 'Product moved from wishlist to your cart.',
    });
  } catch (error) {
    next(error);
  }
};
