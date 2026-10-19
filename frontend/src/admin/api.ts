import { Product } from '../types/jewellery';

function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = 'aurelle_admin_token';
const ADMIN_USER_KEY = 'aurelle_admin_user';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLogin?: string;
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminAuth(token: string, admin: AdminUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
  } catch {
    // ignore storage error
  }
}

export function clearAdminAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  } catch {
    // ignore
  }
}

export function getStoredAdminUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
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
export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; admin?: AdminUser; message?: string }> {
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
  } catch (err: any) {
    return {
      success: false,
      message:
        err?.message?.includes('Failed to fetch') || err?.name === 'TypeError'
          ? 'Unable to connect to backend server. If deployed on Render free tier, it may take 30–50 seconds to wake up from idle on the first request. Please wait 30 seconds and try again.'
          : err?.message || 'Network error connecting to backend server.',
    };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await authFetch('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  } finally {
    clearAdminAuth();
  }
}

export async function checkAdminSession(): Promise<AdminUser | null> {
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
export async function getAdminProducts(): Promise<Product[]> {
  const res = await authFetch('/products/admin/all');
  if (!res.ok) {
    throw new Error(`Failed to load products: ${res.statusText}`);
  }
  const data = await res.json();
  return data.products || [];
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
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

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
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

export async function deleteProduct(id: string): Promise<void> {
  const res = await authFetch(`/products/${id}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete product');
  }
}

export async function toggleProductPublish(id: string): Promise<boolean> {
  const res = await authFetch(`/products/${id}/toggle-publish`, {
    method: 'PATCH',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to toggle product status');
  }
  return data.isPublished;
}

// ----------------- Media Upload API -----------------
export async function uploadMediaImage(file: File): Promise<{ url: string; id: string; filename: string }> {
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
export async function getAdminCategories(): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/categories`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.categories || [];
}

export async function createAdminCategory(payload: { name: string; slug?: string; displayOrder?: number }): Promise<any> {
  const res = await authFetch('/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create category');
  }
  return data.category;
}
