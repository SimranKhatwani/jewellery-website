import React, { useState, useEffect, useCallback } from 'react';
import { REPORT_CATEGORIES } from './reportConfig';
import { ReportFilters } from './ReportFilters';
import { ReportPreviewTable } from './ReportPreviewTable';
import { ReportExportActions } from './ReportExportActions';
import { getReport } from '../api';
import { FileText, AlertCircle } from 'lucide-react';

export const ReportsDashboard = ({ admin }) => {
  const [selectedCategory, setSelectedCategory] = useState(REPORT_CATEGORIES[0]);
  const [filters, setFilters] = useState({
    preset: 'last30days',
    startDate: '',
    endDate: '',
    search: '',
    orderStatus: 'all',
    paymentStatus: 'all',
    paymentMethod: 'all',
    category: 'all',
    inventoryStatus: 'all',
    customerType: 'all',
    isPublished: 'all',
    page: 1,
    limit: 20,
  });

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [summary, setSummary] = useState({});
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getReport(selectedCategory.id, filters);
      setRecords(res.data?.records || []);
      setPagination(res.data?.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      setSummary(res.data?.summary || {});
      if (res.currencySymbol) {
        setCurrencySymbol(res.currencySymbol);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      setErrorMsg(err.message || 'Failed to load report data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, filters]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleChangeFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // reset page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setFilters((prev) => ({
      ...prev,
      search: '',
      page: 1,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#D7C5AF]/40 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#A85F49]" />
            <h2 className="text-2xl font-serif text-[#2D2A26] tracking-wide">
              Store Ledgers & Reports
            </h2>
          </div>
          <p className="text-xs text-[#8E8172] mt-1">
            Authoritative transactional data, catalog snapshots, client ledgers and CSV/PDF exports for {admin?.storeName || 'AURELLE'}
          </p>
        </div>
      </div>

      {/* 2. Report Category Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {REPORT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory.id === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat)}
              className={`p-3 rounded-xs border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-[#A85F49] bg-[#FAF7F2] shadow-2xs'
                  : 'border-[#D7C5AF]/60 bg-[#FFFFFF] hover:border-[#A85F49]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isSelected ? 'text-[#A85F49]' : 'text-[#2D2A26]'
                  }`}
                >
                  {cat.shortName}
                </span>
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-[#A85F49]' : 'text-[#8E8172]'
                  }`}
                />
              </div>
              <p className="text-[10px] text-[#8E8172] mt-1 line-clamp-1">{cat.name}</p>
            </button>
          );
        })}
      </div>

      {/* Active Category Description */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/40 rounded-xs p-3.5 text-xs text-[#8E8172] flex items-center justify-between">
        <div>
          <span className="font-semibold text-[#2D2A26]">{selectedCategory.name}: </span>
          <span>{selectedCategory.description}</span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xs bg-[#FDF2F2] border border-[#F87171]/40 flex items-center justify-between text-xs text-[#991B1B]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={loadReportData}
            className="underline font-medium hover:text-[#7F1D1D]"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Filters Component */}
      <ReportFilters
        category={selectedCategory}
        filters={filters}
        onChangeFilter={handleChangeFilter}
        onApply={loadReportData}
        isLoading={isLoading}
      />

      {/* 4. Export Actions (Top) */}
      <ReportExportActions
        category={selectedCategory}
        filters={filters}
        totalRecords={pagination.total}
      />

      {/* 5. Preview Table */}
      <ReportPreviewTable
        category={selectedCategory}
        records={records}
        pagination={pagination}
        onPageChange={handlePageChange}
        currencySymbol={currencySymbol}
        isLoading={isLoading}
      />
    </div>
  );
};
