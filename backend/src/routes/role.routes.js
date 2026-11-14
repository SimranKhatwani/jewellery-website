import { Router } from 'express';
import * as roleController from '../controllers/role.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { requireTenantPermission } from '../middleware/rbac.js';
import { requirePlanFeature } from '../middleware/subscription.js';
import { validateCreateRole, validateUpdateRole } from '../validations/role.validation.js';

const router = Router();

// System permissions registry (accessible to any authenticated user to inspect capabilities)
router.get('/permissions', authenticateUser, roleController.getPermissions);

// Tenant-scoped custom roles
const tenantScoped = Router();
tenantScoped.use(authenticateUser, resolveTenant({ requireMembership: true }));

tenantScoped.get('/', roleController.getTenantRoles);
tenantScoped.post(
  '/',
  requireTenantPermission('roles:manage'),
  requirePlanFeature('staff:custom_roles'),
  validateCreateRole,
  roleController.createRole
);
tenantScoped.put('/:roleId', requireTenantPermission('roles:manage'), validateUpdateRole, roleController.updateRole);
tenantScoped.delete('/:roleId', requireTenantPermission('roles:manage'), roleController.deleteRole);

router.use('/', tenantScoped);

export default router;

