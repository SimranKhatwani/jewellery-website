import { Router } from 'express';
import { resolveTenant } from '../middleware/tenant.js';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/auth.js';
import * as storefrontController from '../controllers/storefront.controller.js';
import * as cartController from '../controllers/cart.controller.js';
import * as wishlistController from '../controllers/wishlist.controller.js';
import * as couponController from '../controllers/coupon.controller.js';
import * as checkoutPreviewController from '../controllers/checkoutPreview.controller.js';

const router = Router({ mergeParams: true });

// Resolve tenant for all storefront routes (does not require staff membership)
router.use('/:storeSlug', resolveTenant({ requireMembership: false }));

/**
 * 1. Public Storefront Catalog APIs
 */
router.get('/:storeSlug', storefrontController.getStoreInfo);
router.get('/:storeSlug/info', storefrontController.getStoreInfo);
router.get('/:storeSlug/products', storefrontController.getStorefrontProducts);
router.get('/:storeSlug/products/:productSlug', storefrontController.getStorefrontProductDetail);
router.get('/:storeSlug/categories', storefrontController.getStorefrontCategories);

/**
 * 2. Tenant-Scoped Cart APIs (Guest + Authenticated Customer)
 */
router.get('/:storeSlug/cart', optionalAuthenticateUser, cartController.getCart);
router.post('/:storeSlug/cart/items', optionalAuthenticateUser, cartController.addCartItem);
router.patch('/:storeSlug/cart/items/:itemId', optionalAuthenticateUser, cartController.updateCartItemQuantity);
router.delete('/:storeSlug/cart/items/:itemId', optionalAuthenticateUser, cartController.removeCartItem);
router.delete('/:storeSlug/cart', optionalAuthenticateUser, cartController.clearCart);
router.post('/:storeSlug/cart/merge', authenticateUser, cartController.mergeGuestCart);

/**
 * 3. Tenant-Scoped Customer Wishlist APIs
 */
router.get('/:storeSlug/wishlist', authenticateUser, wishlistController.getWishlist);
router.post('/:storeSlug/wishlist/items', authenticateUser, wishlistController.addWishlistItem);
router.delete('/:storeSlug/wishlist/items/:productId', authenticateUser, wishlistController.removeWishlistItem);
router.post('/:storeSlug/wishlist/items/:productId/move-to-cart', authenticateUser, wishlistController.moveWishlistToCart);

/**
 * 4. Tenant-Scoped Coupon Validation
 */
router.post('/:storeSlug/coupons/validate', couponController.validateStorefrontCoupon);
router.post('/:storeSlug/coupon/validate', couponController.validateStorefrontCoupon);

/**
 * 5. Tenant-Scoped Checkout Preview
 */
router.post('/:storeSlug/checkout/preview', optionalAuthenticateUser, checkoutPreviewController.previewStorefrontCheckout);

export default router;
