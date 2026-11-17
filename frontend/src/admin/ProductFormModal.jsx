import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { uploadMediaImage, getStoredCategories, saveStoredCategory, createAdminCategory } from './api';
import { resolveMediaUrl } from '../services/productService';
import { getStoreCurrency, setStoreCurrency } from '../services/storefrontService';

export const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'AED', symbol: 'AED', label: 'AED (AED)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD ($)' },
  { code: 'AUD', symbol: 'AU$', label: 'AUD ($)' },
];

export const ProductFormModal = ({
  product,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(product);
  const [activeTab, setActiveTab] = useState('general');

  // Form State
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(product?.category || 'rings');
  const [categoriesList, setCategoriesList] = useState(() => {
    const list = getStoredCategories();
    if (product?.category && !list.some((c) => c.value === product.category)) {
      const formattedLabel = product.category.charAt(0).toUpperCase() + product.category.slice(1);
      return [...list, { value: product.category, label: formattedLabel }];
    }
    return list;
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySyncLoading, setCategorySyncLoading] = useState(false);

  useEffect(() => {
    const handleCategoriesUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategoriesList(e.detail);
      }
    };
    window.addEventListener('aurelle_categories_updated', handleCategoriesUpdate);
    return () => window.removeEventListener('aurelle_categories_updated', handleCategoriesUpdate);
  }, []);
  const [currency, setCurrency] = useState(product?.currency || getStoreCurrency() || 'USD');
  const [priceUSD, setPriceUSD] = useState(product?.priceUSD ?? product?.price ?? 150);
  const [subtitle, setSubtitle] = useState(product?.subtitle || '');
  const [description, setDescription] = useState(product?.description || '');
  const [editorialQuote, setEditorialQuote] = useState(product?.editorialQuote || '');
  const [displayOrder, setDisplayOrder] = useState(product?.displayOrder ?? 0);

  // Status & Stock flags
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [isBestseller, setIsBestseller] = useState(product?.isBestseller ?? false);
  const [isNewArrival, setIsNewArrival] = useState(product?.isNewArrival ?? false);
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity ?? 10);

  // Images
  const [primaryImage, setPrimaryImage] = useState(product?.primaryImage || '');
  const [secondaryImage, setSecondaryImage] = useState(product?.secondaryImage || '');
  const [detailImage, setDetailImage] = useState(product?.detailImage || '');

  // Auto-detect initial option type and values
  const getInitialOptionType = () => {
    if (product?.options?.type === 'free_size' || product?.options?.type === 'none') {
      return 'free_size';
    }
    const vals = product?.options?.values || [];
    if (vals.some((v) => typeof v === 'string' && (v.toLowerCase().includes('free') || v.toLowerCase().includes('flexible')))) {
      return 'free_size';
    }
    if (product?.category === 'earrings' || product?.category === 'necklaces') {
      if (!product?.options?.values || product.options.values.length <= 1) {
        return 'free_size';
      }
    }
    if (!product && (category === 'earrings' || category === 'necklaces')) {
      return 'free_size';
    }
    return 'custom';
  };

  const getInitialOptionValuesStr = (initialType) => {
    if (initialType === 'free_size') {
      return 'Free Size / Flexible';
    }
    if (product?.options?.values && product.options.values.length > 0) {
      return product.options.values.join(', ');
    }
    if (category === 'anklets') {
      return '21 cm + 4 cm Extender, 24 cm + 4 cm Extender';
    }
    return 'US 5, US 6, US 7, US 8, US 9';
  };

  const initialOptType = getInitialOptionType();
  const [optionType, setOptionType] = useState(initialOptType);
  const [optionValuesStr, setOptionValuesStr] = useState(getInitialOptionValuesStr(initialOptType));

  // Specifications
  const [purity, setPurity] = useState(product?.specifications?.purity || 'Solid 925 Sterling Silver (Hallmarked)');
  const [hallmark, setHallmark] = useState(product?.specifications?.hallmark || 'Laser-engraved 925 authenticity hallmark');
  const [finish, setFinish] = useState(product?.specifications?.finish || 'Mirror polished');
  const [weight, setWeight] = useState(product?.specifications?.weight || '8.5 grams');
  const [dimensions, setDimensions] = useState(product?.specifications?.dimensions || 'Standard ergonomic fit');

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);

  const getCategoryPrefix = (cat) => {
    switch (cat) {
      case 'anklets':
        return 'AUR-ANK-0925';
      case 'earrings':
        return 'AUR-EAR-0925';
      case 'necklaces':
        return 'AUR-NCK-0925';
      case 'rings':
        return 'AUR-RNG-0925';
      case 'bracelets':
        return 'AUR-BRC-0925';
      case 'pendants':
        return 'AUR-PND-0925';
      default: {
        const clean = (cat || 'ITM').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
        return `AUR-${clean || 'ITM'}-0925`;
      }
    }
  };

  // Auto-generate slug and SKU when name changes in create mode
  const handleNameChange = (val) => {
    setName(val);
    if (!isEditing && !slug) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
    if (!isEditing && !sku) {
      const prefix = getCategoryPrefix(category);
      const code = val.slice(0, 3).toUpperCase() || 'ITM';
      setSku(`${prefix}-${code}`);
    }
  };

  // Auto-select option type and values when category changes
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (!isEditing) {
      const prefix = getCategoryPrefix(newCat);
      const code = (name || 'ITM').slice(0, 3).toUpperCase();
      setSku(`${prefix}-${code}`);
    }
    if (newCat === 'rings') {
      if (optionType !== 'free_size' || optionValuesStr === 'Free Size / Flexible') {
        setOptionType('custom');
        setOptionValuesStr('US 5, US 6, US 7, US 8, US 9');
      }
    } else if (newCat === 'anklets') {
      if (optionType !== 'free_size' || optionValuesStr === 'Free Size / Flexible') {
        setOptionType('custom');
        setOptionValuesStr('21 cm + 4 cm Extender, 24 cm + 4 cm Extender');
      }
    } else {
      setOptionType('free_size');
      setOptionValuesStr('Free Size / Flexible');
    }
  };

  // Add new category on the fly
  const handleAddNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');

    const existing = categoriesList.find(
      (c) => c.value === slug || c.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleCategoryChange(existing.value);
      setIsAddingCategory(false);
      setNewCategoryName('');
      return;
    }

    const newCatObj = { value: slug, label: trimmed };
    const updated = saveStoredCategory(newCatObj);
    setCategoriesList(updated);
    handleCategoryChange(slug);
    setIsAddingCategory(false);
    setNewCategoryName('');

    setCategorySyncLoading(true);
    try {
      await createAdminCategory({ name: trimmed, slug });
    } catch (err) {
      console.warn('Category persist error:', err);
    } finally {
      setCategorySyncLoading(false);
    }
  };

  // Switch between custom sizes and free size / flexible
  const handleOptionTypeChange = (newType) => {
    setOptionType(newType);
    if (newType === 'free_size') {
      setOptionValuesStr('Free Size / Flexible');
    } else {
      if (optionValuesStr === 'Free Size / Flexible' || !optionValuesStr.trim()) {
        if (category === 'anklets') {
          setOptionValuesStr('21 cm + 4 cm Extender, 24 cm + 4 cm Extender');
        } else {
          setOptionValuesStr('US 5, US 6, US 7, US 8, US 9');
        }
      }
    }
  };

  // Upload image to GridFS
  const handleFileUpload = async (e) => {
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
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to upload image binary to database.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setActiveTab('general');
      setErrorMessage('Product name is required.');
      return;
    }

    if (!primaryImage.trim()) {
      setActiveTab('media');
      setErrorMessage('Primary product image is required. Please upload or provide an image.');
      return;
    }

    let finalOptions;
    if (optionType === 'free_size') {
      finalOptions = {
        type: 'free_size',
        name: 'Size',
        values: ['Free Size'],
        default: 'Free Size',
      };
    } else {
      const values = optionValuesStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      finalOptions = {
        type: category === 'anklets' ? 'length' : 'size',
        name: category === 'anklets' ? 'Available Length' : 'Available Ring Size (US)',
        values: values.length > 0 ? values : ['Standard'],
        default: values[0] || 'Standard',
      };
    }

    const activeCurrencyObj = CURRENCY_OPTIONS.find((c) => c.code === currency) || { code: 'USD', symbol: '$' };
    const stock = Math.max(0, parseInt(stockQuantity, 10) || 0);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku: sku.trim() || 'AUR-0925-GEN',
      category,
      priceUSD: Number(priceUSD) || 0,
      price: Number(priceUSD) || 0,
      currency: activeCurrencyObj.code,
      currencySymbol: activeCurrencyObj.symbol,
      subtitle: subtitle.trim(),
      description: description.trim(),
      editorialQuote: editorialQuote.trim(),
      displayOrder: Number(displayOrder) || 0,
      isPublished,
      isBestseller,
      isNewArrival,
      inStock: stock > 0,
      stockQuantity: stock,
      inventoryStatus: stock <= 0 ? 'out_of_stock' : 'in_stock',
      primaryImage: primaryImage.trim(),
      secondaryImage: secondaryImage.trim() || undefined,
      detailImage: detailImage.trim() || undefined,
      options: finalOptions,
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
      setStoreCurrency(activeCurrencyObj.code, activeCurrencyObj.symbol);
      onClose();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to save product to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const isOutOfStock = Number(stockQuantity) <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-sm border border-[#D7C5AF] shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7C5AF]/50 bg-[#FAF7F2] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-[#A85F49]">
              {isEditing ? 'Editing Catalogue Item' : 'New Product Creation'}
            </span>
            <h2 className="font-serif text-2xl text-[#593D30] font-normal truncate max-w-xl">
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

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-[#D7C5AF]/40 bg-[#FAF7F2] px-6 text-xs font-medium shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            1. General & Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            2. Images & Media
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            3. Stock & Display
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            4. Specifications
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#593D30]">
          {errorMessage && (
            <div className="p-3 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-[#A85F49] text-xs">
              {errorMessage}
            </div>
          )}

          {/* ==================== TAB 1: GENERAL & PRICING ==================== */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
                General Information & Pricing
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
                    Slug / URL Identifier
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-[#593D30]">
                      Category *
                    </label>
                    {!isAddingCategory && (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="text-[11px] font-semibold text-[#A85F49] hover:text-[#8E4D3A] flex items-center gap-0.5 transition-colors cursor-pointer"
                        title="Add a new jewellery category"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    )}
                  </div>

                  {!isAddingCategory ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={category}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingCategory(true);
                          } else {
                            handleCategoryChange(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                      >
                        {categoriesList.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                        <option value="__add_new__">+ Add New Category...</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#D7C5AF] hover:border-[#A85F49] text-[#A85F49] rounded-xs shrink-0 transition-colors flex items-center justify-center cursor-pointer"
                        title="Add new category"
                        aria-label="Add new category"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#FAF7F2] border border-[#A85F49]/40 rounded-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#A85F49] uppercase tracking-wider">
                          Create New Category
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName('');
                          }}
                          className="text-[#8E8172] hover:text-[#593D30] text-xs px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="e.g. Bracelets, Pendants..."
                          className="flex-1 px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs focus:outline-none focus:border-[#A85F49]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewCategory();
                            } else if (e.key === 'Escape') {
                              setIsAddingCategory(false);
                              setNewCategoryName('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddNewCategory}
                          disabled={!newCategoryName.trim() || categorySyncLoading}
                          className="px-3 py-1.5 bg-[#A85F49] hover:bg-[#8E4D3A] disabled:opacity-50 text-white rounded-xs text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          {categorySyncLoading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Currency & Price Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-[#593D30]">
                      Price & Currency *
                    </label>
                    <span className="text-[10px] text-[#A85F49] font-medium tracking-wide">
                      {currency}
                    </span>
                  </div>
                  <div className="flex rounded-xs border border-[#D7C5AF] overflow-hidden focus-within:border-[#A85F49] bg-[#FAF7F2]">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-[#FAF7F2] border-r border-[#D7C5AF] px-2 py-2 text-xs font-semibold text-[#593D30] focus:outline-none cursor-pointer hover:bg-[#F2ECE1]"
                      title="Choose Currency (USD, INR, EUR, GBP, AED, CAD, AUD)"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1 flex items-center bg-[#FAF7F2]">
                      <span className="pl-2.5 text-xs font-bold text-[#8E8172] select-none">
                        {CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol || '$'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={priceUSD}
                        onChange={(e) => setPriceUSD(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        placeholder="e.g. 195"
                        className="w-full pl-1.5 pr-3 py-2 bg-transparent text-xs font-mono font-medium text-[#593D30] focus:outline-none"
                      />
                    </div>
                  </div>
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
                  placeholder="e.g. Organic texture hand-forged in sterling silver"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Full Editorial Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Detailed artisanal backstory and styling advice..."
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
                  placeholder="e.g. A tactile testament to natural fluidity and modern restraint."
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB 2: IMAGES & MEDIA ==================== */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
                Image Management (MongoDB GridFS Storage)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* Upload Primary */}
                <div>
                  <label className="block text-xs font-medium text-[#593D30] mb-1">
                    Primary Product Photo *
                  </label>
                  <div className="border-2 border-dashed border-[#D7C5AF] hover:border-[#A85F49] transition-colors rounded-xs p-4 text-center bg-[#FAF7F2] cursor-pointer">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      id="primary-image-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="primary-image-upload" className="cursor-pointer block">
                      <svg
                        className="mx-auto h-8 w-8 text-[#A85F49]/70 mb-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {isUploading ? (
                        <span className="text-[#A85F49] font-semibold text-xs">Streaming binary into MongoDB...</span>
                      ) : (
                        <>
                          <span className="text-[#A85F49] underline text-xs font-medium">Click to choose image</span> from computer
                          <p className="text-[10px] text-[#8E8172] mt-1">JPEG, PNG, WebP up to 5MB</p>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="mt-3">
                    <label className="block text-[11px] text-[#8E8172] mb-1">
                      Direct Image URI (GridFS or asset path)
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

                {/* Live Preview */}
                <div>
                  <label className="block text-xs font-medium text-[#593D30] mb-1">
                    Live Primary Preview
                  </label>
                  <div className="w-full h-44 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs flex items-center justify-center overflow-hidden relative">
                    {primaryImage ? (
                      <img
                        src={resolveMediaUrl(primaryImage)}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-[#593D30] mb-1">
                    Secondary Angle Image URI (Optional)
                  </label>
                  <input
                    type="text"
                    value={secondaryImage}
                    onChange={(e) => setSecondaryImage(e.target.value)}
                    placeholder="/src/assets/images/... or /api/media/..."
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs font-mono text-[#593D30]"
                  />
                  <p className="text-[10px] text-[#8E8172] mt-1">Displayed when a customer hovers over the product card</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#593D30] mb-1">
                    Macro Detail Image URI (Optional)
                  </label>
                  <input
                    type="text"
                    value={detailImage}
                    onChange={(e) => setDetailImage(e.target.value)}
                    placeholder="/src/assets/images/... or /api/media/..."
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs font-mono text-[#593D30]"
                  />
                  <p className="text-[10px] text-[#8E8172] mt-1">Displayed in gallery modal and craftsmanship zoom</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: STOCK & DISPLAY ==================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] border-b border-[#D7C5AF]/30 pb-1">
                Storefront Display & Inventory Controls
              </h3>

              {/* Storefront Feature Flags */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#593D30]">
                  Storefront Visibility & Highlights
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`flex items-center gap-3 p-3 border rounded-xs cursor-pointer transition-colors ${
                    isPublished ? 'bg-[#FAF7F2] border-[#A85F49]/60' : 'bg-[#FFFFFF] border-[#D7C5AF]/60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#593D30] block">Published</span>
                      <span className="text-[10px] text-[#8E8172] block">Visible to customers in catalogue</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 border rounded-xs cursor-pointer transition-colors ${
                    isBestseller ? 'bg-[#FAF7F2] border-[#A85F49]/60' : 'bg-[#FFFFFF] border-[#D7C5AF]/60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isBestseller}
                      onChange={(e) => setIsBestseller(e.target.checked)}
                      className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#593D30] block">Bestseller</span>
                      <span className="text-[10px] text-[#8E8172] block">Featured with Bestseller badge</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 border rounded-xs cursor-pointer transition-colors ${
                    isNewArrival ? 'bg-[#FAF7F2] border-[#A85F49]/60' : 'bg-[#FFFFFF] border-[#D7C5AF]/60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isNewArrival}
                      onChange={(e) => setIsNewArrival(e.target.checked)}
                      className="rounded text-[#A85F49] focus:ring-[#A85F49]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#593D30] block">New Arrival</span>
                      <span className="text-[10px] text-[#8E8172] block">Featured as newest edition</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dedicated Inventory Stock Units Card */}
              <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/80 rounded-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#593D30]">
                      Available Inventory Stock Units
                    </label>
                    <span className="text-[11px] text-[#8E8172]">
                      Total sellable pieces available in inventory
                    </span>
                  </div>

                  {/* Dynamic Status Badge */}
                  <div>
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100/80 border border-red-300 text-red-800 text-xs font-semibold rounded-xs">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        Sold Out on Website
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Available for Purchase ({stockQuantity} units)
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs font-mono text-sm font-semibold text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                    placeholder="e.g. 15"
                  />
                </div>

                <p className="text-[11px] text-[#8E8172] leading-relaxed">
                  When stock is set to <strong>0</strong>, the product automatically displays as <strong>Sold Out</strong> on the customer website and shopping bag addition is disabled.
                </p>
              </div>

              {/* Catalogue Display & Sizes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                  <p className="text-[10px] text-[#8E8172] mt-1">Lower numbers appear first</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#593D30] mb-1">
                    Option Type
                  </label>
                  <select
                    value={optionType}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  >
                    <option value="custom">Custom Sized (Multiple Sizes)</option>
                    <option value="free_size">Free Size / Flexible (Universal)</option>
                  </select>
                  <p className="text-[10px] text-[#8E8172] mt-1">
                    {optionType === 'free_size'
                      ? 'Universal single fit (Earrings, Necklaces, or Free Size Rings).'
                      : 'Multiple selectable sizes or lengths for customers.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#593D30] mb-1">
                    Available Sizes / Values
                  </label>
                  {optionType === 'free_size' ? (
                    <input
                      type="text"
                      value="Free Size / Flexible"
                      readOnly
                      disabled
                      className="w-full px-3 py-2 bg-[#F2ECE1] border border-[#D7C5AF]/70 rounded-xs text-[#8E8172] cursor-not-allowed select-none font-medium text-xs"
                    />
                  ) : (
                    <input
                      type="text"
                      value={optionValuesStr}
                      onChange={(e) => setOptionValuesStr(e.target.value)}
                      placeholder={
                        category === 'anklets'
                          ? '21 cm + 4 cm Extender, 24 cm + 4 cm Extender'
                          : 'US 5, US 6, US 7, US 8, US 9'
                      }
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49] text-xs font-mono"
                    />
                  )}
                  <p className="text-[10px] text-[#8E8172] mt-1">
                    {optionType === 'free_size'
                      ? 'Universal size. This size will NOT be displayed on the customer website.'
                      : 'Comma-separated values (e.g. US 5, US 6, US 7). Displayed as size buttons on website.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: SPECIFICATIONS ==================== */}
          {activeTab === 'specs' && (
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

              <div>
                <label className="block text-xs font-medium text-[#593D30] mb-1">
                  Dimensions & Ergonomic Fit
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. Standard ergonomic fit"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#D7C5AF]/50 bg-[#FAF7F2] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#8E8172]">
            {activeTab === 'general' && 'Step 1 of 4: General Details'}
            {activeTab === 'media' && 'Step 2 of 4: Images & Media'}
            {activeTab === 'inventory' && 'Step 3 of 4: Stock & Display'}
            {activeTab === 'specs' && 'Step 4 of 4: Specifications'}
          </div>

          <div className="flex items-center gap-3">
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
    </div>
  );
};
