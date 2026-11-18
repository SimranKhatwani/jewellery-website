import { Router } from 'express';
import * as tenantController from '../controllers/tenant.controller.js';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { requireTenantPermission, requireTenantRole } from '../middleware/rbac.js';
import { enforcePlanLimit, requireActiveSubscription } from '../middleware/subscription.js';
import {
  validateCreateTenant,
  validateUpdateTenant,
  validateInviteStaff,
  validateCreateStaffDirectly,
  validateUpdateStaffStatus,
  validateTransferOwnership,
} from '../validations/tenant.validation.js';
import { validateCheckout, validateChangePlan } from '../validations/subscription.validation.js';

const router = Router();

// Create new store (Global authenticated action)
router.post('/', authenticateUser, validateCreateTenant, tenantController.create);

// Store-scoped operations (Must pass through resolveTenant to isolate store and verify active membership)
const tenantScoped = Router();
tenantScoped.use(authenticateUser, resolveTenant({ requireMembership: true }));

// Store profile
tenantScoped.get('/current', tenantController.getDetails);
tenantScoped.put('/current', requireTenantPermission('tenant:update'), validateUpdateTenant, tenantController.update);
tenantScoped.post(
  '/current/transfer-ownership',
  requireTenantRole('store_admin'),
  validateTransferOwnership,
  tenantController.transferOwnership
);

// Staff management (Guarded by permission and subscription staff quota limit)
tenantScoped.get('/staff', requireTenantPermission('staff:read'), tenantController.listStaff);
tenantScoped.post(
  '/staff',
  requireTenantPermission('staff:invite'),
  enforcePlanLimit('staff'),
  validateInviteStaff,
  tenantController.inviteStaff
);
tenantScoped.post(
  '/staff/create',
  requireTenantPermission('staff:invite'),
  enforcePlanLimit('staff'),
  validateCreateStaffDirectly,
  tenantController.createStaff
);
tenantScoped.patch(
  '/staff/:membershipId',
  requireTenantPermission('staff:update'),
  validateUpdateStaffStatus,
  tenantController.updateStaff
);
tenantScoped.delete('/staff/:membershipId', requireTenantPermission('staff:remove'), tenantController.removeStaff);

// Tenant Subscription APIs
tenantScoped.get(
  '/current/subscription',
  requireTenantRole('store_admin'),
  subscriptionController.getSubscription
);
tenantScoped.get(
  '/current/subscription/plans',
  subscriptionController.listAvailablePlans
);
tenantScoped.post(
  '/current/subscription/checkout',
  requireTenantRole('store_admin'),
  validateCheckout,
  subscriptionController.checkout
);
tenantScoped.post(
  '/current/subscription/change-plan',
  requireTenantRole('store_admin'),
  validateChangePlan,
  subscriptionController.changePlan
);
tenantScoped.post(
  '/current/subscription/cancel',
  requireTenantRole('store_admin'),
  subscriptionController.cancelSubscription
);

router.use('/', tenantScoped);

export default router;
