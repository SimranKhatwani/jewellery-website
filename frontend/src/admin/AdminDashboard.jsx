import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductPublish,
  adminLogout,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  getAdminToken,
  getAdminOrders,
} from './api';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminOverview } from './AdminOverview';
import { CatalogueManager } from './CatalogueManager';
import { OrdersManager } from './OrdersManager';
import { AdminNotificationsView } from './AdminNotificationsView';
import { AdminPlaceholder } from './AdminPlaceholder';
import { notifyCatalogueChanged } from '../services/productService';
import { initSocket } from '../services/socketService';

export const AdminDashboard = ({
  admin,
  onLogout,
  onViewStorefront,
  onGoToSuperAdmin,
}) => {
  // Navigation State with LocalStorage Persistence
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('aurelle_admin_active_tab');
      if (['overview', 'catalogue', 'orders', 'notifications', 'analytics', 'reports'].includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'overview';
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync active tab to localStorage
  const handleSelectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    try {
      localStorage.setItem('aurelle_admin_active_tab', tabId);
    } catch {
      // ignore
    }
  }, []);

  // -------------------------------------------------------------
  // PRODUCTS & CATALOGUE STATE
  // -------------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productErrorMsg, setProductErrorMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // -------------------------------------------------------------
  // ORDERS SUMMARY METRIC
  // -------------------------------------------------------------
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const loadOrdersCount = useCallback(async () => {
    try {
      const data = await getAdminOrders({ limit: 1 });
      if (data.metrics?.pendingOrders !== undefined) {
        setPendingOrdersCount(data.metrics.pendingOrders);
      }
    } catch (err) {
      console.warn('Orders count fetch notice:', err.message);
    }
  }, []);

  // -------------------------------------------------------------
  // IN-APP NOTIFICATIONS & REAL-TIME SOCKET.IO ALERTS
  // -------------------------------------------------------------
  const [adminNotificationsOpen, setAdminNotificationsOpen] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [realtimeToast, setRealtimeToast] = useState(null);

  const loadAdminNotifications = useCallback(async () => {
    try {
      const data = await getAdminNotifications({ limit: 20 });
      setAdminNotifications(data.notifications || []);
      setAdminUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err.message);
    }
  }, []);

  // Real-time WebSocket Order Alerts via Socket.io
  useEffect(() => {
    loadAdminNotifications();
    loadOrdersCount();

    const interval = setInterval(() => {
      loadAdminNotifications();
      loadOrdersCount();
    }, 45000);

    const token = getAdminToken();
    const socket = initSocket(token);

    const handleNewOrder = (data) => {
      // 1. Instantly increment unread badge
      setAdminUnreadCount((c) => c + 1);
      setPendingOrdersCount((c) => c + 1);

      // 2. Prepend live notification to list
      const notifItem = {
        _id: data.notification?._id || `rt_${Date.now()}`,
        title: data.notification?.title || `New Order Received: #${data.order?.orderNumber}`,
        message: data.notification?.message || `New order #${data.order?.orderNumber} placed.`,
        relatedEntityType: 'Order',
        relatedEntityId: data.order?._id,
        metadata: data.notification?.metadata || {
          orderNumber: data.order?.orderNumber,
          totalPayable: data.order?.totalPayable,
          currencySymbol: data.order?.currencySymbol,
          customerName: data.order?.customerInfo?.name,
          isGuest: Boolean(data.order?.customerInfo?.isGuest),
        },
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setAdminNotifications((prev) => [notifItem, ...prev]);

      // 3. Show live popup toast alert
      setRealtimeToast({
        id: Date.now(),
        title: notifItem.title,
        message: notifItem.message,
        isGuest: Boolean(notifItem.metadata?.isGuest),
        orderNumber: data.order?.orderNumber,
        totalPayable: data.order?.totalPayable,
        currencySymbol: data.order?.currencySymbol || '₹',
        customerName: data.order?.customerInfo?.name || 'Guest Shopper',
      });

      // 4. Auto dismiss toast after 8 seconds
      setTimeout(() => {
        setRealtimeToast((curr) => (curr?.orderNumber === data.order?.orderNumber ? null : curr));
      }, 8000);
    };

    const handleStatusUpdate = () => {
      loadAdminNotifications();
      loadOrdersCount();
    };

    const handleOrderCancelled = () => {
      setAdminUnreadCount((c) => c + 1);
      loadAdminNotifications();
      loadOrdersCount();
    };

    socket.on('notification:new_order', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('notification:order_cancelled', handleOrderCancelled);

    return () => {
      clearInterval(interval);
      socket.off('notification:new_order', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('notification:order_cancelled', handleOrderCancelled);
    };
  }, [loadAdminNotifications, loadOrdersCount]);

  const handleMarkAdminRead = async (notifId) => {
    try {
      await markAdminNotificationRead(notifId);
      setAdminNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      setAdminUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark read:', err.message);
    }
  };

  const handleMarkAllAdminRead = async () => {
    try {
      await markAllAdminNotificationsRead();
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setAdminUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err.message);
    }
  };

  // -------------------------------------------------------------
  // PRODUCTS CRUD
  // -------------------------------------------------------------
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductErrorMsg(null);
    try {
      const data = await getAdminProducts();
      setProducts(data);
    } catch (err) {
      setProductErrorMsg(err?.message || 'Failed to connect to backend database.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && p.isPublished !== false) ||
        (statusFilter === 'unpublished' && p.isPublished === false);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  // Handle Quick Toggle Publish
  const handleTogglePublish = async (prod) => {
    const targetId = prod._id || prod.id;
    try {
      const newStatus = await toggleProductPublish(targetId);
      setProducts((prev) =>
        prev.map((item) =>
          (item._id || item.id) === targetId ? { ...item, isPublished: newStatus } : item
        )
      );
      notifyCatalogueChanged();
    } catch (err) {
      alert(`Could not toggle status: ${err?.message || 'Server error'}`);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    const targetId = deletingProduct._id || deletingProduct.id;

    setIsDeleting(true);
    try {
      await deleteProduct(targetId);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== targetId));
      setDeletingProduct(null);
      notifyCatalogueChanged();
    } catch (err) {
      alert(`Failed to delete product: ${err?.message || 'Server error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Save (Create or Update)
  const handleSaveProduct = async (payload) => {
    if (editingProduct) {
      const targetId = editingProduct._id || editingProduct.id;
      const updated = await updateProduct(targetId, payload);
      setProducts((prev) =>
        prev.map((p) => ((p._id || p.id) === targetId ? updated : p))
      );
    } else {
      const created = await createProduct(payload);
      setProducts((prev) => [created, ...prev]);
    }
    notifyCatalogueChanged();
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleLogoutClick = async () => {
    await adminLogout();
    onLogout();
  };

  // Product Counts Metrics
  const stats = useMemo(() => {
    const total = products.length;
    const published = products.filter((p) => p.isPublished !== false).length;
    const unpublished = total - published;
    const bestsellers = products.filter((p) => p.isBestseller).length;
    const rings = products.filter((p) => p.category === 'rings').length;
    const anklets = products.filter((p) => p.category === 'anklets').length;
    return { total, published, unpublished, bestsellers, rings, anklets };
  }, [products]);

  return (
    <div className="min-h-screen bg-[#F7F1E9] text-[#593D30] font-sans selection:bg-[#A85F49] selection:text-[#FFFFFF] flex">
      {/* 1. Persistent Left Sidebar (Desktop + Mobile Drawer) */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        admin={admin}
        productsCount={products.length}
        pendingOrdersCount={pendingOrdersCount}
        unreadNotificationsCount={adminUnreadCount}
        onLogout={handleLogoutClick}
        onViewStorefront={onViewStorefront}
        onGoToSuperAdmin={onGoToSuperAdmin}
        isOpenMobile={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Real-Time Push Order Alert Banner (Socket.io) */}
        {realtimeToast && (
          <div className="fixed top-20 right-4 z-50 max-w-md w-full bg-[#FFFFFF] border-2 border-[#A85F49] shadow-2xl rounded-xs p-4 flex items-start gap-3 text-xs animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-[#A85F49]/15 flex items-center justify-center shrink-0 text-[#A85F49]">
              <Bell className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[#593D30]">
                    {realtimeToast.title}
                  </span>
                  {realtimeToast.isGuest && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-mono rounded-xs font-semibold">
                      Guest Checkout
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRealtimeToast(null)}
                  className="text-[#8E8172] hover:text-[#593D30] p-0.5 rounded-xs"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[#8E8172] leading-relaxed">
                {realtimeToast.message}
              </p>
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectTab('orders');
                    setRealtimeToast(null);
                  }}
                  className="px-2.5 py-1 bg-[#A85F49] text-[#FFFFFF] font-medium rounded-xs hover:bg-[#8D4B37] transition-colors text-[10px]"
                >
                  View in Orders &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => setRealtimeToast(null)}
                  className="text-[10px] text-[#8E8172] hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <AdminHeader
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
          admin={admin}
          onViewStorefront={onViewStorefront}
          onGoToSuperAdmin={onGoToSuperAdmin}
          adminNotificationsOpen={adminNotificationsOpen}
          setAdminNotificationsOpen={setAdminNotificationsOpen}
          adminNotifications={adminNotifications}
          adminUnreadCount={adminUnreadCount}
          onMarkRead={handleMarkAdminRead}
          onMarkAllRead={handleMarkAllAdminRead}
          onOpenOrdersTab={() => handleSelectTab('orders')}
        />

        {/* Dynamic Module Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <AdminOverview
              admin={admin}
              stats={stats}
              adminUnreadCount={adminUnreadCount}
              onNavigateTab={handleSelectTab}
              onViewStorefront={onViewStorefront}
              onOpenCreateProduct={handleOpenCreateModal}
            />
          )}

          {activeTab === 'catalogue' && (
            <CatalogueManager
              products={products}
              filteredProducts={filteredProducts}
              isLoading={isLoadingProducts}
              errorMsg={productErrorMsg}
              stats={stats}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onRefresh={loadProducts}
              onOpenCreateModal={handleOpenCreateModal}
              onOpenEditModal={handleOpenEditModal}
              onTogglePublish={handleTogglePublish}
              onConfirmDeleteRequest={(p) => setDeletingProduct(p)}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              editingProduct={editingProduct}
              onSaveProduct={handleSaveProduct}
              deletingProduct={deletingProduct}
              setDeletingProduct={setDeletingProduct}
              isDeleting={isDeleting}
              onConfirmDelete={handleConfirmDelete}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManager admin={admin} />
          )}

          {activeTab === 'notifications' && (
            <AdminNotificationsView
              notifications={adminNotifications}
              unreadCount={adminUnreadCount}
              onMarkRead={handleMarkAdminRead}
              onMarkAllRead={handleMarkAllAdminRead}
              onNavigateOrders={() => handleSelectTab('orders')}
              onRefresh={loadAdminNotifications}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminPlaceholder
              moduleName="Analytics"
              onNavigateCatalogue={() => handleSelectTab('catalogue')}
            />
          )}

          {activeTab === 'reports' && (
            <AdminPlaceholder
              moduleName="Reports"
              onNavigateCatalogue={() => handleSelectTab('catalogue')}
            />
          )}
        </main>
      </div>
    </div>
  );
};
