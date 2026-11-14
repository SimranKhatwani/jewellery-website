import { BadRequestError } from '../utils/errors.js';

/**
 * Lightweight Request Validator Middleware Factory
 * @param {Object} schema - Validation schema object with rules for body, query, params
 * Example:
 * validate({
 *   body: {
 *     email: { required: true, type: 'email' },
 *     password: { required: true, minLength: 8 },
 *     name: { required: true, minLength: 2 }
 *   }
 * })
 */
export const validate = (schema) => {
  return (req, _res, next) => {
    const errors = {};

    for (const [source, rules] of Object.entries(schema)) {
      const data = req[source] || {};

      for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];

        // Required check
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors[field] = `${field} is required.`;
          continue;
        }

        // If field is optional and not provided, skip further checks
        if (value === undefined || value === null || value === '') {
          continue;
        }

        // Type checks
        if (rule.type === 'string' && typeof value !== 'string') {
          errors[field] = `${field} must be a string.`;
        } else if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof value !== 'string' || !emailRegex.test(value.trim())) {
            errors[field] = `${field} must be a valid email address.`;
          }
        } else if (rule.type === 'slug') {
          const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
          if (typeof value !== 'string' || !slugRegex.test(value.trim())) {
            errors[field] = `${field} must be a valid lowercase kebab-case slug.`;
          }
        } else if (rule.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
          errors[field] = `${field} must be a valid number.`;
        } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors[field] = `${field} must be a boolean.`;
        } else if (rule.type === 'array' && !Array.isArray(value)) {
          errors[field] = `${field} must be an array.`;
        }

        // String length checks
        if (typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors[field] = `${field} must be at least ${rule.minLength} characters long.`;
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors[field] = `${field} cannot exceed ${rule.maxLength} characters.`;
          }
        }

        // Enum check
        if (rule.enum && !rule.enum.includes(value)) {
          errors[field] = `${field} must be one of: ${rule.enum.join(', ')}.`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      next(new BadRequestError('Validation failed', errors));
      return;
    }

    next();
  };
};

