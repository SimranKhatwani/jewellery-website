import React, { useState, useEffect, useCallback } from 'react';
import { PRODUCTS } from './data/products';
import { Product } from './types/jewellery';
import { Header } from './components/Header';
import { CampaignHeroVideo } from './components/CampaignHeroVideo';
import { HandDrawnBenefitsBanner } from './components/HandDrawnBenefitsBanner';
import { RingsSection } from './components/RingsSection';
import { ShopByCategory } from './components/ShopByCategory';
import { AnkletsSection } from './components/AnkletsSection';
import { BestsellersSection } from './components/BestsellersSection';
import { NewArrivalsSection } from './components/NewArrivalsSection';
import { BrandStorySection } from './components/BrandStorySection';
import { ContactSection } from './components/ContactSection';
import { ProductDetailPage } from './components/ProductDetailPage';
import { SearchModal } from './components/SearchModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SizeGuideModal } from './components/SizeGuideModal';
import { Footer } from './components/Footer';
import { AdminApp } from './admin/AdminApp';
import { getPublishedProducts, subscribeCatalogueChanges } from './services/productService';

export default function App() {
  // Determine if user is accessing Admin Panel via /admin or #admin
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash.startsWith('#admin')
    );
  });

  // Dynamic products state fetched from MongoDB backend API (with local catalogue fallback)
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  // Selected product for PDP view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Wishlist state (persisted to localStorage)
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aurelle_wishlist_ids');
      return saved ? JSON.parse(saved) : ['ring-01', 'anklet-01'];
    } catch {
      return ['ring-01', 'anklet-01'];
    }
  });

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [sizeGuideCategory, setSizeGuideCategory] = useState<'rings' | 'anklets' | null>(null);

  // Synchronize route changes for /admin and #admin
  useEffect(() => {
    const handleRouteCheck = () => {
      const isCurrentlyAdmin =
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin');
      setIsAdminView(isCurrentlyAdmin);
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

  // Synchronize Wishlist with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aurelle_wishlist_ids', JSON.stringify(wishlistIds));
    } catch {
      // ignore storage failure
    }
  }, [wishlistIds]);

  // Handle URL hash changes for deep linking (e.g. #product/sculpted-molten-band)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#product/')) {
        const slug = hash.replace('#product/', '');
        const found = products.find((p) => p.slug === slug || p.id === slug);
        if (found) {
          setSelectedProduct(found);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (!hash || hash === '#') {
        setSelectedProduct(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [products]);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    window.location.hash = `product/${product.slug}`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleBackToCatalogue = useCallback(() => {
    setSelectedProduct(null);
    window.history.pushState(null, '', window.location.pathname);
  }, []);

  const handleToggleWishlist = useCallback((productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const handleRemoveFromWishlist = useCallback((productId: string) => {
    setWishlistIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const handleExploreHeroTarget = (target: 'rings' | 'anklets' | 'bestsellers') => {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    if (selectedProduct) {
      handleBackToCatalogue();
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Exit Admin Panel handler
  const handleExitAdmin = () => {
    setIsAdminView(false);
    window.location.hash = '';
    window.history.pushState(null, '', '/');
  };

  // Render Admin Panel if on /admin route
  if (isAdminView) {
    return <AdminApp onExitAdmin={handleExitAdmin} />;
  }

  // Filter products by category for public catalogue
  const rings = products.filter((p) => p.category === 'rings');
  const anklets = products.filter((p) => p.category === 'anklets');

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#593D30] selection:bg-[#A85F49] selection:text-[#FFFFFF]">
      {/* 1 & 2. Announcement Strip & Minimal Navigation Header */}
      <Header
        wishlistCount={wishlistIds.length}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateHome={handleBackToCatalogue}
        onNavigateCategory={(cat) => {
          if (selectedProduct) handleBackToCatalogue();
          setTimeout(() => {
            const el = document.getElementById(cat);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onNavigateSection={handleNavigateSection}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {selectedProduct ? (
          <ProductDetailPage
            product={selectedProduct}
            allProducts={products}
            onBack={handleBackToCatalogue}
            onSelectProduct={handleSelectProduct}
            isWishlisted={wishlistIds.includes(selectedProduct.id)}
            onToggleWishlist={handleToggleWishlist}
            onOpenSizeGuide={(cat) => setSizeGuideCategory(cat)}
          />
        ) : (
          <>
            {/* 3. Integrated Luxury Jewellery Campaign Video Hero */}
            <CampaignHeroVideo onExploreClick={handleExploreHeroTarget} />

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
          if (selectedProduct) handleBackToCatalogue();
          setTimeout(() => {
            document.getElementById(cat)?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onOpenSizeGuide={(cat) => setSizeGuideCategory(cat)}
        onNavigateSection={handleNavigateSection}
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
    </div>
  );
}
