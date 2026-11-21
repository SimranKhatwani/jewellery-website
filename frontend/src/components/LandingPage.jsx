/**
 * @file LandingPage.jsx
 * @description Premium public-facing SaaS landing page for the AURELLE commerce platform,
 * inspired by high-end minimal SaaS architecture (MediStore layout reference).
 * Introduces multi-tenant store management, live workspace preview, core features,
 * architecture, and security before navigating to the Store Admin Login.
 *
 * Designed and Developed by REQUIN SOLUTIONS.
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Store,
  ShoppingBag,
  Boxes,
  Layers,
  Users,
  TrendingUp,
  BarChart3,
  Lock,
  Tag,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Check,
  Server,
  Database,
  Menu,
  X,
  CreditCard,
  CheckCircle2,
  Cpu,
  Clock,
  Eye,
  Settings,
} from 'lucide-react';

/**
 * LandingPage Component
 * @param {Object} props
 * @param {Function} props.onLaunchWorkspace - Navigation callback to open Store Admin Login (/admin)
 * @param {Function} props.onSignIn - Navigation callback to open Store Admin Login (/admin)
 * @param {Function} props.onExploreStorefront - Navigation callback to open Live Customer Storefront (/aurelle)
 * @param {Function} props.onGoToSuperAdmin - Navigation callback to open Super Admin Console (/sa)
 */
