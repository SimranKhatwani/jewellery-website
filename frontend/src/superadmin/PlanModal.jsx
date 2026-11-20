/**
 * @file PlanModal.jsx
 * @description SuperAdmin modal dialog for provisioning and modifying SaaS subscription plans,
 * configuring pricing, billing frequencies, trial day allowances, resource limits, and feature toggles.
 */

import React, { useState, useEffect } from 'react';
import { createPlatformPlan, updatePlatformPlan } from './api';

const AVAILABLE_FEATURES = [
  { key: 'products:read', name: 'View Products', category: 'Catalog' },
  { key: 'products:write', name: 'Product Management', category: 'Catalog' },
  { key: 'inventory:advanced', name: 'Advanced Inventory & Variants', category: 'Inventory' },
  { key: 'analytics:advanced', name: 'Advanced Analytics & Metrics', category: 'Analytics' },
  { key: 'staff:custom_roles', name: 'Dynamic Custom Roles', category: 'Staff' },
  { key: 'marketing:campaigns', name: 'Discounts & Promotions', category: 'Marketing' },
  { key: 'domain:custom', name: 'Verified Custom Domain', category: 'Domain' },
];

/**
 * PlanModal Component
 * @param {Object} props
 * @param {Object|null} props.plan - Existing plan record to edit, or null if creating new
 * @param {boolean} props.isOpen - Modal visibility toggle
 * @param {Function} props.onClose - Modal dismissal handler
 * @param {Function} props.onSaveSuccess - Action callback upon successful persistence
 */
export const PlanModal = ({ plan, isOpen, onClose, onSaveSuccess }) => {
  const isEditing = Boolean(plan?._id);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [trialDays, setTrialDays] = useState(14);
  const [maxProducts, setMaxProducts] = useState(50);
  const [maxStaff, setMaxStaff] = useState(2);
  const [maxStorageMB, setMaxStorageMB] = useState(500);
  const [customDomainAllowed, setCustomDomainAllowed] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState(['products:read', 'products:write']);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (plan) {
      setName(plan.name || '');
      setSlug(plan.slug || '');
      setDescription(plan.description || '');
      setPrice(plan.price ?? 0);
      setCurrency(plan.currency || 'INR');
      setBillingInterval(plan.billingInterval || 'monthly');
      setTrialDays(plan.trialDays ?? 14);
      setMaxProducts(plan.limits?.maxProducts ?? 50);
      setMaxStaff(plan.limits?.maxStaff ?? 2);
      setMaxStorageMB(plan.limits?.maxStorageMB ?? 500);
      setCustomDomainAllowed(Boolean(plan.limits?.customDomainAllowed));
      setSelectedFeatures(Array.isArray(plan.features) ? plan.features : ['products:read', 'products:write']);
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setPrice(2999);
      setCurrency('INR');
      setBillingInterval('monthly');
      setTrialDays(14);
      setMaxProducts(100);
      setMaxStaff(5);
      setMaxStorageMB(1024);
      setCustomDomainAllowed(false);
      setSelectedFeatures(['products:read', 'products:write', 'staff:custom_roles']);
    }
    setErrorMsg(null);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleToggleFeature = (key) => {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Plan name is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      currency,
      billingInterval,
      trialDays: Number(trialDays),
      limits: {
        maxProducts: Number(maxProducts),
        maxStaff: Number(maxStaff),
        maxStorageMB: Number(maxStorageMB),
        customDomainAllowed,
      },
      features: selectedFeatures,
    };

    if (!isEditing) {
      if (!slug.trim()) {
        payload.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      } else {
        payload.slug = slug.trim();
      }
    }

    setIsSaving(true);
    try {
      let savedPlan;
      if (isEditing) {
        savedPlan = await updatePlatformPlan(plan._id, payload);
      } else {
        savedPlan = await createPlatformPlan(payload);
      }
      onSaveSuccess(savedPlan);
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save subscription plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-2xl text-[#593D30] overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7C5AF]/60 flex items-center justify-between bg-[#FAF7F2]">
          <div>
            <h2 className="font-serif text-xl text-[#593D30]">
              {isEditing ? `Edit SaaS Plan: ${plan.name}` : 'Create New Subscription Plan'}
            </h2>
            <p className="text-xs text-[#8E8172] mt-0.5">
              Configure pricing, tenant resource quotas & platform feature entitlements
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

        {/* Error */}
        {errorMsg && (
          <div className="m-6 mb-0 p-3 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-xs text-[#A85F49]">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#593D30] mb-1 font-semibold">
                Plan Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Growth Boutique"
                required
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-sm text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#593D30] mb-1 font-semibold">
                Plan Slug {isEditing ? '(Immutable)' : '*'}
              </label>
              <input
                type="text"
                value={slug}
                disabled={isEditing}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. growth-boutique"
                required={!isEditing}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-sm text-[#593D30] focus:outline-none focus:border-[#A85F49] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#593D30] mb-1 font-semibold">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="2"
              placeholder="Summary of target business size and benefits..."
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-sm text-[#593D30] focus:outline-none focus:border-[#A85F49]"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#593D30] mb-1 font-semibold">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-sm text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#593D30] mb-1 font-semibold">
                Billing Cycle
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-sm text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#593D30] mb-1 font-semibold">
                Trial Days
              </label>
              <input
                type="number"
                min="0"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-sm text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>
          </div>

          {/* Quotas & Limits */}
          <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] mb-3">
              Resource Quotas & Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#8E8172] mb-1">Max Products</label>
                <input
                  type="number"
                  min="1"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8E8172] mb-1">Max Staff Accounts</label>
                <input
                  type="number"
                  min="1"
                  value={maxStaff}
                  onChange={(e) => setMaxStaff(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8E8172] mb-1">Storage (MB)</label>
                <input
                  type="number"
                  min="50"
                  value={maxStorageMB}
                  onChange={(e) => setMaxStorageMB(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="customDomainAllowed"
                checked={customDomainAllowed}
                onChange={(e) => setCustomDomainAllowed(e.target.checked)}
                className="w-4 h-4 rounded text-[#A85F49] focus:ring-0 bg-[#FFFFFF] border-[#D7C5AF]"
              />
              <label htmlFor="customDomainAllowed" className="text-xs text-[#593D30]">
                Allow verified Custom Domain connection
              </label>
            </div>
          </div>

          {/* Entitled Features */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A85F49] mb-2">
              Feature Entitlements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_FEATURES.map((feat) => {
                const checked = selectedFeatures.includes(feat.key);
                return (
                  <label
                    key={feat.key}
                    className={`flex items-start gap-2.5 p-2 rounded-xs border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#A85F49]/10 border-[#A85F49]/40 text-[#593D30]'
                        : 'bg-[#FAF7F2] border-[#D7C5AF]/60 text-[#8E8172] hover:border-[#D7C5AF]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleFeature(feat.key)}
                      className="mt-0.5 w-4 h-4 rounded text-[#A85F49] bg-[#FFFFFF] border-[#D7C5AF]"
                    />
                    <div>
                      <div className="text-xs font-medium text-[#593D30]">{feat.name}</div>
                      <div className="text-[10px] text-[#8E8172] font-mono">{feat.key}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#D7C5AF]/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#D7C5AF] hover:bg-[#FAF7F2] text-xs uppercase tracking-wider text-[#593D30] rounded-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#593D30] hover:bg-[#A85F49] text-xs uppercase tracking-wider font-medium text-[#FFFFFF] rounded-xs transition-colors disabled:opacity-50 shadow-xs"
            >
              {isSaving ? 'Saving Plan...' : isEditing ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
