import { Router } from 'express';
import * as planController from '../controllers/planPlatform.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import { validateCreatePlan, validateUpdatePlan } from '../validations/subscription.validation.js';

const router = Router();

// Platform Super Admin Only
router.use(authenticateUser, requireSuperAdmin);

router.post('/', validateCreatePlan, planController.createPlan);
router.get('/', planController.listPlans);
router.get('/:id', planController.getPlan);
router.put('/:id', validateUpdatePlan, planController.updatePlan);
router.patch('/:id/status', planController.togglePlanStatus);
router.delete('/:id', planController.deletePlan);

export default router;

