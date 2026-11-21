import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

/**
 * Customer Coupon Validation Endpoint (Does NOT increment redemption count)
 * Supports both cartSubtotal and orderAmount payloads for resilient storefront interoperability.
 */
export const validateStorefrontCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { code } = req.body;
    // Accept either cartSubtotal or legacy orderAmount parameter
    const subtotal = Number(req.body.cartSubtotal ?? req.body.orderAmount) || 0;

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
      throw new BadRequestError(`Coupon '${coupon.code}' is currently inactive.`);
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
    if (subtotal < coupon.minimumOrderAmount) {
      throw new BadRequestError(
        `Coupon '${coupon.code}' requires a minimum purchase subtotal of ₹${coupon.minimumOrderAmount.toLocaleString('en-IN')}. Current subtotal is ₹${subtotal.toLocaleString('en-IN')}.`
      );
    }

    // 4. Usage Limit Check
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError(`Coupon '${coupon.code}' has reached its maximum allowed redemptions.`);
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

    const roundedDiscount = Math.round(discountAmount * 100) / 100;

    // Return unified contract: valid, coupon object, and direct fields for backwards & forwards compatibility
    res.json({
      success: true,
      valid: true,
      message: `Coupon '${coupon.code}' applied successfully.`,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: roundedDiscount,
        description: coupon.description || '',
        minimumOrderAmount: coupon.minimumOrderAmount,
        maximumDiscountAmount: coupon.maximumDiscountAmount,
      },
      code: coupon.code,
      discountAmount: roundedDiscount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: List Store Coupons
 * Supports search, status/type filters, pagination, and KPI counts
 */
export const listTenantCoupons = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const {
      search = '',
      status = 'all',
      discountType = 'all',
      page = 1,
      limit = 50,
    } = req.query;

    const now = new Date();

    // Auto-update expired coupons that are still marked active
    await Coupon.updateMany(
      { tenantId, expiryDate: { $lt: now }, status: 'active' },
      { $set: { status: 'expired' } }
    );

    // Summary KPIs across the tenant
    const [totalCoupons, activeCoupons, expiredCoupons, usageAggregation] = await Promise.all([
      Coupon.countDocuments({ tenantId }),
      Coupon.countDocuments({ tenantId, status: 'active', expiryDate: { $gte: now } }),
      Coupon.countDocuments({
        tenantId,
        $or: [{ status: 'expired' }, { expiryDate: { $lt: now } }],
      }),
      Coupon.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, totalUsed: { $sum: '$usedCount' } } },
      ]),
    ]);
    const totalUsage = usageAggregation[0]?.totalUsed || 0;

    // Filter Query Construction
    const filter = { tenantId };

    if (status && status !== 'all') {
      if (status === 'expired') {
        filter.$or = [{ status: 'expired' }, { expiryDate: { $lt: now } }];
      } else if (status === 'active') {
        filter.status = 'active';
        filter.expiryDate = { $gte: now };
      } else {
        filter.status = status;
      }
    }

    if (discountType && discountType !== 'all') {
      filter.discountType = discountType;
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ code: regex }, { description: regex }],
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const totalFiltered = await Coupon.countDocuments(filter);
    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      count: coupons.length,
      coupons,
      summary: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        totalUsage,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalFiltered,
        pages: Math.ceil(totalFiltered / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get Single Store Coupon
 */
export const getTenantCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({ tenantId, _id: id }).lean();
    if (!coupon) {
      throw new NotFoundError('Coupon not found in this store.');
    }

    res.json({
      success: true,
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get Coupon Usage History from Tenant Orders
 */
export const getTenantCouponUsage = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({ tenantId, _id: id }).lean();
    if (!coupon) {
      throw new NotFoundError('Coupon not found in this store.');
    }

    // Query orders that redeemed this coupon code
    const orders = await Order.find({
      tenantId,
      'pricing.coupon.code': coupon.code,
    })
      .select('orderNumber customerInfo pricing orderStatus paymentStatus createdAt items')
      .sort({ createdAt: -1 })
      .lean();

    const usages = orders.map((o) => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      customerName: o.customerInfo?.name || 'Customer',
      customerEmail: o.customerInfo?.email || 'N/A',
      customerPhone: o.customerInfo?.phone || '',
      discountAmount: o.pricing?.coupon?.discountAmount || o.pricing?.discount || 0,
      orderTotal: o.pricing?.totalPayable || 0,
      currency: o.pricing?.currencySymbol || '₹',
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      itemsCount: Array.isArray(o.items) ? o.items.length : 1,
      redeemedAt: o.createdAt,
    }));

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        usedCount: coupon.usedCount,
        usageLimit: coupon.usageLimit,
        status: coupon.status,
      },
      usages,
      totalRedemptions: usages.length,
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

    if (!code || !String(code).trim()) {
      throw new BadRequestError('Coupon code is required.');
    }
    if (!discountType || !['percentage', 'fixed_amount'].includes(discountType)) {
      throw new BadRequestError('Valid discountType is required (percentage or fixed_amount).');
    }
    if (discountValue === undefined || Number(discountValue) <= 0) {
      throw new BadRequestError('Discount value must be a positive number.');
    }
    if (discountType === 'percentage' && Number(discountValue) > 100) {
      throw new BadRequestError('Percentage discount value cannot exceed 100%.');
    }
    if (!expiryDate) {
      throw new BadRequestError('Expiry date is required.');
    }

    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) {
      throw new BadRequestError('Valid expiry date is required.');
    }

    const start = startDate ? new Date(startDate) : new Date();
    if (expiry <= start) {
      throw new BadRequestError('Expiry date must be later than the start date.');
    }

    const cleanCode = String(code).trim().toUpperCase();
    const normalizedCode = cleanCode.toLowerCase();

    if (!/^[A-Z0-9_-]+$/i.test(cleanCode)) {
      throw new BadRequestError('Coupon code can only contain letters, numbers, hyphens, and underscores.');
    }

    const existing = await Coupon.findOne({ tenantId, normalizedCode });
    if (existing) {
      throw new ConflictError(`Coupon code '${cleanCode}' already exists in this store.`);
    }

    const parsedMinOrder = minimumOrderAmount !== undefined && minimumOrderAmount !== ''
      ? Math.max(0, Number(minimumOrderAmount))
      : 0;

    const parsedMaxDiscount = maximumDiscountAmount !== undefined && maximumDiscountAmount !== '' && maximumDiscountAmount !== null
      ? Math.max(0, Number(maximumDiscountAmount))
      : null;

    const parsedUsageLimit = usageLimit !== undefined && usageLimit !== '' && usageLimit !== null
      ? Math.max(1, parseInt(usageLimit, 10))
      : null;

    const parsedPerCustomer = perCustomerUsageLimit !== undefined && perCustomerUsageLimit !== '' && perCustomerUsageLimit !== null
      ? Math.max(1, parseInt(perCustomerUsageLimit, 10))
      : 1;

    const coupon = await Coupon.create({
      tenantId,
      code: cleanCode,
      normalizedCode,
      description: description ? String(description).trim() : '',
      discountType,
      discountValue: Number(discountValue),
      minimumOrderAmount: parsedMinOrder,
      maximumDiscountAmount: parsedMaxDiscount,
      startDate: start,
      expiryDate: expiry,
      usageLimit: parsedUsageLimit,
      perCustomerUsageLimit: parsedPerCustomer,
      status: 'active',
    });

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.COUPON_CREATE,
      resource: 'Coupon',
      resourceId: coupon._id,
      details: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      req,
    });

    res.status(201).json({
      success: true,
      message: `Coupon '${coupon.code}' created successfully.`,
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
      status,
    } = req.body;

    // Validate Code update if provided
    if (code !== undefined) {
      const cleanCode = String(code).trim().toUpperCase();
      if (!cleanCode) {
        throw new BadRequestError('Coupon code cannot be empty.');
      }
      if (!/^[A-Z0-9_-]+$/i.test(cleanCode)) {
        throw new BadRequestError('Coupon code can only contain letters, numbers, hyphens, and underscores.');
      }
      const normalizedCode = cleanCode.toLowerCase();
      const existing = await Coupon.findOne({
        tenantId,
        normalizedCode,
        _id: { $ne: coupon._id },
      });
      if (existing) {
        throw new ConflictError(`Coupon code '${cleanCode}' is already taken.`);
      }
      coupon.code = cleanCode;
      coupon.normalizedCode = normalizedCode;
    }

    // Validate Discount Type and Value
    if (discountType !== undefined) {
      if (!['percentage', 'fixed_amount'].includes(discountType)) {
        throw new BadRequestError('Invalid discountType (must be percentage or fixed_amount).');
      }
      coupon.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const val = Number(discountValue);
      if (isNaN(val) || val <= 0) {
        throw new BadRequestError('Discount value must be a positive number.');
      }
      if (coupon.discountType === 'percentage' && val > 100) {
        throw new BadRequestError('Percentage discount value cannot exceed 100%.');
      }
      coupon.discountValue = val;
    }

    // Validate Dates
    let newStart = coupon.startDate;
    let newExpiry = coupon.expiryDate;

    if (startDate !== undefined) {
      newStart = new Date(startDate);
      if (isNaN(newStart.getTime())) {
        throw new BadRequestError('Invalid start date.');
      }
      coupon.startDate = newStart;
    }

    if (expiryDate !== undefined) {
      newExpiry = new Date(expiryDate);
      if (isNaN(newExpiry.getTime())) {
        throw new BadRequestError('Invalid expiry date.');
      }
      coupon.expiryDate = newExpiry;
    }

    if (newExpiry <= newStart) {
      throw new BadRequestError('Expiry date must be later than the start date.');
    }

    // Financial Constraints
    if (minimumOrderAmount !== undefined) {
      const minOrder = Number(minimumOrderAmount);
      if (isNaN(minOrder) || minOrder < 0) {
        throw new BadRequestError('Minimum order amount cannot be negative.');
      }
      coupon.minimumOrderAmount = minOrder;
    }

    if (maximumDiscountAmount !== undefined) {
      if (maximumDiscountAmount === '' || maximumDiscountAmount === null) {
        coupon.maximumDiscountAmount = null;
      } else {
        const maxDisc = Number(maximumDiscountAmount);
        if (isNaN(maxDisc) || maxDisc < 0) {
          throw new BadRequestError('Maximum discount cannot be negative.');
        }
        coupon.maximumDiscountAmount = maxDisc;
      }
    }

    // Usage limits
    if (usageLimit !== undefined) {
      if (usageLimit === '' || usageLimit === null) {
        coupon.usageLimit = null;
      } else {
        const lim = parseInt(usageLimit, 10);
        if (isNaN(lim) || lim < 1) {
          throw new BadRequestError('Total usage limit must be at least 1.');
        }
        if (coupon.usedCount > lim) {
          throw new BadRequestError(`Total usage limit (${lim}) cannot be less than already used count (${coupon.usedCount}).`);
        }
        coupon.usageLimit = lim;
      }
    }

    if (perCustomerUsageLimit !== undefined) {
      if (perCustomerUsageLimit === '' || perCustomerUsageLimit === null) {
        coupon.perCustomerUsageLimit = 1;
      } else {
        const custLim = parseInt(perCustomerUsageLimit, 10);
        if (isNaN(custLim) || custLim < 1) {
          throw new BadRequestError('Per-customer usage limit must be at least 1.');
        }
        coupon.perCustomerUsageLimit = custLim;
      }
    }

    if (description !== undefined) {
      coupon.description = String(description).trim();
    }

    // Status handling
    if (status !== undefined) {
      if (!['active', 'inactive', 'expired'].includes(status)) {
        throw new BadRequestError('Status must be active, inactive, or expired.');
      }
      if (status === 'active' && new Date() > coupon.expiryDate) {
        throw new BadRequestError('Cannot activate an expired coupon. Please update the expiry date first.');
      }
      coupon.status = status;
    }

    await coupon.save();

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.COUPON_UPDATE,
      resource: 'Coupon',
      resourceId: coupon._id,
      details: { code: coupon.code, status: coupon.status, usedCount: coupon.usedCount },
      req,
    });

    res.json({
      success: true,
      message: `Coupon '${coupon.code}' updated successfully.`,
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle Coupon Active / Inactive Status
 */
export const toggleTenantCouponStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      throw new BadRequestError("Status must be either 'active' or 'inactive'.");
    }

    const coupon = await Coupon.findOne({ tenantId, _id: id });
    if (!coupon) {
      throw new NotFoundError('Coupon not found in this store.');
    }

    if (status === 'active' && new Date() > coupon.expiryDate) {
      throw new BadRequestError('Cannot activate an expired coupon. Please extend the expiry date first.');
    }

    coupon.status = status;
    await coupon.save();

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.COUPON_UPDATE,
      resource: 'Coupon',
      resourceId: coupon._id,
      details: { code: coupon.code, status: coupon.status, toggle: true },
      req,
    });

    res.json({
      success: true,
      message: `Coupon '${coupon.code}' is now ${coupon.status}.`,
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Safe Delete Store Coupon
 * Prohibits hard deletion if the coupon has any redemption history to preserve order audit integrity.
 */
export const deleteTenantCoupon = async (req, res, next) => {
  try {
    const tenantId = req.tenant._id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({ tenantId, _id: id });
    if (!coupon) {
      throw new NotFoundError('Coupon not found in this store.');
    }

    // 1. Guard against deletion if coupon has recorded usedCount > 0
    if (coupon.usedCount > 0) {
      throw new BadRequestError(
        `Cannot delete coupon '${coupon.code}' because it has already been used in ${coupon.usedCount} order(s). Deactivate or archive it instead to preserve financial records.`
      );
    }

    // 2. Guard against deletion if historical order snapshots reference this coupon code
    const ordersWithCoupon = await Order.countDocuments({
      tenantId,
      'pricing.coupon.code': coupon.code,
    });

    if (ordersWithCoupon > 0) {
      throw new BadRequestError(
        `Cannot delete coupon '${coupon.code}' because ${ordersWithCoupon} historical order(s) reference it. Deactivate or archive it instead to preserve sales reporting.`
      );
    }

    await Coupon.deleteOne({ _id: coupon._id });

    await logAudit({
      tenantId,
      userId: req.user?._id,
      action: AUDIT_ACTIONS.COUPON_DELETE,
      resource: 'Coupon',
      resourceId: coupon._id,
      details: { code: coupon.code },
      req,
    });

    res.json({
      success: true,
      message: `Coupon '${coupon.code}' deleted successfully.`,
      id: coupon._id,
    });
  } catch (error) {
    next(error);
  }
};
