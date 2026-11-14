import * as subscriptionService from '../services/subscription.service.js';
import { sendSuccess } from '../utils/response.js';

export const createPlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.createPlan(req.body, req);
    return sendSuccess(res, plan, 'Subscription plan created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const listPlans = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const plans = await subscriptionService.listAllPlans({ includeInactive });
    return sendSuccess(res, plans, 'Platform subscription plans retrieved.');
  } catch (error) {
    next(error);
  }
};

export const getPlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.getPlanById(req.params.id);
    return sendSuccess(res, plan, 'Subscription plan retrieved.');
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.updatePlan(req.params.id, req.body, req);
    return sendSuccess(res, plan, 'Subscription plan updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const togglePlanStatus = async (req, res, next) => {
  try {
    const plan = await subscriptionService.updatePlan(
      req.params.id,
      { isActive: req.body.isActive },
      req
    );
    return sendSuccess(res, plan, `Plan status updated to ${plan.isActive ? 'active' : 'inactive'}.`);
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const result = await subscriptionService.deletePlan(req.params.id, req);
    return sendSuccess(res, result, 'Subscription plan deleted successfully.');
  } catch (error) {
    next(error);
  }
};

