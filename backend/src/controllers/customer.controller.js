import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
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

    res.json({
      success: true,
      customer: {
        id: customer._id,
        userId: user._id,
        tenantId: customer.tenantId,
        name: customer.name,
        email: customer.email,
        phoneNumber: customer.phone || user.phoneNumber || '',
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
    const { name, phoneNumber, phone } = req.body;

    // Reject attempt to elevate privilege or modify security-sensitive fields
    const disallowedFields = ['isSuperAdmin', 'status', 'passwordHash', 'tokenVersion', 'email', 'role'];
    for (const field of disallowedFields) {
      if (req.body[field] !== undefined) {
        delete req.body[field];
      }
    }

    const updatedPhone = phone !== undefined ? phone.trim() : (phoneNumber !== undefined ? phoneNumber.trim() : undefined);

    if (name !== undefined) {
      if (!name.trim()) throw new BadRequestError('Name cannot be empty.');
      user.name = name.trim();
    }

    if (updatedPhone !== undefined) {
      user.phoneNumber = updatedPhone;
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

    res.json({
      success: true,
      message: 'Profile updated successfully in customers collection.',
      customer: {
        id: customer._id,
        userId: user._id,
        name: customer.name,
        email: customer.email,
        phoneNumber: customer.phone,
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

    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long.');
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
    const { page = 1, limit = 20, search = '', status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (tenantId) {
      query.$or = [{ tenantId }, { tenantId: null }];
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      query.$or = [
        { name: rx },
        { email: rx },
        { phone: rx },
      ];
      if (tenantId) {
        query.tenantId = tenantId;
      }
    }

    const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (numPage - 1) * numLimit;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, customers] = await Promise.all([
      Customer.countDocuments(query),
      Customer.find(query).sort(sort).skip(skip).limit(numLimit).lean(),
    ]);

    res.json({
      success: true,
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1,
      customers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/:id
 * Store Admin endpoint to get a single customer details from `customers` collection
 */
export const getStoreCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) {
      throw new NotFoundError('Customer record not found in customers collection.');
    }

    res.json({
      success: true,
      customer,
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
 * Automatic Backfill / Sync of existing users into `customers` collection
 */
export const syncExistingCustomersToCollection = async (targetTenantSlug = 'aurelle') => {
  try {
    const tenant = (await Tenant.findOne({ slug: targetTenantSlug })) || (await Tenant.findOne({ status: 'active' }));
    if (!tenant) return;

    // Find all users who are not super admins
    const users = await User.find({ isSuperAdmin: false }).lean();
    for (const u of users) {
      // Check if user has staff membership
      const membership = await TenantMembership.findOne({ userId: u._id });
      // If no staff membership or user is customer, ensure they are in Customer collection
      await Customer.findOneAndUpdate(
        { email: u.email, tenantId: tenant._id },
        {
          $set: {
            tenantId: tenant._id,
            userId: u._id,
            name: u.name,
            email: u.email,
            phone: u.phoneNumber || '',
            status: u.status || 'active',
          },
          $setOnInsert: {
            totalOrders: 0,
            totalSpent: 0,
          },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('[CustomerSync] Auto-sync notice:', err.message);
  }
};
