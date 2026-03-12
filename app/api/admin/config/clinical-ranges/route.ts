import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import { sanitizePermissions } from '@/lib/admin-permissions'
import {
  DEFAULT_CLINICAL_VALIDATION_RANGES,
  normalizeClinicalValidationRanges,
} from '@/lib/clinical-ranges'

async function getAuthorizedAdminWithConfigPermission() {
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
  const role = actorData.role === 'super_admin' ? 'super_admin' : 'admin'
  if (actorData.status !== 'active') {
    return { ok: false as const, response: Response.json({ success: false, error: 'Admin inactive' }, { status: 403 }) }
  }

  const permissions = sanitizePermissions(role, actorData.permissions)
  if (!permissions.includes('manage_system_config')) {
    return {
      ok: false as const,
      response: Response.json(
        { success: false, error: 'Missing permission: manage_system_config' },
        { status: 403 }
      ),
    }
  }

  return { ok: true as const, adminId: sessionAdminId, role }
}

export async function GET() {
  const authResult = await getAuthorizedAdminWithConfigPermission()
  if (!authResult.ok) return authResult.response

  try {
    const db = getFirebaseAdminDb()
    const configDoc = await db.collection('adminPanel').doc('clinicalValidationRanges').get()
    const data = configDoc.exists ? configDoc.data() || {} : {}

    const ranges = normalizeClinicalValidationRanges(data.ranges)
    const updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() || null

    return Response.json({ success: true, ranges: ranges || DEFAULT_CLINICAL_VALIDATION_RANGES, updatedAt })
  } catch (error) {
    console.error('Admin clinical ranges GET error:', error)
    return Response.json({ success: false, error: 'Failed to load clinical ranges' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authResult = await getAuthorizedAdminWithConfigPermission()
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const ranges = normalizeClinicalValidationRanges(body?.ranges)

    const db = getFirebaseAdminDb()
    await db.collection('adminPanel').doc('clinicalValidationRanges').set(
      {
        ranges,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: authResult.adminId,
      },
      { merge: true }
    )

    return Response.json({ success: true, ranges })
  } catch (error: any) {
    console.error('Admin clinical ranges PUT error:', error)
    return Response.json(
      { success: false, error: error?.message || 'Failed to update clinical ranges' },
      { status: 500 }
    )
  }
}
