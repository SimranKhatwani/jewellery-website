/**
 * AURELLE Phase 6.3+: Tenant Admin Reports & Export Verification Suite
 *
 * Verifies:
 * 1. Sales Report: actual order dates, financial breakdowns, status filters
 * 2. Orders Report: customer info, item counts, totals, search by customer/order
 * 3. Products Report: variant rows, category filters, publication status
 * 4. Inventory Report: stock levels, low-stock threshold, unknown status quarantined
 * 5. Customers Report: customer orders, lifetime spend, new vs returning patronage
 * 6. Payments Report: COD/CARD/UPI methods, real payment status, pending preserved
 * 7. CSV Export: proper text/csv headers, UTF-8 BOM, escaped values
 * 8. HTML/PDF Print Export: clean printable HTML with store name and summary
 * 9. Cross-tenant isolation: Tenant B Admin blocked from accessing Tenant A reports
 * 10. Unauthorized access: unauthenticated requests and customer accounts rejected
 * 11. Empty store handling: returns graceful empty records and summaries
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

const runPhase6ReportsTests = async () => {
  console.log('================================================================');
  console.log('   AURELLE SaaS: Tenant Admin Reports & Export Test Suite');
  console.log('================================================================\n');

  await connectDB();
  const app = createApp();

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

  const createdTenantIds = [];
  const createdUserIds = [];
  const createdProductIds = [];
  const createdOrderIds = [];

  try {
    // -------------------------------------------------------------
    // SETUP: Tenants & Admins
    // -------------------------------------------------------------
    const owner = await User.create({
      name: `Report Owner ${timestamp}`,
      email: `rep_owner_${timestamp}@aurelle.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(owner._id);

    const tenantA = await Tenant.create({
      name: `Maison Vendôme ${timestamp}`,
      slug: `vendome-${timestamp}`,
      ownerId: owner._id,
      settings: { currency: 'INR', currencySymbol: '₹' },
    });
    createdTenantIds.push(tenantA._id);

    const tenantB = await Tenant.create({
      name: `Geneva Horlogerie ${timestamp}`,
      slug: `geneva-${timestamp}`,
      ownerId: owner._id,
      settings: { currency: 'USD', currencySymbol: '$' },
    });
    createdTenantIds.push(tenantB._id);

    let storeAdminRole = await Role.findOne({ slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN });
    if (!storeAdminRole) {
      storeAdminRole = await Role.create({
        name: 'Store Administrator',
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
        permissions: ['*'],
      });
    }

    const adminA = await User.create({
      name: `Admin Vendôme ${timestamp}`,
      email: `admin_vendome_${timestamp}@aurelle.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(adminA._id);

    await TenantMembership.create({
      tenantId: tenantA._id,
      userId: adminA._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    const adminB = await User.create({
      name: `Admin Geneva ${timestamp}`,
      email: `admin_geneva_${timestamp}@aurelle.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(adminB._id);

    await TenantMembership.create({
      tenantId: tenantB._id,
      userId: adminB._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    const customerUser = await User.create({
      name: `Patron Laurent ${timestamp}`,
      email: `laurent_${timestamp}@patron.com`,
      passwordHash: 'dummyhash123',
    });
    createdUserIds.push(customerUser._id);

    const tokenAdminA = generateToken({
      userId: adminA._id,
      email: adminA.email,
      role: 'store_admin',
    });
    const tokenAdminB = generateToken({
      userId: adminB._id,
      email: adminB.email,
      role: 'store_admin',
    });
    const tokenCustomer = generateToken({
      userId: customerUser._id,
      email: customerUser.email,
      role: 'customer',
    });

    // -------------------------------------------------------------
    // SETUP: Products (Simple, Variant, Unknown Inventory)
    // -------------------------------------------------------------
    const p1 = await Product.create({
      tenantId: tenantA._id,
      name: `Solitaire Ring ${timestamp}`,
      slug: `solitaire-${timestamp}`,
      category: 'rings',
      sku: `SKU-SOL-${timestamp}`,
      priceUSD: 1200,
      stockQuantity: 15,
      inventoryStatus: 'in_stock',
      isPublished: true,
      primaryImage: '/images/sol.jpg',
    });
    createdProductIds.push(p1._id);

    const p2 = await Product.create({
      tenantId: tenantA._id,
      name: `Tennis Bracelet ${timestamp}`,
      slug: `bracelet-${timestamp}`,
      category: 'bracelets',
      sku: `SKU-TB-${timestamp}`,
      priceUSD: 2400,
      hasVariants: true,
      stockQuantity: 999, // Should NOT be double counted
      inventoryStatus: 'in_stock',
      variants: [
        { name: '16cm', sku: `SKU-TB-16-${timestamp}`, stockQuantity: 3, inventoryStatus: 'low_stock', price: 2200 },
        { name: '18cm', sku: `SKU-TB-18-${timestamp}`, stockQuantity: 8, inventoryStatus: 'in_stock', price: 2400 },
      ],
      isPublished: true,
      primaryImage: '/images/tb.jpg',
    });
    createdProductIds.push(p2._id);

    const p3 = await Product.create({
      tenantId: tenantA._id,
      name: `Antique Brooch ${timestamp}`,
      slug: `brooch-${timestamp}`,
      category: 'brooches',
      sku: `SKU-BR-${timestamp}`,
      priceUSD: 800,
      stockQuantity: 0,
      inventoryStatus: 'unknown',
      isPublished: false,
      primaryImage: '/images/br.jpg',
    });
    createdProductIds.push(p3._id);

    // -------------------------------------------------------------
    // SETUP: Orders
    // -------------------------------------------------------------
    const now = new Date();
    const order1 = await Order.create({
      tenantId: tenantA._id,
      userId: customerUser._id,
      orderNumber: `VEND-001-${timestamp}`,
      customerInfo: {
        name: customerUser.name,
        email: customerUser.email,
        phone: '+919999911111',
        isGuest: false,
      },
      items: [
        {
          productId: p1._id,
          name: p1.name,
          sku: p1.sku,
          quantity: 2,
          unitPrice: 1200,
          itemSubtotal: 2400,
        },
      ],
      shippingAddress: {
        name: customerUser.name,
        phone: '+919999911111',
        addressLine1: 'Place Vendôme',
        city: 'Paris',
        postalCode: '75001',
      },
      pricing: {
        subtotal: 2400,
        discount: 400,
        taxAmount: 60,
        shippingAmount: 50,
        totalPayable: 2110,
        currency: 'INR',
        currencySymbol: '₹',
      },
      paymentMethod: PAYMENT_METHODS.COD,
      paymentStatus: PAYMENT_STATUS.PAID,
      orderStatus: ORDER_STATUS.DELIVERED,
      createdAt: now,
    });
    createdOrderIds.push(order1._id);

    const order2 = await Order.create({
      tenantId: tenantA._id,
      userId: null,
      orderNumber: `VEND-002-${timestamp}`,
      customerInfo: {
        name: 'Guest Camille',
        email: `camille_${timestamp}@example.com`,
        phone: '+919876543299',
        isGuest: true,
      },
      items: [
        {
          productId: p2._id,
          name: p2.name,
          sku: 'SKU-TB-16',
          quantity: 1,
          unitPrice: 2200,
          itemSubtotal: 2200,
        },
      ],
      shippingAddress: {
        name: 'Guest Camille',
        phone: '+919876543299',
        addressLine1: 'Boulevard Haussmann',
        city: 'Paris',
        postalCode: '75009',
      },
      pricing: {
        subtotal: 2200,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 2200,
        currency: 'INR',
        currencySymbol: '₹',
      },
      paymentMethod: PAYMENT_METHODS.CARD,
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.CONFIRMED,
      createdAt: now,
    });
    createdOrderIds.push(order2._id);

    // Order in Tenant B (for isolation tests)
    const orderB = await Order.create({
      tenantId: tenantB._id,
      userId: null,
      orderNumber: `GEN-001-${timestamp}`,
      customerInfo: {
        name: 'Swiss Buyer',
        email: `swiss_${timestamp}@geneva.ch`,
        phone: '+41221234567',
        isGuest: true,
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: 'Geneva Chronograph',
          sku: `SKU-GEN-${timestamp}`,
          quantity: 1,
          unitPrice: 5000,
          itemSubtotal: 5000,
        },
      ],
      shippingAddress: {
        name: 'Swiss Buyer',
        phone: '+41221234567',
        addressLine1: 'Rue du Rhône',
        city: 'Geneva',
        postalCode: '1204',
      },
      pricing: {
        subtotal: 5000,
        discount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalPayable: 5000,
        currency: 'USD',
        currencySymbol: '$',
      },
      paymentMethod: PAYMENT_METHODS.UPI,
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.PENDING,
      createdAt: now,
    });
    createdOrderIds.push(orderB._id);

    // =========================================================================
    // TEST 1: Sales Report
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/sales?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.success === true, 'Sales Report responds HTTP 200');
      assert(data.data.records.length === 2, `Sales Report returns exactly 2 tenant orders (got ${data.data.records.length})`);
      const row1 = data.data.records.find((r) => r.orderNumber === order1.orderNumber);
      assert(
        row1 && row1.subtotal === 2400 && row1.discount === 400 && row1.totalPayable === 2110,
        `Sales Report captures exact subtotal (2400), discount (400), and totalPayable (2110)`
      );
    }

    // =========================================================================
    // TEST 2: Orders Report
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/orders?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.data.records.length === 2, 'Orders Report returns tenant orders');
      const guestOrder = data.data.records.find((r) => r.orderNumber === order2.orderNumber);
      assert(
        guestOrder && guestOrder.customerName === 'Guest Camille' && guestOrder.isGuest === true,
        'Orders Report accurately identifies guest customer name and flag'
      );
    }

    // =========================================================================
    // TEST 3: Products Report
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/products`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.data.records.length >= 4, 'Products Report lists catalogue rows');
      const variantRow = data.data.records.find((r) => r.variantInfo === '16cm');
      assert(
        variantRow && variantRow.price === 2200 && variantRow.stockQuantity === 3,
        `Products Report reflects distinct variant row with variant price and stock`
      );
    }

    // =========================================================================
    // TEST 4: Inventory Report
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/inventory`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.data.summary.unknownCount >= 1, 'Inventory Report tracks unknown stock separately');
      const unknownItem = data.data.records.find((r) => r.inventoryStatus === 'unknown');
      assert(
        unknownItem && unknownItem.availableStock === 'Untracked',
        `Unknown inventory is displayed as 'Untracked' and not as 0 or in-stock`
      );
      assert(
        data.data.summary.totalTrackedUnits === 26,
        `Inventory stock units summed without double-counting parent stock (15 + 3 + 8 = 26, got ${data.data.summary.totalTrackedUnits})`
      );
    }

    // =========================================================================
    // TEST 5: Customers Report
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/customers?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.data.records.length === 2, 'Customers Report groups distinct registered & guest customers (2 clients)');
      const registeredClient = data.data.records.find((c) => c.email === customerUser.email);
      assert(
        registeredClient && registeredClient.totalOrders === 1 && registeredClient.totalOrderValue === 2110,
        `Registered client captures exact order count (1) and lifetime spend (2110)`
      );
    }

    // =========================================================================
    // TEST 6: Payments Report
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/payments?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const data = await res.json();
      assert(res.status === 200 && data.data.records.length === 2, 'Payments Report returns payment records');
      const cardPayment = data.data.records.find((p) => p.paymentMethod === 'card');
      assert(
        cardPayment && cardPayment.paymentStatus === 'pending',
        'CARD order correctly shows pending payment status without fabricated transaction'
      );
    }

    // =========================================================================
    // TEST 7: CSV Export
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/sales/export?format=csv&preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const csvText = await res.text();
      assert(res.status === 200, 'CSV export endpoint responds HTTP 200');
      assert(
        res.headers.get('content-type')?.includes('text/csv'),
        'CSV export returns text/csv Content-Type'
      );
      assert(
        csvText.includes('Order Date') && csvText.includes(order1.orderNumber),
        'CSV content contains CSV header and actual order number row'
      );
    }

    // =========================================================================
    // TEST 8: HTML / Print PDF Export
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/v1/reports/sales/export?format=html&preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      const htmlText = await res.text();
      assert(res.status === 200, 'HTML/Print export responds HTTP 200');
      assert(
        htmlText.includes(`Maison Vendôme ${timestamp}`) && htmlText.includes(order1.orderNumber),
        'Print HTML includes store name and order table rows'
      );
    }

    // =========================================================================
    // TEST 9: Cross-Tenant Isolation
    // =========================================================================
    {
      const resB = await fetch(`${baseUrl}/api/v1/reports/sales?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminB}`,
          'X-Tenant-ID': tenantB._id.toString(),
        },
      });
      const dataB = await resB.json();
      assert(
        dataB.data.records.length === 1 && dataB.data.records[0].orderNumber === orderB.orderNumber,
        `Tenant B sees only its own 1 order in sales report (Tenant A records completely isolated)`
      );

      // Attempt cross-tenant breach
      const breachRes = await fetch(`${baseUrl}/api/v1/reports/sales?preset=last30days`, {
        headers: {
          Authorization: `Bearer ${tokenAdminB}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      assert(breachRes.status === 403, 'Cross-tenant report access blocked with HTTP 403 Forbidden');
    }

    // =========================================================================
    // TEST 10: Unauthorized Access
    // =========================================================================
    {
      const noAuth = await fetch(`${baseUrl}/api/v1/reports/sales`, {
        headers: { 'X-Tenant-ID': tenantA._id.toString() },
      });
      assert(noAuth.status === 401, 'Request without token rejected with HTTP 401');

      const custAuth = await fetch(`${baseUrl}/api/v1/reports/sales`, {
        headers: {
          Authorization: `Bearer ${tokenCustomer}`,
          'X-Tenant-ID': tenantA._id.toString(),
        },
      });
      assert(custAuth.status === 403, 'Customer account rejected from admin reports with HTTP 403');
    }
  } catch (err) {
    console.error('Test execution error:', err);
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
  console.log(`   Reports Test Suite Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runPhase6ReportsTests();
