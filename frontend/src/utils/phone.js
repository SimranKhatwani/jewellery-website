/**
 * Centralized Phone Number Utilities for Frontend UI
 * Enforces 10-digit numeric input restrictions and validates mobile numbers.
 */

export const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes a phone number to a clean 10-digit string.
 *
 * @param {string|number} phone
 * @returns {string} 10-digit string
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
 * Must be 10 numeric digits starting with 6, 7, 8, or 9.
 *
 * @param {string|number} phone
 * @returns {boolean}
 */
export function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const clean = normalizePhoneNumber(phone);
  return PHONE_REGEX.test(clean);
}

/**
 * Helper to clean and restrict raw text on input change (strips non-digits, max 10 chars)
 *
 * @param {string} raw
 * @returns {string}
 */
export function sanitizePhoneInput(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 10);
}
