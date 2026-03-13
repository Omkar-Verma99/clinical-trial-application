'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  UserCheck,
  ClipboardCheck,
  ShieldAlert,
  Layers3,
  SlidersHorizontal,
  Download,
  FileJson,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    permission: 'view_dashboard',
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
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'view_analytics',
  },
  {
    label: 'Operations',
    href: '/admin/operations',
    icon: ClipboardCheck,
    permission: 'view_operations',
  },
  {
    label: 'Safety',
    href: '/admin/safety',
    icon: ShieldAlert,
    permission: 'view_safety',
  },
  {
    label: 'Cohorts',
    href: '/admin/cohorts',
    icon: Layers3,
    permission: 'view_cohorts',
  },
  {
    label: 'Clinical Ranges',
    href: '/admin/clinical-ranges',
    icon: SlidersHorizontal,
    permission: 'manage_system_config',
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
  const router = useRouter();
  const { adminUser, logout, hasPermission } = useAdminAuth();
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-white border-r border-border transition-all duration-300 flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-white">
        <div className="flex items-center justify-between">
          {isOpen && <span className="font-bold text-foreground text-lg">Admin</span>}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
        {/* Main Navigation */}
        <div className="space-y-1">
          {isOpen && <p className="text-xs text-muted-foreground font-semibold px-2 py-2">MAIN</p>}
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
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted'
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
          <div className="space-y-1 border-t border-border pt-4 mt-4">
            {isOpen && <p className="text-xs text-muted-foreground font-semibold px-2 py-2">ADMIN</p>}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted'
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
      <div className="border-t border-border p-4 space-y-3 bg-muted/20">
        {isOpen && (
          <div className="rounded-lg p-3 border border-border bg-background">
            <p className="text-xs text-muted-foreground">Logged in as</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {adminUser?.firstName} {adminUser?.lastName}
            </p>
            <p className="text-xs text-primary mt-1">
              {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200"
          title="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
