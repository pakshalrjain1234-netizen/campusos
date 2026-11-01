import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppRole, UserProfileData } from '../types/auth';
import { ROLE_LABELS, ROLE_BADGE_COLORS, hasPermission } from '../utils/permissions';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { DEMO_ACCOUNTS } from '../services/authService';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Lock,
  Mail,
  User,
  Building2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function UsersManagementPage() {
  const { role: currentRole, user: currentUser } = useAuth();
  const [usersList, setUsersList] = useState<UserProfileData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfileData | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form state for new user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('liaison');
  const [newDept, setNewDept] = useState('Facility Engineering & Maintenance');
  const [formError, setFormError] = useState<string | null>(null);

  const isCoo = currentRole === 'coo';

  // Load profiles from Supabase if configured
  useEffect(() => {
    async function loadProfiles() {
      if (!isSupabaseConfigured) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, department_id, avatar_url, phone, is_active')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: UserProfileData[] = data.map((d) => ({
            id: d.id,
            email: d.email,
            fullName: d.full_name,
            role: d.role as AppRole,
            departmentId: d.department_id,
            avatarUrl: d.avatar_url,
            phone: d.phone,
            isActive: d.is_active,
          }));
          setUsersList(mapped);
        }
      } catch (err) {
        console.error('Failed to load user profiles from database:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfiles();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isCoo) {
      setFormError('Privilege escalation rejected: Only the Chief Operations Officer can provision new users.');
      return;
    }

    const newUser: UserProfileData = {
      id: `usr-${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      fullName: newName.trim(),
      role: newRole,
      departmentName: newDept,
      isActive: true,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newName)}`,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('profiles').insert([
          {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.fullName,
            role: newUser.role,
            is_active: true,
          },
        ]);
        if (error) {
          setFormError(error.message);
          return;
        }
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Database profile creation failed.');
        return;
      }
    }

    setUsersList((prev) => [newUser, ...prev]);
    setIsCreateModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewRole('liaison');
    showToast(`Staff account for ${newUser.fullName} provisioned with role "${ROLE_LABELS[newUser.role]}".`);
  };

  const handleUpdateRole = async (targetUserId: string, updatedRole: AppRole) => {
    if (!isCoo) {
      showToast('Unauthorized: Only the COO can update assigned roles.');
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: updatedRole, updated_at: new Date().toISOString() })
          .eq('id', targetUserId);

        if (error) {
          showToast(`Error: ${error.message}`);
          return;
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to update role in database.');
        return;
      }
    }

    setUsersList((prev) =>
      prev.map((u) => (u.id === targetUserId ? { ...u, role: updatedRole } : u))
    );
    setEditingUser(null);
    showToast(`Role updated successfully to ${ROLE_LABELS[updatedRole]}.`);
  };

  const handleToggleActive = async (targetUser: UserProfileData) => {
    if (!isCoo) {
      showToast('Unauthorized: Only the COO can toggle account status.');
      return;
    }

    if (targetUser.id === currentUser?.id) {
      showToast('You cannot deactivate your own active session.');
      return;
    }

    const nextStatus = !targetUser.isActive;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('profiles')
          .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', targetUser.id);
      } catch (err) {
        console.warn('DB toggle error:', err);
      }
    }

    setUsersList((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextStatus } : u))
    );
    showToast(`Account for ${targetUser.fullName} ${nextStatus ? 'activated' : 'deactivated'}.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#24283B] text-white font-jakarta text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#2E8B67]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#E7E2DD] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E6E9FF] border border-[#C8D0FA] flex items-center justify-center text-[#4A5AA0]">
            <Users size={24} />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-[#24283B] tracking-tight">
              User & Access Governance
            </h1>
            <p className="font-jakarta text-xs text-[#74788C] mt-0.5">
              Enforce role-based access control, assign operational tiers, and manage staff accounts
            </p>
          </div>
        </div>

        {isCoo && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6878CA] to-[#4A5AA0] text-white font-jakarta text-xs font-bold shadow-sm hover:scale-[1.02] transition cursor-pointer self-start sm:self-auto"
          >
            <UserPlus size={15} />
            <span>Invite Staff Member</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#E7E2DD]">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, department..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white focus:border-[#6878CA] outline-none text-xs font-jakarta text-[#24283B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-[#74788C]" />
          <span className="font-jakarta text-xs text-[#74788C]">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] text-xs font-jakarta text-[#24283B] outline-none cursor-pointer"
          >
            <option value="all">All Roles ({usersList.length})</option>
            <option value="coo">COO Only</option>
            <option value="director">Directors</option>
            <option value="engineer">Engineers</option>
            <option value="liaison">Liaisons</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white border border-[#E7E2DD] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7E2DD] bg-[#FAF7F1]/60 font-space text-[11px] font-bold uppercase tracking-wider text-[#74788C]">
                <th className="py-3.5 px-6">Staff Profile</th>
                <th className="py-3.5 px-6">Operational Role</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Account Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DD] font-jakarta text-xs">
              {filteredUsers.map((u) => {
                const badge = ROLE_BADGE_COLORS[u.role];
                return (
                  <tr key={u.id} className="hover:bg-[#FAF7F1]/40 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`
                          }
                          alt={u.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-[#E7E2DD]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=CO`;
                          }}
                        />
                        <div>
                          <p className="font-space font-bold text-sm text-[#24283B]">{u.fullName}</p>
                          <p className="font-jakarta text-[11px] text-[#74788C]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderColor: badge.border,
                        }}
                      >
                        <Shield size={12} />
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-[#74788C]">
                      {u.departmentName || 'Campus Operations & Support'}
                    </td>

                    <td className="py-4 px-6">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E8B67] bg-[#D5F3E8] px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#BA3D6E] bg-[#FDF0F6] px-2 py-0.5 rounded-full">
                          <XCircle size={12} /> Deactivated
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      {isCoo ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg border border-[#E7E2DD] bg-[#FAF7F1] hover:bg-white text-[#4A5AA0] transition"
                            title="Edit role"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-lg border transition ${
                              u.isActive
                                ? 'border-[#F8DCE8] text-[#BA3D6E] hover:bg-[#FDF0F6]'
                                : 'border-[#A7F3D0] text-[#2E8B67] hover:bg-[#D5F3E8]'
                            }`}
                            title={u.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            {u.isActive ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#9CA1B4] text-[11px]">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE USER MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#24283B]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E7E2DD] shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E2DD]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E6E9FF] text-[#4A5AA0] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-space font-bold text-base text-[#24283B]">Invite Staff Member</h3>
                  <p className="font-jakarta text-[11px] text-[#74788C]">Assign trusted database role</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#74788C] hover:bg-[#FAF7F1]"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-[#FDF0F6] border border-[#F8DCE8] text-[#BA3D6E] text-xs font-jakarta flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 mt-4">
              <div>
                <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74788C]" />
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Anand Sundaram"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white text-xs font-jakarta outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74788C]" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@campusops.edu"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white text-xs font-jakarta outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1">
                  Department
                </label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74788C]" />
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white text-xs font-jakarta outline-none cursor-pointer"
                  >
                    <option value="Facility Engineering & Maintenance">Facility Engineering & Maintenance</option>
                    <option value="Office of Strategic Operations">Office of Strategic Operations</option>
                    <option value="Department of Computing & IT">Department of Computing & IT</option>
                    <option value="Electrical & Power Systems">Electrical & Power Systems</option>
                    <option value="Student Affairs & Campus Life">Student Affairs & Campus Life</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1">
                  Assigned Operational Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['liaison', 'engineer', 'director', 'coo'] as AppRole[]).map((r) => {
                    const isSelected = newRole === r;
                    const badge = ROLE_BADGE_COLORS[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewRole(r)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-[#6878CA] bg-[#E6E9FF] shadow-xs'
                            : 'border-[#E7E2DD] bg-[#FAF7F1] hover:bg-white'
                        }`}
                      >
                        <p className="font-space font-bold text-xs" style={{ color: badge.text }}>
                          {r.toUpperCase()}
                        </p>
                        <p className="font-jakarta text-[10px] text-[#74788C] mt-0.5 truncate">
                          {ROLE_LABELS[r]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E7E2DD] text-[#74788C] font-jakarta text-xs font-semibold hover:bg-[#FAF7F1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6878CA] to-[#4A5AA0] text-white font-jakarta text-xs font-bold shadow-sm"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ROLE MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#24283B]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-[#E7E2DD] shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-space font-bold text-base text-[#24283B]">Update Role Assignment</h3>
            <p className="font-jakarta text-xs text-[#74788C] mt-1">
              Select new role for <span className="font-semibold text-[#24283B]">{editingUser.fullName}</span>:
            </p>

            <div className="space-y-2 my-4">
              {(['liaison', 'engineer', 'director', 'coo'] as AppRole[]).map((r) => {
                const isCurrent = editingUser.role === r;
                const badge = ROLE_BADGE_COLORS[r];
                return (
                  <button
                    key={r}
                    onClick={() => handleUpdateRole(editingUser.id, r)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isCurrent
                        ? 'border-[#6878CA] bg-[#E6E9FF]'
                        : 'border-[#E7E2DD] hover:bg-[#FAF7F1]'
                    }`}
                  >
                    <div>
                      <p className="font-space font-bold text-xs text-[#24283B]">{ROLE_LABELS[r]}</p>
                      <p className="font-jakarta text-[10px]" style={{ color: badge.text }}>
                        Tier: {r.toUpperCase()}
                      </p>
                    </div>
                    {isCurrent && <CheckCircle2 size={16} className="text-[#4A5AA0]" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setEditingUser(null)}
              className="w-full py-2 rounded-xl border border-[#E7E2DD] text-[#74788C] font-jakarta text-xs font-semibold hover:bg-[#FAF7F1]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

