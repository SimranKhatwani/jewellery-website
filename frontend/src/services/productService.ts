import { PRODUCTS } from '../data/products';
import { Product } from '../types/jewellery';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

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
 * Normalise product objects coming from backend or MongoDB
 */
function formatProduct(raw: any): Product {
  return {
    id: raw.id || raw.slug || raw._id,
    _id: raw._id,
    slug: raw.slug,
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
    primaryImage: raw.primaryImage || '',
    secondaryImage: raw.secondaryImage || '',
    detailImage: raw.detailImage || '',
    lifestyleImage: raw.lifestyleImage || '',
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
