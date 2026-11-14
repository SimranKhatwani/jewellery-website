import React, { useState, useEffect } from 'react';
import {
  getPlatformTenants,
  updatePlatformTenantStatus,
  getPlatformPlans,
  togglePlatformPlanStatus,
  deletePlatformPlan,
  getPlatformUsers,
  updatePlatformUserStatus,
  getPlatformAuditLogs,
  superAdminLogout,
} from './api';
import { PlanModal } from './PlanModal';

export const SuperAdminDashboard = ({
  user,
  onLogout,
  onViewStorefront,
  onGoToStoreAdmin,
}) => {
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'plans' | 'users' | 'audit'

  // Tenants State
  const [tenants, setTenants] = useState([]);
  const [tenantsTotal, setTenantsTotal] = useState(0);
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');

  // Plans State
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Users State
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);

  // Loading & Alerts
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Load Tenants
  const loadTenants = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getPlatformTenants({ status: tenantStatusFilter });
      setTenants(res.tenants || []);
      setTenantsTotal(res.meta?.total || (res.tenants || []).length);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to fetch platform tenants.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Plans
  const loadPlans = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await getPlatformPlans({ includeInactive: true });
      setPlans(data || []);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to fetch subscription plans.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Users
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getPlatformUsers();
      setUsers(res.users || []);
      setUsersTotal(res.meta?.total || (res.users || []).length);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to fetch platform users.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getPlatformAuditLogs();
      setAuditLogs(res.logs || []);
      setAuditTotal(res.meta?.total || (res.logs || []).length);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to fetch audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tenants') loadTenants();
    else if (activeTab === 'plans') loadPlans();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, tenantStatusFilter]);

  // Initial stats prefetch
  useEffect(() => {
    loadTenants();
    loadPlans();
    loadUsers();
  }, []);

  // Tenant Action: Toggle Suspend / Activate
  const handleToggleTenantStatus = async (tenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      await updatePlatformTenantStatus(tenant._id, nextStatus);
      showNotice(`Store '${tenant.name}' status changed to '${nextStatus}'.`);
      loadTenants();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update store status.');
    }
  };

  // User Action: Toggle Suspend / Active
  const handleToggleUserStatus = async (u) => {
    if (u._id === user.id || u.isSuperAdmin) {
      alert('Cannot suspend the active Super Administrator account.');
      return;
    }
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await updatePlatformUserStatus(u._id, nextStatus);
      showNotice(`User '${u.name || u.email}' status updated to '${nextStatus}'.`);
      loadUsers();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update user status.');
    }
  };

  // Plan Action: Toggle Active
  const handleTogglePlan = async (p) => {
    try {
      await togglePlatformPlanStatus(p._id, !p.isActive);
      showNotice(`Plan '${p.name}' is now ${!p.isActive ? 'active' : 'inactive'}.`);
      loadPlans();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to toggle plan status.');
    }
  };

  // Plan Action: Delete
  const handleDeletePlan = async (p) => {
    if (!window.confirm(`Are you sure you want to delete the plan '${p.name}'?`)) return;
    try {
      await deletePlatformPlan(p._id);
      showNotice(`Plan '${p.name}' deleted.`);
      loadPlans();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to delete plan.');
    }
  };

  const handleLogoutClick = async () => {
    await superAdminLogout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#F7F1E9] text-[#593D30]">
      {/* Top Banner Navigation */}
      <header className="border-b border-[#D7C5AF]/60 bg-[#FFFFFF] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-sans tracking-[0.25em] text-[#A85F49] font-semibold">
                AURELLE ATELIER
              </span>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-2xl font-light text-[#593D30] tracking-wide">
                  Super Admin Console
                </h1>
                <span className="px-2 py-0.5 bg-[#A85F49]/10 border border-[#A85F49]/30 text-[#A85F49] text-[10px] font-mono rounded-xs font-semibold">
                  /sa
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Identity Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              <span className="text-xs text-[#593D30] font-medium">{user?.email}</span>
              <span className="text-[9px] uppercase tracking-wider bg-[#593D30] text-[#FFFFFF] px-1.5 py-0.5 rounded-xs font-mono">
                SuperAdmin
              </span>
            </div>

            {/* Quick Portal Switch */}
            <button
              onClick={onGoToStoreAdmin}
              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#D7C5AF] text-xs text-[#593D30] rounded-xs transition-colors"
            >
              Store Admin (/admin)
            </button>

            <button
              onClick={onViewStorefront}
              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#D7C5AF] text-xs text-[#593D30] rounded-xs transition-colors"
            >
              Storefront
            </button>

            <button
              onClick={handleLogoutClick}
              className="text-xs text-[#A85F49] hover:bg-[#A85F49]/10 font-medium px-3 py-1.5 border border-[#A85F49]/40 rounded-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-[#D7C5AF]/40 space-x-6 text-xs uppercase tracking-wider font-semibold">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'tenants'
                ? 'border-[#A85F49] text-[#593D30]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            Stores & Tenants ({tenantsTotal})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'plans'
                ? 'border-[#A85F49] text-[#593D30]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            SaaS Subscription Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-[#A85F49] text-[#593D30]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            Platform Users ({usersTotal})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#A85F49] text-[#593D30]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            Security & Audit Trail
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Notice Toast */}
        {actionNotice && (
          <div className="p-3 bg-[#E8F5E9] border border-[#2E7D32]/30 rounded-xs text-xs text-[#2E7D32] flex items-center justify-between shadow-xs">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-[#2E7D32] hover:opacity-75">✕</button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-xs text-[#A85F49] flex items-center justify-between shadow-xs">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-[#A85F49] hover:opacity-75">✕</button>
          </div>
        )}

        {/* TAB 1: TENANTS */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[#593D30]">Stores & Tenancy Management</h2>
                <p className="text-xs text-[#8E8172]">Platform stores registered across the Aurelle multi-tenant ecosystem</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8E8172]">Filter Status:</span>
                <select
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deactivated">Deactivated</option>
                </select>
                <button
                  onClick={loadTenants}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60">
                    <tr>
                      <th className="px-4 py-3">Store Name</th>
                      <th className="px-4 py-3">Slug / Domain</th>
                      <th className="px-4 py-3">Owner Account</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/40">
                    {isLoading && tenants.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-[#8E8172]">
                          Loading stores from database...
                        </td>
                      </tr>
                    ) : tenants.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-[#8E8172]">
                          No stores found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      tenants.map((t) => (
                        <tr key={t._id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#593D30]">
                            {t.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#8E8172]">
                            <div>/{t.slug}</div>
                            {t.customDomain && (
                              <div className="text-[10px] text-[#A85F49]">
                                {t.customDomain} {t.customDomainVerified ? '✓' : '(unverified)'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#593D30] font-medium">{t.ownerId?.name || 'Owner'}</div>
                            <div className="text-[11px] text-[#8E8172]">{t.ownerId?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${
                                t.status === 'active'
                                  ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/30'
                                  : 'bg-[#FFEBEE] text-[#C62828] border border-[#C62828]/30'
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
                              className={`px-2.5 py-1 text-[11px] rounded-xs border transition-colors ${
                                t.status === 'active'
                                  ? 'border-[#C62828]/40 text-[#C62828] hover:bg-[#FFEBEE]'
                                  : 'border-[#2E7D32]/40 text-[#2E7D32] hover:bg-[#E8F5E9]'
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
          </div>
        )}

        {/* TAB 2: PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[#593D30]">SaaS Subscription Plans</h2>
                <p className="text-xs text-[#8E8172]">Configure platform subscription tiers, quotas & pricing</p>
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
              {plans.map((p) => (
                <div
                  key={p._id}
                  className={`bg-[#FFFFFF] border rounded-xs shadow-xs p-5 flex flex-col justify-between transition-all ${
                    p.isActive ? 'border-[#D7C5AF]/60' : 'border-[#C62828]/30 opacity-75'
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
                        className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${
                          p.isActive
                            ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/30'
                            : 'bg-[#FAF7F2] text-[#8E8172] border border-[#D7C5AF]'
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
                      <p className="text-xs text-[#8E8172] mt-1">{p.description || 'No description'}</p>
                    </div>

                    {/* Limits */}
                    <div className="p-3 bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/40 text-xs space-y-1.5 text-[#593D30]">
                      <div className="flex justify-between">
                        <span className="text-[#8E8172]">Max Products:</span>
                        <span className="font-medium">{p.limits?.maxProducts ?? 50}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8172]">Max Staff:</span>
                        <span className="font-medium">{p.limits?.maxStaff ?? 2}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8172]">Storage Limit:</span>
                        <span className="font-medium">{p.limits?.maxStorageMB ?? 500} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8172]">Custom Domain:</span>
                        <span className="font-medium">
                          {p.limits?.customDomainAllowed ? 'Allowed' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mt-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#8E8172] font-semibold">
                        Included Features ({p.features?.length || 0}):
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.features?.map((f) => (
                          <span
                            key={f}
                            className="text-[10px] font-mono bg-[#FAF7F2] text-[#A85F49] px-1.5 py-0.5 rounded-xs border border-[#D7C5AF]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-5 border-t border-[#D7C5AF]/40 flex items-center justify-between gap-2">
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
                        className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
                      >
                        Edit Plan
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p)}
                        className="p-1 text-[#8E8172] hover:text-[#C62828] transition-colors"
                        title="Delete Plan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl text-[#593D30]">Platform Users Oversight</h2>
                <p className="text-xs text-[#8E8172]">Global platform user registry and access statuses</p>
              </div>
              <button
                onClick={loadUsers}
                className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
              >
                Refresh
              </button>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60">
                    <tr>
                      <th className="px-4 py-3">User Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Platform Authority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Registered</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/40">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#593D30]">
                          {u.name || 'Unnamed'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#8E8172]">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          {u.isSuperAdmin ? (
                            <span className="px-2 py-0.5 bg-[#A85F49]/10 border border-[#A85F49]/30 text-[#A85F49] text-[10px] font-mono rounded-xs font-semibold">
                              Super Admin
                            </span>
                          ) : (
                            <span className="text-[#8E8172] text-[11px]">Regular User</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${
                              u.status === 'active'
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/30'
                                : 'bg-[#FFEBEE] text-[#C62828] border border-[#C62828]/30'
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
                              className={`px-2.5 py-1 text-[11px] rounded-xs border transition-colors ${
                                u.status === 'active'
                                  ? 'border-[#C62828]/40 text-[#C62828] hover:bg-[#FFEBEE]'
                                  : 'border-[#2E7D32]/40 text-[#2E7D32] hover:bg-[#E8F5E9]'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl text-[#593D30]">Security & Audit Trail</h2>
                <p className="text-xs text-[#8E8172]">Immutable ledger of authentication, membership and tenancy events</p>
              </div>
              <button
                onClick={loadAuditLogs}
                className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-xs text-[#593D30]"
              >
                Refresh Logs
              </button>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#593D30]">
                  <thead className="bg-[#FAF7F2] text-[#8E8172] uppercase tracking-wider font-sans border-b border-[#D7C5AF]/60">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Actor / IP</th>
                      <th className="px-4 py-3">Target Resource</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7C5AF]/40">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-[#8E8172]">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="px-4 py-3 text-[#8E8172] font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#A85F49]">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#593D30]">
                            <div>{log.userId?.email || (log.userId ? String(log.userId) : 'System')}</div>
                            <div className="text-[10px] text-[#8E8172]">{log.ipAddress || 'Internal'}</div>
                          </td>
                          <td className="px-4 py-3 text-[#593D30]">
                            {log.resource} {log.resourceId ? `(${String(log.resourceId).slice(-6)})` : ''}
                          </td>
                          <td className="px-4 py-3 text-[11px] font-mono text-[#8E8172] max-w-xs truncate">
                            {JSON.stringify(log.details || {})}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Plan Modal */}
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
        }}
      />
    </div>
  );
};
