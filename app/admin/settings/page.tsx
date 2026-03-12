'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  ALL_ADMIN_PERMISSIONS,
  AdminPermission,
  AdminRole,
  getDefaultPermissionsForRole,
  sanitizePermissions,
} from '@/lib/admin-permissions';
import { Trash2, Edit2, CheckCircle, AlertCircle } from 'lucide-react';

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
  const { adminUser } = useAdminAuth();
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 mt-2">Only Super Admins can manage system settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="text-slate-400 mt-2">Manage admin users and system configuration</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-red-900/30 border border-red-700/50 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Admin Users Management */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Manage Admin Users</h2>

        <div className="mb-8 rounded-lg border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create New Admin</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={newAdmin.firstName}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              value={newAdmin.lastName}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              value={newAdmin.email}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              value={newAdmin.password}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Optional password (leave blank for auto-generated)"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
            <select
              value={newAdmin.role}
              onChange={(e) => applyRoleDefaultsForCreate(e.target.value as AdminRole)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              value={newAdmin.status}
              onChange={(e) =>
                setNewAdmin((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Access Permissions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ALL_ADMIN_PERMISSIONS.map((permission) => {
                const checked = newAdmin.permissions.includes(permission);
                return (
                  <label
                    key={`create-${permission}`}
                    className="flex items-center gap-2 rounded border border-slate-700/60 bg-slate-800/60 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={newAdmin.role === 'super_admin'}
                      onChange={() =>
                        togglePermission(permission, newAdmin.role, newAdmin.permissions, (nextPermissions) =>
                          setNewAdmin((prev) => ({ ...prev, permissions: nextPermissions }))
                        )
                      }
                    />
                    <span className="text-sm text-slate-200">{permission}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateAdmin}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Create Admin
            </button>
            {generatedPassword && (
              <p className="text-sm text-amber-300">
                Temporary password: <span className="font-mono">{generatedPassword}</span>
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading admin users...</p>
        ) : admins.length === 0 ? (
          <p className="text-slate-400">No admin users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/50">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Role</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Status</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Logins</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Last Login</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition ${
                      editingAdmin?.id === admin.id ? 'bg-slate-700/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{admin.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{admin.email}</td>
                    <td className="px-6 py-4">
                      {editingAdmin?.id === admin.id ? (
                        <div className="space-y-2">
                          <select
                            value={editingAdmin.role}
                            onChange={(e) =>
                              setEditingAdmin({
                                ...editingAdmin,
                                role: e.target.value as 'admin' | 'super_admin',
                                permissions: getDefaultPermissionsForRole(e.target.value as AdminRole),
                              })
                            }
                            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          >
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>

                          <div className="grid grid-cols-1 gap-1 max-h-44 overflow-auto pr-2">
                            {ALL_ADMIN_PERMISSIONS.map((permission) => (
                              <label key={`${admin.id}-${permission}`} className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={editingAdmin.permissions.includes(permission)}
                                  disabled={editingAdmin.role === 'super_admin'}
                                  onChange={() =>
                                    togglePermission(
                                      permission,
                                      editingAdmin.role,
                                      editingAdmin.permissions,
                                      (nextPermissions) =>
                                        setEditingAdmin({ ...editingAdmin, permissions: nextPermissions })
                                    )
                                  }
                                />
                                {permission}
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                          admin.role === 'super_admin'
                            ? 'bg-purple-900/30 text-purple-300'
                            : 'bg-blue-900/30 text-blue-300'
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
                          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                          admin.status === 'active'
                            ? 'bg-green-900/30 text-green-300'
                            : 'bg-red-900/30 text-red-300'
                        }`}>
                          {admin.status === 'active' ? '●Active' : '●Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-white">
                      {admin.loginCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingAdmin?.id === admin.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAdmin(null)}
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditAdmin(admin)}
                            disabled={admin.id === adminUser?.id}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit admin"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(admin.id)}
                            disabled={admin.id === adminUser?.id}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete admin"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
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
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm">Total Admin Users</p>
          <p className="text-3xl font-bold text-white mt-2">{admins.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm">Super Admins</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">
            {admins.filter((a) => a.role === 'super_admin').length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm">Active Users</p>
          <p className="text-3xl font-bold text-green-400 mt-2">
            {admins.filter((a) => a.status === 'active').length}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-sm w-full border border-slate-700">
            <div className="border-b border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white">Confirm Delete</h2>
            </div>

            <div className="p-6">
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete this admin user? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteAdmin(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
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
