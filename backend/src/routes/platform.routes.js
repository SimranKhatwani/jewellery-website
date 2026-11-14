import { Router } from 'express';
import * as platformController from '../controllers/platform.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const router = Router();

// Protect all platform routes: Must be authenticated AND have Platform Super Admin status
router.use(authenticateUser, requireSuperAdmin);

// Tenant oversight
router.get('/tenants', platformController.listTenants);
router.patch('/tenants/:tenantId/status', platformController.updateTenantStatus);

// User oversight
router.get('/users', platformController.listUsers);
router.patch('/users/:userId/status', platformController.updateUserStatus);

// Audit logs
router.get('/audit-logs', platformController.listAuditLogs);

export default router;

