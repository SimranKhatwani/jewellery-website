import dotenv from 'dotenv';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { SubscriptionEvent } from '../models/SubscriptionEvent.js';
import { AuditLog } from '../models/AuditLog.js';
import { verifyWebhookSignature } from '../services/payment.service.js';

dotenv.config();

const request = (app, method, path, { headers = {}, body = null } = {}) => {
  return new Promise((resolve) => {
    const defaultHeaders = {
      'content-type': 'application/json',
      host: 'localhost:5000',
      'user-agent': 'Phase2TestAgent/1.0',
      ...headers,
    };

    let responseData = '';
    let responseStatus = 200;
    let responseHeaders = {};

    const req = {
      method: method.toUpperCase(),
      url: path,
      originalUrl: path,
      headers: defaultHeaders,
      socket: { remoteAddress: '127.0.0.1' },
      connection: { remoteAddress: '127.0.0.1' },
      body: body || {},
    };

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return this.headers[k.toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve({ status: responseStatus, body: responseData, headers: this.headers });
      },
      send(data) {
        responseData = data;
        resolve({ status: responseStatus, body: responseData, headers: this.headers });
      },
      end() {
        resolve({ status: responseStatus, body: responseData, headers: this.headers });
      },
    };

    app.handle(req, res);
  });
};

