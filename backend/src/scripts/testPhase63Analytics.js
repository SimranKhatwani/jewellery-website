/**
 * AURELLE Phase 6.3: Tenant Admin Analytics Verification Suite
 *
 * Verifies all 24 required test cases:
 * 1. Correct overview metrics
 * 2. Daily sales aggregation
 * 3. Weekly sales aggregation
 * 4. Monthly sales aggregation
 * 5. Custom date range
 * 6. Date boundary handling
 * 7. Cancelled order exclusion
 * 8. Pending CARD order calculation
 * 9. Pending UPI order calculation
 * 10. COD payment calculation
 * 11. Paid vs pending revenue
 * 12. Bestselling products using order snapshots
 * 13. Deleted or edited product historical records
 * 14. New vs returning customer calculation
 * 15. Guest customer counting
 * 16. Low-stock inventory
 * 17. Out-of-stock inventory
 * 18. Unknown inventory handling
 * 19. Variant inventory without double-counting
 * 20. Tenant isolation
 * 21. Unauthorized access
 * 22. Empty database behaviour
 * 23. Currency formatting and tenant currency isolation
 * 24. Refund treatment where actual refund data exists
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { createApp } from '../app.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Role } from '../models/Role.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  SYSTEM_ROLE_SLUGS,
  MEMBERSHIP_STATUS,
} from '../config/constants.js';
import { generateToken } from '../utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runPhase63AnalyticsTests = async () => {
  console.log('================================================================');
  console.log('   AURELLE SaaS Phase 6.3: Tenant Admin Analytics Test Suite');
  console.log('================================================================\n');

  await connectDB();
  try {
    await Order.syncIndexes();
    await Product.syncIndexes();
  } catch (idxErr) {
    console.warn('Index sync notice:', idxErr.message);
  }

  const app = createApp();

  // Ephemeral HTTP server
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  ✓ PASS [Test ${passed + failed + 1}]: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL [Test ${passed + failed + 1}]: ${description}`);
      failed++;
    }
  };

  // IDs to clean up
  const createdTenantIds = [];
  const createdUserIds = [];
  const createdProductIds = [];
  const createdOrderIds = [];
  const createdPaymentIds = [];

  try {
    // -------------------------------------------------------------
    // SETUP: Tenants (Tenant Alpha & Tenant Beta)
    // -------------------------------------------------------------
    console.log('[Setup] Creating test tenants...');
    const tenantOwner = await User.create({
      name: `Owner ${timestamp}`,
      email: `owner_${timestamp}@aurelle-test.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(tenantOwner._id);

    const tenantAlpha = await Tenant.create({
      name: `Alpha Maison ${timestamp}`,
      slug: `alpha-maison-${timestamp}`,
      ownerId: tenantOwner._id,
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
      },
    });
    createdTenantIds.push(tenantAlpha._id);

    const tenantBeta = await Tenant.create({
      name: `Beta Bijoux ${timestamp}`,
      slug: `beta-bijoux-${timestamp}`,
      ownerId: tenantOwner._id,
      settings: {
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'UTC',
      },
    });
    createdTenantIds.push(tenantBeta._id);

    // Tenant Empty (for empty database test)
    const tenantEmpty = await Tenant.create({
      name: `Empty Maison ${timestamp}`,
      slug: `empty-maison-${timestamp}`,
      ownerId: tenantOwner._id,
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
      },
    });
    createdTenantIds.push(tenantEmpty._id);

    // Role
    let storeAdminRole = await Role.findOne({ slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN });
    if (!storeAdminRole) {
      storeAdminRole = await Role.create({
        name: 'Store Administrator',
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
        permissions: ['*'],
      });
    }

    // Admins
    const adminAlphaUser = await User.create({
      name: `Admin Alpha ${timestamp}`,
      email: `admin_alpha_${timestamp}@aurelle-test.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(adminAlphaUser._id);

    await TenantMembership.create({
      tenantId: tenantAlpha._id,
      userId: adminAlphaUser._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    const adminBetaUser = await User.create({
      name: `Admin Beta ${timestamp}`,
      email: `admin_beta_${timestamp}@aurelle-test.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(adminBetaUser._id);

    await TenantMembership.create({
      tenantId: tenantBeta._id,
      userId: adminBetaUser._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    const adminEmptyUser = await User.create({
      name: `Admin Empty ${timestamp}`,
      email: `admin_empty_${timestamp}@aurelle-test.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(adminEmptyUser._id);

    await TenantMembership.create({
      tenantId: tenantEmpty._id,
      userId: adminEmptyUser._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    // Customer User (Registered)
    const customerUser = await User.create({
      name: `Customer One ${timestamp}`,
      email: `cust1_${timestamp}@example.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(customerUser._id);

    // JWT Tokens
    const tokenAdminAlpha = generateToken({
      userId: adminAlphaUser._id,
      email: adminAlphaUser.email,
      role: 'store_admin',
    });
    const tokenAdminBeta = generateToken({
      userId: adminBetaUser._id,
      email: adminBetaUser.email,
      role: 'store_admin',
    });
    const tokenAdminEmpty = generateToken({
      userId: adminEmptyUser._id,
      email: adminEmptyUser.email,
      role: 'store_admin',
    });
    const tokenCustomer = generateToken({
      userId: customerUser._id,
      email: customerUser.email,
      role: 'customer',
    });

    // -------------------------------------------------------------
    // SETUP: Products for Tenant Alpha
    // -------------------------------------------------------------
    console.log('[Setup] Seeding catalog & inventory...');

    // P1: In-stock simple product
    const p1 = await Product.create({
      tenantId: tenantAlpha._id,
      name: `Diamond Pavé Ring ${timestamp}`,
      slug: `pave-ring-${timestamp}`,
      category: 'rings',
      priceUSD: 1000,
      stockQuantity: 20,
      inventoryStatus: 'in_stock',
      sku: `SKU-PAVE-${timestamp}`,
      primaryImage: '/images/pave.jpg',
      isPublished: true,
    });
    createdProductIds.push(p1._id);

    // P2: Low-stock simple product (stock: 3, threshold: 5)
    const p2 = await Product.create({
      tenantId: tenantAlpha._id,
      name: `Solitaire Pendant ${timestamp}`,
      slug: `solitaire-pendant-${timestamp}`,
      category: 'necklaces',
      priceUSD: 500,
      stockQuantity: 3,
      lowStockThreshold: 5,
      inventoryStatus: 'low_stock',
      sku: `SKU-SOL-${timestamp}`,
      primaryImage: '/images/solitaire.jpg',
      isPublished: true,
    });
    createdProductIds.push(p2._id);

    // P3: Out of stock product
    const p3 = await Product.create({
      tenantId: tenantAlpha._id,
      name: `Emerald Choker ${timestamp}`,
      slug: `emerald-choker-${timestamp}`,
      category: 'necklaces',
      priceUSD: 2500,
      stockQuantity: 0,
      inventoryStatus: 'out_of_stock',
      sku: `SKU-EME-${timestamp}`,
      primaryImage: '/images/emerald.jpg',
      isPublished: true,
    });
    createdProductIds.push(p3._id);

    // P4: Unknown / untracked inventory product
    const p4 = await Product.create({
      tenantId: tenantAlpha._id,
      name: `Vintage Brooch ${timestamp}`,
      slug: `vintage-brooch-${timestamp}`,
      category: 'brooches',
      priceUSD: 300,
      stockQuantity: 0,
      inventoryStatus: 'unknown',
      sku: `SKU-BROOCH-${timestamp}`,
      primaryImage: '/images/brooch.jpg',
      isPublished: false, // draft
    });
    createdProductIds.push(p4._id);

    // P5: Variant-based product (total stock = 10 + 4 + 0 = 14)
    const p5 = await Product.create({
      tenantId: tenantAlpha._id,
      name: `Aura Tennis Bracelet ${timestamp}`,
      slug: `aura-bracelet-${timestamp}`,
      category: 'bracelets',
      priceUSD: 1500,
      hasVariants: true,
      stockQuantity: 999, // Should NOT be double counted!
      inventoryStatus: 'in_stock',
      sku: `SKU-BRAC-${timestamp}`,
      primaryImage: '/images/bracelet.jpg',
      variants: [
        {
          name: 'Small (16cm)',
          sku: `SKU-BRAC-S-${timestamp}`,
          stockQuantity: 10,
          inventoryStatus: 'in_stock',
          isActive: true,
        },
        {
          name: 'Medium (18cm)',
          sku: `SKU-BRAC-M-${timestamp}`,
          stockQuantity: 4,
          inventoryStatus: 'low_stock',
          isActive: true,
        },
        {
          name: 'Large (20cm)',
          sku: `SKU-BRAC-L-${timestamp}`,
          stockQuantity: 0,
          inventoryStatus: 'out_of_stock',
          isActive: true,
        },
      ],
      isPublished: true,
    });
    createdProductIds.push(p5._id);

    // P6 (for later deletion test)
    const p6 = await Product.create({
      tenantId: tenantAlpha._id,
      name: `Ephemeral Tiara ${timestamp}`,
      slug: `ephemeral-tiara-${timestamp}`,
      category: 'tiaras',
      priceUSD: 4000,
      stockQuantity: 1,
      inventoryStatus: 'in_stock',
      sku: `SKU-TIARA-${timestamp}`,
      primaryImage: '/images/tiara.jpg',
      isPublished: true,
    });
    createdProductIds.push(p6._id);

    // -------------------------------------------------------------
    // SETUP: Historical & Current Orders
    // -------------------------------------------------------------
    console.log('[Setup] Seeding orders with diverse payment states & customer types...');

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // For returning customer test

    // O-Prior: Order placed 40 days ago by Customer One (so Customer One is returning for last 30 days)
    const orderPrior = await Order.create({
      tenantId: tenantAlpha._id,
      userId: customerUser._id,
      orderNumber: `AUR-PRIOR-${timestamp}`,
      customerInfo: {
        name: customerUser.name,
        email: customerUser.email,
        phone: '+919999900000',
        isGuest: false,
      },
      items: [
        {
          productId: p1._id,
          name: p1.name,
          sku: p1.sku,
          quantity: 1,
          unitPrice: 1000,
          itemSubtotal: 1000,
        },
      ],
      shippingAddress: {
        name: 'Cust One',
        phone: '+919999900000',
        addressLine1: 'Old Street',
        city: 'Mumbai',
        postalCode: '400001',
      },
      pricing: {
        subtotal: 1000,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 1000,
      },
      paymentMethod: PAYMENT_METHODS.COD,
      paymentStatus: PAYMENT_STATUS.PAID,
      orderStatus: ORDER_STATUS.DELIVERED,
      createdAt: fortyDaysAgo,
    });
    createdOrderIds.push(orderPrior._id);

    // O1: Valid Paid COD Order (placed 2 days ago by returning Customer One)
    // Subtotal: 2000, discount: 200, payable: 1800
    const order1 = await Order.create({
      tenantId: tenantAlpha._id,
      userId: customerUser._id,
      orderNumber: `AUR-O1-${timestamp}`,
      customerInfo: {
        name: customerUser.name,
        email: customerUser.email,
        phone: '+919999900000',
        isGuest: false,
      },
      items: [
        {
          productId: p1._id,
          name: p1.name,
          sku: p1.sku,
          quantity: 2,
          unitPrice: 1000,
          itemSubtotal: 2000,
        },
      ],
      shippingAddress: {
        name: 'Cust One',
        phone: '+919999900000',
        addressLine1: 'Marine Drive',
        city: 'Mumbai',
        postalCode: '400002',
      },
      pricing: {
        subtotal: 2000,
        discount: 200,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 1800,
      },
      paymentMethod: PAYMENT_METHODS.COD,
      paymentStatus: PAYMENT_STATUS.PAID,
      orderStatus: ORDER_STATUS.CONFIRMED,
      createdAt: twoDaysAgo,
    });
    createdOrderIds.push(order1._id);

    // O2: Valid Pending CARD Order (placed 2 days ago by Guest Customer A)
    // Subtotal: 1500, payable: 1500
    const order2 = await Order.create({
      tenantId: tenantAlpha._id,
      userId: null,
      orderNumber: `AUR-O2-${timestamp}`,
      customerInfo: {
        name: 'Guest A',
        email: `guestA_${timestamp}@domain.com`,
        phone: '+919876543210',
        isGuest: true,
      },
      items: [
        {
          productId: p2._id,
          name: p2.name,
          sku: p2.sku,
          quantity: 3,
          unitPrice: 500,
          itemSubtotal: 1500,
        },
      ],
      shippingAddress: {
        name: 'Guest A',
        phone: '+919876543210',
        addressLine1: 'Connaught Place',
        city: 'New Delhi',
        postalCode: '110001',
      },
      pricing: {
        subtotal: 1500,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 1500,
      },
      paymentMethod: PAYMENT_METHODS.CARD,
      paymentStatus: PAYMENT_STATUS.PENDING, // Must NOT count as collected!
      orderStatus: ORDER_STATUS.PENDING,
      createdAt: twoDaysAgo,
    });
    createdOrderIds.push(order2._id);

    // O3: Valid Pending UPI Order (placed 3 days ago by Guest Customer A - returning guest within period)
    // Subtotal: 3000, payable: 3000, containing P1 and P5
    const order3 = await Order.create({
      tenantId: tenantAlpha._id,
      userId: null,
      orderNumber: `AUR-O3-${timestamp}`,
      customerInfo: {
        name: 'Guest A',
        email: `guestA_${timestamp}@domain.com`, // Same guest email!
        phone: '+919876543210',
        isGuest: true,
      },
      items: [
        {
          productId: p1._id,
          name: p1.name,
          sku: p1.sku,
          quantity: 1,
          unitPrice: 1000,
          itemSubtotal: 1000,
        },
        {
          productId: p5._id,
          name: p5.name,
          sku: p5.sku,
          quantity: 1,
          unitPrice: 1500,
          itemSubtotal: 1500,
        },
        {
          productId: p6._id,
          name: 'Ephemeral Tiara Snapshot Title', // Historical snapshot!
          sku: p6.sku,
          quantity: 1,
          unitPrice: 500,
          itemSubtotal: 500,
        },
      ],
      shippingAddress: {
        name: 'Guest A',
        phone: '+919876543210',
        addressLine1: 'Connaught Place',
        city: 'New Delhi',
        postalCode: '110001',
      },
      pricing: {
        subtotal: 3000,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 3000,
      },
      paymentMethod: PAYMENT_METHODS.UPI,
      paymentStatus: PAYMENT_STATUS.PENDING, // Must NOT count as collected!
      orderStatus: ORDER_STATUS.PROCESSING,
      createdAt: threeDaysAgo,
    });
    createdOrderIds.push(order3._id);

    // O4: Cancelled Order (placed 2 days ago, cancelled by admin, totalPayable: 9999)
    // MUST BE COMPLETELY EXCLUDED from sales, collected revenue, and bestseller metrics!
    const order4 = await Order.create({
      tenantId: tenantAlpha._id,
      userId: customerUser._id,
      orderNumber: `AUR-O4-CANCELLED-${timestamp}`,
      customerInfo: {
        name: customerUser.name,
        email: customerUser.email,
        phone: '+919999900000',
        isGuest: false,
      },
      items: [
        {
          productId: p3._id,
          name: p3.name,
          sku: p3.sku,
          quantity: 5,
          unitPrice: 2000,
          itemSubtotal: 10000,
        },
      ],
      shippingAddress: {
        name: 'Cust One',
        phone: '+919999900000',
        addressLine1: 'Marine Drive',
        city: 'Mumbai',
        postalCode: '400002',
      },
      pricing: {
        subtotal: 10000,
        discount: 1000,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 9000,
      },
      paymentMethod: PAYMENT_METHODS.CARD,
      paymentStatus: PAYMENT_STATUS.FAILED,
      orderStatus: ORDER_STATUS.CANCELLED,
      cancellation: {
        isCancelled: true,
        cancelledAt: new Date(),
        reason: 'Payment authentication failed',
      },
      createdAt: twoDaysAgo,
    });
    createdOrderIds.push(order4._id);

    // O5: Refunded order in Tenant Alpha
    const order5 = await Order.create({
      tenantId: tenantAlpha._id,
      userId: null,
      orderNumber: `AUR-O5-REFUNDED-${timestamp}`,
      customerInfo: {
        name: 'Guest B',
        email: `guestB_${timestamp}@domain.com`,
        phone: '+919876543211',
        isGuest: true,
      },
      items: [
        {
          productId: p1._id,
          name: p1.name,
          sku: p1.sku,
          quantity: 1,
          unitPrice: 1000,
          itemSubtotal: 1000,
        },
      ],
      shippingAddress: {
        name: 'Guest B',
        phone: '+919876543211',
        addressLine1: 'Indiranagar',
        city: 'Bengaluru',
        postalCode: '560038',
      },
      pricing: {
        subtotal: 1000,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 1000,
      },
      paymentMethod: PAYMENT_METHODS.UPI,
      paymentStatus: PAYMENT_STATUS.REFUNDED,
      orderStatus: ORDER_STATUS.DELIVERED,
      createdAt: twoDaysAgo,
    });
    createdOrderIds.push(order5._id);

    // Order for Tenant Beta (Isolation verification)
    const orderBeta = await Order.create({
      tenantId: tenantBeta._id,
      userId: null,
      orderNumber: `AUR-BETA-${timestamp}`,
      customerInfo: {
        name: 'Beta Buyer',
        email: `betabuyer_${timestamp}@paris.fr`,
        phone: '+33123456789',
        isGuest: true,
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: 'Beta Sapphire Ring',
          sku: `SKU-BETA-${timestamp}`,
          quantity: 1,
          unitPrice: 9999,
          itemSubtotal: 9999,
        },
      ],
      shippingAddress: {
        name: 'Beta Buyer',
        phone: '+33123456789',
        addressLine1: 'Rue de la Paix',
        city: 'Paris',
        postalCode: '75002',
        country: 'France',
      },
      pricing: {
        subtotal: 9999,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 9999,
        currency: 'USD',
        currencySymbol: '$',
      },
      paymentMethod: PAYMENT_METHODS.CARD,
      paymentStatus: PAYMENT_STATUS.PAID,
      orderStatus: ORDER_STATUS.DELIVERED,
      createdAt: twoDaysAgo,
    });
    createdOrderIds.push(orderBeta._id);

    // Now delete P6 from catalog to verify snapshot resilience (Test 13)
    await Product.findByIdAndDelete(p6._id);

    console.log('[Setup] Test data initialized. Executing verification suite...\n');

    // Expected numbers for Tenant Alpha in last 30 days:
    // Valid orders in last 30 days:
    // O1 (COD Paid: 1800, discount: 200, gross: 2000, units: 2)
    // O2 (CARD Pending: 1500, discount: 0, gross: 1500, units: 3)
    // O3 (UPI Pending: 3000, discount: 0, gross: 3000, units: 3)
    // O5 (UPI Refunded: 1000, discount: 0, gross: 1000, units: 1)
    // Total Valid Orders = 4
    // Cancelled Orders = 1 (O4)
    // Total Orders = 5
    // Net Sales = 1800 + 1500 + 3000 + 1000 = 7300
    // Gross Order Value = 2000 + 1500 + 3000 + 1000 = 7500
    // Collected Revenue = 1800 (only O1 is PAID)
    // Pending Payment Amount = 1500 (O2) + 3000 (O3) = 4500
    // Total Units Sold = 2 + 3 + 3 + 1 = 9
    // AOV = 7300 / 4 = 1825

    // =========================================================================
    // TEST 1: Correct overview metrics
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.success === true, 'Overview API responds HTTP 200 with success: true');
      const fin = data.data.financials;
      const ord = data.data.orders;
      assert(
        ord.validOrders === 4 && ord.cancelledOrders === 1 && ord.totalOrders === 5,
        `Overview order counts are exact (valid: 4, cancelled: 1, total: 5, got valid: ${ord.validOrders}, cancelled: ${ord.cancelledOrders})`
      );
      assert(
        fin.netSales === 7300 && fin.grossOrderValue === 7500,
        `Overview financials match exact net sales (7300) and gross order value (7500, got ${fin.netSales} / ${fin.grossOrderValue})`
      );
      assert(
        fin.averageOrderValue === 1825,
        `Average Order Value (AOV) is exact 7300 / 4 = 1825 (got ${fin.averageOrderValue})`
      );
      assert(
        ord.totalUnitsSold === 9,
        `Total units sold matches exact valid items count (9, got ${ord.totalUnitsSold})`
      );
    }

    // =========================================================================
    // TEST 2: Daily sales aggregation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/sales-trends?preset=last7days&groupBy=day`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      assert(
        res.status === 200 && Array.isArray(data.data.trends) && data.data.trends.length >= 7,
        `Daily sales returns 7+ continuous day buckets (got ${data.data.trends?.length})`
      );
      // Zero-filled continuity: Check that days with 0 sales have salesAmount: 0 and ordersCount: 0
      const emptyDay = data.data.trends.find((t) => t.ordersCount === 0);
      assert(
        emptyDay && emptyDay.salesAmount === 0 && emptyDay.collectedAmount === 0,
        'Daily sales properly zero-fills days without orders for chart continuity'
      );
    }

    // =========================================================================
    // TEST 3: Weekly sales aggregation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/sales-trends?preset=last30days&groupBy=week`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.data.groupBy === 'week' && Array.isArray(data.data.trends),
        `Weekly sales aggregation groups by week successfully (${data.data.trends.length} weekly buckets)`
      );
    }

    // =========================================================================
    // TEST 4: Monthly sales aggregation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/sales-trends?preset=thismonth&groupBy=month`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.data.groupBy === 'month' && data.data.trends.length >= 1,
        `Monthly sales returns monthly format (found ${data.data.trends[0]?.date})`
      );
    }

    // =========================================================================
    // TEST 5: Custom date range
    // =========================================================================
    {
      const startStr = threeDaysAgo.toISOString().slice(0, 10);
      const endStr = now.toISOString().slice(0, 10);
      const res = await fetch(
        `${baseUrl}/api/v1/analytics/overview?preset=custom&startDate=${startStr}&endDate=${endStr}`,
        {
          headers: {
            Authorization: `Bearer ${tokenAdminAlpha}`,
            'X-Tenant-ID': tenantAlpha._id.toString(),
          },
        }
      );
      const data = await res.json();
      assert(
        res.status === 200 && data.data.dateRange.preset === 'custom',
        `Custom date range filter accepted and labeled: ${data.data?.dateRange?.label}`
      );
    }

    // =========================================================================
    // TEST 6: Date boundary handling
    // =========================================================================
    {
      // Older order placed 40 days ago should NOT be included in last 30 days
      const res = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // If orderPrior (1000) was erroneously included, netSales would be 8300 instead of 7300
      assert(
        data.data.financials.netSales === 7300,
        'Date boundary strictly excludes orders outside range (40-day old order excluded)'
      );

      // Invalid range check: startDate > endDate
      const invalidRes = await fetch(
        `${baseUrl}/api/v1/analytics/overview?preset=custom&startDate=2026-12-01&endDate=2026-11-01`,
        {
          headers: {
            Authorization: `Bearer ${tokenAdminAlpha}`,
            'X-Tenant-ID': tenantAlpha._id.toString(),
          },
        }
      );
      assert(
        invalidRes.status === 400,
        'Invalid custom date range (startDate > endDate) rejected with HTTP 400'
      );
    }

    // =========================================================================
    // TEST 7: Cancelled order exclusion
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // Cancelled order O4 was 9000 totalPayable, 5 units.
      // If included, netSales would be 16300, units would be 14.
      assert(
        data.data.financials.netSales === 7300 && data.data.orders.totalUnitsSold === 9,
        'Cancelled order O4 (₹9,000, 5 units) is strictly excluded from net sales and units sold'
      );
    }

    // =========================================================================
    // TEST 8: Pending CARD order calculation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/payments?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      const cardMethod = data.data.byMethod.find((m) => m.method === 'card');
      assert(
        cardMethod && cardMethod.pendingAmount === 1500 && cardMethod.collectedAmount === 0,
        `Pending CARD order (₹1,500) correctly reflects in pendingAmount and NOT in collectedAmount (pending: ${cardMethod?.pendingAmount}, collected: ${cardMethod?.collectedAmount})`
      );
    }

    // =========================================================================
    // TEST 9: Pending UPI order calculation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/payments?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      const upiMethod = data.data.byMethod.find((m) => m.method === 'upi');
      assert(
        upiMethod && upiMethod.pendingAmount === 3000,
        `Pending UPI order (₹3,000) correctly reflects in pendingAmount (got ₹${upiMethod?.pendingAmount})`
      );
    }

    // =========================================================================
    // TEST 10: COD payment calculation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/payments?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      const codMethod = data.data.byMethod.find((m) => m.method === 'cod');
      assert(
        codMethod && codMethod.collectedAmount === 1800 && codMethod.pendingAmount === 0,
        `Paid COD order (₹1,800) correctly reflects as collected revenue (got ₹${codMethod?.collectedAmount})`
      );
    }

    // =========================================================================
    // TEST 11: Paid vs pending revenue
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      const fin = data.data.financials;
      assert(
        fin.collectedRevenue === 1800 && fin.pendingPaymentAmount === 4500,
        `Paid vs pending revenue strictly separated (Collected: ₹${fin.collectedRevenue}, Pending: ₹${fin.pendingPaymentAmount})`
      );
    }

    // =========================================================================
    // TEST 12: Bestselling products using order snapshots
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/bestsellers?preset=last30days&sortBy=units`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && Array.isArray(data.data.products), 'Bestsellers API returns array of products');
      // P1 sold in O1 (2 units) + O3 (1 unit) + O5 (1 unit) = 4 units
      // P2 sold in O2 (3 units)
      // P5 sold in O3 (1 unit)
      // P6 sold in O3 (1 unit)
      const topProduct = data.data.products[0];
      assert(
        topProduct && topProduct.sku === p1.sku && topProduct.unitsSold === 4,
        `Top bestseller by units is ${p1.name} with 4 units sold (got ${topProduct?.name}: ${topProduct?.unitsSold})`
      );
    }

    // =========================================================================
    // TEST 13: Deleted or edited product historical records
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/bestsellers?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      const deletedSnap = data.data.products.find((p) => p.sku === p6.sku);
      assert(
        deletedSnap &&
          deletedSnap.name === 'Ephemeral Tiara Snapshot Title' &&
          deletedSnap.unitsSold === 1,
        `Deleted product ${p6.sku} persists in analytics using historical snapshot name and units (got: '${deletedSnap?.name}')`
      );
    }

    // =========================================================================
    // TEST 14: New vs returning customer calculation
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/customers?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // In last 30 days:
      // Customer One had order 40 days ago -> Returning!
      // Guest A had first order in this period -> New!
      // Guest B had first order in this period -> New!
      // Total unique customers = 3
      // Returning = 1 (Customer One), New = 2 (Guest A, Guest B)
      assert(
        data.data.returningCustomers === 1 && data.data.newCustomers === 2,
        `Customer retention accurately calculated (Returning: 1, New: 2, got Returning: ${data.data.returningCustomers}, New: ${data.data.newCustomers})`
      );
    }

    // =========================================================================
    // TEST 15: Guest customer counting
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/customers?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // Guest A placed TWO orders (O2 and O3) with same email guestA_${timestamp}@domain.com.
      // Must NOT be counted as two different customers!
      assert(
        data.data.totalUniqueCustomers === 3,
        `Guest customer with 2 orders grouped into single distinct identity (Total unique: 3, got ${data.data.totalUniqueCustomers})`
      );
      assert(
        data.data.frequency.twoOrders >= 1,
        'Guest A correctly categorized into "twoOrders" frequency bucket'
      );
    }

    // =========================================================================
    // TEST 16: Low-stock inventory
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/inventory`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // P2 has stock 3, threshold 5 -> low stock!
      const lowStockFound = data.data.lowStockItems.find((i) => i.sku === p2.sku);
      assert(
        data.data.lowStockCount >= 1 && lowStockFound !== undefined,
        `Low stock product ${p2.name} detected with stock ${lowStockFound?.stockQuantity} <= threshold ${lowStockFound?.threshold}`
      );
    }

    // =========================================================================
    // TEST 17: Out-of-stock inventory
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/inventory`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // P3 has stock 0, inventoryStatus: out_of_stock
      const outOfStockFound = data.data.outOfStockItems.find((i) => i.sku === p3.sku);
      assert(
        data.data.outOfStockCount >= 1 && outOfStockFound !== undefined,
        `Out of stock product ${p3.name} identified accurately`
      );
    }

    // =========================================================================
    // TEST 18: Unknown inventory handling
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/inventory`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // P4 has inventoryStatus: unknown.
      // Must NOT be counted as in_stock or 0 verified out_of_stock.
      const unknownFound = data.data.unknownInventoryItems.find((i) => i.sku === p4.sku);
      assert(
        data.data.unknownCount >= 1 && unknownFound !== undefined,
        `Untracked product ${p4.name} isolated in unknownCount and excluded from verified stock (got unknownCount: ${data.data.unknownCount})`
      );
    }

    // =========================================================================
    // TEST 19: Variant inventory without double-counting
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/inventory`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      // P1: 20
      // P2: 3
      // P3: 0
      // P4: unknown (not counted)
      // P5: variants 10 + 4 + 0 = 14 (parent has dummy 999 which must NOT be added!)
      // Total tracked units = 20 + 3 + 0 + 14 = 37
      assert(
        data.data.totalTrackedStockUnits === 37,
        `Variant stock summed without double-counting parent quantity (Expected: 37, got: ${data.data.totalTrackedStockUnits})`
      );
    }

    // =========================================================================
    // TEST 20: Tenant isolation
    // =========================================================================
    {
      // Admin Beta queries overview with Tenant Beta's token
      const resBeta = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminBeta}`,
          'X-Tenant-ID': tenantBeta._id.toString(),
        },
      });
      const dataBeta = await resBeta.json();
      assert(
        dataBeta.data.orders.totalOrders === 1 && dataBeta.data.financials.netSales === 9999,
        `Tenant Beta sees only its own 1 order and $9,999 net sales (Tenant Alpha orders completely isolated)`
      );

      // Attempt cross-tenant breach: Admin Beta passes Tenant Alpha's X-Tenant-ID header
      const breachRes = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminBeta}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      assert(
        breachRes.status === 403,
        `Cross-tenant breach attempt blocked with HTTP 403 Forbidden (Admin Beta denied access to Tenant Alpha)`
      );
    }

    // =========================================================================
    // TEST 21: Unauthorized access
    // =========================================================================
    {
      // No token
      const noAuthRes = await fetch(`${baseUrl}/api/v1/analytics/overview`, {
        headers: {
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      assert(noAuthRes.status === 401, 'Request with missing Authorization token rejected with HTTP 401');

      // Customer token (not an admin or tenant staff member)
      const customerRes = await fetch(`${baseUrl}/api/v1/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${tokenCustomer}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      assert(
        customerRes.status === 403,
        'Customer attempting to view Admin analytics rejected with HTTP 403 Forbidden'
      );
    }

    // =========================================================================
    // TEST 22: Empty database behaviour
    // =========================================================================
    {
      const resEmpty = await fetch(`${baseUrl}/api/v1/analytics/overview?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminEmpty}`,
          'X-Tenant-ID': tenantEmpty._id.toString(),
        },
      });
      const dataEmpty = await resEmpty.json();
      assert(
        resEmpty.status === 200 &&
          dataEmpty.data.orders.totalOrders === 0 &&
          dataEmpty.data.financials.netSales === 0 &&
          dataEmpty.data.financials.averageOrderValue === 0 &&
          dataEmpty.data.customers.totalUniqueCustomers === 0,
        'Empty tenant store returns graceful zero metrics without crashes or null errors'
      );

      const resEmptyTrends = await fetch(
        `${baseUrl}/api/v1/analytics/sales-trends?preset=last7days&groupBy=day`,
        {
          headers: {
            Authorization: `Bearer ${tokenAdminEmpty}`,
            'X-Tenant-ID': tenantEmpty._id.toString(),
          },
        }
      );
      const dataEmptyTrends = await resEmptyTrends.json();
      assert(
        resEmptyTrends.status === 200 &&
          Array.isArray(dataEmptyTrends.data.trends) &&
          dataEmptyTrends.data.trends.every((t) => t.salesAmount === 0 && t.ordersCount === 0),
        'Empty tenant trends returns clean zero-filled continuity series'
      );
    }

    // =========================================================================
    // TEST 23: Currency formatting and tenant currency isolation
    // =========================================================================
    {
      const resAlpha = await fetch(`${baseUrl}/api/v1/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const dataAlpha = await resAlpha.json();

      const resBeta = await fetch(`${baseUrl}/api/v1/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${tokenAdminBeta}`,
          'X-Tenant-ID': tenantBeta._id.toString(),
        },
      });
      const dataBeta = await resBeta.json();

      assert(
        dataAlpha.currency === 'INR' &&
          dataAlpha.currencySymbol === '₹' &&
          dataBeta.currency === 'USD' &&
          dataBeta.currencySymbol === '$',
        `Tenant currencies isolated: Alpha uses INR (₹) while Beta uses USD ($) without mixing calculations`
      );
    }

    // =========================================================================
    // TEST 24: Refund treatment where actual refund data exists
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/analytics/payments?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminAlpha}`,
          'X-Tenant-ID': tenantAlpha._id.toString(),
        },
      });
      const data = await res.json();
      const refundedStatus = data.data.byStatus.find((s) => s.status === PAYMENT_STATUS.REFUNDED);
      assert(
        refundedStatus && refundedStatus.orderCount === 1 && refundedStatus.totalAmount === 1000,
        `Refunded order O5 captured accurately in payment status analytics (Refunded: ₹${refundedStatus?.totalAmount}, count: ${refundedStatus?.orderCount})`
      );
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    console.log('\n[Teardown] Cleaning up test records...');
    await Order.deleteMany({ _id: { $in: createdOrderIds } });
    await Product.deleteMany({ _id: { $in: createdProductIds } });
    await TenantMembership.deleteMany({ tenantId: { $in: createdTenantIds } });
    await Tenant.deleteMany({ _id: { $in: createdTenantIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await server.close();
    await mongoose.disconnect();
    console.log('[Teardown] Cleanup complete.');
  }

  console.log('\n================================================================');
  console.log(`   Analytics Test Suite Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runPhase63AnalyticsTests();
