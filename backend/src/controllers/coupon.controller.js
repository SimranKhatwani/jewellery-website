import { Coupon } from '../models/Coupon.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

/**
 * Customer Coupon Validation Endpoint (Does NOT increment redemption count)
 */
export const validateStorefrontCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { code, cartSubtotal = 0 } = req.body;

    if (!code || !String(code).trim()) {
      throw new BadRequestError('Coupon code is required.');
    }

    const normalizedCode = String(code).trim().toLowerCase();
    const coupon = await Coupon.findOne({ tenantId, normalizedCode });

    if (!coupon) {
      throw new NotFoundError(`Coupon code '${code}' is invalid for this store.`);
    }

    // 1. Status Check
    if (coupon.status !== 'active') {
      throw new BadRequestError(`Coupon '${coupon.code}' is no longer active.`);
    }

    // 2. Date Validity Check
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      throw new BadRequestError(`Coupon '${coupon.code}' is not yet active.`);
    }
    if (now > coupon.expiryDate) {
      coupon.status = 'expired';
      await coupon.save();
      throw new BadRequestError(`Coupon '${coupon.code}' expired on ${coupon.expiryDate.toLocaleDateString()}.`);
    }

    // 3. Minimum Order Subtotal Check
    const subtotal = Number(cartSubtotal) || 0;
    if (subtotal < coupon.minimumOrderAmount) {
      throw new BadRequestError(
        `Coupon requires a minimum purchase subtotal of ₹${coupon.minimumOrderAmount.toLocaleString()}. Current subtotal is ₹${subtotal.toLocaleString()}.`
      );
    }

    // 4. Usage Limit Check
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError(`Coupon '${coupon.code}' has reached its maximum total redemptions.`);
    }

    // 5. Calculate Discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maximumDiscountAmount !== null && discountAmount > coupon.maximumDiscountAmount) {
        discountAmount = coupon.maximumDiscountAmount;
      }
    } else if (coupon.discountType === 'fixed_amount') {
      discountAmount = Math.min(subtotal, coupon.discountValue);
    }

    res.json({
      success: true,
      message: `Coupon '${coupon.code}' applied successfully.`,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
        description: coupon.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: List Store Coupons
 */
export const listTenantCoupons = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const coupons = await Coupon.find({ tenantId }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create Store Coupon
 */
export const createTenantCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      startDate,
      expiryDate,
      usageLimit,
      perCustomerUsageLimit,
    } = req.body;

    if (!code || !discountType || discountValue === undefined || !expiryDate) {
      throw new BadRequestError('Required coupon fields: code, discountType, discountValue, expiryDate.');
    }

    const cleanCode = String(code).trim().toUpperCase();
    const normalizedCode = cleanCode.toLowerCase();

    const existing = await Coupon.findOne({ tenantId, normalizedCode });
    if (existing) {
      throw new ConflictError(`Coupon '${cleanCode}' already exists in this store.`);
    }

    const coupon = await Coupon.create({
      tenantId,
      code: cleanCode,
      normalizedCode,
      description: description || '',
      discountType,
      discountValue: Number(discountValue),
      minimumOrderAmount: minimumOrderAmount ? Number(minimumOrderAmount) : 0,
      maximumDiscountAmount: maximumDiscountAmount ? Number(maximumDiscountAmount) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perCustomerUsageLimit: perCustomerUsageLimit ? Number(perCustomerUsageLimit) : 1,
      status: 'active',
    });

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.COUPON_CREATE,
      resource: 'Coupon',
      resourceId: coupon._id,
      details: { code: coupon.code, discountType: coupon.discountType },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Store Coupon
 */
export const updateTenantCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({ tenantId, _id: id });
    if (!coupon) {
      throw new NotFoundError('Coupon not found in this store.');
    }

    const updates = { ...req.body };
    delete updates.tenantId;

    if (updates.code) {
      updates.code = String(updates.code).trim().toUpperCase();
      updates.normalizedCode = updates.code.toLowerCase();

      const existing = await Coupon.findOne({
        tenantId,
        normalizedCode: updates.normalizedCode,
        _id: { $ne: coupon._id },
      });
      if (existing) {
        throw new ConflictError(`Coupon code '${updates.code}' is already taken.`);
      }
    }

    Object.assign(coupon, updates);
    await coupon.save();

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.COUPON_UPDATE,
      resource: 'Coupon',
      resourceId: coupon._id,
      details: { code: coupon.code, status: coupon.status },
      req,
    });

    res.json({
      success: true,
      message: 'Coupon updated successfully.',
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Store Coupon
 */
export const deleteTenantCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const coupon = await Coupon.findOneAndDelete({ tenantId, _id: id });
    if (!coupon) {
      throw new NotFoundError('Coupon not found in this store.');
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully.',
      id: coupon._id,
    });
  } catch (error) {
    next(error);
  }
};
