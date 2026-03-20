'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  ALL_ADMIN_PERMISSIONS,
  AdminPermission,
  AdminRole,
  getDefaultPermissionsForRole,
  sanitizePermissions,
} from '@/lib/admin-permissions';
import { Trash2, Edit2, CheckCircle, AlertCircle } from 'lucide-react';

const PERMISSION_GROUPS: Array<{ title: string; permissions: AdminPermission[] }> = [
  {
    title: 'Core Access',
    permissions: ['view_dashboard', 'view_doctors', 'view_analytics'],
  },
  {
    title: 'Patient Data',
    permissions: ['view_patients', 'edit_patient_records', 'manage_section_locks', 'bulk_lock_sections', 'delete_patient_records'],
  },
  {
    title: 'Data Exports',
    permissions: ['export_data', 'schedule_exports'],
  },
  {
    title: 'Operational Oversight',
    permissions: ['view_operations', 'view_data_quality', 'manage_quality_reviews'],
  },
  {
    title: 'Safety Oversight',
    permissions: ['view_safety', 'approve_high_risk_actions', 'manage_safety_escalations', 'manage_protocol_rules'],
  },
  {
    title: 'Cohorts & Outcome Intelligence',
    permissions: ['view_cohorts', 'manage_cohorts'],
  },
  {
    title: 'Governance',
    permissions: ['view_audit_logs', 'assign_bulk_lock_sections', 'manage_system_config', 'manage_automation', 'manage_admins'],
  },
];

const PERMISSION_LABELS: Partial<Record<AdminPermission, string>> = {
  view_dashboard: 'View Dashboard',
  view_analytics: 'View Analytics',
  view_doctors: 'View Doctors',
  view_patients: 'View Patients',
  edit_patient_records: 'Edit Patient Records',
  manage_section_locks: 'Manage Section Locks',
  bulk_lock_sections: 'Bulk Lock Sections',
  assign_bulk_lock_sections: 'Assign Bulk Lock Capability',
  delete_patient_records: 'Delete Patient Records',
  export_data: 'Export Data',
  schedule_exports: 'Schedule Exports',
  view_operations: 'View Operations Center',
  view_data_quality: 'View Data Quality',
  manage_quality_reviews: 'Manage Quality Reviews',
  view_safety: 'View Safety Center',
  approve_high_risk_actions: 'Approve High-Risk Actions',
  manage_safety_escalations: 'Manage Safety Escalations',
  manage_protocol_rules: 'Manage Protocol Rules',
  view_cohorts: 'View Cohort Analytics',
  manage_cohorts: 'Manage Cohorts',
  view_audit_logs: 'View Audit Logs',
  manage_system_config: 'Manage System Configuration',
  manage_automation: 'Manage Automation',
  manage_admins: 'Manage Admin Users',
};

function humanizePermission(permission: AdminPermission): string {
  if (PERMISSION_LABELS[permission]) return PERMISSION_LABELS[permission] as string;
  return permission
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'inactive';
  permissions: string[];
  loginCount: number;
  createdAt: string | null;
  lastLogin: string | null;
}

interface EditingAdmin {
  id: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'inactive';
  permissions: string[];
}

interface NewAdminForm {
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  status: 'active' | 'inactive';
  password: string;
  permissions: string[];
}

