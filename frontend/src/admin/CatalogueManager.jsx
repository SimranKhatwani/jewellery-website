import React from 'react';
import { resolveMediaUrl } from '../services/productService';
import { ProductFormModal } from './ProductFormModal';

export const CatalogueManager = ({
  products = [],
  filteredProducts = [],
  isLoading = false,
  errorMsg = null,
  stats = { total: 0, published: 0, unpublished: 0, bestsellers: 0, rings: 0, anklets: 0 },
  searchTerm = '',
  setSearchTerm,
  categoryFilter = 'all',
  setCategoryFilter,
  statusFilter = 'all',
  setStatusFilter,
  onRefresh,
  onOpenCreateModal,
  onOpenEditModal,
  onTogglePublish,
  onConfirmDeleteRequest,
  // Modals state & handlers
  isModalOpen,
  setIsModalOpen,
  editingProduct,
  onSaveProduct,
  deletingProduct,
  setDeletingProduct,
  isDeleting,
  onConfirmDelete,
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-3xl font-light text-[#593D30]">
            Catalogue Management
          </h2>
          <p className="text-xs text-[#8E8172] mt-1 font-sans">
            Manage products, upload high-res images directly into GridFS, and curate homepage features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] text-xs uppercase tracking-wider rounded-xs hover:bg-[#FAF7F2] transition-colors"
            title="Refresh catalogue data"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">
            Total Items
          </span>
          <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">
            {stats.total}
          </span>
        </div>
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#A85F49] tracking-wider block">
            Published Live
          </span>
          <span className="font-serif text-2xl font-light text-[#A85F49] mt-1 block">
            {stats.published}
          </span>
        </div>
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">
            Draft / Hidden
          </span>
          <span className="font-serif text-2xl font-light text-[#8E8172] mt-1 block">
            {stats.unpublished}
          </span>
        </div>
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#593D30] tracking-wider block">
            Bestsellers
          </span>
          <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">
            {stats.bestsellers}
          </span>
        </div>
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">
            Rings
          </span>
          <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">
            {stats.rings}
          </span>
        </div>
        <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#8E8172] tracking-wider block">
            Anklets
          </span>
          <span className="font-serif text-2xl font-light text-[#593D30] mt-1 block">
            {stats.anklets}
          </span>
        </div>
      </div>

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-[#A85F49] text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button type="button" onClick={onRefresh} className="underline font-semibold ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Toolbar: Search & Filters */}
      <div className="bg-[#FFFFFF] p-4 border border-[#D7C5AF]/60 rounded-xs flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xs">
        <div className="w-full md:w-80 relative">
          <svg
            className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
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
              type="button"
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
            <svg
              className="animate-spin h-8 w-8 text-[#A85F49] mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-xs text-[#8E8172]">Loading jewellery catalogue from MongoDB...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#593D30] font-serif">
              No products found matching the criteria.
            </p>
            <p className="text-xs text-[#8E8172] mt-1">
              Try modifying your filters or create a new product.
            </p>
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
                              src={resolveMediaUrl(p.primaryImage)}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src =
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
                          onClick={() => onTogglePublish(p)}
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
                            type="button"
                            onClick={() => onOpenEditModal(p)}
                            className="px-2.5 py-1 text-xs text-[#593D30] hover:text-[#A85F49] hover:bg-[#FAF7F2] rounded-xs transition-colors"
                            title="Edit product"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => onConfirmDeleteRequest(p)}
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

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onSave={onSaveProduct}
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
                onClick={onConfirmDelete}
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
