/**
 * AURELLE — Test Data Investigation & Optional Cleanup Utility
 * 
 * Scans MongoDB Atlas for automated test artifacts generated during
 * Phase 1, Phase 1.1, and Phase 2 test suite executions.
 * 
 * SAFETY RULES:
 * 1. Default mode is DRY-RUN (read-only, modifies nothing).
 * 2. Never deletes superadmin@aurelle.com or isSuperAdmin accounts.
 * 3. Never deletes legitimate production stores or users.
 * 4. To execute deletion, explicit flag '--confirm' must be provided.
 * 
 * Usage:
 *   node src/scripts/cleanupTestData.js           (Dry run - report only)
 *   node src/scripts/cleanupTestData.js --confirm (Execute cleanup)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Role } from '../models/Role.js';
import { Invitation } from '../models/Invitation.js';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { SubscriptionEvent } from '../models/SubscriptionEvent.js';
import { AuditLog } from '../models/AuditLog.js';

dotenv.config();

const isConfirmMode = process.argv.includes('--confirm');

const TEST_EMAIL_REGEX = /(@test\.com$|-test-|-sec-|-sub-)/i;
const TEST_SLUG_REGEX = /^(store-a-test-|store-b-test-|sec-store-|store-sub-)/i;

async function investigateAndCleanup() {
  console.log('================================================================');
  console.log(`  AURELLE TEST DATA INVESTIGATION ${isConfirmMode ? '(LIVE CLEANUP MODE)' : '(DRY-RUN INSPECTION ONLY)'}`);
  console.log('================================================================\n');

  await connectDB();

  try {
    // 1. Identify Test Users (Exclude superadmin)
    const allUsers = await User.find().lean();
    const testUsers = allUsers.filter((u) => !u.isSuperAdmin && TEST_EMAIL_REGEX.test(u.email));
    const legitimateUsers = allUsers.filter((u) => u.isSuperAdmin || !TEST_EMAIL_REGEX.test(u.email));

    // 2. Identify Test Tenants
    const allTenants = await Tenant.find().lean();
    const testTenants = allTenants.filter((t) => TEST_SLUG_REGEX.test(t.slug));
    const legitimateTenants = allTenants.filter((t) => !TEST_SLUG_REGEX.test(t.slug));

    const testTenantIds = testTenants.map((t) => t._id);
    const testUserIds = testUsers.map((u) => u._id);

    // 3. Count Associated Resources
    const testMembershipsCount = await TenantMembership.countDocuments({
      $or: [{ tenantId: { $in: testTenantIds } }, { userId: { $in: testUserIds } }],
    });

    const testSubscriptionsCount = await Subscription.countDocuments({
      tenantId: { $in: testTenantIds },
    });

    const testPaymentsCount = await SubscriptionPayment.countDocuments({
      tenantId: { $in: testTenantIds },
    });

    const testEventsCount = await SubscriptionEvent.countDocuments({
      tenantId: { $in: testTenantIds },
    });

    const testRolesCount = await Role.countDocuments({
      tenantId: { $in: testTenantIds },
    });

    const testInvitationsCount = await Invitation.countDocuments({
      tenantId: { $in: testTenantIds },
    });

    const testAuditLogsCount = await AuditLog.countDocuments({
      $or: [
        { tenantId: { $in: testTenantIds } },
        { userId: { $in: testUserIds } },
        { 'details.email': { $regex: TEST_EMAIL_REGEX } },
      ],
    });

    console.log('[INVESTIGATION FINDINGS]');
    console.log(`  -> Legitimate Platform Users: ${legitimateUsers.length}`);
    legitimateUsers.forEach((u) => console.log(`     • ${u.name} (${u.email}) [SuperAdmin: ${u.isSuperAdmin}]`));

    console.log(`\n  -> Legitimate Platform Tenants: ${legitimateTenants.length}`);
    if (legitimateTenants.length === 0) {
      console.log('     • (None currently - all existing stores were created during automated test suites)');
    } else {
      legitimateTenants.forEach((t) => console.log(`     • ${t.name} (slug: ${t.slug})`));
    }

    console.log(`\n  -> Confirmed Test Users Found: ${testUsers.length}`);
    testUsers.forEach((u) => console.log(`     - [TEST USER] ${u.email} (ID: ${u._id})`));

    console.log(`\n  -> Confirmed Test Tenants Found: ${testTenants.length}`);
    testTenants.forEach((t) => console.log(`     - [TEST STORE] ${t.name} (${t.slug})`));

    console.log('\n  -> Associated Test Documents:');
    console.log(`     • Tenant Memberships: ${testMembershipsCount}`);
    console.log(`     • Subscriptions:      ${testSubscriptionsCount}`);
    console.log(`     • Payments:           ${testPaymentsCount}`);
    console.log(`     • Events:             ${testEventsCount}`);
    console.log(`     • Roles:              ${testRolesCount}`);
    console.log(`     • Invitations:        ${testInvitationsCount}`);
    console.log(`     • Audit Logs:         ${testAuditLogsCount}`);

    if (!isConfirmMode) {
      console.log('\n----------------------------------------------------------------');
      console.log('  [DRY-RUN NOTICE]');
      console.log('  Zero documents were deleted. All database records remain intact.');
      console.log('  To execute cleanup of confirmed test data, re-run with:');
      console.log('  node src/scripts/cleanupTestData.js --confirm');
      console.log('----------------------------------------------------------------\n');
    } else {
      console.log('\n[EXECUTING LIVE CLEANUP OF TEST RECORDS...]');

      const delMemberships = await TenantMembership.deleteMany({
        $or: [{ tenantId: { $in: testTenantIds } }, { userId: { $in: testUserIds } }],
      });
      const delSubs = await Subscription.deleteMany({ tenantId: { $in: testTenantIds } });
      const delPayments = await SubscriptionPayment.deleteMany({ tenantId: { $in: testTenantIds } });
      const delEvents = await SubscriptionEvent.deleteMany({ tenantId: { $in: testTenantIds } });
      const delRoles = await Role.deleteMany({ tenantId: { $in: testTenantIds } });
      const delInvites = await Invitation.deleteMany({ tenantId: { $in: testTenantIds } });
      const delAudits = await AuditLog.deleteMany({
        $or: [
          { tenantId: { $in: testTenantIds } },
          { userId: { $in: testUserIds } },
          { 'details.email': { $regex: TEST_EMAIL_REGEX } },
        ],
      });
      const delTenants = await Tenant.deleteMany({ _id: { $in: testTenantIds } });
      const delUsers = await User.deleteMany({ _id: { $in: testUserIds } });

      console.log(`  ✓ Deleted ${delTenants.deletedCount} test tenants.`);
      console.log(`  ✓ Deleted ${delUsers.deletedCount} test users.`);
      console.log(`  ✓ Deleted ${delMemberships.deletedCount} test memberships.`);
      console.log(`  ✓ Deleted ${delSubs.deletedCount} test subscriptions.`);
      console.log(`  ✓ Deleted ${delPayments.deletedCount} test payments.`);
      console.log(`  ✓ Deleted ${delEvents.deletedCount} test events.`);
      console.log(`  ✓ Deleted ${delRoles.deletedCount} test custom roles.`);
      console.log(`  ✓ Deleted ${delInvites.deletedCount} test invitations.`);
      console.log(`  ✓ Deleted ${delAudits.deletedCount} test audit logs.`);
      console.log('\n  -> Live cleanup completed successfully. All legitimate records preserved.\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[CLEANUP FATAL ERROR]', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

investigateAndCleanup();
