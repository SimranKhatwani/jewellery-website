import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { generateToken } from '../utils/jwt.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone.js';
import { escapeRegex } from '../utils/regex.js';

/**
 * Auto-sync helper: ensures an existing User is mirrored into the `customers` collection
 */
async function ensureCustomerRecord(user, tenantId = null) {
  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    const defaultTenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    resolvedTenantId = defaultTenant?._id || null;
  }

  const query = {
    $or: [{ userId: user._id }, { email: user.email }],
  };
  if (resolvedTenantId) {
    query.tenantId = resolvedTenantId;
  }

  let customer = await Customer.findOne(query);

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
      let cleanPhone = '';
      if (updatedPhone && String(updatedPhone).trim()) {
        cleanPhone = normalizePhoneNumber(updatedPhone);
        if (!isValidPhoneNumber(cleanPhone)) {
          throw new BadRequestError('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
        }
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
 * Synchronize customer orders strictly for a specific tenant
 */
export const syncTenantCustomers = async (tenantId) => {
  if (!tenantId) return;

  // 1. Find all orders strictly belonging to this tenant
  const tenantOrders = await Order.find({ tenantId }).lean();

  // Group tenant orders by customer email
  const customerOrdersMap = new Map();
  for (const o of tenantOrders) {
    const email = String(o.customerInfo?.email || o.shippingAddress?.email || '').toLowerCase().trim();
    if (!email) continue;
    if (!customerOrdersMap.has(email)) {
      customerOrdersMap.set(email, {
        userId: o.userId || null,
        name: o.customerInfo?.name || o.shippingAddress?.name || 'Customer',
        phone: o.customerInfo?.phone || o.shippingAddress?.phone || '',
        isGuest: Boolean(o.customerInfo?.isGuest || !o.userId),
        orders: [],
      });
    }
    const c = customerOrdersMap.get(email);
    if (!c.userId && o.userId) c.userId = o.userId;
    c.orders.push(o);
  }

  // Upsert or update Customer documents strictly for this tenant
  for (const [email, info] of customerOrdersMap.entries()) {
    const totalOrders = info.orders.length;
    const totalSpent = info.orders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.pricing?.totalPayable || 0), 0);
    const lastOrder = info.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    let user = null;
    if (info.userId) {
      user = await User.findById(info.userId).lean();
    }
    if (!user) {
      user = await User.findOne({ email }).lean();
    }

    const isGuest = !user;

    await Customer.findOneAndUpdate(
      { tenantId, email },
      {
        $set: {
          tenantId,
          userId: user ? user._id : null,
          name: (user ? user.name : info.name) || email.split('@')[0],
          email,
          phone: (user ? user.phoneNumber : info.phone) || '',
          status: (user ? user.status : 'active') || 'active',
          isGuest,
          totalOrders,
          totalSpent: Math.round(totalSpent * 100) / 100,
          lastOrderDate: lastOrder ? lastOrder.createdAt : null,
        },
        ...(isGuest ? { $addToSet: { tags: 'guest' } } : { $pull: { tags: 'guest' } }),
      },
      { upsert: true, new: true }
    );
  }

  // 2. Also ensure registered shoppers who explicitly registered for this tenant are updated
  const tenantRegistrations = await Customer.find({ tenantId, userId: { $ne: null } }).lean();
  for (const reg of tenantRegistrations) {
    const orders = tenantOrders.filter((o) =>
      (reg.userId && String(o.userId) === String(reg.userId)) ||
      (o.customerInfo?.email && o.customerInfo.email.toLowerCase().trim() === reg.email.toLowerCase().trim())
    );
    const totalOrders = orders.length;
    const totalSpent = orders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.pricing?.totalPayable || 0), 0);
    const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    await Customer.updateOne(
      { _id: reg._id },
      {
        $set: {
          totalOrders,
          totalSpent: Math.round(totalSpent * 100) / 100,
          lastOrderDate: lastOrder ? lastOrder.createdAt : null,
        },
      }
    );
  }
};

