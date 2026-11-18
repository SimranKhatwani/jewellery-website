/**
 * AURELLE Multi-Tenant SaaS E-Commerce Storefront Service
 * Handles Guest Sessions, Customer Auth, Tenant Cart, Wishlist, Coupon Validation,
 * Customer Address Books, Dynamic Currency Formatting, and Checkout Previews.
 */

function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}

const API_BASE_URL = getApiBaseUrl();

const RESERVED_ROUTES = new Set([
  'admin',
  'sa',
  'superadmin',
  'api',
  'assets',
  'store',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

/**
 * Resolve active storefront slug dynamically.
 * Priority:
 * 1. Query param: ?store=<slug> or ?tenant=<slug>
 * 2. URL path: /store/<slug>
 * 3. Direct route path: /:storeSlug (e.g. /royal-jewellery, /giva-jewels, /aurelle)
 * 4. Saved localStorage: aurelle_store_slug
 * 5. Default: 'aurelle'
 */
export function getStoreSlug() {
  if (typeof window === 'undefined') return 'aurelle';

  try {
    const params = new URLSearchParams(window.location.search);
    const qSlug = params.get('store') || params.get('tenant');
    if (qSlug && qSlug.trim()) {
      const clean = qSlug.trim().toLowerCase();
      localStorage.setItem('aurelle_store_slug', clean);
      return clean;
    }

    const storePathMatch = window.location.pathname.match(/^\/store\/([a-zA-Z0-9_-]+)/i);
    if (storePathMatch && storePathMatch[1]) {
      const clean = storePathMatch[1].toLowerCase();
      localStorage.setItem('aurelle_store_slug', clean);
      return clean;
    }

    // Direct slug route: e.g. /royal-jewellery or /giva-jewels
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const firstSegment = segments[0].toLowerCase().trim();
      if (!RESERVED_ROUTES.has(firstSegment) && /^[a-z0-9_-]+$/.test(firstSegment)) {
        localStorage.setItem('aurelle_store_slug', firstSegment);
        return firstSegment;
      }
    }

    const saved = localStorage.getItem('aurelle_store_slug');
    if (saved && saved.trim() && !RESERVED_ROUTES.has(saved.trim().toLowerCase())) {
      return saved.trim().toLowerCase();
    }
  } catch {
    // ignore browser storage errors
  }

  return 'aurelle';
}

// Guest session ID management
export function getGuestSessionId() {
  if (typeof window === 'undefined') return 'guest-ssr';
  let sessionId = localStorage.getItem('aurelle_guest_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem('aurelle_guest_session_id', sessionId);
  }
  return sessionId;
}

// Customer Auth Token management
export function getCustomerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aurelle_customer_token') || null;
}

export function setCustomerToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('aurelle_customer_token', token);
  } else {
    localStorage.removeItem('aurelle_customer_token');
  }
}

export function normalizeCustomerUser(user, extra = {}) {
  if (!user) return null;
  const phone = user.phone || user.phoneNumber || extra.phone || extra.phoneNumber || '';
  user.phone = phone;
  user.phoneNumber = phone;
  if (!user.firstName && user.name) {
    const parts = user.name.trim().split(/\s+/);
    user.firstName = parts[0] || '';
    user.lastName = parts.slice(1).join(' ') || '';
  }
  if (extra.firstName && !user.firstName) user.firstName = extra.firstName;
  if (extra.lastName && !user.lastName) user.lastName = extra.lastName;
  return user;
}

export function getCustomerUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('aurelle_customer_user');
    const user = raw ? JSON.parse(raw) : null;
    return normalizeCustomerUser(user);
  } catch {
    return null;
  }
}

export function setCustomerUser(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    const normalized = normalizeCustomerUser(user);
    localStorage.setItem('aurelle_customer_user', JSON.stringify(normalized));
  } else {
    localStorage.removeItem('aurelle_customer_user');
  }
}

// Request headers builder
export function getStorefrontHeaders() {
  const storeSlug = getStoreSlug();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Guest-Session-ID': getGuestSessionId(),
    'X-Tenant-ID': storeSlug,
  };

  const token = getCustomerToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// -------------------------------------------------------------
// DYNAMIC CURRENCY & STORE INFO
// -------------------------------------------------------------

let cachedStoreInfo = null;

export function getCachedStoreInfo() {
  return cachedStoreInfo;
}

