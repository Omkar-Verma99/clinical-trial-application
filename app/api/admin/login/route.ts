/// <reference path="../../../../types/bcryptjs.d.ts" />
import { cookies } from 'next/headers';
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getDefaultPermissionsForRole, sanitizePermissions } from '@/lib/admin-permissions';

const adminDb = getFirebaseAdminDb();

async function verifyFirebaseCredentials(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error('MISSING_FIREBASE_API_KEY')
  }
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = data?.error?.message || 'INVALID_LOGIN_CREDENTIALS'
    throw new Error(code)
  }

  return data
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // First authenticate credentials against Firebase Authentication
    const normalizedEmail = email.toLowerCase()
    let firebaseAuthData: any = null
    try {
      firebaseAuthData = await verifyFirebaseCredentials(normalizedEmail, password)
    } catch (error: any) {
      const code = error?.message || ''
      if (code === 'EMAIL_NOT_FOUND') {
        return Response.json(
          { success: false, error: 'Admin account not found' },
          { status: 401 }
        )
      }

      if (code === 'INVALID_PASSWORD' || code === 'INVALID_LOGIN_CREDENTIALS') {
        return Response.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      return Response.json(
        { success: false, error: 'Authentication failed. Please try again.' },
        { status: 401 }
      )
    }

    let adminDocId = ''
    let adminData: any = null

    try {
      // Primary path: resolve admin profile from Firestore.
      const querySnapshot = await adminDb
        .collection('admins')
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get()

      if (querySnapshot.empty) {
        return Response.json(
          { success: false, error: 'Admin account not found' },
          { status: 401 }
        )
      }

      const adminDoc = querySnapshot.docs[0]
      adminDocId = adminDoc.id
      adminData = adminDoc.data()

      if (adminData.status !== 'active') {
        return Response.json(
          { success: false, error: 'Admin account is inactive' },
          { status: 403 }
        )
      }

      const lastLoginTimestamp = new Date()
      await adminDb.collection('admins').doc(adminDoc.id).set(
        {
          lastLogin: lastLoginTimestamp,
          loginCount: Number(adminData.loginCount || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    } catch (firestoreError: any) {
      const code = String(firestoreError?.code || '')
      const message = String(firestoreError?.message || '')
      const isPermissionDenied = code.includes('permission-denied') || message.includes('Missing or insufficient permissions')

      if (!isPermissionDenied) {
        throw firestoreError
      }

      // Fallback path: allow login based on verified Auth custom role claims.
      const uid = String(firebaseAuthData?.localId || '')
      if (!uid) {
        return Response.json(
          { success: false, error: 'Admin account not found' },
          { status: 401 }
        )
      }

      const adminAuth = getFirebaseAdminAuth()
      const userRecord = await adminAuth.getUser(uid)
      const roleClaim = String(userRecord.customClaims?.role || '')
      const resolvedRole = roleClaim === 'super_admin' ? 'super_admin' : roleClaim === 'admin' ? 'admin' : ''

      if (!resolvedRole) {
        return Response.json(
          { success: false, error: 'Admin account not found' },
          { status: 401 }
        )
      }

      const nameParts = String(userRecord.displayName || '').trim().split(/\s+/).filter(Boolean)
      adminDocId = uid
      adminData = {
        email: String(userRecord.email || normalizedEmail),
        firstName: nameParts[0] || 'Admin',
        lastName: nameParts.slice(1).join(' ') || 'User',
        role: resolvedRole,
        status: 'active',
        permissions: getDefaultPermissionsForRole(resolvedRole),
      }
    }

    // Set secure cookies
    const cookieStore = await cookies();
    cookieStore.set('adminAuth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    cookieStore.set('adminAuthData', JSON.stringify({
      adminId: adminDocId,
      email: adminData.email,
      role: adminData.role,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    try {
      const adminAuth = getFirebaseAdminAuth()
      const idToken = String(firebaseAuthData.idToken || '')
      if (!idToken) {
        throw new Error('MISSING_ID_TOKEN')
      }
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: 7 * 24 * 60 * 60 * 1000,
      })
      cookieStore.set('adminSession', sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    } catch (sessionError) {
      console.error('Admin session cookie creation failed:', sessionError)
    }

    if (firebaseAuthData?.idToken) {
      cookieStore.set('adminIdToken', String(firebaseAuthData.idToken), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60,
        path: '/',
      });
    }

    const resolvedRole = adminData.role === 'super_admin' ? 'super_admin' : 'admin'
    cookieStore.set('appRole', resolvedRole, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Non-blocking claim sync for role-based auth token checks.
    try {
      const uid = String(firebaseAuthData?.localId || '')
      if (uid) {
        const adminAuth = getFirebaseAdminAuth()
        const userRecord = await adminAuth.getUser(uid)
        const existingClaims = userRecord.customClaims || {}
        const role = resolvedRole
        await adminAuth.setCustomUserClaims(uid, {
          ...existingClaims,
          role,
        })
      }
    } catch (claimError) {
      console.error('Admin claim sync failed:', claimError)
    }

    const permissions = Array.isArray(adminData.permissions)
      ? sanitizePermissions(resolvedRole, adminData.permissions)
      : getDefaultPermissionsForRole(resolvedRole)

    return Response.json({
      success: true,
      user: {
        id: adminDocId,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: resolvedRole,
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Admin login API error:', error);
    return Response.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
