/**
 * @file subscription.validation.js
 * @description Request schema validators for SaaS subscription plans: creation,
 * updating plan properties, tenant plan switching, and subscription checkout.
 */

import { validate } from './validate.js';

/**
 * Validates plan creation request payload
 */
export const validateCreatePlan = validate({
  body: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
    slug: { required: true, type: 'slug', minLength: 2, maxLength: 50 },
    price: { required: true, type: 'number' },
    billingInterval: { required: false, type: 'string', enum: ['monthly', 'yearly', 'lifetime'] },
    features: { required: false, type: 'array' },
  },
});

/**
 * Validates plan update request payload
 */
export const validateUpdatePlan = validate({
  body: {
    name: { required: false, type: 'string', minLength: 2, maxLength: 50 },
    price: { required: false, type: 'number' },
    billingInterval: { required: false, type: 'string', enum: ['monthly', 'yearly', 'lifetime'] },
    features: { required: false, type: 'array' },
  },
});

/**
 * Validates tenant tier upgrade or downgrade request
 */
export const validateChangePlan = validate({
  body: {
    planId: { required: true, type: 'string' },
  },
});

/**
 * Validates subscription checkout and billing cycle selection
 */
export const validateCheckout = validate({
  body: {
    planId: { required: true, type: 'string' },
    billingInterval: { required: false, type: 'string', enum: ['monthly', 'yearly'] },
  },
});

