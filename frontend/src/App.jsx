import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PRODUCTS } from './data/products';
import { Header } from './components/Header';
import { RotatingRingHero } from './components/RotatingRingHero';
import { HandDrawnBenefitsBanner } from './components/HandDrawnBenefitsBanner';
import { RingsSection } from './components/RingsSection';
import { ShopByCategory } from './components/ShopByCategory';
import { AnkletsSection } from './components/AnkletsSection';
import { DynamicCategorySection } from './components/DynamicCategorySection';
import { getStoredCategories } from './admin/api';
import { BestsellersSection } from './components/BestsellersSection';
import { NewArrivalsSection } from './components/NewArrivalsSection';
import { BrandStorySection } from './components/BrandStorySection';
import { ContactSection } from './components/ContactSection';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ReturnPolicyPage } from './components/ReturnPolicyPage';
import { SearchModal } from './components/SearchModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SizeGuideModal } from './components/SizeGuideModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutPreviewModal } from './components/CheckoutPreviewModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { Footer } from './components/Footer';

// Code-splitting: Lazily load Admin and Super Admin suites to minimize initial storefront bundle
const AdminApp = React.lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })));
const SuperAdminApp = React.lazy(() => import('./superadmin/SuperAdminApp').then((m) => ({ default: m.SuperAdminApp })));

function AdminLoadingFallback({ label = 'Loading workspace...' }) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-stone-800">
      <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4" />
      <p className="text-xs uppercase tracking-widest font-serif text-stone-600">{label}</p>
    </div>
  );
}
import {
  fetchCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  validateCoupon,
  getCustomerUser,
  fetchStoreInfo,
  getStoreSlug,
} from './services/storefrontService';
import {
  getPublishedProducts,
  subscribeCatalogueChanges,
  isProductWishlisted,
  normalizeWishlistIds,
  LEGACY_WISHLIST_MAP,
} from './services/productService';

// Route detection helpers for Store Admin (/admin) and Super Admin (/sa)
const checkIsSuperAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path === '/sa' ||
    path.startsWith('/sa/') ||
    hash === '#sa' ||
    hash.startsWith('#sa/') ||
    path === '/superadmin' ||
    path.startsWith('/superadmin/') ||
    hash === '#superadmin' ||
    hash.startsWith('#superadmin/')
  );
};

const checkIsAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    hash === '#admin' ||
    hash.startsWith('#admin/')
  );
};

