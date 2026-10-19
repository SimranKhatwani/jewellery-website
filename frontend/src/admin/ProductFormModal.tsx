import React, { useState, useRef } from 'react';
import { Product } from '../types/jewellery';
import { uploadMediaImage } from './api';
import { resolveMediaUrl } from '../services/productService';

interface ProductFormModalProps {
  product: Product | null; // null for Create, Product object for Edit
  onClose: () => void;
  onSave: (savedProduct: Partial<Product>) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(product);

  // Form State
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState<string>(product?.category || 'rings');
  const [priceUSD, setPriceUSD] = useState<number>(product?.priceUSD ?? 150);
  const [subtitle, setSubtitle] = useState(product?.subtitle || '');
  const [description, setDescription] = useState(product?.description || '');
  const [editorialQuote, setEditorialQuote] = useState(product?.editorialQuote || '');
  const [displayOrder, setDisplayOrder] = useState<number>(product?.displayOrder ?? 0);

  // Status flags
  const [isPublished, setIsPublished] = useState<boolean>(product?.isPublished ?? true);
  const [isBestseller, setIsBestseller] = useState<boolean>(product?.isBestseller ?? false);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(product?.isNewArrival ?? false);
  const [inStock, setInStock] = useState<boolean>(product?.inStock ?? true);

  // Images
  const [primaryImage, setPrimaryImage] = useState(product?.primaryImage || '');
  const [secondaryImage, setSecondaryImage] = useState(product?.secondaryImage || '');
  const [detailImage, setDetailImage] = useState(product?.detailImage || '');

  // Options & Sizes
  const [optionType, setOptionType] = useState<'size' | 'length'>(
    product?.options?.type || (category === 'anklets' ? 'length' : 'size')
  );
  const [optionValuesStr, setOptionValuesStr] = useState<string>(
    product?.options?.values?.join(', ') ||
      (category === 'anklets'
        ? '21 cm + 4 cm Extender, 24 cm + 4 cm Extender'
        : 'US 5, US 6, US 7, US 8, US 9')
  );

