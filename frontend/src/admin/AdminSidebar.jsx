import React from 'react';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  Bell,
  BarChart3,
  FileText,
  ExternalLink,
  LogOut,
  X,
  ShieldCheck,
  Store,
} from 'lucide-react';

export const AdminSidebar = ({
  activeTab = 'catalogue',
  onSelectTab,
  admin,
  productsCount = 0,
  pendingOrdersCount = 0,
  unreadNotificationsCount = 0,
  onLogout,
  onViewStorefront,
  onGoToSuperAdmin,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      disabled: false,
    },
    {
      id: 'catalogue',
      label: 'Catalogue Management',
      icon: Package,
      badge: productsCount > 0 ? String(productsCount) : null,
      disabled: false,
    },
    {
      id: 'orders',
      label: 'Orders & Fulfillment',
      icon: Receipt,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} new` : null,
      badgeVariant: pendingOrdersCount > 0 ? 'accent' : 'neutral',
      disabled: false,
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: null,
      disabled: false,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : null,
      badgeVariant: 'accent',
      disabled: false,
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      badge: null,
      disabled: false,
    },
  ];

  const handleNavClick = (tabId) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#FFFFFF] border-r border-[#D7C5AF]/60 select-none">
      {/* Top Brand & Store Identity */}
      <div>
        <div className="p-5 border-b border-[#D7C5AF]/40">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.28em] text-[#A85F49] block">
                AURELLE ATELIER
              </span>
              <h2 className="font-serif text-xl font-light text-[#593D30] tracking-wide mt-0.5">
                Store Admin
              </h2>
            </div>
            {/* Mobile close button */}
            {isOpenMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-[#8E8172] hover:text-[#593D30] hover:bg-[#FAF7F2] rounded-xs md:hidden"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>


        </div>

        {/* Main Navigation Modules */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E8172]">
            Store Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xs text-xs transition-colors text-left group ${isActive
                  ? 'bg-[#FAF7F2] text-[#A85F49] font-medium shadow-2xs border-l-2 border-[#A85F49]'
                  : 'text-[#593D30] hover:bg-[#FAF7F2]/80 hover:text-[#A85F49]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive
                      ? 'text-[#A85F49]'
                      : 'text-[#8E8172] group-hover:text-[#A85F49]'
                      }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-xs shrink-0 ${item.badgeVariant === 'accent'
                      ? 'bg-[#A85F49] text-[#FFFFFF] font-bold'
                      : item.badgeVariant === 'muted'
                        ? 'bg-[#F7F1E9] text-[#8E8172] border border-[#D7C5AF]/60 text-[8px] uppercase tracking-wider'
                        : 'bg-[#FAF7F2] text-[#8E8172] border border-[#D7C5AF]/60'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick External Links */}
        <div className="px-3 pt-3 border-t border-[#D7C5AF]/30 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E8172]">
            Navigation
          </div>

          <button
            type="button"
            onClick={onViewStorefront}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#593D30] hover:bg-[#FAF7F2] hover:text-[#A85F49] rounded-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-[#8E8172]" />
              <span>View Website</span>
            </div>
            <ExternalLink className="w-3 h-3 text-[#8E8172]" />
          </button>



        </div>
      </div>

      {/* Bottom User Profile & Sign Out */}
      <div className="p-4 border-t border-[#D7C5AF]/60 bg-[#FAF7F2]/50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#593D30] text-[#FFFFFF] font-serif font-light text-xs flex items-center justify-center shrink-0">
              {(admin?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#593D30] truncate">
                {admin?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-[#8E8172] truncate">
                {admin?.email || ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 text-[#8E8172] hover:text-[#A85F49] hover:bg-[#A85F49]/10 rounded-xs transition-colors"
            title="Sign out of Admin Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky/Fixed) */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#593D30]/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
