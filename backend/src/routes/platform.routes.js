import { Router } from 'express';
import * as platformController from '../controllers/platform.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const router = Router();

// Protect all platform routes: Must be authenticated AND have Platform Super Admin status
router.use(authenticateUser, requireSuperAdmin);

// Dashboard Overview Statistics
router.get('/stats', platformController.getPlatformStats);

// Tenant oversight
router.get('/tenants', platformController.listTenants);
router.post('/tenants', platformController.createPlatformTenant);
router.patch('/tenants/:tenantId/status', platformController.updateTenantStatus);
router.patch('/tenants/:tenantId/subscription', platformController.updateTenantSubscription);

// Subscriptions oversight
router.get('/subscriptions', platformController.listPlatformSubscriptions);
router.patch('/subscriptions/:subscriptionId', platformController.updateSubscriptionById);

// User oversight
router.get('/users', platformController.listUsers);
router.patch('/users/:userId/status', platformController.updateUserStatus);

// Audit logs
router.get('/audit-logs', platformController.listAuditLogs);

export default router;

