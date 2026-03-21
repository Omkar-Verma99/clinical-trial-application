'use client';

import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Shield, Mail, Calendar, Activity, Key, Lock } from 'lucide-react';
import { ChangePasswordForm } from './change-password-form';

const PERMISSION_DISPLAY: Record<string, { label: string; group: string; color: string }> = {
  view_dashboard:   { label: 'View Dashboard', group: 'Core Access', color: 'blue' },
  view_analytics:   { label: 'View Analytics', group: 'Core Access', color: 'blue' },
  view_doctors:     { label: 'View Doctors', group: 'Core Access', color: 'blue' },
  view_patients:    { label: 'View Patients', group: 'Patient Data', color: 'violet' },
  edit_patient_records: { label: 'Edit Patient Records', group: 'Patient Data', color: 'violet' },
  manage_section_locks: { label: 'Manage Section Locks', group: 'Patient Data', color: 'violet' },
  bulk_lock_sections:   { label: 'Bulk Lock Sections', group: 'Patient Data', color: 'violet' },
  delete_patient_records: { label: 'Delete Patient Records', group: 'Patient Data', color: 'violet' },
  export_data:      { label: 'Export Data', group: 'Exports', color: 'emerald' },
  schedule_exports: { label: 'Schedule Exports', group: 'Exports', color: 'emerald' },
  view_operations:  { label: 'View Operations', group: 'Operations', color: 'orange' },
  view_safety:      { label: 'View Safety Center', group: 'Safety', color: 'red' },
  view_cohorts:     { label: 'View Cohort Analytics', group: 'Cohorts', color: 'teal' },
  view_audit_logs:  { label: 'View Audit Logs', group: 'Governance', color: 'gray' },
  manage_system_config: { label: 'Manage System Config', group: 'Governance', color: 'gray' },
  manage_admins:    { label: 'Manage Admin Users', group: 'Governance', color: 'gray' },
};

const COLOR_CLASSES: Record<string, string> = {
  blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  emerald:'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  teal:   'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  gray:   'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
};

export default function AdminProfilePage() {
  const { adminUser, permissions } = useAdminAuth();

  if (!adminUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400">No admin profile loaded.</p>
      </div>
    );
  }

  const groupedPermissions: Record<string, string[]> = {};
  permissions.forEach((permission) => {
    const info = PERMISSION_DISPLAY[permission];
    const group = info?.group || 'Other';
    if (!groupedPermissions[group]) groupedPermissions[group] = [];
    groupedPermissions[group].push(permission);
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
          My Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Account details and assigned access permissions</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        {/* Profile Banner */}
        <div className={`h-32 bg-gradient-to-r ${adminUser.role === 'super_admin' ? 'from-violet-600 via-purple-600 to-indigo-600' : 'from-blue-600 via-blue-500 to-indigo-600'}`}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        </div>

        {/* Avatar & Identity */}
        <div className="px-8 pb-8">
          <div className="flex items-end gap-6 -mt-12 mb-6">
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white dark:border-gray-800 ${adminUser.role === 'super_admin' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
              {adminUser.firstName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="pb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {adminUser.firstName} {adminUser.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                  adminUser.role === 'super_admin' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  <Key className="w-3 h-3" />
                  {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                  adminUser.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${adminUser.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {adminUser.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Email</p>
                <p className="text-gray-900 dark:text-white font-medium text-sm mt-0.5">{adminUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-lg">
                <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Last Login</p>
                <p className="text-gray-900 dark:text-white font-medium text-sm mt-0.5">
                  {adminUser.lastLogin ? new Date(adminUser.lastLogin).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Access Permissions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{permissions.length} permission(s) assigned to your account</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No permissions assigned to your account.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group}>
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{group}</h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((permission) => {
                      const info = PERMISSION_DISPLAY[permission];
                      const color = info?.color || 'gray';
                      const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.gray;
                      return (
                        <span key={permission} className={`px-3 py-1.5 text-xs font-medium rounded-full border ${colorClass}`}>
                          {info?.label || permission}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
            <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Permissions</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{permissions.length}</p>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <ChangePasswordForm />
    </div>
  );
}