  // Specifications
  const [purity, setPurity] = useState(product?.specifications?.purity || 'Solid 925 Sterling Silver (Hallmarked)');
  const [hallmark, setHallmark] = useState(product?.specifications?.hallmark || 'Laser-engraved 925 authenticity hallmark');
  const [finish, setFinish] = useState(product?.specifications?.finish || 'Mirror polished');
  const [weight, setWeight] = useState(product?.specifications?.weight || '8.5 grams');
  const [dimensions, setDimensions] = useState(product?.specifications?.dimensions || 'Standard ergonomic fit');

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug and SKU when name changes in create mode
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !slug) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
    if (!isEditing && !sku) {
      const prefix = category === 'anklets' ? 'AUR-ANK-0925' : 'AUR-RNG-0925';
      const code = val.slice(0, 3).toUpperCase() || 'ITM';
      setSku(`${prefix}-${code}`);
    }
  };

  // Upload image to GridFS
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const res = await uploadMediaImage(file);
      setPrimaryImage(res.url);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload image binary to database.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    if (!primaryImage.trim()) {
      setErrorMessage('Primary product image is required. Please upload or provide an image.');
      return;
    }

    const values = optionValuesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Partial<Product> = {
      name: name.trim(),
      slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku: sku.trim() || 'AUR-0925-GEN',
      category: category as any,
      priceUSD: Number(priceUSD) || 0,
      subtitle: subtitle.trim(),
      description: description.trim(),
      editorialQuote: editorialQuote.trim(),
      displayOrder: Number(displayOrder) || 0,
      isPublished,
      isBestseller,
      isNewArrival,
      inStock,
      primaryImage: primaryImage.trim(),
      secondaryImage: secondaryImage.trim() || undefined,
      detailImage: detailImage.trim() || undefined,
      options: {
        type: optionType,
        name: optionType === 'length' ? 'Available Length' : 'Available Ring Size',
        values: values.length > 0 ? values : ['Standard'],
        default: values[0] || 'Standard',
      },
      specifications: {
        purity,
        hallmark,
        finish,
        weight,
        dimensions,
        hypoallergenic: '100% Nickel-free & skin-safe',
        protection: 'Protective rhodium barrier',
      },
      finishes: ['High Polish Silver', 'Brushed Satin Silver'],
      careInstructions: [
        'Wipe gently with microfibre cloth after wear.',
        'Store in anti-tarnish suede pouch away from direct moisture.',
      ],
      stockistInquiryAvailable: true,
    };

    setIsSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save product to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-sm border border-[#D7C5AF] shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7C5AF]/50 bg-[#FAF7F2] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-[#A85F49]">
              {isEditing ? 'Editing Catalogue Item' : 'New Product Creation'}
            </span>
            <h2 className="font-serif text-2xl text-[#593D30] font-normal">
              {isEditing ? product?.name : 'Add New Jewellery Piece'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8E8172] hover:text-[#593D30] p-1.5 rounded-xs transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#593D30]">
          {errorMessage && (
            <div className="p-3 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-[#A85F49] text-xs">
              {errorMessage}
            </div>
          )}

          {/* Section: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
              General Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. The Sculpted Molten Band"
                  required
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Slug / URL identifier
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. sculpted-molten-band"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="rings">Rings</option>
                  <option value="anklets">Anklets</option>
                  <option value="earrings">Earrings (New)</option>
                  <option value="necklaces">Necklaces (New)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Price (USD $) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceUSD}
                  onChange={(e) => setPriceUSD(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  SKU Identifier
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. AUR-RNG-0925-MLT"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#593D30] mb-1">
                Subtitle / Short Description
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Organic fluid contours in solid 925 sterling silver"
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#593D30] mb-1">
                Full Editorial Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed craftsmanship notes, inspirations, and tactile feel..."
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#593D30] mb-1">
                Editorial Highlight Quote
              </label>
              <input
                type="text"
                value={editorialQuote}
                onChange={(e) => setEditorialQuote(e.target.value)}
                placeholder="e.g. A ring that looks as though liquid silver was frozen in motion along the hand."
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
              />
            </div>
          </div>

          {/* Section: Image Management */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
              Image Management (MongoDB GridFS Storage)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Upload control */}
              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Upload Binary Image to GridFS *
                </label>
                <div className="border-2 border-dashed border-[#D7C5AF] p-4 rounded-xs text-center hover:bg-[#FAF7F2] transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="gridfs-file-input"
                  />
                  <label
                    htmlFor="gridfs-file-input"
                    className="cursor-pointer block text-xs text-[#593D30] font-medium"
                  >
                    <svg
                      className="mx-auto h-8 w-8 text-[#A85F49]/70 mb-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {isUploading ? (
                      <span className="text-[#A85F49] font-semibold">Streaming binary into MongoDB...</span>
                    ) : (
                      <>
                        <span className="text-[#A85F49] underline">Click to choose image</span> from computer
                        <p className="text-[10px] text-[#8E8172] mt-1">JPEG, PNG, WebP up to 5MB</p>
                      </>
                    )}
                  </label>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] text-[#8E8172] mb-1">
                    Image URI (GridFS endpoint or static asset)
                  </label>
                  <input
                    type="text"
                    value={primaryImage}
                    onChange={(e) => setPrimaryImage(e.target.value)}
                    placeholder="/api/media/6712345..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs font-mono text-[#593D30]"
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Live Image Preview
                </label>
                <div className="w-full h-44 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs flex items-center justify-center overflow-hidden relative">
                  {primaryImage ? (
                    <img
                      src={resolveMediaUrl(primaryImage)}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://placehold.co/400x400/F7F1E9/593D30?text=Preview+Error';
                      }}
                    />
                  ) : (
                    <span className="text-xs text-[#8E8172] italic">No image selected</span>
                  )}
                  {primaryImage && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-xs font-mono">
                      {primaryImage.startsWith('/api/media/') ? 'GridFS' : 'Static'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                  Secondary Editorial Image URI (Optional)
                </label>
                <input
                  type="text"
                  value={secondaryImage}
                  onChange={(e) => setSecondaryImage(e.target.value)}
                  placeholder="/src/assets/images/... or /api/media/..."
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs font-mono text-[#593D30]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#593D30] mb-1">
                  Macro Detail Image URI (Optional)
                </label>
                <input
                  type="text"
                  value={detailImage}
                  onChange={(e) => setDetailImage(e.target.value)}
                  placeholder="/src/assets/images/... or /api/media/..."
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs font-mono text-[#593D30]"
                />
              </div>
            </div>
          </div>

          {/* Section: Publishing & Catalogue Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
              Display & Catalogue Settings
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                />
                <span className="text-xs font-medium text-[#593D30]">Published</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                />
                <span className="text-xs font-medium text-[#593D30]">Bestseller</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                />
                <span className="text-xs font-medium text-[#593D30]">New Arrival</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                />
                <span className="text-xs font-medium text-[#593D30]">In Stock</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Option Type
                </label>
                <select
                  value={optionType}
                  onChange={(e) => setOptionType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="size">Ring Size</option>
                  <option value="length">Anklet Length</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Available Sizes / Values
                </label>
                <input
                  type="text"
                  value={optionValuesStr}
                  onChange={(e) => setOptionValuesStr(e.target.value)}
                  placeholder="US 6, US 7, US 8..."
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>
          </div>

          {/* Section: Craftsmanship Specifications */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
              Specifications & Metallurgy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Purity
                </label>
                <input
                  type="text"
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Hallmark
                </label>
                <input
                  type="text"
                  value={hallmark}
                  onChange={(e) => setHallmark(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Finish
                </label>
                <input
                  type="text"
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Weight
                </label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#D7C5AF]/50 bg-[#FAF7F2] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-[#D7C5AF] text-[#593D30] text-xs font-medium uppercase tracking-wider rounded-xs hover:bg-[#FFFFFF] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isUploading}
            className="px-5 py-2 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] text-xs font-medium uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving to Database...
              </>
            ) : isEditing ? (
              'Save Product Changes'
            ) : (
              'Create Product'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
