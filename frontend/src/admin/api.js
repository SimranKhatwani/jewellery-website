function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = 'aurelle_admin_token';
const ADMIN_USER_KEY = 'aurelle_admin_user';

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminAuth(token, admin) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
  } catch {
    // ignore storage error
  }
}

export function clearAdminAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  } catch {
    // ignore
  }
}

export function getStoredAdminUser() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function authFetch(endpoint, options = {}) {
  const token = getAdminToken();
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
      throw new Error(
        `API endpoint not found (HTTP 404 at ${API_BASE_URL}${endpoint}). The backend is not responding on this domain.`
      );
    }
    throw new Error(`Backend server error (HTTP ${res.status}).`);
  }

  return res;
}

// ----------------- Auth API -----------------
export async function adminLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (res.status === 404) {
        return {
          success: false,
          message:
            'Backend API not found (HTTP 404). If you are on Vercel, the Express backend is not running on this domain. Please test on localhost (http://localhost:3000/admin) or configure backend deployment on Vercel / Render.',
        };
      }
      return {
        success: false,
        message: `Backend returned unexpected response (HTTP ${res.status}). Make sure backend server is active.`,
      };
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || 'Authentication failed' };
    }

    setAdminAuth(data.token, data.admin);
    return { success: true, token: data.token, admin: data.admin };
  } catch (err) {
    return {
      success: false,
      message:
        err?.message?.includes('Failed to fetch') || err?.name === 'TypeError'
          ? 'Unable to connect to backend server. If deployed on Render free tier, it may take 30–50 seconds to wake up from idle on the first request. Please wait 30 seconds and try again.'
          : err?.message || 'Network error connecting to backend server.',
    };
  }
}

export async function adminLogout() {
  try {
    await authFetch('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  } finally {
    clearAdminAuth();
  }
}

export async function checkAdminSession() {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const res = await authFetch('/auth/me');
    if (!res.ok) {
      clearAdminAuth();
      return null;
    }
    const data = await res.json();
    if (data.success && data.admin) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      return data.admin;
    }
    return null;
  } catch {
    // If backend is momentarily down, fallback to stored session
    return getStoredAdminUser();
  }
}

// ----------------- Products API -----------------
export async function getAdminProducts() {
  const res = await authFetch('/products/admin/all');
  if (!res.ok) {
    throw new Error(`Failed to load products: ${res.statusText}`);
  }
  const data = await res.json();
  return data.products || [];
}

export async function createProduct(payload) {
  const res = await authFetch('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create product');
  }
  return data.product;
}

export async function updateProduct(id, payload) {
  const res = await authFetch(`/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update product');
  }
  return data.product;
}

export async function deleteProduct(id) {
  const res = await authFetch(`/products/${id}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete product');
  }
}

export async function toggleProductPublish(id) {
  const res = await authFetch(`/products/${id}/toggle-publish`, {
    method: 'PATCH',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to toggle product status');
  }
  return data.isPublished;
}

// ----------------- Store Currency Settings API -----------------
export async function getAdminStoreCurrency() {
  try {
    const res = await authFetch('/products/admin/currency');
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
  } catch (err) {
    console.warn('Currency fetch note:', err.message);
  }
  return { currency: 'USD', currencySymbol: '$' };
}

export async function updateAdminStoreCurrency(currency, currencySymbol) {
  const res = await authFetch('/products/admin/currency', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency, currencySymbol }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update store currency');
  }
  return data;
}

