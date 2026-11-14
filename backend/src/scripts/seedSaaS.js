import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { PlanFeature } from '../models/PlanFeature.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_PLAN_FEATURES,
  DEFAULT_SUBSCRIPTION_PLANS,
  SYSTEM_ROLE_SLUGS,
  USER_STATUS,
} from '../config/constants.js';
import { config } from '../config/env.js';

dotenv.config();

const seedSaaSFoundation = async () => {
  try {
    console.log('[Seed SaaS] Connecting to database...');
    await connectDB();

    // 1. Seed System Permissions
    console.log('[Seed SaaS] Seeding permissions...');
    for (const perm of DEFAULT_PERMISSIONS) {
      await Permission.findOneAndUpdate(
        { key: perm.key },
        { $set: perm },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed SaaS] ${DEFAULT_PERMISSIONS.length} system permissions verified/seeded.`);

    // 2. Seed System Roles (tenantId: null)
    console.log('[Seed SaaS] Seeding system roles...');
    const allPermissionKeys = DEFAULT_PERMISSIONS.map((p) => p.key);

    const systemRoles = [
      {
        tenantId: null,
        name: 'Store Admin',
        slug: SYSTEM_ROLE_SLUGS.STORE_ADMIN,
        description: 'Complete administrative control over the store',
        isSystemRole: true,
        permissions: ['*'],
      },
      {
        tenantId: null,
        name: 'Store Manager',
        slug: SYSTEM_ROLE_SLUGS.STORE_MANAGER,
        description: 'Manage products, categories, orders, and view reports',
        isSystemRole: true,
        permissions: [
          'tenant:read',
          'products:read',
          'products:write',
          'categories:read',
          'categories:write',
          'orders:read',
          'orders:write',
          'customers:read',
          'analytics:view',
          'audit:view',
        ],
      },
      {
        tenantId: null,
        name: 'Store Staff',
        slug: SYSTEM_ROLE_SLUGS.STORE_STAFF,
        description: 'Catalog management and order viewing',
        isSystemRole: true,
        permissions: [
          'tenant:read',
          'products:read',
          'products:write',
          'categories:read',
          'categories:write',
          'orders:read',
        ],
      },
      {
        tenantId: null,
        name: 'Store Viewer',
        slug: SYSTEM_ROLE_SLUGS.STORE_VIEWER,
        description: 'Read-only access to store data and products',
        isSystemRole: true,
        permissions: [
          'tenant:read',
          'products:read',
          'categories:read',
          'orders:read',
          'customers:read',
        ],
      },
    ];

    for (const roleDef of systemRoles) {
      await Role.findOneAndUpdate(
        { tenantId: null, slug: roleDef.slug },
        { $set: roleDef },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed SaaS] ${systemRoles.length} system roles verified/seeded.`);

    // 3. Seed Plan Features
    console.log('[Seed SaaS] Seeding plan features...');
    for (const feat of DEFAULT_PLAN_FEATURES) {
      await PlanFeature.findOneAndUpdate(
        { key: feat.key },
        { $set: feat },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed SaaS] ${DEFAULT_PLAN_FEATURES.length} plan features verified/seeded.`);

    // 4. Seed SaaS Subscription Plans
    console.log('[Seed SaaS] Seeding subscription plans...');
    for (const planDef of DEFAULT_SUBSCRIPTION_PLANS) {
      await SubscriptionPlan.findOneAndUpdate(
        { slug: planDef.slug },
        { $set: planDef },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed SaaS] ${DEFAULT_SUBSCRIPTION_PLANS.length} subscription plans verified/seeded.`);

    // 5. Seed Platform Super Admin
    console.log('[Seed SaaS] Verifying Platform Super Admin user...');
    const superAdminEmail = (config.superAdmin.email || '').toLowerCase().trim();
    const superAdminPassword = config.superAdmin.password || '';
    const superAdminName = config.superAdmin.name || 'Aurelle Platform Super Admin';

    if (!superAdminEmail || !superAdminPassword) {
      console.warn('[Seed SaaS] Warning: SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set. Skipping Super Admin provisioning.');
    } else {
      let superAdmin = await User.findOne({ email: superAdminEmail });
      if (!superAdmin) {
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(superAdminPassword, salt);

        superAdmin = await User.create({
          name: superAdminName,
          email: superAdminEmail,
          passwordHash,
          isSuperAdmin: true,
          status: USER_STATUS.ACTIVE,
        });
        console.log(`[Seed SaaS] Super Admin user created: ${superAdminEmail}`);
      } else {
        superAdmin.isSuperAdmin = true;
        superAdmin.status = USER_STATUS.ACTIVE;
        await superAdmin.save();
        console.log(`[Seed SaaS] Super Admin user verified: ${superAdminEmail}`);
      }
    }

    console.log('[Seed SaaS] Foundation seed completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed SaaS] Fatal seeding error:', error);
    process.exit(1);
  }
};

seedSaaSFoundation();

