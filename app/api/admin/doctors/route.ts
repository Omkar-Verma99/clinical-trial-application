import { cookies } from 'next/headers'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import { AdminPermission, sanitizePermissions } from '@/lib/admin-permissions'

async function getAuthorizedAdmin(requiredPermission: AdminPermission = 'view_doctors') {
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
  if (actorData.status !== 'active') {
    return { ok: false as const, response: Response.json({ success: false, error: 'Admin inactive' }, { status: 403 }) }
  }

  const actorPermissions = sanitizePermissions(actorData.role, actorData.permissions)
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

export async function POST(request: Request) {
  const authResult = await getAuthorizedAdmin('view_doctors')
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const doctorsData = body?.doctors

    if (!Array.isArray(doctorsData) || doctorsData.length === 0) {
      return Response.json(
        { success: false, error: 'A valid array of doctors is required' },
        { status: 400 }
      )
    }

    const auth = getFirebaseAdminAuth()
    const db = getFirebaseAdminDb()
    const results = []

    const studySiteCodeRegex = /^[A-Z]{3}-\d{2}$/

    for (const docData of doctorsData) {
      const { 
        email, 
        password, 
        name, 
        registrationNumber, 
        qualification, 
        phone, 
        dateOfBirth, 
        address, 
        studySiteCode 
      } = docData

      const normalizedEmail = String(email || '').trim().toLowerCase()

      if (!normalizedEmail || !password || !name || !registrationNumber || !studySiteCode) {
        results.push({ email: normalizedEmail, success: false, error: 'Missing required fields' })
        continue
      }

      if (!studySiteCodeRegex.test(studySiteCode)) {
        results.push({ email: normalizedEmail, success: false, error: 'Invalid Site Code Format. Must be 3 uppercase letters + hyphen + 2 digits (e.g., RWE-01)' })
        continue
      }

      if (password.length < 6) {
        results.push({ email: normalizedEmail, success: false, error: 'Password must be at least 6 characters long' })
        continue
      }

      let uid = ''
      try {
        const createdUser = await auth.createUser({
          email: normalizedEmail,
          password: password,
          displayName: name,
        })
        uid = createdUser.uid
      } catch (error: any) {
        const errorCode = error?.code || ''
        if (errorCode === 'auth/email-already-exists') {
          results.push({ email: normalizedEmail, success: false, error: 'Email already exists' })
        } else if (errorCode === 'auth/invalid-email') {
          results.push({ email: normalizedEmail, success: false, error: 'Invalid email format' })
        } else {
          results.push({ email: normalizedEmail, success: false, error: error?.message || 'Failed to create auth user' })
        }
        continue
      }

      try {
        const doctorDoc = {
          name,
          registrationNumber,
          qualification,
          email: normalizedEmail,
          phone: phone || '',
          dateOfBirth: dateOfBirth || '',
          address: address || '',
          studySiteCode,
          createdAt: new Date().toISOString(),
          status: 'active'
        }

        await db.collection('doctors').doc(uid).set(doctorDoc)

        const existingClaims = (await auth.getUser(uid)).customClaims || {}
        await auth.setCustomUserClaims(uid, {
          ...existingClaims,
          role: 'doctor',
        })

        results.push({ email: normalizedEmail, success: true, id: uid })
      } catch (error: any) {
        // Rollback on fail
        try { await auth.deleteUser(uid) } catch {}
        results.push({ email: normalizedEmail, success: false, error: 'Failed to save doctor profile' })
      }
    }

    const allSuccessful = results.every(r => r.success)
    const someSuccessful = results.some(r => r.success)

    return Response.json({
      success: allSuccessful,
      partialSuccess: !allSuccessful && someSuccessful,
      results
    })

  } catch (error: any) {
    console.error('Admin doctors POST error:', error)
    return Response.json(
      { success: false, error: error?.message || 'Server error configuring doctors' },
      { status: 500 }
    )
  }
}
