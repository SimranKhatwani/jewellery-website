/**
 * @file AnalyticsReportsModule.jsx
 * @description Parent wrapper module combining the store's visual Analytics Dashboard
 * and downloadable Reports Dashboard into a unified tabbed interface.
 */

import React, { useState } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ReportsDashboard } from '../reports/ReportsDashboard';

/**
 * AnalyticsReportsModule Component
 * @param {Object} props
 * @param {Object} props.admin - Current authenticated administrator session
 * @param {string} [props.initialSubTab='overview'] - Initial active subtab ('overview' | 'reports')
 * @param {Function} props.onNavigateCatalogue - Callback to return to catalogue manager
 */
export const AnalyticsReportsModule = ({
  admin,
  initialSubTab = 'overview',
  onNavigateCatalogue,
}) => {
  const [subTab, setSubTab] = useState(initialSubTab);

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-1.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSubTab('overview')}
            className={`px-4 py-2 rounded-xs text-xs font-medium flex items-center gap-2 transition-all ${
              subTab === 'overview'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                : 'text-[#8E8172] hover:text-[#2D2A26] hover:bg-[#FAF7F2]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview & Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`px-4 py-2 rounded-xs text-xs font-medium flex items-center gap-2 transition-all ${
              subTab === 'reports'
                ? 'bg-[#A85F49] text-[#FFFFFF] shadow-xs'
                : 'text-[#8E8172] hover:text-[#2D2A26] hover:bg-[#FAF7F2]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Reports & Exports</span>
          </button>
        </div>

        <div className="hidden sm:block text-[11px] text-[#8E8172] pr-3 font-mono">
          {admin?.storeName || 'Store Maison'} &bull; Unified Intelligence
        </div>
      </div>

      {/* Sub-Tab Content */}
      {subTab === 'overview' && (
        <AnalyticsDashboard
          admin={admin}
          onNavigateCatalogue={onNavigateCatalogue}
        />
      )}

      {subTab === 'reports' && (
        <ReportsDashboard
          admin={admin}
          onNavigateCatalogue={onNavigateCatalogue}
        />
      )}
    </div>
  );
};
