function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}

const API_BASE_URL = getApiBaseUrl();
const SUPERADMIN_TOKEN_KEY = 'aurelle_superadmin_token';
const SUPERADMIN_USER_KEY = 'aurelle_superadmin_user';

export function getSuperAdminToken() {
  try {
    return localStorage.getItem(SUPERADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSuperAdminAuth(token, user) {
  try {
    localStorage.setItem(SUPERADMIN_TOKEN_KEY, token);
    localStorage.setItem(SUPERADMIN_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore storage error
  }
}

export function clearSuperAdminAuth() {
  try {
    localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
    localStorage.removeItem(SUPERADMIN_USER_KEY);
  } catch {
    // ignore
  }
}

export function getStoredSuperAdminUser() {
  try {
    const raw = localStorage.getItem(SUPERADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function superAdminFetch(endpoint, options = {}) {
  const token = getSuperAdminToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok && !contentType.includes('application/json')) {
    if (res.status === 404) {
      throw new Error(`API endpoint not found (HTTP 404 at ${API_BASE_URL}${endpoint}).`);
    }
    throw new Error(`Server returned error (HTTP ${res.status}).`);
  }

  return res;
}

// ----------------- Super Admin Auth APIs -----------------

export async function superAdminLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || 'Authentication failed' };
    }

    if (!data.data?.user?.isSuperAdmin) {
      // User is not a Super Admin - immediately prevent access to /sa
      return {
        success: false,
        message: 'Access Denied: This account does not possess Platform Super Administrator privileges. Please use the Store Admin portal (http://localhost:3000/admin).',
      };
    }

    setSuperAdminAuth(data.data.token, data.data.user);
    return { success: true, token: data.data.token, user: data.data.user };
  } catch (err) {
    return {
      success: false,
      message: err?.message || 'Network error connecting to platform authentication server.',
    };
  }
}

export async function superAdminLogout() {
  try {
    await superAdminFetch('/v1/auth/logout', { method: 'POST' });
  } catch {
    // ignore network errors on logout
  } finally {
    clearSuperAdminAuth();
  }
}

export async function checkSuperAdminSession() {
  const token = getSuperAdminToken();
  if (!token) return null;

  try {
    const res = await superAdminFetch('/v1/auth/me');
    if (!res.ok) {
      clearSuperAdminAuth();
      return null;
    }
    const data = await res.json();
    if (data.success && data.data?.user?.isSuperAdmin) {
      localStorage.setItem(SUPERADMIN_USER_KEY, JSON.stringify(data.data.user));
      return data.data.user;
    }
    clearSuperAdminAuth();
    return null;
  } catch {
    return getStoredSuperAdminUser();
  }
}

// ----------------- Platform Dashboard Statistics -----------------

export async function getPlatformDashboardStats() {
  const res = await superAdminFetch('/v1/platform/stats');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to retrieve platform dashboard statistics');
  }
  return data.data;
}

// ----------------- Platform Subscriptions Oversight -----------------

export async function getPlatformSubscriptions({ page = 1, limit = 20, status } = {}) {
  let url = `/v1/platform/subscriptions?page=${page}&limit=${limit}`;
  if (status && status !== 'all') {
    url += `&status=${status}`;
  }
  const res = await superAdminFetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to retrieve platform subscriptions');
  }
  return { subscriptions: data.data, meta: data.meta };
}

// ----------------- Platform Tenants Oversight -----------------

export async function getPlatformTenants({ page = 1, limit = 50, status } = {}) {
  let url = `/v1/platform/tenants?page=${page}&limit=${limit}`;
  if (status && status !== 'all') {
    url += `&status=${status}`;
  }
  const res = await superAdminFetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to retrieve platform tenants');
  }
  return { tenants: data.data, meta: data.meta };
}

export async function updatePlatformTenantStatus(tenantId, status) {
  const res = await superAdminFetch(`/v1/platform/tenants/${tenantId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update tenant status');
  }
  return data.data;
}

// ----------------- Platform Users Oversight -----------------

export async function getPlatformUsers({ page = 1, limit = 50 } = {}) {
  const res = await superAdminFetch(`/v1/platform/users?page=${page}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to retrieve platform users');
  }
  return { users: data.data, meta: data.meta };
}

export async function updatePlatformUserStatus(userId, status) {
  const res = await superAdminFetch(`/v1/platform/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update user status');
  }
  return data.data;
}

// ----------------- Platform Audit Logs -----------------

export async function getPlatformAuditLogs({
  page = 1,
  limit = 50,
  tenantId = null,
  action = null,
  resource = null,
  startDate = null,
  endDate = null,
  search = null,
} = {}) {
  let url = `/v1/platform/audit-logs?page=${page}&limit=${limit}`;
  if (tenantId) url += `&tenantId=${tenantId}`;
  if (action && action !== 'all') url += `&action=${action}`;
  if (resource && resource !== 'all') url += `&resource=${resource}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

  const res = await superAdminFetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to retrieve audit logs');
  }
  return { logs: data.data, meta: data.meta };
}

// ----------------- SaaS Subscription Plans -----------------

export async function getPlatformPlans({ includeInactive = true } = {}) {
  const res = await superAdminFetch(`/v1/platform/plans?includeInactive=${includeInactive}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to retrieve subscription plans');
  }
  return data.data || [];
}

export async function createPlatformPlan(payload) {
  const res = await superAdminFetch('/v1/platform/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create subscription plan');
  }
  return data.data;
}

export async function updatePlatformPlan(planId, payload) {
  const res = await superAdminFetch(`/v1/platform/plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update subscription plan');
  }
  return data.data;
}

export async function togglePlatformPlanStatus(planId, isActive) {
  const res = await superAdminFetch(`/v1/platform/plans/${planId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to toggle plan status');
  }
  return data.data;
}

export async function deletePlatformPlan(planId) {
  const res = await superAdminFetch(`/v1/platform/plans/${planId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete plan');
  }
  return data.data;
}
