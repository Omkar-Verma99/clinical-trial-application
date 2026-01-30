'use client';

import { useAdminAuth } from '@/contexts/admin-auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import AdminHeader from '@/app/admin/components/AdminHeader';
import AdminSidebar from '@/app/admin/components/AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-spin"></div>
              <div className="absolute inset-1 bg-slate-950 rounded-full"></div>
            </div>
          </div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
