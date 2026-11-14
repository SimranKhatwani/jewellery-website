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

export const getPlatformAuditLogs = async ({
  page = 1,
  limit = 50,
  tenantId = null,
  action = null,
  resource = null,
  startDate = null,
  endDate = null,
  search = null,
}) => {
  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (action && action !== 'all') query.action = action;
  if (resource && resource !== 'all') query.resource = resource;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { action: { $regex: escaped, $options: 'i' } },
      { resource: { $regex: escaped, $options: 'i' } },
      { ipAddress: { $regex: escaped, $options: 'i' } },
      { 'details.email': { $regex: escaped, $options: 'i' } },
    ];
  }

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

