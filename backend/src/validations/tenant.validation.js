/**
 * @file tenant.validation.js
 * @description Request schema validators for tenant store onboarding, tenant configuration updates,
 * staff invitation/creation, staff member status modification, and store ownership transfer.
 */

import { validate } from './validate.js';
import { TENANT_STATUS, MEMBERSHIP_STATUS } from '../config/constants.js';

/**
 * Validates request payload when creating a new tenant store
 */
export const validateCreateTenant = validate({
  body: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    slug: { required: true, type: 'slug', minLength: 2, maxLength: 50 },
    customDomain: { required: false, type: 'string' },
  },
});

/**
 * Validates request payload when modifying tenant settings or custom domain
 */
export const validateUpdateTenant = validate({
  body: {
    name: { required: false, type: 'string', minLength: 2, maxLength: 100 },
    customDomain: { required: false, type: 'string' },
  },
});

/**
 * Validates staff invitation dispatch payload
 */
export const validateInviteStaff = validate({
  body: {
    email: { required: true, type: 'email' },
    roleId: { required: true, type: 'string' },
    name: { required: false, type: 'string' },
    password: { required: false, type: 'string', minLength: 6, maxLength: 128 },
    phoneNumber: { required: false, type: 'phone' },
  },
});

/**
 * Validates direct staff creation without invitation email flow
 */
export const validateCreateStaffDirectly = validate({
  body: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', minLength: 6, maxLength: 128 },
    roleId: { required: true, type: 'string' },
    phoneNumber: { required: false, type: 'phone' },
  },
});

/**
 * Validates updates to staff membership status (active/inactive) or role assignment
 */
export const validateUpdateStaffStatus = validate({
  body: {
    status: { required: false, type: 'string', enum: Object.values(MEMBERSHIP_STATUS) },
    roleId: { required: false, type: 'string' },
    name: { required: false, type: 'string', minLength: 2, maxLength: 100 },
    email: { required: false, type: 'email' },
    password: { required: false, type: 'string', minLength: 6, maxLength: 128 },
    phoneNumber: { required: false, type: 'phone' },
  },
});

/**
 * Validates transfer of store primary ownership to another user
 */
export const validateTransferOwnership = validate({
  body: {
    newOwnerId: { required: true, type: 'string' },
  },
});

