import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
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

    const result = await getPlatformAuditLogs({ page, limit, tenantId, action });
    return sendPaginated(res, result.logs, result.total, page, limit, 'Audit logs retrieved.');
  } catch (error) {
    next(error);
  }
};

