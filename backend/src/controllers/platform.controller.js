import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { SubscriptionEvent } from '../models/SubscriptionEvent.js';
import { AuditLog } from '../models/AuditLog.js';
import { getPlatformAuditLogs } from '../services/audit.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import { logAudit } from '../utils/audit.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const listTenants = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const status = req.query.status;

    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
      Tenant.find(filter)
        .populate('ownerId', 'name email status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tenant.countDocuments(filter),
    ]);

    return sendPaginated(res, tenants, total, page, limit, 'Platform tenants retrieved.');
  } catch (error) {
    next(error);
  }
};

export const updateTenantStatus = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found.');
    }

    const oldStatus = tenant.status;
    tenant.status = status;
    await tenant.save();

    await logAudit({
      tenantId: tenant._id,
      userId: req.user._id,
      action: AUDIT_ACTIONS.TENANT_STATUS_CHANGE,
      resource: 'Tenant',
      resourceId: tenant._id,
      details: { oldStatus, newStatus: status },
      req,
    });

    return sendSuccess(res, tenant, `Tenant status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find()
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    return sendPaginated(res, users, total, page, limit, 'Platform users retrieved.');
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    await logAudit({
      userId: req.user._id,
      action: AUDIT_ACTIONS.USER_STATUS_CHANGE,
      resource: 'User',
      resourceId: user._id,
      details: { targetUserId: user._id, oldStatus, newStatus: status },
      req,
    });

    return sendSuccess(res, { id: user._id, email: user.email, status: user.status }, `User status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};

export const listAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const tenantId = req.query.tenantId || null;
    const action = req.query.action || null;
    const resource = req.query.resource || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const search = req.query.search || null;

    const result = await getPlatformAuditLogs({
      page,
      limit,
      tenantId,
      action,
      resource,
      startDate,
      endDate,
      search,
    });
    return sendPaginated(res, result.logs, result.total, page, limit, 'Audit logs retrieved.');
  } catch (error) {
    next(error);
  }
};

export const getPlatformStats = async (req, res, next) => {
  try {
    // 1. Tenants aggregation by status
    const tenantStatsRaw = await Tenant.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const tenantStats = {
      total: 0,
      active: 0,
      suspended: 0,
      deactivated: 0,
    };
    tenantStatsRaw.forEach((item) => {
      tenantStats.total += item.count;
      if (item._id === 'active') tenantStats.active = item.count;
      else if (item._id === 'suspended') tenantStats.suspended = item.count;
      else if (item._id === 'deactivated') tenantStats.deactivated = item.count;
    });

    // 2. Users aggregation by status and superadmin
    const userStatsRaw = await User.aggregate([
      {
        $group: {
          _id: { status: '$status', isSuperAdmin: '$isSuperAdmin' },
          count: { $sum: 1 },
        },
      },
    ]);
    const userStats = {
      total: 0,
      active: 0,
      suspended: 0,
      superAdminCount: 0,
    };
    userStatsRaw.forEach((item) => {
      userStats.total += item.count;
      if (item._id.isSuperAdmin) userStats.superAdminCount += item.count;
      if (item._id.status === 'active') userStats.active += item.count;
      else if (item._id.status === 'suspended') userStats.suspended += item.count;
    });

    // 3. Subscriptions aggregation by status
    const subStatsRaw = await Subscription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const subscriptionStats = {
      total: 0,
      active: 0,
      trialing: 0,
      past_due: 0,
      cancelled: 0,
      expired: 0,
    };
    subStatsRaw.forEach((item) => {
      subscriptionStats.total += item.count;
      if (subscriptionStats[item._id] !== undefined) {
        subscriptionStats[item._id] = item.count;
      }
    });

    // 4. Plans count
    const [totalPlans, activePlans] = await Promise.all([
      SubscriptionPlan.countDocuments(),
      SubscriptionPlan.countDocuments({ isActive: true }),
    ]);

    // 5. Recent registered stores (5)
    const recentTenants = await Tenant.find()
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 6. Recent subscription events (5)
    const recentSubscriptionEvents = await SubscriptionEvent.find()
      .populate('tenantId', 'name slug')
      .populate('fromPlanId', 'name slug')
      .populate('toPlanId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 7. Recent platform audit activities (5)
    const recentAuditActivities = await AuditLog.find()
      .populate('userId', 'name email')
      .populate('tenantId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return sendSuccess(
      res,
      {
        tenants: tenantStats,
        users: userStats,
        subscriptions: subscriptionStats,
        plans: { total: totalPlans, active: activePlans },
        recentTenants,
        recentSubscriptionEvents,
        recentAuditActivities,
      },
      'Platform statistics retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

export const listPlatformSubscriptions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const status = req.query.status;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('tenantId', 'name slug ownerId customDomain customDomainVerified status')
        .populate('planId', 'name slug price currency billingInterval')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    return sendPaginated(
      res,
      subscriptions,
      total,
      page,
      limit,
      'Platform subscriptions retrieved.'
    );
  } catch (error) {
    next(error);
  }
};

