import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types/jewellery';
import {
  AdminUser,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductPublish,
  adminLogout,
} from './api';
import { ProductFormModal } from './ProductFormModal';
import { notifyCatalogueChanged } from '../services/productService';

interface AdminDashboardProps {
  admin: AdminUser;
  onLogout: () => void;
  onViewStorefront: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  onLogout,
  onViewStorefront,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load products from backend
  const loadProducts = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminProducts();
      setProducts(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to connect to backend database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term);

      // Category
      const matchesCategory =
        categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();

      // Status
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && p.isPublished !== false) ||
        (statusFilter === 'unpublished' && p.isPublished === false);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  // Handle Quick Toggle Publish
  const handleTogglePublish = async (prod: Product) => {
    const targetId = prod._id || prod.id;
    try {
      const newStatus = await toggleProductPublish(targetId);
      setProducts((prev) =>
        prev.map((item) =>
          (item._id || item.id) === targetId ? { ...item, isPublished: newStatus } : item
        )
      );
      notifyCatalogueChanged();
    } catch (err: any) {
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
    } catch (err: any) {
      alert(`Failed to delete product: ${err?.message || 'Server error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Save (Create or Update)
  const handleSaveProduct = async (payload: Partial<Product>) => {
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

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleLogoutClick = async () => {
    await adminLogout();
    onLogout();
  };

  // Metrics
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
    <div className="min-h-screen bg-[#F7F1E9] text-[#593D30] font-sans selection:bg-[#A85F49] selection:text-[#FFFFFF]">
      {/* Top Navigation Bar */}
      <header className="bg-[#FFFFFF] border-b border-[#D7C5AF]/60 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl tracking-[0.2em] font-light text-[#593D30]">
              AURELLE
            </span>
            <span className="h-4 w-px bg-[#D7C5AF]"></span>
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-[#A85F49]">
              Portal Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onViewStorefront}
              className="text-xs text-[#8E8172] hover:text-[#593D30] font-medium flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-xs"
              title="View live website"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Storefront</span>
            </button>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-medium text-[#593D30]">{admin.name}</span>
              <span className="text-[10px] text-[#8E8172]">{admin.email}</span>
            </div>

            <button
              onClick={handleLogoutClick}
              className="text-xs text-[#A85F49] hover:bg-[#A85F49]/10 font-medium px-3 py-1.5 border border-[#A85F49]/40 rounded-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-light text-[#593D30]">
              Catalogue Management
            </h1>
            <p className="text-xs text-[#8E8172] mt-1 font-sans">
              Manage products, upload high-res images directly into GridFS, and curate homepage features.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProducts}
              disabled={isLoading}
              className="px-3 py-2 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] text-xs uppercase tracking-wider rounded-xs hover:bg-[#FAF7F2] transition-colors"
              title="Refresh catalogue data"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-[0.16em] font-medium rounded-xs transition-colors shadow-xs flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New Product
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
          <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">Total Items</span>
            <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">{stats.total}</span>
          </div>
          <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#A85F49] tracking-wider block">Published Live</span>
            <span className="font-serif text-2xl font-light text-[#A85F49] mt-1 block">{stats.published}</span>
          </div>
          <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">Draft / Hidden</span>
            <span className="font-serif text-2xl font-light text-[#8E8172] mt-1 block">{stats.unpublished}</span>
          </div>
          <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#593D30] tracking-wider block">Bestsellers</span>
            <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">{stats.bestsellers}</span>
          </div>
          <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">Rings</span>
            <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">{stats.rings}</span>
          </div>
          <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">Anklets</span>
            <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">{stats.anklets}</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-[#A85F49] text-xs flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={loadProducts} className="underline font-semibold ml-4">Retry</button>
          </div>
        )}

        {/* Toolbar: Search & Filters */}
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-80 relative">
            <svg
              className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, SKU or slug..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8E8172]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
              >
                <option value="all">All Categories</option>
                <option value="rings">Rings</option>
                <option value="anklets">Anklets</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8E8172]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>

            {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-[#A85F49] hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center">
              <svg className="animate-spin h-8 w-8 text-[#A85F49] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs text-[#8E8172]">Loading jewellery catalogue from MongoDB...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#593D30] font-serif">No products found matching the criteria.</p>
              <p className="text-xs text-[#8E8172] mt-1">Try modifying your filters or create a new product.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#D7C5AF]/50 text-[#8E8172] uppercase font-semibold tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Badges</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7C5AF]/30">
                  {filteredProducts.map((p) => {
                    const isPub = p.isPublished !== false;
                    const prodId = p._id || p.id;

                    return (
                      <tr key={prodId} className="hover:bg-[#FAF7F2]/50 transition-colors">
                        {/* Thumbnail & Title */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 shrink-0 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/60 overflow-hidden">
                              <img
                                src={p.primaryImage}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://placehold.co/100x100/F7F1E9/593D30?text=Ring';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-serif text-sm font-medium text-[#593D30] truncate">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-[#8E8172] font-mono">
                                {p.sku || p.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-[11px] text-[#593D30]">
                            {p.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-medium text-[#593D30]">
                          ${p.priceUSD}
                        </td>

                        {/* Order */}
                        <td className="py-3.5 px-4 text-[#8E8172] font-mono text-[11px]">
                          {p.displayOrder ?? 0}
                        </td>

                        {/* Badges */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.isBestseller && (
                              <span className="px-1.5 py-0.5 bg-[#A85F49]/10 text-[#A85F49] text-[9px] uppercase font-bold tracking-wider rounded-xs">
                                Bestseller
                              </span>
                            )}
                            {p.isNewArrival && (
                              <span className="px-1.5 py-0.5 bg-[#593D30]/10 text-[#593D30] text-[9px] uppercase font-bold tracking-wider rounded-xs">
                                New
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(p)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xs text-[10px] uppercase font-semibold tracking-wider transition-colors ${
                              isPub
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPub ? 'bg-emerald-600' : 'bg-neutral-400'
                              }`}
                            ></span>
                            {isPub ? 'Published' : 'Hidden'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="px-2.5 py-1 text-xs text-[#593D30] hover:text-[#A85F49] hover:bg-[#FAF7F2] rounded-xs transition-colors"
                              title="Edit product"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => setDeletingProduct(p)}
                              className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-xs transition-colors"
                              title="Delete product"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-[#593D30]/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md p-6 rounded-sm border border-[#D7C5AF] shadow-2xl">
            <h3 className="font-serif text-xl text-[#593D30] font-normal mb-2">
              Confirm Product Deletion
            </h3>
            <p className="text-xs text-[#8E8172] leading-relaxed mb-4">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#593D30]">"{deletingProduct.name}"</strong> ({deletingProduct.sku})?
              This will remove the item from the live catalogue and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 border border-[#D7C5AF] text-[#593D30] text-xs font-medium uppercase tracking-wider rounded-xs hover:bg-[#FAF7F2] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-[#FFFFFF] text-xs font-medium uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
