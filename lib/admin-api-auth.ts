import { cookies } from "next/headers"
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin"
import { AdminPermission, sanitizePermissions } from "@/lib/admin-permissions"

export async function getAuthorizedAdmin(requiredPermission: AdminPermission = "view_patients") {
  const cookieStore = await cookies()
  const hasAdminSession = cookieStore.get("adminAuth")?.value === "true"
  const adminSessionCookie = cookieStore.get("adminSession")?.value
  const adminIdToken = cookieStore.get("adminIdToken")?.value

  if (!hasAdminSession || (!adminSessionCookie && !adminIdToken)) {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  let sessionAdminId = ""
  try {
    const auth = getFirebaseAdminAuth()
    if (adminSessionCookie) {
      const decodedSession = await auth.verifySessionCookie(adminSessionCookie, true)
      sessionAdminId = String(decodedSession.uid || "")
    } else if (adminIdToken) {
      const decoded = await auth.verifyIdToken(adminIdToken)
      sessionAdminId = String(decoded.uid || "")
    }
  } catch {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Invalid session" }, { status: 401 }),
    }
  }

  if (!sessionAdminId) {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Invalid session" }, { status: 401 }),
    }
  }

  const db = getFirebaseAdminDb()
  const actorDoc = await db.collection("admins").doc(sessionAdminId).get()

  if (!actorDoc.exists) {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Admin profile missing" }, { status: 403 }),
    }
  }

  const actorData = actorDoc.data() || {}
  if (actorData.status !== "active") {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Admin inactive" }, { status: 403 }),
    }
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

  return { ok: true as const, adminId: sessionAdminId, db }
}
