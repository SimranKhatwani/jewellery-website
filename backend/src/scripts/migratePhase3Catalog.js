/**
 * AURELLE — Phase 3 Multi-Tenant Catalog Migration Utility
 * 
 * Safely associates existing un-scoped Products and Categories with the
 * verified primary AURELLE tenant ('aurelle').
 * 
 * SAFETY RULES:
 * 1. Default mode is DRY-RUN (modifies nothing, reports only).
 * 2. Explicit '--confirm' flag is required to apply changes.
 * 3. Idempotent: Can be run multiple times safely. Does not overwrite existing valid tenantId.
 * 4. Preserves all existing MongoDB _ids, slugs, SKUs, and image URLs.
 * 5. Does NOT fabricate numerical stock: sets inventoryStatus: 'unknown' for legacy items.
 * 6. Generates backup snapshot before applying updates for safe rollback.
 * 
 * Usage:
 *   node src/scripts/migratePhase3Catalog.js           (Dry Run)
 *   node src/scripts/migratePhase3Catalog.js --confirm (Apply Migration)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { Role } from '../models/Role.js';
import { SYSTEM_ROLE_SLUGS, TENANT_STATUS, MEMBERSHIP_STATUS } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const isConfirmMode = process.argv.includes('--confirm');

async function migrateCatalog() {
  console.log('================================================================');
  console.log(`  AURELLE PHASE 3: MULTI-TENANT CATALOG MIGRATION`);
  console.log(`  Mode: ${isConfirmMode ? '⚡ LIVE MIGRATION (--confirm)' : '🔍 DRY-RUN PREVIEW (Safe Read-Only)'}`);
  console.log('================================================================\n');

  await connectDB();

  try {
    // 1. Identify or Establish Verified AURELLE Tenant
    let aurelleTenant = await Tenant.findOne({ slug: 'aurelle' });

    if (!aurelleTenant) {
      console.log('[Tenant Resolution] Official AURELLE tenant ("aurelle") not found. Searching owner account...');
      const adminUser =
        (await User.findOne({ email: 'superadmin@aurelle.com' })) ||
        (await User.findOne({ email: 'admin@aurelle.com' })) ||
        (await User.findOne({ isSuperAdmin: true }));

      if (!adminUser) {
        throw new Error('Fatal: No platform admin or superadmin user found to own the primary AURELLE tenant.');
      }

      if (isConfirmMode) {
        aurelleTenant = await Tenant.create({
          name: 'Aurelle Fine Jewellery',
          slug: 'aurelle',
          ownerId: adminUser._id,
          status: TENANT_STATUS.ACTIVE,
          plan: 'enterprise',
          settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
          },
        });

        // Ensure owner has store_admin membership
        let storeAdminRole = await Role.findOne({ slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN, tenantId: null });
        if (storeAdminRole) {
          await TenantMembership.findOneAndUpdate(
            { tenantId: aurelleTenant._id, userId: adminUser._id },
            {
              $set: {
                roleId: storeAdminRole._id,
                status: MEMBERSHIP_STATUS.ACTIVE,
              },
            },
            { upsert: true }
          );
        }

        console.log(`  ✓ Provisioned official primary tenant: ${aurelleTenant.name} (ID: ${aurelleTenant._id})`);
      } else {
        console.log(`  [DRY-RUN] Would create official primary tenant "aurelle" owned by ${adminUser.email}`);
      }
    } else {
      console.log(`  ✓ Found verified primary tenant: ${aurelleTenant.name} (Slug: ${aurelleTenant.slug}, ID: ${aurelleTenant._id})`);
    }

    const tenantId = aurelleTenant ? aurelleTenant._id : new mongoose.Types.ObjectId();

    // 2. Inspect Categories
    const allCategories = await Category.find().lean();
    const unassignedCategories = allCategories.filter((c) => !c.tenantId);
    const assignedCategories = allCategories.filter((c) => Boolean(c.tenantId));

    console.log(`\n[Categories Inspection]`);
    console.log(`  • Total Categories in Database: ${allCategories.length}`);
    console.log(`  • Already Assigned to a Tenant: ${assignedCategories.length}`);
    console.log(`  • Unassigned / Pending Migration: ${unassignedCategories.length}`);

    unassignedCategories.forEach((c) => {
      console.log(`    - Category: "${c.name}" (slug: ${c.slug}, ID: ${c._id})`);
    });

    // 3. Inspect Products
    const allProducts = await Product.find().lean();
    const unassignedProducts = allProducts.filter((p) => !p.tenantId);
    const assignedProducts = allProducts.filter((p) => Boolean(p.tenantId));

    console.log(`\n[Products Inspection]`);
    console.log(`  • Total Products in Database: ${allProducts.length}`);
    console.log(`  • Already Assigned to a Tenant: ${assignedProducts.length}`);
    console.log(`  • Unassigned / Pending Migration: ${unassignedProducts.length}`);

    // Check duplicate slugs / SKUs within unassigned products
    const slugMap = new Map();
    const skuMap = new Map();
    const duplicates = [];

    unassignedProducts.forEach((p) => {
      if (slugMap.has(p.slug)) duplicates.push(`Duplicate slug: ${p.slug}`);
      if (skuMap.has(p.sku)) duplicates.push(`Duplicate SKU: ${p.sku}`);
      slugMap.set(p.slug, p._id);
      skuMap.set(p.sku, p._id);
    });

    if (duplicates.length > 0) {
      console.warn(`  ⚠️ Detected duplicate identifiers in unassigned products:`, duplicates);
    } else {
      console.log(`  ✓ Unassigned products slug and SKU uniqueness verified (0 collisions).`);
    }

    unassignedProducts.forEach((p, idx) => {
      console.log(
        `    ${idx + 1}. [${p.sku}] "${p.name}" (slug: ${p.slug}, cat: ${p.category}, inStock: ${p.inStock})`
      );
    });

    // 4. Execution or Dry-Run Reporting
    if (!isConfirmMode) {
      console.log('\n----------------------------------------------------------------');
      console.log('  [DRY-RUN SUMMARY]');
      console.log(`  • Categories to migrate: ${unassignedCategories.length}`);
      console.log(`  • Products to migrate:   ${unassignedProducts.length}`);
      console.log(`  • Target Tenant ID:      ${aurelleTenant?._id || '(Would be created)'}`);
      console.log(`  • Target Tenant Slug:    aurelle`);
      console.log(`  • Stock Strategy:        Preserve inStock boolean, set inventoryStatus: 'unknown', stockQuantity: 0`);
      console.log('  Zero changes applied to database.');
      console.log('\n  To apply migration, run with explicit flag:');
      console.log('  node src/scripts/migratePhase3Catalog.js --confirm');
      console.log('----------------------------------------------------------------\n');
    } else {
      console.log('\n[Executing Live Migration...]');

      // Create backup file before applying
      const backupData = {
        timestamp: new Date().toISOString(),
        categories: unassignedCategories,
        products: unassignedProducts,
      };
      const backupFile = path.resolve(__dirname, `../../../phase3_catalog_backup_${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`  ✓ Pre-migration backup snapshot created: ${backupFile}`);

      // Migrate Categories
      let categoriesMigrated = 0;
      for (const cat of unassignedCategories) {
        await Category.updateOne(
          { _id: cat._id },
          { $set: { tenantId: aurelleTenant._id } }
        );
        categoriesMigrated++;
      }
      console.log(`  ✓ Successfully migrated ${categoriesMigrated} categories to tenant 'aurelle'.`);

      // Modernize indexes: Drop legacy single-field unique indexes to allow multi-tenant isolation
      try {
        await Category.collection.dropIndex('slug_1');
        console.log(`  ✓ Dropped legacy global index 'slug_1' on categories.`);
      } catch {
        // index might not exist
      }
      await Category.syncIndexes();
      console.log(`  ✓ Re-indexed Category collection with compound index { tenantId: 1, slug: 1 }.`);

      // Resolve tenant categories for categoryId linking
      const tenantCategories = await Category.find({ tenantId: aurelleTenant._id });
      const catMap = new Map(tenantCategories.map((c) => [c.slug, c._id]));

      // Migrate Products
      let productsMigrated = 0;
      for (const prod of unassignedProducts) {
        const matchingCatId = catMap.get(prod.category) || null;
        await Product.updateOne(
          { _id: prod._id },
          {
            $set: {
              tenantId: aurelleTenant._id,
              categoryId: matchingCatId,
              stockQuantity: prod.stockQuantity || 0,
              inventoryStatus: prod.inventoryStatus || (prod.inStock ? 'unknown' : 'out_of_stock'),
            },
          }
        );
        productsMigrated++;
      }
      console.log(`  ✓ Successfully migrated ${productsMigrated} products to tenant 'aurelle'.`);

      // Modernize product indexes: Drop legacy global unique indexes
      try {
        await Product.collection.dropIndex('slug_1');
        console.log(`  ✓ Dropped legacy global index 'slug_1' on products.`);
      } catch {}
      try {
        await Product.collection.dropIndex('sku_1');
        console.log(`  ✓ Dropped legacy global index 'sku_1' on products.`);
      } catch {}
      await Product.syncIndexes();
      console.log(`  ✓ Re-indexed Product collection with compound indexes { tenantId: 1, slug: 1 } and { tenantId: 1, sku: 1 }.`);

      // Verify final counts
      const finalTenantProducts = await Product.countDocuments({ tenantId: aurelleTenant._id });
      const finalTenantCategories = await Category.countDocuments({ tenantId: aurelleTenant._id });
      console.log(`\n[Post-Migration Verification]`);
      console.log(`  • Total Products under 'aurelle' tenant: ${finalTenantProducts}`);
      console.log(`  • Total Categories under 'aurelle' tenant: ${finalTenantCategories}`);
      console.log(`\n  ✅ Phase 3 Multi-Tenant Catalog Migration COMPLETE.`);
    }
  } catch (err) {
    console.error('\n[FATAL ERROR IN CATALOG MIGRATION]', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Database] Disconnected.');
  }
}

migrateCatalog();
