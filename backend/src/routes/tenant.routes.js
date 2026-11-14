import { Router } from 'express';
import * as tenantController from '../controllers/tenant.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import {
  validateCreateTenant,
  validateUpdateTenant,
  validateInviteStaff,
  validateUpdateStaffStatus,
} from '../validations/tenant.validation.js';

const router = Router();

// Create new store (Global authenticated action)
router.post('/', authenticateUser, validateCreateTenant, tenantController.create);

// Store-scoped operations (Must pass through resolveTenant to isolate store and verify active membership)
const tenantScoped = Router();
tenantScoped.use(authenticateUser, resolveTenant({ requireMembership: true }));

// Store profile
tenantScoped.get('/current', tenantController.getDetails);
tenantScoped.put('/current', requireTenantPermission('tenant:update'), validateUpdateTenant, tenantController.update);

// Staff management
tenantScoped.get('/staff', requireTenantPermission('staff:read'), tenantController.listStaff);
tenantScoped.post('/staff', requireTenantPermission('staff:invite'), validateInviteStaff, tenantController.inviteStaff);
tenantScoped.patch(
  '/staff/:membershipId',
  requireTenantPermission('staff:update'),
  validateUpdateStaffStatus,
  tenantController.updateStaff
);
tenantScoped.delete('/staff/:membershipId', requireTenantPermission('staff:remove'), tenantController.removeStaff);

router.use('/', tenantScoped);

export default router;