export function clearStoreInfoCache() {
  cachedStoreInfo = null;
}

export async function fetchStoreInfo(explicitSlug = null) {
  try {
    const storeSlug = explicitSlug || getStoreSlug();
    const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/info`, {
      headers: getStorefrontHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      const store = data.store || data.data?.store || null;
      if (store) {
        cachedStoreInfo = store;
        if (store.currency && typeof window !== 'undefined') {
          localStorage.setItem('aurelle_store_currency', store.currency);
        }
        if (store.currencySymbol && typeof window !== 'undefined') {
          localStorage.setItem('aurelle_store_currency_symbol', store.currencySymbol);
        }
        return store;
      }
    }
  } catch (err) {
    console.warn('[Storefront] Fetch store info note:', err.message);
  }
  return null;
}

export function getStoreCurrency() {
  if (cachedStoreInfo?.currency) return cachedStoreInfo.currency;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('aurelle_store_currency');
    if (saved) return saved;
  }
  return 'USD';
}

export function setStoreCurrency(currency, symbol = null) {
  const c = String(currency || 'USD').toUpperCase().trim();
  const sym = symbol || (c === 'INR' ? '₹' : (c === 'EUR' ? '€' : (c === 'GBP' ? '£' : (c === 'AED' ? 'AED ' : '$'))));
  if (typeof window !== 'undefined') {
    localStorage.setItem('aurelle_store_currency', c);
    localStorage.setItem('aurelle_store_currency_symbol', sym);
    window.dispatchEvent(new CustomEvent('aurelle_currency_updated', { detail: { currency: c, symbol: sym } }));
  }
  if (cachedStoreInfo) {
    cachedStoreInfo.currency = c;
    cachedStoreInfo.currencySymbol = sym;
  }
}

/**
 * Format price dynamically according to tenant currency (USD, INR, EUR, GBP, etc.)
 */
export function formatPrice(amount, currency = null) {
  const targetCurrency = String(currency || getStoreCurrency() || 'USD').toUpperCase().trim();
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    const sym =
      targetCurrency === 'INR'
        ? '₹'
        : targetCurrency === 'EUR'
        ? '€'
        : targetCurrency === 'GBP'
        ? '£'
        : targetCurrency === 'AED'
        ? 'AED '
        : '$';
    return `${sym}${num.toFixed(2)}`;
  }
}

// -------------------------------------------------------------
// CART APIS
// -------------------------------------------------------------

export async function fetchCart() {
  try {
    const storeSlug = getStoreSlug();
    const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/cart`, {
      headers: getStorefrontHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.cart || data.data?.cart || { items: [], subtotal: 0, totalItems: 0 };
  } catch (err) {
    console.warn('[Storefront] Fetch cart fallback:', err.message);
    return { items: [], subtotal: 0, totalItems: 0 };
  }
}

export async function addToCart({ productId, variantId, sku, selectedOptions, quantity = 1 }) {
  const storeSlug = getStoreSlug();
  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/cart/items`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
    body: JSON.stringify({ productId, variantId, sku, selectedOptions, quantity }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to add item to cart');
  }
  return data.cart || data.data?.cart;
}

export async function updateCartItemQuantity(itemId, quantity) {
  const storeSlug = getStoreSlug();
  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: getStorefrontHeaders(),
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update item quantity');
  }
  return data.cart || data.data?.cart;
}

export async function removeCartItem(itemId) {
  const storeSlug = getStoreSlug();
  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: getStorefrontHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to remove item');
  }
  return data.cart || data.data?.cart;
}

export async function clearCart() {
  const storeSlug = getStoreSlug();
  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/cart`, {
    method: 'DELETE',
    headers: getStorefrontHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to clear cart');
  }
  return data.cart || data.data?.cart;
}

export async function mergeGuestCart() {
  const guestSessionId = getGuestSessionId();
  if (!guestSessionId) return null;

  try {
    const storeSlug = getStoreSlug();
    const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/cart/merge`, {
      method: 'POST',
      headers: getStorefrontHeaders(),
      body: JSON.stringify({ guestSessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.cart || data.data?.cart;
    }
  } catch (err) {
    console.warn('[Storefront] Merge guest cart note:', err.message);
  }
  return null;
}

// -------------------------------------------------------------
// COUPON APIS
// -------------------------------------------------------------

export async function validateCoupon(code, orderAmount) {
  const storeSlug = getStoreSlug();
  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/coupon/validate`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
    body: JSON.stringify({ code, orderAmount }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Invalid or expired coupon');
  }
  return data.data || data;
}

// -------------------------------------------------------------
// CHECKOUT PREVIEW API
// -------------------------------------------------------------

export async function previewCheckout({ addressId, guestAddress, couponCode, items, shippingAddress }) {
  const storeSlug = getStoreSlug();
  // Support both addressId/guestAddress or legacy shippingAddress parameter
  const payload = {
    couponCode,
    items,
  };

  if (addressId) {
    payload.addressId = addressId;
  } else if (guestAddress) {
    payload.guestAddress = guestAddress;
  } else if (shippingAddress) {
    if (shippingAddress._id) {
      payload.addressId = shippingAddress._id;
    } else {
      payload.guestAddress = shippingAddress;
    }
  }

  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/checkout/preview`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Checkout preview calculation failed');
  }
  return data;
}

// -------------------------------------------------------------
// ORDER PLACEMENT API
// -------------------------------------------------------------

export async function placeOrder({
  addressId,
  guestAddress,
  couponCode,
  paymentMethod = 'cod',
  idempotencyKey = null,
  notes = '',
}) {
  const storeSlug = getStoreSlug();
  const headers = getStorefrontHeaders();
  if (idempotencyKey) {
    headers['Idempotency-Key'] = String(idempotencyKey);
  }

  const payload = {
    addressId: addressId || undefined,
    guestAddress: guestAddress || undefined,
    couponCode: couponCode || undefined,
    paymentMethod,
    idempotencyKey,
    notes,
  };

  const res = await fetch(`${API_BASE_URL}/v1/storefront/${encodeURIComponent(storeSlug)}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to place order. Please review your details.');
  }

  const order = data.order || data.data?.order || data;
  return { order, isDuplicate: Boolean(data.isDuplicate) };
}

// -------------------------------------------------------------
// CUSTOMER ORDER HISTORY APIS
// -------------------------------------------------------------

export async function fetchCustomerOrders({ page = 1, limit = 20 } = {}) {
  const token = getCustomerToken();
  if (!token) return [];

  const res = await fetch(`${API_BASE_URL}/v1/customers/me/orders?page=${page}&limit=${limit}`, {
    headers: getStorefrontHeaders(),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.orders || data.data?.orders || [];
}

export async function fetchCustomerOrderById(orderId) {
  const token = getCustomerToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/v1/customers/me/orders/${orderId}`, {
    headers: getStorefrontHeaders(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.order || data.data?.order;
}

export async function cancelCustomerOrder(orderId, reason = '') {
  const res = await fetch(`${API_BASE_URL}/v1/customers/me/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to cancel order.');
  }
  return data.order || data.data?.order;
}

// -------------------------------------------------------------
// CUSTOMER NOTIFICATIONS APIS (PHASE 6.1)
// -------------------------------------------------------------

export async function fetchCustomerNotifications({ page = 1, limit = 20, unreadOnly = false } = {}) {
  const token = getCustomerToken();
  if (!token) return { notifications: [], unreadCount: 0 };

  const res = await fetch(
    `${API_BASE_URL}/v1/customers/me/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
    {
      headers: getStorefrontHeaders(),
    }
  );

  if (!res.ok) return { notifications: [], unreadCount: 0 };
  const data = await res.json();
  return {
    notifications: data.notifications || [],
    unreadCount: data.unreadCount ?? 0,
    pagination: data.pagination,
  };
}

export async function fetchCustomerUnreadNotificationCount() {
  const token = getCustomerToken();
  if (!token) return 0;

  try {
    const res = await fetch(`${API_BASE_URL}/v1/customers/me/notifications/unread-count`, {
      headers: getStorefrontHeaders(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

export async function markCustomerNotificationRead(notificationId) {
  const token = getCustomerToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/v1/customers/me/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getStorefrontHeaders(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to mark notification as read');
  }
  const data = await res.json();
  return data.notification;
}

export async function markAllCustomerNotificationsRead() {
  const token = getCustomerToken();
  if (!token) return { updatedCount: 0 };

  const res = await fetch(`${API_BASE_URL}/v1/customers/me/notifications/mark-all-read`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to mark all notifications as read');
  }
  const data = await res.json();
  return data;
}

// -------------------------------------------------------------
// CUSTOMER AUTH & PROFILE APIS
// -------------------------------------------------------------

export async function customerLogin(email, password) {
  const res = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const detailMsg = data.details && typeof data.details === 'object'
      ? Object.values(data.details).join('. ')
      : null;
    throw new Error(detailMsg || data.message || 'Login failed');
  }

  // Unpack sendSuccess envelope { success: true, message, data: { token, user } }
  const payload = data.data || data;
  const token = payload.token || payload.accessToken;
  const rawUser = payload.user || payload.customer || {};

  if (!token) {
    throw new Error(data.message || 'Authentication succeeded but no token was provided.');
  }

  const user = normalizeCustomerUser(rawUser);

  setCustomerToken(token);
  setCustomerUser(user);

  // Auto merge guest cart if any
  await mergeGuestCart();

  return { token, user };
}

export async function customerRegister({ email, password, firstName, lastName, phone }) {
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];

  const res = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: fullName,
      phoneNumber: cleanPhone,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const detailMsg = data.details && typeof data.details === 'object'
      ? Object.values(data.details).join('. ')
      : null;
    throw new Error(detailMsg || data.message || 'Registration failed');
  }

  // Unpack sendSuccess envelope
  const payload = data.data || data;
  const token = payload.token || payload.accessToken;
  const rawUser = payload.user || payload.customer || {};

  if (!token) {
    throw new Error(data.message || 'Registration succeeded but no token was provided.');
  }

  const user = normalizeCustomerUser(rawUser, { firstName, lastName, phone: cleanPhone });

  setCustomerToken(token);
  setCustomerUser(user);
  await mergeGuestCart();

  return { token, user };
}

export function customerLogout() {
  setCustomerToken(null);
  setCustomerUser(null);
}

export async function fetchCustomerProfile() {
  const token = getCustomerToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/v1/customers/me`, {
    headers: getStorefrontHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      customerLogout();
    }
    throw new Error(`Profile fetch failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  const payload = data.data || data;
  const rawUser = payload.customer || payload.user || payload;
  const user = normalizeCustomerUser(rawUser);

  if (user) {
    setCustomerUser(user);
  }
  return user;
}

export async function updateCustomerProfile(profileData) {
  const res = await fetch(`${API_BASE_URL}/v1/customers/me`, {
    method: 'PUT',
    headers: getStorefrontHeaders(),
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update profile');
  }
  const payload = data.data || data;
  const rawUser = payload.customer || payload.user || payload;
  const user = normalizeCustomerUser(rawUser, profileData);
  if (user) {
    setCustomerUser(user);
  }
  return user;
}

export async function changeCustomerPassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE_URL}/v1/customers/me/change-password`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Password update failed');
  }
  return data.data || data;
}

// -------------------------------------------------------------
// CUSTOMER ADDRESS APIS
// -------------------------------------------------------------

export async function fetchAddresses() {
  const token = getCustomerToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/v1/customers/me/addresses`, {
      headers: getStorefrontHeaders(),
    });
    if (!res.ok) {
      console.warn(`[StorefrontService] fetchAddresses returned HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const payload = data.data || data;
    const addrs = payload.addresses || (Array.isArray(payload) ? payload : []);
    return Array.isArray(addrs) ? addrs : [];
  } catch (err) {
    console.warn('[StorefrontService] fetchAddresses network error:', err);
    return [];
  }
}

export async function createAddress(addressData) {
  const res = await fetch(`${API_BASE_URL}/v1/customers/me/addresses`, {
    method: 'POST',
    headers: getStorefrontHeaders(),
    body: JSON.stringify(addressData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create address');
  }
  const payload = data.data || data;
  return payload.address || payload;
}

export async function updateAddress(id, addressData) {
  const res = await fetch(`${API_BASE_URL}/v1/customers/me/addresses/${id}`, {
    method: 'PUT',
    headers: getStorefrontHeaders(),
    body: JSON.stringify(addressData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update address');
  }
  const payload = data.data || data;
  return payload.address || payload;
}

export async function deleteAddress(id) {
  const res = await fetch(`${API_BASE_URL}/v1/customers/me/addresses/${id}`, {
    method: 'DELETE',
    headers: getStorefrontHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete address');
  }
  return true;
}
