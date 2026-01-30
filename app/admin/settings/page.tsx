'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Trash2, Edit2, CheckCircle, AlertCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'inactive';
  loginCount: number;
  createdAt: Date;
  lastLogin: Date;
}

interface EditingAdmin {
  id: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'inactive';
}

export default function SettingsPage() {
  const { adminUser } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<EditingAdmin | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const db = getFirestore();

  useEffect(() => {
    if (adminUser?.role !== 'super_admin') {
      return;
    }
    fetchAdmins();
  }, [adminUser]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const adminsSnap = await getDocs(collection(db, 'admins'));
      const adminsData = adminsSnap.docs.map((doc) => ({
        id: doc.id,
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        email: doc.data().email,
        role: doc.data().role,
        status: doc.data().status,
        loginCount: doc.data().loginCount || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate() || new Date(),
      } as AdminUser));
      setAdmins(adminsData);
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
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin) return;

    try {
      await updateDoc(doc(db, 'admins', editingAdmin.id), {
        role: editingAdmin.role,
        status: editingAdmin.status,
      });
      setMessage({ type: 'success', text: 'Admin user updated successfully' });
      setEditingAdmin(null);
      await fetchAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      setMessage({ type: 'error', text: 'Failed to update admin user' });
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (adminId === adminUser?.id) {
      setMessage({ type: 'error', text: 'You cannot delete your own account' });
      return;
    }

    try {
      await deleteDoc(doc(db, 'admins', adminId));
      setMessage({ type: 'success', text: 'Admin user deleted successfully' });
      setShowDeleteConfirm(null);
      await fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      setMessage({ type: 'error', text: 'Failed to delete admin user' });
    }
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
                        <select
                          value={editingAdmin.role}
                          onChange={(e) =>
                            setEditingAdmin({
                              ...editingAdmin,
                              role: e.target.value as 'admin' | 'super_admin',
                            })
                          }
                          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
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
                      {admin.lastLogin.toLocaleDateString()}
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
