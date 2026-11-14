import { validate } from './validate.js';

export const validateCreatePlan = validate({
  body: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
    slug: { required: true, type: 'slug', minLength: 2, maxLength: 50 },
    price: { required: true, type: 'number' },
    billingInterval: { required: false, type: 'string', enum: ['monthly', 'yearly', 'lifetime'] },
    features: { required: false, type: 'array' },
  },
});

export const validateUpdatePlan = validate({
  body: {
    name: { required: false, type: 'string', minLength: 2, maxLength: 50 },
    price: { required: false, type: 'number' },
    billingInterval: { required: false, type: 'string', enum: ['monthly', 'yearly', 'lifetime'] },
    features: { required: false, type: 'array' },
  },
});

export const validateChangePlan = validate({
  body: {
    planId: { required: true, type: 'string' },
  },
});

export const validateCheckout = validate({
  body: {
    planId: { required: true, type: 'string' },
    billingInterval: { required: false, type: 'string', enum: ['monthly', 'yearly'] },
  },
});

