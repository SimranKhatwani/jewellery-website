/**
 * System-wide constants for AURELLE Multi-tenant SaaS
 */

export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
};

export const TENANT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  ARCHIVED: 'archived',
};

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  INVITED: 'invited',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
};

export const SYSTEM_ROLE_SLUGS = {
  STORE_ADMIN: 'store_admin',
  STORE_MANAGER: 'store_manager',
  STORE_STAFF: 'store_staff',
  STORE_VIEWER: 'store_viewer',
};

export const DEFAULT_PERMISSIONS = [
  // Tenant & Store Settings
  { key: 'tenant:read', name: 'View Store Details', module: 'store', description: 'View store profile and settings' },
  { key: 'tenant:update', name: 'Update Store Details', module: 'store', description: 'Update store branding, profile, and settings' },
  { key: 'tenant:delete', name: 'Delete Store', module: 'store', description: 'Request store closure or deletion' },

  // Staff & Role Management
  { key: 'staff:read', name: 'View Staff Members', module: 'staff', description: 'View store staff and their roles' },
  { key: 'staff:invite', name: 'Invite Staff', module: 'staff', description: 'Invite new staff members to store' },
  { key: 'staff:update', name: 'Update Staff Membership', module: 'staff', description: 'Change staff role or status' },
  { key: 'staff:remove', name: 'Remove Staff', module: 'staff', description: 'Remove staff access from store' },
  { key: 'roles:manage', name: 'Manage Custom Roles', module: 'staff', description: 'Create and update custom staff roles and permissions' },

  // Catalog Permissions
  { key: 'products:read', name: 'View Products', module: 'catalog', description: 'View product catalog' },
  { key: 'products:write', name: 'Manage Products', module: 'catalog', description: 'Create, update, and delete products' },
  { key: 'categories:read', name: 'View Categories', module: 'catalog', description: 'View product categories' },
  { key: 'categories:write', name: 'Manage Categories', module: 'catalog', description: 'Create, update, and delete categories' },

  // Orders & Customers (Defined for upcoming phases)
  { key: 'orders:read', name: 'View Orders', module: 'sales', description: 'View store orders' },
  { key: 'orders:write', name: 'Manage Orders', module: 'sales', description: 'Update order statuses and fulfillment' },
  { key: 'customers:read', name: 'View Customers', module: 'customers', description: 'View customer accounts and activity' },

  // Analytics & Auditing
  { key: 'analytics:view', name: 'View Analytics', module: 'analytics', description: 'View sales and traffic metrics' },
  { key: 'audit:view', name: 'View Store Audit Logs', module: 'audit', description: 'View security and change history' },
];

export const DEFAULT_PLAN_FEATURES = [
  { key: 'products:read', name: 'View Products', category: 'catalog', description: 'Browse and view products', type: 'boolean' },
  { key: 'products:write', name: 'Product Management', category: 'catalog', description: 'Add and edit products', type: 'boolean' },
  { key: 'inventory:advanced', name: 'Advanced Inventory', category: 'inventory', description: 'Variant tracking, low-stock alerts', type: 'boolean' },
  { key: 'analytics:advanced', name: 'Advanced Analytics', category: 'analytics', description: 'Revenue breakdowns, conversion funnels', type: 'boolean' },
  { key: 'staff:custom_roles', name: 'Custom Staff Roles', category: 'staff', description: 'Create dynamic roles with custom permissions', type: 'boolean' },
  { key: 'marketing:campaigns', name: 'Marketing Campaigns', category: 'marketing', description: 'Discounts, coupon codes, and banners', type: 'boolean' },
  { key: 'domain:custom', name: 'Custom Domain', category: 'domain', description: 'Connect branded custom domain', type: 'boolean' },
];

export const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    name: 'Starter Trial',
    slug: 'starter',
    description: 'Essential luxury storefront features for boutique jewellers',
    price: 0,
    currency: 'INR',
    billingInterval: 'monthly',
    trialDays: 14,
    features: ['products:read', 'products:write'],
    limits: {
      maxProducts: 50,
      maxStaff: 2,
      maxStorageMB: 500,
      customDomainAllowed: false,
    },
    displayOrder: 1,
    isActive: true,
    isPublic: true,
  },
  {
    name: 'Growth',
    slug: 'growth',
    description: 'Comprehensive features for expanding jewellery retail brands',
    price: 2999,
    currency: 'INR',
    billingInterval: 'monthly',
    trialDays: 0,
    features: ['products:read', 'products:write', 'inventory:advanced', 'staff:custom_roles', 'domain:custom'],
    limits: {
      maxProducts: 500,
      maxStaff: 10,
      maxStorageMB: 5000,
      customDomainAllowed: true,
    },
    displayOrder: 2,
    isActive: true,
    isPublic: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Unlimited capability and dedicated support for high-volume flagship maisons',
    price: 9999,
    currency: 'INR',
    billingInterval: 'monthly',
    trialDays: 0,
    features: [
      'products:read',
      'products:write',
      'inventory:advanced',
      'analytics:advanced',
      'staff:custom_roles',
      'marketing:campaigns',
      'domain:custom',
    ],
    limits: {
      maxProducts: -1, // Unlimited
      maxStaff: -1,   // Unlimited
      maxStorageMB: -1, // Unlimited
      customDomainAllowed: true,
    },
    displayOrder: 3,
    isActive: true,
    isPublic: true,
  },
];

export const AUDIT_ACTIONS = {
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_STATUS_CHANGE: 'USER_STATUS_CHANGE',
  TENANT_CREATE: 'TENANT_CREATE',
  TENANT_UPDATE: 'TENANT_UPDATE',
  TENANT_STATUS_CHANGE: 'TENANT_STATUS_CHANGE',
  MEMBERSHIP_INVITE: 'MEMBERSHIP_INVITE',
  MEMBERSHIP_UPDATE: 'MEMBERSHIP_UPDATE',
  MEMBERSHIP_REMOVE: 'MEMBERSHIP_REMOVE',
  ROLE_CREATE: 'ROLE_CREATE',
  ROLE_UPDATE: 'ROLE_UPDATE',
  ROLE_DELETE: 'ROLE_DELETE',
  TENANT_OWNERSHIP_TRANSFER: 'TENANT_OWNERSHIP_TRANSFER',
  INVITATION_CREATE: 'INVITATION_CREATE',
  INVITATION_ACCEPT: 'INVITATION_ACCEPT',
  INVITATION_REVOKE: 'INVITATION_REVOKE',
  SUBSCRIPTION_CREATE: 'SUBSCRIPTION_CREATE',
  SUBSCRIPTION_UPDATE: 'SUBSCRIPTION_UPDATE',
  SUBSCRIPTION_CANCEL: 'SUBSCRIPTION_CANCEL',
  SUBSCRIPTION_PAYMENT_SUCCESS: 'SUBSCRIPTION_PAYMENT_SUCCESS',
  SUBSCRIPTION_PAYMENT_FAILED: 'SUBSCRIPTION_PAYMENT_FAILED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
};

