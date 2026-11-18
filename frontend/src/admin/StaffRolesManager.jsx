import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Key,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit3,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Plus,
  X,
  Phone,
  UserCheck,
  Sparkles,
  Info,
  Package,
  Receipt,
  BarChart3,
  Settings,
  Bell,
  Sliders,
} from 'lucide-react';
import {
  getTenantStaff,
  createTenantStaffDirectly,
  inviteTenantStaff,
  updateTenantStaffMember,
  removeTenantStaffMember,
  getTenantRoles,
  getSystemPermissions,
  createTenantRole,
  updateTenantRole,
  deleteTenantRole,
} from './api';
import { sanitizePhoneInput, isValidPhoneNumber } from '../utils/phone';

// =====================================================================
// ADMIN MODULES SPECIFICATION
// Represents all operational modules present in the store admin panel
// =====================================================================
export const ADMIN_MODULES = [
  {
    id: 'catalogue',
    name: 'Catalogue Management',
    icon: Package,
    description: 'Products, Categories, Stock Inventory and Coupons',
    allPermissions: [
      'products:read',
      'products:write',
      'categories:read',
      'categories:write',
      'inventory:read',
      'inventory:write',
      'coupons:read',
      'coupons:write',
    ],
    readPermissions: ['products:read', 'categories:read', 'inventory:read', 'coupons:read'],
  },
  {
    id: 'orders',
    name: 'Orders & Fulfillment',
    icon: Receipt,
    description: 'Customer Orders, Fulfillment, Tracking and Returns',
    allPermissions: ['orders:read', 'orders:write'],
    readPermissions: ['orders:read'],
  },
  {
    id: 'customers',
    name: 'Customers & Purchases',
    icon: Users,
    description: 'Customer Accounts Directory and Order History',
    allPermissions: ['customers:read'],
    readPermissions: ['customers:read'],
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    icon: BarChart3,
    description: 'Store Analytics, Revenue Trends and Audit Logs',
    allPermissions: ['analytics:view', 'audit:view'],
    readPermissions: ['analytics:view', 'audit:view'],
  },
  {
    id: 'settings',
    name: 'Store Settings & Policies',
    icon: Settings,
    description: 'Store Branding, Policies, FAQs and Custom Domains',
    allPermissions: ['tenant:read', 'tenant:update'],
    readPermissions: ['tenant:read'],
  },
  {
    id: 'notifications',
    name: 'Notifications & Alerts',
    icon: Bell,
    description: 'Low-Stock Alerts and Operational Broadcasts',
    allPermissions: ['tenant:read'],
    readPermissions: ['tenant:read'],
  },
  {
    id: 'staff',
    name: 'Team Members & RBAC',
    icon: ShieldCheck,
    description: 'Manage Staff Accounts and Custom Role Permissions',
    allPermissions: ['staff:read', 'staff:invite', 'staff:update', 'staff:remove', 'roles:manage'],
    readPermissions: ['staff:read'],
  },
];

// Helper to determine module ON/OFF status
export const isModuleEnabled = (mod, permissions = []) => {
  if (permissions.includes('*')) return true;
  return mod.allPermissions.some((p) => permissions.includes(p));
};

export const isModuleFullAccess = (mod, permissions = []) => {
  if (permissions.includes('*')) return true;
  return mod.allPermissions.every((p) => permissions.includes(p));
};

// =====================================================================
// SUB-COMPONENT: ON/OFF SLIDE SWITCH (iOS-STYLE)
// =====================================================================
export const SlideToggleSwitch = ({ checked, onChange, disabled = false, ariaLabel = 'Toggle' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onChange) onChange(!checked);
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#593D30]/30 ${checked ? 'bg-[#593D30]' : 'bg-[#D7C5AF]/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
};