export default function SettingsPage() {
  const { adminUser, hasPermission } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<EditingAdmin | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAdmin, setNewAdmin] = useState<NewAdminForm>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'admin',
    status: 'active',
    password: '',
    permissions: getDefaultPermissionsForRole('admin'),
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const uncategorizedPermissions = ALL_ADMIN_PERMISSIONS.filter(
    (permission) => !PERMISSION_GROUPS.some((group) => group.permissions.includes(permission))
  );

  const effectivePermissionGroups =
    uncategorizedPermissions.length > 0
      ? [...PERMISSION_GROUPS, { title: 'Other', permissions: uncategorizedPermissions }]
      : PERMISSION_GROUPS;

  const matrixPermissions = useMemo(
    () => effectivePermissionGroups.flatMap((group) => group.permissions),
    [effectivePermissionGroups]
  );
  const canAssignBulkLock = hasPermission('assign_bulk_lock_sections');

  useEffect(() => {
    if (adminUser?.role !== 'super_admin') {
      return;
    }
    fetchAdmins();
  }, [adminUser]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load admin users');
      }

      setAdmins(Array.isArray(data.admins) ? data.admins : []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      setMessage({ type: 'error', text: 'Failed to load admin users' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = (admin: AdminUser) => {
    setEditingAdmin({
      id: admin.id,
      role: admin.role,
      status: admin.status,
      permissions: sanitizePermissions(admin.role, admin.permissions),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin) return;

    if (editingAdmin.id === adminUser?.id && editingAdmin.status === 'inactive') {
      setMessage({ type: 'error', text: 'You cannot deactivate your own account' });
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editingAdmin.role,
          status: editingAdmin.status,
          permissions: editingAdmin.permissions,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update admin user');
      }

      setMessage({ type: 'success', text: 'Admin user updated successfully' });
      setEditingAdmin(null);
      await fetchAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      setMessage({ type: 'error', text: 'Failed to update admin user' });
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setGeneratedPassword(null);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          email: newAdmin.email,
          role: newAdmin.role,
          status: newAdmin.status,
          password: newAdmin.password || undefined,
          permissions: newAdmin.permissions,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create admin user');
      }

      setMessage({ type: 'success', text: 'Admin user created successfully' });
      setGeneratedPassword(data.generatedPassword || null);
      setNewAdmin({
        firstName: '',
        lastName: '',
        email: '',
        role: 'admin',
        status: 'active',
        password: '',
        permissions: getDefaultPermissionsForRole('admin'),
      });
      await fetchAdmins();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to create admin user' });
    }
  };

  const togglePermission = (
    permission: AdminPermission,
    currentRole: AdminRole,
    currentPermissions: string[],
    setter: (nextPermissions: string[]) => void
  ) => {
    if (permission === 'bulk_lock_sections' && !canAssignBulkLock) {
      return;
    }

    if (currentRole === 'super_admin') {
      setter(getDefaultPermissionsForRole('super_admin'));
      return;
    }

    const has = currentPermissions.includes(permission);
    const next = has
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission];

    setter(sanitizePermissions('admin', next));
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (adminId === adminUser?.id) {
      setMessage({ type: 'error', text: 'You cannot delete your own account' });
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete admin user');
      }

      setMessage({ type: 'success', text: 'Admin user deleted successfully' });
      setShowDeleteConfirm(null);
      await fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      setMessage({ type: 'error', text: 'Failed to delete admin user' });
    }
  };

  const applyRoleDefaultsForCreate = (role: AdminRole) => {
    setNewAdmin((prev) => ({
      ...prev,
      role,
      permissions: getDefaultPermissionsForRole(role),
    }));
  };

  if (adminUser?.role !== 'super_admin') {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">Only Super Admins can manage system settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
          System Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage admin users and system configuration</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Admin Users Management */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Admin Users</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add, configure and manage admin user accounts</p>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 m-6 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Admin</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={newAdmin.firstName}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <input
              value={newAdmin.lastName}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <input
              value={newAdmin.email}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <input
              value={newAdmin.password}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Optional password (leave blank for auto-generated)"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <select
              value={newAdmin.role}
              onChange={(e) => applyRoleDefaultsForCreate(e.target.value as AdminRole)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              value={newAdmin.status}
              onChange={(e) =>
                setNewAdmin((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))
              }
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Access Permissions</p>
            <div className="space-y-4">
              {effectivePermissionGroups.map((group) => (
                <div key={`create-group-${group.title}`} className="rounded-lg border border-border bg-background/50 p-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">{group.title}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.permissions.map((permission) => {
                      const checked = newAdmin.permissions.includes(permission);
                      return (
                        <label
                          key={`create-${permission}`}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                            checked ? 'bg-primary/5 border-primary/40 shadow-sm' : 'bg-background border-border hover:border-border/80'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={newAdmin.role === 'super_admin' || (permission === 'bulk_lock_sections' && !canAssignBulkLock)}
                            onChange={() =>
                              togglePermission(permission, newAdmin.role, newAdmin.permissions, (nextPermissions) =>
                                setNewAdmin((prev) => ({ ...prev, permissions: nextPermissions }))
                              )
                            }
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                          />
                          <span className="text-sm font-medium text-foreground">{humanizePermission(permission)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCreateAdmin}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Create Admin User
            </button>
            {generatedPassword && (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Temporary password: <span className="font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-lg">{generatedPassword}</span>
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0"></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Loading admin users...</p>
          </div>
        ) : admins.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No admin users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Admin Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Role & Access</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-center px-6 py-3 font-semibold text-foreground">Logins</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Last Activity</th>
                  <th className="text-center px-6 py-3 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className={`border-b border-border/70 hover:bg-muted/20 transition-colors ${
                      editingAdmin?.id === admin.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{admin.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{admin.email}</td>
                    <td className="px-6 py-4">
                      {editingAdmin?.id === admin.id ? (
                        <div className="space-y-3">
                          <select
                            value={editingAdmin.role}
                            onChange={(e) =>
                              setEditingAdmin({
                                ...editingAdmin,
                                role: e.target.value as 'admin' | 'super_admin',
                                permissions: getDefaultPermissionsForRole(e.target.value as AdminRole),
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>

                          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar border border-border rounded-lg p-2 bg-background/50">
                            {effectivePermissionGroups.map((group) => (
                              <div key={`${admin.id}-group-${group.title}`} className="mb-3 last:mb-0">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 px-1">{group.title}</p>
                                <div className="space-y-1">
                                  {group.permissions.map((permission) => (
                                    <label key={`${admin.id}-${permission}`} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/30 rounded text-xs text-foreground cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={editingAdmin.permissions.includes(permission)}
                                        disabled={editingAdmin.role === 'super_admin' || (permission === 'bulk_lock_sections' && !canAssignBulkLock)}
                                        onChange={() =>
                                          togglePermission(
                                            permission,
                                            editingAdmin.role,
                                            editingAdmin.permissions,
                                            (nextPermissions) =>
                                              setEditingAdmin({ ...editingAdmin, permissions: nextPermissions })
                                          )
                                        }
                                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30"
                                      />
                                      {humanizePermission(permission)}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          admin.role === 'super_admin'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}>
                          {admin.role === 'super_admin' ? '🔑 Super Admin' : '👤 Admin'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingAdmin?.id === admin.id ? (
                        <select
                          value={editingAdmin.status}
                          onChange={(e) =>
                            setEditingAdmin({
                              ...editingAdmin,
                              status: e.target.value as 'active' | 'inactive',
                            })
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          admin.status === 'active'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {admin.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-foreground">
                      {admin.loginCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingAdmin?.id === admin.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAdmin(null)}
                            className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditAdmin(admin)}
                            disabled={admin.id === adminUser?.id}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                            title="Edit admin"
                          >
                            <Edit2 className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(admin.id)}
                            disabled={admin.id === adminUser?.id}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                            title="Delete admin"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium mb-2">Total Admin Users</p>
            <p className="text-4xl font-bold">{admins.length}</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-violet-100 text-sm font-medium mb-2">Super Admins</p>
            <p className="text-4xl font-bold">{admins.filter((a) => a.role === 'super_admin').length}</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium mb-2">Active Users</p>
            <p className="text-4xl font-bold">{admins.filter((a) => a.status === 'active').length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Permission Matrix</h2>
            <p className="text-muted-foreground text-sm mt-1">Audit access coverage across all admin users in one comprehensive grid.</p>
          </div>
          <div className="text-right bg-muted/30 px-4 py-2 rounded-lg border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Configured Rules</p>
            <p className="text-xl font-bold text-foreground">{matrixPermissions.length}</p>
          </div>
        </div>

        {admins.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No admin users available for matrix view.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-xl shadow-inner">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-muted/80 border-b border-border">
                  <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left text-foreground font-bold min-w-[280px]">Access Permission Rule</th>
                  {admins.map((admin) => (
                    <th key={`matrix-header-${admin.id}`} className="text-center px-4 py-3 text-foreground min-w-[160px] border-l border-border/50">
                      <div className="font-bold text-foreground truncate max-w-[140px] mx-auto">{admin.firstName} {admin.lastName}</div>
                      <div className={`text-[10px] uppercase font-bold mt-1 ${admin.role === 'super_admin' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>{admin.role}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixPermissions.map((permission) => (
                  <tr key={`matrix-row-${permission}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-foreground font-medium border-r border-border/50">{humanizePermission(permission)}</td>
                    {admins.map((admin) => {
                      const enabled = sanitizePermissions(admin.role, admin.permissions).includes(permission);
                      return (
                        <td key={`matrix-cell-${permission}-${admin.id}`} className="text-center px-4 py-3 border-l border-border/50">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold transition-all ${
                              enabled
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/40 shadow-sm'
                                : 'bg-muted/40 text-muted-foreground border border-border/40 opacity-40'
                            }`}
                            title={enabled ? 'Permission Granted' : 'Access Denied'}
                          >
                            {enabled ? '✓' : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-sm w-full border border-border shadow-2xl">
            <div className="border-b border-border p-6 bg-red-500/5">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Confirm Deletion
              </h2>
            </div>

            <div className="p-6">
              <p className="text-foreground leading-relaxed mb-8">
                Are you sure you want to delete this admin user? All their activity history will be anonymized and this action <span className="font-bold text-red-600 underline">cannot be undone</span>.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteAdmin(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all shadow-md active:scale-95"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
