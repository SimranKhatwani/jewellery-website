/**
 * @file sanitize.js
 * @description Frontend HTML Sanitizer for Store Policies & Rich-Text Content
 * Utilizes the browser's native DOMParser to parse and sanitize untrusted HTML trees,
 * with a reliable pure-JavaScript tokenizer fallback for non-DOM environments.
 * Prevents stored XSS when rendering content via dangerouslySetInnerHTML.
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
 * Blocks javascript:, data:, vbscript:, file:, and control character bypasses.
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
 * Pure JavaScript HTML sanitizer fallback for non-DOM environments
 *
 * @param {string} dirtyHtml - Untrusted HTML input
 * @returns {string} Sanitized HTML
 */
function sanitizeHtmlPure(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  let clean = dirtyHtml;

  // 1. Multi-pass removal of blocked wrapper tags and all enclosed contents
  let prev;
  do {
    prev = clean;
    for (const tag of BLOCKED_WRAPPER_TAGS) {
      const blockRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
      clean = clean.replace(blockRegex, '');
      const selfCloseRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
      clean = clean.replace(selfCloseRegex, '');
    }
    clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  } while (clean !== prev);

  // 2. Tokenize and filter all remaining HTML tags against allowlist
  const tagRegex = /<\/?([a-zA-Z0-9]+)((?:\s+[^>]*)?)\/?>/g;

  clean = clean.replace(tagRegex, (fullMatch, rawTagName, rawAttrs) => {
    const tagName = rawTagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (fullMatch.startsWith('</')) {
      return `</${tagName}>`;
    }

    const sanitizedAttrs = [];
    if (rawAttrs && rawAttrs.trim()) {
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let match;
      while ((match = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = match[1].toLowerCase();
        const attrVal = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] || ''));

        if (attrName.startsWith('on')) {
          continue;
        }

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

  clean = clean.replace(/<[a-zA-Z0-9/]*$/g, '');
  return clean.trim();
}

/**
 * Sanitizes HTML using the browser's native DOMParser
 *
 * @param {string} dirtyHtml - Untrusted HTML input
 * @returns {string} Sanitized HTML safe for dangerouslySetInnerHTML
 */
function sanitizeWithDOMParser(dirtyHtml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');

    function cleanElement(node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === 3) {
          // Safe text node
          continue;
        }
        if (child.nodeType === 8) {
          // Remove comment node
          node.removeChild(child);
          continue;
        }
        if (child.nodeType !== 1) {
          // Remove other non-element nodes
          node.removeChild(child);
          continue;
        }

        const tagName = child.tagName.toLowerCase();

        // Remove dangerous wrapper tags entirely along with their children
        if (BLOCKED_WRAPPER_TAGS.includes(tagName)) {
          node.removeChild(child);
          continue;
        }

        // If tag is not in allowlist, unwrap its children into the parent
        if (!ALLOWED_TAGS.has(tagName)) {
          cleanElement(child);
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
          node.removeChild(child);
          continue;
        }

        // Tag is allowed: strictly filter its attributes
        const attrs = Array.from(child.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          const attrVal = attr.value;

          // Never allow inline event handlers
          if (attrName.startsWith('on')) {
            child.removeAttribute(attr.name);
            continue;
          }

          if (tagName === 'a') {
            if (attrName === 'href') {
              if (!isSafeUrl(attrVal)) {
                child.setAttribute('href', '#');
              }
            } else if (attrName === 'target') {
              if (attrVal === '_blank') {
                child.setAttribute('rel', 'noopener noreferrer');
              } else {
                child.removeAttribute(attr.name);
              }
            } else if (attrName !== 'title' && attrName !== 'rel') {
              child.removeAttribute(attr.name);
            }
          } else if (tagName === 'th' || tagName === 'td') {
            if (attrName === 'colspan' || attrName === 'rowspan') {
              const num = parseInt(attrVal, 10);
              if (isNaN(num) || num <= 0) {
                child.removeAttribute(attr.name);
              }
            } else if (attrName !== 'title') {
              child.removeAttribute(attr.name);
            }
          } else if (attrName !== 'title') {
            child.removeAttribute(attr.name);
          }
        }

        // Recursively clean children
        cleanElement(child);
      }
    }

    cleanElement(doc.body);
    return doc.body.innerHTML.trim();
  } catch (_err) {
    // Fall back to pure tokenizer if DOMParser fails or throws
    return sanitizeHtmlPure(dirtyHtml);
  }
}

/**
 * Primary Frontend HTML Sanitizer
 * Automatically uses the browser DOMParser if available, falling back to pure tokenizer.
 *
 * @param {string} dirtyHtml - Untrusted HTML input
 * @returns {string} Sanitized HTML safe for rendering
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    return sanitizeWithDOMParser(dirtyHtml);
  }

  return sanitizeHtmlPure(dirtyHtml);
}
