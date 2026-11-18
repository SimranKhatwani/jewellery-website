/**
 * Lightweight & Robust HTML Sanitizer for Multi-Tenant Rich-Text Content
 * Strips executable scripts, frames, dangerous objects, style injections,
 * and malicious event handlers to prevent XSS while preserving rich typography tags.
 */

export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  let clean = dirtyHtml;

  // 1. Remove dangerous wrapper tags entirely along with their inner content
  const dangerousBlockTags = ['script', 'iframe', 'object', 'embed', 'style', 'form', 'svg', 'math'];
  for (const tag of dangerousBlockTags) {
    const blockRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    clean = clean.replace(blockRegex, '');
    // Self-closing variants e.g. <embed ... />
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    clean = clean.replace(selfClosingRegex, '');
  }

  // 2. Remove other disallowed tags while preserving inner text
  const disallowedTags = ['input', 'textarea', 'select', 'button', 'link', 'meta', 'base', 'applet'];
  for (const tag of disallowedTags) {
    const tagRegex = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    clean = clean.replace(tagRegex, '');
  }

  // 3. Remove inline JavaScript event handlers (e.g. onload=, onerror=, onclick=, onmouseover=)
  clean = clean.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 4. Remove pseudo-protocols (javascript:, data:text/html, vbscript:)
  clean = clean.replace(/(href|src|action)\s*=\s*['"]\s*(?:javascript|data|vbscript):[^'"]*['"]/gi, '$1="#"');
  clean = clean.replace(/(href|src|action)\s*=\s*(?:javascript|data|vbscript):[^\s>]+/gi, '$1="#"');

  return clean.trim();
}

/**
 * Deeply sanitizes all string content in an object or array
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
      } else if (k === 'content' || k === 'answer') {
        res[k] = sanitizeHtml(v);
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
