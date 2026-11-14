import { validate } from './validate.js';

export const validateCreateRole = validate({
  body: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
    slug: { required: true, type: 'slug', minLength: 2, maxLength: 50 },
    description: { required: false, type: 'string', maxLength: 255 },
    permissions: { required: true, type: 'array' },
  },
});

export const validateUpdateRole = validate({
  body: {
    name: { required: false, type: 'string', minLength: 2, maxLength: 50 },
    description: { required: false, type: 'string', maxLength: 255 },
    permissions: { required: false, type: 'array' },
  },
});

