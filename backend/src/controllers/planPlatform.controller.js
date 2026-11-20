/**
 * @file planPlatform.controller.js
 * @description SuperAdmin platform controller for creating, configuring,
 * updating, and retiring SaaS subscription plans.
 */

import * as subscriptionService from '../services/subscription.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Creates a new SaaS subscription tier with custom limits and features.
 * @route POST /api/v1/platform/plans
 */
export const createPlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.createPlan(req.body, req);
    return sendSuccess(res, plan, 'Subscription plan created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all SaaS subscription tiers across the platform.
 * @route GET /api/v1/platform/plans
 */
export const listPlans = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const plans = await subscriptionService.listAllPlans({ includeInactive });
    return sendSuccess(res, plans, 'Platform subscription plans retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches an individual subscription plan by ID.
 * @route GET /api/v1/platform/plans/:id
 */
export const getPlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.getPlanById(req.params.id);
    return sendSuccess(res, plan, 'Subscription plan retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Updates subscription plan properties (price, limits, features).
 * @route PUT /api/v1/platform/plans/:id
 */
export const updatePlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.updatePlan(req.params.id, req.body, req);
    return sendSuccess(res, plan, 'Subscription plan updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Toggles a subscription plan's active state.
 * @route PATCH /api/v1/platform/plans/:id/status
 */
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

/**
 * Deletes a subscription plan from the platform.
 * @route DELETE /api/v1/platform/plans/:id
 */
export const deletePlan = async (req, res, next) => {
  try {
    const result = await subscriptionService.deletePlan(req.params.id, req);
    return sendSuccess(res, result, 'Subscription plan deleted successfully.');
  } catch (error) {
    next(error);
  }
};

