/**
 * AURELLE Phase 5: Order Management and Checkout Payment Options Verification Suite
 *
 * Verifies:
 * 1. Storefront Order Placement for COD (paymentStatus: 'pending')
 * 2. Storefront Order Placement for CARD (paymentStatus: 'pending', no fake gateway simulation)
 * 3. Storefront Order Placement for UPI (paymentStatus: 'pending', no fake QR/gateway simulation)
 * 4. Immediate visibility in Tenant Admin Panel (GET /api/orders) with metrics aggregation
 * 5. Tenant Admin Order Details and status progression lifecycle
 * 6. Cross-Tenant Admin Isolation (Admin B cannot view or modify Tenant A's orders)
 * 7. Customer Order History (GET /api/v1/customers/me/orders) & cross-customer isolation
 * 8. Atomic Inventory Deduction on order placement
 * 9. Atomic Inventory Restoration on order cancellation
 * 10. Protection against double cancellation & duplicate inventory restoration
 * 11. Coupon usage increment on checkout & reversal on cancellation
 * 12. Idempotency Key protection against duplicate orders
 * 13. Invalid order status transitions rejection (e.g., shipped -> cancelled)
 * 14. Audit Log verification for order creation, status update, and cancellation
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
import { Coupon } from '../models/Coupon.js';
import { Address } from '../models/Address.js';
import { Order } from '../models/Order.js';
import { AuditLog } from '../models/AuditLog.js';
import { generateToken } from '../utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runPhase5Tests = async () => {
  console.log('================================================================');
  console.log('   AURELLE SaaS Phase 5: Order Management & Payment Test Suite');
  console.log('================================================================\n');

  await connectDB();
  try {
    await Order.syncIndexes();
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
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------
    // SETUP: Tenants, Roles, Admins, Customers & Products
    // -------------------------------------------------------------
    console.log('[Setup] Preparing test environment for Tenant A and Tenant B...');

    let storeAdminRole = await Role.findOne({ slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN });
    if (!storeAdminRole) {
      storeAdminRole = await Role.create({
        name: 'Store Administrator',
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
        description: 'Store administrator with order management privileges',
        isSystem: true,
        permissions: ['order:read', 'order:write', 'product:read', 'product:write'],
      });
    }

    // Admin A
    const adminUserA = await User.create({
      name: `Admin User A ${timestamp}`,
      email: `admin-a-${timestamp}@example.com`,
      passwordHash: 'seededhash123',
      isActive: true,
      status: 'active',
    });

    // Admin B
    const adminUserB = await User.create({
      name: `Admin User B ${timestamp}`,
      email: `admin-b-${timestamp}@example.com`,
      passwordHash: 'seededhash123',
      isActive: true,
      status: 'active',
    });

    // Tenant A
    const tenantA = await Tenant.create({
      name: `Jewels Atelier A ${timestamp}`,
      slug: `jewels-a-${timestamp}`,
      ownerId: adminUserA._id,
      status: 'active',
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 3,
        shippingFee: 50,
      },
    });

    // Tenant B (for cross-tenant boundary verification)
    const tenantB = await Tenant.create({
      name: `Jewels Atelier B ${timestamp}`,
      slug: `jewels-b-${timestamp}`,
      ownerId: adminUserB._id,
      status: 'active',
      settings: {
        currency: 'EUR',
        currencySymbol: '€',
        taxRate: 0,
        shippingFee: 0,
      },
    });

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

    // Customer A
    const customerUserA = await User.create({
      name: `Customer Alice ${timestamp}`,
      email: `customer-alice-${timestamp}@example.com`,
      passwordHash: 'seededhash123',
      phoneNumber: '+919876543210',
      isActive: true,
    });
    const customerTokenA = generateToken({
      userId: customerUserA._id,
      email: customerUserA.email,
      role: 'customer',
    });

    // Customer B
    const customerUserB = await User.create({
      name: `Customer Bob ${timestamp}`,
      email: `customer-bob-${timestamp}@example.com`,
      passwordHash: 'seededhash123',
      phoneNumber: '+919876543211',
      isActive: true,
    });
    const customerTokenB = generateToken({
      userId: customerUserB._id,
      email: customerUserB.email,
      role: 'customer',
    });

    // Customer A Saved Address
    const addressA = await Address.create({
      userId: customerUserA._id,
      name: 'Alice Smith',
      phone: '+919876543210',
      addressLine1: '123 Solitaire Crescent',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      isDefault: true,
    });

    // Products in Tenant A
    const prodCategoryA = await Category.create({
      name: `Rings A ${timestamp}`,
      slug: `rings-a-${timestamp}`,
      tenantId: tenantA._id,
      isActive: true,
    });

    const productA1 = await Product.create({
      tenantId: tenantA._id,
      name: 'Sterling Diamond Ring',
      slug: `sterling-diamond-ring-${timestamp}`,
      sku: `SDR-${timestamp}`,
      category: 'rings',
      categoryId: prodCategoryA._id,
      priceUSD: 1000,
      stockQuantity: 10,
      inventoryStatus: 'in_stock',
      inStock: true,
      isPublished: true,
      primaryImage: '/images/products/ring1.jpg',
    });

    const productA2 = await Product.create({
      tenantId: tenantA._id,
      name: 'Sapphire Solitaire Ring',
      slug: `sapphire-solitaire-${timestamp}`,
      sku: `SSR-${timestamp}`,
      category: 'rings',
      categoryId: prodCategoryA._id,
      priceUSD: 2000,
      stockQuantity: 5,
      inventoryStatus: 'in_stock',
      inStock: true,
      isPublished: true,
      primaryImage: '/images/products/ring2.jpg',
      variants: [
        {
          name: 'Size 6 / Silver',
          sku: `SSR-6S-${timestamp}`,
          price: 2100,
          stockQuantity: 4,
          inventoryStatus: 'in_stock',
          isActive: true,
        },
      ],
    });

    // Coupon in Tenant A
    const couponA = await Coupon.create({
      tenantId: tenantA._id,
      code: `SAVE10_${timestamp}`,
      normalizedCode: `save10_${timestamp}`,
      description: '10% discount for orders over 500',
      discountType: 'percentage',
      discountValue: 10,
      minimumOrderAmount: 500,
      maximumDiscountAmount: 200,
      usageLimit: 2,
      usedCount: 0,
      startDate: new Date(Date.now() - 3600000),
      expiryDate: new Date(Date.now() + 86400000 * 7),
      status: 'active',
    });

    console.log('[Setup] Test data initialized successfully.\n');

    // -------------------------------------------------------------
    // TEST SECTION 1: Cash on Delivery (COD) Order Placement
    // -------------------------------------------------------------
    console.log('--- Test Section 1: Cash on Delivery (COD) Order Placement ---');

    // 1.1 Add product to Customer A cart
    const addCartRes1 = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        productId: productA1._id,
        quantity: 2,
      }),
    });
    const addCartData1 = await addCartRes1.json();
    assert(addCartRes1.status === 200 && addCartData1.cart?.items?.length === 1, '1.1 Item added to cart for COD order');

    // 1.2 Place COD order
    const placeCodRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        couponCode: couponA.code,
        paymentMethod: 'cod',
      }),
    });
    const placeCodData = await placeCodRes.json();

    assert(placeCodRes.status === 201 && placeCodData.success === true, '1.2 COD order placed with HTTP 201');
    const orderCod = placeCodData.order;
    assert(orderCod.paymentMethod === 'cod', '1.3 Order paymentMethod is "cod"');
    assert(orderCod.paymentStatus === 'pending', '1.4 Initial COD paymentStatus is "pending" (payment pending collection)');
    assert(orderCod.orderStatus === 'pending', '1.5 Initial orderStatus is "pending"');
    assert(orderCod.orderNumber && orderCod.orderNumber.startsWith('JEW'), '1.6 Order number generated with tenant prefix');
    assert(orderCod.pricing.taxAmount > 0, '1.7 Authoritative tax calculated from tenant setting (3%)');
    assert(orderCod.pricing.shippingAmount === 50, '1.8 Authoritative shipping fee applied from tenant setting (50)');
    assert(orderCod.pricing.coupon.code === couponA.code, '1.9 Coupon applied snapshot captured in order');

    // 1.10 Check that Cart was emptied
    const cartAfterOrder1 = await Cart.findOne({ tenantId: tenantA._id, userId: customerUserA._id });
    assert(cartAfterOrder1.items.length === 0, '1.10 Shopping cart was automatically cleared after order placement');

    // 1.11 Check stock reduction
    const updatedProdA1 = await Product.findById(productA1._id);
    assert(updatedProdA1.stockQuantity === 8, `1.11 Stock reduced from 10 to 8 (actual: ${updatedProdA1.stockQuantity})`);

    // 1.12 Check coupon usedCount increment
    const updatedCouponA = await Coupon.findById(couponA._id);
    assert(updatedCouponA.usedCount === 1, `1.12 Coupon usedCount incremented to 1 (actual: ${updatedCouponA.usedCount})`);

    // -------------------------------------------------------------
    // TEST SECTION 2: Credit/Debit Card Order Placement (Gateway-Ready Preview)
    // -------------------------------------------------------------
    console.log('\n--- Test Section 2: CARD Order Placement (Gateway-Ready Preview) ---');

    // 2.1 Add item with variant to Customer A cart
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        productId: productA2._id,
        variantId: productA2.variants[0]._id,
        quantity: 1,
      }),
    });

    // 2.2 Place CARD order (no fake card transaction, paymentStatus remains pending)
    const placeCardRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'card',
      }),
    });
    const placeCardData = await placeCardRes.json();
    assert(placeCardRes.status === 201 && placeCardData.success === true, '2.1 CARD order placed successfully');
    const orderCard = placeCardData.order;
    assert(orderCard.paymentMethod === 'card', '2.2 Order paymentMethod is "card"');
    assert(orderCard.paymentStatus === 'pending', '2.3 CARD paymentStatus is "pending" (gateway pending, no fake success)');
    assert(orderCard.items[0].variantName === 'Size 6 / Silver', '2.4 Order captures correct variant snapshot');

    // Verify variant stock reduction
    const updatedProdA2 = await Product.findById(productA2._id);
    assert(updatedProdA2.variants[0].stockQuantity === 3, '2.5 Variant stock reduced from 4 to 3');

    // -------------------------------------------------------------
    // TEST SECTION 3: UPI Order Placement (Gateway-Ready Preview)
    // -------------------------------------------------------------
    console.log('\n--- Test Section 3: UPI Order Placement (Gateway-Ready Preview) ---');

    // 3.1 Place Guest UPI Order
    const guestSessionId = `guest_sess_${timestamp}`;
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session-ID': guestSessionId,
      },
      body: JSON.stringify({
        productId: productA1._id,
        quantity: 1,
      }),
    });

    const placeUpiRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session-ID': guestSessionId,
      },
      body: JSON.stringify({
        guestAddress: {
          name: 'Guest Shopper',
          email: 'guest@example.com',
          phone: '+919999988888',
          addressLine1: '45 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'India',
        },
        paymentMethod: 'upi',
      }),
    });
    const placeUpiData = await placeUpiRes.json();
    assert(placeUpiRes.status === 201 && placeUpiData.success === true, '3.1 Guest UPI order placed with HTTP 201');
    const orderUpi = placeUpiData.order;
    assert(orderUpi.paymentMethod === 'upi', '3.2 Order paymentMethod is "upi"');
    assert(orderUpi.paymentStatus === 'pending', '3.3 UPI paymentStatus is "pending" (no fake QR code simulated as paid)');
    assert(orderUpi.customerInfo.isGuest === true, '3.4 Customer info correctly marked as guest order');

    // -------------------------------------------------------------
    // TEST SECTION 4: Immediate Visibility in Tenant Admin Console
    // -------------------------------------------------------------
    console.log('\n--- Test Section 4: Immediate Visibility in Tenant Admin Console ---');

    // 4.1 Admin A fetches all orders
    const adminOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const adminOrdersData = await adminOrdersRes.json();

    assert(adminOrdersRes.status === 200, '4.1 Admin orders endpoint returns HTTP 200');
    assert(adminOrdersData.orders.length === 3, `4.2 All 3 newly placed orders are immediately visible in Tenant Admin (count: ${adminOrdersData.orders.length})`);
    assert(adminOrdersData.metrics.totalOrders === 3, '4.3 Real-time metrics aggregated totalOrders === 3');
    assert(adminOrdersData.metrics.pendingOrders === 3, '4.4 Real-time metrics aggregated pendingOrders === 3');

    // 4.2 Filter by paymentMethod: 'cod'
    const adminCodOrdersRes = await fetch(`${baseUrl}/api/orders?paymentMethod=cod`, {
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const adminCodOrdersData = await adminCodOrdersRes.json();
    assert(adminCodOrdersData.orders.length === 1 && adminCodOrdersData.orders[0].paymentMethod === 'cod', '4.5 Admin filter by paymentMethod=cod returns only COD orders');

    // 4.3 Admin Order Details
    const adminOrderDetailRes = await fetch(`${baseUrl}/api/orders/${orderCod._id}`, {
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    const adminOrderDetailData = await adminOrderDetailRes.json();
    assert(adminOrderDetailRes.status === 200 && adminOrderDetailData.order.orderNumber === orderCod.orderNumber, '4.6 Admin fetches complete order details by ID');

    // -------------------------------------------------------------
    // TEST SECTION 5: Cross-Tenant Admin Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 5: Cross-Tenant Admin Isolation ---');

    // 5.1 Admin B queries orders for Tenant B
    const adminBOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: {
        Authorization: `Bearer ${adminTokenB}`,
        'X-Tenant-ID': String(tenantB._id),
      },
    });
    const adminBOrdersData = await adminBOrdersRes.json();
    assert(adminBOrdersData.orders.length === 0, '5.1 Tenant B Admin cannot see Tenant A orders (count is 0)');

    // 5.2 Admin B tries to forge X-Tenant-ID to access Tenant A order
    const adminBForgeRes = await fetch(`${baseUrl}/api/orders/${orderCod._id}`, {
      headers: {
        Authorization: `Bearer ${adminTokenB}`,
        'X-Tenant-ID': String(tenantA._id),
      },
    });
    assert(adminBForgeRes.status === 403, '5.2 Admin B attempting to query Tenant A via forged header is rejected with 403 Forbidden');

    // -------------------------------------------------------------
    // TEST SECTION 6: Customer Order History & Customer Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 6: Customer Order History & Customer Isolation ---');

    // 6.1 Customer A order list
    const customerOrdersRes = await fetch(`${baseUrl}/api/v1/customers/me/orders`, {
      headers: {
        Authorization: `Bearer ${customerTokenA}`,
      },
    });
    const customerOrdersData = await customerOrdersRes.json();
    assert(customerOrdersRes.status === 200 && customerOrdersData.orders.length === 2, '6.1 Customer A fetches their 2 orders successfully');

    // 6.2 Customer B tries to view Customer A's order
    const customerBViewRes = await fetch(`${baseUrl}/api/v1/customers/me/orders/${orderCod._id}`, {
      headers: {
        Authorization: `Bearer ${customerTokenB}`,
      },
    });
    assert(customerBViewRes.status === 404, '6.2 Customer B attempting to view Customer A order receives 404 Not Found');

    // -------------------------------------------------------------
    // TEST SECTION 7: Idempotency Protection
    // -------------------------------------------------------------
    console.log('\n--- Test Section 7: Idempotency Protection ---');

    const idempKey = `idem_${timestamp}`;
    // Add item to cart
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        productId: productA1._id,
        quantity: 1,
      }),
    });

    const stockBeforeIdemp = (await Product.findById(productA1._id)).stockQuantity;

    // First request with idempotencyKey
    const firstReq = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
        'Idempotency-Key': idempKey,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'cod',
      }),
    });
    const firstData = await firstReq.json();
    assert(firstReq.status === 201 && firstData.isDuplicate === false, '7.1 First idempotent order request succeeds with 201');

    const stockAfterFirst = (await Product.findById(productA1._id)).stockQuantity;
    assert(stockAfterFirst === stockBeforeIdemp - 1, '7.2 Stock decremented by 1 on first request');

    // Second request with exact same idempotencyKey
    const secondReq = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
        'Idempotency-Key': idempKey,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        paymentMethod: 'cod',
      }),
    });
    const secondData = await secondReq.json();
    assert(secondReq.status === 200 && secondData.isDuplicate === true, '7.3 Second identical request returns 200 OK (idempotent duplicate response)');
    assert(secondData.order.orderNumber === firstData.order.orderNumber, '7.4 Same existing order number returned');

    const stockAfterSecond = (await Product.findById(productA1._id)).stockQuantity;
    assert(stockAfterSecond === stockAfterFirst, '7.5 Stock was NOT decremented a second time');

    // -------------------------------------------------------------
    // TEST SECTION 8: Order Status Progression & COD Settlement
    // -------------------------------------------------------------
    console.log('\n--- Test Section 8: Order Status Progression & Permitted Transitions ---');

    // 8.1 pending -> confirmed
    const step1 = await fetch(`${baseUrl}/api/orders/${orderCod._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'confirmed' }),
    });
    const step1Data = await step1.json();
    assert(step1.status === 200 && step1Data.order.orderStatus === 'confirmed', '8.1 Status transitioned: pending -> confirmed');

    // 8.2 confirmed -> processing
    const step2 = await fetch(`${baseUrl}/api/orders/${orderCod._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'processing' }),
    });
    const step2Data = await step2.json();
    assert(step2.status === 200 && step2Data.order.orderStatus === 'processing', '8.2 Status transitioned: confirmed -> processing');

    // 8.3 processing -> shipped
    const step3 = await fetch(`${baseUrl}/api/orders/${orderCod._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'shipped' }),
    });
    const step3Data = await step3.json();
    assert(step3.status === 200 && step3Data.order.orderStatus === 'shipped', '8.3 Status transitioned: processing -> shipped');

    // 8.4 shipped -> cancelled (Must be REJECTED! Shipped orders cannot be cancelled)
    const invalidCancel = await fetch(`${baseUrl}/api/orders/${orderCod._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'cancelled' }),
    });
    assert(invalidCancel.status === 400, '8.4 Transitioning shipped -> cancelled is strictly rejected with 400 Bad Request');

    // 8.5 shipped -> delivered (For COD orders, paymentStatus transitions to 'paid')
    const step4 = await fetch(`${baseUrl}/api/orders/${orderCod._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ orderStatus: 'delivered' }),
    });
    const step4Data = await step4.json();
    assert(step4.status === 200 && step4Data.order.orderStatus === 'delivered', '8.5 Status transitioned: shipped -> delivered');
    assert(step4Data.order.paymentStatus === 'paid', '8.6 COD delivered order automatically records paymentStatus as "paid"');

    // -------------------------------------------------------------
    // TEST SECTION 9: Order Cancellation, Stock Restoration & Coupon Reversal
    // -------------------------------------------------------------
    console.log('\n--- Test Section 9: Order Cancellation & Atomic Stock/Coupon Restoration ---');

    // We will cancel orderCard (status: 'pending')
    const stockBeforeCardCancel = (await Product.findById(productA2._id)).variants[0].stockQuantity;
    const cancelRes = await fetch(`${baseUrl}/api/orders/${orderCard._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ reason: 'Customer requested cancellation before dispatch' }),
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.order.orderStatus === 'cancelled', '9.1 Order successfully cancelled via Admin API');

    const stockAfterCardCancel = (await Product.findById(productA2._id)).variants[0].stockQuantity;
    assert(stockAfterCardCancel === stockBeforeCardCancel + 1, `9.2 Tracked variant stock atomically restored from ${stockBeforeCardCancel} to ${stockAfterCardCancel}`);

    // 9.3 Double cancellation protection
    const doubleCancelRes = await fetch(`${baseUrl}/api/orders/${orderCard._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenA}`,
        'X-Tenant-ID': String(tenantA._id),
      },
      body: JSON.stringify({ reason: 'Try cancelling again' }),
    });
    assert(doubleCancelRes.status === 400, '9.3 Double cancellation is rejected with 400 Bad Request');

    const stockAfterDoubleCancel = (await Product.findById(productA2._id)).variants[0].stockQuantity;
    assert(stockAfterDoubleCancel === stockAfterCardCancel, '9.4 Stock was NOT restored twice');

    // 9.4 Customer Self-Service Cancellation & Coupon Reversal
    // Let's create an order with coupon for Customer A and cancel it via Customer API
    await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        productId: productA1._id,
        quantity: 1,
      }),
    });

    const orderWithCouponRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({
        addressId: addressA._id,
        couponCode: couponA.code,
        paymentMethod: 'card',
      }),
    });
    const orderWithCouponData = await orderWithCouponRes.json();
    const orderWithCoupon = orderWithCouponData.order;

    const couponUsedBeforeCancel = (await Coupon.findById(couponA._id)).usedCount;

    // Customer cancels order
    const custCancelRes = await fetch(`${baseUrl}/api/v1/customers/me/orders/${orderWithCoupon._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerTokenA}`,
      },
      body: JSON.stringify({ reason: 'Changed mind' }),
    });
    const custCancelData = await custCancelRes.json();
    assert(custCancelRes.status === 200 && custCancelData.order.orderStatus === 'cancelled', '9.5 Customer cancels their own order via self-service endpoint');

    const couponUsedAfterCancel = (await Coupon.findById(couponA._id)).usedCount;
    assert(couponUsedAfterCancel === couponUsedBeforeCancel - 1, `9.6 Coupon usedCount atomically reversed from ${couponUsedBeforeCancel} to ${couponUsedAfterCancel}`);

    // -------------------------------------------------------------
    // TEST SECTION 10: Audit Log Verification
    // -------------------------------------------------------------
    console.log('\n--- Test Section 10: Audit Log Recording ---');

    const auditLogs = await AuditLog.find({ tenantId: tenantA._id }).lean();
    const actions = auditLogs.map((l) => l.action);

    assert(actions.includes('ORDER_CREATE'), '10.1 ORDER_CREATE action logged in AuditLog');
    assert(actions.includes('ORDER_STATUS_UPDATE'), '10.2 ORDER_STATUS_UPDATE action logged in AuditLog');
    assert(actions.includes('ORDER_CANCEL'), '10.3 ORDER_CANCEL action logged in AuditLog');

  } catch (err) {
    console.error('Fatal test error:', err);
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
      await Coupon.deleteMany({ code: { $regex: `_${timestamp}` } });
      await Address.deleteMany({ name: { $in: ['Alice Smith', 'Guest Shopper'] } });
      await Order.deleteMany({ 'customerInfo.email': { $regex: `-${timestamp}@example.com` } });
      await Cart.deleteMany({ tenantId: { $in: await Tenant.find({ slug: { $regex: `-${timestamp}` } }).distinct('_id') } });
      await AuditLog.deleteMany({ tenantId: { $in: await Tenant.find({ slug: { $regex: `-${timestamp}` } }).distinct('_id') } });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }

    server.close();
    await mongoose.disconnect();

    console.log('\n================================================================');
    console.log(`Phase 5 Test Suite Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
};

runPhase5Tests();
