import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { requireTenantRole } from '../middleware/rbac.js';
import { validateCheckout, validateChangePlan } from '../validations/subscription.validation.js';

const router = Router();

// Payment Webhook endpoint (Public, verified via signature/payload)
router.post('/webhook', subscriptionController.handleWebhook);

/**
 * Tenant-scoped subscription router
 * Canonical endpoints for subscription retrieval, plan changes, checkout, and cancellation.
 */
export const tenantSubscriptionRouter = Router();
tenantSubscriptionRouter.use(authenticateUser, resolveTenant({ requireMembership: true }));

// Plan browsing (Open to all authenticated members of the active store)
tenantSubscriptionRouter.get('/plans', subscriptionController.listAvailablePlans);

// Billing status and subscription mutations (Guarded by store_admin role)
tenantSubscriptionRouter.get('/', requireTenantRole('store_admin'), subscriptionController.getSubscription);
tenantSubscriptionRouter.post('/checkout', requireTenantRole('store_admin'), validateCheckout, subscriptionController.checkout);
tenantSubscriptionRouter.post('/change-plan', requireTenantRole('store_admin'), validateChangePlan, subscriptionController.changePlan);
tenantSubscriptionRouter.post('/cancel', requireTenantRole('store_admin'), subscriptionController.cancelSubscription);

// Mount tenant subscription router on canonical root
router.use('/', tenantSubscriptionRouter);

export default router;

