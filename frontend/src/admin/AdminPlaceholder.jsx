/**
 * @file AdminPlaceholder.jsx
 * @description Fallback placeholder view presented for administrative modules
 * that are scheduled for future development phases (e.g. advanced BI & reports).
 */

import React from 'react';
import { BarChart3, FileText, Clock, Sparkles } from 'lucide-react';

/**
 * AdminPlaceholder Component
 * @param {Object} props
 * @param {string} [props.moduleName='Analytics'] - Name of the unavailable module
 * @param {Function} props.onNavigateCatalogue - Action to safely return user to catalogue
 */
export const AdminPlaceholder = ({ moduleName = 'Analytics', onNavigateCatalogue }) => {
  const isAnalytics = moduleName === 'Analytics';

  return (
    <div className="bg-[#FFFFFF] p-10 border border-[#D7C5AF]/60 rounded-xs shadow-xs text-center max-w-2xl mx-auto my-12 animate-fade-in space-y-4">
      <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#A85F49] flex items-center justify-center mx-auto">
        {isAnalytics ? (
          <BarChart3 className="w-7 h-7" />
        ) : (
          <FileText className="w-7 h-7" />
        )}
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono rounded-xs uppercase tracking-wider font-semibold">
        <Clock className="w-3 h-3" />
        <span>Coming Soon • Scheduled for Subsequent Release</span>
      </div>

      <h3 className="font-serif text-2xl font-light text-[#593D30]">
        {isAnalytics ? 'Store Analytics & Business Intelligence' : 'Store Reports & Data Exports'}
      </h3>

      <p className="text-xs text-[#8E8172] leading-relaxed max-w-md mx-auto">
        {isAnalytics
          ? 'Comprehensive store analytics, visitor acquisition funnels, conversion rates, and revenue trends are planned for Phase 7. Real-time metrics will connect directly to MongoDB event streams.'
          : 'Automated CSV/PDF sales exports, inventory reconciliation logs, and tax ledger reports are scheduled for an upcoming SaaS release.'}
      </p>

      <div className="pt-4 border-t border-[#D7C5AF]/30">
        <button
          type="button"
          onClick={onNavigateCatalogue}
          className="px-4 py-2 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] text-xs font-medium uppercase tracking-[0.16em] rounded-xs transition-colors"
        >
          Return to Catalogue Management
        </button>
      </div>
    </div>
  );
};
