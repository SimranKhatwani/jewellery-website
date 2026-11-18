import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Megaphone,
  Image as ImageIcon,
  Layout,
  Phone,
  Search,
  Save,
  CheckCircle,
  AlertCircle,
  Upload,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { getTenantStoreSettings, updateTenantStoreSettings, uploadMediaImage } from './api';

export const StoreSettingsManager = ({ admin, onStoreUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    customDomain: '',
    settings: {
      currency: 'INR',
      currencySymbol: '₹',
      description: '',
      supportEmail: '',
      contactPhone: '',
      businessAddress: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      },
      branding: {
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '#593D30',
        secondaryColor: '#F7F1E9',
        accentColor: '#A85F49',
        tagline: 'Fine Jewellery Atelier',
      },
      announcement: {
        enabled: true,
        text: '',
        link: '',
        bgColor: '#A85F49',
        textColor: '#FFFFFF',
      },
      hero: {
        heading: '',
        subheading: '',
        description: '',
        desktopImageUrl: '',
        mobileImageUrl: '',
        ctaText: 'Explore Collection',
        ctaLink: '#categories',
      },
      sections: {
        categories: { enabled: true, title: 'Shop by Category' },
        bestsellers: { enabled: true, title: 'Curated Bestsellers' },
        newArrivals: { enabled: true, title: 'New Editions' },
        brandStory: {
          enabled: true,
          title: 'Sculptural Form, Understated Permanence.',
          subtitle: 'The Silver Philosophy',
          content: '',
          imageUrl: '',
        },
        whyChooseUs: { enabled: true, title: 'Why Choose Us' },
        contact: { enabled: true, title: 'Purchasing Channels & Inquiries' },
        newsletter: { enabled: true, title: 'Private Releases' },
      },
      footer: {
        description: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        socialLinks: {
          instagram: '',
          facebook: '',
          twitter: '',
          pinterest: '',
          youtube: '',
        },
        copyrightText: '',
      },
      seo: {
        title: '',
        description: '',
        ogImageUrl: '',
      },
    },
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getTenantStoreSettings();
      if (data) {
        setFormData({
          name: data.name || '',
          slug: data.slug || admin?.storeSlug || '',
          customDomain: data.customDomain || '',
          settings: {
            currency: data.settings?.currency || 'INR',
            currencySymbol: data.settings?.currencySymbol || '₹',
            description: data.settings?.description || '',
            supportEmail: data.settings?.supportEmail || data.ownerId?.email || '',
            contactPhone: data.settings?.contactPhone || '',
            businessAddress: {
              addressLine1: data.settings?.businessAddress?.addressLine1 || '',
              addressLine2: data.settings?.businessAddress?.addressLine2 || '',
              city: data.settings?.businessAddress?.city || '',
              state: data.settings?.businessAddress?.state || '',
              postalCode: data.settings?.businessAddress?.postalCode || '',
              country: data.settings?.businessAddress?.country || 'India',
            },
            branding: {
              logoUrl: data.settings?.branding?.logoUrl || data.settings?.logoUrl || '',
              faviconUrl: data.settings?.branding?.faviconUrl || '',
              primaryColor: data.settings?.branding?.primaryColor || '#593D30',
              secondaryColor: data.settings?.branding?.secondaryColor || '#F7F1E9',
              accentColor: data.settings?.branding?.accentColor || '#A85F49',
              tagline: data.settings?.branding?.tagline || `${data.name || 'Store'} Atelier`,
            },
            announcement: {
              enabled: data.settings?.announcement?.enabled !== undefined ? data.settings.announcement.enabled : true,
              text: data.settings?.announcement?.text || '',
              link: data.settings?.announcement?.link || '',
              bgColor: data.settings?.announcement?.bgColor || '#A85F49',
              textColor: data.settings?.announcement?.textColor || '#FFFFFF',
            },
            hero: {
              heading: data.settings?.hero?.heading || '',
              subheading: data.settings?.hero?.subheading || '',
              description: data.settings?.hero?.description || '',
              desktopImageUrl: data.settings?.hero?.desktopImageUrl || '',
              mobileImageUrl: data.settings?.hero?.mobileImageUrl || '',
              ctaText: data.settings?.hero?.ctaText || 'Explore Collection',
              ctaLink: data.settings?.hero?.ctaLink || '#categories',
            },
            sections: {
              categories: {
                enabled: data.settings?.sections?.categories?.enabled !== undefined ? data.settings.sections.categories.enabled : true,
                title: data.settings?.sections?.categories?.title || 'Shop by Category',
              },
              bestsellers: {
                enabled: data.settings?.sections?.bestsellers?.enabled !== undefined ? data.settings.sections.bestsellers.enabled : true,
                title: data.settings?.sections?.bestsellers?.title || 'Curated Bestsellers',
              },
              newArrivals: {
                enabled: data.settings?.sections?.newArrivals?.enabled !== undefined ? data.settings.sections.newArrivals.enabled : true,
                title: data.settings?.sections?.newArrivals?.title || 'New Editions',
              },
              brandStory: {
                enabled: data.settings?.sections?.brandStory?.enabled !== undefined ? data.settings.sections.brandStory.enabled : true,
                title: data.settings?.sections?.brandStory?.title || 'Sculptural Form, Understated Permanence.',
                subtitle: data.settings?.sections?.brandStory?.subtitle || 'The Philosophy',
                content: data.settings?.sections?.brandStory?.content || '',
                imageUrl: data.settings?.sections?.brandStory?.imageUrl || '',
              },
              whyChooseUs: {
                enabled: data.settings?.sections?.whyChooseUs?.enabled !== undefined ? data.settings.sections.whyChooseUs.enabled : true,
                title: data.settings?.sections?.whyChooseUs?.title || 'Why Choose Us',
              },
              contact: {
                enabled: data.settings?.sections?.contact?.enabled !== undefined ? data.settings.sections.contact.enabled : true,
                title: data.settings?.sections?.contact?.title || 'Purchasing Channels & Inquiries',
              },
              newsletter: {
                enabled: data.settings?.sections?.newsletter?.enabled !== undefined ? data.settings.sections.newsletter.enabled : true,
                title: data.settings?.sections?.newsletter?.title || 'Private Releases',
              },
            },
            footer: {
              description: data.settings?.footer?.description || '',
              contactEmail: data.settings?.footer?.contactEmail || data.settings?.supportEmail || '',
              contactPhone: data.settings?.footer?.contactPhone || data.settings?.contactPhone || '',
              address: data.settings?.footer?.address || '',
              socialLinks: {
                instagram: data.settings?.footer?.socialLinks?.instagram || '',
                facebook: data.settings?.footer?.socialLinks?.facebook || '',
                twitter: data.settings?.footer?.socialLinks?.twitter || '',
                pinterest: data.settings?.footer?.socialLinks?.pinterest || '',
                youtube: data.settings?.footer?.socialLinks?.youtube || '',
              },
              copyrightText: data.settings?.footer?.copyrightText || '',
            },
            seo: {
              title: data.settings?.seo?.title || '',
              description: data.settings?.seo?.description || '',
              ogImageUrl: data.settings?.seo?.ogImageUrl || '',
            },
          },
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load store configuration');
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        name: formData.name.trim(),
        customDomain: formData.customDomain.trim() || undefined,
        settings: formData.settings,
      };

      const updated = await updateTenantStoreSettings(payload);
      setStatusMessage('Store configuration saved successfully. Public storefront updated in real time!');
      if (onStoreUpdated) {
        onStoreUpdated(updated);
      }
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file, targetField) => {
    if (!file) return;
    setUploadingImage(true);
    setErrorMessage(null);
    try {
      const uploaded = await uploadMediaImage(file);
      if (uploaded && uploaded.url) {
        if (targetField === 'logo') {
          setFormData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              branding: {
                ...prev.settings.branding,
                logoUrl: uploaded.url,
              },
              logoUrl: uploaded.url,
            },
          }));
        } else if (targetField === 'hero') {
          setFormData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              hero: {
                ...prev.settings.hero,
                desktopImageUrl: uploaded.url,
              },
            },
          }));
        } else if (targetField === 'brandStory') {
          setFormData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              sections: {
                ...prev.settings.sections,
                brandStory: {
                  ...prev.settings.sections.brandStory,
                  imageUrl: uploaded.url,
                },
              },
            },
          }));
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-[#593D30]">
        <div className="w-8 h-8 border-2 border-[#D7C5AF] border-t-[#A85F49] rounded-full animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest font-mono text-[#8E8172]">
          Loading store settings & branding...
        </p>
      </div>
    );
  }

  const navTabs = [
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'announcement', label: 'Announcement Bar', icon: Megaphone },
    { id: 'hero', label: 'Hero Banner', icon: ImageIcon },
    { id: 'sections', label: 'Homepage Sections', icon: Layout },
    { id: 'contact', label: 'Contact & Footer', icon: Phone },
    { id: 'seo', label: 'SEO & Meta', icon: Search },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D7C5AF]/60">
        <div>
          <span className="text-[10px] uppercase tracking-[0.24em] font-bold text-[#A85F49] block">
            White-Label Store Configuration
          </span>
          <h2 className="text-2xl font-serif text-[#593D30] font-light">
            Storefront Settings & Branding
          </h2>
          <p className="text-xs text-[#8E8172] mt-0.5">
            Customize your brand identity, colors, hero banners, announcements, and footer. Changes apply immediately to your public storefront.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving}
            className="px-3 py-2 bg-[#FAF7F2] hover:bg-[#D7C5AF]/20 border border-[#D7C5AF] rounded-xs text-[#593D30] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-xs font-medium uppercase tracking-wider text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xs text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xs text-red-800 text-xs flex items-center gap-2.5 animate-fade-in shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#D7C5AF]/40 select-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium rounded-xs flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#593D30] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] text-[#8E8172] hover:text-[#593D30] hover:bg-[#D7C5AF]/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-2xs">
        {/* 1. Branding & Identity Tab */}
        {activeSubTab === 'branding' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg text-[#593D30]">Brand Identity & Visuals</h3>
              <p className="text-xs text-[#8E8172]">Manage your brand name, logo, wordmark tagline, and palette.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Store / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Royal Jewellery"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={formData.settings.branding.tagline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        branding: { ...formData.settings.branding, tagline: e.target.value },
                      },
                    })
                  }
                  placeholder="e.g. Fine Sterling Silver Atelier"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            {/* Logo Image URL & Upload */}
            <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-3">
              <label className="block text-xs font-medium text-[#593D30]">Store Logo Image</label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {formData.settings.branding.logoUrl ? (
                  <div className="w-24 h-24 bg-white border border-[#D7C5AF] rounded-xs p-2 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={formData.settings.branding.logoUrl}
                      alt="Brand Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-white border border-dashed border-[#D7C5AF] rounded-xs flex flex-col items-center justify-center text-[#8E8172] text-[10px] shrink-0 p-2 text-center">
                    <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                    <span>No Logo</span>
                  </div>
                )}

                <div className="flex-1 w-full space-y-2">
                  <input
                    type="url"
                    value={formData.settings.branding.logoUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          branding: { ...formData.settings.branding, logoUrl: e.target.value },
                          logoUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-white border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-[#593D30] hover:bg-[#A85F49] text-white text-[11px] rounded-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Logo File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => handleImageUpload(e.target.files?.[0], 'logo')}
                      />
                    </label>
                    <span className="text-[11px] text-[#8E8172]">PNG, SVG, or JPG recommended (transparent background)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-[#A85F49] mb-3">
                Theme Colors
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-1.5">
                  <span className="block text-[11px] text-[#8E8172] font-medium">Primary Brand Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.settings.branding.primaryColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            branding: { ...formData.settings.branding, primaryColor: e.target.value },
                          },
                        })
                      }
                      className="w-8 h-8 rounded-xs border border-[#D7C5AF] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.settings.branding.primaryColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            branding: { ...formData.settings.branding, primaryColor: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-[#D7C5AF] font-mono text-xs rounded-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-1.5">
                  <span className="block text-[11px] text-[#8E8172] font-medium">Accent Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.settings.branding.accentColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            branding: { ...formData.settings.branding, accentColor: e.target.value },
                          },
                        })
                      }
                      className="w-8 h-8 rounded-xs border border-[#D7C5AF] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.settings.branding.accentColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            branding: { ...formData.settings.branding, accentColor: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-[#D7C5AF] font-mono text-xs rounded-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-1.5">
                  <span className="block text-[11px] text-[#8E8172] font-medium">Secondary / Background</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.settings.branding.secondaryColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            branding: { ...formData.settings.branding, secondaryColor: e.target.value },
                          },
                        })
                      }
                      className="w-8 h-8 rounded-xs border border-[#D7C5AF] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.settings.branding.secondaryColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            branding: { ...formData.settings.branding, secondaryColor: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-[#D7C5AF] font-mono text-xs rounded-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Store Operational Currency</label>
                <select
                  value={formData.settings.currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    const sym = c === 'INR' ? '₹' : (c === 'USD' ? '$' : (c === 'EUR' ? '€' : (c === 'GBP' ? '£' : 'AED ')));
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        currency: c,
                        currencySymbol: sym,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="AED">AED (AED) — UAE Dirham</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Custom Domain (Optional)</label>
                <input
                  type="text"
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  placeholder="e.g. jewellery.mydomain.com"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Announcement Bar Tab */}
        {activeSubTab === 'announcement' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg text-[#593D30]">Storefront Announcement Strip</h3>
              <p className="text-xs text-[#8E8172]">Configure the prominent marquee or banner at the top of your public storefront.</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableAnnouncement"
                checked={formData.settings.announcement.enabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      announcement: { ...formData.settings.announcement, enabled: e.target.checked },
                    },
                  })
                }
                className="w-4 h-4 text-[#A85F49] rounded-xs border-[#D7C5AF] focus:ring-0"
              />
              <label htmlFor="enableAnnouncement" className="text-xs font-medium text-[#593D30] cursor-pointer">
                Enable Announcement Bar on Public Website
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Announcement Message *</label>
                <textarea
                  rows="3"
                  value={formData.settings.announcement.text}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        announcement: { ...formData.settings.announcement, text: e.target.value },
                      },
                    })
                  }
                  placeholder="e.g. Free insured express delivery on all orders · Pure 925 Hallmarked Silver"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.settings.announcement.bgColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            announcement: { ...formData.settings.announcement, bgColor: e.target.value },
                          },
                        })
                      }
                      className="w-8 h-8 rounded-xs border border-[#D7C5AF] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.settings.announcement.bgColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            announcement: { ...formData.settings.announcement, bgColor: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-[#FAF7F2] border border-[#D7C5AF] font-mono text-xs rounded-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.settings.announcement.textColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            announcement: { ...formData.settings.announcement, textColor: e.target.value },
                          },
                        })
                      }
                      className="w-8 h-8 rounded-xs border border-[#D7C5AF] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.settings.announcement.textColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            announcement: { ...formData.settings.announcement, textColor: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-[#FAF7F2] border border-[#D7C5AF] font-mono text-xs rounded-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Bar */}
              <div className="p-3 rounded-xs border border-[#D7C5AF]/40 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8172]">
                  Live Visual Preview
                </span>
                <div
                  style={{
                    backgroundColor: formData.settings.announcement.bgColor,
                    color: formData.settings.announcement.textColor,
                  }}
                  className="w-full py-2 px-4 text-center text-xs tracking-wider rounded-xs font-medium select-none truncate"
                >
                  {formData.settings.announcement.text || 'Announcement message preview appears here...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Hero Banner Tab */}
        {activeSubTab === 'hero' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg text-[#593D30]">Homepage Hero Showcase</h3>
              <p className="text-xs text-[#8E8172]">Define the primary hero banner headline, tag, narrative, and CTA button.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Hero Subheading (Kicker)</label>
                <input
                  type="text"
                  value={formData.settings.hero.subheading}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        hero: { ...formData.settings.hero, subheading: e.target.value },
                      },
                    })
                  }
                  placeholder="e.g. ROYAL JEWELLERY FINE SILVER"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Main Heading *</label>
                <input
                  type="text"
                  value={formData.settings.hero.heading}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        hero: { ...formData.settings.hero, heading: e.target.value },
                      },
                    })
                  }
                  placeholder="e.g. A Little Extraordinary"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Hero Editorial Narrative</label>
              <textarea
                rows="3"
                value={formData.settings.hero.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      hero: { ...formData.settings.hero, description: e.target.value },
                    },
                  })
                }
                placeholder="Sculptural fine jewellery conceived in solid 925 sterling silver..."
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">CTA Button Text</label>
                <input
                  type="text"
                  value={formData.settings.hero.ctaText}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        hero: { ...formData.settings.hero, ctaText: e.target.value },
                      },
                    })
                  }
                  placeholder="Explore Collection"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">CTA Target Link</label>
                <input
                  type="text"
                  value={formData.settings.hero.ctaLink}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        hero: { ...formData.settings.hero, ctaLink: e.target.value },
                      },
                    })
                  }
                  placeholder="#categories"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            {/* Optional Custom Background Image */}
            <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-3">
              <label className="block text-xs font-medium text-[#593D30]">Custom Hero Background Banner (Optional)</label>
              <p className="text-[11px] text-[#8E8172]">
                Leave empty to display the luxury photorealistic 3D rotating ring showcase on your storefront.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  value={formData.settings.hero.desktopImageUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        hero: { ...formData.settings.hero, desktopImageUrl: e.target.value },
                      },
                    })
                  }
                  placeholder="https://example.com/banner.jpg"
                  className="flex-1 px-3 py-2 bg-white border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
                <label className="px-3 py-2 bg-[#593D30] hover:bg-[#A85F49] text-white text-xs rounded-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => handleImageUpload(e.target.files?.[0], 'hero')}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. Sections Tab */}
        {activeSubTab === 'sections' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg text-[#593D30]">Homepage Sections & Story</h3>
              <p className="text-xs text-[#8E8172]">Enable or configure the headings and content for each storefront section.</p>
            </div>

            <div className="space-y-4">
              {/* Category section */}
              <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[#593D30]">Categories Showcase</span>
                  <input
                    type="checkbox"
                    checked={formData.settings.sections.categories.enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          sections: {
                            ...formData.settings.sections,
                            categories: { ...formData.settings.sections.categories, enabled: e.target.checked },
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-[#A85F49] rounded-xs"
                  />
                </div>
                <input
                  type="text"
                  value={formData.settings.sections.categories.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        sections: {
                          ...formData.settings.sections,
                          categories: { ...formData.settings.sections.categories, title: e.target.value },
                        },
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-[#D7C5AF] rounded-xs text-xs"
                />
              </div>

              {/* Bestsellers section */}
              <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[#593D30]">Bestsellers Collection</span>
                  <input
                    type="checkbox"
                    checked={formData.settings.sections.bestsellers.enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          sections: {
                            ...formData.settings.sections,
                            bestsellers: { ...formData.settings.sections.bestsellers, enabled: e.target.checked },
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-[#A85F49] rounded-xs"
                  />
                </div>
                <input
                  type="text"
                  value={formData.settings.sections.bestsellers.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        sections: {
                          ...formData.settings.sections,
                          bestsellers: { ...formData.settings.sections.bestsellers, title: e.target.value },
                        },
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-[#D7C5AF] rounded-xs text-xs"
                />
              </div>

              {/* Brand Story Section */}
              <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[#593D30]">Brand Philosophy & Story</span>
                  <input
                    type="checkbox"
                    checked={formData.settings.sections.brandStory.enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          sections: {
                            ...formData.settings.sections,
                            brandStory: { ...formData.settings.sections.brandStory, enabled: e.target.checked },
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-[#A85F49] rounded-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#8E8172] mb-1">Story Subtitle</label>
                    <input
                      type="text"
                      value={formData.settings.sections.brandStory.subtitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            sections: {
                              ...formData.settings.sections,
                              brandStory: { ...formData.settings.sections.brandStory, subtitle: e.target.value },
                            },
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-[#D7C5AF] rounded-xs text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#8E8172] mb-1">Story Heading</label>
                    <input
                      type="text"
                      value={formData.settings.sections.brandStory.title}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            sections: {
                              ...formData.settings.sections,
                              brandStory: { ...formData.settings.sections.brandStory, title: e.target.value },
                            },
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-[#D7C5AF] rounded-xs text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#8E8172] mb-1">Narrative Content</label>
                  <textarea
                    rows="4"
                    value={formData.settings.sections.brandStory.content}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          sections: {
                            ...formData.settings.sections,
                            brandStory: { ...formData.settings.sections.brandStory, content: e.target.value },
                          },
                        },
                      })
                    }
                    placeholder="Describe your design philosophy, craftsmanship, or metallurgical purity..."
                    className="w-full px-3 py-2 bg-white border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Contact & Footer Tab */}
        {activeSubTab === 'contact' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg text-[#593D30]">Contact Details & Footer Information</h3>
              <p className="text-xs text-[#8E8172]">Provide verified business contact numbers, registered address, and footer details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Customer Support Email</label>
                <input
                  type="email"
                  value={formData.settings.supportEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        supportEmail: e.target.value,
                        footer: { ...formData.settings.footer, contactEmail: e.target.value },
                      },
                    })
                  }
                  placeholder="support@yourbrand.com"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Contact Phone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.settings.contactPhone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        contactPhone: e.target.value,
                        footer: { ...formData.settings.footer, contactPhone: e.target.value },
                      },
                    })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Footer Brand Statement</label>
              <textarea
                rows="2"
                value={formData.settings.footer.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      footer: { ...formData.settings.footer, description: e.target.value },
                    },
                  })
                }
                placeholder="Sculptural fine jewellery conceived exclusively in solid 925 sterling silver..."
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
              />
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-[#A85F49] mb-3">
                Social Media Links
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[#8E8172] mb-1">Instagram URL</label>
                  <input
                    type="url"
                    value={formData.settings.footer.socialLinks.instagram}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          footer: {
                            ...formData.settings.footer,
                            socialLinks: { ...formData.settings.footer.socialLinks, instagram: e.target.value },
                          },
                        },
                      })
                    }
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#8E8172] mb-1">Facebook URL</label>
                  <input
                    type="url"
                    value={formData.settings.footer.socialLinks.facebook}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          footer: {
                            ...formData.settings.footer,
                            socialLinks: { ...formData.settings.footer.socialLinks, facebook: e.target.value },
                          },
                        },
                      })
                    }
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#8E8172] mb-1">Twitter / X URL</label>
                  <input
                    type="url"
                    value={formData.settings.footer.socialLinks.twitter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          footer: {
                            ...formData.settings.footer,
                            socialLinks: { ...formData.settings.footer.socialLinks, twitter: e.target.value },
                          },
                        },
                      })
                    }
                    placeholder="https://x.com/yourhandle"
                    className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Copyright Notice</label>
              <input
                type="text"
                value={formData.settings.footer.copyrightText}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      footer: { ...formData.settings.footer, copyrightText: e.target.value },
                    },
                  })
                }
                placeholder={`© ${new Date().getFullYear()} ${formData.name}. All rights reserved.`}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
              />
            </div>
          </div>
        )}

        {/* 6. SEO Tab */}
        {activeSubTab === 'seo' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg text-[#593D30]">Search Engine Optimization (SEO)</h3>
              <p className="text-xs text-[#8E8172]">Configure search result title tags and meta descriptions for search visibility.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Store SEO Title</label>
                <input
                  type="text"
                  value={formData.settings.seo.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        seo: { ...formData.settings.seo, title: e.target.value },
                      },
                    })
                  }
                  placeholder="e.g. Royal Jewellery | 925 Sterling Silver Fine Jewellery Atelier"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Meta Description</label>
                <textarea
                  rows="3"
                  value={formData.settings.seo.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        seo: { ...formData.settings.seo, description: e.target.value },
                      },
                    })
                  }
                  placeholder="e.g. Discover handcrafted solid 925 sterling silver rings, anklets and bespoke jewellery creations..."
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Action */}
      <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex items-center justify-between">
        <div className="text-xs text-[#8E8172]">
          All settings are stored dynamically in the shared database and isolated to your store ({formData.slug}).
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-xs font-medium uppercase tracking-wider text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