export default function App() {
  // Determine if user is accessing Super Admin Console via /sa or #sa
  const [isSuperAdminView, setIsSuperAdminView] = useState(checkIsSuperAdminRoute);

  // Determine if user is accessing Store Admin Panel via /admin or #admin
  const [isAdminView, setIsAdminView] = useState(checkIsAdminRoute);

  // State for Return Policy separate page view
  const [isReturnPolicyView, setIsReturnPolicyView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash === '#return-policy';
  });

  // Dynamic store configuration & tenant identity state
  const [storeInfo, setStoreInfo] = useState(null);
  const [isStoreNotFound, setIsStoreNotFound] = useState(false);

  // Dynamic products state fetched from MongoDB backend API (scoped to active tenant)
  const [products, setProducts] = useState(() => {
    const slug = getStoreSlug();
    return slug === 'aurelle' ? PRODUCTS : [];
  });

  // Selected product for PDP view
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Wishlist state (persisted to localStorage)
  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = localStorage.getItem('aurelle_wishlist_ids');
      return saved ? JSON.parse(saved) : ['sculpted-molten-band', 'fluid-curb-chain-anklet'];
    } catch {
      return ['sculpted-molten-band', 'fluid-curb-chain-anklet'];
    }
  });

  // Dynamically compute wishlisted products from the currently loaded catalogue
  const wishlistedProducts = useMemo(() => {
    return products.filter((p) => isProductWishlisted(p, wishlistIds));
  }, [products, wishlistIds]);

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [sizeGuideCategory, setSizeGuideCategory] = useState(null);

  // Phase 4: Cart and Customer E-Commerce states
  const [cart, setCart] = useState({ items: [], subtotal: 0, totalItems: 0 });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutPreviewOpen, setIsCheckoutPreviewOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [customerUser, setCustomerUser] = useState(getCustomerUser);

  // Refresh cart from backend
  const refreshCart = useCallback(async () => {
    try {
      const c = await fetchCart();
      if (c && Array.isArray(c.items)) {
        setCart(c);
      }
    } catch (err) {
      console.warn('[Cart] Failed to load cart:', err);
    }
  }, []);

  const loadStoreContext = useCallback(async () => {
    try {
      setIsStoreNotFound(false);
      const store = await fetchStoreInfo();
      if (store) {
        setStoreInfo(store);
        if (store.status === 'suspended') {
          setIsStoreNotFound(true);
        }
        if (store.name && typeof document !== 'undefined') {
          document.title = store.settings?.seo?.title || `${store.name} | Fine Jewellery`;
        }
      } else {
        const slug = getStoreSlug();
        if (slug !== 'aurelle') {
          setIsStoreNotFound(true);
        }
      }
    } catch (err) {
      console.warn('[Storefront] Could not load store info:', err);
    }
  }, []);

  const [, setCurrencyTick] = useState(0);

  // Fetch catalogue from backend API and subscribe to live admin updates
  const refreshCatalogue = useCallback(async () => {
    try {
      const res = await getPublishedProducts();
      if (res && Array.isArray(res.products)) {
        setProducts(res.products);
      }
    } catch (err) {
      console.warn('[Storefront] Failed to load backend products:', err);
    }
  }, []);

  useEffect(() => {
    loadStoreContext();
    refreshCatalogue();
    refreshCart();

    const handleCurrencyChange = () => {
      setCurrencyTick((t) => t + 1);
    };
    window.addEventListener('aurelle_currency_updated', handleCurrencyChange);
    return () => window.removeEventListener('aurelle_currency_updated', handleCurrencyChange);
  }, [loadStoreContext, refreshCatalogue, refreshCart]);

  // Cart action handlers
  const handleAddToCart = useCallback(async ({ product, selectedOption, selectedFinish, quantity }) => {
    const productId = product._id || product.id;
    const selectedOptions = {
      ...(selectedOption ? { size: selectedOption } : {}),
      ...(selectedFinish ? { finish: selectedFinish } : {}),
    };
    try {
      const updatedCart = await addToCart({
        productId,
        sku: product.sku,
        selectedOptions,
        quantity,
      });
      if (updatedCart) {
        setCart(updatedCart);
      } else {
        await refreshCart();
      }
      setIsCartOpen(true);
    } catch (err) {
      alert(err.message || 'Could not add piece to cart');
    }
  }, [refreshCart]);

  const handleUpdateCartQuantity = useCallback(async (itemId, quantity) => {
    try {
      const updatedCart = await updateCartItemQuantity(itemId, quantity);
      if (updatedCart) setCart(updatedCart);
      else await refreshCart();
    } catch (err) {
      console.warn('Update quantity failed:', err);
    }
  }, [refreshCart]);

  const handleRemoveCartItem = useCallback(async (itemId) => {
    try {
      const updatedCart = await removeCartItem(itemId);
      if (updatedCart) setCart(updatedCart);
      else await refreshCart();
    } catch (err) {
      console.warn('Remove item failed:', err);
    }
  }, [refreshCart]);

  const handleClearCart = useCallback(async () => {
    try {
      await clearCart();
      setCart({ items: [], subtotal: 0, totalItems: 0 });
      setAppliedCoupon(null);
    } catch (err) {
      console.warn('Clear cart failed:', err);
    }
  }, []);

  const handleApplyCoupon = useCallback(async (code) => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(code, cart.subtotal);
      if (res.valid) {
        setAppliedCoupon({
          code: res.code,
          discountAmount: res.discountAmount,
          discountType: res.discountType,
          discountValue: res.discountValue,
        });
      } else {
        setCouponError(res.message || 'Invalid coupon');
      }
    } catch (err) {
      setCouponError(err.message || 'Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  }, [cart.subtotal]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, []);

  const handleCustomerLoginSuccess = useCallback(async (user) => {
    setCustomerUser(user);
    await refreshCart();
  }, [refreshCart]);

  const handleCustomerLogout = useCallback(async () => {
    setCustomerUser(null);
    await refreshCart();
  }, [refreshCart]);

  // Synchronize route changes for /admin, #admin, /sa, #sa, and direct store slug paths
  useEffect(() => {
    let lastSlug = getStoreSlug();

    const handleRouteCheck = () => {
      setIsSuperAdminView(checkIsSuperAdminRoute());
      setIsAdminView(checkIsAdminRoute());

      const currentSlug = getStoreSlug();
      if (currentSlug !== lastSlug) {
        lastSlug = currentSlug;
        loadStoreContext();
        refreshCatalogue();
        refreshCart();
      }
    };

    window.addEventListener('popstate', handleRouteCheck);
    window.addEventListener('hashchange', handleRouteCheck);
    return () => {
      window.removeEventListener('popstate', handleRouteCheck);
      window.removeEventListener('hashchange', handleRouteCheck);
    };
  }, [loadStoreContext, refreshCatalogue, refreshCart]);

  useEffect(() => {
    const unsubscribe = subscribeCatalogueChanges(() => {
      refreshCatalogue();
    });
    return unsubscribe;
  }, [refreshCatalogue]);

  // Clean and harmonize any legacy or orphaned IDs in wishlist on load
  useEffect(() => {
    if (products.length > 0 && wishlistIds.length > 0) {
      const normalized = normalizeWishlistIds(products, wishlistIds);
      if (
        normalized.length !== wishlistIds.length ||
        !normalized.every((id) => wishlistIds.includes(id))
      ) {
        setWishlistIds(normalized);
      }
    }
  }, [products]);

  // Synchronize Wishlist with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aurelle_wishlist_ids', JSON.stringify(wishlistIds));
    } catch {
      // ignore storage failure
    }
  }, [wishlistIds]);

  // Handle URL hash changes for deep linking (e.g. #product/sculpted-molten-band or #return-policy)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#return-policy') {
        setIsReturnPolicyView(true);
        setSelectedProduct(null);
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (hash.startsWith('#product/')) {
        setIsReturnPolicyView(false);
        const slug = hash.replace('#product/', '');
        const found = products.find((p) => p.slug === slug || p.id === slug);
        if (found) {
          setSelectedProduct(found);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (!hash || hash === '#') {
        setIsReturnPolicyView(false);
        setSelectedProduct(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [products]);

  const handleSelectProduct = useCallback((product) => {
    setIsReturnPolicyView(false);
    setSelectedProduct(product);
    window.location.hash = `product/${product.slug}`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleBackToCatalogue = useCallback(() => {
    setSelectedProduct(null);
    setIsReturnPolicyView(false);
    window.history.pushState(null, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenReturnPolicy = useCallback(() => {
    setSelectedProduct(null);
    setIsReturnPolicyView(true);
    window.location.hash = 'return-policy';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleToggleWishlist = useCallback((productId, e) => {
    e.stopPropagation();
    const targetProduct = products.find(
      (p) => p.id === productId || p.slug === productId || String(p._id) === productId
    );
    const canonicalId = targetProduct?.slug || targetProduct?.id || productId;
    const isCurrentlySaved = targetProduct
      ? isProductWishlisted(targetProduct, wishlistIds)
      : wishlistIds.includes(canonicalId);

    setWishlistIds((prev) => {
      if (isCurrentlySaved) {
        return prev.filter((id) => {
          if (id === canonicalId) return false;
          if (targetProduct && (id === targetProduct.id || id === targetProduct.slug || String(targetProduct._id) === id)) return false;
          if (targetProduct && LEGACY_WISHLIST_MAP[id] === targetProduct.slug) return false;
          return true;
        });
      } else {
        return [...prev.filter((id) => id !== canonicalId), canonicalId];
      }
    });
  }, [products, wishlistIds]);

  const handleRemoveFromWishlist = useCallback((productId) => {
    const targetProduct = products.find(
      (p) => p.id === productId || p.slug === productId || String(p._id) === productId
    );
    const canonicalId = targetProduct?.slug || targetProduct?.id || productId;

    setWishlistIds((prev) =>
      prev.filter((id) => {
        if (id === canonicalId) return false;
        if (targetProduct && (id === targetProduct.id || id === targetProduct.slug || String(targetProduct._id) === id)) return false;
        if (targetProduct && LEGACY_WISHLIST_MAP[id] === targetProduct.slug) return false;
        return true;
      })
    );
  }, [products]);

  const handleExploreHeroTarget = (target) => {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateSection = (sectionId) => {
    if (selectedProduct || isReturnPolicyView) {
      handleBackToCatalogue();
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Exit Super Admin Console handler
  const handleExitSuperAdmin = () => {
    setIsSuperAdminView(false);
    window.location.hash = '';
    window.history.pushState(null, '', '/');
  };

  // Exit Admin Panel handler
  const handleExitAdmin = (targetSlug) => {
    setIsAdminView(false);
    window.location.hash = '';
    const slug = targetSlug || localStorage.getItem('aurelle_store_slug') || 'aurelle';
    try {
      localStorage.setItem('aurelle_store_slug', slug);
    } catch {
      // ignore
    }
    window.history.pushState(null, '', `/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Render Super Admin Console if on /sa or #sa route
  if (isSuperAdminView) {
    return (
      <React.Suspense fallback={<AdminLoadingFallback label="Loading Super Admin Console..." />}>
        <SuperAdminApp onExitSuperAdmin={handleExitSuperAdmin} />
      </React.Suspense>
    );
  }

  // Render Admin Panel if on /admin route
  if (isAdminView) {
    return (
      <React.Suspense fallback={<AdminLoadingFallback label="Loading Store Admin Workspace..." />}>
        <AdminApp onExitAdmin={handleExitAdmin} />
      </React.Suspense>
    );
  }

  // Render Store Unavailable if store does not exist or is suspended
  if (isStoreNotFound) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center text-[#593D30]">
        <div className="max-w-md p-8 bg-white border border-[#D7C5AF]/60 rounded-xs shadow-xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF7F2] border border-[#D7C5AF] flex items-center justify-center text-[#A85F49]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl">Store Unavailable</h2>
          <p className="text-xs text-[#8E8172] leading-relaxed">
            The requested store (/<code>{getStoreSlug()}</code>) is either inactive, suspended, or does not exist on this platform.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.setItem('aurelle_store_slug', 'aurelle');
              } catch {}
              window.history.pushState(null, '', '/aurelle');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="px-5 py-2.5 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-xs text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer"
          >
            Return to Platform Storefront
          </button>
        </div>
      </div>
    );
  }

  // Filter products by category for public catalogue
  const rings = useMemo(() => products.filter((p) => p.category === 'rings'), [products]);
  const anklets = useMemo(() => products.filter((p) => p.category === 'anklets'), [products]);

  // Dynamic products grouped by category
  const productsByCategory = useMemo(() => {
    const groups = {};
    products.forEach((p) => {
      const cat = p.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products]);

  // Compute dynamic category navigation items for Header & ShopByCategory
  const categoryNavItems = useMemo(() => {
    const counts = {};
    const firstProductMap = {};

    products.forEach((p) => {
      const cat = p.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
      if (!firstProductMap[cat] && p.primaryImage) {
        firstProductMap[cat] = p.primaryImage;
      }
    });

    const labelMap = {
      rings: 'Silver Rings',
      anklets: 'Silver Anklets',
      earrings: 'Silver Earrings',
      necklaces: 'Silver Necklaces',
      bracelets: 'Silver Bracelets',
      pendants: 'Silver Pendants',
    };

    try {
      const stored = getStoredCategories();
      stored.forEach((s) => {
        if (s.value && s.label) labelMap[s.value] = s.label;
      });
    } catch {
      // fallback
    }

    // Include all categories present in products plus core defaults
    const allCatSlugs = Array.from(
      new Set(['rings', 'anklets', 'earrings', ...Object.keys(counts)])
    );

    return allCatSlugs.map((slug) => ({
      slug,
      label: labelMap[slug] || (slug.charAt(0).toUpperCase() + slug.slice(1)),
      count: counts[slug] || 0,
      image: firstProductMap[slug] || '',
    }));
  }, [products]);

  // Non-ring, non-anklet categories that have products to display
  const otherCategories = useMemo(() => {
    return Object.keys(productsByCategory).filter(
      (cat) => cat !== 'rings' && cat !== 'anklets'
    );
  }, [productsByCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#593D30] selection:bg-[#A85F49] selection:text-[#FFFFFF] overflow-x-hidden">
      {/* 1 & 2. Announcement Strip & Minimal Navigation Header */}
      <Header
        storeInfo={storeInfo}
        wishlistCount={wishlistedProducts.length}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        cartCount={cart.totalItems || cart.items.reduce((s, it) => s + it.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        customerUser={customerUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateHome={handleBackToCatalogue}
        onNavigateCategory={(cat) => {
          if (selectedProduct || isReturnPolicyView) handleBackToCatalogue();
          setTimeout(() => {
            const targetId = cat === 'all' ? 'rings' : cat;
            const el = document.getElementById(targetId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }
          }, 120);
        }}
        onNavigateSection={handleNavigateSection}
        categories={categoryNavItems}
        allProductsCount={products.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isReturnPolicyView ? (
          <ReturnPolicyPage onBack={handleBackToCatalogue} />
        ) : selectedProduct ? (
          <ProductDetailPage
            product={selectedProduct}
            allProducts={products}
            onBack={handleBackToCatalogue}
            onSelectProduct={handleSelectProduct}
            isWishlisted={isProductWishlisted(selectedProduct, wishlistIds)}
            onToggleWishlist={handleToggleWishlist}
            onOpenSizeGuide={(cat) => setSizeGuideCategory(cat)}
            onAddToCart={handleAddToCart}
          />
        ) : (
          <>
            {/* 3. Realistic 3D Rotating Silver Solitaire Ring Hero / Custom Banner */}
            <RotatingRingHero storeInfo={storeInfo} onExploreClick={handleExploreHeroTarget} />

            {/* 4. Hand-drawn benefits banner (placed immediately below hero slideshow) */}
            <HandDrawnBenefitsBanner />

            {/* If the store currently has 0 published products, display an elegant curated notice */}
            {products.length === 0 && (
              <div className="py-20 px-6 text-center max-w-lg mx-auto space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF7F2] border border-[#D7C5AF] flex items-center justify-center text-[#A85F49]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl text-[#593D30]">Curating New Creations</h3>
                <p className="text-xs text-[#8E8172] font-light leading-relaxed">
                  {storeInfo?.name || 'This store'} has not published any pieces yet. Check back shortly or contact our atelier directly.
                </p>
              </div>
            )}

            {/* 5. Featured silver rings collection */}
            {rings.length > 0 && (
              <RingsSection
                rings={rings}
                onSelectProduct={handleSelectProduct}
                wishlistIds={wishlistIds}
                onToggleWishlist={handleToggleWishlist}
              />
            )}

            {/* 6. Dynamic Category Sections (Earrings, Necklaces, and future added categories) */}
            {otherCategories.map((catKey) => {
              const catItem = categoryNavItems.find((c) => c.slug === catKey);
              const label = catItem?.label || (catKey.charAt(0).toUpperCase() + catKey.slice(1));
              return (
                <DynamicCategorySection
                  key={catKey}
                  categoryKey={catKey}
                  title={label}
                  products={productsByCategory[catKey]}
                  onSelectProduct={handleSelectProduct}
                  wishlistIds={wishlistIds}
                  onToggleWishlist={handleToggleWishlist}
                />
              );
            })}

            {/* 7. Shop by category */}
            {products.length > 0 && (
              <ShopByCategory
                onSelectCategory={(cat) => {
                  const targetId = cat === 'all' ? 'rings' : cat;
                  const el = document.getElementById(targetId);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                ringCount={rings.length}
                ankletCount={anklets.length}
                categories={categoryNavItems}
                products={products}
              />
            )}

            {/* 8. Silver anklets collection */}
            {anklets.length > 0 && (
              <AnkletsSection
                anklets={anklets}
                onSelectProduct={handleSelectProduct}
                wishlistIds={wishlistIds}
                onToggleWishlist={handleToggleWishlist}
              />
            )}

            {/* 8. Curated Bestsellers & New arrivals */}
            {products.some((p) => p.isBestseller) && (
              <BestsellersSection
                products={products}
                onSelectProduct={handleSelectProduct}
                wishlistIds={wishlistIds}
                onToggleWishlist={handleToggleWishlist}
              />
            )}

            {products.some((p) => p.isNewArrival) && (
              <NewArrivalsSection
                products={products}
                onSelectProduct={handleSelectProduct}
                wishlistIds={wishlistIds}
                onToggleWishlist={handleToggleWishlist}
              />
            )}

            {/* 9. Brand story & purchasing channels */}
            <BrandStorySection storeInfo={storeInfo} />
            <ContactSection storeInfo={storeInfo} />
          </>
        )}
      </main>

      {/* 10. Footer */}
      <Footer
        storeInfo={storeInfo}
        onNavigateCategory={(cat) => {
          if (selectedProduct || isReturnPolicyView) handleBackToCatalogue();
          setTimeout(() => {
            document.getElementById(cat)?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onOpenSizeGuide={(cat) => setSizeGuideCategory(cat)}
        onNavigateSection={handleNavigateSection}
        onOpenReturnPolicy={handleOpenReturnPolicy}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        onSelectProduct={handleSelectProduct}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistIds={wishlistIds}
        products={products}
        onSelectProduct={handleSelectProduct}
        onRemoveFromWishlist={handleRemoveFromWishlist}
      />

      {/* Sizing Guide Modal */}
      <SizeGuideModal
        isOpen={!!sizeGuideCategory}
        category={sizeGuideCategory || 'rings'}
        onClose={() => setSizeGuideCategory(null)}
      />

      {/* Shopping Bag / Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutPreviewOpen(true);
        }}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onSelectProduct={handleSelectProduct}
        allProducts={products}
      />

      {/* Checkout Preview & Stock Verification Modal */}
      <CheckoutPreviewModal
        isOpen={isCheckoutPreviewOpen}
        onClose={() => setIsCheckoutPreviewOpen(false)}
        cart={cart}
        appliedCoupon={appliedCoupon}
        customerUser={customerUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        allProducts={products}
        onOrderPlaced={() => {
          refreshCart();
          setAppliedCoupon(null);
        }}
      />

      {/* Customer Authentication Modal (Login / Register) */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleCustomerLoginSuccess}
      />

      {/* Customer Profile & Address Book Modal */}
      <CustomerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        customerUser={customerUser}
        onUserUpdated={(u) => setCustomerUser(u)}
        onLogout={handleCustomerLogout}
      />
    </div>
  );
}

