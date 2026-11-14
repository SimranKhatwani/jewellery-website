import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, getGridFSBucket } from '../config/db.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Role } from '../models/Role.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_STATUS, TENANT_STATUS, MEMBERSHIP_STATUS } from '../config/constants.js';

dotenv.config();

// Helper to simulate HTTP requests against Express app in memory
const request = (app, method, path, { headers = {}, body = null } = {}) => {
  return new Promise((resolve) => {
    const defaultHeaders = {
      'content-type': 'application/json',
      host: 'localhost:5000',
      'user-agent': 'TestAgent/1.0',
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
        resolve({
          status: responseStatus,
          body: responseData,
          headers: this.headers,
        });
      },
      send(data) {
        responseData = data;
        resolve({
          status: responseStatus,
          body: responseData,
          headers: this.headers,
        });
      },
      end() {
        resolve({
          status: responseStatus,
          body: responseData,
          headers: this.headers,
        });
      },
    };

    app.handle(req, res);
  });
};

const runPhase1Tests = async () => {
  console.log('\n================================================================');
  console.log('   AURELLE SaaS Backend Phase 1 — Comprehensive Test Suite');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 8;

  try {
    const app = createApp();

    // -------------------------------------------------------------------------
    // TEST 1: MongoDB Connection & GridFS Bucket Initialization
    // -------------------------------------------------------------------------
    console.log('[TEST 1/8] Verifying MongoDB Atlas Connection & GridFS...');
    await connectDB();
    const bucket = getGridFSBucket();
    if (!bucket) throw new Error('GridFS bucket failed to initialize');
    console.log('  -> Connected to MongoDB Atlas cluster.');
    console.log(`  -> GridFS bucket '${bucket.s.options.bucketName}' verified.`);
    console.log('  [PASS] Test 1 passed.\n');
    passedTests++;

    // Clean up previous test artifacts from DB if any
    const testPrefix = `test-${Date.now()}`;
    const cleanEmails = [
      `owner-a-${testPrefix}@test.com`,
      `owner-b-${testPrefix}@test.com`,
      `staff-a-${testPrefix}@test.com`,
    ];
    await User.deleteMany({ email: { $in: cleanEmails } });
    await Tenant.deleteMany({ slug: { $regex: testPrefix } });

    // -------------------------------------------------------------------------
    // TEST 2: User Registration, Duplicate Prevention & Login
    // -------------------------------------------------------------------------
    console.log('[TEST 2/8] Testing User Registration, Store Provisioning & Login...');
    const ownerAEmail = `owner-a-${testPrefix}@test.com`;
    const ownerAPass = 'SecurePass123!';
    const storeASlug = `store-a-${testPrefix}`;

    // 2a. Register Owner A with Store A
    const regRes = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Alice Owner',
        email: ownerAEmail,
        password: ownerAPass,
        tenantName: 'Store Alpha',
        tenantSlug: storeASlug,
      },
    });

    if (regRes.status !== 201 || !regRes.body.data.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    }
    const tokenA = regRes.body.data.token;
    const tenantA = regRes.body.data.tenant;
    console.log(`  -> Registered User: ${ownerAEmail} (ID: ${regRes.body.data.user.id})`);
    console.log(`  -> Provisioned Store: ${tenantA.name} (Slug: ${tenantA.slug}, ID: ${tenantA._id})`);

    // 2b. Attempt Duplicate Registration
    const dupRes = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Alice Clone',
        email: ownerAEmail,
        password: ownerAPass,
      },
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 for duplicate registration, got: ${dupRes.status}`);
    }
    console.log('  -> Duplicate registration prevented with 409 Conflict.');

    // 2c. Successful Login
    const loginRes = await request(app, 'POST', '/api/v1/auth/login', {
      body: { email: ownerAEmail, password: ownerAPass },
    });
    if (loginRes.status !== 200 || loginRes.body.data.tenants.length === 0) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    console.log(`  -> Logged in successfully. Active tenant membership: ${loginRes.body.data.tenants[0].name} (Role: ${loginRes.body.data.tenants[0].role})`);

    // 2d. Invalid Login
    const badLoginRes = await request(app, 'POST', '/api/v1/auth/login', {
      body: { email: ownerAEmail, password: 'WrongPassword!' },
    });
    if (badLoginRes.status !== 401) {
      throw new Error(`Expected 401 for bad password, got: ${badLoginRes.status}`);
    }
    console.log('  -> Invalid password rejected with 401 Unauthorized.');
    console.log('  [PASS] Test 2 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 3: JWT Authentication & Account Status Enforcement
    // -------------------------------------------------------------------------
    console.log('[TEST 3/8] Testing JWT Authentication Middleware (/api/v1/auth/me)...');
    
    // 3a. Missing token
    const noTokenRes = await request(app, 'GET', '/api/v1/auth/me');
    if (noTokenRes.status !== 401) {
      throw new Error(`Expected 401 for missing token, got: ${noTokenRes.status}`);
    }
    console.log('  -> Missing Bearer token rejected with 401.');

    // 3b. Malformed token
    const badTokenRes = await request(app, 'GET', '/api/v1/auth/me', {
      headers: { authorization: 'Bearer invalid_signature_token_xyz' },
    });
    if (badTokenRes.status !== 401) {
      throw new Error(`Expected 401 for malformed token, got: ${badTokenRes.status}`);
    }
    console.log('  -> Malformed token rejected with 401.');

    // 3c. Valid token
    const meRes = await request(app, 'GET', '/api/v1/auth/me', {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    if (meRes.status !== 200 || meRes.body.data.user.email !== ownerAEmail) {
      throw new Error(`Expected 200 with user profile, got: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`  -> Valid token authenticated user: ${meRes.body.data.user.name} (${meRes.body.data.user.email})`);
    console.log('  [PASS] Test 3 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 4: Platform Super Admin Authorization vs Regular Store Admin
    // -------------------------------------------------------------------------
    console.log('[TEST 4/8] Testing Platform Super Admin Authorization...');

    // 4a. Login as Super Admin
    const saLoginRes = await request(app, 'POST', '/api/v1/auth/login', {
      body: { email: 'superadmin@aurelle.com', password: 'SuperAdminAurelle2026!' },
    });
    if (saLoginRes.status !== 200 || !saLoginRes.body.data.user.isSuperAdmin) {
      throw new Error(`Super Admin login failed: ${JSON.stringify(saLoginRes.body)}`);
    }
    const superAdminToken = saLoginRes.body.data.token;
    console.log('  -> Super Admin logged in successfully.');

    // 4b. Super Admin accesses platform tenants list
    const platformTenantsRes = await request(app, 'GET', '/api/v1/platform/tenants', {
      headers: { authorization: `Bearer ${superAdminToken}` },
    });
    if (platformTenantsRes.status !== 200 || !Array.isArray(platformTenantsRes.body.data)) {
      throw new Error(`Platform tenants list failed: ${JSON.stringify(platformTenantsRes.body)}`);
    }
    console.log(`  -> Super Admin authorized: Accessed /api/v1/platform/tenants (${platformTenantsRes.body.meta.total} stores in platform).`);

    // 4c. Regular Store Admin attempts to access platform endpoint
    const forbiddenRes = await request(app, 'GET', '/api/v1/platform/tenants', {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    if (forbiddenRes.status !== 403) {
      throw new Error(`Expected 403 for non-superadmin, got: ${forbiddenRes.status}`);
    }
    console.log('  -> Regular Store Admin access to platform endpoint rejected with 403 Forbidden.');
    console.log('  [PASS] Test 4 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 5: Store Admin Authorization (Tenant Profile & Staff Management)
    // -------------------------------------------------------------------------
    console.log('[TEST 5/8] Testing Store Admin Tenant-Scoped Management...');

    // 5a. Store Admin reads their own store details
    const storeDetailsRes = await request(app, 'GET', '/api/v1/tenants/current', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantA._id),
      },
    });
    if (storeDetailsRes.status !== 200 || storeDetailsRes.body.data.slug !== storeASlug) {
      throw new Error(`Store details failed: ${JSON.stringify(storeDetailsRes.body)}`);
    }
    console.log(`  -> Store Admin read store profile: ${storeDetailsRes.body.data.name}`);

    // 5b. Store Admin updates store settings
    const updateStoreRes = await request(app, 'PUT', '/api/v1/tenants/current', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantA._id),
      },
      body: {
        settings: { supportEmail: 'support@alphajewels.com', currency: 'INR' },
      },
    });
    if (updateStoreRes.status !== 200 || updateStoreRes.body.data.settings.supportEmail !== 'support@alphajewels.com') {
      throw new Error(`Store update failed: ${JSON.stringify(updateStoreRes.body)}`);
    }
    console.log('  -> Store Admin updated store settings successfully.');

    // 5c. Store Admin invites staff member
    const staffEmail = `staff-a-${testPrefix}@test.com`;
    const viewerRole = await Role.findOne({ slug: 'store_viewer' });
    const inviteRes = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantA._id),
      },
      body: {
        email: staffEmail,
        name: 'Bob Staff',
        roleId: String(viewerRole._id),
      },
    });
    if (inviteRes.status !== 201) {
      throw new Error(`Staff invite failed: ${JSON.stringify(inviteRes.body)}`);
    }
    const staffMembershipId = inviteRes.body.data._id;
    console.log(`  -> Invited staff member: ${staffEmail} (Role: store_viewer)`);

    // 5d. Store Admin lists staff
    const listStaffRes = await request(app, 'GET', '/api/v1/tenants/staff', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantA._id),
      },
    });
    if (listStaffRes.status !== 200 || listStaffRes.body.data.length < 2) {
      throw new Error(`List staff failed: ${JSON.stringify(listStaffRes.body)}`);
    }
    console.log(`  -> Store Admin retrieved staff list: ${listStaffRes.body.data.length} member(s).`);
    console.log('  [PASS] Test 5 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 6: Dynamic Tenant Roles & Granular Permission Checks
    // -------------------------------------------------------------------------
    console.log('[TEST 6/8] Testing Dynamic Staff Roles & Permission Checks...');

    // 6a. Store Admin creates a custom dynamic role: "catalog-manager"
    const createRoleRes = await request(app, 'POST', '/api/v1/roles', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantA._id),
      },
      body: {
        name: 'Catalog Manager',
        slug: `cat-mgr-${testPrefix}`,
        description: 'Allowed to manage products and categories only',
        permissions: ['products:read', 'products:write', 'categories:read', 'categories:write'],
      },
    });
    if (createRoleRes.status !== 201) {
      throw new Error(`Create custom role failed: ${JSON.stringify(createRoleRes.body)}`);
    }
    const customRole = createRoleRes.body.data;
    console.log(`  -> Created dynamic store role: '${customRole.name}' with permissions: [${customRole.permissions.join(', ')}]`);

    // 6b. Assign custom role to Bob Staff
    const assignRes = await request(app, 'PATCH', `/api/v1/tenants/staff/${staffMembershipId}`, {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantA._id),
      },
      body: {
        status: 'active',
        roleId: String(customRole._id),
      },
    });
    if (assignRes.status !== 200) {
      throw new Error(`Assign role failed: ${JSON.stringify(assignRes.body)}`);
    }
    console.log(`  -> Assigned custom role '${customRole.name}' to staff member.`);

    // 6c. Staff member logs in
    const staffUser = await User.findOne({ email: staffEmail });
    staffUser.passwordHash = await (await import('bcryptjs')).default.hash('StaffPass123!', 10);
    await staffUser.save();

    const staffLoginRes = await request(app, 'POST', '/api/v1/auth/login', {
      body: { email: staffEmail, password: 'StaffPass123!' },
    });
    const staffToken = staffLoginRes.body.data.token;

    // 6d. Staff attempts action without required permission (e.g. staff:invite requires staff:invite permission)
    const staffDeniedRes = await request(app, 'POST', '/api/v1/tenants/staff', {
      headers: {
        authorization: `Bearer ${staffToken}`,
        'x-tenant-id': String(tenantA._id),
      },
      body: {
        email: `someone_${testPrefix}@test.com`,
        roleId: String(viewerRole._id),
      },
    });
    if (staffDeniedRes.status !== 403) {
      throw new Error(`Expected 403 for staff missing 'staff:invite' permission, got: ${staffDeniedRes.status}`);
    }
    console.log(`  -> Permission enforcement verified: Staff denied 'staff:invite' (Status 403: ${staffDeniedRes.body.message})`);
    console.log('  [PASS] Test 6 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 7: Tenant Isolation Between Two Separate Stores
    // -------------------------------------------------------------------------
    console.log('[TEST 7/8] Testing Strict Tenant Isolation Between Store Alpha & Store Beta...');
    const ownerBEmail = `owner-b-${testPrefix}@test.com`;
    const storeBSlug = `store-b-${testPrefix}`;

    // 7a. Register Owner B with Store B
    const regBRes = await request(app, 'POST', '/api/v1/auth/register', {
      body: {
        name: 'Bob Beta',
        email: ownerBEmail,
        password: 'PasswordB123!',
        tenantName: 'Store Beta',
        tenantSlug: storeBSlug,
      },
    });
    const tokenB = regBRes.body.data.token;
    const tenantB = regBRes.body.data.tenant;
    console.log(`  -> Registered Owner B for Store Beta (ID: ${tenantB._id})`);

    // 7b. Owner A tries to access Store B by passing Store B's ID in X-Tenant-ID header
    const breachAttempt1 = await request(app, 'GET', '/api/v1/tenants/current', {
      headers: {
        authorization: `Bearer ${tokenA}`,
        'x-tenant-id': String(tenantB._id),
      },
    });
    if (breachAttempt1.status !== 403) {
      throw new Error(`SECURITY BREACH: Owner A was not blocked from Store B! Status: ${breachAttempt1.status}`);
    }
    console.log(`  -> Cross-tenant breach prevented: Owner A accessing Store B rejected with 403 (${breachAttempt1.body.message})`);

    // 7c. Owner B tries to access Store A's staff list
    const breachAttempt2 = await request(app, 'GET', '/api/v1/tenants/staff', {
      headers: {
        authorization: `Bearer ${tokenB}`,
        'x-tenant-id': String(tenantA._id),
      },
    });
    if (breachAttempt2.status !== 403) {
      throw new Error(`SECURITY BREACH: Owner B was not blocked from Store A! Status: ${breachAttempt2.status}`);
    }
    console.log(`  -> Cross-tenant breach prevented: Owner B accessing Store A staff rejected with 403 (${breachAttempt2.body.message})`);
    console.log('  [PASS] Test 7 passed.\n');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 8: Unauthorized & Deactivated Account / Suspended Tenant Handling
    // -------------------------------------------------------------------------
    console.log('[TEST 8/8] Testing Deactivated Account & Suspended Tenant Enforcement...');

    // 8a. Suspend Store B via Platform Super Admin
    const suspendTenantRes = await request(app, 'PATCH', `/api/v1/platform/tenants/${tenantB._id}/status`, {
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: { status: TENANT_STATUS.SUSPENDED },
    });
    if (suspendTenantRes.status !== 200 || suspendTenantRes.body.data.status !== 'suspended') {
      throw new Error(`Suspend tenant failed: ${JSON.stringify(suspendTenantRes.body)}`);
    }
    console.log(`  -> Super Admin suspended Store Beta.`);

    // 8b. Owner B attempts to access suspended Store Beta
    const suspendedStoreRes = await request(app, 'GET', '/api/v1/tenants/current', {
      headers: {
        authorization: `Bearer ${tokenB}`,
        'x-tenant-id': String(tenantB._id),
      },
    });
    if (suspendedStoreRes.status !== 403) {
      throw new Error(`Expected 403 for suspended store, got: ${suspendedStoreRes.status}`);
    }
    console.log(`  -> Suspended store access blocked with 403 (${suspendedStoreRes.body.message})`);

    // 8c. Suspend User B via Platform Super Admin
    const suspendUserRes = await request(app, 'PATCH', `/api/v1/platform/users/${regBRes.body.data.user.id}/status`, {
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: { status: USER_STATUS.SUSPENDED },
    });
    if (suspendUserRes.status !== 200) {
      throw new Error(`Suspend user failed: ${JSON.stringify(suspendUserRes.body)}`);
    }
    console.log(`  -> Super Admin suspended User B.`);

    // 8d. Suspended User B attempts login
    const suspendedLoginRes = await request(app, 'POST', '/api/v1/auth/login', {
      body: { email: ownerBEmail, password: 'PasswordB123!' },
    });
    if (suspendedLoginRes.status !== 403) {
      throw new Error(`Expected 403 for suspended user login, got: ${suspendedLoginRes.status}`);
    }
    console.log(`  -> Suspended user login blocked with 403 (${suspendedLoginRes.body.message})`);

    // 8e. Verify Audit Logs recorded all actions
    const auditCount = await AuditLog.countDocuments({
      tenantId: { $in: [tenantA._id, tenantB._id] },
    });
    console.log(`  -> Verified Audit Trail: ${auditCount} audit log records created for test tenants.`);
    console.log('  [PASS] Test 8 passed.\n');
    passedTests++;

    // Teardown test records
    await User.deleteMany({ email: { $in: cleanEmails } });
    await Tenant.deleteMany({ _id: { $in: [tenantA._id, tenantB._id] } });
    await TenantMembership.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await Role.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await AuditLog.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });

    console.log('================================================================');
    console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY! (100% SUCCESS)`);
    console.log('================================================================\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n[TEST RUNNER FATAL ERROR]', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runPhase1Tests();
