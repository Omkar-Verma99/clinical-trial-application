import { cookies } from 'next/headers'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import {
  AdminRole,
  getDefaultPermissionsForRole,
  sanitizePermissions,
} from '@/lib/admin-permissions'

type AdminDoc = {
  email: string
  firstName: string
  lastName: string
  role: AdminRole
  status: 'active' | 'inactive'
  permissions: string[]
  loginCount: number
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
}

async function getAuthorizedSuperAdmin() {
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

  return { ok: true as const, adminId: sessionAdminId }
}

function makeTempPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  return out
}

export async function GET() {
  const authResult = await getAuthorizedSuperAdmin()
  if (!authResult.ok) return authResult.response

  try {
    const db = getFirebaseAdminDb()
    const snapshot = await db.collection('admins').get()

    const admins = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {}
      return {
        id: docSnap.id,
        firstName: String(data.firstName || ''),
        lastName: String(data.lastName || ''),
        email: String(data.email || ''),
        role: data.role === 'super_admin' ? 'super_admin' : 'admin',
        status: data.status === 'inactive' ? 'inactive' : 'active',
        permissions: Array.isArray(data.permissions)
          ? data.permissions.map((p: unknown) => String(p))
          : getDefaultPermissionsForRole(data.role === 'super_admin' ? 'super_admin' : 'admin'),
        loginCount: Number(data.loginCount || 0),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        lastLogin: data.lastLogin?.toDate?.()?.toISOString?.() || null,
      }
    })

    return Response.json({ success: true, admins })
  } catch (error: any) {
    console.error('Admin users GET error:', error)
    return Response.json({ success: false, error: 'Failed to load admins' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await getAuthorizedSuperAdmin()
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const firstName = String(body?.firstName || '').trim()
    const lastName = String(body?.lastName || '').trim()
    const role: AdminRole = body?.role === 'super_admin' ? 'super_admin' : 'admin'
    const status: 'active' | 'inactive' = body?.status === 'inactive' ? 'inactive' : 'active'
    const customPassword = String(body?.password || '').trim()

    if (!email || !firstName || !lastName) {
      return Response.json(
        { success: false, error: 'First name, last name and email are required' },
        { status: 400 }
      )
    }

    const auth = getFirebaseAdminAuth()
    const db = getFirebaseAdminDb()

    let uid = ''
    let generatedPassword: string | null = null

    try {
      const existing = await auth.getUserByEmail(email)
      uid = existing.uid
    } catch {
      const password = customPassword || makeTempPassword()
      const created = await auth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        disabled: status === 'inactive',
      })
      uid = created.uid
      generatedPassword = customPassword ? null : password
    }

    const permissions = sanitizePermissions(role, body?.permissions)
    const now = new Date()

    const adminDoc: AdminDoc = {
      email,
      firstName,
      lastName,
      role,
      status,
      permissions,
      loginCount: 0,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
    }

    await db.collection('admins').doc(uid).set(adminDoc, { merge: true })

    const userRecord = await auth.getUser(uid)
    const existingClaims = userRecord.customClaims || {}
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      role,
    })

    if (status === 'inactive') {
      await auth.updateUser(uid, { disabled: true })
    }

    return Response.json({
      success: true,
      admin: {
        id: uid,
        email,
        firstName,
        lastName,
        role,
        status,
        permissions,
      },
      generatedPassword,
    })
  } catch (error: any) {
    console.error('Admin users POST error:', error)
    return Response.json(
      { success: false, error: error?.message || 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
