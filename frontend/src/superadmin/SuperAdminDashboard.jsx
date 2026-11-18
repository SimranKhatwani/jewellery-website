import React, { useState, useEffect, useMemo } from 'react';
import {
  getPlatformDashboardStats,
  getPlatformTenants,
  updatePlatformTenantStatus,
  getPlatformPlans,
  togglePlatformPlanStatus,
  deletePlatformPlan,
  getPlatformSubscriptions,
  getPlatformUsers,
  updatePlatformUserStatus,
  getPlatformAuditLogs,
  superAdminLogout,
} from './api';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { PlanModal } from './PlanModal';
import { AuditDetailModal } from './AuditDetailModal';
import { AddTenantModal } from './AddTenantModal';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { Store, Globe, Building2 } from 'lucide-react';

export const SuperAdminDashboard = ({
  user,
  onLogout,
  onViewStorefront,
  onGoToStoreAdmin,
}) => {
  // Navigation State
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notifications
  const [actionNotice, setActionNotice] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  // -------------------------------------------------------------
  // 1. DASHBOARD OVERVIEW DATA
  // -------------------------------------------------------------
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  const loadDashboardStats = async () => {
    try {
      setIsDashboardLoading(true);
      setDashboardError(null);
      const data = await getPlatformDashboardStats();
      setDashboardStats(data);
    } catch (err) {
      setDashboardError(err?.message || 'Failed to load platform dashboard metrics.');
    } finally {
      setIsDashboardLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. TENANTS DATA
  // -------------------------------------------------------------
  const [tenants, setTenants] = useState([]);
  const [tenantsTotal, setTenantsTotal] = useState(0);
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');
  const [tenantSearch, setTenantSearch] = useState('');
  const [isTenantsLoading, setIsTenantsLoading] = useState(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);

  const loadTenants = async () => {
    try {
      setIsTenantsLoading(true);
      const res = await getPlatformTenants({ status: tenantStatusFilter, limit: 100 });
      setTenants(res.tenants || []);
      setTenantsTotal(res.meta?.total || (res.tenants || []).length);
    } catch (err) {
      setGlobalError(err?.message || 'Failed to fetch platform tenants.');
    } finally {
      setIsTenantsLoading(false);
    }
  };

  const filteredTenants = useMemo(() => {
    if (!tenantSearch.trim()) return tenants;
    const q = tenantSearch.toLowerCase();
    return tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.ownerId?.email?.toLowerCase().includes(q)
    );
  }, [tenants, tenantSearch]);

  const handleToggleTenantStatus = async (tenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      await updatePlatformTenantStatus(tenant._id, nextStatus);
      showNotice(`Store '${tenant.name}' has been ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
      loadTenants();
      loadDashboardStats();
    } catch (err) {
      setGlobalError(err?.message || 'Failed to update store status.');
    }
  };

  // -------------------------------------------------------------
  // 3. PLANS DATA
  // -------------------------------------------------------------
  const [plans, setPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const loadPlans = async () => {
    try {
      setIsPlansLoading(true);
      const data = await getPlatformPlans({ includeInactive: true });
      setPlans(data || []);
    } catch (err) {
      setGlobalError(err?.message || 'Failed to fetch SaaS subscription plans.');
    } finally {
      setIsPlansLoading(false);
    }
  };

  const handleTogglePlan = async (p) => {
    try {
      await togglePlatformPlanStatus(p._id, !p.isActive);
      showNotice(`Plan '${p.name}' is now ${!p.isActive ? 'active' : 'inactive'}.`);
      loadPlans();
      loadDashboardStats();
    } catch (err) {
      setGlobalError(err?.message || 'Failed to toggle plan status.');
    }
  };

  const handleDeletePlan = async (p) => {
    if (!window.confirm(`Are you sure you want to delete the plan '${p.name}'?`)) return;
    try {
      await deletePlatformPlan(p._id);
      showNotice(`Plan '${p.name}' was successfully deleted.`);
      loadPlans();
      loadDashboardStats();
    } catch (err) {
      setGlobalError(err?.message || 'Failed to delete plan.');
    }
  };

  // -------------------------------------------------------------
  // 4. SUBSCRIPTIONS & BILLING DATA
  // -------------------------------------------------------------
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [isSubsLoading, setIsSubsLoading] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);

  const loadSubscriptions = async () => {
    try {
      setIsSubsLoading(true);
      const res = await getPlatformSubscriptions({ status: subStatusFilter, limit: 100 });
      setSubscriptions(res.subscriptions || []);
      setSubsTotal(res.meta?.total || (res.subscriptions || []).length);
    } catch (err) {
      setGlobalError(err?.message || 'Failed to fetch platform subscriptions.');
    } finally {
      setIsSubsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. PLATFORM USERS DATA
  // -------------------------------------------------------------
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setIsUsersLoading(true);
      const res = await getPlatformUsers({ limit: 100 });
      setUsers(res.users || []);
      setUsersTotal(res.meta?.total || (res.users || []).length);
    } catch (err) {
      setGlobalError(err?.message || 'Failed to fetch platform users.');
    } finally {
      setIsUsersLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.tenantName?.toLowerCase().includes(q) ||
        u.tenantSlug?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const handleToggleUserStatus = async (u) => {
    if (u._id === user.id || u.isSuperAdmin) {
      alert('Security Protection: Cannot suspend the active Super Administrator account.');
      return;
    }
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await updatePlatformUserStatus(u._id, nextStatus);
      showNotice(`User '${u.name || u.email}' status updated to '${nextStatus}'.`);
      loadUsers();
      loadDashboardStats();
    } catch (err) {
      setGlobalError(err?.message || 'Failed to update user status.');
    }
  };

  // -------------------------------------------------------------
  // 6. SECURITY & AUDIT LOGS DATA
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(25);
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditDateFilter, setAuditDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [auditSearch, setAuditSearch] = useState('');
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [inspectingLog, setInspectingLog] = useState(null);

  const loadAuditLogs = async () => {
    try {
      setIsAuditLoading(true);
      let startDate = null;
      let endDate = null;

      if (auditDateFilter === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
      } else if (auditDateFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      } else if (auditDateFilter === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      }

      const res = await getPlatformAuditLogs({
        page: auditPage,
        limit: auditLimit,
        action: auditActionFilter,
        startDate,
        endDate,
        search: auditSearch,
      });

      setAuditLogs(res.logs || []);
      setAuditTotal(res.meta?.total || (res.logs || []).length);
    } catch (err) {
      setGlobalError(err?.message || 'Failed to fetch audit log trail.');
    } finally {
      setIsAuditLoading(false);
    }
  };

  // -------------------------------------------------------------
  // LIFECYCLE DISPATCHER
  // -------------------------------------------------------------
  useEffect(() => {
    loadDashboardStats();
    loadPlans();
  }, []);

  useEffect(() => {
    if (activeSection === 'dashboard') loadDashboardStats();
    else if (activeSection === 'tenants') {
      loadTenants();
      loadPlans();
    }
    else if (activeSection === 'plans') loadPlans();
    else if (activeSection === 'subscriptions') {
      loadSubscriptions();
      loadPlans();
    }
    else if (activeSection === 'users') loadUsers();
    else if (activeSection === 'audit') loadAuditLogs();
  }, [activeSection, tenantStatusFilter, subStatusFilter, auditPage, auditLimit, auditActionFilter, auditDateFilter]);

  const handleLogoutClick = async () => {
    try {
      await superAdminLogout();
    } catch {
      // ignore
    }
    onLogout();
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Platform Dashboard';
      case 'tenants':
        return 'Stores & Tenants Management';
      case 'users':
        return 'Platform Users Directory';
      case 'plans':
        return 'SaaS Subscription Plans';
      case 'subscriptions':
        return 'Subscriptions & Billing Oversight';
      case 'audit':
        return 'Platform Security & Audit Logs';
      case 'settings':
        return 'Platform System Settings';
      default:
        return 'Super Admin Console';
    }
  };

  const getActionBadgeClass = (action) => {
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
    <div className="min-h-screen bg-[#F7F1E9] text-[#593D30] font-sans selection:bg-[#A85F49] selection:text-[#FFFFFF] flex">
      {/* 1. PERSISTENT VERTICAL SIDEBAR */}
      <SuperAdminSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        user={user}
        onLogout={handleLogoutClick}
        onViewStorefront={onViewStorefront}
        onGoToStoreAdmin={onGoToStoreAdmin}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Top Header */}
        <header className="h-16 bg-[#FFFFFF] border-b border-[#D7C5AF]/60 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-[#8E8172] hover:text-[#593D30] md:hidden rounded-xs border border-[#D7C5AF]"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8E8172] uppercase tracking-wider font-sans font-medium hidden sm:inline">
                SaaS Platform
              </span>
              <span className="text-[#D7C5AF] hidden sm:inline">/</span>
              <span className="text-[#593D30] font-medium tracking-wide">
                {getSectionTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">


            {/* Identity */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#D7C5AF]">
              <div className="text-right hidden lg:block">
                <div className="text-xs text-[#593D30] font-medium">
                  {user?.name?.replace(/Aurelle Platform /i, 'Platform ') || 'Platform Super Admin'}
                </div>
                <div className="text-[10px] text-[#8E8172] font-mono">{user?.email}</div>
              </div>
              <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#A85F49] text-[10px] uppercase font-mono font-semibold rounded-xs">
                SuperAdmin
              </span>
            </div>
          </div>
        </header>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="mx-6 mt-4 p-3.5 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xs text-xs text-[#059669] flex items-center justify-between shadow-xs font-medium">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-[#059669] hover:opacity-75">✕</button>
          </div>
        )}

        {/* Global Error Alert */}
        {globalError && (
          <div className="mx-6 mt-4 p-3.5 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-xs text-[#A85F49] flex items-center justify-between shadow-xs">
            <span>{globalError}</span>
            <button onClick={() => setGlobalError(null)} className="text-[#A85F49] hover:opacity-75">✕</button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: DASHBOARD HOME (DEFAULT) */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'dashboard' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-light text-[#593D30]">
                  Platform Dashboard Overview
                </h1>
                <p className="text-xs text-[#8E8172] mt-1 font-sans">
                  Real-time database metrics across tenants, subscriptions, users and security audit logs
                </p>
              </div>

              <button
                onClick={loadDashboardStats}
                disabled={isDashboardLoading}
                className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] transition-colors flex items-center gap-1.5 shadow-xs uppercase tracking-wider font-medium"
              >
                <svg className={`w-3.5 h-3.5 ${isDashboardLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isDashboardLoading ? 'Refreshing Data...' : 'Refresh Metrics'}</span>
              </button>
            </div>

            {/* Dashboard Error State */}
            {dashboardError && (
              <div className="p-4 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-xs text-[#A85F49] flex items-center justify-between shadow-xs">
                <div>
                  <span className="font-semibold block">Failed to load statistics:</span>
                  <span>{dashboardError}</span>
                </div>
                <button
                  onClick={loadDashboardStats}
                  className="px-3 py-1 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-xs text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Stat Summary Cards Grid (Real Data) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stores Card */}
              <div className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#8E8172]">
                    Registered Stores
                  </span>
                  <span className="p-1.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#A85F49]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                </div>
                <div className="mt-3 font-serif text-3xl font-light text-[#593D30]">
                  {isDashboardLoading ? '—' : dashboardStats?.tenants?.total ?? 0}
                </div>
                <div className="mt-2 text-xs flex items-center gap-2 text-[#8E8172]">
                  <span className="text-[#059669] font-medium">
                    {dashboardStats?.tenants?.active ?? 0} active
                  </span>
                  <span>•</span>
                  <span className="text-[#DC2626]">
                    {dashboardStats?.tenants?.suspended ?? 0} suspended
                  </span>
                </div>
              </div>

              {/* Subscriptions Card */}
              <div className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#8E8172]">
                    Active Subscriptions
                  </span>
                  <span className="p-1.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#059669]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-3 font-serif text-3xl font-light text-[#593D30]">
                  {isDashboardLoading ? '—' : dashboardStats?.subscriptions?.active ?? 0}
                </div>
                <div className="mt-2 text-xs flex items-center gap-2 text-[#8E8172]">
                  <span className="text-[#D97706] font-medium">
                    {dashboardStats?.subscriptions?.trialing ?? 0} trialing
                  </span>
                  <span>•</span>
                  <span>
                    {dashboardStats?.subscriptions?.cancelled ?? 0} cancelled
                  </span>
                </div>
              </div>

              {/* Platform Users Card */}
              <div className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#8E8172]">
                    Platform Users
                  </span>
                  <span className="p-1.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#593D30]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-3 font-serif text-3xl font-light text-[#593D30]">
                  {isDashboardLoading ? '—' : dashboardStats?.users?.total ?? 0}
                </div>
                <div className="mt-2 text-xs flex items-center gap-2 text-[#8E8172]">
                  <span className="text-[#A85F49] font-medium">
                    {dashboardStats?.users?.superAdminCount ?? 0} superadmin
                  </span>
                  <span>•</span>
                  <span>
                    {dashboardStats?.users?.active ?? 0} active
                  </span>
                </div>
              </div>

              {/* SaaS Plans Card */}
              <div className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#8E8172]">
                    SaaS Plans Live
                  </span>
                  <span className="p-1.5 rounded-xs bg-[#FAF7F2] border border-[#D7C5AF]/60 text-[#D97706]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                </div>
                <div className="mt-3 font-serif text-3xl font-light text-[#593D30]">
                  {isDashboardLoading ? '—' : dashboardStats?.plans?.active ?? 0}
                </div>
                <div className="mt-2 text-xs text-[#8E8172]">
                  <span>{dashboardStats?.plans?.total ?? 0} total plan tiers configured</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Sections (Real Data Streams) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Recent Registered Stores */}
              <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/60">
                    <h3 className="font-serif text-base text-[#593D30] font-light">
                      Recent Stores Registered
                    </h3>
                    <button
                      onClick={() => setActiveSection('tenants')}
                      className="text-[11px] text-[#A85F49] hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {isDashboardLoading ? (
                      <div className="py-6 text-center text-xs text-[#8E8172]">Loading stores...</div>
                    ) : (dashboardStats?.recentTenants || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8E8172]">No stores registered yet.</div>
                    ) : (
                      dashboardStats.recentTenants.map((t) => (
                        <div key={t._id} className="p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-xs flex items-center justify-between">
                          <div className="truncate mr-2">
                            <div className="font-medium text-[#593D30] truncate">{t.name}</div>
                            <div className="text-[10px] font-mono text-[#8E8172]">/{t.slug}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-xs text-[9px] uppercase tracking-wider font-semibold shrink-0 ${t.status === 'active'
                              ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                              : 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/30'
                              }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-[#D7C5AF]/60 text-[11px] text-[#8E8172]">
                  Auto-provisioned with 14-day Starter Trial
                </div>
              </div>

              {/* 2. Recent Subscription Events */}
              <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/60">
                    <h3 className="font-serif text-base text-[#593D30] font-light">
                      Recent Subscription Events
                    </h3>
                    <button
                      onClick={() => setActiveSection('subscriptions')}
                      className="text-[11px] text-[#A85F49] hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {isDashboardLoading ? (
                      <div className="py-6 text-center text-xs text-[#8E8172]">Loading events...</div>
                    ) : (dashboardStats?.recentSubscriptionEvents || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8E8172]">No subscription events recorded.</div>
                    ) : (
                      dashboardStats.recentSubscriptionEvents.map((ev) => (
                        <div key={ev._id} className="p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-[#A85F49] font-semibold">
                              {ev.eventType}
                            </span>
                            <span className="text-[10px] text-[#8E8172]">
                              {new Date(ev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#593D30] mt-1 truncate">
                            Store: {ev.tenantId?.name || 'Store'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-[#D7C5AF]/60 text-[11px] text-[#8E8172]">
                  Monitored via provider-agnostic webhook engine
                </div>
              </div>

              {/* 3. Recent Security Audit Log Stream */}
              <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/60">
                    <h3 className="font-serif text-base text-[#593D30] font-light">
                      Recent Audit Activities
                    </h3>
                    <button
                      onClick={() => setActiveSection('audit')}
                      className="text-[11px] text-[#A85F49] hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {isDashboardLoading ? (
                      <div className="py-6 text-center text-xs text-[#8E8172]">Loading audit stream...</div>
                    ) : (dashboardStats?.recentAuditActivities || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8E8172]">No audit logs recorded yet.</div>
                    ) : (
                      dashboardStats.recentAuditActivities.map((log) => (
                        <div key={log._id} className="p-2.5 bg-[#FAF7F2] border border-[#D7C5AF]/60 rounded-xs text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-[#593D30] font-semibold">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-[#8E8172]">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8E8172] mt-0.5 truncate">
                            Actor: {log.tenantId?.name ? `[${log.tenantId.name}] ` : ''}{log.userId?.email || 'System'} • {log.resource}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-[#D7C5AF]/60 text-[11px] text-[#8E8172]">
                  Immutable ledger stored in MongoDB Atlas
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: STORES & TENANTS OVERSIGHT */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'tenants' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif text-2xl font-light text-[#593D30]">
                  Stores & Tenants Oversight
                </h1>
                <p className="text-xs text-[#8E8172]">Platform tenancy directory and status lifecycle control</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search stores or owners..."
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] placeholder-[#8E8172]/60 focus:outline-none focus:border-[#A85F49]"
                />

                <select
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deactivated">Deactivated</option>
                </select>

                <button
                  onClick={loadTenants}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] shadow-xs font-medium"
                >
                  Refresh
                </button>

                <button
                  onClick={() => {
                    if (plans.length === 0) loadPlans();
                    setIsAddTenantOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-xs text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  + Add Tenant / Store
                </button>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60 text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Store Name</th>
                      <th className="px-4 py-3">Slug / Domain</th>
                      <th className="px-4 py-3">Owner Account</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/30">
                    {isTenantsLoading && tenants.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-[#8E8172]">
                          Loading stores from database...
                        </td>
                      </tr>
                    ) : filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-[#8E8172]">
                          No store records match the query.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => (
                        <tr key={t._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#593D30]">
                            {t.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#8E8172]">
                            <div>/{t.slug}</div>
                            {t.customDomain && (
                              <div className="text-[10px] text-[#A85F49] font-medium">
                                {t.customDomain} {t.customDomainVerified ? '✓' : '(unverified)'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#593D30] font-medium">{t.ownerId?.name || 'Owner'}</div>
                            <div className="text-[11px] text-[#8E8172] font-mono">{t.ownerId?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${t.status === 'active'
                                ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                                : 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/30'
                                }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8E8172]">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleToggleTenantStatus(t)}
                              className={`px-2.5 py-1 text-[11px] rounded-xs border transition-colors font-medium ${t.status === 'active'
                                ? 'border-[#A85F49]/40 text-[#A85F49] hover:bg-[#A85F49]/10'
                                : 'border-[#10B981]/40 text-[#059669] hover:bg-[#10B981]/10'
                                }`}
                            >
                              {t.status === 'active' ? 'Suspend Store' : 'Activate Store'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: PLATFORM USERS */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'users' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif text-2xl font-light text-[#593D30]">
                  Platform Users Registry
                </h1>
                <p className="text-xs text-[#8E8172]">Global user identities across all platform tenants and platform superadmins</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] placeholder-[#8E8172]/60 focus:outline-none focus:border-[#A85F49]"
                />
                <button
                  onClick={loadUsers}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] shadow-xs font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60 text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Tenant / Store</th>
                      <th className="px-4 py-3">User Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Platform Authority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Registered</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/30">
                    {isUsersLoading && users.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[#8E8172]">
                          Loading users from database...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[#8E8172]">
                          No user records found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-semibold tracking-wide border max-w-fit shadow-2xs ${
                                u.isSuperAdmin
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : u.tenantSlug === 'aurelle'
                                  ? 'bg-[#FAF7F2] text-[#A85F49] border-[#D7C5AF]'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {u.isSuperAdmin ? (
                                  <Globe className="w-3 h-3 shrink-0 text-purple-600" />
                                ) : (
                                  <Store className="w-3 h-3 shrink-0 text-[#A85F49]" />
                                )}
                                <span>{u.tenantName || (u.isSuperAdmin ? 'Global Platform' : 'Unassigned')}</span>
                              </span>
                              {u.tenants && u.tenants.length > 0 && u.tenants[0].type && (
                                <span className="text-[10px] text-[#8E8172] font-mono pl-0.5">
                                  {u.tenants[0].type}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#593D30]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border shrink-0 ${
                                  u.isSuperAdmin
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-[#F7F1E9] text-[#A85F49] border-[#D7C5AF]/70'
                                }`}
                                title={`Belongs to ${u.tenantName || 'Global Platform'}`}
                              >
                                {u.tenantSlug ? `/${u.tenantSlug}` : 'PLATFORM'}
                              </span>
                              <span className="font-semibold text-sm">{u.name || 'Unnamed'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#8E8172]">
                            {u.email}
                          </td>
                          <td className="px-4 py-3">
                            {u.isSuperAdmin ? (
                              <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#A85F49] text-[10px] font-mono font-semibold rounded-xs">
                                Super Admin
                              </span>
                            ) : (
                              <span className="text-[#8E8172] text-[11px]">Regular User</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${u.status === 'active'
                                ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                                : 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/30'
                                }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8E8172]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!u.isSuperAdmin && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1 text-[11px] rounded-xs border transition-colors font-medium ${u.status === 'active'
                                  ? 'border-[#A85F49]/40 text-[#A85F49] hover:bg-[#A85F49]/10'
                                  : 'border-[#10B981]/40 text-[#059669] hover:bg-[#10B981]/10'
                                  }`}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: SAAS SUBSCRIPTION PLANS */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'plans' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif text-2xl font-light text-[#593D30]">
                  SaaS Subscription Plans
                </h1>
                <p className="text-xs text-[#8E8172]">Platform subscription tiers, resource quotas and feature entitlements</p>
              </div>

              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsPlanModalOpen(true);
                }}
                className="px-4 py-2 bg-[#593D30] hover:bg-[#A85F49] text-xs uppercase tracking-wider font-medium text-white rounded-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                + Create New Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {isPlansLoading && plans.length === 0 ? (
                <div className="col-span-3 py-16 text-center text-xs text-[#8E8172]">
                  Loading subscription plans from database...
                </div>
              ) : (
                plans.map((p) => (
                  <div
                    key={p._id}
                    className={`bg-[#FFFFFF] border rounded-xs p-5 flex flex-col justify-between shadow-xs transition-all ${p.isActive ? 'border-[#D7C5AF]/60' : 'border-[#D7C5AF]/60 opacity-75 bg-[#FAF7F2]'
                      }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#A85F49] tracking-wider font-semibold">
                            slug: {p.slug}
                          </span>
                          <h3 className="font-serif text-xl text-[#593D30] mt-0.5">{p.name}</h3>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${p.isActive
                            ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                            : 'bg-[#FAF7F2] text-[#8E8172] border border-[#D7C5AF]/60'
                            }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-4 mb-4">
                        <div className="text-2xl font-light text-[#593D30]">
                          {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString()}`}
                          <span className="text-xs text-[#8E8172] font-sans"> /{p.billingInterval}</span>
                        </div>
                        <p className="text-xs text-[#8E8172] mt-1">{p.description || 'No description provided'}</p>
                      </div>

                      {/* Quotas */}
                      <div className="p-3 bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/60 text-xs space-y-1.5 text-[#593D30]">
                        <div className="flex justify-between">
                          <span className="text-[#8E8172]">Max Products:</span>
                          <span className="font-medium text-[#593D30]">{p.limits?.maxProducts ?? 50}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8E8172]">Max Staff:</span>
                          <span className="font-medium text-[#593D30]">{p.limits?.maxStaff ?? 2}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8E8172]">Storage Limit:</span>
                          <span className="font-medium text-[#593D30]">{p.limits?.maxStorageMB ?? 500} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8E8172]">Custom Domain:</span>
                          <span className="font-medium text-[#593D30]">
                            {p.limits?.customDomainAllowed ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mt-3">
                        <span className="text-[10px] uppercase tracking-wider text-[#8E8172] font-bold">
                          Entitled Features ({p.features?.length || 0}):
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.features?.map((f) => (
                            <span
                              key={f}
                              className="text-[10px] font-mono bg-[#FFFFFF] text-[#A85F49] px-1.5 py-0.5 rounded-xs border border-[#D7C5AF] font-medium"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-5 border-t border-[#D7C5AF]/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleTogglePlan(p)}
                        className="text-xs text-[#8E8172] hover:text-[#593D30] underline transition-colors"
                      >
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingPlan(p);
                            setIsPlanModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] shadow-xs font-medium"
                        >
                          Edit Plan
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p)}
                          className="p-1 text-[#8E8172] hover:text-[#DC2626] transition-colors"
                          title="Delete Plan"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 5: SUBSCRIPTIONS & BILLING */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'subscriptions' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif text-2xl font-light text-[#593D30]">
                  Subscriptions & Billing Oversight
                </h1>
                <p className="text-xs text-[#8E8172]">Live store subscriptions, billing cycles, renewals and cancellations</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="all">All Subscription States</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>

                <button
                  onClick={loadSubscriptions}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] shadow-xs font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60 text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Store Name / Slug</th>
                      <th className="px-4 py-3">Active Plan</th>
                      <th className="px-4 py-3">Pricing</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Billing Cycle End</th>
                      <th className="px-4 py-3">Renewal Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/30">
                    {isSubsLoading && subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[#8E8172]">
                          Loading subscriptions from database...
                        </td>
                      </tr>
                    ) : subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[#8E8172]">
                          No subscription records found matching this filter.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#593D30]">{sub.tenantId?.name || 'Store'}</div>
                            <div className="text-[10px] font-mono text-[#8E8172]">/{sub.tenantId?.slug || 'unknown'}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#A85F49]">
                            {sub.planId?.name || 'Custom Plan'}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {sub.planId?.price === 0 ? 'Free Trial' : `₹${sub.planId?.price?.toLocaleString()} / ${sub.planId?.billingInterval || 'mo'}`}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${sub.status === 'active'
                                ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                                : sub.status === 'trialing'
                                  ? 'bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30'
                                  : 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/30'
                                }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8E8172] font-mono">
                            {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            {sub.cancelAtPeriodEnd ? (
                              <span className="text-[#DC2626] text-[11px] font-medium">Cancels at period end</span>
                            ) : (
                              <span className="text-[#059669] text-[11px] font-medium">Auto-renews</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (plans.length === 0) loadPlans();
                                setEditingSubscription(sub);
                                setIsEditSubModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] hover:text-[#A85F49] shadow-xs font-medium transition-colors"
                            >
                              Edit Plan
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 6: SECURITY & AUDIT LOGS TRAIL */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'audit' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif text-2xl font-light text-[#593D30]">
                  Security & Audit Logs Trail
                </h1>
                <p className="text-xs text-[#8E8172]">Immutable platform ledger of authentication, tenant modifications and privilege events</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadAuditLogs}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] flex items-center gap-1.5 shadow-xs font-medium"
                >
                  <svg className={`w-3.5 h-3.5 ${isAuditLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh Logs</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3.5 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8E8172] mb-1">
                  Filter by Action
                </label>
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="all">All Actions</option>
                  <option value="USER_LOGIN">USER_LOGIN</option>
                  <option value="USER_LOGOUT">USER_LOGOUT</option>
                  <option value="TENANT_CREATE">TENANT_CREATE</option>
                  <option value="TENANT_STATUS_CHANGE">TENANT_STATUS_CHANGE</option>
                  <option value="TENANT_OWNERSHIP_TRANSFER">TENANT_OWNERSHIP_TRANSFER</option>
                  <option value="INVITATION_CREATE">INVITATION_CREATE</option>
                  <option value="INVITATION_ACCEPT">INVITATION_ACCEPT</option>
                  <option value="SUBSCRIPTION_CREATE">SUBSCRIPTION_CREATE</option>
                  <option value="SUBSCRIPTION_UPDATE">SUBSCRIPTION_UPDATE</option>
                  <option value="SUBSCRIPTION_CANCEL">SUBSCRIPTION_CANCEL</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8E8172] mb-1">
                  Date Range
                </label>
                <select
                  value={auditDateFilter}
                  onChange={(e) => {
                    setAuditDateFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-[#8E8172] mb-1">
                  Search Actor, Resource, or IP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadAuditLogs()}
                    placeholder="Search query and press Enter..."
                    className="flex-1 px-3 py-1.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] placeholder-[#8E8172]/60 focus:outline-none focus:border-[#A85F49]"
                  />
                  <button
                    onClick={loadAuditLogs}
                    className="px-3 py-1.5 bg-[#593D30] hover:bg-[#A85F49] rounded-xs text-xs text-white font-medium transition-colors shadow-xs"
                  >
                    Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60 text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Actor / Origin</th>
                      <th className="px-4 py-3">Target Resource</th>
                      <th className="px-4 py-3">Details Summary</th>
                      <th className="px-4 py-3 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/30">
                    {isAuditLoading && auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-[#8E8172]">
                          Loading audit records from database...
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-[#8E8172]">
                          No audit log records found for the applied filter.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="px-4 py-3 text-[#8E8172] font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-xs text-[10px] font-mono uppercase tracking-wider border font-medium ${getActionBadgeClass(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#593D30] font-medium truncate max-w-xs">
                              {log.userId ? (
                                <span>{log.userId.email}</span>
                              ) : (
                                <span className="text-[#D97706] font-mono text-[11px]">System Worker</span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#8E8172] font-mono">
                              IP: {log.ipAddress || 'Internal'}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[#A85F49] font-medium">
                            {log.resource} {log.resourceId ? `(${String(log.resourceId).slice(-6)})` : ''}
                          </td>
                          <td className="px-4 py-3 text-[#8E8172] max-w-xs truncate text-[11px]">
                            {log.details?.message ||
                              log.details?.email ||
                              log.details?.targetUserId ||
                              JSON.stringify(log.details || {})}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setInspectingLog(log)}
                              className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#FFFFFF] text-[11px] text-[#593D30] rounded-xs border border-[#D7C5AF] transition-colors shadow-xs font-medium"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#D7C5AF]/60 flex items-center justify-between text-xs text-[#8E8172]">
                <div>
                  Showing {auditLogs.length} of {auditTotal} audit event(s)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs disabled:opacity-40 text-[#593D30] shadow-xs font-medium"
                  >
                    Previous
                  </button>
                  <span className="font-mono text-[#593D30]">Page {auditPage}</span>
                  <button
                    disabled={auditLogs.length < auditLimit}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-2.5 py-1 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs disabled:opacity-40 text-[#593D30] shadow-xs font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 7: PLATFORM SETTINGS */}
        {/* ------------------------------------------------------------- */}
        {activeSection === 'settings' && (
          <main className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
              <h1 className="font-serif text-2xl font-light text-[#593D30]">
                Platform System Settings & Security
              </h1>
              <p className="text-xs text-[#8E8172]">Platform-wide security policies, runtime configuration and environment variables</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Engine */}
              <div className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs space-y-3">
                <h3 className="font-serif text-base text-[#593D30]">Authentication & Session Engine</h3>
                <div className="text-xs space-y-2 text-[#593D30]">
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Token Mechanism</span>
                    <span className="font-mono">Stateless JWT + tokenVersion Revocation</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Session Expiry</span>
                    <span className="font-mono">7 Days (JWT_EXPIRE)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Staff Invitations</span>
                    <span className="font-mono">SHA-256 Hashed Single-Use (48h Expiry)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Super Admin Account</span>
                    <span className="font-mono text-[#059669] font-medium">{user?.email}</span>
                  </div>
                </div>
              </div>

              {/* Database & Infrastructure */}
              <div className="bg-[#FFFFFF] p-5 border border-[#D7C5AF]/60 rounded-xs shadow-xs space-y-3">
                <h3 className="font-serif text-base text-[#593D30]">Database & Cloud Infrastructure</h3>
                <div className="text-xs space-y-2 text-[#593D30]">
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Primary Database</span>
                    <span className="font-mono text-[#059669] font-medium">MongoDB Atlas (Replica Set)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Transactions</span>
                    <span className="font-mono">Atomic session.withTransaction() Active</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Binary Storage</span>
                    <span className="font-mono">GridFS Bucket ('media')</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D7C5AF]/40">
                    <span className="text-[#8E8172]">Custom Domain Validation</span>
                    <span className="font-mono">Enforced (customDomainVerified: true)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs text-xs text-[#8E8172] shadow-xs">
              Notice: Platform security parameters and cluster credentials are strictly maintained in server environment variables (.env) and cannot be modified via client requests.
            </div>
          </main>
        )}
      </div>

      {/* Add Tenant Modal */}
      <AddTenantModal
        isOpen={isAddTenantOpen}
        onClose={() => setIsAddTenantOpen(false)}
        plans={plans}
        onSaveSuccess={(newTenantData) => {
          showNotice(`Store '${newTenantData.tenant?.name || 'New Store'}' was successfully provisioned.`);
          loadTenants();
          loadSubscriptions();
          loadDashboardStats();
        }}
      />

      {/* Edit Subscription Modal */}
      <EditSubscriptionModal
        subscription={editingSubscription}
        isOpen={isEditSubModalOpen}
        onClose={() => {
          setIsEditSubModalOpen(false);
          setEditingSubscription(null);
        }}
        plans={plans}
        onSaveSuccess={() => {
          showNotice('Store subscription plan updated successfully.');
          loadSubscriptions();
          loadTenants();
          loadDashboardStats();
        }}
      />

      {/* Plan Create/Edit Modal */}
      <PlanModal
        plan={editingPlan}
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        onSaveSuccess={() => {
          showNotice(editingPlan ? 'Subscription plan updated successfully.' : 'New subscription plan created.');
          loadPlans();
          loadDashboardStats();
        }}
      />

      {/* Audit Detail Modal */}
      <AuditDetailModal
        log={inspectingLog}
        isOpen={Boolean(inspectingLog)}
        onClose={() => setInspectingLog(null)}
      />
    </div>
  );
};