export const LandingPage = ({
  onLaunchWorkspace,
  onSignIn,
  onExploreStorefront,
  onGoToSuperAdmin,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('overview');

  // Smooth scroll helper for on-page section anchors
  const scrollToSection = (sectionId) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#593D30] font-sans antialiased selection:bg-[#A85F49] selection:text-[#FFFFFF] overflow-x-hidden flex flex-col justify-between">
      {/* ========================================================= */}
      {/* 1. TOP NAVIGATION                                         */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#D7C5AF]/40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-[#593D30] flex items-center justify-center text-[#F7F1E9] shadow-sm">
              <span className="font-serif text-xl font-bold tracking-wider">A</span>
            </div>
            <div>
              <span className="font-serif text-xl sm:text-2xl font-normal tracking-[0.22em] text-[#593D30] block leading-none">
                AURELLE
              </span>
              <span className="text-[10px] tracking-widest uppercase font-medium text-[#8E8172] block mt-1">
                Commerce OS
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-medium tracking-wide text-[#593D30]">
            <button
              onClick={() => scrollToSection('features')}
              className="text-[#593D30]/80 hover:text-[#A85F49] transition-colors cursor-pointer"
            >
              Key Features
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="text-[#593D30]/80 hover:text-[#A85F49] transition-colors cursor-pointer"
            >
              Platform Preview
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="text-[#593D30]/80 hover:text-[#A85F49] transition-colors cursor-pointer"
            >
              Multi-Tenant Engine
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="text-[#593D30]/80 hover:text-[#A85F49] transition-colors cursor-pointer"
            >
              Security & RBAC
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-[#593D30]/80 hover:text-[#A85F49] transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => onExploreStorefront && onExploreStorefront('aurelle')}
              className="inline-flex items-center gap-1.5 text-[#A85F49] hover:text-[#593D30] font-semibold transition-colors cursor-pointer"
            >
              <span>Live Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-2 bg-[#593D30] hover:bg-[#A85F49] text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={onSignIn}
              className="bg-[#593D30] text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider"
            >
              Sign In
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#593D30] hover:text-[#A85F49] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-[#D7C5AF]/40 bg-[#FAF8F5] px-6 py-5 space-y-4 shadow-lg">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left text-sm font-medium text-[#593D30] py-2"
            >
              Key Features
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="block w-full text-left text-sm font-medium text-[#593D30] py-2"
            >
              Platform Preview
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="block w-full text-left text-sm font-medium text-[#593D30] py-2"
            >
              Multi-Tenant Architecture
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="block w-full text-left text-sm font-medium text-[#593D30] py-2"
            >
              Security & RBAC
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left text-sm font-medium text-[#593D30] py-2"
            >
              About Platform
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onExploreStorefront && onExploreStorefront('aurelle');
              }}
              className="block w-full text-left text-sm font-semibold text-[#A85F49] py-2 flex items-center justify-between"
            >
              <span>Explore Live Storefront</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            <div className="pt-2 border-t border-[#D7C5AF]/30 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLaunchWorkspace && onLaunchWorkspace();
                }}
                className="w-full text-center bg-[#593D30] text-white py-3 rounded-full text-xs font-semibold uppercase tracking-wider"
              >
                Launch Workspace →
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32 px-4 sm:px-6 lg:px-8 text-center max-w-6xl mx-auto">
        {/* Subtle Introductory Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FFFFFF] border border-[#D7C5AF]/70 text-[#593D30] shadow-xs mb-8 transition-transform hover:scale-[1.02]">
          <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase">
            ONE PLATFORM. MULTIPLE STORES. UNIFIED CONTROL.
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-[#593D30] tracking-tight leading-[1.12] max-w-4xl mx-auto">
          Everything You Need to Build, Manage &amp; Scale Your Online Store.
        </h1>

        {/* Supporting Description */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-[#8E8172] font-light leading-relaxed max-w-3xl mx-auto">
          AURELLE is a unified multi-tenant commerce management platform designed to simplify store operations.
          Manage products, inventory, orders, customers, payments and business performance through one powerful workspace.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onLaunchWorkspace}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#593D30] hover:bg-[#A85F49] text-white px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Launch Your Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExploreStorefront && onExploreStorefront('aurelle')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#593D30] border border-[#D7C5AF] px-7 py-3.5 rounded-full text-sm font-medium tracking-wide transition-colors cursor-pointer"
          >
            <Store className="w-4 h-4 text-[#A85F49]" />
            <span>Explore Live Storefront</span>
          </button>
        </div>

        {/* Platform Highlights Row */}
        <div className="mt-12 pt-6 border-t border-[#D7C5AF]/30 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm font-medium text-[#593D30]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A85F49]" />
            <span>100% Tenant Data Isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A85F49]" />
            <span>Centralised Store Management</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A85F49]" />
            <span>Role-Based Access Control</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A85F49]" />
            <span>Real-Time Order &amp; Stock Sync</span>
          </div>
        </div>

        {/* Engineering Attribution Pill */}
        <div className="mt-8 inline-flex items-center gap-1.5 text-xs text-[#8E8172]">
          <span>Designed &amp; Developed by ❤️ </span>
          <a
            href="https://www.requingroup.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#593D30] hover:text-[#A85F49] underline underline-offset-2 transition-colors inline-flex items-center gap-1"
          >
            Requin Solutions Pvt. Ltd
          </a>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. PLATFORM PREVIEW (Admin Workspace Mockup)               */}
      {/* ========================================================= */}
      <section id="preview" className="px-4 sm:px-6 lg:px-8 pb-24 max-w-7xl mx-auto w-full">
        <div className="bg-[#FFFFFF] border border-[#D7C5AF]/70 rounded-2xl shadow-2xl overflow-hidden transition-all">
          {/* macOS Browser Style Top Bar */}
          <div className="bg-[#F7F1E9] border-b border-[#D7C5AF]/50 px-4 py-3 flex items-center justify-between">
            {/* Window Dots */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E57373] inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-[#FFB74D] inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-[#81C784] inline-block"></span>
            </div>

            {/* Simulated Address Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-full px-5 py-1 text-xs text-[#593D30] font-mono">
              <Lock className="w-3 h-3 text-[#A85F49]" />
              <span>aurelle.platform/admin • Atelier Flagship</span>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-full px-3 py-1 text-[11px] font-medium text-[#593D30]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Backend Live</span>
            </div>
          </div>

          {/* Workspace Body Simulation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
            {/* Mock Sidebar */}
            <div className="lg:col-span-3 bg-[#FAF7F2] border-r border-[#D7C5AF]/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 pb-5 border-b border-[#D7C5AF]/40 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#593D30] flex items-center justify-center text-white text-xs font-serif font-bold">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#593D30] uppercase tracking-wider">AURELLE Atelier</h4>
                    <p className="text-[10px] text-[#8E8172]">Primary Tenant Store</p>
                  </div>
                </div>

                {/* Navigation items */}
                <div className="space-y-1 text-xs font-medium">
                  <button
                    onClick={() => setActivePreviewTab('overview')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      activePreviewTab === 'overview'
                        ? 'bg-[#593D30] text-white'
                        : 'text-[#593D30] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Store Overview</span>
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('catalogue')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      activePreviewTab === 'catalogue'
                        ? 'bg-[#593D30] text-white'
                        : 'text-[#593D30] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Product Catalogue</span>
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('orders')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      activePreviewTab === 'orders'
                        ? 'bg-[#593D30] text-white'
                        : 'text-[#593D30] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Orders &amp; Fulfillment</span>
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('security')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      activePreviewTab === 'security'
                        ? 'bg-[#593D30] text-white'
                        : 'text-[#593D30] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Staff Roles &amp; RBAC</span>
                  </button>
                </div>
              </div>

              {/* Sidebar Footer Info */}
              <div className="pt-4 border-t border-[#D7C5AF]/40">
                <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#D7C5AF]/50 text-[11px] text-[#8E8172]">
                  <p className="font-semibold text-[#593D30] mb-0.5">Admin Session Active</p>
                  <p>Role: Store Administrator</p>
                </div>
              </div>
            </div>

            {/* Mock Main Viewport */}
            <div className="lg:col-span-9 p-6 sm:p-8 bg-[#FFFFFF] flex flex-col justify-between space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D7C5AF]/30">
                <div>
                  <h3 className="text-xl sm:text-2xl font-serif font-normal text-[#593D30]">
                    {activePreviewTab === 'overview' && 'Storefront Telemetry & Performance'}
                    {activePreviewTab === 'catalogue' && 'Solid 925 Silver Jewellery Catalogue'}
                    {activePreviewTab === 'orders' && 'Real-Time Order Fulfillment Queue'}
                    {activePreviewTab === 'security' && 'Role-Based Access Control & Tenant Policy'}
                  </h3>
                  <p className="text-xs text-[#8E8172] mt-0.5">
                    Tenant ID: <span className="font-mono text-[#593D30]">tenant_aurelle_prod</span> • ISO-Ready Multi-Tenant Isolation
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#593D30] px-3 py-1.5 rounded-full font-medium">
                    Store Currency: INR (₹)
                  </span>
                </div>
              </div>

              {/* View: OVERVIEW */}
              {activePreviewTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#D7C5AF]/50">
                      <p className="text-[11px] uppercase tracking-wider text-[#8E8172] font-semibold">Monthly Revenue</p>
                      <p className="text-xl sm:text-2xl font-serif text-[#593D30] font-normal mt-1">₹1,84,500</p>
                      <span className="text-[10px] text-emerald-700 font-medium inline-block mt-1">↑ +14.2% vs last mo.</span>
                    </div>
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#D7C5AF]/50">
                      <p className="text-[11px] uppercase tracking-wider text-[#8E8172] font-semibold">Orders in Queue</p>
                      <p className="text-xl sm:text-2xl font-serif text-[#593D30] font-normal mt-1">48 Orders</p>
                      <span className="text-[10px] text-amber-700 font-medium inline-block mt-1">8 require dispatch</span>
                    </div>
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#D7C5AF]/50">
                      <p className="text-[11px] uppercase tracking-wider text-[#8E8172] font-semibold">Active SKU Items</p>
                      <p className="text-xl sm:text-2xl font-serif text-[#593D30] font-normal mt-1">24 Creations</p>
                      <span className="text-[10px] text-[#8E8172] font-medium inline-block mt-1">Solid 925 Sterling</span>
                    </div>
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#D7C5AF]/50">
                      <p className="text-[11px] uppercase tracking-wider text-[#8E8172] font-semibold">Total Customers</p>
                      <p className="text-xl sm:text-2xl font-serif text-[#593D30] font-normal mt-1">186 Collectors</p>
                      <span className="text-[10px] text-emerald-700 font-medium inline-block mt-1">100% Tenant Isolated</span>
                    </div>
                  </div>

                  {/* Recent Orders Mini Table */}
                  <div className="border border-[#D7C5AF]/40 rounded-xl overflow-hidden">
                    <div className="bg-[#FAF7F2] px-4 py-2.5 border-b border-[#D7C5AF]/40 flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#593D30]">Live Orders Feed</span>
                      <span className="text-[11px] text-[#8E8172]">Socket.IO Synchronized</span>
                    </div>
                    <div className="divide-y divide-[#D7C5AF]/20 text-xs">
                      <div className="p-3 flex items-center justify-between hover:bg-[#FAF8F5]">
                        <div>
                          <p className="font-semibold text-[#593D30]">#AUR-8924 • Aditi Sharma</p>
                          <p className="text-[11px] text-[#8E8172]">The Sculpted Molten Band (Size 6, Solid 925)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#593D30]">₹15,400</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-medium">Fulfilled</span>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between hover:bg-[#FAF8F5]">
                        <div>
                          <p className="font-semibold text-[#593D30]">#AUR-8923 • Vikram Singhania</p>
                          <p className="text-[11px] text-[#8E8172]">Fluid Curb Chain Anklet (Standard 9.5")</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#593D30]">₹12,800</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-medium">Processing</span>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between hover:bg-[#FAF8F5]">
                        <div>
                          <p className="font-semibold text-[#593D30]">#AUR-8922 • Meera Rajput</p>
                          <p className="text-[11px] text-[#8E8172]">Geometric Faceted Ring (Size 7)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#593D30]">₹18,200</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-medium">Processing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View: CATALOGUE */}
              {activePreviewTab === 'catalogue' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 border border-[#D7C5AF]/50 rounded-xl bg-[#FAF8F5]">
                      <span className="text-[10px] uppercase font-bold text-[#A85F49] tracking-wider">Bestseller</span>
                      <h4 className="font-serif text-lg text-[#593D30] mt-1">Sculpted Molten Band</h4>
                      <p className="text-xs text-[#8E8172] mt-1">SKU: AUR-RNG-0925-MLT</p>
                      <div className="mt-3 flex justify-between items-center text-xs font-semibold">
                        <span>₹15,400</span>
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">In Stock</span>
                      </div>
                    </div>
                    <div className="p-4 border border-[#D7C5AF]/50 rounded-xl bg-[#FAF8F5]">
                      <span className="text-[10px] uppercase font-bold text-[#593D30] tracking-wider">Silver Anklet</span>
                      <h4 className="font-serif text-lg text-[#593D30] mt-1">Fluid Curb Chain Anklet</h4>
                      <p className="text-xs text-[#8E8172] mt-1">SKU: AUR-ANK-0925-CRB</p>
                      <div className="mt-3 flex justify-between items-center text-xs font-semibold">
                        <span>₹12,800</span>
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">In Stock</span>
                      </div>
                    </div>
                    <div className="p-4 border border-[#D7C5AF]/50 rounded-xl bg-[#FAF8F5]">
                      <span className="text-[10px] uppercase font-bold text-[#A85F49] tracking-wider">New Arrival</span>
                      <h4 className="font-serif text-lg text-[#593D30] mt-1">Geometric Faceted Ring</h4>
                      <p className="text-xs text-[#8E8172] mt-1">SKU: AUR-RNG-0925-FAC</p>
                      <div className="mt-3 flex justify-between items-center text-xs font-semibold">
                        <span>₹18,200</span>
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">In Stock</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-[#F7F1E9] rounded-xl text-xs text-[#8E8172] leading-relaxed">
                    Products feature multi-angle macro imagery, karat hallmark certification specs, custom ring sizing charts, and real-time inventory threshold limits.
                  </div>
                </div>
              )}

              {/* View: ORDERS */}
              {activePreviewTab === 'orders' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-serif text-base text-[#593D30]">Order Dispatch Pipeline</span>
                      <span className="text-xs text-emerald-800 font-medium">Auto-Sync Enabled</span>
                    </div>
                    <p className="text-xs text-[#8E8172] leading-relaxed">
                      Every customer order triggers real-time stock deductions, order confirmation notifications, and invoice generation. Store managers can update dispatch notes, courier tracking numbers, and delivery statuses seamlessly.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#D7C5AF]/30">
                      <p className="font-bold text-lg text-[#593D30]">12</p>
                      <p className="text-[#8E8172]">Pending Review</p>
                    </div>
                    <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#D7C5AF]/30">
                      <p className="font-bold text-lg text-amber-700">8</p>
                      <p className="text-[#8E8172]">In Atelier Polish</p>
                    </div>
                    <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#D7C5AF]/30">
                      <p className="font-bold text-lg text-emerald-700">28</p>
                      <p className="text-[#8E8172]">Delivered This Week</p>
                    </div>
                  </div>
                </div>
              )}

              {/* View: SECURITY */}
              {activePreviewTab === 'security' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#593D30] mb-2">
                        <Lock className="w-4 h-4 text-[#A85F49]" />
                        <span>Strict Tenant Isolation</span>
                      </div>
                      <p className="text-xs text-[#8E8172] leading-relaxed">
                        Data queries in MongoDB are permanently filtered by tenant IDs. Tenant A cannot see, read, or modify records belonging to Tenant B.
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#593D30] mb-2">
                        <ShieldCheck className="w-4 h-4 text-[#A85F49]" />
                        <span>Role-Based Access Control</span>
                      </div>
                      <p className="text-xs text-[#8E8172] leading-relaxed">
                        Granular permissions distinguish Platform SuperAdmins, Store Administrators, Store Managers, and Inventory Clerks.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mock Viewport Footer */}
              <div className="pt-4 border-t border-[#D7C5AF]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-[#8E8172]">
                  Interactive preview mode • No sensitive credentials exposed
                </span>
                <button
                  onClick={onLaunchWorkspace}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#A85F49] hover:text-[#593D30] transition-colors cursor-pointer"
                >
                  <span>Sign into live workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. KEY FEATURES SECTION                                   */}
      {/* ========================================================= */}
      <section id="features" className="py-20 sm:py-28 bg-[#FFFFFF] border-y border-[#D7C5AF]/40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#A85F49] block mb-2">
              CORE CAPABILITIES
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#593D30] tracking-tight">
              Engineered for High-Precision Store Management
            </h2>
            <p className="text-sm sm:text-base text-[#8E8172] font-light mt-4 leading-relaxed">
              Every tool you need to operate a modern luxury retail brand, built natively into the platform without requiring external plugins.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <Boxes className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Product &amp; Categories</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Dynamic category management, karat purity specs, multi-size variants, and high-resolution macro imagery uploads.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Inventory Management</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Sub-second stock availability validation, out-of-stock protections, and automated cart reservations.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <ShoppingBag className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Real-Time Orders</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                End-to-end fulfillment tracking from customer checkout through processing, atelier dispatch, and completed delivery.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Customer CRM</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Tenant-isolated customer profiles, address books, purchase history logs, and guest checkout session reconciliation.
              </p>
            </div>

            {/* Card 5 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Payments &amp; Checkout</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Dynamic multi-currency previews (INR, USD, EUR, GBP), automated order totals, and secure checkout preview validation.
              </p>
            </div>

            {/* Card 6 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <Tag className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Coupons &amp; Offers</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Configurable percentage and flat discounts, expiration windows, minimum cart thresholds, and usage caps.
              </p>
            </div>

            {/* Card 7 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Reports &amp; Analytics</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Comprehensive telemetry tracking gross sales, average order value, top performing categories, and customer growth trends.
              </p>
            </div>

            {/* Card 8 */}
            <div className="bg-[#FAF8F5] border border-[#D7C5AF]/50 rounded-xl p-6 transition-all hover:shadow-md hover:border-[#A85F49]/60">
              <div className="w-10 h-10 rounded-lg bg-[#593D30] text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-[#F7F1E9]" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#593D30]">Staff Roles (RBAC)</h3>
              <p className="text-xs text-[#8E8172] leading-relaxed mt-2.5">
                Granular permission gates for Store Administrators, Store Managers, and Staff Members with secure invitation links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. MULTI-TENANT ARCHITECTURE SECTION                      */}
      {/* ========================================================= */}
      <section id="architecture" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A85F49] block mb-2">
            MULTI-TENANT ARCHITECTURE
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#593D30] tracking-tight">
            One Unified Engine. Complete Tenant Isolation.
          </h2>
          <p className="text-sm sm:text-base text-[#8E8172] font-light mt-4 leading-relaxed">
            AURELLE supports multiple independent stores through a shared platform while guaranteeing complete data separation.
          </p>
        </div>

        {/* Architecture Highlights 3-Column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#FFFFFF] p-8 rounded-2xl border border-[#D7C5AF]/60 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#D7C5AF]/50 flex items-center justify-center text-[#A85F49] mb-6">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-normal text-[#593D30] mb-3">Independent Tenant Data</h3>
            <p className="text-xs sm:text-sm text-[#8E8172] font-light leading-relaxed">
              Every database operation is securely partitioned by tenant identifier. Customer accounts, order queues, and catalogs remain completely separated.
            </p>
          </div>

          <div className="bg-[#FFFFFF] p-8 rounded-2xl border border-[#D7C5AF]/60 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#D7C5AF]/50 flex items-center justify-center text-[#A85F49] mb-6">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-normal text-[#593D30] mb-3">Tenant-Specific Config</h3>
            <p className="text-xs sm:text-sm text-[#8E8172] font-light leading-relaxed">
              Each store configures its own brand identity, currencies, content pages (About Us, Policies), SEO metadata, and custom domain routing.
            </p>
          </div>

          <div className="bg-[#FFFFFF] p-8 rounded-2xl border border-[#D7C5AF]/60 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#D7C5AF]/50 flex items-center justify-center text-[#A85F49] mb-6">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-normal text-[#593D30] mb-3">Tenant-Scoped Operations</h3>
            <p className="text-xs sm:text-sm text-[#8E8172] font-light leading-relaxed">
              Normal GET and mutation requests are strictly scoped to the authenticated tenant context, preventing database-wide resource contention.
            </p>
          </div>
        </div>

        {/* Visual Tenant Isolation Diagram */}
        <div className="mt-12 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-2xl p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A85F49]">Data Flow Isolation</span>
              <h4 className="font-serif text-xl sm:text-2xl text-[#593D30] mt-1">Multi-Store Request Pipeline</h4>
              <p className="text-xs text-[#8E8172] mt-1 max-w-xl">
                Incoming HTTP and Socket.IO requests are validated by the tenant resolution middleware before touching backend models.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="px-4 py-2 bg-[#FAF8F5] border border-[#D7C5AF]/60 rounded-xl text-xs font-mono text-[#593D30]">
                store.aurelle.com
              </div>
              <span className="text-[#A85F49] font-bold">→</span>
              <div className="px-4 py-2 bg-[#593D30] text-white rounded-xl text-xs font-mono">
                Tenant Resolver
              </div>
              <span className="text-[#A85F49] font-bold">→</span>
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-mono">
                Isolated Tenant DB
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. SECURITY & RBAC SECTION                                */}
      {/* ========================================================= */}
      <section id="security" className="py-20 sm:py-28 bg-[#FFFFFF] border-y border-[#D7C5AF]/40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#A85F49] block mb-2">
              SECURITY &amp; COMPLIANCE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#593D30] tracking-tight">
              Rigorous Security at Every Layer
            </h2>
            <p className="text-sm sm:text-base text-[#8E8172] font-light mt-4 leading-relaxed">
              Engineered with modern defense-in-depth security principles to protect your store catalogue, customer identities, and financial transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#D7C5AF]/50">
              <Lock className="w-6 h-6 text-[#A85F49] mb-3" />
              <h4 className="font-serif text-lg text-[#593D30]">Cryptographic JWT Sessions</h4>
              <p className="text-xs text-[#8E8172] mt-2 leading-relaxed">
                Tokens verified on every API and Socket.IO handshake with automated expiration eviction and revocation guards.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#D7C5AF]/50">
              <Shield className="w-6 h-6 text-[#A85F49] mb-3" />
              <h4 className="font-serif text-lg text-[#593D30]">HTML &amp; XSS Sanitization</h4>
              <p className="text-xs text-[#8E8172] mt-2 leading-relaxed">
                Deterministic HTML tokenization strips malicious scripts from rich-text content, reviews, and product attributes.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#D7C5AF]/50">
              <Cpu className="w-6 h-6 text-[#A85F49] mb-3" />
              <h4 className="font-serif text-lg text-[#593D30]">Tiered API Rate Limiting</h4>
              <p className="text-xs text-[#8E8172] mt-2 leading-relaxed">
                Route-appropriate rate limiters shield authentication endpoints from credential-stuffing while preserving browsing throughput.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#D7C5AF]/50">
              <ShieldCheck className="w-6 h-6 text-[#A85F49] mb-3" />
              <h4 className="font-serif text-lg text-[#593D30]">Granular Staff RBAC</h4>
              <p className="text-xs text-[#8E8172] mt-2 leading-relaxed">
                Principle of least privilege governs administrative features with audit log tracking across store modifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. REQUIN SOLUTIONS SPOTLIGHT & CREDITS                   */}
      {/* ========================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-[#593D30] text-[#FAF7F2] rounded-3xl p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-xl">
          <div className="max-w-2xl relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D7C5AF] block mb-3">
              PLATFORM ENGINEERING &amp; DESIGN
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-[#FAF7F2]">
              Architected &amp; Designed by{' '}
              <a
                href="https://www.requingroup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 decoration-[#D7C5AF]/60 hover:text-[#D7C5AF] transition-colors"
              >
                REQUIN SOLUTIONS
              </a>
            </h3>
            <p className="mt-4 text-xs sm:text-sm text-[#D7C5AF] font-light leading-relaxed">
              AURELLE is designed and engineered by{' '}
              <a
                href="https://www.requingroup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FAF7F2] font-medium underline underline-offset-2 hover:text-white transition-colors"
              >
                Requin Solutions
              </a>
              {' '}— delivering modern multi-tenant enterprise architectures,
              resilient microservice frameworks, and art-directed digital commerce platforms with obsessive attention to craft.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onLaunchWorkspace}
                className="bg-[#FFFFFF] text-[#593D30] hover:bg-[#FAF7F2] px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Access Platform Workspace →
              </button>
              <button
                onClick={() => onExploreStorefront && onExploreStorefront('aurelle')}
                className="border border-[#D7C5AF]/60 text-[#FAF7F2] hover:bg-[#FFFFFF]/10 px-6 py-3 rounded-full text-xs font-medium tracking-wide transition-colors cursor-pointer"
              >
                View Live Flagship Storefront
              </button>
            </div>
          </div>

          {/* Decorative Background Monogram */}
          <div className="absolute -right-12 -bottom-16 opacity-10 pointer-events-none select-none font-serif text-[280px] leading-none">
            R
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer id="about" className="bg-[#FAF8F5] border-t border-[#D7C5AF]/50 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#D7C5AF]/40">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#593D30] flex items-center justify-center text-white text-base font-serif font-bold">
                  A
                </div>
                <span className="font-serif text-2xl tracking-[0.25em] text-[#593D30]">AURELLE</span>
              </div>
              <p className="text-xs text-[#8E8172] max-w-md leading-relaxed font-light">
                AURELLE is a high-performance multi-tenant commerce management operating system designed for fine jewellery and luxury retail brands.
              </p>
              <div className="pt-2 text-xs text-[#8E8172] flex items-center gap-1">
                <span>Designed &amp; Developed by ❤️ </span>
                <a
                  href="https://www.requingroup.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#593D30] hover:text-[#A85F49] underline underline-offset-2 transition-colors"
                >
                  Requin Solutions Pvt. Ltd
                </a>
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="space-y-3 text-xs">
              <p className="font-semibold uppercase tracking-wider text-[#593D30]">Platform</p>
              <ul className="space-y-2 text-[#8E8172]">
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-[#A85F49] transition-colors cursor-pointer">
                    Key Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('preview')} className="hover:text-[#A85F49] transition-colors cursor-pointer">
                    Workspace Preview
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('architecture')} className="hover:text-[#A85F49] transition-colors cursor-pointer">
                    Multi-Tenant Engine
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('security')} className="hover:text-[#A85F49] transition-colors cursor-pointer">
                    Security &amp; RBAC
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Portals */}
            <div className="space-y-3 text-xs">
              <p className="font-semibold uppercase tracking-wider text-[#593D30]">Portals</p>
              <ul className="space-y-2 text-[#8E8172]">
                <li>
                  <button onClick={onSignIn} className="hover:text-[#A85F49] font-medium transition-colors cursor-pointer">
                    Store Admin Login (/admin) →
                  </button>
                </li>
                <li>
                  <button onClick={onGoToSuperAdmin} className="hover:text-[#A85F49] transition-colors cursor-pointer">
                    Super Admin Console (/sa) →
                  </button>
                </li>
                <li>
                  <button onClick={() => onExploreStorefront && onExploreStorefront('aurelle')} className="hover:text-[#A85F49] transition-colors cursor-pointer">
                    Live Flagship Storefront (/aurelle) →
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Disclaimer */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8E8172]">
            <p>© 2026 AURELLE Commerce Platform. All rights reserved.</p>
            <p className="flex items-center gap-1">
              <span>Designed &amp; Developed by ❤️ </span>
              <a
                href="https://www.requingroup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#593D30] hover:text-[#A85F49] underline underline-offset-2 transition-colors"
              >
                Requin Solutions Pvt. Ltd
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
