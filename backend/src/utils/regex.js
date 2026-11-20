/**
 * @file regex.js
 * @description Safe Regular Expression & Query Sanitization Utilities
 * Protects MongoDB $regex queries and RegExp constructors against ReDoS (Regular Expression Denial of Service),
 * syntax crashes from unescaped user input (e.g. unclosed parentheses), and unauthorized wildcard tenant resolution.
 */

/**
 * Escapes special regular expression meta-characters in a user-provided string.
 * Enforces a maximum length boundary to protect against excessively long regex evaluation.
 *
 * @param {string} str - Raw string from user input (query param, body, or header)
 * @param {number} [maxLength=100] - Maximum allowable character length (default: 100)
 * @returns {string} Escaped string safe for use in regular expressions
 */
export function escapeRegex(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim().slice(0, maxLength);
  if (!trimmed) return '';
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a safe MongoDB $regex query object with bounded length and escaped characters.
 * Returns null if the search query is empty or invalid.
 *
 * @param {string} str - Raw search string
 * @param {string} [options='i'] - RegExp options flag (default: 'i' for case-insensitive)
 * @param {number} [maxLength=100] - Maximum allowed character length
 * @returns {{$regex: string, $options: string}|null} MongoDB regex filter object or null
 */
export function buildSafeRegexQuery(str, options = 'i', maxLength = 100) {
  const escaped = escapeRegex(str, maxLength);
  if (!escaped) return null;
  return { $regex: escaped, $options: options };
}

/**
 * Creates a safe, start-to-finish anchored RegExp instance for exact case-insensitive matching.
 * Useful for slug matching without allowing partial prefix/wildcard matching.
 *
 * @param {string} str - Raw string
 * @param {string} [options='i'] - RegExp flags
 * @param {number} [maxLength=100] - Maximum allowed character length
 * @returns {RegExp|null} Anchored RegExp instance or null if invalid
 */
export function buildSafeExactRegex(str, options = 'i', maxLength = 100) {
  const escaped = escapeRegex(str, maxLength);
  if (!escaped) return null;
  return new RegExp(`^${escaped}$`, options);
}

/**
 * Validates whether a tenant slug or store identifier conforms to safe alphanumeric/hyphen formatting.
 * Rejects malicious wildcards (e.g. `.*`), control characters, and excessively long inputs.
 *
 * @param {string} identifier - Tenant slug or store identifier
 * @returns {boolean} True if the identifier is a valid, safe slug
 */
export function isValidTenantSlug(identifier) {
  if (!identifier || typeof identifier !== 'string') return false;
  const clean = identifier.trim().toLowerCase();
  if (clean.length === 0 || clean.length > 100) return false;
  // Slugs must start with alphanumeric and contain only lowercase letters, numbers, hyphens, or underscores
  return /^[a-z0-9][a-z0-9-_]*$/.test(clean);
}
