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
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
};

