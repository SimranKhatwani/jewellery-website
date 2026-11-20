import { Tenant } from '../models/Tenant.js';
import { config } from './env.js';

// Cache for verified active tenant domains (hostname -> { verified: boolean, expiry: number })
const tenantDomainCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

/**
 * Parses and returns list of explicitly configured static origins
 */
export function getApprovedStaticOrigins() {
  const extraOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const previewOrigins = (process.env.ALLOWED_PREVIEW_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const baseOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://jewellery-website-eta-flax.vercel.app',
    'http://jewellery-website-eta-flax.vercel.app',
    ...extraOrigins,
    ...previewOrigins,
    process.env.ADMIN_URL,
  ]
    .map((o) => (o ? String(o).trim().replace(/\/+$/, '') : null))
    .filter(Boolean);

  return Array.from(new Set(baseOrigins));
}

/**
 * Checks whether an origin belongs to a verified active tenant's custom domain
 * @param {string} origin
 * @returns {Promise<boolean>}
 */
export async function isVerifiedTenantDomain(origin) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase().trim();

    if (!hostname) return false;

    // Check memory cache first
    const now = Date.now();
    const cached = tenantDomainCache.get(hostname);
    if (cached && cached.expiry > now) {
      return cached.verified;
    }

    // Query active verified tenant custom domain in MongoDB
    const tenant = await Tenant.findOne({
      customDomain: hostname,
      customDomainVerified: true,
      status: 'active',
    }).select('_id');

    const isVerified = Boolean(tenant);
    tenantDomainCache.set(hostname, { verified: isVerified, expiry: now + CACHE_TTL_MS });
    return isVerified;
  } catch {
    return false;
  }
}

/**
 * Centralized origin validation callback for Express and Socket.io
 * @param {string} origin
 * @param {Function} callback (err, allow)
 */
export async function validateCorsOrigin(origin, callback) {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) {
    return callback(null, true);
  }

  const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
  const approvedOrigins = getApprovedStaticOrigins();

  // 1. Check exact match against approved static/production/preview allowlist
  if (approvedOrigins.includes(normalizedOrigin)) {
    return callback(null, true);
  }

  // 2. In non-production, permit local network/dev hosts
  if (!config.isProduction) {
    try {
      const parsed = new URL(normalizedOrigin);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return callback(null, true);
      }
    } catch {
      // ignore parse failure
    }
  }

  // 3. Dynamic verification for tenant custom domains
  const isTenantValid = await isVerifiedTenantDomain(normalizedOrigin);
  if (isTenantValid) {
    return callback(null, true);
  }

  // 4. Reject unapproved origin
  return callback(null, false);
}

/**
 * Express CORS Middleware Options
 * Uses Bearer JWT authentication; credentials (cookies) are disabled.
 */
export const expressCorsOptions = {
  origin: (origin, callback) => {
    validateCorsOrigin(origin, callback).catch(() => callback(null, false));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Tenant-ID',
    'X-Store-Slug',
    'X-Guest-Session-ID',
    'Idempotency-Key',
    'idempotency-key',
  ],
  maxAge: 86400, // 24 hours preflight cache
};

/**
 * Socket.IO CORS Options
 */
export const socketCorsOptions = {
  origin: (origin, callback) => {
    validateCorsOrigin(origin, callback).catch(() => callback(null, false));
  },
  credentials: false,
  methods: ['GET', 'POST'],
};
