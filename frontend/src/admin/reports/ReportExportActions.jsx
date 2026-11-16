import React, { useState } from 'react';
import { Download, Printer, AlertCircle } from 'lucide-react';
import { downloadReportCSV, openReportPrintView } from '../api';

export const ReportExportActions = ({
  category,
  filters,
  totalRecords = 0,
}) => {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleExportCSV = async () => {
    try {
      setIsExportingCSV(true);
      setErrorMsg(null);
      await downloadReportCSV(category.id, filters);
    } catch (err) {
      console.error('CSV Export Error:', err);
      setErrorMsg('Failed to export CSV: ' + err.message);
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      setErrorMsg(null);
      await openReportPrintView(category.id, filters);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setErrorMsg('Failed to open PDF view: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
      <div className="text-xs text-[#8E8172]">
        Total matching records for export: <span className="font-semibold text-[#2D2A26]">{totalRecords}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={isExportingCSV || totalRecords === 0}
          className="px-3 py-1.5 rounded-xs border border-[#D7C5AF] bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#2D2A26] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Download complete dataset as CSV"
        >
          <Download className="w-3.5 h-3.5 text-[#A85F49]" />
          <span>{isExportingCSV ? 'Exporting CSV...' : 'Export CSV'}</span>
        </button>

        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isExportingPDF || totalRecords === 0}
          className="px-3 py-1.5 rounded-xs border border-[#A85F49] bg-[#A85F49] hover:bg-[#8D4B37] text-[#FFFFFF] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Print or Save as PDF"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{isExportingPDF ? 'Preparing PDF...' : 'Export PDF / Print'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="w-full text-xs text-[#C0392B] flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