/**
 * One-time repair and strict tenant partitioning of historical customer records
 */
export const repairAndSyncCustomers = async () => {
  try {
    const aurelleTenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    if (!aurelleTenant) return;

    // 1. Remove store owners and staff who have 0 orders from Customer collection
    const staffMemberships = await TenantMembership.find({
      status: 'active',
      roleId: { $ne: null },
    }).lean();
    const staffUserIds = staffMemberships.map((m) => String(m.userId));

    if (staffUserIds.length > 0) {
      await Customer.deleteMany({
        userId: { $in: staffUserIds },
        totalOrders: 0,
      });
    }

    // 2. Re-attribute existing customers back to their genuine tenant based on Orders
    const givaTenant = await Tenant.findOne({ slug: 'giva-jewels' });
    if (givaTenant) {
      // Find any customers incorrectly linked to GIVA
      const givaCustomers = await Customer.find({ tenantId: givaTenant._id }).lean();
      for (const gc of givaCustomers) {
        const givaOrdersCount = await Order.countDocuments({
          tenantId: givaTenant._id,
          $or: [
            ...(gc.userId ? [{ userId: gc.userId }] : []),
            { 'customerInfo.email': gc.email },
          ],
        });

        // If this customer has no orders on GIVA, they belong to Aurelle (e.g. Siya, Dinesh, Priya)
        if (givaOrdersCount === 0) {
          if (gc.email === 'teststoreowner@giva.com') {
            await Customer.deleteOne({ _id: gc._id });
          } else {
            await Customer.updateOne({ _id: gc._id }, { $set: { tenantId: aurelleTenant._id } });
          }
        }
      }
    }

    // 3. Sync customer orders strictly per tenant
    const allTenants = await Tenant.find().lean();
    for (const t of allTenants) {
      await syncTenantCustomers(t._id);
    }
  } catch (err) {
    console.warn('[Customer Repair] Warning during customer re-partitioning:', err.message);
  }
};

export const syncExistingCustomersToCollection = async () => {
  return repairAndSyncCustomers();
};

/**
 * GET /api/v1/customers
 * GET /api/customers
 * Store Admin endpoint to list all customers strictly belonging to the active tenant
 */
export const listStoreCustomers = async (req, res, next) => {
  try {
    const tenantId = req.tenant?._id;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant store context required.' });
    }

    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all',
      customerType = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Run repair check and sync this tenant's orders
    await repairAndSyncCustomers();
    await syncTenantCustomers(tenantId);

    // Strictly enforce tenant boundary
    const query = { tenantId };

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
      const rx = new RegExp(escapeRegex(search, 100), 'i');
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
      Customer.find({ tenantId }).lean(),
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
 * Store Admin endpoint to get a single customer details with full purchase history, strictly scoped to tenant
 */
export const getStoreCustomerById = async (req, res, next) => {
  try {
    const tenantId = req.tenant?._id;
    const customer = await Customer.findOne({ _id: req.params.id, tenantId }).lean();
    if (!customer) {
      throw new NotFoundError('Customer record not found for this store.');
    }

    // Find purchase orders strictly for this tenant and customer
    const email = String(customer.email || '').toLowerCase().trim();
    const orders = await Order.find({
      tenantId,
      $or: [
        ...(customer.userId ? [{ userId: customer.userId }] : []),
        { 'customerInfo.email': email },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Recompute authoritative totals for this tenant
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
 * Store Admin endpoint to update customer status, tags, notes strictly within tenant boundary
 */
export const updateStoreCustomer = async (req, res, next) => {
  try {
    const tenantId = req.tenant?._id;
    const { status, tags, notes } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [tags];
    if (notes !== undefined) updates.notes = String(notes).trim();

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: updates },
      { new: true }
    );
    if (!customer) {
      throw new NotFoundError('Customer record not found for this store.');
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
