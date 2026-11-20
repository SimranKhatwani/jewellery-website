import rateLimit from 'express-rate-limit';

/**
 * Custom handler for consistent HTTP 429 Rate Limit Exceeded responses
 */
const rateLimitHandler = (message, code = 'RATE_LIMIT_EXCEEDED') => (req, res) => {
  res.status(429).json({
    success: false,
    message,
    code,
  });
};

/**
 * 1. Global API Rate Limiter
 * Provides baseline DoS protection across general API endpoints.
 * Configurable via environment variables (default: 300 requests / 15 minutes).
 * Bypasses health check endpoint.
 */
const apiWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);
const apiMax = parseInt(process.env.RATE_LIMIT_MAX || '300', 10);

export const globalApiLimiter = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many requests. Please slow down and try again later.',
    'RATE_LIMIT_EXCEEDED'
  ),
  skip: (req) => {
    // Never throttle monitoring and health endpoints
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * 2. Strict Authentication Rate Limiter
 * Protects credential-sensitive endpoints (login, registration, password reset, invitations).
 * Configurable via environment variables (default: 10 attempts / 15 minutes).
 */
const authWindowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10);

export const strictAuthLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many authentication attempts. Please try again after 15 minutes.',
    'AUTH_RATE_LIMIT_EXCEEDED'
  ),
});

/**
 * 3. Coupon Validation Rate Limiter
 * Protects discount code verification endpoints from brute-force dictionary attacks.
 * Allows 25 checks per 15 minutes per IP.
 */
export const couponRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many coupon validation attempts. Please try again later.',
    'COUPON_RATE_LIMIT_EXCEEDED'
  ),
});
