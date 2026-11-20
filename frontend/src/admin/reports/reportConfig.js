/**
 * @file reportConfig.js
 * @description Configuration registry defining available administrative business reports,
 * categories, descriptions, lucide icons, and applicable date-filter capabilities.
 */

import {
  DollarSign,
  ShoppingBag,
  Package,
  Archive,
  Users,
  CreditCard,
} from 'lucide-react';

/**
 * Registry of downloadable and previewable administrative business reports.
 */
export const REPORT_CATEGORIES = [
  {
    id: 'sales',
    name: 'Sales Report',
    shortName: 'Sales',
    icon: DollarSign,
    description: 'Detailed revenue breakdown, order totals, deductions, taxes, and shipping fees.',
    hasDateFilter: true,
  },
  {
    id: 'orders',
    name: 'Orders Report',
    shortName: 'Orders',
    icon: ShoppingBag,
    description: 'Comprehensive fulfillment log with customer identity, item quantities, and status.',
    hasDateFilter: true,
  },
  {
    id: 'products',
    name: 'Products Report',
    shortName: 'Products',
    icon: Package,
    description: 'Catalogue listing with SKU breakdown, category classification, pricing, and variants.',
    hasDateFilter: false,
  },
  {
    id: 'inventory',
    name: 'Inventory Report',
    shortName: 'Inventory',
    icon: Archive,
    description: 'Stock availability, restock thresholds, tracked quantities, and untracked inventory.',
    hasDateFilter: false,
  },
  {
    id: 'customers',
    name: 'Customers Report',
    shortName: 'Customers',
    icon: Users,
    description: 'Client patronage history, registered vs guest accounts, lifetime order spend, and retention.',
    hasDateFilter: true,
  },
  {
    id: 'payments',
    name: 'Payments Report',
    shortName: 'Payments',
    icon: CreditCard,
    description: 'Payment settlement log across COD, CARD, and UPI with verified payment status.',
    hasDateFilter: true,
  },
];
