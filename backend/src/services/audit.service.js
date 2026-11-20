/**
 * @file audit.service.js
 * @description Service querying and aggregating immutable audit logs for individual tenants
 * as well as platform-wide SuperAdmin auditing with date ranges, regex search, and pagination.
 */

import { AuditLog } from '../models/AuditLog.js';
import { buildSafeRegexQuery } from '../utils/regex.js';

/**
 * Retrieves paginated audit logs scoped strictly to an individual tenant.
 * @param {string|mongoose.Types.ObjectId} tenantId - Tenant identifier
 * @param {Object} options - Pagination and filter parameters
 * @param {number} [options.page=1] - 1-based page index
 * @param {number} [options.limit=20] - Number of log entries per page
 * @param {string|null} [options.action=null] - Optional action filter
 * @returns {Promise<{logs: Array, total: number, page: number, limit: number}>}
 */
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

/**
 * Retrieves platform-wide audit logs with cross-tenant filtering, actor search, and date bounds.
 * Accessible exclusively to platform SuperAdmins.
 * @param {Object} params - Query criteria
 * @returns {Promise<{logs: Array, total: number, page: number, limit: number}>}
 */
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
    const regexQuery = buildSafeRegexQuery(search, 'i', 100);
    if (regexQuery) {
      query.$or = [
        { action: regexQuery },
        { resource: regexQuery },
        { ipAddress: regexQuery },
        { 'details.email': regexQuery },
      ];
    }
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

