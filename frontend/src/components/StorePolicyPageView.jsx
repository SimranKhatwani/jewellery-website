import React, { useEffect, useState, useMemo } from 'react';
import { sanitizeHtml } from '../utils/sanitize';
import {
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  Truck,
  Mail,
  Phone,
  Clock,
  MapPin,
  MessageCircle,
  HelpCircle,
  FileText,
  AlertCircle,
  ChevronDown,
  Search,
  CheckCircle2,
} from 'lucide-react';

export const StorePolicyPageView = ({
  pageSlug = 'return-policy',
  storeInfo = null,
  onBack,
  onNavigatePage,
}) => {
  const [activeFaq, setActiveFaq] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pageSlug]);

  const brandName = storeInfo?.name || 'Store';
  const storeSlug = storeInfo?.slug || 'aurelle';
  const isAurelle = storeSlug === 'aurelle';
  const contentPages = storeInfo?.config?.contentPages || storeInfo?.settings?.contentPages || {};

  // Normalize pageSlug to contentPages key
  const pageKey = useMemo(() => {
    const slug = (pageSlug || '').toLowerCase().trim();
    const map = {
      'about-us': 'aboutUs',
      'about': 'aboutUs',
      'return-policy': 'returnPolicy',
      'return-and-refund-policy': 'returnPolicy',
      'returns': 'returnPolicy',
      'shipping-policy': 'shippingPolicy',
      'shipping': 'shippingPolicy',
      'privacy-policy': 'privacyPolicy',
      'privacy': 'privacyPolicy',
      'terms-and-conditions': 'termsConditions',
      'terms': 'termsConditions',
      'contact-us': 'contactUs',
      'contact': 'contactUs',
      'faqs': 'faqs',
      'faq': 'faqs',
    };
    return map[slug] || 'returnPolicy';
  }, [pageSlug]);

  const pageData = contentPages[pageKey] || null;
  const isPublished = pageData && pageData.status === 'published';

  // Last updated date formatting
  const formattedLastUpdated = useMemo(() => {
    if (!pageData?.updatedAt) return null;
    try {
      const d = new Date(pageData.updatedAt);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  }, [pageData?.updatedAt]);

  // Page titles
  const defaultTitles = {
    aboutUs: 'About Us',
    returnPolicy: 'Return & Refund Policy',
    shippingPolicy: 'Shipping Policy',
    privacyPolicy: 'Privacy Policy',
    termsConditions: 'Terms & Conditions',
    contactUs: 'Contact Us',
    faqs: 'Frequently Asked Questions',
  };

  const title = pageData?.title || defaultTitles[pageKey] || 'Store Policy';

  // Support phone & WhatsApp link
  const supportPhone =
    pageData?.supportPhone ||
    storeInfo?.settings?.contactPhone ||
    storeInfo?.config?.footer?.contactPhone ||
    '';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const whatsappMsg =
    pageData?.whatsappMessage ||
    `Hello ${brandName} Support, I have an inquiry regarding your ${title}.`;
  const whatsappUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMsg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;

  // FAQ items filtered
  const filteredFaqs = useMemo(() => {
    if (pageKey !== 'faqs') return [];
    const items = pageData?.items || [];
    if (!faqSearch.trim()) return items;
    const q = faqSearch.toLowerCase().trim();
    return items.filter(
      (f) =>
        (f.question && f.question.toLowerCase().includes(q)) ||
        (f.answer && f.answer.toLowerCase().includes(q))
    );
  }, [pageKey, pageData?.items, faqSearch]);

  // If page is draft / unpublished, show clean unavailable state
  if (!isPublished) {
    return (
      <div className="min-h-[70vh] bg-[#FFFFFF] text-[#2D2A26] pt-10 pb-24 px-6 sm:px-10 lg:px-16 flex flex-col items-center justify-center">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FAF7F2] border border-[#D7C5AF] flex items-center justify-center text-[#A85F49]">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-[#8E8172] block mb-2">
              {brandName} Policy Notice
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#1C1917] font-normal">
              {title}
            </h1>
            <p className="mt-4 text-sm text-[#57534E] leading-relaxed">
              The {title.toLowerCase()} for <strong className="text-[#1C1917]">{brandName}</strong> is currently in preparation and will be published shortly.
            </p>
            <p className="mt-2 text-xs text-[#8E8172]">
              For immediate assistance, please reach out to our customer care team directly.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#593D30] hover:bg-[#A85F49] text-white text-xs uppercase tracking-widest font-medium rounded-xs transition-colors cursor-pointer"
            >
              Return to Catalogue
            </button>
            {supportPhone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-[#FAF7F2] hover:bg-[#D7C5AF]/30 border border-[#D7C5AF] text-[#593D30] text-xs uppercase tracking-widest font-medium rounded-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#A85F49]" />
                <span>Contact Support</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Published Page Rendering
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#2D2A26] pt-6 md:pt-10 pb-24 px-6 sm:px-10 lg:px-16">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-10 pb-4 border-b border-[#E5E0D8] flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#8E8172] hover:text-[#A85F49] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Catalogue</span>
          </button>

          {formattedLastUpdated && (
            <span className="text-[11px] font-mono text-[#8E8172]">
              Last updated: {formattedLastUpdated}
            </span>
          )}
        </div>

        {/* Page Content Article */}
        <article className="space-y-8 font-sans">
          {/* Main Title Banner */}
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em] font-mono text-[#A85F49] block mb-1">
              {brandName} Documentation
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1C1917] font-light tracking-tight">
              {title}
            </h1>
          </div>

          {/* 1. Return & Refund Policy Structured Content */}
          {pageKey === 'returnPolicy' && (
            <div className="space-y-6">
              {/* Highlight Return Window Card */}
              <div className="p-5 bg-[#FAF7F2] border border-[#D7C5AF]/70 rounded-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white border border-[#D7C5AF] flex items-center justify-center text-[#A85F49] shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1917]">
                    {pageData.returnPeriod ?? 7}-Day Return Window
                  </h3>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    Customers can initiate a return or exchange within {pageData.returnPeriod ?? 7} calendar days of order delivery.
                  </p>
                </div>
              </div>

              {/* Structured Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageData.eligibleProducts && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Eligible Products
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.eligibleProducts}
                    </p>
                  </div>
                )}

                {pageData.nonReturnableProducts && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Non-Returnable Items
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.nonReturnableProducts}
                    </p>
                  </div>
                )}

                {pageData.returnConditions && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Return Conditions
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.returnConditions}
                    </p>
                  </div>
                )}

                {pageData.refundTimeline && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Refund Timeline &amp; Mode
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.refundTimeline}
                    </p>
                  </div>
                )}

                {pageData.exchangeConditions && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1 md:col-span-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Exchange Policy
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.exchangeConditions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Shipping Policy Structured Content */}
          {pageKey === 'shippingPolicy' && (
            <div className="space-y-6">
              <div className="p-5 bg-[#FAF7F2] border border-[#D7C5AF]/70 rounded-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white border border-[#D7C5AF] flex items-center justify-center text-[#A85F49] shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1917]">
                    {pageData.shippingCharges || 'Insured Express Dispatch'}
                  </h3>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    {pageData.freeShippingThreshold
                      ? `Free shipping on orders above ${pageData.freeShippingThreshold}`
                      : 'All parcels dispatched in secure tamper-evident packaging.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageData.estimatedDeliveryTime && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Estimated Delivery Time
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.estimatedDeliveryTime}
                    </p>
                  </div>
                )}

                {pageData.processingTime && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Processing &amp; Dispatch
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.processingTime}
                    </p>
                  </div>
                )}

                {pageData.shippingLocations && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Serviceable Locations
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.shippingLocations}
                    </p>
                  </div>
                )}

                {pageData.trackingInformation && (
                  <div className="p-4 border border-[#E5E0D8] rounded-xs space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                      Parcel Tracking
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {pageData.trackingInformation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Contact Us Structured Content */}
          {pageKey === 'contactUs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(pageData.contactEmail || storeInfo?.settings?.supportEmail) && (
                <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#A85F49] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      Email Inquiries
                    </h4>
                    <p className="text-xs text-[#57534E] mt-0.5">
                      {pageData.contactEmail || storeInfo?.settings?.supportEmail}
                    </p>
                  </div>
                </div>
              )}

              {supportPhone && (
                <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#A85F49] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      Telephone Concierge
                    </h4>
                    <p className="text-xs text-[#57534E] mt-0.5">{supportPhone}</p>
                  </div>
                </div>
              )}

              {pageData.businessHours && (
                <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#A85F49] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      Concierge Hours
                    </h4>
                    <p className="text-xs text-[#57534E] mt-0.5">{pageData.businessHours}</p>
                  </div>
                </div>
              )}

              {pageData.address && (
                <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#A85F49] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      Atelier Address
                    </h4>
                    <p className="text-xs text-[#57534E] mt-0.5">{pageData.address}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. FAQs Structured Accordion */}
          {pageKey === 'faqs' && (
            <div className="space-y-4">
              {/* Search bar for FAQs */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search questions or keywords..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#1C1917] placeholder:text-[#8E8172]"
                />
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E8172] border border-dashed border-[#D7C5AF]">
                  No matching questions found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFaqs.map((faq, idx) => {
                    const isOpen = activeFaq === (faq.id || idx);
                    return (
                      <div
                        key={faq.id || idx}
                        className="border border-[#E5E0D8] rounded-xs overflow-hidden transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFaq(isOpen ? null : (faq.id || idx))}
                          className="w-full p-4 text-left flex items-center justify-between gap-4 bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-medium text-[#1C1917]">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#8E8172] transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-[#A85F49]' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="p-4 bg-white border-t border-[#E5E0D8] text-xs text-[#57534E] leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rich-Text HTML Content Body */}
          {pageData.content && pageData.content.trim().length > 0 && (
            <div
              className="prose prose-sm max-w-none text-[#57534E] leading-relaxed pt-4 border-t border-[#E5E0D8] space-y-4"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageData.content) }}
            />
          )}

          {/* WhatsApp Support Callout */}
          <div className="pt-8 mt-12 border-t border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#1C1917]">
                Need additional assistance or personalized guidance?
              </p>
              <p className="text-xs text-[#8E8172] mt-0.5">
                Our {brandName} concierge is available to answer any questions.
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A85F49] hover:bg-[#8F4E3A] text-white text-xs uppercase tracking-widest font-medium rounded-xs transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Connect on WhatsApp</span>
            </a>
          </div>
        </article>
      </div>
    </div>
  );
};
