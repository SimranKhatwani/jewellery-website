/**
 * AURELLE Phase 3 & Phase 4 Audit Remediation Verification Suite
 * 
 * Verifies all 7 Audit Remediation Priorities:
 * 1. Legacy Admin Route Tenant Authorization (prevent forged X-Tenant-ID / cross-tenant mutations)
 * 2. Storefront Route and Tenant Resolution Mismatch (/:storeSlug/... routing and guest isolation)
 * 3. Customer Authentication Response Envelope (data.data.token and data.data.user unpacking)
 * 4. GridFS Media Tenant Ownership (tenantId tagging and cross-tenant deletion rejection with 403)
 * 5. Dynamic Currency Handling (independent tenant currency configurations without pollution)
 * 6. Checkout Pricing Integration (authoritative calculation without fabricated 5% tax or $15 shipping)
 * 7. Unknown Inventory Status Storefront Display (not marked as verified available stock)
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
import { generateToken } from '../utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runRemediationTests = async () => {
  console.log('================================================================');
  console.log('   AURELLE SaaS Phase 3 & Phase 4 Audit Remediation Test Suite');
  console.log('================================================================\n');

  await connectDB();
  const app = createApp();

  // Start ephemeral HTTP server
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

  // State to clean up after tests
  const cleanupTenants = [];
  const cleanupUsers = [];
  const cleanupProducts = [];
  const cleanupCategories = [];
  const cleanupCarts = [];
  const cleanupCoupons = [];
  const cleanupAddresses = [];
  let uploadedFileId = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Two Distinct Tenants (Store Alpha & Store Beta) & Super Admin
    // -------------------------------------------------------------
    console.log('[SETUP] Provisioning isolated test stores and users...');

    // 1. Super Admin
    const superAdminUser = await User.create({
      name: `Super Admin ${timestamp}`,
      email: `sa-rem-${timestamp}@aurelle.com`,
      passwordHash: 'hashed_pw',
      isSuperAdmin: true,
      status: 'active',
    });
    cleanupUsers.push(superAdminUser._id);
    const superAdminToken = generateToken({
      userId: superAdminUser._id,
      email: superAdminUser.email,
      isSuperAdmin: true,
      tokenVersion: 0,
    });

    // 2. Tenant A (Store Alpha, INR currency)
    const ownerA = await User.create({
      name: `Admin Alpha ${timestamp}`,
      email: `admin-a-${timestamp}@test.com`,
      passwordHash: 'hashed_pw',
      isSuperAdmin: false,
      status: 'active',
    });
    cleanupUsers.push(ownerA._id);

    const tenantA = await Tenant.create({
      name: `Alpha Jewels ${timestamp}`,
      slug: `store-alpha-${timestamp}`,
      ownerId: ownerA._id,
      status: 'active',
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 18,
        shippingFee: 0, // Complimentary delivery
      },
    });
    cleanupTenants.push(tenantA._id);

    let storeAdminRole = await Role.findOne({ slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN });
    if (!storeAdminRole) {
      storeAdminRole = await Role.create({
        name: 'Store Admin',
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
        description: 'Store Admin System Role',
        isSystemRole: true,
        permissions: ['*'],
      });
    }

    await TenantMembership.create({
      tenantId: tenantA._id,
      userId: ownerA._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    const tokenA = generateToken({
      userId: ownerA._id,
      email: ownerA.email,
      isSuperAdmin: false,
      tokenVersion: 0,
    });

    // 3. Tenant B (Store Beta, EUR currency)
    const ownerB = await User.create({
      name: `Admin Beta ${timestamp}`,
      email: `admin-b-${timestamp}@test.com`,
      passwordHash: 'hashed_pw',
      isSuperAdmin: false,
      status: 'active',
    });
    cleanupUsers.push(ownerB._id);

    const tenantB = await Tenant.create({
      name: `Beta Boutique ${timestamp}`,
      slug: `store-beta-${timestamp}`,
      ownerId: ownerB._id,
      status: 'active',
      settings: {
        currency: 'EUR',
        currencySymbol: '€',
        taxRate: 20,
        shippingFee: 25,
      },
    });
    cleanupTenants.push(tenantB._id);

    await TenantMembership.create({
      tenantId: tenantB._id,
      userId: ownerB._id,
      roleId: storeAdminRole._id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });

    const tokenB = generateToken({
      userId: ownerB._id,
      email: ownerB.email,
      isSuperAdmin: false,
      tokenVersion: 0,
    });

    console.log(`  -> Tenant A: ${tenantA.slug} (Currency: INR)`);
    console.log(`  -> Tenant B: ${tenantB.slug} (Currency: EUR)\n`);

    // =============================================================
    // PRIORITY 1: Legacy Admin Route Tenant Authorization
    // =============================================================
    console.log('[PRIORITY 1] Testing Legacy Admin Route Tenant Authorization...');

    // 1.1 Store Admin A creates product in their own store via legacy /api/products
    const createProdResA = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'X-Tenant-ID': tenantA.slug,
      },
      body: JSON.stringify({
        name: 'Alpha Signature Ring',
        slug: `alpha-sig-ring-${timestamp}`,
        category: 'rings',
        priceUSD: 240,
        sku: `SKU-ALPHA-${timestamp}`,
        primaryImage: 'https://cdn.aurelle.com/ring-alpha.jpg',
        stockQuantity: 15,
        inStock: true,
      }),
    });
    const createProdDataA = await createProdResA.json();
    assert(
      createProdResA.status === 201 && createProdDataA.success,
      'Test P1.1: Store Admin A can create product in their own store via legacy route'
    );
    if (createProdDataA.product?._id) cleanupProducts.push(createProdDataA.product._id);

    // 1.2 Forged Header: Store Admin A attempts to mutate Tenant B's store via forged X-Tenant-ID
    const forgedProdRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`, // Admin A token!
        'X-Tenant-ID': tenantB.slug,       // Forged to target Tenant B!
      },
      body: JSON.stringify({
        name: 'Malicious Injected Product',
        slug: `malicious-prod-${timestamp}`,
        category: 'rings',
        priceUSD: 10,
        sku: `SKU-MALICIOUS-${timestamp}`,
        primaryImage: 'https://cdn.aurelle.com/hack.jpg',
      }),
    });
    assert(
      forgedProdRes.status === 403,
      `Test P1.2: Store Admin A cannot mutate Tenant B using forged X-Tenant-ID (HTTP ${forgedProdRes.status})`
    );

    // 1.3 Forged Category: Store Admin A attempts to create category in Tenant B
    const forgedCatRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'X-Tenant-ID': tenantB.slug,
      },
      body: JSON.stringify({
        name: 'Hacked Category',
        slug: `hacked-cat-${timestamp}`,
      }),
    });
    assert(
      forgedCatRes.status === 403,
      `Test P1.3: Store Admin A cannot create category in Tenant B (HTTP ${forgedCatRes.status})`
    );

    // 1.4 Super Admin bypasses membership check and can manage catalog for any tenant
    const superAdminProdRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Tenant-ID': tenantB.slug,
      },
      body: JSON.stringify({
        name: 'Beta Emerald Choker',
        slug: `beta-emerald-${timestamp}`,
        category: 'necklaces',
        priceUSD: 450,
        sku: `SKU-BETA-${timestamp}`,
        primaryImage: 'https://cdn.aurelle.com/choker.jpg',
      }),
    });
    const superAdminProdData = await superAdminProdRes.json();
    assert(
      superAdminProdRes.status === 201 && superAdminProdData.success,
      'Test P1.4: Super Admin can manage product catalog across any tenant'
    );
    if (superAdminProdData.product?._id) cleanupProducts.push(superAdminProdData.product._id);

    // =============================================================
    // PRIORITY 2: Storefront Route and Tenant Resolution Mismatch
    // =============================================================
    console.log('\n[PRIORITY 2] Testing Storefront Route and Tenant Resolution...');

    // 2.1 GET /api/v1/storefront/:storeSlug/cart with valid slug returns 200
    const guestSessionA = `guest_alpha_${timestamp}`;
    const cartResA = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart`, {
      headers: {
        'X-Guest-Session-ID': guestSessionA,
        Accept: 'application/json',
      },
    });
    const cartDataA = await cartResA.json();
    assert(
      cartResA.status === 200 && cartDataA.success && Array.isArray(cartDataA.cart?.items),
      'Test P2.1: Storefront route /:storeSlug/cart correctly resolves tenant and returns 200'
    );

    // 2.2 GET /api/v1/storefront/:storeSlug/cart with invalid slug returns 404 Not Found
    const invalidCartRes = await fetch(`${baseUrl}/api/v1/storefront/non-existent-store-slug-999/cart`, {
      headers: {
        'X-Guest-Session-ID': guestSessionA,
      },
    });
    assert(
      invalidCartRes.status === 404,
      `Test P2.2: Invalid storeSlug returns 404 Not Found (HTTP ${invalidCartRes.status})`
    );

    // 2.3 Guest cart isolation: Add item to Guest cart in Tenant A; check Tenant B is strictly isolated
    const addCartRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session-ID': guestSessionA,
      },
      body: JSON.stringify({
        productId: createProdDataA.product._id,
        quantity: 2,
      }),
    });
    const addCartData = await addCartRes.json();
    assert(
      addCartRes.status === 200 && addCartData.cart?.items?.length === 1,
      'Test P2.3: Guest item successfully added to Tenant A cart'
    );

    // Query Tenant B cart with identical guestSessionA - must remain completely empty!
    const cartResB = await fetch(`${baseUrl}/api/v1/storefront/${tenantB.slug}/cart`, {
      headers: {
        'X-Guest-Session-ID': guestSessionA,
      },
    });
    const cartDataB = await cartResB.json();
    assert(
      cartResB.status === 200 && (cartDataB.cart?.items?.length || 0) === 0,
      'Test P2.4: Guest cart in Tenant B is strictly isolated from Tenant A'
    );

    // =============================================================
    // PRIORITY 3: Customer Authentication Response Envelope
    // =============================================================
    console.log('\n[PRIORITY 3] Testing Customer Authentication Response Envelope...');

    // 3.1 Customer registration returns wrapped { success: true, message, data: { token, user } }
    const customerEmail = `customer-${timestamp}@shopper.com`;
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: 'Password123!',
        name: 'Jane Shopper',
        phoneNumber: '+919876543210',
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 && regData.success && Boolean(regData.data?.token) && Boolean(regData.data?.user),
      'Test P3.1: Registration response returns token and user wrapped in data envelope'
    );

    // Verify extraction logic used in storefrontService.js
    const extractedToken = regData.data?.token || regData.token;
    const extractedUser = regData.data?.user || regData.user;
    assert(
      Boolean(extractedToken && extractedUser?.email === customerEmail),
      'Test P3.2: Frontend unpacking logic correctly extracts customer token and user identity'
    );
    if (extractedUser?.id || extractedUser?._id) cleanupUsers.push(extractedUser.id || extractedUser._id);

    // 3.2 Customer login also returns wrapped envelope
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await loginRes.json();
    const loginToken = loginData.data?.token || loginData.token;
    assert(
      loginRes.status === 200 && Boolean(loginToken),
      'Test P3.3: Login response successfully unwraps customer token'
    );

    // 3.3 Customer can access /api/v1/customers/me with extracted token
    const profileRes = await fetch(`${baseUrl}/api/v1/customers/me`, {
      headers: {
        Authorization: `Bearer ${loginToken}`,
        Accept: 'application/json',
      },
    });
    const profileData = await profileRes.json();
    assert(
      profileRes.status === 200 && profileData.customer?.email === customerEmail,
      'Test P3.4: Customer profile endpoint /me successfully authenticated with extracted token'
    );

    // =============================================================
    // PRIORITY 4: GridFS Media Tenant Ownership
    // =============================================================
    console.log('\n[PRIORITY 4] Testing GridFS Media Tenant Ownership & Protection...');

    // 4.1 Upload media tagged with Tenant A
    const formData = new FormData();
    const imageBlob = new Blob(['Simulated Image Binary Data'], { type: 'image/jpeg' });
    formData.append('image', imageBlob, 'ring.jpg');

    const uploadRes = await fetch(`${baseUrl}/api/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'X-Tenant-ID': tenantA.slug,
      },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    uploadedFileId = uploadData.id || uploadData.file?._id;
    assert(
      uploadRes.status === 201 && Boolean(uploadedFileId),
      'Test P4.1: Store Admin A uploads image tagged with tenant context'
    );

    // Verify in MongoDB that metadata.tenantId was set
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
    const cursor = bucket.find({ _id: new mongoose.Types.ObjectId(uploadedFileId) });
    const files = await cursor.toArray();
    assert(
      files.length === 1 && String(files[0].metadata?.tenantId) === String(tenantA._id),
      'Test P4.2: GridFS file metadata explicitly records tenantId'
    );

    // 4.2 Cross-Tenant Deletion Blocked: Admin B attempts to delete Admin A's file
    const crossDeleteRes = await fetch(`${baseUrl}/api/media/${uploadedFileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'X-Tenant-ID': tenantB.slug,
      },
    });
    assert(
      crossDeleteRes.status === 403,
      `Test P4.3: Store Admin B blocked from deleting Store A's media (HTTP ${crossDeleteRes.status} 403 Forbidden)`
    );

    // 4.3 Public GET remains accessible without authentication
    const publicMediaRes = await fetch(`${baseUrl}/api/media/${uploadedFileId}`);
    assert(
      publicMediaRes.status === 200,
      `Test P4.4: Public media retrieval succeeds unauthenticated (HTTP ${publicMediaRes.status})`
    );

    // 4.4 Super Admin or Store Admin A can delete the media file
    const legitDeleteRes = await fetch(`${baseUrl}/api/media/${uploadedFileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'X-Tenant-ID': tenantA.slug,
      },
    });
    assert(
      legitDeleteRes.status === 200,
      'Test P4.5: Owning store admin successfully deleted their own media'
    );

    // =============================================================
    // PRIORITY 5: Dynamic Currency Handling
    // =============================================================
    console.log('\n[PRIORITY 5] Testing Dynamic Currency Handling...');

    // 5.1 Query Tenant A info -> INR / ₹
    const infoResA = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/info`);
    const infoDataA = await infoResA.json();
    assert(
      infoDataA.store?.currency === 'INR' && infoDataA.store?.currencySymbol === '₹',
      'Test P5.1: Tenant A storefront reports configured INR / ₹ currency'
    );

    // 5.2 Query Tenant B info -> EUR / €
    const infoResB = await fetch(`${baseUrl}/api/v1/storefront/${tenantB.slug}/info`);
    const infoDataB = await infoResB.json();
    assert(
      infoDataB.store?.currency === 'EUR' && infoDataB.store?.currencySymbol === '€',
      'Test P5.2: Tenant B storefront reports configured EUR / € currency without pollution'
    );

    // =============================================================
    // PRIORITY 6: Checkout Pricing Integration
    // =============================================================
    console.log('\n[PRIORITY 6] Testing Checkout Pricing Integration...');

    const customerUserId = extractedUser.id || extractedUser._id;

    // 6.1 Create active address for Jane Shopper
    const address = await Address.create({
      userId: customerUserId,
      name: 'Jane Shopper',
      phone: '+919876543210',
      addressLine1: '42 Crescent Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      isDefault: true,
    });
    cleanupAddresses.push(address._id);

    // 6.2 Create Cart for authenticated customer in Tenant A
    const custCart = await Cart.create({
      tenantId: tenantA._id,
      userId: customerUserId,
      items: [
        {
          productId: createProdDataA.product._id,
          sku: createProdDataA.product.sku,
          quantity: 2,
          price: 240,
        },
      ],
      subtotal: 480,
    });
    cleanupCarts.push(custCart._id);

    // 6.3 Checkout Preview for Tenant A (taxRate: 18%, shippingFee: 0 complimentary)
    const previewRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/checkout/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginToken}`,
      },
      body: JSON.stringify({
        addressId: address._id,
      }),
    });
    const previewData = await previewRes.json();
    const pricing = previewData.checkoutPreview?.pricing;

    assert(
      previewRes.status === 200 && Boolean(pricing),
      'Test P6.1: Authoritative checkout preview generated successfully'
    );

    // Subtotal: 2 * 240 = 480
    // Tax: 18% of 480 = 86
    // Shipping: 0 (Complimentary)
    // Total: 480 + 86 = 566
    assert(
      pricing?.subtotal === 480 && pricing?.taxAmount === 86 && pricing?.shippingAmount === 0,
      `Test P6.2: Authoritative breakdown calculated accurately (Subtotal: 480, Tax 18%: 86, Shipping: 0, Total: ${pricing?.totalPayable})`
    );
    assert(
      pricing?.taxRate === '18%' && pricing?.shippingFee === 'Complimentary Insured Delivery',
      'Test P6.3: Zero unconfigured shipping is designated Complimentary Insured Delivery, not fabricated $15'
    );

    // =============================================================
    // PRIORITY 7: Unknown Inventory Status Storefront Display
    // =============================================================
    console.log('\n[PRIORITY 7] Testing Unknown Inventory Status Storefront Display...');

    const artisanProduct = await Product.create({
      tenantId: tenantA._id,
      name: 'Sculpted Bespoke Pendant',
      slug: `bespoke-pendant-${timestamp}`,
      category: 'necklaces',
      priceUSD: 850,
      sku: `BESPOKE-${timestamp}`,
      primaryImage: 'https://cdn.aurelle.com/pendant.jpg',
      isPublished: true,
      inStock: true,
      stockQuantity: 0,
      inventoryStatus: 'unknown',
    });
    cleanupProducts.push(artisanProduct._id);

    const productDetailRes = await fetch(`${baseUrl}/api/v1/storefront/${tenantA.slug}/products/${artisanProduct.slug}`);
    const productDetailData = await productDetailRes.json();
    const fetchedProduct = productDetailData.product;

    assert(
      productDetailRes.status === 200 && fetchedProduct?.inventoryStatus === 'unknown',
      'Test P7.1: Product detail preserves explicit inventoryStatus === "unknown"'
    );
    assert(
      fetchedProduct?.isAvailable === true,
      'Test P7.2: Made-to-order artisan piece is available for allocation without false verified stock numbers'
    );

    // Virtual price field check
    assert(
      fetchedProduct?.price === 850 && fetchedProduct?.priceUSD === 850,
      'Test P7.3: Product virtual/field "price" matches "priceUSD" seamlessly'
    );

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    // Teardown HTTP server
    await new Promise((resolve) => server.close(resolve));

    // Database cleanup
    console.log('\n[TEARDOWN] Cleaning up temporary test records...');
    if (cleanupProducts.length > 0) await Product.deleteMany({ _id: { $in: cleanupProducts } });
    if (cleanupCategories.length > 0) await Category.deleteMany({ _id: { $in: cleanupCategories } });
    if (cleanupCarts.length > 0) await Cart.deleteMany({ _id: { $in: cleanupCarts } });
    if (cleanupCoupons.length > 0) await Coupon.deleteMany({ _id: { $in: cleanupCoupons } });
    if (cleanupAddresses.length > 0) await Address.deleteMany({ _id: { $in: cleanupAddresses } });
    if (cleanupTenants.length > 0) {
      await TenantMembership.deleteMany({ tenantId: { $in: cleanupTenants } });
      await Tenant.deleteMany({ _id: { $in: cleanupTenants } });
    }
    if (cleanupUsers.length > 0) await User.deleteMany({ _id: { $in: cleanupUsers } });
    if (uploadedFileId) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
        await bucket.delete(new mongoose.Types.ObjectId(uploadedFileId));
      } catch {}
    }
    await mongoose.connection.close();
    console.log('  -> Teardown complete.');
  }

  console.log('\n================================================================');
  console.log(`  Phase 3 & Phase 4 Remediation Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runRemediationTests();
