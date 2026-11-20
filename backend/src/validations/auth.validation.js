/**
 * @file auth.validation.js
 * @description Request schema validators for SaaS authentication endpoints:
 * user registration, credential login, and multi-tenant workspace switching.
 */

import { validate } from './validate.js';

/**
 * Validates self-service tenant owner registration payload
 */
export const validateRegister = validate({
  body: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', minLength: 6, maxLength: 128 },
    phoneNumber: { required: false, type: 'phone' },
    tenantName: { required: false, type: 'string', minLength: 2, maxLength: 100 },
    tenantSlug: { required: false, type: 'slug' },
  },
});

/**
 * Validates user login credentials
 */
export const validateLogin = validate({
  body: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string' },
  },
});

/**
 * Validates tenant workspace switching payload
 */
export const validateSwitchTenant = validate({
  body: {
    tenantId: { required: true, type: 'string' },
  },
});