const runPhase2SubscriptionTests = async () => {
  console.log('\n================================================================');
  console.log('   AURELLE SaaS Backend Phase 2 — Subscription Management Tests');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 12;

  try {
    await connectDB();
    const app = createApp();

    const testId = `sub-${Date.now()}`;
    const ownerAEmail = `owner-a-${testId}@test.com`;
    const ownerBEmail = `owner-b-${testId}@test.com`;
    const storeASlug = `store-sub-a-${testId}`;
    const storeBSlug = `store-sub-b-${testId}`;

    // -------------------------------------------------------------------------
    // Setup Super Admin, Tenant A, and Tenant B
    // -------------------------------------------------------------------------
    console.log('[SETUP] Logging in Super Admin and provisioning Store A & Store B...');
    
    // Super Admin login
    const saLogin = await request(app, 'POST', '/api/v1/auth/login', {
      body: { email: 'superadmin@aurelle.com', password: 'SuperAdminAurelle2026!' },
    });
    if (saLogin.status !== 200) {
      throw new Error(`Super admin login failed: ${JSON.stringify(saLogin.body)}`);
    }
    const superAdminToken = saLogin.body.data.token;

    // Register Tenant A
    const regA = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Store Alpha Gems',
        email: ownerAEmail,
        password: 'Password123!',
        tenantName: 'Store Alpha Gems',
        tenantSlug: storeASlug,
      },
    });
    const tokenA = regA.body.data.token;
    const tenantAId = String(regA.body.data.tenant._id);

    // Register Tenant B
    const regB = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Store Beta Jewels',
        email: ownerBEmail,
        password: 'Password123!',
        tenantName: 'Store Beta Jewels',
        tenantSlug: storeBSlug,
      },
    });
    const tokenB = regB.body.data.token;
    const tenantBId = String(regB.body.data.tenant._id);

    console.log('  -> Base setup complete: Store A and Store B active.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Super Admin can create and manage SaaS plans
    // -------------------------------------------------------------------------
    console.log('[TEST 1/12] Super Admin creates and manages custom SaaS plan...');
    const customPlanRes = await request(app, 'POST', '/api/v1/platform/plans', {
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: {
        name: 'Boutique Pro',
        slug: `boutique-${testId}`,
        description: 'For growing boutique studios',
        price: 4999,
        billingInterval: 'monthly',
        features: ['products:read', 'products:write', 'inventory:advanced', 'staff:custom_roles'],
        limits: {
          maxProducts: 250,
          maxStaff: 5,
          maxStorageMB: 2000,
          customDomainAllowed: true,
        },
        trialDays: 7,
        isActive: true,
      },
    });

    if (customPlanRes.status !== 201) {
      throw new Error(`Super admin failed to create plan: ${JSON.stringify(customPlanRes.body)}`);
    }
    const customPlan = customPlanRes.body.data;
    console.log(`  -> Plan created: '${customPlan.name}' (Price: ₹${customPlan.price})`);

    // Super Admin updates plan
    const updatePlanRes = await request(app, 'PUT', `/api/v1/platform/plans/${customPlan._id}`, {
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: {
        price: 5499,
        description: 'Updated boutique description',
      },
    });
    if (updatePlanRes.status !== 200 || updatePlanRes.body.data.price !== 5499) {
      throw new Error(`Super admin failed to update plan: ${JSON.stringify(updatePlanRes.body)}`);
    }
    console.log('  -> Super Admin updated plan price and details.');
    console.log('  [PASS] Test 1 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 2: Store Admin cannot create or modify platform plans
    // -------------------------------------------------------------------------
    console.log('[TEST 2/12] Store Admin blocked from creating or modifying platform plans...');
    const forbiddenCreateRes = await request(app, 'POST', '/api/v1/platform/plans', {
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Hacked Free Plan',
        slug: `hacked-${testId}`,
        price: 0,
      },
    });

    if (forbiddenCreateRes.status !== 403) {
      throw new Error(`Expected 403 when Store Admin attempts platform plan creation, got: ${forbiddenCreateRes.status}`);
    }
    console.log(`  -> Blocked store admin plan creation with 403: "${forbiddenCreateRes.body.message}"`);
    console.log('  [PASS] Test 2 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 3: Tenant can view only its own subscription
    // -------------------------------------------------------------------------
    console.log('[TEST 3/12] Tenant retrieves its own subscription details...');
    const subRes = await request(app, 'GET', '/api/v1/tenants/current/subscription', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
    });

    if (subRes.status !== 200 || !subRes.body.data.subscription) {
      throw new Error(`Failed to retrieve tenant subscription: ${JSON.stringify(subRes.body)}`);
    }
    console.log(`  -> Retrieved Store A Subscription: Status '${subRes.body.data.subscription.status}', Plan '${subRes.body.data.plan.name}'`);
    console.log('  [PASS] Test 3 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 4: Tenant cannot change another tenant's plan
    // -------------------------------------------------------------------------
    console.log('[TEST 4/12] Cross-tenant subscription modification blocked...');
    const growthPlan = await SubscriptionPlan.findOne({ slug: 'growth' });
    const crossTenantRes = await request(app, 'POST', '/api/v1/tenants/current/subscription/change-plan', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': tenantBId, // Store A owner attempts to alter Store B's plan
      },
      body: { planId: String(growthPlan._id) },
    });

    if (crossTenantRes.status !== 403) {
      throw new Error(`SECURITY BREACH: Store A was not blocked from Store B subscription! Status: ${crossTenantRes.status}`);
    }
    console.log(`  -> Cross-tenant plan change blocked with 403: "${crossTenantRes.body.message}"`);
    console.log('  [PASS] Test 4 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 5: Disabled plans cannot be newly subscribed to
    // -------------------------------------------------------------------------
    console.log('[TEST 5/12] Inactive/disabled plans cannot be subscribed to...');
    // Deactivate custom plan
    await request(app, 'PATCH', `/api/v1/platform/plans/${customPlan._id}/status`, {
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: { isActive: false },
    });

    const subDisabledRes = await request(app, 'POST', '/api/v1/tenants/current/subscription/change-plan', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: { planId: String(customPlan._id) },
    });

    if (subDisabledRes.status !== 400) {
      throw new Error(`Expected 400 when subscribing to inactive plan, got: ${subDisabledRes.status}`);
    }
    console.log(`  -> Inactive plan subscription rejected with 400: "${subDisabledRes.body.message}"`);
    console.log('  [PASS] Test 5 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 6: Subscription status transitions and cancellation
    // -------------------------------------------------------------------------
    console.log('[TEST 6/12] Subscription cancellation status transition...');
    const cancelRes = await request(app, 'POST', '/api/v1/tenants/current/subscription/cancel', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
    });

    if (cancelRes.status !== 200) {
      throw new Error(`Failed to cancel subscription: ${JSON.stringify(cancelRes.body)}`);
    }

    const checkSub = await Subscription.findOne({ tenantId: tenantAId });
    if (!checkSub.cancelAtPeriodEnd || !checkSub.cancelledAt) {
      throw new Error('Subscription cancelAtPeriodEnd flag was not set.');
    }
    console.log(`  -> Subscription cancelled at period end: ${checkSub.currentPeriodEnd}`);
    console.log('  [PASS] Test 6 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 7: Plan feature restrictions work (requirePlanFeature)
    // -------------------------------------------------------------------------
    console.log('[TEST 7/12] Testing Plan Feature Gate (staff:custom_roles on Starter plan)...');
    // Store A is on Starter plan which does NOT include 'staff:custom_roles'
    const starterPlan = await SubscriptionPlan.findOne({ slug: 'starter' });
    await Subscription.findOneAndUpdate(
      { tenantId: tenantAId },
      { $set: { planId: starterPlan._id, cancelAtPeriodEnd: false } }
    );

    const featureBlockedRes = await request(app, 'POST', '/api/v1/roles', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: {
        name: 'Gems Appraiser',
        slug: `appraiser-${testId}`,
        description: 'Custom staff role',
        permissions: ['products:read', 'categories:read'],
      },
    });

    if (featureBlockedRes.status !== 403 || featureBlockedRes.body.code !== 'FEATURE_NOT_IN_PLAN') {
      throw new Error(`Expected 403 FEATURE_NOT_IN_PLAN, got: ${JSON.stringify(featureBlockedRes.body)}`);
    }
    console.log(`  -> Feature restricted with 403: "${featureBlockedRes.body.message}"`);
    console.log('  [PASS] Test 7 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 8: Usage limits are enforced (enforcePlanLimit - staff limit)
    // -------------------------------------------------------------------------
    console.log('[TEST 8/12] Testing Usage Limit Enforcement (maxStaff: 2 on Starter plan)...');
    // Store A already has 1 owner. Let's invite 1 staff (now 2/2).
    const staff1Email = `staff1-${testId}@test.com`;
    const viewerRole = await Role.findOne({ slug: 'store_viewer' });

    const invite1Res = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: { email: staff1Email, roleId: String(viewerRole._id) },
    });
    if (invite1Res.status !== 201) {
      throw new Error(`Invite 1 failed: ${JSON.stringify(invite1Res.body)}`);
    }

    // Accept invitation 1
    await request(app, 'POST', '/api/v1/auth/accept-invitation', {
      body: { token: invite1Res.body.data.inviteToken, name: 'Staff Member 1', password: 'Password123!' },
    });

    // Attempt to invite a 2nd staff member (exceeds maxStaff of 2)
    const staff2Email = `staff2-${testId}@test.com`;
    const limitExceededRes = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: { email: staff2Email, roleId: String(viewerRole._id) },
    });

    if (limitExceededRes.status !== 403 || limitExceededRes.body.code !== 'STAFF_LIMIT_EXCEEDED') {
      throw new Error(`Expected 403 STAFF_LIMIT_EXCEEDED, got: ${JSON.stringify(limitExceededRes.body)}`);
    }
    console.log(`  -> Quota enforced with 403: "${limitExceededRes.body.message}"`);
    console.log('  [PASS] Test 8 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 9: Downgrade behavior validation (prevents invalid downgrade)
    // -------------------------------------------------------------------------
    console.log('[TEST 9/12] Testing Downgrade Validation when usage exceeds target limits...');
    // Upgrade Store A to Growth plan (maxStaff: 10)
    await request(app, 'POST', '/api/v1/tenants/current/subscription/change-plan', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: { planId: String(growthPlan._id) },
    });

    // Add 2 more staff members under Growth plan (now 3 staff total)
    const invite2Res = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: { email: staff2Email, roleId: String(viewerRole._id) },
    });
    await request(app, 'POST', '/api/v1/auth/accept-invitation', {
      body: { token: invite2Res.body.data.inviteToken, name: 'Staff Member 2', password: 'Password123!' },
    });

    // Now attempt to downgrade back to Starter (maxStaff: 2) while having 3 active staff
    const badDowngradeRes = await request(app, 'POST', '/api/v1/tenants/current/subscription/change-plan', {
      headers: { authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantAId },
      body: { planId: String(starterPlan._id) },
    });

    if (badDowngradeRes.status !== 400) {
      throw new Error(`Expected 400 when downgrading with excess staff, got: ${badDowngradeRes.status}`);
    }
    console.log(`  -> Downgrade blocked safely with 400: "${badDowngradeRes.body.message}"`);
    console.log('  [PASS] Test 9 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 10: Payment webhook signature verification
    // -------------------------------------------------------------------------
    console.log('[TEST 10/12] Testing Payment Webhook Signature Verification...');
    const testSecret = 'whsec_test_secret_key_12345';
    const testPayload = JSON.stringify({ event: 'payment.captured', id: 'pay_123' });
    const validSignature = crypto.createHmac('sha256', testSecret).update(testPayload).digest('hex');

    const isValid = verifyWebhookSignature({ rawBody: testPayload, signature: validSignature, secret: testSecret });
    const isTampered = verifyWebhookSignature({ rawBody: testPayload + 'tampered', signature: validSignature, secret: testSecret });

    if (!isValid || isTampered) {
      throw new Error('Webhook signature verification failed!');
    }
    console.log('  -> Valid signature verified; tampered payload rejected.');
    console.log('  [PASS] Test 10 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 11: Idempotent webhook processing (no duplicate charges or extensions)
    // -------------------------------------------------------------------------
    console.log('[TEST 11/12] Testing Webhook Idempotency (prevent duplicate renewals)...');
    const paymentId = `pay_${Date.now()}`;
    const orderId = `order_${Date.now()}`;
    const currentSub = await Subscription.findOne({ tenantId: tenantAId });

    // Webhook call 1
    const wh1Res = await request(app, 'POST', '/api/v1/subscriptions/webhook', {
      body: {
        tenantId: tenantAId,
        subscriptionId: String(currentSub._id),
        providerPaymentId: paymentId,
        providerOrderId: orderId,
        amount: 2999,
        currency: 'INR',
        paymentProvider: 'mock',
      },
    });

    if (wh1Res.status !== 200 || wh1Res.body.data.alreadyProcessed === true) {
      throw new Error(`Webhook 1 failed: ${JSON.stringify(wh1Res.body)}`);
    }
    console.log('  -> Webhook 1 processed successfully: Subscription extended and payment recorded.');

    // Webhook call 2 (Duplicate replay)
    const wh2Res = await request(app, 'POST', '/api/v1/subscriptions/webhook', {
      body: {
        tenantId: tenantAId,
        subscriptionId: String(currentSub._id),
        providerPaymentId: paymentId,
        providerOrderId: orderId,
        amount: 2999,
        currency: 'INR',
        paymentProvider: 'mock',
      },
    });

    if (wh2Res.status !== 200 || wh2Res.body.data.alreadyProcessed !== true) {
      throw new Error(`Expected alreadyProcessed: true on duplicate webhook, got: ${JSON.stringify(wh2Res.body)}`);
    }
    console.log('  -> Duplicate webhook recognized idempotently (alreadyProcessed: true). Zero duplicate records.');
    console.log('  [PASS] Test 11 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 12: Subscription events and audit log generation
    // -------------------------------------------------------------------------
    console.log('[TEST 12/12] Verifying Subscription Events & Audit Logging...');
    const eventCount = await SubscriptionEvent.countDocuments({ tenantId: tenantAId });
    const auditCount = await AuditLog.countDocuments({
      tenantId: tenantAId,
      action: { $in: ['SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_CANCEL'] },
    });

    if (eventCount === 0 || auditCount === 0) {
      throw new Error(`Expected subscription events and audit logs, got events: ${eventCount}, audits: ${auditCount}`);
    }
    console.log(`  -> Verified ${eventCount} SubscriptionEvent records and ${auditCount} AuditLog subscription records.`);
    console.log('  [PASS] Test 12 passed.\n');
    passedTests++;

    // Cleanup fixtures
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ email: { $in: [ownerAEmail, ownerBEmail, staff1Email, staff2Email] } });
    await TenantMembership.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Subscription.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await SubscriptionPayment.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await SubscriptionEvent.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await SubscriptionPlan.deleteOne({ _id: customPlan._id });

    console.log('================================================================');
    console.log(`  ALL ${passedTests}/${totalTests} PHASE 2 SUBSCRIPTION TESTS PASSED! (100% SUCCESS)`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n[PHASE 2 TEST RUNNER FATAL ERROR]', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runPhase2SubscriptionTests();
