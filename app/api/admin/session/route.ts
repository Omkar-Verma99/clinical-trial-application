import { cookies } from 'next/headers'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import { getDefaultPermissionsForRole, sanitizePermissions } from '@/lib/admin-permissions'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const hasAdminSession = cookieStore.get('adminAuth')?.value === 'true'
    const adminSessionCookie = cookieStore.get('adminSession')?.value
    const adminIdToken = cookieStore.get('adminIdToken')?.value

    if (!hasAdminSession || (!adminSessionCookie && !adminIdToken)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const auth = getFirebaseAdminAuth()
    let uid = ''

    if (adminSessionCookie) {
      const decodedSession = await auth.verifySessionCookie(adminSessionCookie, true)
      uid = String(decodedSession.uid || '')
    } else if (adminIdToken) {
      const decoded = await auth.verifyIdToken(adminIdToken)
      uid = String(decoded.uid || '')
    }

    if (!uid) {
      return Response.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()
    const adminDoc = await db.collection('admins').doc(uid).get()
    if (!adminDoc.exists) {
      return Response.json({ success: false, error: 'Admin profile missing' }, { status: 403 })
    }

    const adminData = adminDoc.data() || {}
    const role = adminData.role === 'super_admin' ? 'super_admin' : 'admin'
    if (adminData.status !== 'active') {
      return Response.json({ success: false, error: 'Admin inactive' }, { status: 403 })
    }

    const customToken = await auth.createCustomToken(uid, { role })
    const permissions = Array.isArray(adminData.permissions)
      ? sanitizePermissions(role, adminData.permissions)
      : getDefaultPermissionsForRole(role)

    return Response.json({
      success: true,
      customToken,
      user: {
        id: uid,
        email: String(adminData.email || ''),
        firstName: String(adminData.firstName || 'Admin'),
        lastName: String(adminData.lastName || 'User'),
        role,
        status: 'active',
        permissions,
        loginCount: Number(adminData.loginCount || 0),
        lastLogin: adminData.lastLogin?.toDate?.()?.toISOString?.() || null,
        createdAt: adminData.createdAt?.toDate?.()?.toISOString?.() || null,
      },
    })
  } catch (error) {
    console.error('Admin session bootstrap error:', error)
    return Response.json({ success: false, error: 'Session bootstrap failed' }, { status: 500 })
  }
}
