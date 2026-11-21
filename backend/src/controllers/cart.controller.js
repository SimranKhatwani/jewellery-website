import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { ensureAurelleProducts } from '../services/seedProducts.service.js';

/**
 * Helper to resolve or initialize tenant cart
 */
const getOrCreateCart = async (tenantId, userId, guestSessionId) => {
  let cart = null;

  if (userId) {
    cart = await Cart.findOne({ tenantId, userId });
  } else if (guestSessionId) {
    cart = await Cart.findOne({ tenantId, guestSessionId });
  }

  if (!cart) {
    cart = await Cart.create({
      tenantId,
      userId: userId || null,
      guestSessionId: !userId ? (guestSessionId || `gst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`) : null,
      items: [],
    });
  }

  return cart;
};

/**
 * Helper to recalculate cart pricing & format items
 */
const calculateCartTotals = async (cart, tenantId) => {
  const productIds = cart.items
    .map((i) => i.productId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
  const products = await Product.find({ _id: { $in: productIds }, tenantId }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let subtotal = 0;
  const verifiedItems = [];

  for (const item of cart.items) {
    const product = productMap.get(String(item.productId));
    if (!product || !product.isPublished) {
      // Product unpublished or removed from store
      continue;
    }

    let verifiedPrice = product.priceUSD;
    let verifiedSku = product.sku;
    let isAvailable =
      product.inventoryStatus !== 'out_of_stock' &&
      product.inStock !== false &&
      (product.stockQuantity === undefined || product.stockQuantity > 0);

    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
      if (variant) {
        if (variant.price !== null && variant.price !== undefined) {
          verifiedPrice = variant.price;
        }
        verifiedSku = variant.sku;
        if (variant.inventoryStatus === 'out_of_stock' || !variant.isActive) {
          isAvailable = false;
        }
      }
    }

    const itemTotal = verifiedPrice * item.quantity;
    subtotal += itemTotal;

    verifiedItems.push({
      _id: item._id,
      productId: product._id,
      name: product.name,
      slug: product.slug,
      primaryImage: product.primaryImage,
      variantId: item.variantId || null,
      sku: verifiedSku,
      selectedOptions: item.selectedOptions || {},
      quantity: item.quantity,
      price: verifiedPrice,
      totalPrice: itemTotal,
      isAvailable,
    });
  }

  let discount = 0;
  if (cart.appliedCoupon) {
    if (cart.appliedCoupon.discountType === 'percentage') {
      discount = (subtotal * cart.appliedCoupon.discountValue) / 100;
    } else if (cart.appliedCoupon.discountType === 'fixed_amount') {
      discount = Math.min(subtotal, cart.appliedCoupon.discountValue);
    }
  }

  const grandTotal = Math.max(0, subtotal - discount);

  return {
    cartId: cart._id,
    tenantId: cart.tenantId,
    guestSessionId: cart.guestSessionId,
    items: verifiedItems,
    itemCount: verifiedItems.reduce((acc, i) => acc + i.quantity, 0),
    subtotal,
    discount,
    appliedCoupon: cart.appliedCoupon,
    grandTotal,
    updatedAt: cart.updatedAt,
  };
};

/**
 * GET cart for tenant
 */
export const getCart = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.query.guestSessionId;

    if (!userId && !guestSessionId) {
      // Return fresh empty guest session
      const newSessionId = `gst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newCart = await Cart.create({ tenantId, guestSessionId: newSessionId, items: [] });
      const totals = await calculateCartTotals(newCart, tenantId);
      return res.json({ success: true, cart: totals });
    }

    const cart = await getOrCreateCart(tenantId, userId, guestSessionId);
    const totals = await calculateCartTotals(cart, tenantId);

    res.json({
      success: true,
      cart: totals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to tenant cart
 */
export const addCartItem = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.body.guestSessionId;

    const { productId, variantId, quantity = 1, selectedOptions = {} } = req.body;
    if (!productId) {
      throw new BadRequestError('Product ID is required.');
    }

    const reqQty = Math.max(1, parseInt(quantity, 10));

    // 1. Resolve product: robustly supports ObjectId, slug, SKU, or name
    let product = null;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findOne({ _id: productId, tenantId, isPublished: true });
    }
    if (!product) {
      const cleanId = String(productId).trim();
      product = await Product.findOne({
        tenantId,
        isPublished: true,
        $or: [
          { slug: cleanId.toLowerCase() },
          { sku: cleanId },
          { name: cleanId },
        ],
      });
    }

    // Auto-seed Aurelle catalog if not yet seeded
    if (!product && req.tenant.slug === 'aurelle') {
      await ensureAurelleProducts(tenantId);
      if (mongoose.Types.ObjectId.isValid(productId)) {
        product = await Product.findOne({ _id: productId, tenantId, isPublished: true });
      }
      if (!product) {
        const cleanId = String(productId).trim();
        product = await Product.findOne({
          tenantId,
          isPublished: true,
          $or: [
            { slug: cleanId.toLowerCase() },
            { sku: cleanId },
          ],
        });
      }
    }

    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    // 2. Validate variant if provided
    let verifiedPrice = product.priceUSD;
    let verifiedSku = product.sku;

    const validVariantId = (variantId && mongoose.Types.ObjectId.isValid(variantId)) ? variantId : null;
    if (validVariantId) {
      const variant = (product.variants || []).find((v) => String(v._id) === String(validVariantId));
      if (!variant) {
        throw new NotFoundError(`Variant '${variantId}' does not belong to this product.`);
      }
      if (!variant.isActive || variant.inventoryStatus === 'out_of_stock') {
        throw new BadRequestError('Selected variant is currently out of stock.');
      }
      if (variant.price !== null && variant.price !== undefined) {
        verifiedPrice = variant.price;
      }
      verifiedSku = variant.sku;

      // Stock check if numerical stock is tracked
      if (variant.inventoryStatus !== 'unknown' && variant.stockQuantity < reqQty) {
        throw new BadRequestError(`Only ${variant.stockQuantity} unit(s) available for selected variant.`);
      }
    } else {
      if (product.inventoryStatus === 'out_of_stock' || product.inStock === false || product.stockQuantity === 0) {
        throw new BadRequestError('Product is currently out of stock.');
      }
      if (product.inventoryStatus !== 'unknown' && product.stockQuantity > 0 && product.stockQuantity < reqQty) {
        throw new BadRequestError(`Only ${product.stockQuantity} unit(s) available in stock.`);
      }
    }

    // 3. Resolve cart
    const cart = await getOrCreateCart(tenantId, userId, guestSessionId);

    // 4. Check if item already exists in cart (same productId + variantId)
    const existingIndex = cart.items.findIndex((item) => {
      const sameProd = String(item.productId) === String(product._id);
      const sameVariant = validVariantId ? String(item.variantId) === String(validVariantId) : !item.variantId;
      return sameProd && sameVariant;
    });

    if (existingIndex > -1) {
      const totalRequested = cart.items[existingIndex].quantity + reqQty;
      if (!validVariantId && product.stockQuantity !== undefined && product.stockQuantity > 0 && totalRequested > product.stockQuantity) {
        throw new BadRequestError(
          `Cannot add more. You have ${cart.items[existingIndex].quantity} in cart and only ${product.stockQuantity} unit(s) available.`
        );
      }
      cart.items[existingIndex].quantity = totalRequested;
      cart.items[existingIndex].price = verifiedPrice;
    } else {
      cart.items.push({
        productId: product._id,
        variantId: validVariantId,
        sku: verifiedSku,
        selectedOptions,
        quantity: reqQty,
        price: verifiedPrice,
      });
    }

    cart.lastActivityAt = new Date();
    await cart.save();

    const totals = await calculateCartTotals(cart, tenantId);

    res.json({
      success: true,
      message: 'Item added to cart.',
      cart: totals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update item quantity in cart
 */
export const updateCartItemQuantity = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.query.guestSessionId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      throw new BadRequestError('Quantity is required.');
    }

    const newQty = parseInt(quantity, 10);
    const cart = await getOrCreateCart(tenantId, userId, guestSessionId);

    const itemIndex = cart.items.findIndex((i) => String(i._id) === String(itemId));
    if (itemIndex === -1) {
      throw new NotFoundError('Item not found in cart.');
    }

    if (newQty <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Validate stock
      const targetItem = cart.items[itemIndex];
      const product = await Product.findOne({ _id: targetItem.productId, tenantId });
      if (product && product.stockQuantity > 0 && product.inventoryStatus !== 'unknown' && product.stockQuantity < newQty) {
        throw new BadRequestError(`Cannot increase quantity beyond available stock (${product.stockQuantity}).`);
      }
      targetItem.quantity = newQty;
    }

    cart.lastActivityAt = new Date();
    await cart.save();

    const totals = await calculateCartTotals(cart, tenantId);

    res.json({
      success: true,
      message: newQty <= 0 ? 'Item removed from cart.' : 'Cart item quantity updated.',
      cart: totals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove single item from cart
 */
export const removeCartItem = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.query.guestSessionId;
    const { itemId } = req.params;

    const cart = await getOrCreateCart(tenantId, userId, guestSessionId);
    cart.items = cart.items.filter((i) => String(i._id) !== String(itemId));
    cart.lastActivityAt = new Date();
    await cart.save();

    const totals = await calculateCartTotals(cart, tenantId);

    res.json({
      success: true,
      message: 'Item removed from cart.',
      cart: totals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all items from cart
 */
export const clearCart = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.query.guestSessionId;

    const cart = await getOrCreateCart(tenantId, userId, guestSessionId);
    cart.items = [];
    cart.appliedCoupon = null;
    cart.lastActivityAt = new Date();
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully.',
      cart: {
        cartId: cart._id,
        items: [],
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        grandTotal: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Merge guest cart into customer cart upon login within the same tenant
 */
export const mergeGuestCart = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const userId = req.user._id;
    const { guestSessionId } = req.body;

    if (!guestSessionId) {
      throw new BadRequestError('guestSessionId is required for cart merging.');
    }

    const guestCart = await Cart.findOne({ tenantId, guestSessionId });
    if (!guestCart || guestCart.items.length === 0) {
      // Nothing to merge
      const userCart = await getOrCreateCart(tenantId, userId, null);
      const totals = await calculateCartTotals(userCart, tenantId);
      return res.json({ success: true, message: 'No guest items to merge.', cart: totals });
    }

    const userCart = await getOrCreateCart(tenantId, userId, null);

    // Merge strategy: for each guest item, revalidate product and stock, then merge
    for (const gItem of guestCart.items) {
      const product = await Product.findOne({ _id: gItem.productId, tenantId, isPublished: true });
      if (!product) continue;

      const existingIndex = userCart.items.findIndex(
        (uItem) =>
          String(uItem.productId) === String(gItem.productId) &&
          String(uItem.variantId || '') === String(gItem.variantId || '')
      );

      if (existingIndex > -1) {
        userCart.items[existingIndex].quantity += gItem.quantity;
      } else {
        userCart.items.push(gItem);
      }
    }

    userCart.lastActivityAt = new Date();
    await userCart.save();

    // Delete or clear the merged guest cart
    await Cart.deleteOne({ _id: guestCart._id });

    const totals = await calculateCartTotals(userCart, tenantId);

    res.json({
      success: true,
      message: 'Guest cart successfully merged into your customer account.',
      cart: totals,
    });
  } catch (error) {
    next(error);
  }
};
