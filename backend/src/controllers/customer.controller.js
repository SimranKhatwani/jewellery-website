import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Auto-sync helper: ensures an existing User is mirrored into the `customers` collection
 */
async function ensureCustomerRecord(user, tenantId = null) {
  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    const defaultTenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    resolvedTenantId = defaultTenant?._id || null;
  }

  let customer = await Customer.findOne({
    $or: [{ userId: user._id }, { email: user.email }],
  });

  if (!customer) {
    customer = await Customer.create({
      tenantId: resolvedTenantId,
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber || '',
      status: user.status || 'active',
      totalOrders: 0,
      totalSpent: 0,
    });
  } else {
    let changed = false;
    if (!customer.userId) {
      customer.userId = user._id;
      changed = true;
    }
    if (resolvedTenantId && !customer.tenantId) {
      customer.tenantId = resolvedTenantId;
      changed = true;
    }
    if (user.phoneNumber && !customer.phone) {
      customer.phone = user.phoneNumber;
      changed = true;
    }
    if (changed) {
      await customer.save();
    }
  }

  return customer;
}

/**
 * GET /api/v1/customers/me
 * Retrieve current authenticated customer profile directly backed by `customers` collection
 */
export const getCustomerProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const customer = await ensureCustomerRecord(user, req.tenant?._id);

    const contactPhone = customer.phone || user.phoneNumber || '';
    const nameParts = (customer.name || user.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    res.json({
      success: true,
      customer: {
        id: customer._id,
        userId: user._id,
        tenantId: customer.tenantId,
        name: customer.name || user.name,
        firstName,
        lastName,
        email: customer.email || user.email,
        phone: contactPhone,
        phoneNumber: contactPhone,
        status: customer.status,
        totalOrders: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || 0,
        lastOrderDate: customer.lastOrderDate,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/customers/me
 * PATCH /api/v1/customers/me
 * Update customer personal details in both User auth and `customers` collection
 */
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, firstName, lastName, phoneNumber, phone } = req.body;

    // Reject attempt to elevate privilege or modify security-sensitive fields
    const disallowedFields = ['isSuperAdmin', 'status', 'passwordHash', 'tokenVersion', 'email', 'role'];
    for (const field of disallowedFields) {
      if (req.body[field] !== undefined) {
        delete req.body[field];
      }
    }

    const updatedPhone = phone !== undefined ? String(phone).trim() : (phoneNumber !== undefined ? String(phoneNumber).trim() : undefined);

    let resolvedName = name !== undefined ? name.trim() : undefined;
    if (resolvedName === undefined && (firstName !== undefined || lastName !== undefined)) {
      resolvedName = `${firstName || ''} ${lastName || ''}`.trim();
    }

    if (resolvedName !== undefined) {
      if (!resolvedName) throw new BadRequestError('Name cannot be empty.');
      user.name = resolvedName;
    }

    if (updatedPhone !== undefined) {
      let cleanPhone = String(updatedPhone).replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.slice(2);
      }
      if (cleanPhone && cleanPhone.length !== 10) {
        throw new BadRequestError('Phone number must be a valid 10-digit number.');
      }
      user.phoneNumber = cleanPhone;
    }

    await user.save();

    // Mirror updates in `customers` collection
    const customer = await Customer.findOneAndUpdate(
      { $or: [{ userId: user._id }, { email: user.email }] },
      {
        $set: {
          name: user.name,
          phone: user.phoneNumber,
        },
      },
      { new: true, upsert: true }
    );

    const contactPhone = customer.phone || user.phoneNumber || '';
    const nameParts = (customer.name || user.name || '').trim().split(/\s+/);

    res.json({
      success: true,
      message: 'Profile updated successfully in customers collection.',
      customer: {
        id: customer._id,
        userId: user._id,
        name: customer.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customer.email,
        phone: contactPhone,
        phoneNumber: contactPhone,
        status: customer.status,
        totalOrders: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/me/change-password
 * Change password and invalidate prior sessions via tokenVersion increment
 */
export const changeCustomerPassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Both current password and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long.');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password provided is incorrect.');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    // Invalidate existing sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate fresh token for active session
    const newToken = generateToken({
      userId: user._id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      tokenVersion: user.tokenVersion,
    });

    res.json({
      success: true,
      message: 'Password changed successfully. All other active sessions have been revoked.',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers
 * GET /api/customers
 * Store Admin endpoint to list all customers from `customers` collection for tenant
 */
export const listStoreCustomers = async (req, res, next) => {
  try {
    const tenantId = req.tenant?._id;
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all',
      customerType = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Keep customers collection continuously synchronized with users and orders
    await syncExistingCustomersToCollection(req.tenant?.slug || 'aurelle');

    const query = {};
    if (tenantId) {
      query.$or = [{ tenantId }, { tenantId: null }];
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (customerType === 'registered') {
      query.userId = { $ne: null };
      query.isGuest = { $ne: true };
    } else if (customerType === 'guest') {
      query.$or = [{ isGuest: true }, { userId: null }, { tags: 'guest' }];
    }

    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { name: rx },
            { email: rx },
            { phone: rx },
          ],
        },
      ];
    }

    const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (numPage - 1) * numLimit;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, customers, allCustomersForMetrics] = await Promise.all([
      Customer.countDocuments(query),
      Customer.find(query).sort(sort).skip(skip).limit(numLimit).lean(),
      Customer.find(tenantId ? { $or: [{ tenantId }, { tenantId: null }] } : {}).lean(),
    ]);

    const metrics = {
      totalCustomers: allCustomersForMetrics.length,
      registeredCount: allCustomersForMetrics.filter((c) => c.userId && !c.isGuest).length,
      guestCount: allCustomersForMetrics.filter((c) => c.isGuest || !c.userId || c.tags?.includes('guest')).length,
      totalRevenue: allCustomersForMetrics.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
      totalOrders: allCustomersForMetrics.reduce((sum, c) => sum + (c.totalOrders || 0), 0),
    };

    res.json({
      success: true,
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1,
      customers,
      metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/:id
 * Store Admin endpoint to get a single customer details with full purchase history from `customers` collection
 */
export const getStoreCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) {
      throw new NotFoundError('Customer record not found in customers collection.');
    }

    // Find all purchase orders for this customer
    const email = String(customer.email || '').toLowerCase().trim();
    const orders = await Order.find({
      $or: [
        ...(customer.userId ? [{ userId: customer.userId }] : []),
        { 'customerInfo.email': email },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Recompute authoritative totals
    const totalSpent = orders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.pricing?.totalPayable || 0), 0);

    let user = null;
    if (customer.userId) {
      user = await User.findById(customer.userId).select('-passwordHash').lean();
    }

    res.json({
      success: true,
      customer: {
        ...customer,
        totalOrders: orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        orders,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/customers/:id
 * Store Admin endpoint to update customer status, tags, notes
 */
export const updateStoreCustomer = async (req, res, next) => {
  try {
    const { status, tags, notes } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [tags];
    if (notes !== undefined) updates.notes = String(notes).trim();

    const customer = await Customer.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!customer) {
      throw new NotFoundError('Customer record not found in customers collection.');
    }

    res.json({
      success: true,
      message: 'Customer record updated successfully in customers collection.',
      customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Automatic Backfill / Sync of existing users & guest orders into `customers` collection
 */
export const syncExistingCustomersToCollection = async (targetTenantSlug = 'aurelle') => {
  try {
    const tenant = (await Tenant.findOne({ slug: targetTenantSlug })) || (await Tenant.findOne({ status: 'active' }));
    const tenantId = tenant ? tenant._id : null;

    // 1. Sync all registered Users (excluding super admins)
    const users = await User.find({ isSuperAdmin: false }).lean();
    for (const u of users) {
      const email = String(u.email || '').toLowerCase().trim();
      if (!email) continue;

      const userOrders = await Order.find({
        $or: [{ userId: u._id }, { 'customerInfo.email': email }],
      }).lean();

      const totalOrders = userOrders.length;
      const totalSpent = userOrders
        .filter((o) => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + (o.pricing?.totalPayable || 0), 0);
      const lastOrder = userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      await Customer.findOneAndUpdate(
        { email },
        {
          $set: {
            tenantId,
            userId: u._id,
            name: u.name || email.split('@')[0],
            email,
            phone: u.phoneNumber || '',
            status: u.status || 'active',
            isGuest: false,
            totalOrders,
            totalSpent: Math.round(totalSpent * 100) / 100,
            lastOrderDate: lastOrder ? lastOrder.createdAt : null,
          },
          $pull: { tags: 'guest' },
        },
        { upsert: true }
      );
    }

    // 2. Sync all guest orders from Order collection
    const guestOrders = await Order.find({
      $or: [{ userId: null }, { 'customerInfo.isGuest': true }],
    }).lean();

    const guestMap = new Map();
    for (const o of guestOrders) {
      const email = String(o.customerInfo?.email || o.shippingAddress?.email || '').toLowerCase().trim();
      if (!email) continue;
      if (!guestMap.has(email)) {
        guestMap.set(email, {
          name: o.customerInfo?.name || o.shippingAddress?.name || 'Guest Customer',
          phone: o.customerInfo?.phone || o.shippingAddress?.phone || '',
          orders: [],
        });
      }
      guestMap.get(email).orders.push(o);
    }

    for (const [email, info] of guestMap.entries()) {
      const existing = await Customer.findOne({ email });
      if (existing && existing.userId) {
        continue;
      }

      const totalOrders = info.orders.length;
      const totalSpent = info.orders
        .filter((o) => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + (o.pricing?.totalPayable || 0), 0);
      const lastOrder = info.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      await Customer.findOneAndUpdate(
        { email },
        {
          $set: {
            tenantId,
            name: info.name,
            email,
            phone: info.phone,
            status: 'active',
            isGuest: true,
            totalOrders,
            totalSpent: Math.round(totalSpent * 100) / 100,
            lastOrderDate: lastOrder ? lastOrder.createdAt : null,
          },
          $addToSet: { tags: 'guest' },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('[CustomerSync] Auto-sync notice:', err.message);
  }
};
