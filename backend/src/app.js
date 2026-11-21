import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/security.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/env.js';
import { expressCorsOptions } from './config/cors.js';
import { globalApiLimiter } from './config/rateLimit.js';

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
import couponRoutes from './routes/coupon.routes.js';

export const createApp = () => {
  const app = express();

  // Trust reverse proxy for accurate client IP detection and rate limiting
  app.set('trust proxy', process.env.TRUST_PROXY || 1);

  // Apply Security Headers
  app.use(securityHeaders);

  // Configure Controlled CORS Strategy
  app.use(cors(expressCorsOptions));

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

  // Apply Global API Rate Limiter (skips /api/health)
  app.use('/api', globalApiLimiter);

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
  app.use('/api/coupons', couponRoutes);

  // Mount SaaS Platform & Tenant Routes (Phase 1 & Phase 2)
  app.use('/api/v1/auth', saasAuthRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/v1/roles', roleRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/v1/platform/plans', planPlatformRoutes);
  app.use('/api/v1/platform', platformRoutes);
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use('/api/v1/storefront', storefrontRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/coupons', couponRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/reports', reportRoutes);

  // 404 Route Handler
  app.use(notFoundHandler);

  // Central Error Handler
  app.use(errorHandler);

  return app;
};
