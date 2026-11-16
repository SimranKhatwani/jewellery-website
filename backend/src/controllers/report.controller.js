import * as reportService from '../services/report.service.js';
import { BadRequestError } from '../utils/errors.js';

export async function getSalesReport(req, res, next) {
  try {
    const data = await reportService.getSalesReport(req.tenant._id, req.query);
    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrdersReport(req, res, next) {
  try {
    const data = await reportService.getOrdersReport(req.tenant._id, req.query);
    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductsReport(req, res, next) {
  try {
    const data = await reportService.getProductsReport(req.tenant._id, req.query);
    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryReport(req, res, next) {
  try {
    const data = await reportService.getInventoryReport(req.tenant._id, req.query);
    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomersReport(req, res, next) {
  try {
    const data = await reportService.getCustomersReport(req.tenant._id, req.query);
    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentsReport(req, res, next) {
  try {
    const data = await reportService.getPaymentsReport(req.tenant._id, req.query);
    res.json({
      success: true,
      tenantId: req.tenant._id,
      tenantSlug: req.tenant.slug,
      currency: req.tenant.settings?.currency || 'INR',
      currencySymbol: req.tenant.settings?.currencySymbol || '₹',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Universal Report Export Handler
 * GET /api/v1/reports/:reportType/export?format=csv|html|pdf
 */
export async function exportReport(req, res, next) {
  try {
    const { reportType } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();
    const options = { ...req.query, isExport: true };
    const tenant = req.tenant;

    let reportData = null;

    switch (reportType) {
      case 'sales':
        reportData = await reportService.getSalesReport(tenant._id, options);
        break;
      case 'orders':
        reportData = await reportService.getOrdersReport(tenant._id, options);
        break;
      case 'products':
        reportData = await reportService.getProductsReport(tenant._id, options);
        break;
      case 'inventory':
        reportData = await reportService.getInventoryReport(tenant._id, options);
        break;
      case 'customers':
        reportData = await reportService.getCustomersReport(tenant._id, options);
        break;
      case 'payments':
        reportData = await reportService.getPaymentsReport(tenant._id, options);
        break;
      default:
        throw new BadRequestError(`Unsupported report type: '${reportType}'`);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const storeSlug = tenant.slug || 'aurelle';

    if (format === 'csv') {
      const csvContent = reportService.generateCSV(reportType, reportData, tenant);
      const filename = `aurelle-${storeSlug}-${reportType}-report-${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    }

    if (format === 'html' || format === 'pdf') {
      const htmlContent = reportService.generatePrintHTML(reportType, reportData, tenant);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(htmlContent);
    }

    throw new BadRequestError(`Unsupported export format '${format}'. Supported: csv, html, pdf`);
  } catch (err) {
    next(err);
  }
}
