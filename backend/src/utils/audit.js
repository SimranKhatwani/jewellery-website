/**
 * Audit Log Helper
 * Safely writes audit records without interrupting main request flow
 */
import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({
  tenantId = null,
  userId = null,
  action,
  resource,
  resourceId = null,
  status = 'SUCCESS',
  details = null,
  req = null,
}) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip || ''
      : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      tenantId: tenantId || (req?.tenant?._id ?? null),
      userId: userId || (req?.user?._id ?? null),
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      status,
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Non-fatal logging failure
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
};

