/**
 * AURELLE Phase 6.1+: Socket.io Real-Time Notification Verification Suite
 *
 * Verifies:
 * 1. Socket.io WebSocket server initializes and authenticates admin/customer clients.
 * 2. Guest order placement broadcasts real-time 'notification:new_order' to Tenant Admins.
 * 3. Logged-in order placement emits 'notification:new_order' to Tenant Admins AND 'notification:order_placed' to customer.
 * 4. Cross-Tenant Isolation: Tenant B Admin socket NEVER receives Tenant A order events.
 * 5. Order status transitions emit real-time 'notification:order_status' and 'order:status_updated'.
 */

import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { io as ClientIO } from 'socket.io-client';
import { connectDB } from '../config/db.js';
import { createApp } from '../app.js';
import { initSocketServer } from '../socket.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Role } from '../models/Role.js';
import { SYSTEM_ROLE_SLUGS, MEMBERSHIP_STATUS } from '../config/constants.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Address } from '../models/Address.js';
import { generateToken } from '../utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runSocketTests = async () => {
  console.log('================================================================');
  console.log('   AURELLE SaaS: Socket.io Real-Time Notification Test Suite');
  console.log('================================================================\n');

  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSocketServer(server);

  const testServer = await new Promise((resolve) => {
    const s = server.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  };

  const clientSockets = [];

  try {
    // -------------------------------------------------------------
    // SETUP: Tenants, Admins, Customers & Products
    // -------------------------------------------------------------
    console.log('[Setup] Initializing test stores, users and catalogues...');

    let storeAdminRole = await Role.findOne({ slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN });
    if (!storeAdminRole) {
      storeAdminRole = await Role.create({
        name: 'Store Administrator',
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
        description: 'Store administrator with order privileges',
        isSystem: true,
        permissions: ['order:read', 'order:write'],
      });
    }

    // Tenant A Admin
    const adminUserA = await User.create({
      name: `Admin User A ${timestamp}`,
      email: `admin-ws-a-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      isActive: true,
      status: 'active',
    });

    const tenantA = await Tenant.create({
      name: `Aurelle Websocket Store A ${timestamp}`,
      slug: `store-ws-a-${timestamp}`,
      ownerId: adminUserA._id,
      status: 'active',
      settings: { currency: 'INR', currencySymbol: '₹', taxRate: 3, shippingFee: 50 },
    });

    await TenantMembership.create({
      tenantId: tenantA._id,
      userId: adminUserA._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    // Tenant B Admin
    const adminUserB = await User.create({
      name: `Admin User B ${timestamp}`,
      email: `admin-ws-b-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      isActive: true,
      status: 'active',
    });

    const tenantB = await Tenant.create({
      name: `Competitor Store B ${timestamp}`,
      slug: `store-ws-b-${timestamp}`,
      ownerId: adminUserB._id,
      status: 'active',
      settings: { currency: 'INR', currencySymbol: '₹' },
    });

    await TenantMembership.create({
      tenantId: tenantB._id,
      userId: adminUserB._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    // Customer A (Registered)
    const customerUserA = await User.create({
      name: `Customer Alice ${timestamp}`,
      email: `alice-ws-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      isActive: true,
      status: 'active',
    });

    const addressA = await Address.create({
      userId: customerUserA._id,
      name: 'Alice Kundra',
      phone: '+919876543210',
      addressLine1: '404 Diamond Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      country: 'India',
      isDefault: true,
    });

    // Catalog setup
    const categoryA = await Category.create({
      name: `Fine Rings ${timestamp}`,
      slug: `fine-rings-ws-${timestamp}`,
      tenantId: tenantA._id,
      isActive: true,
    });

    const inStockProduct = await Product.create({
      tenantId: tenantA._id,
      name: 'Realtime Silver Solitaire',
      slug: `realtime-solitaire-${timestamp}`,
      sku: `RSS-${timestamp}`,
      category: 'rings',
      categoryId: categoryA._id,
      priceUSD: 2500,
      stockQuantity: 20,
      inventoryStatus: 'in_stock',
      inStock: true,
      isPublished: true,
      primaryImage: '/images/products/solitaire.jpg',
    });

    // Generate JWT Tokens
    const adminTokenA = generateToken({
      userId: adminUserA._id,
      email: adminUserA.email,
      role: 'admin',
    });

    const adminTokenB = generateToken({
      userId: adminUserB._id,
      email: adminUserB.email,
      role: 'admin',
    });

    const customerTokenA = generateToken({
      userId: customerUserA._id,
      email: customerUserA.email,
      role: 'customer',
    });

    console.log('[Setup] Connecting WebSocket test clients...');

    // Connect Client A (Tenant A Admin)
    const socketAdminA = ClientIO(baseUrl, {
      auth: { token: adminTokenA },
      transports: ['websocket'],
      forceNew: true,
    });
    clientSockets.push(socketAdminA);

    // Connect Client B (Tenant B Admin)
    const socketAdminB = ClientIO(baseUrl, {
      auth: { token: adminTokenB },
      transports: ['websocket'],
      forceNew: true,
    });
    clientSockets.push(socketAdminB);

    // Connect Client C (Customer A)
    const socketCustA = ClientIO(baseUrl, {
      auth: { token: customerTokenA },
      transports: ['websocket'],
      forceNew: true,
    });
    clientSockets.push(socketCustA);

    await Promise.all([
      new Promise((res) => socketAdminA.on('connect', res)),
      new Promise((res) => socketAdminB.on('connect', res)),
      new Promise((res) => socketCustA.on('connect', res)),
    ]);

    assert(socketAdminA.connected, '1.1 Tenant A Admin WebSocket connected successfully');
    assert(socketAdminB.connected, '1.2 Tenant B Admin WebSocket connected successfully');
    assert(socketCustA.connected, '1.3 Customer A WebSocket connected successfully');

    // -------------------------------------------------------------
    // TEST SECTION 2: Real-time Alert on GUEST Order Placement
    // -------------------------------------------------------------
    console.log('\n--- Test Section 2: Real-Time Alert on GUEST Order Placement ---');

    const guestOrderEventsA = [];
    const guestOrderEventsB = [];
    const guestOrderEventsCust = [];

    socketAdminA.on('notification:new_order', (data) => guestOrderEventsA.push(data));
    socketAdminB.on('notification:new_order', (data) => guestOrderEventsB.push(data));
    socketCustA.on('notification:new_order', (data) => guestOrderEventsCust.push(data));

    // Place a Guest Order on Tenant A
    const guestSessionId = `ws_guest_sess_${timestamp}`;
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-session-id': guestSessionId,
      },
      body: JSON.stringify({
        productId: inStockProduct._id,
        quantity: 1,
      }),
    });

    const guestOrderRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-session-id': guestSessionId,
        'Idempotency-Key': `ws_guest_idemp_${timestamp}`,
      },
      body: JSON.stringify({
        guestAddress: {
          name: 'Meera Guest',
          email: 'meera.guest@example.com',
          phone: '+919876500000',
          addressLine1: 'Flat 101, Lotus Wing',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'cod',
      }),
    });

    const guestOrderData = await guestOrderRes.json();
    assert(guestOrderRes.status === 201, '2.1 Guest order placed successfully via HTTP (201)');

    // Allow a few milliseconds for WebSocket event transmission
    await new Promise((res) => setTimeout(res, 250));

    assert(guestOrderEventsA.length === 1, '2.2 Tenant A Admin received real-time "notification:new_order" WebSocket event');
    const receivedEventA = guestOrderEventsA[0];
    assert(receivedEventA?.order?.orderNumber === guestOrderData.order?.orderNumber, '2.3 Real-time event contains exact order number');
    assert(receivedEventA?.notification?.metadata?.isGuest === true, '2.4 Real-time event marks order as guest checkout');
    assert(receivedEventA?.notification?.metadata?.customerName === 'Meera Guest', '2.5 Real-time event includes guest customer name');

    // Tenant Isolation Assertion
    assert(guestOrderEventsB.length === 0, '2.6 Tenant B Admin received 0 events for Tenant A guest order (tenant isolation)');
    assert(guestOrderEventsCust.length === 0, '2.7 Customer A received 0 events for guest order');

    // -------------------------------------------------------------
    // TEST SECTION 3: Real-Time Alert on Authenticated Order Placement
    // -------------------------------------------------------------
    console.log('\n--- Test Section 3: Real-Time Alert on Logged-in Customer Order Placement ---');

    const customerOrderEventsA = [];
    const customerOrderEventsCust = [];

    socketAdminA.on('notification:new_order', (data) => customerOrderEventsA.push(data));
    socketCustA.on('notification:order_placed', (data) => customerOrderEventsCust.push(data));

    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        productId: inStockProduct._id,
        quantity: 1,
      }),
    });

    const custOrderRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
        'Idempotency-Key': `ws_cust_idemp_${timestamp}`,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'card',
      }),
    });
    const custOrderData = await custOrderRes.json();
    assert(custOrderRes.status === 201, '3.1 Customer A placed order successfully (201)');

    await new Promise((res) => setTimeout(res, 250));

    // Admin received new order notification
    assert(customerOrderEventsA.length === 1, '3.2 Tenant A Admin received instant WebSocket alert for customer order');
    // Customer received order confirmation notification
    assert(customerOrderEventsCust.length === 1, '3.3 Customer A received instant "notification:order_placed" event');
    assert(customerOrderEventsCust[0]?.order?.orderNumber === custOrderData.order?.orderNumber, '3.4 Customer event references their order number');

    // -------------------------------------------------------------
    // TEST SECTION 4: Real-time Order Status Update
    // -------------------------------------------------------------
    console.log('\n--- Test Section 4: Real-Time Order Status Update Alerts ---');

    const statusEventsCust = [];
    const statusEventsAdmin = [];

    socketCustA.on('notification:order_status', (data) => statusEventsCust.push(data));
    socketAdminA.on('order:status_updated', (data) => statusEventsAdmin.push(data));

    // Store Admin updates status: pending -> confirmed
    const statusUpdateRes = await fetch(`${baseUrl}/api/orders/${custOrderData.order._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({
        orderStatus: 'confirmed',
        notes: 'Verified and approved by atelier staff',
      }),
    });

    assert(statusUpdateRes.status === 200, '4.1 Admin updated order status to "confirmed" (HTTP 200)');

    await new Promise((res) => setTimeout(res, 250));

    assert(statusEventsCust.length === 1, '4.2 Customer A received instant "notification:order_status" update');
    assert(statusEventsCust[0]?.orderStatus === 'confirmed', '4.3 Customer event indicates status "confirmed"');
    assert(statusEventsAdmin.length === 1, '4.4 Admin socket received "order:status_updated" real-time event');

    // -------------------------------------------------------------
    // TEST SECTION 5: Cross-Tenant Isolation Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Test Section 5: Cross-Tenant WebSocket Isolation Verification ---');
    assert(guestOrderEventsB.length === 0, '5.1 Tenant B Admin received exactly ZERO events throughout Tenant A order cycles');

    console.log('\n[Teardown] Closing test connections...');
    for (const s of clientSockets) {
      try {
        s.disconnect();
      } catch {
        // cleanup
      }
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    for (const s of clientSockets) {
      try {
        s.disconnect();
      } catch {
        // cleanup
      }
    }
    testServer.close();
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`Phase 6.1+ Socket.io Test Suite Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runSocketTests();
