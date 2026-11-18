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
  FileText,
  BookOpen,
  Plus,
  Trash2,
  Eye,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  HelpCircle,
  Truck,
  RotateCcw,
  Check,
  Shield,
} from 'lucide-react';
import { getTenantStoreSettings, updateTenantStoreSettings, uploadMediaImage } from './api';
import { StorePolicyPageView } from '../components/StorePolicyPageView';
import { sanitizePhoneInput, isValidPhoneNumber } from '../utils/phone';

export const StoreSettingsManager = ({ admin, onStoreUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeContentPageKey, setActiveContentPageKey] = useState('aboutUs');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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
      policies: {
        returnPolicy: '',
        returnPolicyConfig: {
          returnWindowDays: 7,
          policyOverview: '',
          windowDetails: '',
          returnConditions: '',
          refundTimeline: '',
          exchangeTerms: '',
          nonReturnableItems: '',
          whatsappSupportNumber: '',
          whatsappMessage: '',
        },
      },
      contentPages: {
        aboutUs: { title: 'About Us', content: '', status: 'draft', updatedAt: null },
        returnPolicy: {
          title: 'Return & Refund Policy',
          content: '',
          status: 'draft',
          updatedAt: null,
          returnPeriod: 7,
          eligibleProducts: '',
          nonReturnableProducts: '',
          returnConditions: '',
          refundProcess: '',
          refundTimeline: '',
          exchangeConditions: '',
          supportPhone: '',
          supportEmail: '',
        },
        shippingPolicy: {
          title: 'Shipping Policy',
          content: '',
          status: 'draft',
          updatedAt: null,
          shippingCharges: '',
          freeShippingThreshold: '',
          estimatedDeliveryTime: '',
          shippingLocations: '',
          processingTime: '',
          trackingInformation: '',
        },
        privacyPolicy: { title: 'Privacy Policy', content: '', status: 'draft', updatedAt: null },
        termsConditions: { title: 'Terms & Conditions', content: '', status: 'draft', updatedAt: null },
        contactUs: {
          title: 'Contact Us',
          content: '',
          status: 'draft',
          updatedAt: null,
          contactEmail: '',
          contactPhone: '',
          businessHours: '',
          address: '',
          whatsappNumber: '',
        },
        faqs: {
          title: 'Frequently Asked Questions',
          content: '',
          status: 'draft',
          updatedAt: null,
          items: [],
        },
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
            policies: {
              returnPolicy: data.settings?.policies?.returnPolicy || '',
              returnPolicyConfig: {
                returnWindowDays:
                  data.settings?.policies?.returnPolicyConfig?.returnWindowDays !== undefined
                    ? data.settings.policies.returnPolicyConfig.returnWindowDays
                    : (data.slug === 'aurelle' ? 2 : 7),
                policyOverview: data.settings?.policies?.returnPolicyConfig?.policyOverview || '',
                windowDetails: data.settings?.policies?.returnPolicyConfig?.windowDetails || '',
                returnConditions: data.settings?.policies?.returnPolicyConfig?.returnConditions || '',
                refundTimeline: data.settings?.policies?.returnPolicyConfig?.refundTimeline || '',
                exchangeTerms: data.settings?.policies?.returnPolicyConfig?.exchangeTerms || '',
                nonReturnableItems: data.settings?.policies?.returnPolicyConfig?.nonReturnableItems || '',
                whatsappSupportNumber: data.settings?.policies?.returnPolicyConfig?.whatsappSupportNumber || '',
                whatsappMessage: data.settings?.policies?.returnPolicyConfig?.whatsappMessage || '',
              },
            },
            contentPages: {
              aboutUs: {
                title: data.settings?.contentPages?.aboutUs?.title || 'About Us',
                content: data.settings?.contentPages?.aboutUs?.content || data.settings?.policies?.aboutUs || '',
                status: data.settings?.contentPages?.aboutUs?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.aboutUs?.updatedAt || null,
              },
              returnPolicy: {
                title: data.settings?.contentPages?.returnPolicy?.title || 'Return & Refund Policy',
                content: data.settings?.contentPages?.returnPolicy?.content || data.settings?.policies?.returnPolicy || '',
                status: data.settings?.contentPages?.returnPolicy?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.returnPolicy?.updatedAt || null,
                returnPeriod: data.settings?.contentPages?.returnPolicy?.returnPeriod ?? data.settings?.policies?.returnPolicyConfig?.returnWindowDays ?? (data.slug === 'aurelle' ? 2 : 7),
                eligibleProducts: data.settings?.contentPages?.returnPolicy?.eligibleProducts || data.settings?.policies?.returnPolicyConfig?.windowDetails || '',
                nonReturnableProducts: data.settings?.contentPages?.returnPolicy?.nonReturnableProducts || data.settings?.policies?.returnPolicyConfig?.nonReturnableItems || '',
                returnConditions: data.settings?.contentPages?.returnPolicy?.returnConditions || data.settings?.policies?.returnPolicyConfig?.returnConditions || '',
                refundProcess: data.settings?.contentPages?.returnPolicy?.refundProcess || '',
                refundTimeline: data.settings?.contentPages?.returnPolicy?.refundTimeline || data.settings?.policies?.returnPolicyConfig?.refundTimeline || '',
                exchangeConditions: data.settings?.contentPages?.returnPolicy?.exchangeConditions || data.settings?.policies?.returnPolicyConfig?.exchangeTerms || '',
                supportPhone: data.settings?.contentPages?.returnPolicy?.supportPhone || data.settings?.policies?.returnPolicyConfig?.whatsappSupportNumber || data.settings?.contactPhone || '',
                supportEmail: data.settings?.contentPages?.returnPolicy?.supportEmail || data.settings?.supportEmail || '',
              },
              shippingPolicy: {
                title: data.settings?.contentPages?.shippingPolicy?.title || 'Shipping Policy',
                content: data.settings?.contentPages?.shippingPolicy?.content || data.settings?.policies?.shippingPolicy || '',
                status: data.settings?.contentPages?.shippingPolicy?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.shippingPolicy?.updatedAt || null,
                shippingCharges: data.settings?.contentPages?.shippingPolicy?.shippingCharges || '',
                freeShippingThreshold: data.settings?.contentPages?.shippingPolicy?.freeShippingThreshold || '',
                estimatedDeliveryTime: data.settings?.contentPages?.shippingPolicy?.estimatedDeliveryTime || '',
                shippingLocations: data.settings?.contentPages?.shippingPolicy?.shippingLocations || '',
                processingTime: data.settings?.contentPages?.shippingPolicy?.processingTime || '',
                trackingInformation: data.settings?.contentPages?.shippingPolicy?.trackingInformation || '',
              },
              privacyPolicy: {
                title: data.settings?.contentPages?.privacyPolicy?.title || 'Privacy Policy',
                content: data.settings?.contentPages?.privacyPolicy?.content || data.settings?.policies?.privacyPolicy || '',
                status: data.settings?.contentPages?.privacyPolicy?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.privacyPolicy?.updatedAt || null,
              },
              termsConditions: {
                title: data.settings?.contentPages?.termsConditions?.title || 'Terms & Conditions',
                content: data.settings?.contentPages?.termsConditions?.content || data.settings?.policies?.termsConditions || '',
                status: data.settings?.contentPages?.termsConditions?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.termsConditions?.updatedAt || null,
              },
              contactUs: {
                title: data.settings?.contentPages?.contactUs?.title || 'Contact Us',
                content: data.settings?.contentPages?.contactUs?.content || '',
                status: data.settings?.contentPages?.contactUs?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.contactUs?.updatedAt || null,
                contactEmail: data.settings?.contentPages?.contactUs?.contactEmail || data.settings?.supportEmail || '',
                contactPhone: data.settings?.contentPages?.contactUs?.contactPhone || data.settings?.contactPhone || '',
                businessHours: data.settings?.contentPages?.contactUs?.businessHours || '',
                address: data.settings?.contentPages?.contactUs?.address || data.settings?.businessAddress?.addressLine1 || '',
                whatsappNumber: data.settings?.contentPages?.contactUs?.whatsappNumber || data.settings?.contactPhone || '',
              },
              faqs: {
                title: data.settings?.contentPages?.faqs?.title || 'Frequently Asked Questions',
                content: data.settings?.contentPages?.faqs?.content || '',
                status: data.settings?.contentPages?.faqs?.status || (data.slug === 'aurelle' ? 'published' : 'draft'),
                updatedAt: data.settings?.contentPages?.faqs?.updatedAt || null,
                items: Array.isArray(data.settings?.contentPages?.faqs?.items) ? data.settings.contentPages.faqs.items : [],
              },
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
      // Validate all phone numbers if present
      const phoneFieldsToValidate = [
        { val: formData.settings?.contactPhone, label: 'Contact Phone' },
        { val: formData.settings?.footer?.contactPhone, label: 'Footer Contact Phone' },
        { val: formData.settings?.contentPages?.returnPolicy?.supportPhone, label: 'Return Policy Support Phone' },
        { val: formData.settings?.contentPages?.contactUs?.contactPhone, label: 'Contact Us Support Phone' },
        { val: formData.settings?.contentPages?.contactUs?.whatsappNumber, label: 'Contact Us WhatsApp Number' },
        { val: formData.settings?.policies?.returnPolicyConfig?.whatsappSupportNumber, label: 'Return Policy WhatsApp Number' },
      ];

      for (const item of phoneFieldsToValidate) {
        if (item.val && String(item.val).trim()) {
          const clean = sanitizePhoneInput(item.val);
          if (!isValidPhoneNumber(clean)) {
            setErrorMessage(`${item.label} must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.`);
            setSaving(false);
            return;
          }
        }
      }

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
    { id: 'contentPages', label: 'Store Content & Policies', icon: BookOpen },
    { id: 'contact', label: 'Contact & Footer', icon: Phone },
    { id: 'seo', label: 'SEO & Meta', icon: Search },
  ];

  const contentPageTabs = [
    { key: 'aboutUs', slug: 'about-us', label: 'About Us', icon: BookOpen },
    { key: 'returnPolicy', slug: 'return-policy', label: 'Return & Refund Policy', icon: RotateCcw },
    { key: 'shippingPolicy', slug: 'shipping-policy', label: 'Shipping Policy', icon: Truck },
    { key: 'privacyPolicy', slug: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
    { key: 'termsConditions', slug: 'terms-and-conditions', label: 'Terms & Conditions', icon: FileText },
    { key: 'contactUs', slug: 'contact-us', label: 'Contact Us', icon: Phone },
    { key: 'faqs', slug: 'faqs', label: 'FAQs', icon: HelpCircle },
  ];

  const updateCurrentPage = (updates) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        contentPages: {
          ...prev.settings.contentPages,
          [activeContentPageKey]: {
            ...prev.settings.contentPages?.[activeContentPageKey],
            ...updates,
          },
        },
      },
    }));
  };

  const handleAddFaq = () => {
    const currItems = formData.settings.contentPages?.faqs?.items || [];
    const newItem = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
      order: currItems.length + 1,
    };
    updateCurrentPage({ items: [...currItems, newItem] });
  };

  const handleUpdateFaq = (index, field, value) => {
    const currItems = [...(formData.settings.contentPages?.faqs?.items || [])];
    if (currItems[index]) {
      currItems[index] = { ...currItems[index], [field]: value };
      updateCurrentPage({ items: currItems });
    }
  };

  const handleDeleteFaq = (index) => {
    const currItems = (formData.settings.contentPages?.faqs?.items || []).filter((_, i) => i !== index);
    updateCurrentPage({ items: currItems });
  };

  const insertFormatting = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById(`richtext-${activeContentPageKey}`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value || '';
    const selected = text.substring(start, end) || 'Sample text';
    const replacement = `${tagOpen}${selected}${tagClose}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);

    updateCurrentPage({ content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + replacement.length - tagClose.length);
    }, 50);
  };

  const currentPageConfig = contentPageTabs.find((p) => p.key === activeContentPageKey) || contentPageTabs[0];
  const activePageObj = formData.settings.contentPages?.[activeContentPageKey] || {};

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
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Contact Phone / WhatsApp (10 digits)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.settings.contactPhone}
                  onChange={(e) => {
                    const clean = sanitizePhoneInput(e.target.value);
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        contactPhone: clean,
                        footer: { ...formData.settings.footer, contactPhone: clean },
                      },
                    });
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
                {formData.settings.contactPhone && formData.settings.contactPhone.length > 0 && formData.settings.contactPhone.length < 10 && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    {10 - formData.settings.contactPhone.length} more digit{10 - formData.settings.contactPhone.length > 1 ? 's' : ''} needed
                  </p>
                )}
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

        {/* Store Content & Policies Tab */}
        {activeSubTab === 'contentPages' && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.24em] font-bold text-[#A85F49] block mb-1">
                Content &amp; Policy Management
              </span>
              <h3 className="font-serif text-xl text-[#593D30]">Store Content &amp; Policies</h3>
              <p className="text-xs text-[#8E8172] mt-0.5">
                Every page is completely isolated to your store ({formData.slug}). Configure titles, draft or published status, structured attributes, and rich-text content independently.
              </p>
            </div>

            {/* 7 Pages Sub-Navigation Pills */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs">
              {contentPageTabs.map((tab) => {
                const TabIcon = tab.icon;
                const page = formData.settings.contentPages?.[tab.key] || {};
                const isTabActive = activeContentPageKey === tab.key;
                const isPub = page.status === 'published';

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveContentPageKey(tab.key)}
                    className={`px-3 py-2 text-xs font-medium rounded-xs flex items-center gap-2 transition-all cursor-pointer ${
                      isTabActive
                        ? 'bg-[#593D30] text-white shadow-xs'
                        : 'bg-white hover:bg-[#D7C5AF]/20 text-[#593D30] border border-[#D7C5AF]/60'
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${isTabActive ? 'text-[#FAF7F2]' : 'text-[#A85F49]'}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPub ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                      title={isPub ? 'Published' : 'Draft'}
                    />
                  </button>
                );
              })}
            </div>

            {/* Active Page Editor Header Bar */}
            <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#8E8172]">
                    Page Slug:
                  </span>
                  <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-xs border border-[#D7C5AF] text-[#593D30]">
                    /{formData.slug}/{currentPageConfig.slug}
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={activePageObj.title || ''}
                    onChange={(e) => updateCurrentPage({ title: e.target.value })}
                    placeholder="Page Title"
                    className="font-serif text-lg font-medium text-[#593D30] bg-white border border-[#D7C5AF] px-3 py-1.5 rounded-xs w-full max-w-md focus:border-[#A85F49] outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Draft vs Published Selector */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#D7C5AF] rounded-xs">
                  <span className="text-xs font-medium text-[#8E8172]">Status:</span>
                  <select
                    value={activePageObj.status || 'draft'}
                    onChange={(e) => updateCurrentPage({ status: e.target.value })}
                    className="text-xs font-semibold bg-transparent text-[#593D30] outline-none cursor-pointer"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Live)</option>
                  </select>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      activePageObj.status === 'published' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>

                {/* Preview Page Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-[#D7C5AF]/30 border border-[#D7C5AF] text-[#593D30] text-xs font-medium rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#A85F49]" />
                  <span>Preview Page</span>
                </button>
              </div>
            </div>

            {/* Last updated notice */}
            {activePageObj.updatedAt && (
              <div className="text-[11px] text-[#8E8172] font-mono flex items-center gap-1.5 pl-1">
                <span>Last saved:</span>
                <span>{new Date(activePageObj.updatedAt).toLocaleString()}</span>
              </div>
            )}

            {/* Structured Fields by Page Type */}

            {/* 1. Return & Refund Policy Structured Fields */}
            {activeContentPageKey === 'returnPolicy' && (
              <div className="space-y-4 p-4 bg-white border border-[#D7C5AF]/70 rounded-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-[#D7C5AF]/40">
                  <RotateCcw className="w-4 h-4 text-[#A85F49]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#593D30]">
                    Return &amp; Refund Structured Fields
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Return Period (Days) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={activePageObj.returnPeriod ?? 7}
                      onChange={(e) =>
                        updateCurrentPage({ returnPeriod: parseInt(e.target.value, 10) || 0 })
                      }
                      placeholder="e.g. 7"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Dedicated Support Phone / WhatsApp (10 digits)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={activePageObj.supportPhone || ''}
                      onChange={(e) => updateCurrentPage({ supportPhone: sanitizePhoneInput(e.target.value) })}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                    {activePageObj.supportPhone && activePageObj.supportPhone.length > 0 && activePageObj.supportPhone.length < 10 && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        {10 - activePageObj.supportPhone.length} more digit{10 - activePageObj.supportPhone.length > 1 ? 's' : ''} needed
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Eligible Products
                    </label>
                    <textarea
                      rows="2"
                      value={activePageObj.eligibleProducts || ''}
                      onChange={(e) => updateCurrentPage({ eligibleProducts: e.target.value })}
                      placeholder="e.g. Solid 925 silver rings, pendants, and necklaces with tags intact."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Non-Returnable Products
                    </label>
                    <textarea
                      rows="2"
                      value={activePageObj.nonReturnableProducts || ''}
                      onChange={(e) => updateCurrentPage({ nonReturnableProducts: e.target.value })}
                      placeholder="e.g. Custom engraved items, personalized jewellery, and clearance pieces."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Return Conditions
                    </label>
                    <textarea
                      rows="3"
                      value={activePageObj.returnConditions || ''}
                      onChange={(e) => updateCurrentPage({ returnConditions: e.target.value })}
                      placeholder="e.g. Items must be unworn, with original tags, certificate, and packaging intact. Unboxing video required."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Refund Process &amp; Timeline
                    </label>
                    <textarea
                      rows="3"
                      value={activePageObj.refundTimeline || ''}
                      onChange={(e) => updateCurrentPage({ refundTimeline: e.target.value })}
                      placeholder="e.g. Refunds are initiated within 7-10 working days as per RBI guidelines following quality verification."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Exchange Conditions
                    </label>
                    <textarea
                      rows="2"
                      value={activePageObj.exchangeConditions || ''}
                      onChange={(e) => updateCurrentPage({ exchangeConditions: e.target.value })}
                      placeholder="e.g. Size exchanges are supported free of charge for rings and anklets."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Shipping Policy Structured Fields */}
            {activeContentPageKey === 'shippingPolicy' && (
              <div className="space-y-4 p-4 bg-white border border-[#D7C5AF]/70 rounded-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-[#D7C5AF]/40">
                  <Truck className="w-4 h-4 text-[#A85F49]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#593D30]">
                    Shipping Policy Structured Fields
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Shipping Charges
                    </label>
                    <input
                      type="text"
                      value={activePageObj.shippingCharges || ''}
                      onChange={(e) => updateCurrentPage({ shippingCharges: e.target.value })}
                      placeholder="e.g. Complimentary on all orders, or ₹99 flat rate"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Free Shipping Threshold
                    </label>
                    <input
                      type="text"
                      value={activePageObj.freeShippingThreshold || ''}
                      onChange={(e) => updateCurrentPage({ freeShippingThreshold: e.target.value })}
                      placeholder="e.g. ₹999 or ₹0"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Estimated Delivery Time
                    </label>
                    <input
                      type="text"
                      value={activePageObj.estimatedDeliveryTime || ''}
                      onChange={(e) => updateCurrentPage({ estimatedDeliveryTime: e.target.value })}
                      placeholder="e.g. 2 to 5 business days across India"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Processing &amp; Dispatch Time
                    </label>
                    <input
                      type="text"
                      value={activePageObj.processingTime || ''}
                      onChange={(e) => updateCurrentPage({ processingTime: e.target.value })}
                      placeholder="e.g. Dispatched within 24 to 48 business hours"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Serviceable Shipping Locations
                    </label>
                    <textarea
                      rows="2"
                      value={activePageObj.shippingLocations || ''}
                      onChange={(e) => updateCurrentPage({ shippingLocations: e.target.value })}
                      placeholder="e.g. Pan-India delivery covering 28 states and major union territories."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Tracking Information
                    </label>
                    <textarea
                      rows="2"
                      value={activePageObj.trackingInformation || ''}
                      onChange={(e) => updateCurrentPage({ trackingInformation: e.target.value })}
                      placeholder="e.g. Real-time courier tracking number sent via SMS and WhatsApp upon handoff."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Contact Us Structured Fields */}
            {activeContentPageKey === 'contactUs' && (
              <div className="space-y-4 p-4 bg-white border border-[#D7C5AF]/70 rounded-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-[#D7C5AF]/40">
                  <Phone className="w-4 h-4 text-[#A85F49]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#593D30]">
                    Contact Information Fields
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={activePageObj.contactEmail || ''}
                      onChange={(e) => updateCurrentPage({ contactEmail: e.target.value })}
                      placeholder="e.g. support@store.com"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Support Phone (10 digits)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={activePageObj.contactPhone || ''}
                      onChange={(e) => updateCurrentPage({ contactPhone: sanitizePhoneInput(e.target.value) })}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                    {activePageObj.contactPhone && activePageObj.contactPhone.length > 0 && activePageObj.contactPhone.length < 10 && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        {10 - activePageObj.contactPhone.length} more digit{10 - activePageObj.contactPhone.length > 1 ? 's' : ''} needed
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Business Hours
                    </label>
                    <input
                      type="text"
                      value={activePageObj.businessHours || ''}
                      onChange={(e) => updateCurrentPage({ businessHours: e.target.value })}
                      placeholder="e.g. Mon - Sat: 10:00 AM - 7:00 PM IST"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      WhatsApp Concierge Number (10 digits)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={activePageObj.whatsappNumber || ''}
                      onChange={(e) => updateCurrentPage({ whatsappNumber: sanitizePhoneInput(e.target.value) })}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                    {activePageObj.whatsappNumber && activePageObj.whatsappNumber.length > 0 && activePageObj.whatsappNumber.length < 10 && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        {10 - activePageObj.whatsappNumber.length} more digit{10 - activePageObj.whatsappNumber.length > 1 ? 's' : ''} needed
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[#8E8172] mb-1">
                      Atelier / Business Address
                    </label>
                    <textarea
                      rows="2"
                      value={activePageObj.address || ''}
                      onChange={(e) => updateCurrentPage({ address: e.target.value })}
                      placeholder="e.g. Johari Bazaar, Jaipur, Rajasthan 302003"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. FAQs Manager */}
            {activeContentPageKey === 'faqs' && (
              <div className="space-y-4 p-4 bg-white border border-[#D7C5AF]/70 rounded-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#D7C5AF]/40">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#A85F49]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#593D30]">
                      Frequently Asked Questions ({activePageObj.items?.length || 0})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="px-3 py-1.5 bg-[#593D30] hover:bg-[#A85F49] text-white text-xs font-medium rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                {(!activePageObj.items || activePageObj.items.length === 0) ? (
                  <div className="p-8 text-center text-xs text-[#8E8172] border border-dashed border-[#D7C5AF]">
                    No questions added yet. Click &quot;Add Question&quot; to create your first FAQ.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activePageObj.items.map((faq, idx) => (
                      <div
                        key={faq.id || idx}
                        className="p-3 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs space-y-2 relative"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-[#A85F49] uppercase">
                            Q#{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteFaq(idx)}
                            className="p-1 text-[#8E8172] hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={faq.question || ''}
                            onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                            placeholder="e.g. Is all jewellery made of solid 925 sterling silver?"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] font-medium"
                          />
                        </div>
                        <div>
                          <textarea
                            rows="2"
                            value={faq.answer || ''}
                            onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                            placeholder="e.g. Yes, every creation is cast in solid 925 sterling silver with the authentic 925 hallmark."
                            className="w-full px-2.5 py-1.5 bg-white border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rich-Text / HTML Editor with Toolbar */}
            <div className="space-y-2 p-4 bg-white border border-[#D7C5AF]/70 rounded-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D7C5AF]/40">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#593D30] block">
                    Page Body Content (Rich-Text / HTML)
                  </label>
                  <p className="text-[11px] text-[#8E8172]">
                    Use formatting tools below or enter structured HTML. Output is automatically sanitized for security.
                  </p>
                </div>

                {/* Rich-Text Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1 bg-[#FAF7F2] p-1 border border-[#D7C5AF] rounded-xs">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    className="p-1.5 hover:bg-white rounded-xs text-[#593D30] text-xs font-bold transition-colors cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1.5 hover:bg-white rounded-xs text-[#593D30] text-xs italic transition-colors cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h2>', '</h2>')}
                    className="px-1.5 py-0.5 hover:bg-white rounded-xs text-[#593D30] text-[11px] font-bold transition-colors cursor-pointer"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h3>', '</h3>')}
                    className="px-1.5 py-0.5 hover:bg-white rounded-xs text-[#593D30] text-[11px] font-bold transition-colors cursor-pointer"
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<p>', '</p>')}
                    className="px-1.5 py-0.5 hover:bg-white rounded-xs text-[#593D30] text-[11px] font-medium transition-colors cursor-pointer"
                    title="Paragraph"
                  >
                    &lt;p&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1.5 hover:bg-white rounded-xs text-[#593D30] transition-colors cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')}
                    className="p-1.5 hover:bg-white rounded-xs text-[#593D30] transition-colors cursor-pointer"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                    className="px-1.5 py-0.5 hover:bg-white rounded-xs text-[#593D30] text-[11px] transition-colors cursor-pointer"
                    title="Blockquote"
                  >
                    Quote
                  </button>
                </div>
              </div>

              <textarea
                id={`richtext-${activeContentPageKey}`}
                rows="8"
                value={activePageObj.content || ''}
                onChange={(e) => updateCurrentPage({ content: e.target.value })}
                placeholder={`Enter rich-text HTML content for ${currentPageConfig.label}...`}
                className="w-full p-3 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] font-mono leading-relaxed outline-none focus:border-[#A85F49]"
              />
            </div>
          </div>
        )}

        {/* Live Preview Modal */}
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xs shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#D7C5AF]">
              <div className="p-4 bg-[#FAF7F2] border-b border-[#D7C5AF] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#A85F49]" />
                  <span className="font-serif text-sm font-medium text-[#593D30]">
                    Storefront Live Preview — {currentPageConfig.label} ({formData.name})
                  </span>
                  <span
                    className={`ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                      activePageObj.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {activePageObj.status === 'published' ? 'Published' : 'Draft / Private'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1 hover:bg-[#D7C5AF]/30 rounded-xs text-[#593D30] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-white">
                <StorePolicyPageView
                  pageSlug={currentPageConfig.slug}
                  storeInfo={{
                    ...formData,
                    config: {
                      contentPages: formData.settings.contentPages,
                      footer: formData.settings.footer,
                    },
                    settings: {
                      ...formData.settings,
                      contentPages: formData.settings.contentPages,
                    },
                  }}
                  onBack={() => setIsPreviewModalOpen(false)}
                />
              </div>

              <div className="p-3 bg-[#FAF7F2] border-t border-[#D7C5AF] flex items-center justify-between">
                <span className="text-xs text-[#8E8172]">
                  This is a live preview using your unsaved/saved form state.
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-1.5 bg-[#593D30] hover:bg-[#A85F49] text-white text-xs font-medium rounded-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
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
