import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Role } from '../src/models/Role.js';
import { TenantMembership } from '../src/models/TenantMembership.js';
import { Admin } from '../src/models/Admin.js';
import {
  ensureSystemRoles,
  listRolesForTenant,
  createCustomTenantRole,
} from '../src/services/role.service.js';
import {
  createStaffMemberDirectly,
  listTenantStaffMembers,
  updateStaffMembership,
} from '../src/services/tenant.service.js';
import { config } from '../src/config/env.js';

async function runRbacVerification() {
  console.log('=== Starting Staff & RBAC Verification ===');
  await connectDB();

  try {
    // 1. Test ensureSystemRoles
    console.log('\n--- 1. Testing System Roles Initialization ---');
    await ensureSystemRoles();
    const systemRoles = await Role.find({ tenantId: null });
    console.log(`Found ${systemRoles.length} system roles:`, systemRoles.map((r) => r.slug));
    if (systemRoles.length < 4) {
      throw new Error('Expected at least 4 system roles (store_admin, store_manager, store_staff, store_viewer)');
    }
    console.log('PASSED: System roles initialized.');

    // 2. Resolve a test tenant (e.g. aurelle or giva)
    console.log('\n--- 2. Resolving Target Store Tenant ---');
    let tenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    if (!tenant) {
      throw new Error('No active store tenant found.');
    }
    console.log(`Using Store: "${tenant.name}" (${tenant.slug}) - ID: ${tenant._id}`);

    // Resolve an admin creator user
    let creator = await User.findOne({ isSuperAdmin: true });
    if (!creator) {
      creator = await User.findOne({ email: 'admin@aurelle.com' }) || await User.findOne();
    }
    console.log(`Creator user: "${creator?.name}" (${creator?.email})`);

    // 3. Test Custom Role Creation
    console.log('\n--- 3. Testing Custom Role Creation ---');
    const testRoleSlug = `fulfillment-${Date.now().toString(36)}`;
    const customRole = await createCustomTenantRole({
      tenantId: tenant._id,
      name: 'Order Processing Specialist',
      slug: testRoleSlug,
      description: 'Role restricted exclusively to orders viewing and status management.',
      permissions: ['orders:read', 'orders:write'],
      userId: creator._id,
    });
    console.log(`Created Custom Role: "${customRole.name}" [slug: ${customRole.slug}]`);
    console.log('Granted Permissions:', customRole.permissions);
    if (!customRole.permissions.includes('orders:read') || !customRole.permissions.includes('orders:write')) {
      throw new Error('Custom role permissions mismatch.');
    }
    console.log('PASSED: Custom role created successfully.');

    // 4. Test Direct Staff Member Account Creation (ID & Password)
    console.log('\n--- 4. Testing Direct Staff Creation (ID & Password) ---');
    const testEmail = `staff.${Date.now().toString(36)}@testatelier.com`;
    const testPassword = 'SecureStaffPass123!';
    const staffResult = await createStaffMemberDirectly({
      tenantId: tenant._id,
      creatorId: creator._id,
      name: 'Pooja Verma',
      email: testEmail,
      password: testPassword,
      phoneNumber: '9876543210',
      roleId: customRole._id,
    });

    console.log(`Provisioned Staff: "${staffResult.name}" (${staffResult.email})`);
    console.log('Assigned Role:', staffResult.role.name, staffResult.role.slug);
    console.log('Status:', staffResult.status);

    // Verify Admin model record exists for login
    const adminRecord = await Admin.findOne({ email: testEmail });
    if (!adminRecord) {
      throw new Error('Admin record was not created for staff member.');
    }
    const isPasswordValid = await adminRecord.comparePassword(testPassword);
    if (!isPasswordValid) {
      throw new Error('Staff password hash verification failed.');
    }
    console.log('PASSED: Direct staff account created and verified for login.');

    // 5. Test Listing Store Staff Members
    console.log('\n--- 5. Testing Staff Listing ---');
    const staffList = await listTenantStaffMembers(tenant._id);
    const memberCount = staffList.members?.length || 0;
    console.log(`Total active/provisioned members in store: ${memberCount}`);
    const foundStaff = staffList.members.find((m) => m.userId?.email === testEmail);
    if (!foundStaff) {
      throw new Error('Newly created staff member not found in list.');
    }
    console.log(`Found member in list: ${foundStaff.userId.name} [Role: ${foundStaff.roleId?.name}]`);
    console.log('PASSED: Staff list verified.');

    // 6. Test Updating Member Role & Status
    console.log('\n--- 6. Testing Member Status Update (Suspend/Activate) ---');
    const updatedMembership = await updateStaffMembership({
      tenantId: tenant._id,
      membershipId: foundStaff._id,
      status: 'suspended',
      updaterId: creator._id,
    });
    console.log(`Member status changed to: ${updatedMembership.status}`);
    if (updatedMembership.status !== 'suspended') {
      throw new Error('Expected status to be suspended.');
    }
    // Re-activate
    await updateStaffMembership({
      tenantId: tenant._id,
      membershipId: foundStaff._id,
      status: 'active',
      updaterId: creator._id,
    });
    console.log('PASSED: Member status lifecycle tested.');

    console.log('\n======================================================');
    console.log('ALL STAFF & RBAC TESTS PASSED SUCCESSFULLY! (0 ERRORS)');
    console.log('======================================================');
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED RBAC Verification:', err);
    process.exit(1);
  }
}

runRbacVerification();
