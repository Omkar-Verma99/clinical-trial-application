'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminUser, adminLogin, adminLogout, getAdminSession, fetchAdminUser } from '@/lib/admin-auth';

interface AdminContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = getAdminSession();
        if (session?.adminId) {
          const user = await fetchAdminUser(session.adminId);
          if (user) {
            setAdminUser(user);
            setPermissions(user.permissions);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Call API route which sets the cookie
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        // Also store in localStorage for client-side access
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminAuth', JSON.stringify({
            adminId: data.user.id,
            email: data.user.email,
            role: data.user.role,
            loginTime: new Date().toISOString(),
          }));
        }

        // Fetch full user object
        const user = await fetchAdminUser(data.user.id);
        if (user) {
          setAdminUser(user);
          setPermissions(user.permissions);
        }

        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Call API route which clears the cookie
      await fetch('/api/admin/logout', {
        method: 'POST',
      });

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminAuth');
      }

      setAdminUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const value: AdminContextType = {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
    login,
    logout,
    permissions,
    hasPermission,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
