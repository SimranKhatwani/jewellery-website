import { globalApiLimiter, strictAuthLimiter } from '../config/rateLimit.js';

/**
 * Standard Security Headers Middleware
 */
export const securityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

/**
 * Backwards-compatible rate limiter exports
 * @deprecated Prefer importing directly from '../config/rateLimit.js'
 */
export const apiLimiter = globalApiLimiter;
export const authLimiter = strictAuthLimiter;

