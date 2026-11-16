import * as analyticsService from '../services/analytics.service.js';

/**
 * GET /api/v1/analytics/overview
 * Overview executive KPIs
 */
export async function getOverview(req, res, next) {
  try {
    const tenantId = req.tenant._id;
    const { preset, startDate, endDate } = req.query;

    const data = await analyticsService.getOverviewAnalytics(tenantId, {
      preset,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/sales-trends
 * Daily / weekly / monthly sales aggregation
 */
export async function getSalesTrends(req, res, next) {
  try {
    const tenantId = req.tenant._id;
    const { preset, startDate, endDate, groupBy } = req.query;

    const data = await analyticsService.getSalesTrends(
      tenantId,
      { preset, startDate, endDate },
      groupBy || 'day'
    );

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/orders
 * Order status distribution and order velocity
 */
export async function getOrderDistribution(req, res, next) {
  try {
    const tenantId = req.tenant._id;
    const { preset, startDate, endDate } = req.query;

    const data = await analyticsService.getOrderAnalytics(tenantId, {
      preset,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/bestsellers
 * Top selling products snapshot
 */
export async function getBestsellers(req, res, next) {
  try {
    const tenantId = req.tenant._id;
    const { preset, startDate, endDate, sortBy, limit, page } = req.query;

    const data = await analyticsService.getBestsellingProducts(
      tenantId,
      { preset, startDate, endDate },
      { sortBy, limit, page }
    );

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/customers
 * Customer retention and order frequency
 */
export async function getCustomerInsights(req, res, next) {
  try {
    const tenantId = req.tenant._id;
    const { preset, startDate, endDate } = req.query;

    const data = await analyticsService.getCustomerAnalytics(tenantId, {
      preset,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/payments
 * Payment breakdown by method and payment status
 */
export async function getPaymentBreakdown(req, res, next) {
  try {
    const tenantId = req.tenant._id;
    const { preset, startDate, endDate } = req.query;

    const data = await analyticsService.getPaymentAnalytics(tenantId, {
      preset,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/inventory
 * Stock health, out-of-stock, low-stock, and untracked items
 */
export async function getInventoryInsights(req, res, next) {
  try {
    const tenantId = req.tenant._id;

    const data = await analyticsService.getInventoryAnalytics(tenantId);

    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      data,
    });
  } catch (error) {
    next(error);
  }
}
