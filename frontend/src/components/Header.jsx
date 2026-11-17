import React, { useState, useEffect, useCallback } from 'react';
import { Search, Heart, Menu, X, ShoppingBag, User, Bell, CheckCheck, Sparkles, ChevronDown } from 'lucide-react';
import {
  fetchCustomerNotifications,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
  getCustomerToken,
} from '../services/storefrontService';
import { initSocket } from '../services/socketService';

export const Header = ({
  wishlistCount,
  onOpenWishlist,
  cartCount = 0,
  onOpenCart,
  customerUser = null,
  onOpenAuth,
  onOpenProfile,
  onOpenSearch,
  onNavigateHome,
  onNavigateCategory,
  onNavigateSection,
  categories = [],
  allProductsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const defaultCategories = [
    { slug: 'rings', label: 'Silver Rings' },
    { slug: 'anklets', label: 'Silver Anklets' },
    { slug: 'earrings', label: 'Earrings' },
    { slug: 'necklaces', label: 'Necklaces' },
  ];
  const navCategories = categories && categories.length > 0 ? categories : defaultCategories;

  const loadNotifications = useCallback(async () => {
    if (!customerUser) return;
    try {
      const data = await fetchCustomerNotifications({ limit: 10 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.warn('Failed to fetch customer notifications:', err);
    }
  }, [customerUser]);

  useEffect(() => {
    if (customerUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 45000);

      const token = getCustomerToken();
      const socket = initSocket(token);

      const handleLiveNotification = () => {
        loadNotifications();
      };

      socket.on('notification:order_placed', handleLiveNotification);
      socket.on('notification:order_status', handleLiveNotification);
      socket.on('notification:order_cancelled', handleLiveNotification);

      return () => {
        clearInterval(interval);
        socket.off('notification:order_placed', handleLiveNotification);
        socket.off('notification:order_status', handleLiveNotification);
        socket.off('notification:order_cancelled', handleLiveNotification);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsOpen(false);
    }
  }, [customerUser, loadNotifications]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await markCustomerNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllCustomerNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full transition-colors">
      {/* Announcement Marquee Strip: Burnt Terracotta #A85F49 (Moving State) */}
      <div 
        aria-label="Announcements" 
        className="w-full bg-[#A85F49] text-[#FFFFFF] text-[11px] sm:text-xs py-2 overflow-hidden border-b border-[#FFFFFF]/10 shadow-xs select-none"
      >
        <div className="animate-marquee whitespace-nowrap">
          {/* Loop Set 1 */}
          <div className="flex items-center gap-6 shrink-0 pr-6">
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">925 Sterling Silver Atelier</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">Solid 925 Sterling Silver</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Complimentary Insured Express Dispatch on All Allocations</span>
            <span aria-hidden="true" className="opacity-75 text-[#F7F1E9]">·</span>
          </div>

          {/* Loop Set 2 (Identical clone for seamless infinite movement) */}
          <div aria-hidden="true" className="flex items-center gap-6 shrink-0 pr-6">
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">925 Sterling Silver Atelier</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Discover Your Next Favourite Piece — Shop At RKB Enterprises or Explore Our Collections on Amazon & Flipkart</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.22em] uppercase font-medium text-[#F7F1E9]">Solid 925 Sterling Silver</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
            <span className="tracking-[0.18em] uppercase font-light text-[#FFFFFF]">Complimentary Insured Express Dispatch on All Allocations</span>
            <span className="opacity-75 text-[#F7F1E9]">·</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar: Warm Ivory #F7F1E9 */}
      <header className="w-full bg-[#F7F1E9]/98 backdrop-blur-md border-b border-[#D7C5AF]/40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5 md:py-4">
          
          {/* Brand Wordmark */}
          <button
            onClick={onNavigateHome}
            className="flex flex-col items-start text-left focus-visible:outline-none group shrink-0"
          >
            <span className="text-xl md:text-2xl font-serif-display font-light tracking-[0.28em] text-[#593D30] uppercase whitespace-nowrap group-hover:text-[#A85F49] transition-colors leading-none">
              AURELLE
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.38em] text-[#8E8172] font-medium mt-1">
              Silver Atelier
            </span>
          </button>

          {/* Navigation Links: Deep Chocolate #593D30 with Terracotta #A85F49 Hover */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-8 text-sm uppercase tracking-[0.18em] font-medium text-[#593D30]/90">
            <button
              onClick={onNavigateHome}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Home
            </button>

            {/* Products Dropdown */}
            <div
              className="relative py-1 group"
              onMouseEnter={() => setIsProductsDropdownOpen(true)}
              onMouseLeave={() => setIsProductsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  onNavigateCategory('all');
                  setIsProductsDropdownOpen(false);
                }}
                className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 group-hover:text-[#A85F49] cursor-pointer"
              >
                <span>Products</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isProductsDropdownOpen ? 'rotate-180 text-[#A85F49]' : ''
                  }`}
                />
              </button>

              {/* Luxury Dropdown Menu */}
              {isProductsDropdownOpen && (
                <div className="absolute top-full left-0 pt-2 z-50 animate-fade-in">
                  <div className="w-60 bg-[#FFFFFF] border border-[#D7C5AF]/70 rounded-xs shadow-xl py-2 overflow-hidden backdrop-blur-md">
                    <div className="px-4 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#8E8172] border-b border-[#D7C5AF]/30">
                      Curated Silhouettes
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateCategory('all');
                        setIsProductsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs uppercase tracking-wider text-[#593D30] hover:text-[#A85F49] hover:bg-[#FAF7F2] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold">All Products</span>
                      {allProductsCount > 0 && (
                        <span className="text-[10px] text-[#8E8172] font-mono">
                          ({allProductsCount})
                        </span>
                      )}
                    </button>

                    <div className="border-t border-[#D7C5AF]/25 my-1" />

                    {navCategories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          onNavigateCategory(cat.slug);
                          setIsProductsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs uppercase tracking-wider text-[#593D30] hover:text-[#A85F49] hover:bg-[#FAF7F2] transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>{cat.label}</span>
                        {cat.count !== undefined && cat.count > 0 && (
                          <span className="text-[10px] text-[#8E8172] font-mono">
                            ({cat.count})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigateSection('bestsellers')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Collections
            </button>
            <button
              onClick={() => onNavigateSection('brand-story')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Our Story
            </button>
            <button
              onClick={() => onNavigateSection('contact')}
              className="hover:text-[#A85F49] transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Contact
            </button>
          </nav>

          {/* Search, Wishlist, Cart & Customer Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
              title="Search collection"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenWishlist}
              className="flex items-center gap-1.5 p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
              title="View saved favourites"
              aria-label="Favourites"
            >
              <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-[#A85F49] text-[#A85F49]' : ''}`} />
              {wishlistCount > 0 && (
                <span className="text-[11px] font-medium font-mono tabular-nums text-[#A85F49]">
                  ({wishlistCount})
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-1.5 p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
              title="Shopping Cart"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="min-w-[1.2rem] h-[1.2rem] px-1 bg-[#A85F49] text-[#FFFFFF] text-[10px] font-mono font-medium rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Customer In-App Notification Bell */}
            {customerUser && (
              <div className="relative">
                <button
                  onClick={() => {
                    const next = !notificationsOpen;
                    setNotificationsOpen(next);
                    if (next) loadNotifications();
                  }}
                  className="relative p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full transition-colors"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[0.95rem] h-[0.95rem] px-0.5 bg-[#A85F49] text-[#FFFFFF] text-[9px] font-mono font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Popover */}
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] border border-[#D7C5AF]/70 rounded-xs shadow-2xl z-50 overflow-hidden animate-fade-in text-xs">
                      <div className="p-3 bg-[#F7F1E9] border-b border-[#D7C5AF]/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-serif-display font-medium text-[#593D30]">
                          <Bell className="w-3.5 h-3.5 text-[#A85F49]" />
                          <span>Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-[#A85F49] text-[#FFFFFF] rounded-full text-[9px] font-mono">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-[#A85F49] hover:underline flex items-center gap-1 font-medium"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-[#D7C5AF]/25">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              onClick={() => {
                                if (!n.isRead) handleMarkAsRead(n._id);
                                if (onOpenProfile) onOpenProfile();
                                setNotificationsOpen(false);
                              }}
                              className={`p-3 cursor-pointer transition-colors hover:bg-[#F7F1E9]/60 flex items-start gap-2.5 ${
                                !n.isRead ? 'bg-[#FAF7F2]' : 'bg-[#FFFFFF]'
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
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#593D30] block">
                                    {n.title}
                                  </span>
                                  <span className="text-[10px] text-[#8E8172] font-mono">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#8E8172] leading-relaxed">
                                  {n.message}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center space-y-1">
                            <Sparkles className="w-6 h-6 text-[#D7C5AF] mx-auto" />
                            <p className="text-[#8E8172] text-[11px]">No notifications yet</p>
                            <p className="text-[10px] text-[#8E8172]/70">Updates regarding your jewellery orders will appear here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Customer Account Button */}
            <button
              onClick={customerUser ? onOpenProfile : onOpenAuth}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full sm:rounded-xs transition-colors border border-transparent sm:border-[#D7C5AF]/50 text-xs"
              title={customerUser ? `Signed in as ${customerUser.firstName || customerUser.email}` : "Sign In / Register"}
              aria-label="Account"
            >
              <User className="w-4 h-4 text-[#593D30]" />
              <span className="hidden sm:inline font-medium tracking-wider uppercase text-[11px]">
                {customerUser ? (customerUser.firstName || 'Account') : 'Sign In'}
              </span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#593D30] hover:text-[#A85F49] hover:bg-[#D7C5AF]/25 rounded-full"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F7F1E9] border-t border-[#D7C5AF]/35 px-6 py-6 flex flex-col gap-4 text-sm font-medium tracking-wide shadow-md">
            <button
              onClick={() => {
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Home
            </button>

            {/* Mobile Products Accordion */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                className="w-full flex items-center justify-between text-left text-[#593D30] hover:text-[#A85F49]"
              >
                <span>Products</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    mobileProductsOpen ? 'rotate-180 text-[#A85F49]' : ''
                  }`}
                />
              </button>

              {mobileProductsOpen && (
                <div className="pl-3 pt-2 pb-1 space-y-2.5 border-l-2 border-[#D7C5AF]/50 mt-1.5 ml-1">
                  <button
                    onClick={() => {
                      onNavigateCategory('all');
                      setMobileMenuOpen(false);
                    }}
                    className="block text-left text-xs uppercase tracking-wider text-[#593D30] hover:text-[#A85F49] font-semibold"
                  >
                    All Products {allProductsCount > 0 ? `(${allProductsCount})` : ''}
                  </button>
                  {navCategories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        onNavigateCategory(cat.slug);
                        setMobileMenuOpen(false);
                      }}
                      className="block text-left text-xs uppercase tracking-wider text-[#593D30] hover:text-[#A85F49]"
                    >
                      {cat.label} {cat.count !== undefined && cat.count > 0 ? `(${cat.count})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onNavigateSection('bestsellers');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Collections
            </button>
            <button
              onClick={() => {
                onNavigateSection('brand-story');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Our Story
            </button>
            <button
              onClick={() => {
                onNavigateSection('contact');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-[#593D30] hover:text-[#A85F49]"
            >
              Contact
            </button>
            <div className="pt-2 border-t border-[#D7C5AF]/30 flex items-center justify-between">
              <button
                onClick={() => {
                  onOpenCart();
                  setMobileMenuOpen(false);
                }}
                className="text-xs uppercase tracking-wider font-semibold text-[#A85F49] flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bag ({cartCount})</span>
              </button>
              <button
                onClick={() => {
                  if (customerUser) onOpenProfile();
                  else onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="text-xs uppercase tracking-wider font-semibold text-[#593D30] flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>{customerUser ? (customerUser.firstName || 'Account') : 'Sign In'}</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