// ----------------- Media Upload API -----------------
export async function uploadMediaImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const token = getAdminToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}/media`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to upload image file to GridFS.');
  }

  return {
    url: data.url,
    id: data.id,
    filename: data.filename,
  };
}

// ----------------- Categories API -----------------
export const DEFAULT_CATEGORIES = [
  { value: 'rings', label: 'Rings' },
  { value: 'anklets', label: 'Anklets' },
  { value: 'earrings', label: 'Earrings' },
  { value: 'necklaces', label: 'Necklaces' },
];

export function getStoredCategories() {
  try {
    const raw = localStorage.getItem('aurelle_custom_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const map = new Map();
        DEFAULT_CATEGORIES.forEach((c) => map.set(c.value, c));
        parsed.forEach((c) => {
          if (c && c.value && c.label) {
            map.set(c.value, { value: c.value, label: c.label });
          }
        });
        return Array.from(map.values());
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_CATEGORIES;
}

export function saveStoredCategory(categoryObj) {
  try {
    const existing = getStoredCategories();
    const map = new Map();
    existing.forEach((c) => map.set(c.value, c));
    map.set(categoryObj.value, {
      value: categoryObj.value,
      label: categoryObj.label,
    });
    const updated = Array.from(map.values());
    localStorage.setItem('aurelle_custom_categories', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('aurelle_categories_updated', { detail: updated }));
    return updated;
  } catch {
    return getStoredCategories();
  }
}

export async function getAdminCategories() {
  try {
    const res = await authFetch('/categories');
    if (res.ok) {
      const data = await res.json();
      if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        data.categories.forEach((c) => {
          if (c.slug && c.name) {
            saveStoredCategory({ value: c.slug, label: c.name });
          }
        });
      }
    }
  } catch {
    // fallback to stored
  }
  return getStoredCategories();
}

export async function createAdminCategory(payload) {
  const normSlug = (payload.slug || payload.name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

  const label = payload.name.trim();
  saveStoredCategory({ value: normSlug, label });

  try {
    const res = await authFetch('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: label,
        slug: normSlug,
        ...payload,
      }),
    });

    const data = await res.json();
    if (data.category) {
      saveStoredCategory({ value: data.category.slug, label: data.category.name });
      return data.category;
    }
  } catch (err) {
    console.warn('Backend category sync notice:', err.message);
  }

  return { slug: normSlug, name: label };
}

// ----------------- Orders API -----------------
export async function getAdminOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.orderStatus && params.orderStatus !== 'all') query.set('orderStatus', params.orderStatus);
  if (params.paymentMethod && params.paymentMethod !== 'all') query.set('paymentMethod', params.paymentMethod);
  if (params.paymentStatus && params.paymentStatus !== 'all') query.set('paymentStatus', params.paymentStatus);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const qs = query.toString();
  const res = await authFetch(`/orders${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error(`Failed to load orders: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    orders: data.orders || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 20, pages: 1 },
    metrics: data.metrics || {
      totalRevenue: 0,
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
    },
  };
}

export async function getAdminOrderDetails(orderId) {
  const res = await authFetch(`/orders/${orderId}`);
  if (!res.ok) {
    throw new Error(`Failed to load order details: ${res.statusText}`);
  }
  const data = await res.json();
  return data.order;
}

export async function updateAdminOrderStatus(orderId, orderStatus, notes = '') {
  const res = await authFetch(`/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderStatus, notes }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update order status');
  }
  return data.order;
}

export async function updateAdminPaymentStatus(orderId, paymentStatus) {
  const res = await authFetch(`/orders/${orderId}/payment-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update payment status');
  }
  return data.order;
}

export async function cancelAdminOrder(orderId, reason = '') {
  const res = await authFetch(`/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to cancel order');
  }
  return data.order;
}

// ----------------- Notifications API (Phase 6.1) -----------------
export async function getAdminNotifications(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.unreadOnly) query.set('unreadOnly', params.unreadOnly);

  const qs = query.toString();
  const res = await authFetch(`/notifications${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error(`Failed to load notifications: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    notifications: data.notifications || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 20, pages: 1 },
    unreadCount: data.unreadCount ?? 0,
  };
}

