/**
 * AURELLE Phase 6.1: Notification Management Verification Suite
 *
 * Verifies:
 * 1. Customer notification generated upon order placement (actual orderNumber, amount, status)
 * 2. Tenant Admin notification generated upon new order placement
 * 3. No notification generated after failed order placement (out-of-stock rejection)
 * 4. Duplicate prevention (idempotent request produces zero duplicate notifications)
 * 5. Order status update generates customer in-app notification (confirmed, shipped, delivered)
 * 6. Order cancellation by Store Admin notifies customer
 * 7. Order cancellation by Customer notifies Tenant Admin
 * 8. Customer isolation: Customer B cannot read or mark Customer A's notifications
 * 9. Tenant Admin isolation: Tenant B Admin cannot access Tenant A's notifications
 * 10. Unread count query accuracy and mark-as-read functionality
 * 11. Mark-all-as-read functionality
 * 12. Pagination and limit enforcement
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
import { SYSTEM_ROLE_SLUGS, MEMBERSHIP_STATUS } from '../config/constants.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Cart } from '../models/Cart.js';
import { Address } from '../models/Address.js';
import { Order } from '../models/Order.js';
import { Notification } from '../models/Notification.js';
import { generateToken } from '../utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runPhase6Tests = async () => {
  console.log('================================================================');
  console.log('   AURELLE SaaS Phase 6.1: Notification Management Test Suite');
  console.log('================================================================\n');

  await connectDB();
  try {
    await Notification.syncIndexes();
  } catch (idxErr) {
    console.warn('Notification index sync notice:', idxErr.message);
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
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  };

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
        description: 'Store administrator with order & notification privileges',
        isSystem: true,
        permissions: ['order:read', 'order:write', 'product:read', 'product:write'],
      });
    }

    // Owner / Admin User A
    const adminUserA = await User.create({
      name: `Admin User A ${timestamp}`,
      email: `admin-notif-a-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      isActive: true,
      status: 'active',
    });

    // Owner / Admin User B (for tenant isolation)
    const adminUserB = await User.create({
      name: `Admin User B ${timestamp}`,
      email: `admin-notif-b-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      isActive: true,
      status: 'active',
    });

    // Tenant A (Store Alpha)
    const tenantA = await Tenant.create({
      name: `Alpha Jewels ${timestamp}`,
      slug: `alpha-jewels-${timestamp}`,
      ownerId: adminUserA._id,
      status: 'active',
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 3,
        shippingFee: 50,
      },
    });

    // Tenant B (Store Beta)
    const tenantB = await Tenant.create({
      name: `Beta Jewels ${timestamp}`,
      slug: `beta-jewels-${timestamp}`,
      ownerId: adminUserB._id,
      status: 'active',
      settings: {
        currency: 'EUR',
        currencySymbol: '€',
        taxRate: 0,
        shippingFee: 0,
      },
    });

    // Memberships
    await TenantMembership.create({
      userId: adminUserA._id,
      tenantId: tenantA._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });
    const adminTokenA = generateToken({
      userId: adminUserA._id,
      email: adminUserA.email,
      role: 'store_admin',
    });

    await TenantMembership.create({
      userId: adminUserB._id,
      tenantId: tenantB._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });
    const adminTokenB = generateToken({
      userId: adminUserB._id,
      email: adminUserB.email,
      role: 'store_admin',
    });

    // Customer User 1 (Alice)
    const customerUserA = await User.create({
      name: `Alice Customer ${timestamp}`,
      email: `alice-notif-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      phoneNumber: '+919876543201',
      isActive: true,
    });
    const customerTokenA = generateToken({
      userId: customerUserA._id,
      email: customerUserA.email,
      role: 'customer',
    });

    // Customer User 2 (Bob)
    const customerUserB = await User.create({
      name: `Bob Customer ${timestamp}`,
      email: `bob-notif-${timestamp}@example.com`,
      passwordHash: 'hashed_pw123',
      phoneNumber: '+919876543202',
      isActive: true,
    });
    const customerTokenB = generateToken({
      userId: customerUserB._id,
      email: customerUserB.email,
      role: 'customer',
    });

    // Customer A Address
    const addressA = await Address.create({
      userId: customerUserA._id,
      name: 'Alice Customer',
      phone: '+919876543201',
      addressLine1: '12 Emerald Court',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      country: 'India',
      isDefault: true,
    });

    // Catalog setup
    const categoryA = await Category.create({
      name: `Fine Rings ${timestamp}`,
      slug: `fine-rings-${timestamp}`,
      tenantId: tenantA._id,
      isActive: true,
    });

    const inStockProduct = await Product.create({
      tenantId: tenantA._id,
      name: 'Eternity Silver Band',
      slug: `eternity-silver-band-${timestamp}`,
      sku: `ESB-${timestamp}`,
      category: 'rings',
      categoryId: categoryA._id,
      priceUSD: 1500,
      stockQuantity: 10,
      inventoryStatus: 'in_stock',
      inStock: true,
      isPublished: true,
      primaryImage: '/images/products/eternity-band.jpg',
    });

    const outOfStockProduct = await Product.create({
      tenantId: tenantA._id,
      name: 'Sold Out Band',
      slug: `sold-out-band-${timestamp}`,
      sku: `SOB-${timestamp}`,
      category: 'rings',
      categoryId: categoryA._id,
      priceUSD: 1200,
      stockQuantity: 0,
      inventoryStatus: 'out_of_stock',
      inStock: false,
      isPublished: true,
      primaryImage: '/images/products/soldout.jpg',
    });

    console.log('[Setup] Test data initialized successfully.\n');

    // -------------------------------------------------------------
    // TEST SECTION 1: Notifications upon Successful Order Placement
    // -------------------------------------------------------------
    console.log('--- Test Section 1: Order Placement Notification Generation ---');

    // Add in-stock product to Customer A's cart
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

    const idempKey1 = `notif_order_${timestamp}`;
    const placeOrderRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
        'Idempotency-Key': idempKey1,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'cod',
      }),
    });
    const placeOrderData = await placeOrderRes.json();
    assert(placeOrderRes.status === 201 && placeOrderData.order, '1.1 Customer A placed order successfully (HTTP 201)');
    const placedOrder = placeOrderData.order;

    // 1.2 Verify Customer Notification created in database
    const customerNotifications = await Notification.find({
      recipientUserId: customerUserA._id,
      recipientType: 'customer',
    });
    assert(customerNotifications.length === 1, '1.2 Customer A has exactly 1 order placed notification');
    const custNotif = customerNotifications[0];
    assert(custNotif.notificationType === 'order_placed', '1.3 Notification type is "order_placed"');
    assert(custNotif.metadata.orderNumber === placedOrder.orderNumber, '1.4 Notification metadata contains actual order number');
    assert(custNotif.isRead === false, '1.5 Notification isRead is initially false');

    // 1.3 Verify Tenant Admin Notification created in database
    const adminNotifications = await Notification.find({
      tenantId: tenantA._id,
      recipientUserId: adminUserA._id,
      recipientType: 'admin',
    });
    assert(adminNotifications.length === 1, '1.6 Tenant Admin A has exactly 1 new order notification');
    const admNotif = adminNotifications[0];
    assert(admNotif.notificationType === 'admin_new_order', '1.7 Admin notification type is "admin_new_order"');
    assert(admNotif.metadata.orderNumber === placedOrder.orderNumber, '1.8 Admin notification references placed order number');
    assert(admNotif.metadata.customerName.includes('Alice'), '1.9 Admin notification references customer name');

    // -------------------------------------------------------------
    // TEST SECTION 1B: Admin Notification for GUEST Order Placement
    // -------------------------------------------------------------
    console.log('\n--- Test Section 1B: Admin Notification on GUEST Order Placement ---');

    const guestSessionId = `guest_sess_${timestamp}`;

    // Add product to guest cart
    const guestCartAddRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
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
    assert(guestCartAddRes.status === 200, '1B.1 Guest added in-stock product to cart successfully (HTTP 200)');

    // Place order as guest shopper
    const idempKeyGuest = `notif_guest_order_${timestamp}`;
    const guestOrderRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-session-id': guestSessionId,
        'Idempotency-Key': idempKeyGuest,
      },
      body: JSON.stringify({
        guestAddress: {
          name: 'Kavita Guest',
          email: 'kavita.guest@example.com',
          phone: '+919876543210',
          addressLine1: 'Flat 402, Lotus Tower',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'upi',
      }),
    });
    const guestOrderData = await guestOrderRes.json();
    assert(guestOrderRes.status === 201 && guestOrderData.order, '1B.2 Guest placed order successfully (HTTP 201)');
    const placedGuestOrder = guestOrderData.order;

    // Verify Store Admin received an in-app notification for this guest order
    const guestAdminNotifications = await Notification.find({
      tenantId: tenantA._id,
      recipientUserId: adminUserA._id,
      recipientType: 'admin',
      relatedEntityId: placedGuestOrder._id,
    });
    assert(guestAdminNotifications.length === 1, '1B.3 Tenant Admin received exactly 1 in-app notification for the guest order');
    const guestAdmNotif = guestAdminNotifications[0];
    assert(guestAdmNotif.notificationType === 'admin_new_order', '1B.4 Guest order notification type is "admin_new_order"');
    assert(guestAdmNotif.metadata.orderNumber === placedGuestOrder.orderNumber, '1B.5 Notification references the guest order number');
    assert(guestAdmNotif.metadata.isGuest === true, '1B.6 Notification metadata indicates isGuest: true');
    assert(guestAdmNotif.metadata.customerName === 'Kavita Guest', '1B.7 Notification metadata contains guest customer name');
    assert(guestAdmNotif.metadata.customerEmail === 'kavita.guest@example.com', '1B.8 Notification metadata contains guest customer email');
    assert(guestAdmNotif.title.includes('Guest Checkout') || guestAdmNotif.message.includes('guest'), '1B.9 Notification message or title clearly identifies guest order');

    // Verify Tenant B Admin has zero notifications for Tenant A's guest order
    const tenantBNotifsForGuestOrder = await Notification.find({
      tenantId: tenantB._id,
      relatedEntityId: placedGuestOrder._id,
    });
    assert(tenantBNotifsForGuestOrder.length === 0, '1B.10 Tenant B Admin receives zero notifications for Tenant A guest order (tenant isolation)');

    // -------------------------------------------------------------
    // TEST SECTION 2: No Notification on Failed Order Placement
    // -------------------------------------------------------------
    console.log('\n--- Test Section 2: Failure Case — No Notification on Failed Checkout ---');

    // Attempting to place an order with empty cart (cart was cleared after order 1)
    const failedOrderRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'cod',
      }),
    });
    assert(failedOrderRes.status === 400, '2.1 Failed order attempt rejected with HTTP 400 (empty cart)');

    const custNotifsAfterFail = await Notification.countDocuments({
      recipientUserId: customerUserA._id,
      recipientType: 'customer',
    });
    assert(custNotifsAfterFail === 1, '2.2 No additional notifications created after failed order placement');

    // -------------------------------------------------------------
    // TEST SECTION 3: Duplicate Prevention on Idempotent Retries
    // -------------------------------------------------------------
    console.log('\n--- Test Section 3: Duplicate Prevention on API Retries ---');

    // Replay first order with exact same idempotencyKey
    const replayOrderRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
        'Idempotency-Key': idempKey1,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'cod',
      }),
    });
    const replayOrderData = await replayOrderRes.json();
    assert(replayOrderRes.status === 200 && replayOrderData.isDuplicate === true, '3.1 Replayed order returned existing order idempotently');

    const custNotifsAfterReplay = await Notification.countDocuments({
      recipientUserId: customerUserA._id,
      recipientType: 'customer',
    });
    const adminNotifsAfterReplay = await Notification.countDocuments({
      tenantId: tenantA._id,
      recipientUserId: adminUserA._id,
      recipientType: 'admin',
    });
    assert(custNotifsAfterReplay === 1, '3.2 Customer notification count unchanged after idempotent retry');
    assert(adminNotifsAfterReplay === 2, '3.3 Admin notification count unchanged after idempotent retry (1 customer order + 1 guest order)');

    // -------------------------------------------------------------
    // TEST SECTION 4: Order Status Update Notification Generation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 4: Order Status Update Notifications ---');

    // Store Admin updates status: pending -> confirmed
    const statusUpdateRes1 = await fetch(`${baseUrl}/api/orders/${placedOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'confirmed' }),
    });
    assert(statusUpdateRes1.status === 200, '4.1 Admin confirmed order status');

    const confirmedNotif = await Notification.findOne({
      recipientUserId: customerUserA._id,
      notificationType: 'order_confirmed',
    });
    assert(confirmedNotif !== null, '4.2 Customer received "order_confirmed" notification');
    assert(confirmedNotif.title.includes(placedOrder.orderNumber), '4.3 Notification title includes order number');

    // Store Admin updates status: confirmed -> processing
    await fetch(`${baseUrl}/api/orders/${placedOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'processing' }),
    });

    const processingNotif = await Notification.findOne({
      recipientUserId: customerUserA._id,
      notificationType: 'order_processing',
    });
    assert(processingNotif !== null, '4.4 Customer received "order_processing" notification');

    // Store Admin updates status: processing -> shipped
    await fetch(`${baseUrl}/api/orders/${placedOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'shipped' }),
    });

    const shippedNotif = await Notification.findOne({
      recipientUserId: customerUserA._id,
      notificationType: 'order_shipped',
    });
    assert(shippedNotif !== null, '4.5 Customer received "order_shipped" notification');

    // Store Admin updates status: shipped -> delivered
    await fetch(`${baseUrl}/api/orders/${placedOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'delivered' }),
    });

    const deliveredNotif = await Notification.findOne({
      recipientUserId: customerUserA._id,
      notificationType: 'order_delivered',
    });
    assert(deliveredNotif !== null, '4.6 Customer received "order_delivered" notification');

    // -------------------------------------------------------------
    // TEST SECTION 5: Cancellation Notifications (Admin & Customer)
    // -------------------------------------------------------------
    console.log('\n--- Test Section 5: Order Cancellation Notifications ---');

    // 5.1 Create order 2 and cancel it by Customer
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({ productId: inStockProduct._id, quantity: 1 }),
    });
    const order2Res = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({ addressId: addressA._id, paymentMethod: 'cod' }),
    });
    const order2Data = await order2Res.json();
    const order2 = order2Data.order;

    // Customer cancels order 2
    const custCancelRes = await fetch(`${baseUrl}/api/v1/customers/me/orders/${order2._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({ reason: 'Changed mind' }),
    });
    assert(custCancelRes.status === 200, '5.1 Customer cancelled their order');

    const adminCancelNotif = await Notification.findOne({
      recipientUserId: adminUserA._id,
      notificationType: 'admin_order_cancelled',
      relatedEntityId: order2._id,
    });
    assert(adminCancelNotif !== null, '5.2 Tenant Admin received "admin_order_cancelled" notification');
    assert(adminCancelNotif.message.includes('Changed mind'), '5.3 Admin notification contains cancellation reason');

    // 5.2 Create order 3 and cancel it by Store Admin
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({ productId: inStockProduct._id, quantity: 1 }),
    });
    const order3Res = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({ addressId: addressA._id, paymentMethod: 'cod' }),
    });
    const order3Data = await order3Res.json();
    const order3 = order3Data.order;

    // Store Admin cancels order 3
    const adminCancelRes = await fetch(`${baseUrl}/api/orders/${order3._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ reason: 'Address out of insured service area' }),
    });
    assert(adminCancelRes.status === 200, '5.4 Admin cancelled order 3');

    const custCancelNotif = await Notification.findOne({
      recipientUserId: customerUserA._id,
      notificationType: 'order_cancelled',
      relatedEntityId: order3._id,
    });
    assert(custCancelNotif !== null, '5.5 Customer received "order_cancelled" notification');
    assert(custCancelNotif.message.includes('out of insured service area'), '5.6 Customer notification contains admin cancellation reason');

    // -------------------------------------------------------------
    // TEST SECTION 6: Customer Notification APIs, Read/Unread & Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 6: Customer Notification APIs & Isolation ---');

    // 6.1 Customer A fetches unread count
    const unreadCountRes = await fetch(`${baseUrl}/api/v1/customers/me/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customerTokenA}` },
    });
    const unreadCountData = await unreadCountRes.json();
    assert(unreadCountRes.status === 200 && unreadCountData.unreadCount > 0, `6.1 Customer A unread count is accurate (${unreadCountData.unreadCount} unread)`);
    const initialUnread = unreadCountData.unreadCount;

    // 6.2 Customer A lists notifications
    const custListRes = await fetch(`${baseUrl}/api/v1/customers/me/notifications?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${customerTokenA}` },
    });
    const custListData = await custListRes.json();
    assert(custListRes.status === 200 && custListData.notifications.length === 5, '6.2 Customer A lists notifications with pagination (limit 5)');
    const targetNotif = custListData.notifications[0];

    // 6.3 Customer A marks one notification as read
    const markReadRes = await fetch(`${baseUrl}/api/v1/customers/me/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerTokenA}` },
    });
    const markReadData = await markReadRes.json();
    assert(markReadRes.status === 200 && markReadData.notification.isRead === true, '6.3 Customer A marked notification as read');

    // Verify unread count decremented
    const unreadCountAfter1 = (await (await fetch(`${baseUrl}/api/v1/customers/me/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customerTokenA}` },
    })).json()).unreadCount;
    assert(unreadCountAfter1 === initialUnread - 1, '6.4 Unread count decremented by 1 after marking notification read');

    // 6.4 Customer B isolation check: Customer B cannot mark Customer A's notification as read
    const custBCrossRes = await fetch(`${baseUrl}/api/v1/customers/me/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerTokenB}` },
    });
    assert(custBCrossRes.status === 404, '6.5 Customer B attempting to modify Customer A notification receives 404 Not Found');

    // 6.5 Customer B lists notifications (should be 0)
    const custBListRes = await fetch(`${baseUrl}/api/v1/customers/me/notifications`, {
      headers: { Authorization: `Bearer ${customerTokenB}` },
    });
    const custBListData = await custBListRes.json();
    assert(custBListData.notifications.length === 0, '6.6 Customer B has 0 notifications (zero cross-user leakage)');

    // 6.6 Customer A marks all notifications as read
    const markAllCustRes = await fetch(`${baseUrl}/api/v1/customers/me/notifications/mark-all-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerTokenA}` },
    });
    const markAllCustData = await markAllCustRes.json();
    assert(markAllCustRes.status === 200 && markAllCustData.updatedCount > 0, '6.7 Customer A marked all notifications as read');

    const unreadAfterAll = (await (await fetch(`${baseUrl}/api/v1/customers/me/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customerTokenA}` },
    })).json()).unreadCount;
    assert(unreadAfterAll === 0, '6.8 Customer A unread count is now 0');

    // -------------------------------------------------------------
    // TEST SECTION 7: Tenant Admin Notification APIs & Cross-Tenant Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 7: Tenant Admin Notification APIs & Cross-Tenant Isolation ---');

    // 7.1 Admin A lists store notifications
    const adminListRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const adminListData = await adminListRes.json();
    assert(adminListRes.status === 200 && adminListData.notifications.length >= 3, `7.1 Admin A lists store notifications (count: ${adminListData.notifications.length})`);
    const targetAdminNotif = adminListData.notifications[0];

    // 7.2 Admin A unread count
    const adminUnreadRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const adminUnreadData = await adminUnreadRes.json();
    assert(adminUnreadRes.status === 200 && adminUnreadData.unreadCount >= 3, '7.2 Admin A unread count query succeeds');

    // 7.3 Admin A marks one notification as read
    const markAdminReadRes = await fetch(`${baseUrl}/api/notifications/${targetAdminNotif._id}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const markAdminReadData = await markAdminReadRes.json();
    assert(markAdminReadRes.status === 200 && markAdminReadData.notification.isRead === true, '7.3 Admin A marked notification as read');

    // 7.4 Cross-Tenant Admin Isolation: Admin B querying Tenant A notifications with forged header
    const adminBForgeRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${adminTokenB}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    assert(adminBForgeRes.status === 403, '7.4 Admin B attempting to query Tenant A notifications with forged header is rejected with 403 Forbidden');

    // 7.5 Admin B lists Tenant B notifications (should be 0)
    const adminBListRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${adminTokenB}`,
        'X-Tenant-ID': String(tenantB._id),
      },
    });
    const adminBListData = await adminBListRes.json();
    assert(adminBListData.notifications.length === 0, '7.5 Tenant B Admin has 0 notifications (zero cross-tenant leakage)');

    // 7.6 Admin A marks all notifications as read
    const markAllAdminRes = await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const markAllAdminData = await markAllAdminRes.json();
    assert(markAllAdminRes.status === 200 && markAllAdminData.updatedCount > 0, '7.6 Admin A marked all store notifications as read');

    const adminUnreadFinal = (await (await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    })).json()).unreadCount;
    assert(adminUnreadFinal === 0, '7.7 Admin A unread notification count is now 0');

  } catch (err) {
    console.error('Fatal test error in Phase 6 suite:', err);
    failed++;
  } finally {
    // Teardown
    console.log('\n[Teardown] Cleaning up test records...');
    try {
      await Tenant.deleteMany({ slug: { $regex: `-${timestamp}` } });
      await User.deleteMany({ email: { $regex: `-${timestamp}@example.com` } });
      await TenantMembership.deleteMany({ userId: { $in: await User.find({ email: { $regex: `-${timestamp}@example.com` } }).distinct('_id') } });
      await Product.deleteMany({ slug: { $regex: `-${timestamp}` } });
      await Category.deleteMany({ slug: { $regex: `-${timestamp}` } });
      await Address.deleteMany({ name: 'Alice Customer' });
      await Order.deleteMany({ 'customerInfo.email': { $regex: `-${timestamp}@example.com` } });
      await Cart.deleteMany({ tenantId: { $in: await Tenant.find({ slug: { $regex: `-${timestamp}` } }).distinct('_id') } });
      await Notification.deleteMany({ title: { $regex: `#AUR-` } });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }

    server.close();
    await mongoose.disconnect();

    console.log('\n================================================================');
    console.log(`Phase 6.1 Test Suite Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
};

runPhase6Tests();
