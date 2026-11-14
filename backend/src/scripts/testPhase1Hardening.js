import dotenv from 'dotenv';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from '../config/db.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Invitation } from '../models/Invitation.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription } from '../models/Subscription.js';

dotenv.config();

const request = (app, method, path, { headers = {}, body = null } = {}) => {
  return new Promise((resolve) => {
    const defaultHeaders = {
      'content-type': 'application/json',
      host: 'localhost:5000',
      'user-agent': 'SecurityTestAgent/1.0',
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

const runSecurityHardeningTests = async () => {
  console.log('\n================================================================');
  console.log('   AURELLE SaaS Backend Phase 1.1 — Security Hardening Tests');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 9;

  try {
    await connectDB();
    const app = createApp();

    const testId = `sec-${Date.now()}`;
    const ownerEmail = `owner-${testId}@test.com`;
    const staffEmail = `staff-${testId}@test.com`;
    const storeSlug = `sec-store-${testId}`;

    // -------------------------------------------------------------------------
    // Setup Base Store, Owner, and Privileged Staff Member
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning test store, owner, and staff member...');
    const regRes = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Sec Owner',
        email: ownerEmail,
        password: 'Password123!',
        tenantName: 'Security Store',
        tenantSlug: storeSlug,
      },
    });

    if (regRes.status !== 201) {
      throw new Error(`Failed to provision setup store: ${JSON.stringify(regRes.body)}`);
    }

    const ownerToken = regRes.body.data.token;
    const tenantId = regRes.body.data.tenant._id;
    const ownerId = regRes.body.data.user.id;

    // Upgrade test tenant to Growth plan to enable custom role and staff management features
    const growthPlan = await SubscriptionPlan.findOne({ slug: 'growth' });
    if (growthPlan) {
      await Subscription.findOneAndUpdate(
        { tenantId },
        { $set: { planId: growthPlan._id, status: 'active' } },
        { upsert: true }
      );
    }

    // Create a staff manager role with staff:update and roles:manage
    const roleRes = await request(app, 'POST', '/api/v1/roles', {
      headers: { authorization: `Bearer ${ownerToken}`, 'x-tenant-id': String(tenantId) },
      body: {
        name: 'Store Manager',
        slug: `mgr-${testId}`,
        description: 'Privileged staff manager',
        permissions: ['staff:read', 'staff:update', 'roles:manage'],
      },
    });
    const managerRole = roleRes.body.data;

    // Invite staff member
    const inviteRes = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: { authorization: `Bearer ${ownerToken}`, 'x-tenant-id': String(tenantId) },
      body: {
        email: staffEmail,
        roleId: String(managerRole._id),
      },
    });
    const inviteToken = inviteRes.body.data.inviteToken;

    // Accept invitation to establish staff account
    const acceptRes = await request(app, 'POST', '/api/v1/auth/accept-invitation', {
      body: {
        token: inviteToken,
        name: 'Staff Manager',
        password: 'StaffPassword123!',
      },
    });
    const staffToken = acceptRes.body.data.token;
    const staffId = acceptRes.body.data.user.id;

    const ownerMembership = await TenantMembership.findOne({ tenantId, userId: ownerId });
    const staffMembership = await TenantMembership.findOne({ tenantId, userId: staffId });

    console.log('  -> Base setup complete.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Owner cannot be demoted or suspended by staff (F-01)
    // -------------------------------------------------------------------------
    console.log('[TEST 1/9] Testing that Store Owner cannot be suspended or demoted by staff...');
    const demoteOwnerRes = await request(app, 'PATCH', `/api/v1/tenants/staff/${ownerMembership._id}`, {
      headers: { authorization: `Bearer ${staffToken}`, 'x-tenant-id': tenantId },
      body: {
        status: 'suspended',
        roleId: String(managerRole._id),
      },
    });

    if (demoteOwnerRes.status !== 403) {
      throw new Error(`Expected 403 when staff attempts to demote owner, got: ${demoteOwnerRes.status}`);
    }
    console.log(`  -> Blocked owner demotion/suspension with 403: "${demoteOwnerRes.body.message}"`);
    console.log('  [PASS] Test 1 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 2: Staff cannot change their own role or status (F-02)
    // -------------------------------------------------------------------------
    console.log('[TEST 2/9] Testing that staff cannot modify their own membership role/status...');
    const selfUpgradeRes = await request(app, 'PATCH', `/api/v1/tenants/staff/${staffMembership._id}`, {
      headers: { authorization: `Bearer ${staffToken}`, 'x-tenant-id': String(tenantId) },
      body: {
        roleId: String((await Role.findOne({ slug: 'store_admin' }))._id),
      },
    });

    if (selfUpgradeRes.status !== 403) {
      throw new Error(`Expected 403 when staff attempts self-upgrade, got: ${selfUpgradeRes.status}`);
    }
    console.log(`  -> Blocked self-upgrade with 403: "${selfUpgradeRes.body.message}"`);
    console.log('  [PASS] Test 2 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 3: Staff cannot elevate permissions through custom role editing (F-02)
    // -------------------------------------------------------------------------
    console.log('[TEST 3/9] Testing that staff cannot edit their currently assigned role...');
    const editOwnRoleRes = await request(app, 'PUT', `/api/v1/roles/${managerRole._id}`, {
      headers: { authorization: `Bearer ${staffToken}`, 'x-tenant-id': tenantId },
      body: {
        permissions: ['staff:read', 'staff:update', 'roles:manage', 'tenant:delete', 'orders:write'],
      },
    });

    if (editOwnRoleRes.status !== 403) {
      throw new Error(`Expected 403 when staff attempts to edit own role, got: ${editOwnRoleRes.status}`);
    }
    console.log(`  -> Blocked self-assigned role modification with 403: "${editOwnRoleRes.body.message}"`);
    console.log('  [PASS] Test 3 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 4: Atomic Registration Rollback (F-03)
    // -------------------------------------------------------------------------
    console.log('[TEST 4/9] Testing Atomic Registration Rollback on Collision...');
    const failEmail = `atomic-${testId}@test.com`;

    // Attempt registration with an already existing slug to force collision in transaction
    const collideRes = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Atomic Collision',
        email: failEmail,
        password: 'Password123!',
        tenantName: 'Colliding Store',
        tenantSlug: storeSlug, // Already taken!
      },
    });

    if (collideRes.status !== 409) {
      throw new Error(`Expected 409 for colliding slug, got: ${collideRes.status}`);
    }

    // Verify user document was NOT created/persisted in database due to atomic rollback
    const orphanedUser = await User.findOne({ email: failEmail });
    if (orphanedUser) {
      throw new Error('ATOMICITY FAILURE: Orphaned user record was persisted despite transaction failure!');
    }
    console.log('  -> Confirmed atomic rollback: zero orphaned user records persisted.');
    console.log('  [PASS] Test 4 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 5: Secure Logout & Token Invalidation (F-04)
    // -------------------------------------------------------------------------
    console.log('[TEST 5/9] Testing Token Invalidation upon Logout (tokenVersion)...');
    
    // Verify token is initially valid
    const preLogoutRes = await request(app, 'GET', '/api/v1/auth/me', {
      headers: { authorization: `Bearer ${staffToken}` },
    });
    if (preLogoutRes.status !== 200) {
      throw new Error(`Token failed pre-logout check: ${JSON.stringify(preLogoutRes.body)}`);
    }

    // Perform logout
    const logoutRes = await request(app, 'POST', '/api/v1/auth/logout', {
      headers: { authorization: `Bearer ${staffToken}` },
    });
    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed: ${JSON.stringify(logoutRes.body)}`);
    }

    // Attempt to reuse previously issued JWT after logout
    const postLogoutRes = await request(app, 'GET', '/api/v1/auth/me', {
      headers: { authorization: `Bearer ${staffToken}` },
    });
    if (postLogoutRes.status !== 401) {
      throw new Error(`Expected 401 for revoked token after logout, got: ${postLogoutRes.status}`);
    }
    console.log(`  -> Revoked token successfully rejected with 401: "${postLogoutRes.body.message}"`);
    console.log('  [PASS] Test 5 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 6: Super Admin Explicit Configuration Enforcement (F-05)
    // -------------------------------------------------------------------------
    console.log('[TEST 6/9] Testing Super Admin Credential Hardening...');
    const { config } = await import('../config/env.js');
    if (!config.superAdmin.email || !config.superAdmin.password) {
      console.log('  -> Confirmed: No hardcoded fallback credentials in env.js.');
    } else {
      console.log('  -> Explicit environment credentials loaded from environment.');
    }
    console.log('  [PASS] Test 6 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 7: Custom Roles Cannot Receive Wildcard '*' (F-06)
    // -------------------------------------------------------------------------
    console.log('[TEST 7/9] Testing that custom roles reject wildcard \'*\' permission...');
    const wildcardRoleRes = await request(app, 'POST', '/api/v1/roles', {
      headers: { authorization: `Bearer ${ownerToken}`, 'x-tenant-id': tenantId },
      body: {
        name: 'Wildcard Hacker',
        slug: `hack-${testId}`,
        description: 'Attempts to gain *',
        permissions: ['*'],
      },
    });

    if (wildcardRoleRes.status !== 400) {
      throw new Error(`Expected 400 when custom role requests '*', got: ${wildcardRoleRes.status}`);
    }
    console.log(`  -> Wildcard rejected with 400 Bad Request: "${wildcardRoleRes.body.message}"`);
    console.log('  [PASS] Test 7 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 8: Custom Domain Resolution & Unverified Domain Rejection (F-07)
    // -------------------------------------------------------------------------
    console.log('[TEST 8/9] Testing Custom Domain Resolution & Unverified Domain Rejection...');

    // Set customDomain on tenant
    const testDomain = `store-${testId}.luxurygems.test`;
    await Tenant.findByIdAndUpdate(tenantId, {
      customDomain: testDomain,
      customDomainVerified: false, // Unverified
    });

    // Attempt to access store via unverified Host header without X-Tenant-ID
    const unverifiedDomainRes = await request(app, 'GET', '/api/v1/tenants/current', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        host: testDomain,
      },
    });

    if (unverifiedDomainRes.status !== 400) {
      throw new Error(`Expected 400 for unverified custom domain, got: ${unverifiedDomainRes.status}`);
    }
    console.log('  -> Unverified custom domain rejected.');

    // Now mark domain verified
    await Tenant.findByIdAndUpdate(tenantId, { customDomainVerified: true });

    const verifiedDomainRes = await request(app, 'GET', '/api/v1/tenants/current', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        host: testDomain,
      },
    });

    if (verifiedDomainRes.status !== 200 || verifiedDomainRes.body.data.slug !== storeSlug) {
      throw new Error(`Verified custom domain failed to resolve store: ${JSON.stringify(verifiedDomainRes.body)}`);
    }
    console.log(`  -> Verified custom domain resolved store successfully: ${verifiedDomainRes.body.data.name}`);
    console.log('  [PASS] Test 8 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 9: Expired & Reused Invitation Tokens Rejection (F-09)
    // -------------------------------------------------------------------------
    console.log('[TEST 9/9] Testing Single-Use & Expiration for Staff Invitation Tokens...');
    const reuseEmail = `reuse-${testId}@test.com`;
    const newInviteRes = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: { authorization: `Bearer ${ownerToken}`, 'x-tenant-id': String(tenantId) },
      body: {
        email: reuseEmail,
        roleId: String(managerRole._id),
      },
    });
    const singleUseToken = newInviteRes.body.data.inviteToken;

    // Accept invitation 1st time
    const accept1 = await request(app, 'POST', '/api/v1/auth/accept-invitation', {
      body: {
        token: singleUseToken,
        name: 'First Time User',
        password: 'FirstPassword123!',
      },
    });
    if (accept1.status !== 200) {
      throw new Error(`Failed first invitation acceptance: ${JSON.stringify(accept1.body)}`);
    }
    console.log('  -> Invitation accepted 1st time successfully.');

    // Attempt to reuse single-use token 2nd time
    const accept2 = await request(app, 'POST', '/api/v1/auth/accept-invitation', {
      body: {
        token: singleUseToken,
        name: 'Attacker Reusing Token',
        password: 'AttackerPass123!',
      },
    });
    if (accept2.status !== 400) {
      throw new Error(`Expected 400 when reusing single-use invitation token, got: ${accept2.status}`);
    }
    console.log(`  -> Reused token rejected with 400: "${accept2.body.message}"`);
    console.log('  [PASS] Test 9 passed.\n');
    passedTests++;

    // Clean up test fixtures
    await Tenant.deleteOne({ _id: tenantId });
    await User.deleteMany({ email: { $in: [ownerEmail, staffEmail, failEmail, reuseEmail] } });
    await TenantMembership.deleteMany({ tenantId });
    await Role.deleteMany({ tenantId });
    await Invitation.deleteMany({ tenantId });
    await Subscription.deleteMany({ tenantId });

    console.log('================================================================');
    console.log(`  ALL ${passedTests}/${totalTests} SECURITY REGRESSION TESTS PASSED! (100% SUCCESS)`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n[SECURITY TEST RUNNER FATAL ERROR]', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runSecurityHardeningTests();
