import { validate } from './validate.js';

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

export const validateLogin = validate({
  body: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string' },
  },
});

export const validateSwitchTenant = validate({
  body: {
    tenantId: { required: true, type: 'string' },
  },
});

