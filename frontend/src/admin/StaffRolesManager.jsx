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
  const [roleChangeTarget, setRoleChangeTarget] = useState(null); // membership being changed
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

  // Temporary flash success message
  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

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

  // Group permissions by module for the matrix
  const permissionsByModule = useMemo(() => {
    const map = {};
    for (const p of permissions) {
      const mod = p.module || 'general';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [permissions]);

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

  const handleSaveRoleChange = async (membershipId, newRoleId) => {
    try {
      await updateTenantStaffMember(membershipId, { roleId: newRoleId });
      triggerSuccess('Role updated successfully.');
      setRoleChangeTarget(null);
      loadAllData(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change role.');
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
  const customRolesCount = roles.filter((r) => !r.isSystemRole).length;

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
              <h1 className="font-serif text-2xl text-[#593D30]">Team Members & RBAC Roles</h1>
            </div>
            <p className="text-xs text-[#8E8172] max-w-2xl">
              Provision team member accounts directly with email and password, invite staff via email, and configure
              granular Role-Based Access Control (RBAC) permissions for your store atelier.
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
                className="px-4 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs flex items-center gap-2 shadow-xs transition-colors"
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
                className="px-4 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Custom Role</span>
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
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A85F49] block">Custom Roles</span>
            <span className="text-xl font-serif text-[#593D30]">{customRolesCount}</span>
          </div>
        </div>

        {/* Tab Selector Pills */}
        <div className="flex border-b border-[#D7C5AF]/50 mt-6 gap-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Members ({totalStaffCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'roles'
                ? 'border-[#A85F49] text-[#A85F49]'
                : 'border-transparent text-[#8E8172] hover:text-[#593D30]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Roles & RBAC Permissions ({roles.length})</span>
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
                className="mt-4 px-4 py-1.5 text-xs bg-[#593D30] text-[#FFFFFF] rounded-xs hover:bg-[#4A3227] transition-colors"
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
                    <th className="py-3 px-4">Role & Authority</th>
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
                                  <Phone className="w-2.5 h-2.5" />
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
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs border ${
                              m.status === 'active'
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
                                <button
                                  onClick={() => setRoleChangeTarget(m)}
                                  className="px-2 py-1 text-[11px] border border-[#D7C5AF] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs transition-colors"
                                  title="Change Role"
                                >
                                  Change Role
                                </button>

                                <button
                                  onClick={() => handleToggleMemberStatus(m)}
                                  className={`px-2 py-1 text-[11px] border rounded-xs transition-colors ${
                                    m.status === 'active'
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => {
              const assignedCount = staffData.members.filter((m) => m.roleId?._id === r._id || m.roleId?.slug === r.slug).length;
              const isStoreAdminRole = r.slug === 'store_admin';

              return (
                <div
                  key={r._id || r.slug}
                  className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-base text-[#593D30] font-medium">{r.name}</h3>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-xs border ${
                              r.isSystemRole
                                ? 'bg-[#FAF7F2] text-[#8E8172] border-[#D7C5AF]'
                                : 'bg-[#FAF7F2] text-[#A85F49] border-[#A85F49]/40'
                            }`}
                          >
                            {r.isSystemRole ? 'System Template' : 'Custom Store Role'}
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

                    {/* Permissions list */}
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8172] block mb-1.5">
                        Granted Permissions
                      </span>
                      {r.permissions?.includes('*') ? (
                        <div className="p-2 bg-emerald-50/50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Universal store access across all modules and APIs (Wildcard '*')</span>
                        </div>
                      ) : r.permissions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#FAF7F2]/40 rounded-xs border border-[#D7C5AF]/30">
                          {r.permissions.map((pKey) => {
                            const pDef = permissions.find((p) => p.key === pKey);
                            return (
                              <span
                                key={pKey}
                                className="px-2 py-0.5 bg-[#FFFFFF] border border-[#D7C5AF] text-[#593D30] text-[10px] rounded-xs"
                                title={pDef?.description || pKey}
                              >
                                {pDef?.name || pKey}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-[#8E8172] italic">No permissions granted</span>
                      )}
                    </div>
                  </div>

                  {/* Actions for custom roles */}
                  <div className="pt-3 border-t border-[#D7C5AF]/40 flex items-center justify-between">
                    <span className="text-[10px] text-[#8E8172]">
                      {r.isSystemRole ? 'Template protected' : 'Customizable by Store Admin'}
                    </span>

                    {!r.isSystemRole && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(r);
                            setIsRoleModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs border border-[#D7C5AF] text-[#593D30] hover:bg-[#FAF7F2] rounded-xs flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD TEAM MEMBER (DIRECT OR INVITATION) */}
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
      {/* MODAL 2: CREATE / EDIT ROLE MODAL */}
      {/* ------------------------------------------------------------- */}
      {isRoleModalOpen && (
        <RoleFormModal
          editingRole={editingRole}
          permissionsByModule={permissionsByModule}
          allPermissions={permissions}
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
      {/* MODAL 3: CHANGE MEMBER ROLE QUICK MODAL */}
      {/* ------------------------------------------------------------- */}
      {roleChangeTarget && (
        <ChangeMemberRoleModal
          membership={roleChangeTarget}
          roles={roles}
          onClose={() => setRoleChangeTarget(null)}
          onSave={(newRoleId) => handleSaveRoleChange(roleChangeTarget._id, newRoleId)}
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

        const result = await createTenantStaffDirectly(payload);
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
                The team member account has been created and synced with the admin login registry. You can copy the
                credentials below to share with them directly:
              </p>
            </div>

            <div className="p-4 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8E8172]">Name:</span>
                <span className="font-medium text-[#593D30]">{createdSummary.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8172]">Login ID / Email:</span>
                <code className="bg-[#FFFFFF] px-2 py-0.5 border border-[#D7C5AF] rounded-xs font-mono font-bold text-[#593D30]">
                  {createdSummary.email}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8E8172]">Initial Password:</span>
                <code className="bg-[#FFFFFF] px-2 py-0.5 border border-[#D7C5AF] rounded-xs font-mono font-bold text-[#A85F49]">
                  {createdSummary.password}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8172]">Assigned Role:</span>
                <span className="font-bold text-[#593D30]">{createdSummary.roleName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8172]">Login Portal:</span>
                <span className="text-[#A85F49] font-medium">{window.location.origin}/admin</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-4 py-2 bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] hover:bg-[#F3ECE2] text-xs font-medium rounded-xs flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Credentials Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSuccess(createdSummary)}
                className="px-5 py-2 bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] text-xs font-medium rounded-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF7F2] rounded-xs border border-[#D7C5AF]/60">
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`py-1.5 text-xs font-medium rounded-xs transition-all ${
                  mode === 'direct'
                    ? 'bg-[#FFFFFF] text-[#593D30] shadow-xs border border-[#D7C5AF]'
                    : 'text-[#8E8172] hover:text-[#593D30]'
                }`}
              >
                Direct ID & Password Setup
              </button>
              <button
                type="button"
                onClick={() => setMode('invite')}
                className={`py-1.5 text-xs font-medium rounded-xs transition-all ${
                  mode === 'invite'
                    ? 'bg-[#FFFFFF] text-[#593D30] shadow-xs border border-[#D7C5AF]'
                    : 'text-[#8E8172] hover:text-[#593D30]'
                }`}
              >
                Send Invitation Link
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">
                Full Name {mode === 'direct' && '*'}
              </label>
              <input
                type="text"
                required={mode === 'direct'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohini Sen"
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">
                Login ID / Email Address *
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@jewels.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                />
              </div>
            </div>

            {mode === 'direct' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#8E8172]">Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-[#A85F49] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Strong Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-9 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#8E8172] hover:text-[#593D30] absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8E8172] mb-1">
                    Contact Phone (Optional - 10 digits)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(sanitizePhoneInput(e.target.value))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
                  />
                  {phoneNumber && phoneNumber.length > 0 && phoneNumber.length < 10 && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      {10 - phoneNumber.length} more digit{10 - phoneNumber.length > 1 ? 's' : ''} needed
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Assign Role (RBAC) *</label>
              <select
                required
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              >
                {roles.map((r) => (
                  <option key={r._id || r.slug} value={r._id}>
                    {r.name} {r.isSystemRole ? '(Template)' : '(Custom)'} —{' '}
                    {r.permissions?.includes('*') ? 'Universal Access' : `${r.permissions?.length || 0} permissions`}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#8E8172] mt-1">
                The assigned role dictates which modules, tabs, and API endpoints this user will have access to.
              </p>
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
                className="px-5 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
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

// =====================================================================
// SUB-COMPONENT: ROLE FORM MODAL (CREATE / EDIT)
// Allows selecting granular permissions from the matrix
// =====================================================================
const RoleFormModal = ({ editingRole, permissionsByModule, allPermissions, onClose, onSuccess }) => {
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

  const handleTogglePermission = (pKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(pKey) ? prev.filter((k) => k !== pKey) : [...prev, pKey]
    );
  };

  const handleSelectModuleAll = (pList) => {
    const keys = pList.map((p) => p.key);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  // Quick Presets
  const applyPreset = (presetName) => {
    if (presetName === 'all') {
      setSelectedPermissions(allPermissions.map((p) => p.key));
    } else if (presetName === 'clear') {
      setSelectedPermissions([]);
    } else if (presetName === 'catalog') {
      setSelectedPermissions(
        allPermissions
          .filter((p) => ['catalog', 'marketing'].includes(p.module))
          .map((p) => p.key)
      );
    } else if (presetName === 'orders') {
      setSelectedPermissions(
        allPermissions
          .filter((p) => ['sales', 'customers'].includes(p.module))
          .map((p) => p.key)
      );
    } else if (presetName === 'viewer') {
      setSelectedPermissions(
        allPermissions
          .filter((p) => p.key.endsWith(':read') || p.key.endsWith(':view'))
          .map((p) => p.key)
      );
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
        throw new Error('Please select at least one permission for this role.');
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
      <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs max-w-2xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#D7C5AF]/40 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FAF7F2] text-[#A85F49] rounded-xs border border-[#D7C5AF]">
              <Shield className="w-4 h-4" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8E8172] mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Inventory Associate"
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
                  placeholder="e.g. inventory-associate"
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49] disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8172] mb-1">Description</label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the responsibilities and scope of this role..."
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] focus:outline-none focus:border-[#A85F49]"
              />
            </div>

            {/* Quick Presets Bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#593D30]">
                  Permissions Selection ({selectedPermissions.length} selected)
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-[#8E8172]">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className="px-1.5 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#F3ECE2]"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('catalog')}
                    className="px-1.5 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#F3ECE2]"
                  >
                    Catalogue
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('orders')}
                    className="px-1.5 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#F3ECE2]"
                  >
                    Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('viewer')}
                    className="px-1.5 py-0.5 bg-[#FAF7F2] border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#F3ECE2]"
                  >
                    Auditor (Read)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('clear')}
                    className="px-1.5 py-0.5 text-red-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Permissions Accordions / Modules */}
              <div className="space-y-3">
                {Object.entries(permissionsByModule).map(([moduleKey, pList]) => {
                  const allInModuleSelected = pList.every((p) => selectedPermissions.includes(p.key));

                  return (
                    <div
                      key={moduleKey}
                      className="border border-[#D7C5AF]/60 rounded-xs bg-[#FAF7F2]/30 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#A85F49]">
                          {moduleKey} Module
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectModuleAll(pList)}
                          className="text-[10px] text-[#8E8172] hover:text-[#593D30] underline"
                        >
                          {allInModuleSelected ? 'Deselect Module' : 'Select All Module'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {pList.map((p) => {
                          const isChecked = selectedPermissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className={`p-2 rounded-xs border flex items-start gap-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-[#FFFFFF] border-[#A85F49] text-[#593D30]'
                                  : 'bg-[#FAF7F2]/50 border-[#D7C5AF]/40 text-[#8E8172] hover:bg-[#FFFFFF]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.key)}
                                className="mt-0.5 accent-[#A85F49] rounded-xs"
                              />
                              <div className="text-left">
                                <span className="block font-medium text-xs leading-tight text-[#593D30]">
                                  {p.name}
                                </span>
                                <span className="block text-[10px] text-[#8E8172] font-mono mt-0.5">
                                  {p.key}
                                </span>
                                {p.description && (
                                  <span className="block text-[10px] text-[#8E8172]/80 mt-0.5">
                                    {p.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
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
              className="px-5 py-2 text-xs bg-[#593D30] text-[#FFFFFF] hover:bg-[#4A3227] rounded-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingRole ? 'Save Changes' : 'Create Custom Role'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: CHANGE MEMBER ROLE MODAL
// Quick dialog to change staff member's assigned role
// =====================================================================
const ChangeMemberRoleModal = ({ membership, roles, onClose, onSave }) => {
  const [selectedRoleId, setSelectedRoleId] = useState(membership.roleId?._id || roles[0]?._id);
  const user = membership.userId || {};

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1816]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs max-w-sm w-full p-5 shadow-lg">
        <h3 className="font-serif text-base text-[#593D30] mb-1">Update Member Role</h3>
        <p className="text-xs text-[#8E8172] mb-3">
          Select the new role and permissions for <strong>{user.name || user.email}</strong>:
        </p>

        <select
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] mb-4 focus:outline-none focus:border-[#A85F49]"
        >
          {roles.map((r) => (
            <option key={r._id || r.slug} value={r._id}>
              {r.name} {r.isSystemRole ? '(Template)' : '(Custom)'} —{' '}
              {r.permissions?.includes('*') ? 'Universal Access' : `${r.permissions?.length || 0} perms`}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-[#D7C5AF] text-[#593D30] rounded-xs hover:bg-[#FAF7F2]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedRoleId)}
            className="px-4 py-1.5 text-xs bg-[#593D30] text-white rounded-xs hover:bg-[#4A3227] font-medium"
          >
            Apply Role
          </button>
        </div>
      </div>
    </div>
  );
};
