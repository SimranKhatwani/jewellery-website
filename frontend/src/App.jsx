import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PRODUCTS } from './data/products';
import { Header } from './components/Header';
import { RotatingRingHero } from './components/RotatingRingHero';
import { HandDrawnBenefitsBanner } from './components/HandDrawnBenefitsBanner';
import { RingsSection } from './components/RingsSection';
import { ShopByCategory } from './components/ShopByCategory';
import { AnkletsSection } from './components/AnkletsSection';
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
import { AdminApp } from './admin/AdminApp';
import { SuperAdminApp } from './superadmin/SuperAdminApp';
import {
  fetchCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  validateCoupon,
  getCustomerUser,
  fetchStoreInfo,
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

  // Dynamic products state fetched from MongoDB backend API (with local catalogue fallback)
  const [products, setProducts] = useState(PRODUCTS);

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

  useEffect(() => {
    fetchStoreInfo();
    refreshCart();
  }, [refreshCart]);

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

  // Synchronize route changes for /admin, #admin, /sa, and #sa
  useEffect(() => {
    const handleRouteCheck = () => {
      setIsSuperAdminView(checkIsSuperAdminRoute());
      setIsAdminView(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleRouteCheck);
    window.addEventListener('hashchange', handleRouteCheck);
    return () => {
      window.removeEventListener('popstate', handleRouteCheck);
      window.removeEventListener('hashchange', handleRouteCheck);
    };
  }, []);

  // Fetch catalogue from backend API and subscribe to live admin updates
  const refreshCatalogue = useCallback(async () => {
    try {
      const res = await getPublishedProducts();
      if (res.products && res.products.length > 0) {
        setProducts(res.products);
      }
    } catch (err) {
      console.warn('[Aurelle] Failed to load backend products:', err);
    }
  }, []);

  useEffect(() => {
    refreshCatalogue();
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
  const handleExitAdmin = () => {
    setIsAdminView(false);
    window.location.hash = '';
    window.history.pushState(null, '', '/');
  };

  // Render Super Admin Console if on /sa or #sa route
  if (isSuperAdminView) {
    return <SuperAdminApp onExitSuperAdmin={handleExitSuperAdmin} />;
  }

  // Render Admin Panel if on /admin route
  if (isAdminView) {
    return <AdminApp onExitAdmin={handleExitAdmin} />;
  }

  // Filter products by category for public catalogue
  const rings = products.filter((p) => p.category === 'rings');
  const anklets = products.filter((p) => p.category === 'anklets');

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#593D30] selection:bg-[#A85F49] selection:text-[#FFFFFF] overflow-x-hidden">
      {/* 1 & 2. Announcement Strip & Minimal Navigation Header */}
      <Header
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
            const el = document.getElementById(cat);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onNavigateSection={handleNavigateSection}
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
            {/* 3. Realistic 3D Rotating Silver Solitaire Ring Hero */}
            <RotatingRingHero onExploreClick={handleExploreHeroTarget} />

            {/* 4. Hand-drawn benefits banner (placed immediately below hero slideshow) */}
            <HandDrawnBenefitsBanner />

            {/* 5. Featured silver rings collection */}
            <RingsSection
              rings={rings}
              onSelectProduct={handleSelectProduct}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
            />

            {/* 6. Shop by category */}
            <ShopByCategory
              onSelectCategory={(cat) => {
                const el = document.getElementById(cat === 'all' ? 'rings' : cat);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              ringCount={rings.length}
              ankletCount={anklets.length}
            />

            {/* 7. Silver anklets collection */}
            <AnkletsSection
              anklets={anklets}
              onSelectProduct={handleSelectProduct}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
            />

            {/* 8. Curated Bestsellers & New arrivals */}
            <BestsellersSection
              products={products}
              onSelectProduct={handleSelectProduct}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
            />

            <NewArrivalsSection
              products={products}
              onSelectProduct={handleSelectProduct}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
            />

            {/* 9. Brand story & purchasing channels (RKB Enterprises information) */}
            <BrandStorySection />
            <ContactSection />
          </>
        )}
      </main>

      {/* 10. Footer */}
      <Footer
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

