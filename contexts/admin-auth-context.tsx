'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminUser } from '@/lib/admin-auth';
import { getDefaultPermissionsForRole } from '@/lib/admin-permissions';
import { auth } from '@/lib/firebase';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';

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

function buildAdminUserFromSession(raw: any): AdminUser | null {
  if (!raw || !raw.adminId || !raw.email || !raw.role) return null;

  const role = raw.role === 'super_admin' ? 'super_admin' : 'admin';
  const permissions = Array.isArray(raw.permissions)
    ? raw.permissions.map((p: unknown) => String(p))
    : getDefaultPermissionsForRole(role);

  return {
    id: String(raw.adminId),
    email: String(raw.email),
    firstName: String(raw.firstName || 'Admin'),
    lastName: String(raw.lastName || 'User'),
    role,
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    lastLogin: raw.lastLogin ? new Date(raw.lastLogin) : new Date(),
    loginCount: Number(raw.loginCount || 0),
    permissions,
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (typeof window !== 'undefined') {
          const sessionRaw = localStorage.getItem('adminAuth');
          const session = sessionRaw ? JSON.parse(sessionRaw) : null;

          // Restore Firebase client auth from secure server session when available.
          const bootstrapResponse = await fetch('/api/admin/session', { method: 'GET' });
          if (bootstrapResponse.ok) {
            const bootstrapData = await bootstrapResponse.json();
            if (bootstrapData?.success && bootstrapData?.customToken && auth) {
              await setPersistence(auth, browserLocalPersistence);
              await signInWithCustomToken(auth, String(bootstrapData.customToken));
            }

            if (bootstrapData?.success && bootstrapData?.user) {
              const serverUser = buildAdminUserFromSession({
                adminId: bootstrapData.user.id,
                email: bootstrapData.user.email,
                role: bootstrapData.user.role,
                firstName: bootstrapData.user.firstName,
                lastName: bootstrapData.user.lastName,
                status: bootstrapData.user.status,
                permissions: bootstrapData.user.permissions,
                loginCount: bootstrapData.user.loginCount,
                lastLogin: bootstrapData.user.lastLogin,
                createdAt: bootstrapData.user.createdAt,
              });

              if (serverUser) {
                localStorage.setItem('adminAuth', JSON.stringify({
                  adminId: serverUser.id,
                  email: serverUser.email,
                  role: serverUser.role,
                  firstName: serverUser.firstName,
                  lastName: serverUser.lastName,
                  status: serverUser.status,
                  permissions: serverUser.permissions,
                  loginCount: serverUser.loginCount,
                  lastLogin: serverUser.lastLogin.toISOString(),
                  createdAt: serverUser.createdAt.toISOString(),
                  loginTime: new Date().toISOString(),
                }));

                setAdminUser(serverUser);
                setPermissions(serverUser.permissions);
                return;
              }
            }
          }

          const user = buildAdminUserFromSession(session);
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
        const role = data.user.role === 'super_admin' ? 'super_admin' : 'admin';
        const resolvedPermissions = Array.isArray(data.user.permissions)
          ? data.user.permissions.map((p: unknown) => String(p))
          : getDefaultPermissionsForRole(role);

        const user: AdminUser = {
          id: String(data.user.id),
          email: String(data.user.email),
          firstName: String(data.user.firstName || 'Admin'),
          lastName: String(data.user.lastName || 'User'),
          role,
          status: 'active',
          createdAt: new Date(),
          lastLogin: new Date(),
          loginCount: Number(data.user.loginCount || 0),
          permissions: resolvedPermissions,
        };

        // Keep Firebase client auth in sync so admin Firestore reads are authorized by rules.
        if (auth) {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithEmailAndPassword(auth, email, password);
        }

        // Also store in localStorage for client-side access
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminAuth', JSON.stringify({
            adminId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            permissions: user.permissions,
            loginCount: user.loginCount,
            lastLogin: user.lastLogin.toISOString(),
            loginTime: new Date().toISOString(),
          }));
        }

        setAdminUser(user);
        setPermissions(user.permissions);

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

      if (auth) {
        await signOut(auth);
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
