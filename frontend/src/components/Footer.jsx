/**
 * @file Footer.jsx
 * @description Storefront global footer component rendering multi-column links,
 * newsletter newsletter subscriptions, legal policy modal triggers (Return Policy, Shipping, Privacy, Terms),
 * white-label branding, copyright notes, and concierge contact details.
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Footer Component
 * @param {Object} props
 * @param {Object|null} props.storeInfo - Active store metadata
 * @param {Function} props.onNavigateCategory - Category navigation callback
 * @param {Function} props.onOpenSizeGuide - Sizing modal trigger
 * @param {Function} props.onNavigateSection - In-page anchor scroll callback
 * @param {Function} props.onOpenReturnPolicy - Return policy modal trigger
 * @param {Function} props.onOpenPolicyPage - Custom CMS policy page viewer trigger
 */
export const Footer = ({
  storeInfo = null,
  onNavigateCategory,
  onOpenSizeGuide,
  onNavigateSection,
  onOpenReturnPolicy,
  onOpenPolicyPage,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const isAurelle = !storeInfo?.slug || storeInfo?.slug === 'aurelle';
  const brandName = storeInfo?.name || 'AURELLE';
  const s = storeInfo?.settings || storeInfo?.config || {};
  const footerConfig = s.footer || {};
  const logoUrl = s.branding?.logoUrl || storeInfo?.logoUrl || '';

  const handleOpenPage = (slug) => {
    if (onOpenPolicyPage) {
      onOpenPolicyPage(slug);
    } else if (onOpenReturnPolicy) {
      onOpenReturnPolicy();
    }
  };

  const brandDescription =
    footerConfig.description ||
    s.description ||
    (isAurelle
      ? 'Sculptural fine jewellery conceived exclusively in solid 925 sterling silver. Celebrating tactile weights, fluid drape, and timeless personal expression.'
      : `${brandName} fine jewellery conceived exclusively in solid 925 sterling silver. Celebrating tactile weights, fluid drape, and timeless personal expression.`);

  const copyrightText =
    footerConfig.copyrightText ||
    (isAurelle
      ? `© ${new Date().getFullYear()} AURELLE. Distributed by RKB Enterprises.`
      : `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="w-full bg-[#593D30] text-[#FFFFFF] pt-16 pb-12 px-6 border-t border-[#D7C5AF]/25 shadow-md">
      <div className="max-w-7xl mx-auto">

        {/* Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b border-[#D7C5AF]/20">

          {/* Col 1: Brand & Purchase Statement (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-8 max-w-[160px] object-contain brightness-0 invert"
              />
            ) : (
              <span className="text-2xl font-serif-display font-light tracking-[0.25em] text-[#FFFFFF] block">
                {brandName}
              </span>
            )}
            <p className="text-xs text-[#F7F1E9]/85 font-light leading-relaxed max-w-sm">
              {brandDescription}
            </p>
            <div className="p-3.5 bg-[#F7F1E9] rounded-xs border border-[#D7C5AF]/50 space-y-1 shadow-xs text-[#593D30]">
              <span className="text-[10px] uppercase tracking-wider text-[#A85F49] font-medium block">
                Purchasing {brandName}
              </span>
              <p className="text-xs text-[#593D30] leading-relaxed font-medium">
                {isAurelle
                  ? 'You can also find us on Amazon and Flipkart.'
                  : `Online allocations and custom inquiries handled directly through ${brandName} client concierge.`}
              </p>
            </div>
          </div>

          {/* Col 2: Collection Navigation (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#FFFFFF] font-medium block">
              Collections
            </span>
            <ul className="space-y-2 text-xs text-[#F7F1E9]/85">
              <li>
                <button
                  onClick={() => onNavigateCategory('rings')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Silver Rings
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('anklets')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Silver Anklets
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('earrings')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Silver Earrings
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('bestsellers')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Bestsellers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('new-arrivals')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  New Editions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Fitting (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#FFFFFF] font-medium block">
              Client Fitting & Care
            </span>
            <ul className="space-y-2 text-xs text-[#F7F1E9]/85">
              <li>
                <button
                  onClick={() => onOpenSizeGuide('rings')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Ring Sizing Standard (US 5–10)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenSizeGuide('anklets')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Anklet Drape & Extender Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenPage('about-us')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  About {brandName}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenPage('contact-us')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  {isAurelle ? 'Contact RKB Enterprises' : `Contact ${brandName}`}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenPage('return-policy')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Return &amp; Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenPage('shipping-policy')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenPage('faqs')}
                  className="hover:text-[#A85F49] hover:underline transition-colors text-left"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Private Release Allocations (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#FFFFFF] font-medium block">
              Private Releases
            </span>
            <p className="text-xs text-[#F7F1E9]/85 font-light leading-relaxed">
              Stay informed on new small-batch 925 silver creations and allocations.
            </p>
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="space-y-2 pt-1">
                <div className="flex items-center border border-[#D7C5AF]/50 rounded-xs overflow-hidden bg-[#FFFFFF]">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full text-xs px-3 py-2.5 bg-transparent text-[#593D30] outline-none placeholder:text-[#8E8172]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-xs uppercase tracking-wider text-[#FFFFFF] bg-[#A85F49] hover:bg-[#8E4D3A] transition-colors shrink-0 font-medium"
                  >
                    Join
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#FFFFFF] font-medium pt-1">
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Subscribed to private releases.</span>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Row: Legal & Plain-text Purchase Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#F7F1E9]/75 border-b border-[#D7C5AF]/15 pb-6">
          <p>{copyrightText}</p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              onClick={() => handleOpenPage('return-policy')}
              className="hover:text-[#FFFFFF] hover:underline transition-colors cursor-pointer text-[#F7F1E9]/75"
            >
              Return Policy
            </button>
            <button
              onClick={() => handleOpenPage('shipping-policy')}
              className="hover:text-[#FFFFFF] hover:underline transition-colors cursor-pointer text-[#F7F1E9]/75"
            >
              Shipping
            </button>
            <button
              onClick={() => handleOpenPage('privacy-policy')}
              className="hover:text-[#FFFFFF] hover:underline transition-colors cursor-pointer text-[#F7F1E9]/75"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => handleOpenPage('terms-and-conditions')}
              className="hover:text-[#FFFFFF] hover:underline transition-colors cursor-pointer text-[#F7F1E9]/75"
            >
              Terms &amp; Conditions
            </button>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = '';
                window.history.pushState(null, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-[#FFFFFF] hover:underline transition-colors cursor-pointer text-[#F7F1E9]/75"
            >
              Platform Overview
            </a>
            <span>Solid 925 Sterling Silver</span>
            <span>Hallmarked Quality</span>
            {isAurelle && <span>Amazon and Flipkart</span>}
          </div>
        </div>

        {/* Agency Attribution - Universal across all tenant storefronts */}
        <div className="pt-4 text-center text-[12px] text-[#F7F1E9]/70 font-light tracking-wide">
          <span>Designed &amp; Developed by ❤️ </span>
          <a
            href="https://www.requingroup.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFFFFF] hover:text-[#D7C5AF]  hover:decoration-[#FFFFFF] underline transition-colors font-medium inline-flex items-center gap-1"
          >
            Requin Solutions Pvt. Ltd
          </a>
        </div>

      </div>
    </footer>
  );
};

