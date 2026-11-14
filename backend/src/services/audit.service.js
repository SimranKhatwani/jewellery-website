import { AuditLog } from '../models/AuditLog.js';

export const getTenantAuditLogs = async (tenantId, { page = 1, limit = 20, action = null }) => {
  const query = { tenantId };
  if (action) {
    query.action = action;
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total, page, limit };
};

export const getPlatformAuditLogs = async ({ page = 1, limit = 50, tenantId = null, action = null }) => {
  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (action) query.action = action;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('tenantId', 'name slug')
      .populate('userId', 'name email isSuperAdmin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total, page, limit };
};