export async function getAdminUnreadNotificationCount() {
  try {
    const res = await authFetch('/notifications/unread-count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

export async function markAdminNotificationRead(notificationId) {
  const res = await authFetch(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to mark notification as read');
  }
  return data.notification;
}

export async function markAllAdminNotificationsRead() {
  const res = await authFetch('/notifications/mark-all-read', {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to mark all notifications as read');
  }
  return data;
}

// ----------------- Analytics API (Phase 6.3) -----------------
function buildAnalyticsQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.set('preset', params.preset);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.groupBy) query.set('groupBy', params.groupBy);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.limit) query.set('limit', params.limit);
  if (params.page) query.set('page', params.page);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function getAnalyticsOverview(params = {}) {
  const qs = buildAnalyticsQuery(params);
  const res = await authFetch(`/analytics/overview${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch analytics overview');
  }
  return data;
}

export async function getAnalyticsSalesTrends(params = {}) {
  const qs = buildAnalyticsQuery(params);
  const res = await authFetch(`/analytics/sales-trends${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch sales trends');
  }
  return data;
}

export async function getAnalyticsOrders(params = {}) {
  const qs = buildAnalyticsQuery(params);
  const res = await authFetch(`/analytics/orders${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch order distribution');
  }
  return data;
}

export async function getAnalyticsBestsellers(params = {}) {
  const qs = buildAnalyticsQuery(params);
  const res = await authFetch(`/analytics/bestsellers${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch bestselling products');
  }
  return data;
}

export async function getAnalyticsCustomers(params = {}) {
  const qs = buildAnalyticsQuery(params);
  const res = await authFetch(`/analytics/customers${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch customer insights');
  }
  return data;
}

export async function getAnalyticsPayments(params = {}) {
  const qs = buildAnalyticsQuery(params);
  const res = await authFetch(`/analytics/payments${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch payment analytics');
  }
  return data;
}

export async function getAnalyticsInventory() {
  const res = await authFetch('/analytics/inventory');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch inventory analytics');
  }
  return data;
}

// ----------------- Reports API (Phase 6.3 Consolidation) -----------------
function buildReportQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.set('preset', params.preset);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.orderStatus && params.orderStatus !== 'all') query.set('orderStatus', params.orderStatus);
  if (params.paymentStatus && params.paymentStatus !== 'all') query.set('paymentStatus', params.paymentStatus);
  if (params.paymentMethod && params.paymentMethod !== 'all') query.set('paymentMethod', params.paymentMethod);
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.inventoryStatus && params.inventoryStatus !== 'all') query.set('inventoryStatus', params.inventoryStatus);
  if (params.customerType && params.customerType !== 'all') query.set('customerType', params.customerType);
  if (params.isPublished && params.isPublished !== 'all') query.set('isPublished', params.isPublished);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.format) query.set('format', params.format);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function getReport(reportType, params = {}) {
  const qs = buildReportQuery(params);
  const res = await authFetch(`/reports/${reportType}${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Failed to fetch ${reportType} report`);
  }
  return data;
}

export async function downloadReportCSV(reportType, params = {}) {
  const qs = buildReportQuery({ ...params, format: 'csv' });
  const token = getAdminToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/reports/${reportType}/export${qs}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to export CSV: HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aurelle-${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function openReportPrintView(reportType, params = {}) {
  const qs = buildReportQuery({ ...params, format: 'html' });
  const token = getAdminToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/reports/${reportType}/export${qs}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to load printable report: HTTP ${res.status}`);
  }

  const html = await res.text();
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback if popup blocked: download HTML
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurelle-${reportType}-report.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// ----------------- Customer Management API -----------------
export async function getAdminCustomers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.customerType && params.customerType !== 'all') query.set('customerType', params.customerType);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await authFetch(`/customers${qs}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch store customers');
  }
  return data;
}

export async function getAdminCustomerDetails(customerId) {
  const res = await authFetch(`/customers/${customerId}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch customer details');
  }
  return data;
}

export async function updateAdminCustomer(customerId, updates = {}) {
  const res = await authFetch(`/customers/${customerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update customer');
  }
  return data;
}




