import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { requireTenantRole } from '../middleware/rbac.js';
import { validateCheckout, validateChangePlan } from '../validations/subscription.validation.js';

const router = Router();

// Payment Webhook endpoint (Public, verified via signature/payload)
router.post('/webhook', subscriptionController.handleWebhook);

// Tenant-scoped subscription operations (Requires Store Admin role)
const tenantScoped = Router();
tenantScoped.use(authenticateUser, resolveTenant({ requireMembership: true }), requireTenantRole('store_admin'));

tenantScoped.get('/', subscriptionController.getSubscription);
tenantScoped.get('/plans', subscriptionController.listAvailablePlans);
tenantScoped.post('/checkout', validateCheckout, subscriptionController.checkout);
tenantScoped.post('/change-plan', validateChangePlan, subscriptionController.changePlan);
tenantScoped.post('/cancel', subscriptionController.cancelSubscription);

router.use('/', tenantScoped);

export default router;

