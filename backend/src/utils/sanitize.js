/**
 * @file sanitize.js
 * @description Robust, Multi-Pass HTML Sanitizer & Content Sanitization Utilities
 * Enforces an explicit allowlist of safe HTML tags and attributes for multi-tenant CMS and policies.
 * Defends against stored XSS, nested script injections, event handlers, and malicious pseudo-protocols.
 */

/**
 * Decodes numeric and named HTML entities to evaluate raw characters for protocol verification.
 * @param {string} str - Raw HTML string
 * @returns {string} Decoded string
 */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&Tab;/gi, ' ')
    .replace(/&NewLine;/gi, ' ');
}

/**
 * Validates whether a given URL is safe to render in href attributes.
 * Allows http, https, mailto, tel, anchor hashes, and relative paths.
 * Strictly blocks javascript:, data:, vbscript:, file:, and control character bypasses.
 *
 * @param {string} rawUrl - URL value from attribute
 * @returns {boolean} True if URL protocol is safe
 */
function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  // Decode HTML entities and strip ASCII control characters / invisible whitespaces
  const decoded = decodeHtmlEntities(rawUrl).replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '');
  if (!decoded) return false;

  // Block dangerous pseudo-protocols
  if (/^(javascript|vbscript|data|file):/i.test(decoded)) {
    return false;
  }

  // Permit safe protocols: http, https, mailto, tel, anchors, and relative paths
  if (/^(https?:\/\/[^\s"'<>\\]+|mailto:[^@\s]+@[^@\s]+|tel:\+?[0-9\s()-]+|#[a-zA-Z0-9_-]*|\/(?!\/)[^\\<>"']*)$/i.test(decoded)) {
    return true;
  }

  return false;
}

/**
 * Explicit allowlist of permissible HTML tags for rich policy and CMS typography.
 */
const ALLOWED_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
  'ul', 'ol', 'li', 'blockquote', 'hr', 'br', 'span', 'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div'
]);

/**
 * Dangerous wrapper tags whose opening tag, closing tag, AND inner contents must be completely excised.
 */
const BLOCKED_WRAPPER_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'applet',
  'svg', 'math', 'form', 'input', 'textarea', 'select', 'button',
  'meta', 'link', 'base', 'noscript', 'template', 'frame', 'frameset',
  'video', 'audio', 'source', 'track', 'canvas'
];

/**
 * Policy and CMS content keys that contain rich text HTML requiring sanitization.
 */
const POLICY_AND_HTML_KEYS = new Set([
  'content',
  'answer',
  'returnPolicy',
  'privacyPolicy',
  'termsConditions',
  'shippingPolicy',
  'aboutUs',
  'policyOverview',
  'eligibleProducts',
  'nonReturnableProducts',
  'returnConditions',
  'refundProcess',
  'refundTimeline',
  'exchangeConditions',
  'shippingLocations',
  'trackingInformation'
]);

/**
 * Robust, Multi-Pass HTML Sanitizer
 * Strips dangerous executable tags, event handlers, and pseudo-protocols while preserving
 * typography and layout formatting for store policies.
 *
 * @param {string} dirtyHtml - Untrusted HTML input
 * @returns {string} Sanitized HTML safe for storage and rendering
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  let clean = dirtyHtml;

  // 1. Multi-pass removal of blocked wrapper tags and all enclosed contents.
  // Loop until string stabilizes to defeat nested wrapper evasions (e.g. <scr<script>ipt>).
  let prev;
  do {
    prev = clean;
    for (const tag of BLOCKED_WRAPPER_TAGS) {
      const blockRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
      clean = clean.replace(blockRegex, '');
      const selfCloseRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
      clean = clean.replace(selfCloseRegex, '');
    }
    // Remove HTML comment blocks
    clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  } while (clean !== prev);

  // 2. Tokenize and filter all remaining HTML tags against the explicit allowlist
  const tagRegex = /<\/?([a-zA-Z0-9]+)((?:\s+[^>]*)?)\/?>/g;

  clean = clean.replace(tagRegex, (fullMatch, rawTagName, rawAttrs) => {
    const tagName = rawTagName.toLowerCase();

    // If tag is not in allowlist, strip the tag entirely
    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    // Preserve valid closing tags
    if (fullMatch.startsWith('</')) {
      return `</${tagName}>`;
    }

    // Filter attributes on opening tag
    const sanitizedAttrs = [];
    if (rawAttrs && rawAttrs.trim()) {
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let match;
      while ((match = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = match[1].toLowerCase();
        const attrVal = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] || ''));

        // Never permit event handler attributes (onclick, onerror, onload, etc.)
        if (attrName.startsWith('on')) {
          continue;
        }

        // Tag-specific attribute allowlisting
        if (tagName === 'a') {
          if (attrName === 'href') {
            if (isSafeUrl(attrVal)) {
              sanitizedAttrs.push(`href="${attrVal.replace(/"/g, '&quot;')}"`);
            } else {
              sanitizedAttrs.push('href="#"');
            }
          } else if (attrName === 'target') {
            if (attrVal === '_blank') {
              sanitizedAttrs.push('target="_blank"');
              sanitizedAttrs.push('rel="noopener noreferrer"');
            }
          } else if (attrName === 'title') {
            sanitizedAttrs.push(`title="${attrVal.replace(/"/g, '&quot;')}"`);
          }
        } else if (tagName === 'th' || tagName === 'td') {
          if (attrName === 'colspan' || attrName === 'rowspan') {
            const num = parseInt(attrVal, 10);
            if (!isNaN(num) && num > 0) sanitizedAttrs.push(`${attrName}="${num}"`);
          } else if (attrName === 'title') {
            sanitizedAttrs.push(`title="${attrVal.replace(/"/g, '&quot;')}"`);
          }
        } else if (attrName === 'title') {
          sanitizedAttrs.push(`title="${attrVal.replace(/"/g, '&quot;')}"`);
        }
      }
    }

    const isSelfClosing = fullMatch.endsWith('/>') || tagName === 'hr' || tagName === 'br';
    const attrString = sanitizedAttrs.length > 0 ? ` ${sanitizedAttrs.join(' ')}` : '';
    return isSelfClosing ? `<${tagName}${attrString} />` : `<${tagName}${attrString}>`;
  });

  // 3. Remove any remaining orphaned opening brackets or incomplete tag remnants
  clean = clean.replace(/<[a-zA-Z0-9/]*$/g, '');

  return clean.trim();
}

/**
 * Deeply sanitizes all string content in an object or array before persistence in MongoDB.
 * Targets policy fields, CMS pages, FAQ answers, and any string containing HTML tags.
 *
 * @param {*} data - Arbitrary data payload (object, array, string)
 * @returns {*} Sanitized copy of data
 */
export function sanitizeContentData(data) {
  if (!data) return data;
  if (data instanceof Date) return data;
  if (typeof data === 'string') return sanitizeHtml(data);
  if (Array.isArray(data)) return data.map(sanitizeContentData);

  if (typeof data === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      if (v instanceof Date) {
        res[k] = v;
      } else if (typeof v === 'string') {
        if (POLICY_AND_HTML_KEYS.has(k) || v.includes('<')) {
          res[k] = sanitizeHtml(v);
        } else {
          res[k] = v;
        }
      } else if (typeof v === 'object' && v !== null) {
        res[k] = sanitizeContentData(v);
      } else {
        res[k] = v;
      }
    }
    return res;
  }

  return data;
}
