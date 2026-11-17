import React, { useState, useEffect } from 'react';
import { updatePlatformTenantSubscription } from './api';

export const EditSubscriptionModal = ({
  subscription,
  isOpen,
  onClose,
  plans = [],
  onSaveSuccess,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [status, setStatus] = useState('active');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [autoRenew, setAutoRenew] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (subscription && isOpen) {
      const planId = subscription.planId?._id || subscription.planId || '';
      setSelectedPlanId(planId);
      setStatus(subscription.status || 'active');
      setBillingInterval(subscription.billingConfig?.billingInterval || 'monthly');
      setAutoRenew(subscription.billingConfig?.autoRenew ?? true);
      setErrorMsg(null);
    }
  }, [subscription, isOpen]);

  if (!isOpen || !subscription) return null;

  const tenant = subscription.tenantId || {};
  const currentPlan = subscription.planId || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const tenantId = tenant._id || tenant.id || subscription.tenantId;
    if (!tenantId) {
      setErrorMsg('Invalid tenant identifier on subscription record.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        planId: selectedPlanId,
        status,
        billingInterval,
        autoRenew,
      };

      const updated = await updatePlatformTenantSubscription(tenantId, payload);
      onSaveSuccess(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update subscription plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-2xl text-[#593D30] overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7C5AF]/60 flex items-center justify-between bg-[#FAF7F2]">
          <div>
            <h2 className="font-serif text-xl text-[#593D30]">
              Edit Subscription Plan
            </h2>
            <p className="text-xs text-[#8E8172] mt-0.5">
              Change store subscription tier, billing cycle status and auto-renewal parameters
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

          {/* Store Info Banner */}
          <div className="p-3 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs flex items-center justify-between">
            <div>
              <div className="font-serif text-sm font-medium text-[#593D30]">
                {tenant.name || 'Store'}
              </div>
              <div className="font-mono text-[10px] text-[#8E8172]">
                Slug: /{tenant.slug || 'unknown'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8E8172] uppercase font-bold block">Current Tier</span>
              <span className="font-medium text-[#A85F49] text-xs">
                {currentPlan.name || 'Custom'}
              </span>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-[#8E8172] mb-1 font-medium">
              Assign Subscription Plan *
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
            >
              {plans.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} ({p.price === 0 ? 'Free Trial' : `₹${p.price.toLocaleString()} / ${p.billingInterval}`}) — Max {p.limits?.maxProducts ?? 50} products
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#8E8172] mt-1">
              Updating the plan will immediately adjust the tenant's features and limits.
            </p>
          </div>

          {/* Subscription Lifecycle Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8E8172] mb-1 font-medium">
                Subscription Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                <option value="active">Active (Full Access)</option>
                <option value="trialing">Trialing (Trial Period)</option>
                <option value="past_due">Past Due (Payment Delayed)</option>
                <option value="suspended">Suspended (Access Halted)</option>
                <option value="cancelled">Cancelled (Terminated)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8E8172] mb-1 font-medium">
                Billing Cycle Interval *
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                <option value="monthly">Monthly Cycle</option>
                <option value="yearly">Yearly / Annual Cycle</option>
              </select>
            </div>
          </div>

          {/* Auto Renew Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="rounded border-[#D7C5AF] text-[#A85F49] focus:ring-[#A85F49]"
              />
              <span className="text-xs text-[#593D30] font-medium">
                Auto-renew subscription upon cycle completion
              </span>
            </label>
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
                  <span>Updating Plan...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