// =====================================================================
// MAIN COMPONENT: StaffRolesManager
// =====================================================================
export const StaffRolesManager = ({ admin }) => {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'roles'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Data States
  const [staffData, setStaffData] = useState({ members: [], pendingInvitations: [] });
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // staff or role to delete

  // -------------------------------------------------------------
  // Load All Data
  // -------------------------------------------------------------
  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg(null);

    try {
      const [staffRes, rolesRes, permsRes] = await Promise.all([
        getTenantStaff(),
        getTenantRoles(),
        getSystemPermissions(),
      ]);

      if (Array.isArray(staffRes)) {
        setStaffData({ members: staffRes, pendingInvitations: [] });
      } else if (staffRes && staffRes.members) {
        setStaffData({
          members: staffRes.members || [],
          pendingInvitations: staffRes.pendingInvitations || [],
        });
      }

      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
      setPermissions(Array.isArray(permsRes) ? permsRes : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load team and role data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Flash success message
  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Only roles created for this tenant (or non-system templates)
  const customRoles = useMemo(() => {
    return roles.filter((r) => !r.isSystemRole || (r.tenantId && r.tenantId !== null));
  }, [roles]);

  // -------------------------------------------------------------
  // Filtered Members
  // -------------------------------------------------------------
  const filteredMembers = useMemo(() => {
    const list = staffData.members || [];
    return list.filter((m) => {
      const user = m.userId || {};
      const role = m.roleId || {};
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        role.name?.toLowerCase().includes(query);

      const matchesRole = roleFilter === 'all' || role.slug === roleFilter;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffData.members, searchTerm, roleFilter, statusFilter]);

  // -------------------------------------------------------------
  // Handlers for Staff
  // -------------------------------------------------------------
  const handleToggleMemberStatus = async (membership) => {
    const newStatus = membership.status === 'active' ? 'suspended' : 'active';
    try {
      await updateTenantStaffMember(membership._id, { status: newStatus });
      triggerSuccess(`Member status updated to ${newStatus}.`);
      loadAllData(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update member status.');
    }
  };

  const handleConfirmRemoveStaff = async () => {
    if (!deleteTarget || deleteTarget.type !== 'staff') return;
    try {
      await removeTenantStaffMember(deleteTarget.id);
      triggerSuccess('Staff member access removed successfully.');
      setDeleteTarget(null);
      loadAllData(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove staff member.');
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!deleteTarget || deleteTarget.type !== 'role') return;
    try {
      await deleteTenantRole(deleteTarget.id);
      triggerSuccess('Custom role deleted successfully.');
      setDeleteTarget(null);
      loadAllData(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete role.');
    }
  };

  // -------------------------------------------------------------
  // Summary Metrics
  // -------------------------------------------------------------
  const totalStaffCount = staffData.members.length;
  const activeStaffCount = staffData.members.filter((m) => m.status === 'active').length;
  const pendingInvitesCount = staffData.pendingInvitations.length;
  const customRolesCount = customRoles.length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-[#FAF7F2] text-[#A85F49] rounded-xs border border-[#D7C5AF]/70">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="font-serif text-2xl text-[#593D30]">Team Members & Access Roles</h1>
            </div>
            <p className="text-xs text-[#8E8172]">
              Manage staff accounts, assign login credentials, and configure module permissions with interactive On/Off switches.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="px-3 py-2 text-xs border border-[#D7C5AF] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#A85F49]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {activeTab === 'members' ? (
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="px-4 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs flex items-center gap-2 shadow-xs transition-colors font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Team Member</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingRole(null);
                  setIsRoleModalOpen(true);
                }}
                className="px-4 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs flex items-center gap-2 shadow-xs transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Role</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#D7C5AF]/30">
          <div className="bg-[#FAF7F2] p-3 rounded-xs border border-[#D7C5AF]/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8172] block">Total Staff</span>
            <span className="text-xl font-serif text-[#593D30]">{totalStaffCount}</span>
          </div>
          <div className="bg-[#FAF7F2] p-3 rounded-xs border border-[#D7C5AF]/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">Active Members</span>
            <span className="text-xl font-serif text-[#593D30]">{activeStaffCount}</span>
          </div>
          <div className="bg-[#FAF7F2] p-3 rounded-xs border border-[#D7C5AF]/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">Pending Invites</span>
            <span className="text-xl font-serif text-[#593D30]">{pendingInvitesCount}</span>
          </div>
          <div className="bg-[#FAF7F2] p-3 rounded-xs border border-[#D7C5AF]/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A85F49] block">Created Roles</span>
            <span className="text-xl font-serif text-[#593D30]">{customRolesCount}</span>
          </div>
        </div>

        {/* Tab Selector Pills */}
        <div className="flex border-b border-[#D7C5AF]/50 mt-6 gap-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === 'members'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Members ({totalStaffCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === 'roles'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
              }`}
          >
            <Shield className="w-4 h-4" />
            <span>Store Roles & Permissions ({customRolesCount})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: TEAM MEMBERS LIST */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'members' && (
        <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-[#D7C5AF]/40 flex flex-col md:flex-row gap-3 justify-between items-center bg-[#FAF7F2]/40">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name or email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r._id || r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="invited">Invited</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#8E8172]">
              <div className="inline-block animate-spin w-5 h-5 border-2 border-[#A85F49] border-t-transparent rounded-full mb-2"></div>
              <p>Loading store team members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-8 h-8 text-[#D7C5AF] mx-auto mb-2" />
              <p className="text-sm font-serif text-[#593D30]">No team members found</p>
              <p className="text-xs text-[#8E8172] mt-1">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try clearing your search filters.'
                  : 'Get started by creating staff accounts or inviting collaborators.'}
              </p>
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="mt-4 px-4 py-1.5 text-xs bg-[#593D30] text-[#FFFFFF] rounded-xs hover:bg-[#4A3227] transition-colors font-medium"
              >
                + Add First Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#593D30]">
                <thead className="bg-[#FAF7F2] text-[10px] uppercase font-bold tracking-wider text-[#8E8172] border-b border-[#D7C5AF]/40">
                  <tr>
                    <th className="py-3 px-4">Member Identity</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined / Added</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7C5AF]/30">
                  {filteredMembers.map((m) => {
                    const user = m.userId || {};
                    const role = m.roleId || {};
                    const isCurrentUser = String(user._id || user.id) === String(admin?.userId || admin?.id);

                    return (
                      <tr key={m._id} className="hover:bg-[#FAF7F2]/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#D7C5AF] flex items-center justify-center font-serif text-xs font-bold text-[#A85F49] shrink-0">
                              {user.name ? user.name[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-medium text-[#593D30] flex items-center gap-1.5">
                                <span>{user.name || 'Unnamed Member'}</span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 bg-[#FAF7F2] text-[9px] font-bold text-[#A85F49] border border-[#D7C5AF] rounded-xs">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#8E8172]">{user.email}</div>
                              {user.phoneNumber && (
                                <div className="text-[10px] text-[#8E8172]/80 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-2.5 h-2.5 text-[#A85F49]" />
                                  <span>{user.phoneNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs bg-[#FAF7F2] text-[#A85F49] border border-[#D7C5AF]">
                              {role.name || role.slug || 'Store Staff'}
                            </span>
                            <div className="text-[10px] text-[#8E8172] mt-0.5">
                              {role.permissions?.includes('*')
                                ? 'Universal Store Access (*)'
                                : `${role.permissions?.length || 0} permissions granted`}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs border ${m.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : m.status === 'suspended'
                                  ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                          >
                            {m.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#8E8172] text-[11px]">
                          {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {!isCurrentUser && (
                              <>
                                {/* EDIT MEMBER BUTTON (Name, Email, Password, Role) */}
                                <button
                                  onClick={() => setEditingMember(m)}
                                  className="px-2.5 py-1 text-[11px] border border-[#593D30] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs font-medium flex items-center gap-1 transition-colors"
                                  title="Edit Name, Email, Password, or Role"
                                >
                                  <Edit3 className="w-3 h-3 text-[#A85F49]" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleToggleMemberStatus(m)}
                                  className={`px-2 py-1 text-[11px] border rounded-xs transition-colors ${m.status === 'active'
                                      ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                                      : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                    }`}
                                  title={m.status === 'active' ? 'Suspend Member' : 'Activate Member'}
                                >
                                  {m.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>

                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'staff',
                                      id: m._id,
                                      name: user.name || user.email,
                                    })
                                  }
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-xs transition-colors"
                                  title="Remove Member Access"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pending Invitations Sub-table (if any) */}
          {staffData.pendingInvitations.length > 0 && (
            <div className="border-t border-[#D7C5AF]/60 p-4 bg-amber-50/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Pending Outbound Invitations ({staffData.pendingInvitations.length})</span>
              </h3>
              <div className="space-y-2">
                {staffData.pendingInvitations.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-2.5 bg-[#FFFFFF] border border-amber-200 rounded-xs flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-[#593D30]">{inv.email}</span>
                      <span className="text-[10px] text-[#8E8172] ml-2">
                        Role: <strong>{inv.roleId?.name || inv.roleId?.slug}</strong> • Expires:{' '}
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-xs">
                      PENDING ACCEPTANCE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ROLES & RBAC MATRIX */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {customRoles.length === 0 ? (
            /* Empty State: Only created roles are shown. Since none are created, prompt to create! */
            <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#D7C5AF] flex items-center justify-center text-[#A85F49] mx-auto mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg text-[#593D30] mb-1">No Roles Created Yet</h3>
              <p className="text-xs text-[#8E8172] max-w-md mx-auto mb-5 leading-relaxed">
                You haven&apos;t defined any custom roles for your store yet. Click &ldquo;+ Create Role&rdquo; to create a new role and use interactive On/Off slide switches to decide which admin modules (Catalogue, Orders, Customers, Analytics, Settings, etc.) members can access.
              </p>
              <button
                onClick={() => {
                  setEditingRole(null);
                  setIsRoleModalOpen(true);
                }}
                className="px-5 py-2.5 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs inline-flex items-center gap-2 shadow-xs transition-colors font-medium mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Role</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRoles.map((r) => {
                const assignedCount = staffData.members.filter(
                  (m) => m.roleId?._id === r._id || m.roleId?.slug === r.slug
                ).length;

                return (
                  <div
                    key={r._id || r.slug}
                    className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Role Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-base text-[#593D30] font-medium">{r.name}</h3>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-xs bg-[#FAF7F2] text-[#A85F49] border border-[#A85F49]/40">
                              Custom Store Role
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8E8172] mt-0.5 font-mono">slug: {r.slug}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-serif font-bold text-[#593D30]">{assignedCount}</span>
                          <span className="text-[10px] text-[#8E8172] block">assigned</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#593D30]/80 mb-4">{r.description || 'No description provided.'}</p>

                      {/* Module On/Off Status Grid */}
                      <div className="mb-4">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8172] block mb-2">
                          Admin Panel Modules Access
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {ADMIN_MODULES.map((mod) => {
                            const isEnabled = isModuleEnabled(mod, r.permissions || []);
                            const Icon = mod.icon;

                            return (
                              <div
                                key={mod.id}
                                className={`px-2.5 py-1.5 rounded-xs border text-[11px] flex items-center justify-between transition-colors ${isEnabled
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-medium'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                                  }`}
                              >
                                <div className="flex items-center gap-1.5 truncate mr-1">
                                  <Icon className={`w-3 h-3 shrink-0 ${isEnabled ? 'text-emerald-700' : 'text-zinc-400'}`} />
                                  <span className="truncate text-[10px]">{mod.name.replace(' Management', '')}</span>
                                </div>
                                <span
                                  className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-xs shrink-0 ${isEnabled ? 'bg-emerald-200 text-emerald-800' : 'bg-zinc-200 text-zinc-500'
                                    }`}
                                >
                                  {isEnabled ? 'ON' : 'OFF'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Actions for created role */}
                    <div className="pt-3 border-t border-[#D7C5AF]/40 flex items-center justify-between">
                      <span className="text-[10px] text-[#8E8172]">
                        {r.permissions?.length || 0} granular permissions
                      </span>

                      <div className="flex items-center gap-2">
                        {/* EDIT ROLE BUTTON */}
                        <button
                          onClick={() => {
                            setEditingRole(r);
                            setIsRoleModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs border border-[#593D30] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs flex items-center gap-1 transition-colors font-medium"
                          title="Edit Role Name, Description & Module Toggles"
                        >
                          <Edit3 className="w-3 h-3 text-[#A85F49]" />
                          <span>Edit Role</span>
                        </button>

                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: 'role',
                              id: r._id,
                              name: r.name,
                              assignedCount,
                            })
                          }
                          disabled={assignedCount > 0}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-xs flex items-center gap-1 transition-colors disabled:opacity-40"
                          title={assignedCount > 0 ? 'Cannot delete role while members are assigned' : 'Delete Role'}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD TEAM MEMBER */}
      {/* ------------------------------------------------------------- */}
      {isAddStaffModalOpen && (
        <AddStaffModal
          roles={roles}
          onClose={() => setIsAddStaffModalOpen(false)}
          onSuccess={(created) => {
            setIsAddStaffModalOpen(false);
            triggerSuccess(
              created.password
                ? `Account provisioned for ${created.name} (${created.email}) with login password.`
                : `Invitation dispatched to ${created.email}.`
            );
            loadAllData(true);
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT TEAM MEMBER (NAME, EMAIL, PASSWORD, ROLE, PHONE) */}
      {/* ------------------------------------------------------------- */}
      {editingMember && (
        <EditStaffMemberModal
          membership={editingMember}
          roles={roles}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            triggerSuccess('Staff member details and credentials updated successfully.');
            loadAllData(true);
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CREATE / EDIT ROLE MODAL (WITH ON/OFF SLIDE TOGGLES) */}
      {/* ------------------------------------------------------------- */}
      {isRoleModalOpen && (
        <RoleFormModal
          editingRole={editingRole}
          onClose={() => {
            setIsRoleModalOpen(false);
            setEditingRole(null);
          }}
          onSuccess={() => {
            setIsRoleModalOpen(false);
            setEditingRole(null);
            triggerSuccess(editingRole ? 'Role updated successfully.' : 'New custom role created.');
            loadAllData(true);
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CONFIRM DELETE MODAL */}
      {/* ------------------------------------------------------------- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#1A1816]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs max-w-sm w-full p-5 shadow-lg">
            <h3 className="font-serif text-lg text-[#593D30] mb-2">Confirm Removal</h3>
            <p className="text-xs text-[#8E8172] mb-4">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong>?
              {deleteTarget.type === 'staff'
                ? ' This staff member will immediately lose access to this store atelier.'
                : ' This custom role will be permanently deleted.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                onClick={deleteTarget.type === 'staff' ? handleConfirmRemoveStaff : handleConfirmDeleteRole}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-xs hover:bg-red-700 font-medium"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: EDIT TEAM MEMBER MODAL
// Allows store admin to edit Member Name, Email, Password, Phone & Role
// =====================================================================
const EditStaffMemberModal = ({ membership, roles, onClose, onSuccess }) => {
  const user = membership.userId || {};
  const currentRole = membership.roleId || {};

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [roleId, setRoleId] = useState(currentRole._id || roles[0]?._id || '');
  const [status, setStatus] = useState(membership.status || 'active');

  // Password reset section
  const [changePassword, setChangePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setChangePassword(true);
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!name.trim()) throw new Error('Please enter the staff member name.');
      if (!email.trim() || !email.includes('@')) throw new Error('Please enter a valid email address.');
      if (!roleId) throw new Error('Please select an assigned role.');

      let cleanPhone = undefined;
      if (phoneNumber && String(phoneNumber).trim()) {
        cleanPhone = sanitizePhoneInput(phoneNumber);
        if (!isValidPhoneNumber(cleanPhone)) {
          throw new Error('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
        }
      }

      if (changePassword) {
        if (!password || password.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
      }

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: cleanPhone,
        roleId,
        status,
        ...(changePassword && password ? { password } : {}),
      };

      await updateTenantStaffMember(membership._id, payload);
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1816]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs max-w-lg w-full p-6 shadow-xl max-h-[90vh] flex flex-col animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/40 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FAF7F2] text-[#A85F49] rounded-xs border border-[#D7C5AF]">
              <Edit3 className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg text-[#593D30]">Edit Team Member</h2>
          </div>
          <button onClick={onClose} className="text-[#8E8172] hover:text-[#593D30]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto pr-1 space-y-4 flex-1">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            {/* Email (Login ID) */}
            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Email Address (Login ID) *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@store.com"
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
              <p className="text-[10px] text-[#8E8172] mt-0.5">Used by this member to sign in to the store admin dashboard.</p>
            </div>

            {/* Phone Number (10 Digits) */}
            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Mobile Phone (10 Digits)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8172] font-mono">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-12 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] font-mono focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            {/* Role & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Assigned Role *</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  {roles.map((r) => (
                    <option key={r._id || r.slug} value={r._id}>
                      {r.name} {r.isSystemRole ? '(Universal Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Account Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="suspended">Suspended (Access Blocked)</option>
                </select>
              </div>
            </div>

            {/* Password Change / Reset Section */}
            <div className="p-3.5 bg-[#FAF7F2]/50 border border-[#D7C5AF]/60 rounded-xs space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="accent-[#593D30] rounded-xs"
                />
                <span className="text-xs font-bold text-[#593D30] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#A85F49]" />
                  <span>Reset / Change Login Password</span>
                </span>
              </label>

              {changePassword && (
                <div className="space-y-2 pt-2 border-t border-[#D7C5AF]/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#8E8172]">New Admin Password:</span>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-[#A85F49] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new secure password (min 6 chars)"
                      className="w-full pl-3 pr-16 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs text-[#593D30] font-mono focus:outline-none focus:border-[#A85F49]"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#8E8172]">
                      {password && (
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className="p-1 hover:text-[#593D30]"
                          title="Copy Password"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 hover:text-[#593D30]"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8E8172]">
                    Updating the password will immediately update this member&apos;s credentials for logging into the store admin dashboard.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D7C5AF]/40 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-[#D7C5AF] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: ROLE FORM MODAL (CREATE / EDIT)
// Features On/Off slide switches for every admin module in the store
// =====================================================================
const RoleFormModal = ({ editingRole, onClose, onSuccess }) => {
  const [name, setName] = useState(editingRole?.name || '');
  const [slug, setSlug] = useState(editingRole?.slug || '');
  const [description, setDescription] = useState(editingRole?.description || '');
  const [selectedPermissions, setSelectedPermissions] = useState(editingRole?.permissions || []);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Auto-generate slug when name changes (if creating new)
  const handleNameChange = (val) => {
    setName(val);
    if (!editingRole) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  // Toggle whole module ON or OFF
  const handleModuleToggle = (mod, turnOn) => {
    if (turnOn) {
      // Add all permissions of this module
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...mod.allPermissions])));
    } else {
      // Remove all permissions belonging to this module
      const toRemove = new Set(mod.allPermissions);
      setSelectedPermissions((prev) => prev.filter((k) => !toRemove.has(k)));
    }
  };

  // Toggle between Full Access (Read & Write) vs View Only (Read Only)
  const handleSetModuleScope = (mod, scope) => {
    const toRemove = new Set(mod.allPermissions);
    const cleaned = selectedPermissions.filter((k) => !toRemove.has(k));
    if (scope === 'full') {
      setSelectedPermissions(Array.from(new Set([...cleaned, ...mod.allPermissions])));
    } else {
      setSelectedPermissions(Array.from(new Set([...cleaned, ...mod.readPermissions])));
    }
  };

  // Quick Preset Actions
  const handlePresetAll = (turnOn) => {
    if (turnOn) {
      const allPerms = ADMIN_MODULES.flatMap((m) => m.allPermissions);
      setSelectedPermissions(Array.from(new Set(allPerms)));
    } else {
      setSelectedPermissions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!name.trim()) throw new Error('Role name is required.');
      if (!slug.trim()) throw new Error('Role slug is required.');
      if (selectedPermissions.length === 0) {
        throw new Error('Please turn ON at least one module switch for this role.');
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        permissions: selectedPermissions,
      };

      if (editingRole) {
        await updateTenantRole(editingRole._id, payload);
      } else {
        await createTenantRole(payload);
      }
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save custom role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1816]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs max-w-2xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/40 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FAF7F2] text-[#A85F49] rounded-xs border border-[#D7C5AF]">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg text-[#593D30]">
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Store Role'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#8E8172] hover:text-[#593D30]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-start gap-1.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto pr-1 space-y-4 flex-1">
            {/* Role Name & Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Catalogue Manager"
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Role Slug *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingRole)}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  placeholder="e.g. catalogue-manager"
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49] disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Role Description</label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the duties and scope for this role..."
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            {/* Modules Header & Presets */}
            <div className="pt-2 border-t border-[#D7C5AF]/40">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-[#593D30] uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#A85F49]" />
                    <span>Admin Panel Modules Access</span>
                  </h3>
                  <p className="text-[11px] text-[#8E8172]">
                    Use the On/Off slide switches below to decide which modules this role can access.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-[#8E8172]">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetAll(true)}
                    className="px-2 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#F3ECE2]"
                  >
                    All ON
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetAll(false)}
                    className="px-2 py-0.5 text-red-600 hover:underline"
                  >
                    All OFF
                  </button>
                </div>
              </div>

              {/* Module On/Off Switch Cards */}
              <div className="space-y-2.5">
                {ADMIN_MODULES.map((mod) => {
                  const isOn = isModuleEnabled(mod, selectedPermissions);
                  const isFull = isModuleFullAccess(mod, selectedPermissions);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      className={`p-3.5 rounded-xs border transition-all ${isOn
                          ? 'bg-[#FFFFFF] border-[#A85F49]/70 shadow-xs ring-1 ring-[#A85F49]/15'
                          : 'bg-[#FAF7F2]/40 border-[#D7C5AF]/50 hover:bg-[#FFFFFF]'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xs border shrink-0 mt-0.5 ${isOn
                                ? 'bg-[#FAF7F2] text-[#A85F49] border-[#D7C5AF]'
                                : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#593D30]">{mod.name}</h4>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-xs ${isOn ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'
                                  }`}
                              >
                                {isOn ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8E8172] mt-0.5 leading-snug">{mod.description}</p>
                          </div>
                        </div>

                        {/* Interactive iOS-style slide switch */}
                        <div className="flex items-center gap-2 shrink-0">
                          <SlideToggleSwitch
                            checked={isOn}
                            onChange={(val) => handleModuleToggle(mod, val)}
                            ariaLabel={`Toggle ${mod.name}`}
                          />
                        </div>
                      </div>

                      {/* Access Scope Options (if ON and module has separate view permissions) */}
                      {isOn && mod.readPermissions && mod.readPermissions.length < mod.allPermissions.length && (
                        <div className="mt-2.5 pt-2 border-t border-[#D7C5AF]/30 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="text-[#8E8172] text-[10px] uppercase font-bold tracking-wider">Access Scope:</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[#593D30]">
                              <input
                                type="radio"
                                name={`scope-${mod.id}`}
                                checked={isFull}
                                onChange={() => handleSetModuleScope(mod, 'full')}
                                className="accent-[#593D30]"
                              />
                              <span>Full Access (Read & Write)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[#593D30]">
                              <input
                                type="radio"
                                name={`scope-${mod.id}`}
                                checked={!isFull}
                                onChange={() => handleSetModuleScope(mod, 'read')}
                                className="accent-[#593D30]"
                              />
                              <span>View Only (Read Only)</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D7C5AF]/40 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-[#D7C5AF] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingRole ? 'Save Changes' : 'Create Role'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: ADD TEAM MEMBER MODAL
// Supports both Direct Account Provisioning (ID & Password) and Email Invite
// =====================================================================
const AddStaffModal = ({ roles, onClose, onSuccess }) => {
  const [mode, setMode] = useState('direct'); // 'direct' | 'invite'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?._id || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [createdSummary, setCreatedSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  // Generate strong random password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      if (!roleId) {
        throw new Error('Please select an administrative role.');
      }

      if (mode === 'direct') {
        if (!name.trim()) throw new Error('Please provide the team member name.');
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (phoneNumber) {
          const cleanPhone = sanitizePhoneInput(phoneNumber);
          if (!isValidPhoneNumber(cleanPhone)) {
            throw new Error('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
          }
        }

        const payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phoneNumber: phoneNumber ? sanitizePhoneInput(phoneNumber) : undefined,
          roleId,
        };

        await createTenantStaffDirectly(payload);
        setCreatedSummary({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          roleName: roles.find((r) => r._id === roleId)?.name || 'Staff Member',
        });
      } else {
        // Invite mode
        const payload = {
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          roleId,
        };
        await inviteTenantStaff(payload);
        onSuccess({ email: payload.email });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add team member.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdSummary) return;
    const text = `Store Admin Credentials\nLogin URL: ${window.location.origin}/admin\nID / Email: ${createdSummary.email}\nPassword: ${createdSummary.password}\nRole: ${createdSummary.roleName}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1816]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs max-w-lg w-full p-6 shadow-xl animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/40 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FAF7F2] text-[#A85F49] rounded-xs border border-[#D7C5AF]">
              <UserPlus className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg text-[#593D30]">Add Store Team Member</h2>
          </div>
          <button onClick={onClose} className="text-[#8E8172] hover:text-[#593D30]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Card after Direct Creation */}
        {createdSummary ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xs text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Account Provisioned Successfully!</span>
              </div>
              <p>
                An account for <strong>{createdSummary.name}</strong> has been created with assigned role{' '}
                <strong>{createdSummary.roleName}</strong>. A welcome email with login details has been dispatched.
              </p>
            </div>

            <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8172]">Login Credentials</span>
                <button
                  onClick={handleCopyCredentials}
                  className="text-xs text-[#A85F49] hover:underline flex items-center gap-1 font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Credentials'}</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-t border-[#D7C5AF]/30">
                <span className="text-[#8E8172]">Login ID / Email:</span>
                <span className="col-span-2 font-mono text-[#593D30] font-medium">{createdSummary.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-t border-[#D7C5AF]/30">
                <span className="text-[#8E8172]">Password:</span>
                <span className="col-span-2 font-mono text-[#593D30] font-medium">{createdSummary.password}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-t border-[#D7C5AF]/30">
                <span className="text-[#8E8172]">Assigned Role:</span>
                <span className="col-span-2 text-[#593D30] font-medium">{createdSummary.roleName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-t border-[#D7C5AF]/30">
                <span className="text-[#8E8172]">Login URL:</span>
                <span className="col-span-2 font-mono text-[11px] text-[#A85F49]">/admin</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => onSuccess(createdSummary)}
                className="px-5 py-2 text-xs bg-[#593D30] text-[#FFFFFF] rounded-xs hover:bg-[#4A3227] font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/50">
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`py-1.5 text-xs font-medium rounded-xs transition-colors flex items-center justify-center gap-1.5 ${mode === 'direct' ? 'bg-[#FFFFFF] text-[#593D30] shadow-xs' : 'text-[#8E8172] hover:text-[#593D30]'
                  }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Create ID & Password</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('invite')}
                className={`py-1.5 text-xs font-medium rounded-xs transition-colors flex items-center justify-center gap-1.5 ${mode === 'invite' ? 'bg-[#FFFFFF] text-[#593D30] shadow-xs' : 'text-[#8E8172] hover:text-[#593D30]'
                  }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email Invite</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Direct Provisioning Inputs */}
            {mode === 'direct' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Email Address (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@store.com"
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#8E8172]">Create Login Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-[#A85F49] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Strong</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter minimum 6 characters password"
                      className="w-full pl-3 pr-10 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] font-mono focus:outline-none focus:border-[#A85F49]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8172] hover:text-[#593D30]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Mobile Phone (10 Digits)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8172] font-mono">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-12 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] font-mono focus:outline-none focus:border-[#A85F49]"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Email Invitation Mode */
              <>
                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Staff Member Name (Optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">Staff Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@store.com"
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  <p className="text-[10px] text-[#8E8172] mt-0.5">
                    An email with an invitation link (valid for 48 hours) will be sent to accept membership.
                  </p>
                </div>
              </>
            )}

            {/* Role Dropdown */}
            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Assign Role & Permissions *</label>
              <select
                required
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                {roles.length === 0 ? (
                  <option value="">No roles available (Create a role in Roles tab)</option>
                ) : (
                  roles.map((r) => (
                    <option key={r._id || r.slug} value={r._id}>
                      {r.name} {r.isSystemRole ? '(Universal Store Admin)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D7C5AF]/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs border border-[#D7C5AF] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{mode === 'direct' ? 'Create Account & ID' : 'Send Invitation Link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
