/// <reference path="../types/bcryptjs.d.ts" />
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'inactive';
  createdAt: Date;
  lastLogin: Date;
  loginCount: number;
  permissions: string[];
}

interface AdminSession {
  adminId: string;
  email: string;
  role: 'admin' | 'super_admin';
  loginTime: string;
}

interface AdminAuthResponse {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

let db: any;

const getDb = () => {
  if (!db) {
    db = getFirestore();
  }
  return db;
};

/**
 * Admin Login - Authenticate admin with email and password
 * Checks admins/ collection in Firestore
 */
export const adminLogin = async (email: string, password: string): Promise<AdminAuthResponse> => {
  try {
    // Check if admin exists in Firestore
    const adminsRef = collection(getDb(), 'admins');
    const q = query(adminsRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'Admin account not found. Please contact your administrator.',
      };
    }

    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    // Verify password
    const passwordMatch = await bcrypt.compare(password, adminData.passwordHash);
    if (!passwordMatch) {
      return {
        success: false,
        error: 'Invalid credentials. Please try again.',
      };
    }

    // Check if admin is active
    if (adminData.status !== 'active') {
      return {
        success: false,
        error: 'This admin account is inactive. Please contact your administrator.',
      };
    }

    // Update last login
    const lastLoginTimestamp = new Date();
    await setDoc(
      doc(getDb(), 'admins', adminDoc.id),
      {
        lastLogin: lastLoginTimestamp,
        loginCount: (adminData.loginCount || 0) + 1,
      },
      { merge: true }
    );

    // Log admin action
    await logAdminAction(adminDoc.id, 'admin_login', 'system', {
      timestamp: lastLoginTimestamp.toISOString(),
    });

    const adminUser: AdminUser = {
      id: adminDoc.id,
      email: adminData.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: adminData.role,
      status: adminData.status,
      createdAt: adminData.createdAt?.toDate() || new Date(),
      lastLogin: lastLoginTimestamp,
      loginCount: (adminData.loginCount || 0) + 1,
      permissions: getAdminPermissions(adminData.role),
    };

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminAuth', JSON.stringify({
        adminId: adminDoc.id,
        email: adminData.email,
        role: adminData.role,
        loginTime: new Date().toISOString(),
      }));
    }

    return {
      success: true,
      user: adminUser,
    };
  } catch (error: any) {
    console.error('Admin login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed. Please try again.',
    };
  }
};

/**
 * Admin Logout
 */
export const adminLogout = async (): Promise<AdminAuthResponse> => {
  try {
    if (typeof window !== 'undefined') {
      const adminAuthData = localStorage.getItem('adminAuth');
      if (adminAuthData) {
        const { adminId } = JSON.parse(adminAuthData);
        await logAdminAction(adminId, 'admin_logout', 'system', {
          timestamp: new Date().toISOString(),
        });
      }

      localStorage.removeItem('adminAuth');
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Logout failed.',
    };
  }
};

/**
 * Get current admin session
 */
export const getAdminSession = (): AdminSession | null => {
  if (typeof window === 'undefined') return null;

  const adminAuth = localStorage.getItem('adminAuth');
  if (!adminAuth) return null;

  try {
    return JSON.parse(adminAuth);
  } catch {
    return null;
  }
};

/**
 * Fetch admin user details from Firestore
 */
export const fetchAdminUser = async (adminId: string): Promise<AdminUser | null> => {
  try {
    const adminDoc = await getDoc(doc(getDb(), 'admins', adminId));

    if (!adminDoc.exists()) {
      return null;
    }

    const adminData = adminDoc.data();
    return {
      id: adminDoc.id,
      email: adminData.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: adminData.role,
      status: adminData.status,
      createdAt: adminData.createdAt?.toDate() || new Date(),
      lastLogin: adminData.lastLogin?.toDate() || new Date(),
      loginCount: adminData.loginCount || 0,
      permissions: getAdminPermissions(adminData.role),
    };
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
};

/**
 * Get admin permissions based on role
 */
export const getAdminPermissions = (role: 'admin' | 'super_admin'): string[] => {
  const basePermissions = [
    'view_doctors',
    'view_patients',
    'view_forms',
    'export_data',
    'view_analytics',
  ];

  const superAdminPermissions = [
    ...basePermissions,
    'manage_admins',
    'view_audit_logs',
    'change_settings',
    'delete_data',
    'manage_roles',
  ];

  return role === 'super_admin' ? superAdminPermissions : basePermissions;
};

/**
 * Check if admin has specific permission
 */
export const hasPermission = (permissions: string[], requiredPermission: string): boolean => {
  return permissions.includes(requiredPermission);
};

/**
 * Log admin action for audit trail
 */
export const logAdminAction = async (
  adminId: string,
  action: string,
  resourceType: string,
  details: Record<string, any>
): Promise<boolean> => {
  try {
    const auditLogsRef = collection(getDb(), 'auditLogs');
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await setDoc(doc(auditLogsRef, logId), {
      adminId,
      action,
      resourceType,
      details,
      timestamp: new Date(),
      ipAddress: typeof window !== 'undefined' ? await getClientIp() : 'unknown',
    });

    return true;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return false;
  }
};

/**
 * Fetch audit logs (Super Admin only)
 */
export const fetchAuditLogs = async (
  adminId: string,
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> => {
  try {
    // Verify admin is super_admin
    const adminDoc = await getDoc(doc(getDb(), 'admins', adminId));
    if (!adminDoc.exists() || adminDoc.data().role !== 'super_admin') {
      throw new Error('Only super admins can view audit logs');
    }

    let constraints = [];
    if (startDate && endDate) {
      constraints.push(where('timestamp', '>=', startDate));
      constraints.push(where('timestamp', '<=', endDate));
    }

    const q = query(
      collection(getDb(), 'auditLogs'),
      ...constraints,
    );

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

/**
 * Get client IP address
 */
const getClientIp = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

/**
 * Hash password for storing
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Verify admin password
 */
export const verifyAdminPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export type { AdminUser, AdminAuthResponse, AdminSession };
