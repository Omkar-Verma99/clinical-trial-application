'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Download,
  FileJson,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    permission: 'view_analytics',
  },
  {
    label: 'Doctors',
    href: '/admin/doctors',
    icon: Users,
    permission: 'view_doctors',
  },
  {
    label: 'Patients',
    href: '/admin/patients',
    icon: UserCheck,
    permission: 'view_patients',
  },
  {
    label: 'Form Responses',
    href: '/admin/forms',
    icon: FileText,
    permission: 'view_forms',
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'view_analytics',
  },
  {
    label: 'Exports',
    href: '/admin/exports',
    icon: Download,
    permission: 'export_data',
  },
];

const adminItems = [
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileJson,
    permission: 'view_audit_logs',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: 'change_settings',
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { adminUser, logout, hasPermission } = useAdminAuth();
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-slate-800/50 border-r border-slate-700/50 backdrop-blur-sm transition-all duration-300 flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {isOpen && <span className="font-bold text-white text-lg">Admin</span>}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {isOpen && <p className="text-xs text-slate-500 font-semibold px-2 py-2">MAIN</p>}
          {navigationItems.map((item) => {
            if (!hasPermission(item.permission)) return null;

            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600/50 to-purple-600/50 text-white border border-blue-500/50'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
                title={isOpen ? undefined : item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Admin Items (Super Admin Only) */}
        {adminUser?.role === 'super_admin' && (
          <div className="space-y-1 border-t border-slate-700/50 pt-4 mt-4">
            {isOpen && <p className="text-xs text-slate-500 font-semibold px-2 py-2">ADMIN</p>}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600/50 to-purple-600/50 text-white border border-blue-500/50'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                  title={isOpen ? undefined : item.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer - User Info & Logout */}
      <div className="border-t border-slate-700/50 p-4 space-y-3">
        {isOpen && (
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-semibold text-white truncate">
              {adminUser?.firstName} {adminUser?.lastName}
            </p>
            <p className="text-xs text-blue-400 mt-1">
              {adminUser?.role === 'super_admin' ? '🔑 Super Admin' : '👤 Admin'}
            </p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
          title="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
