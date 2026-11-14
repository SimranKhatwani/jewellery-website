import React, { useState } from 'react';
import { Bell, CheckCheck, Sparkles, Filter, Check, Clock, ArrowRight } from 'lucide-react';

export const AdminNotificationsView = ({
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onNavigateOrders,
  onRefresh,
}) => {
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const displayedNotifications = filterUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] p-6 border border-[#D7C5AF]/60 rounded-xs shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-[#A85F49]">
            <Bell className="w-3.5 h-3.5" />
            <span>Store Alerts & Customer Orders</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#593D30] mt-1">
            Notifications Center
          </h2>
          <p className="text-xs text-[#8E8172] mt-1 font-sans">
            Real-time alerts for guest checkouts, customer purchases, cancellations and store events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#F7F1E9] border border-[#D7C5AF] text-[#A85F49] text-xs font-medium rounded-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] text-xs uppercase tracking-wider rounded-xs hover:bg-[#FAF7F2] transition-colors"
            title="Refresh notifications"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#D7C5AF]/40 pb-2">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilterUnreadOnly(false)}
            className={`px-3 py-1.5 rounded-xs transition-colors font-medium ${
              !filterUnreadOnly
                ? 'bg-[#593D30] text-[#FFFFFF]'
                : 'text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterUnreadOnly(true)}
            className={`px-3 py-1.5 rounded-xs transition-colors font-medium flex items-center gap-1.5 ${
              filterUnreadOnly
                ? 'bg-[#593D30] text-[#FFFFFF]'
                : 'text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#A85F49] text-[#FFFFFF] text-[9px] font-mono rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] text-[#8E8172]">
          Socket.io Real-Time Push Active
        </span>
      </div>

      {/* Notifications List */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs divide-y divide-[#D7C5AF]/30 overflow-hidden">
        {displayedNotifications.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-[#D7C5AF] mx-auto" />
            <h4 className="font-serif text-base text-[#593D30]">
              {filterUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
            </h4>
            <p className="text-xs text-[#8E8172] max-w-sm mx-auto">
              {filterUnreadOnly
                ? 'You have reviewed and acknowledged all store orders and alerts.'
                : 'Real-time order alerts will automatically appear here as customers shop on your storefront.'}
            </p>
          </div>
        ) : (
          displayedNotifications.map((notif) => (
            <div
              key={notif._id}
              className={`p-5 transition-colors flex items-start gap-4 ${
                !notif.isRead ? 'bg-[#FAF7F2]/60' : 'bg-[#FFFFFF]'
              }`}
            >
              {/* Unread indicator */}
              <div className="mt-1 shrink-0">
                {!notif.isRead ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#A85F49] shadow-xs animate-pulse" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                )}
              </div>

              {/* Body */}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-sm font-semibold text-[#593D30]">
                      {notif.title}
                    </span>
                    {notif.metadata?.isGuest && (
                      <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-mono rounded-xs font-semibold">
                        Guest Checkout
                      </span>
                    )}
                    {notif.notificationType && (
                      <span className="text-[10px] text-[#8E8172] font-mono px-1.5 py-0.2 bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs">
                        {notif.notificationType}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-[#8E8172] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-[#593D30] leading-relaxed pt-1">
                  {notif.message}
                </p>

                {/* Metadata summary (if order details present) */}
                {notif.metadata && (
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8E8172]">
                    {notif.metadata.orderNumber && (
                      <span>
                        Order: <strong className="text-[#593D30]">#{notif.metadata.orderNumber}</strong>
                      </span>
                    )}
                    {notif.metadata.customerName && (
                      <span>
                        Customer: <strong className="text-[#593D30]">{notif.metadata.customerName}</strong>
                      </span>
                    )}
                    {notif.metadata.totalPayable !== undefined && (
                      <span>
                        Payable: <strong className="text-[#A85F49]">{notif.metadata.currencySymbol || '₹'}{notif.metadata.totalPayable}</strong>
                      </span>
                    )}
                    {notif.metadata.paymentMethod && (
                      <span className="uppercase text-[10px] font-mono">
                        ({notif.metadata.paymentMethod})
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 flex items-center gap-4">
                  {notif.relatedEntityType === 'Order' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!notif.isRead && onMarkRead) onMarkRead(notif._id);
                        if (onNavigateOrders) onNavigateOrders();
                      }}
                      className="text-xs text-[#A85F49] hover:underline font-medium flex items-center gap-1"
                    >
                      <span>Open in Orders & Fulfillment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => onMarkRead && onMarkRead(notif._id)}
                      className="text-xs text-[#8E8172] hover:text-[#593D30] flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
