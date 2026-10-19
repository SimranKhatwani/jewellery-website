import { PRODUCTS } from '../data/products';
import { Product } from '../types/jewellery';

function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}

const API_BASE_URL = getApiBaseUrl();

export interface CatalogueResponse {
  products: Product[];
  isApiLive: boolean;
  total: number;
}

export interface CategoryItem {
  id?: string;
  name: string;
  slug: string;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Fetch all published products from backend API with local dataset fallback
 */
export async function getPublishedProducts(): Promise<CatalogueResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/products?limit=100`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
      return {
        products: data.products.map(formatProduct),
        isApiLive: true,
        total: data.total || data.products.length,
      };
    }

    // If server responded with empty products list, fallback to static products
    return {
      products: PRODUCTS,
      isApiLive: true,
      total: PRODUCTS.length,
    };
  } catch (err) {
    console.warn('[Aurelle API] Backend unreachable or database initializing, using local catalogue fallback:', err);
    return {
      products: PRODUCTS,
      isApiLive: false,
      total: PRODUCTS.length,
    };
  }
}

/**
 * Fetch a single product by its slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.product) {
        return formatProduct(data.product);
      }
    }
  } catch {
    // ignore network error and check static dataset
  }

  const staticMatch = PRODUCTS.find((p) => p.slug === slug || p.id === slug);
  return staticMatch || null;
}

/**
 * Fetch categories
 */
export async function getCategories(): Promise<CategoryItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories;
      }
    }
  } catch {
    // fallback
  }

  return [
    { name: 'Rings', slug: 'rings', displayOrder: 1, isActive: true },
    { name: 'Anklets', slug: 'anklets', displayOrder: 2, isActive: true },
  ];
}

/**
 * Resolve relative media URLs (like /api/media/...) to full backend URLs if VITE_API_BASE_URL is remote
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/api/')) {
    const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!raw || raw === '/api') return url;
    const backendOrigin = raw.replace(/\/api$/, '');
    return backendOrigin ? `${backendOrigin}${url}` : url;
  }
  return url;
}

/**
 * Normalise product objects coming from backend or MongoDB
 */
function formatProduct(raw: any): Product {
  const canonicalId = raw.slug || raw.id || (raw._id ? String(raw._id) : '');
  return {
    id: canonicalId,
    _id: raw._id,
    slug: raw.slug || canonicalId,
    name: raw.name,
    category: raw.category,
    priceUSD: Number(raw.priceUSD) || 0,
    subtitle: raw.subtitle || '',
    description: raw.description || '',
    editorialQuote: raw.editorialQuote || '',
    isBestseller: Boolean(raw.isBestseller),
    isNewArrival: Boolean(raw.isNewArrival),
    isPublished: raw.isPublished !== undefined ? Boolean(raw.isPublished) : true,
    displayOrder: raw.displayOrder || 0,
    inStock: raw.inStock !== false,
    sku: raw.sku || '',
    primaryImage: resolveMediaUrl(raw.primaryImage),
    secondaryImage: resolveMediaUrl(raw.secondaryImage),
    detailImage: resolveMediaUrl(raw.detailImage),
    lifestyleImage: resolveMediaUrl(raw.lifestyleImage),
    options: raw.options || {
      type: 'size',
      name: 'Available Size',
      values: ['US 6', 'US 7', 'US 8'],
      default: 'US 7',
    },
    finishes: Array.isArray(raw.finishes) ? raw.finishes : ['High Polish Silver'],
    specifications: raw.specifications || {
      purity: 'Solid 925 Sterling Silver',
      hallmark: 'Laser-engraved 925 authenticity hallmark',
      finish: 'Mirror polished',
      weight: '8.0 grams',
      dimensions: 'Standard fit',
      hypoallergenic: '100% Nickel-free',
      protection: 'Protective rhodium barrier',
    },
    careInstructions: Array.isArray(raw.careInstructions)
      ? raw.careInstructions
      : ['Wipe gently with microfibre cloth after wear.'],
    stockistInquiryAvailable: raw.stockistInquiryAvailable !== false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// Global event bus for instantaneous catalogue re-renders upon admin edits
export function notifyCatalogueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aurelle_catalogue_updated'));
  }
}

export function subscribeCatalogueChanges(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('aurelle_catalogue_updated', callback);
  return () => {
    window.removeEventListener('aurelle_catalogue_updated', callback);
  };
}

// Legacy static ID mappings to canonical slugs
export const LEGACY_WISHLIST_MAP: Record<string, string> = {
  'ring-01': 'sculpted-molten-band',
  'ring-02': 'wave-contour-ring',
  'ring-03': 'architectural-signet-ring',
  'ring-04': 'caldera-statement-band',
  'anklet-01': 'fluid-curb-chain-anklet',
  'anklet-02': 'polished-teardrop-clasp-anklet',
  'anklet-03': 'liquid-snake-ribbon-anklet',
  'anklet-04': 'orbit-satellite-beaded-anklet',
};

/**
 * Checks whether a product is in the wishlist array, robustly matching
 * canonical slug, id, mongo _id, or legacy static IDs.
 */
export function isProductWishlisted(product: Product, wishlistIds: string[]): boolean {
  if (!product || !Array.isArray(wishlistIds) || wishlistIds.length === 0) return false;
  const id = product.id;
  const slug = product.slug;
  const _id = product._id ? String(product._id) : undefined;

  return wishlistIds.some((storedId) => {
    if (storedId === id || (slug && storedId === slug) || (_id && storedId === _id)) {
      return true;
    }
    const mapped = LEGACY_WISHLIST_MAP[storedId];
    if (mapped && (mapped === slug || mapped === id)) {
      return true;
    }
    return false;
  });
}

/**
 * Normalizes a list of wishlist IDs against the active products:
 * 1. Converts legacy IDs (e.g. 'ring-01') to canonical slugs ('sculpted-molten-band')
 * 2. Prunes phantom/orphaned IDs that don't match any product in the catalogue
 * 3. Deduplicates IDs
 */
export function normalizeWishlistIds(products: Product[], wishlistIds: string[]): string[] {
  if (!Array.isArray(products) || products.length === 0 || !Array.isArray(wishlistIds)) {
    return wishlistIds || [];
  }

  const matchedSlugs = new Set<string>();

  for (const product of products) {
    if (isProductWishlisted(product, wishlistIds)) {
      matchedSlugs.add(product.slug || product.id);
    }
  }

  return Array.from(matchedSlugs);
}
