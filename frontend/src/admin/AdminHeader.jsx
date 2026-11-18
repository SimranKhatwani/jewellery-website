import React from 'react';
import { Menu, Bell, CheckCheck, Store, ShieldCheck, Sparkles } from 'lucide-react';

const TAB_TITLES = {
  overview: 'Overview & Store Status',
  catalogue: 'Catalogue Management',
  orders: 'Orders & Fulfillment',
  customers: 'Customers & Purchases',
  notifications: 'Store Notifications & Alerts',
  analytics: 'Analytics & Reports',
  reports: 'Analytics & Reports',
  settings: 'Store Settings',
};

export const AdminHeader = ({
  activeTab = 'catalogue',
  onOpenMobileMenu,
  admin,
  onViewStorefront,
  onGoToSuperAdmin,
  adminNotificationsOpen,
  setAdminNotificationsOpen,
  adminNotifications = [],
  adminUnreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onOpenOrdersTab,
}) => {
  return (
    <header className="bg-[#FFFFFF] border-b border-[#D7C5AF]/60 sticky top-0 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Title Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 text-[#593D30] hover:bg-[#FAF7F2] rounded-xs md:hidden"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] text-[#8E8172] uppercase tracking-[0.16em]">
              <span>{admin?.storeName || 'Store Admin'}</span>
              <span>/</span>
              <span className="text-[#A85F49] font-semibold truncate">
                {TAB_TITLES[activeTab] || 'Management'}
              </span>
            </div>
            <h1 className="font-serif text-lg sm:text-xl font-light text-[#593D30] truncate hidden sm:block">
              {TAB_TITLES[activeTab] || 'Dashboard'}
            </h1>
          </div>
        </div>

        {/* Right: Quick actions, Live Bell, User identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">


          <button
            type="button"
            onClick={onViewStorefront}
            className="text-xs text-[#8E8172] hover:text-[#593D30] font-medium flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-xs"
            title="View live website"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Website</span>
          </button>

          {/* Notifications Bell with Popover Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAdminNotificationsOpen(!adminNotificationsOpen)}
              className="relative p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
              title="Store Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {adminUnreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[0.95rem] h-[0.95rem] px-0.5 bg-[#A85F49] text-[#FFFFFF] text-[9px] font-mono font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
                  {adminUnreadCount > 9 ? '9+' : adminUnreadCount}
                </span>
              )}
            </button>

            {adminNotificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setAdminNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] border border-[#D7C5AF]/70 rounded-xs shadow-2xl z-50 overflow-hidden animate-fade-in text-xs">
                  <div className="p-3 bg-[#F7F1E9] border-b border-[#D7C5AF]/40 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-[#593D30]">
                      <Bell className="w-3.5 h-3.5 text-[#A85F49]" />
                      <span>Store Notifications</span>
                      {adminUnreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-[#A85F49] text-[#FFFFFF] rounded-full text-[9px] font-mono">
                          {adminUnreadCount} new
                        </span>
                      )}
                    </div>
                    {adminUnreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllRead}
                        className="text-[11px] text-[#A85F49] hover:underline flex items-center gap-1 font-medium"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#D7C5AF]/25">
                    {adminNotifications.length > 0 ? (
                      adminNotifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (!n.isRead && onMarkRead) onMarkRead(n._id);
                            if (onOpenOrdersTab) onOpenOrdersTab();
                            setAdminNotificationsOpen(false);
                          }}
                          className={`p-3 cursor-pointer transition-colors hover:bg-[#F7F1E9]/60 flex items-start gap-2.5 ${!n.isRead ? 'bg-[#FAF7F2]' : 'bg-[#FFFFFF]'
                            }`}
                        >
                          <div className="mt-1 shrink-0">
                            {!n.isRead ? (
                              <div className="w-2 h-2 rounded-full bg-[#A85F49]" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-stone-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[#593D30] block">
                                  {n.title}
                                </span>
                                {n.metadata?.isGuest && (
                                  <span className="px-1.5 py-0.2 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-mono rounded-xs">
                                    Guest
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#8E8172] font-mono shrink-0">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8E8172] leading-relaxed">
                              {n.message}
                            </p>
                            {n.relatedEntityType === 'Order' && (
                              <span className="inline-block text-[10px] text-[#A85F49] font-medium underline">
                                View in Orders &rarr;
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center space-y-1">
                        <Sparkles className="w-6 h-6 text-[#D7C5AF] mx-auto" />
                        <p className="text-[#8E8172] text-[11px]">No notifications yet</p>
                        <p className="text-[10px] text-[#8E8172]/70">
                          New customer orders and cancellation requests will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User info */}
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-medium text-[#593D30]">{admin?.name || 'Administrator'}</span>
            <span className="text-[10px] text-[#8E8172]">{admin?.email || ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
