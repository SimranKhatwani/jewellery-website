import React from 'react';

export const SuperAdminSidebar = ({
  activeSection,
  onSelectSection,
  user,
  onLogout,
  onViewStorefront,
  onGoToStoreAdmin,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      group: 'PLATFORM MANAGEMENT',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
        {
          id: 'tenants',
          label: 'Stores & Tenants',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          id: 'users',
          label: 'Platform Users',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          id: 'plans',
          label: 'SaaS Subscription Plans',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
        {
          id: 'subscriptions',
          label: 'Subscriptions & Billing',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'SECURITY & CONFIGURATION',
      items: [
        {
          id: 'audit',
          label: 'Security & Audit Logs',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          id: 'settings',
          label: 'Platform Settings',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          id: 'support',
          label: 'Support Tickets',
          badge: 'Coming Soon',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#FFFFFF] border-r border-[#D7C5AF]/60 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xs md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Platform Header */}
        <div className="p-5 border-b border-[#D7C5AF]/60 bg-[#FFFFFF]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.28em] text-[#A85F49] block">
                AURELLE ATELIER
              </span>
              <h2 className="font-serif text-lg font-light text-[#593D30] tracking-wider mt-0.5">
                Super Admin
              </h2>
            </div>
            <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#A85F49] text-[10px] font-mono rounded-xs font-semibold">
              /sa
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 px-2.5 py-1 bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/60 text-[11px] text-[#8E8172]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="truncate">Root Console Connected</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((section) => (
            <div key={section.group} className="space-y-1">
              <span className="px-3 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8E8172] block mb-2">
                {section.group}
              </span>

              {section.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectSection(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xs text-xs font-sans tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#593D30] text-[#FFFFFF] shadow-xs font-medium'
                        : 'text-[#593D30] hover:bg-[#FAF7F2] hover:text-[#A85F49]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? 'text-[#FFFFFF]' : 'text-[#8E8172]'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-[#FAF7F2] text-[#8E8172] border border-[#D7C5AF]/60 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Identity & Quick Portal Actions */}
        <div className="p-4 border-t border-[#D7C5AF]/60 bg-[#FAF7F2] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#D7C5AF] flex items-center justify-center text-xs font-serif text-[#593D30] font-medium shadow-xs shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'S'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs text-[#593D30] font-medium truncate">
                {user?.name || 'Super Admin'}
              </div>
              <div className="text-[10px] text-[#8E8172] font-mono truncate">
                {user?.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <button
              onClick={onGoToStoreAdmin}
              className="px-2 py-1.5 bg-[#FFFFFF] hover:bg-[#F7F1E9] border border-[#D7C5AF] rounded-xs text-[#593D30] transition-colors truncate text-center shadow-xs font-medium"
              title="Store Admin (/admin)"
            >
              Store Admin
            </button>
            <button
              onClick={onViewStorefront}
              className="px-2 py-1.5 bg-[#FFFFFF] hover:bg-[#F7F1E9] border border-[#D7C5AF] rounded-xs text-[#593D30] transition-colors truncate text-center shadow-xs font-medium"
              title="View Public Storefront"
            >
              Storefront
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-1.5 px-3 bg-[#FFFFFF] hover:bg-[#A85F49]/10 text-[#A85F49] border border-[#A85F49]/40 rounded-xs text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out of Super Admin
          </button>
        </div>
      </aside>
    </>
  );
};
