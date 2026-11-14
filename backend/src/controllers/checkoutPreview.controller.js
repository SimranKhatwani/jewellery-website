import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Address } from '../models/Address.js';
import { Coupon } from '../models/Coupon.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * POST /api/v1/storefront/:storeSlug/checkout/preview
 * Calculates verified subtotal, discounts, tax, shipping and payable total.
 * Performs stock revalidation without creating orders or reserving stock.
 */
export const previewStorefrontCheckout = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const tenantId = tenant._id;
    const userId = req.user ? req.user._id : null;
    const guestSessionId = req.headers['x-guest-session-id'] || req.body.guestSessionId;

    const {
      addressId,
      guestAddress,
      couponCode,
    } = req.body;

    // 1. Retrieve tenant-scoped Cart
    let cart = null;
    if (userId) {
      cart = await Cart.findOne({ tenantId, userId });
    } else if (guestSessionId) {
      cart = await Cart.findOne({ tenantId, guestSessionId });
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cannot prepare checkout with an empty cart.');
    }

    // 2. Validate Address (Authenticated addressId OR Guest shipping details)
    let selectedAddress = null;
    if (userId && addressId) {
      selectedAddress = await Address.findOne({ _id: addressId, userId });
      if (!selectedAddress) {
        throw new NotFoundError('Selected address was not found or does not belong to your account.');
      }
    } else if (guestAddress && typeof guestAddress === 'object') {
      const hasName = Boolean(guestAddress.name && String(guestAddress.name).trim());
      const hasAddress = Boolean(guestAddress.addressLine1 && String(guestAddress.addressLine1).trim());
      if (hasName && hasAddress) {
        selectedAddress = {
          name: String(guestAddress.name).trim(),
          phone: String(guestAddress.phone || '').trim(),
          addressLine1: String(guestAddress.addressLine1).trim(),
          addressLine2: String(guestAddress.addressLine2 || '').trim(),
          city: String(guestAddress.city || '').trim(),
          state: String(guestAddress.state || '').trim(),
          postalCode: String(guestAddress.postalCode || '').trim(),
          country: String(guestAddress.country || 'India').trim(),
          isGuest: true,
        };
      }
    }

    // 3. Revalidate every item against database (Stock, Active Status, Authoritative Price)
    const productIds = cart.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, tenantId }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    let subtotal = 0;
    const lineItems = [];
    const stockWarnings = [];

    for (const item of cart.items) {
      const product = productMap.get(String(item.productId));
      if (!product || !product.isPublished) {
        throw new BadRequestError(`Product '${item.sku}' is no longer available in this store.`);
      }

      let price = product.priceUSD;
      let sku = product.sku;

      if (item.variantId && Array.isArray(product.variants)) {
        const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
        if (!variant || !variant.isActive) {
          throw new BadRequestError(`Selected variant for '${product.name}' is no longer available.`);
        }
        if (variant.price !== null && variant.price !== undefined) {
          price = variant.price;
        }
        sku = variant.sku;

        if (variant.inventoryStatus === 'out_of_stock' || (variant.stockQuantity > 0 && variant.stockQuantity < item.quantity)) {
          stockWarnings.push(`Only ${variant.stockQuantity || 0} unit(s) remaining for variant '${variant.name}'.`);
        }
      } else {
        if (product.inventoryStatus === 'out_of_stock' || product.inStock === false) {
          stockWarnings.push(`Product '${product.name}' is currently out of stock.`);
        } else if (product.inventoryStatus !== 'unknown' && product.stockQuantity > 0 && product.stockQuantity < item.quantity) {
          stockWarnings.push(`Only ${product.stockQuantity} unit(s) remaining for '${product.name}'.`);
        }
      }

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      lineItems.push({
        productId: product._id,
        name: product.name,
        slug: product.slug,
        primaryImage: product.primaryImage,
        sku,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price,
        total: itemTotal,
      });
    }

    // 4. Validate Coupon (from request body or saved in cart)
    let discount = 0;
    let verifiedCoupon = null;
    const targetCode = couponCode || cart.appliedCoupon?.code;

    if (targetCode) {
      const normalized = String(targetCode).trim().toLowerCase();
      const coupon = await Coupon.findOne({ tenantId, normalizedCode: normalized });

      if (coupon && coupon.status === 'active') {
        const now = new Date();
        const isValidDate = (!coupon.startDate || now >= coupon.startDate) && now <= coupon.expiryDate;
        const meetsMinimum = subtotal >= coupon.minimumOrderAmount;
        const withinUsage = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit;

        if (isValidDate && meetsMinimum && withinUsage) {
          if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maximumDiscountAmount !== null && discount > coupon.maximumDiscountAmount) {
              discount = coupon.maximumDiscountAmount;
            }
          } else if (coupon.discountType === 'fixed_amount') {
            discount = Math.min(subtotal, coupon.discountValue);
          }
          verifiedCoupon = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: Math.round(discount * 100) / 100,
          };
        }
      }
    }

    // 5. Configured Tax & Delivery calculation (without fabricating unconfigured rates)
    const taxRate = tenant.settings?.taxRate ? Number(tenant.settings.taxRate) : 0;
    const taxAmount = taxRate > 0 ? Math.round(((subtotal - discount) * taxRate) / 100) : 0;

    // Delivery calculation (e.g. standard complimentary delivery on luxury fine jewellery)
    const configuredShipping = tenant.settings?.shippingFee !== undefined ? Number(tenant.settings.shippingFee) : 0;
    const shippingAmount = configuredShipping;

    const totalPayable = Math.max(0, subtotal - discount + taxAmount + shippingAmount);
    const currency = tenant.settings?.currency || 'USD';
    const currencySymbol = tenant.settings?.currencySymbol || (currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$')));

    res.json({
      success: true,
      checkoutPreview: {
        store: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          currency,
          currencySymbol,
        },
        items: lineItems,
        itemCount: lineItems.reduce((acc, i) => acc + i.quantity, 0),
        address: selectedAddress,
        pricing: {
          currency,
          currencySymbol,
          subtotal,
          discount: Math.round(discount * 100) / 100,
          coupon: verifiedCoupon,
          taxRate: taxRate > 0 ? `${taxRate}%` : 'Complimentary / Inclusive',
          taxAmount,
          shippingFee: shippingAmount === 0 ? 'Complimentary Insured Delivery' : shippingAmount,
          shippingAmount,
          totalPayable: Math.round(totalPayable * 100) / 100,
        },
        stockWarnings,
        hasWarnings: stockWarnings.length > 0,
        disclaimer: 'This is a checkout preparation preview. No order or payment has been executed.',
      },
    });
  } catch (error) {
    next(error);
  }
};
