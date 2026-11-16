import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/security.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/env.js';

// Legacy Single-Store Routes (Preserved for existing frontend compatibility)
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import mediaRoutes from './routes/media.routes.js';

// Multi-Tenant SaaS Routes (Phase 1 & Phase 2)
import saasAuthRoutes from './routes/saasAuth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import roleRoutes from './routes/role.routes.js';
import platformRoutes from './routes/platform.routes.js';
import planPlatformRoutes from './routes/planPlatform.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import storefrontRoutes from './routes/storefront.routes.js';
import customerRoutes from './routes/customer.routes.js';
import orderRoutes from './routes/order.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import reportRoutes from './routes/report.routes.js';

export const createApp = () => {
  const app = express();

  // Apply Security Headers
  app.use(securityHeaders);

  // Configure CORS
  const extraOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://jewellery-website-eta-flax.vercel.app',
    'http://jewellery-website-eta-flax.vercel.app',
    ...extraOrigins,
    process.env.ADMIN_URL,
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) {
          callback(null, true);
          return;
        }

        const isExactMatch = allowedOrigins.includes(origin);
        const isVercelPreview = /^https:\/\/jewellery-website-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);

        if (isExactMatch || isVercelPreview) {
          callback(null, true);
        } else if (config.isProduction) {
          callback(new Error(`CORS blocked: Origin '${origin}' is not authorized.`));
        } else {
          callback(null, true); // Dev-friendly fallback for local testing
        }
      },
      credentials: true,
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
    })
  );

  // Body parser with raw body buffer capture for webhook signature verification
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AURELLE Fine Jewellery Backend API (Multi-Tenant SaaS)',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Legacy Store Routes (Preserved)
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/customers', customerRoutes);

  // Mount SaaS Platform & Tenant Routes (Phase 1 & Phase 2)
  app.use('/api/v1/auth', saasAuthRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/v1/roles', roleRoutes);
  app.use('/api/v1/platform/plans', planPlatformRoutes);
  app.use('/api/v1/platform', platformRoutes);
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use('/api/v1/storefront', storefrontRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/reports', reportRoutes);

  // 404 Route Handler
  app.use(notFoundHandler);

  // Central Error Handler
  app.use(errorHandler);

  return app;
};
