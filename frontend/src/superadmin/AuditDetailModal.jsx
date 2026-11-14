import React, { useState } from 'react';

export const AuditDetailModal = ({ log, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('LOGIN') || action.includes('ACCEPT') || action.includes('CREATE')) {
      return 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30';
    }
    if (action.includes('STATUS') || action.includes('TRANSFER') || action.includes('UPDATE')) {
      return 'bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/30';
    }
    if (action.includes('LOGOUT') || action.includes('REMOVE') || action.includes('DELETE') || action.includes('CANCEL')) {
      return 'bg-[#EF4444]/10 text-[#DC2626] border-[#EF4444]/30';
    }
    return 'bg-[#8B5CF6]/10 text-[#7C3AED] border-[#8B5CF6]/30';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-2xl text-[#593D30] overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7C5AF]/60 flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-0.5 rounded-xs text-[11px] font-mono uppercase tracking-wider border font-medium ${getActionBadgeColor(
                log.action
              )}`}
            >
              {log.action}
            </span>
            <span className="text-xs text-[#8E8172] font-mono">
              ID: {log._id || log.id}
            </span>
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Key Metas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-xs">
            <div>
              <span className="text-[#8E8172] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Timestamp
              </span>
              <span className="font-mono text-[#593D30]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-[#8E8172] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Actor / User
              </span>
              <span className="text-[#593D30]">
                {log.userId ? (
                  <span>
                    {log.userId.name || 'User'} ({log.userId.email})
                    {log.userId.isSuperAdmin && (
                      <span className="ml-1 text-[9px] px-1 bg-[#A85F49]/15 text-[#A85F49] border border-[#A85F49]/30 rounded-xs font-semibold">
                        SuperAdmin
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-[#D97706] font-mono font-medium">System / Automated Activity</span>
                )}
              </span>
            </div>

            <div>
              <span className="text-[#8E8172] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Target Resource
              </span>
              <span className="font-mono text-[#A85F49] font-medium">
                {log.resource} {log.resourceId ? `[${log.resourceId}]` : ''}
              </span>
            </div>

            <div>
              <span className="text-[#8E8172] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Origin IP & User Agent
              </span>
              <span className="font-mono text-[#8E8172] text-[11px] truncate block" title={log.userAgent}>
                {log.ipAddress || 'Internal'} {log.userAgent ? `• ${log.userAgent.slice(0, 30)}...` : ''}
              </span>
            </div>

            {log.tenantId && (
              <div className="sm:col-span-2 pt-2 border-t border-[#D7C5AF]/40">
                <span className="text-[#8E8172] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Associated Store / Tenant
                </span>
                <span className="text-[#593D30]">
                  {log.tenantId.name || 'Store'} ({log.tenantId.slug || log.tenantId})
                </span>
              </div>
            )}
          </div>

          {/* Full JSON Payload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#593D30]">
                Event Payload & Details
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 text-[11px] bg-[#FAF7F2] hover:bg-[#FFFFFF] text-[#593D30] rounded-xs border border-[#D7C5AF] transition-colors flex items-center gap-1.5 shadow-xs font-medium"
              >
                {copied ? (
                  <>
                    <span className="text-[#059669]">✓</span>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-[#8E8172]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-xs font-mono text-[#593D30] overflow-x-auto leading-relaxed max-h-64">
              {JSON.stringify(log.details || log, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FAF7F2] border-t border-[#D7C5AF]/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FFFFFF] hover:bg-[#F7F1E9] border border-[#D7C5AF] text-xs uppercase tracking-wider text-[#593D30] rounded-xs transition-colors shadow-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
