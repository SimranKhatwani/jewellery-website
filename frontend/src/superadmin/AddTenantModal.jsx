import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { createPlatformTenant } from './api';

export const AddTenantModal = ({ isOpen, onClose, plans = [], onSaveSuccess }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
      setCustomDomain('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      // Default to first active plan or starter
      if (plans.length > 0) {
        const starter = plans.find((p) => p.slug === 'starter') || plans[0];
        setSelectedPlanId(starter._id || starter.id || '');
      } else {
        setSelectedPlanId('');
      }
    }
  }, [isOpen, plans]);

  if (!isOpen) return null;

  const handleNameChange = (val) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleSlugChange = (val) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Store name is required.');
      return;
    }
    if (!slug.trim()) {
      setErrorMsg('Store slug is required.');
      return;
    }
    if (!ownerEmail.trim()) {
      setErrorMsg('Owner email is required.');
      return;
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      setErrorMsg('Owner password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        customDomain: customDomain.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword,
        planId: selectedPlanId || undefined,
      };

      const result = await createPlatformTenant(payload);
      onSaveSuccess(result);
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to create new tenant store.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-2xl text-[#593D30] overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7C5AF]/60 flex items-center justify-between bg-[#FAF7F2]">
          <div>
            <h2 className="font-serif text-xl text-[#593D30]">
              Create New Store / Tenant
            </h2>
            <p className="text-xs text-[#8E8172] mt-0.5">
              Provision a new isolated store tenant with its owner credentials and SaaS subscription plan
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E8172] hover:text-[#593D30] p-1.5 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-[#A85F49]">
              {errorMsg}
            </div>
          )}

          {/* Section: Store Details */}
          <div className="space-y-3 pb-3 border-b border-[#D7C5AF]/40">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-[#A85F49]">
              Store Information
            </h3>

            <div>
              <label className="block text-[#8E8172] mb-1 font-medium">Store Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Tanishq Fine Jewellery"
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8E8172] mb-1 font-medium">
                  Store Slug (URL Key) *
                </label>
                <div className="flex items-center">
                  <span className="px-2 py-2 bg-[#D7C5AF]/30 border border-r-0 border-[#D7C5AF] text-[#8E8172] font-mono text-[11px] rounded-l-xs">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="tanishq-jewellery"
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-r-xs font-mono text-[11px] text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8E8172] mb-1 font-medium">
                  Custom Domain (Optional)
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g. store.tanishq.com"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>
          </div>

          {/* Section: Subscription Plan Selection */}
          <div className="space-y-3 pb-3 border-b border-[#D7C5AF]/40">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-[#A85F49]">
              Subscription Plan & Quotas
            </h3>

            <div>
              <label className="block text-[#8E8172] mb-1 font-medium">
                Choose Subscription Plan Tier *
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                {plans.length === 0 ? (
                  <option value="">Default Starter Plan (Free Trial)</option>
                ) : (
                  plans.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} — {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString()}`} / {p.billingInterval} ({p.limits?.maxProducts ?? 50} products, {p.limits?.maxStaff ?? 2} staff)
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-[#8E8172] mt-1">
                The tenant's catalog limits, staff allocation, and feature flags will immediately bind to this plan.
              </p>
            </div>
          </div>

          {/* Section: Store Owner Account */}
          <div className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-[#A85F49]">
              Store Owner Account
            </h3>

            <div>
              <label className="block text-[#8E8172] mb-1 font-medium">Owner Full Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8E8172] mb-1 font-medium">Owner Email Address *</label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@tanishq.com"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-[#8E8172] mb-1 font-medium">Initial Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-3 pr-10 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8172] hover:text-[#593D30] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#8E8172]">
              The owner will use these credentials to log in to the Store Administration dashboard (/admin).
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#D7C5AF]/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#D7C5AF]/20 border border-[#D7C5AF] rounded-xs text-[#593D30] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-xs font-medium uppercase tracking-wider text-[11px] flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Tenant...</span>
                </>
              ) : (
                <span>+ Create Store Tenant</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
