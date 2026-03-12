import { cookies } from 'next/headers'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import { AdminPermission, AdminRole, sanitizePermissions } from '@/lib/admin-permissions'

async function getAuthorizedSuperAdmin(requiredPermission: AdminPermission = 'manage_admins') {
  const cookieStore = await cookies()
  const hasAdminSession = cookieStore.get('adminAuth')?.value === 'true'
  const adminSessionCookie = cookieStore.get('adminSession')?.value
  const adminIdToken = cookieStore.get('adminIdToken')?.value

  if (!hasAdminSession || (!adminSessionCookie && !adminIdToken)) {
    return { ok: false as const, response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  let sessionAdminId = ''
  try {
    const auth = getFirebaseAdminAuth()
    if (adminSessionCookie) {
      const decodedSession = await auth.verifySessionCookie(adminSessionCookie, true)
      sessionAdminId = String(decodedSession.uid || '')
    } else if (adminIdToken) {
      const decoded = await auth.verifyIdToken(adminIdToken)
      sessionAdminId = String(decoded.uid || '')
    }
  } catch {
    return { ok: false as const, response: Response.json({ success: false, error: 'Invalid session' }, { status: 401 }) }
  }

  if (!sessionAdminId) {
    return { ok: false as const, response: Response.json({ success: false, error: 'Invalid session' }, { status: 401 }) }
  }

  const db = getFirebaseAdminDb()
  const actorDoc = await db.collection('admins').doc(sessionAdminId).get()

  if (!actorDoc.exists) {
    return { ok: false as const, response: Response.json({ success: false, error: 'Admin profile missing' }, { status: 403 }) }
  }

  const actorData = actorDoc.data() || {}
  if (actorData.role !== 'super_admin' || actorData.status !== 'active') {
    return { ok: false as const, response: Response.json({ success: false, error: 'Super admin access required' }, { status: 403 }) }
  }

  const actorPermissions = sanitizePermissions('super_admin', actorData.permissions)
  if (!actorPermissions.includes(requiredPermission)) {
    return {
      ok: false as const,
      response: Response.json(
        { success: false, error: `Missing permission: ${requiredPermission}` },
        { status: 403 }
      ),
    }
  }

  return { ok: true as const, adminId: sessionAdminId }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  const authResult = await getAuthorizedSuperAdmin('manage_admins')
  if (!authResult.ok) return authResult.response

  try {
    const { adminId } = await params
    const body = await request.json()

    if (!adminId) {
      return Response.json({ success: false, error: 'Missing admin id' }, { status: 400 })
    }

    const role: AdminRole = body?.role === 'super_admin' ? 'super_admin' : 'admin'
    const status: 'active' | 'inactive' = body?.status === 'inactive' ? 'inactive' : 'active'
    const permissions = sanitizePermissions(role, body?.permissions)

    const db = getFirebaseAdminDb()
    const auth = getFirebaseAdminAuth()

    const targetDocRef = db.collection('admins').doc(adminId)
    const targetDoc = await targetDocRef.get()
    if (!targetDoc.exists) {
      return Response.json({ success: false, error: 'Admin not found' }, { status: 404 })
    }

    const targetData = targetDoc.data() || {}
    const targetIsActiveSuperAdmin = targetData.role === 'super_admin' && targetData.status === 'active'
    const nextIsActiveSuperAdmin = role === 'super_admin' && status === 'active'

    if (targetIsActiveSuperAdmin && !nextIsActiveSuperAdmin) {
      const activeSuperAdminSnap = await db
        .collection('admins')
        .where('role', '==', 'super_admin')
        .where('status', '==', 'active')
        .get()

      if (activeSuperAdminSnap.size <= 1) {
        return Response.json(
          { success: false, error: 'Cannot remove the last active super admin' },
          { status: 400 }
        )
      }
    }

    await targetDocRef.set(
      {
        role,
        status,
        permissions,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    const userRecord = await auth.getUser(adminId)
    const existingClaims = userRecord.customClaims || {}
    await auth.setCustomUserClaims(adminId, {
      ...existingClaims,
      role,
    })
    await auth.updateUser(adminId, { disabled: status === 'inactive' })

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Admin users PATCH error:', error)
    return Response.json(
      { success: false, error: error?.message || 'Failed to update admin user' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  const authResult = await getAuthorizedSuperAdmin('manage_admins')
  if (!authResult.ok) return authResult.response

  try {
    const { adminId } = await params

    if (!adminId) {
      return Response.json({ success: false, error: 'Missing admin id' }, { status: 400 })
    }

    if (adminId === authResult.adminId) {
      return Response.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    const auth = getFirebaseAdminAuth()

    const targetDoc = await db.collection('admins').doc(adminId).get()
    const targetData = targetDoc.data() || {}
    const targetIsActiveSuperAdmin = targetData.role === 'super_admin' && targetData.status === 'active'

    if (targetIsActiveSuperAdmin) {
      const activeSuperAdminSnap = await db
        .collection('admins')
        .where('role', '==', 'super_admin')
        .where('status', '==', 'active')
        .get()

      if (activeSuperAdminSnap.size <= 1) {
        return Response.json(
          { success: false, error: 'Cannot delete the last active super admin' },
          { status: 400 }
        )
      }
    }

    await db.collection('admins').doc(adminId).delete()

    try {
      await auth.deleteUser(adminId)
    } catch (authDeleteError) {
      console.error('Failed to delete auth user for admin:', authDeleteError)
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Admin users DELETE error:', error)
    return Response.json(
      { success: false, error: error?.message || 'Failed to delete admin user' },
      { status: 500 }
    )
  }
}
