/**
 * Centralized Phone Number Utilities for Antigravity / AURELLE Multi-Tenant SaaS
 * Strictly enforces 10-digit mobile number validation and normalization.
 */

export const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes a phone number to a clean 10-digit string.
 * Handles +91, 91, leading 0, spaces, hyphens, and parentheses.
 *
 * @param {string|number} phone
 * @returns {string} 10-digit normalized phone or empty string
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  return clean.slice(0, 10);
}

/**
 * Strictly verifies that a phone number is a valid 10-digit mobile number.
 * Valid Indian mobile numbers begin with 6, 7, 8, or 9.
 *
 * @param {string|number} phone
 * @returns {boolean}
 */
export function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const clean = normalizePhoneNumber(phone);
  return PHONE_REGEX.test(clean);
}
