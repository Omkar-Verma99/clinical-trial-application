import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

type AppRole = "doctor" | "admin" | "super_admin"

function getRolePriority(role: AppRole): number {
  if (role === "super_admin") return 3
  if (role === "admin") return 2
  return 1
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing authorization token" }, { status: 401 })
    }

    const adminAuth = getFirebaseAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    const adminDb = getFirebaseAdminDb()

    let resolvedRole: AppRole | null = null

    const doctorDoc = await adminDb.collection("doctors").doc(uid).get()
    if (doctorDoc.exists) {
      resolvedRole = "doctor"
    }

    const adminDocByUid = await adminDb.collection("admins").doc(uid).get()
    if (adminDocByUid.exists) {
      const adminRole = String(adminDocByUid.data()?.role || "admin") as AppRole
      if (!resolvedRole || getRolePriority(adminRole) >= getRolePriority(resolvedRole)) {
        resolvedRole = adminRole === "super_admin" ? "super_admin" : "admin"
      }
    } else {
      // Fallback for legacy admin docs not keyed by uid.
      const email = String(decoded.email || "").toLowerCase()
      if (email) {
        const adminByEmailSnap = await adminDb
          .collection("admins")
          .where("email", "==", email)
          .limit(1)
          .get()

        if (!adminByEmailSnap.empty) {
          const roleRaw = String(adminByEmailSnap.docs[0].data()?.role || "admin") as AppRole
          const adminRole = roleRaw === "super_admin" ? "super_admin" : "admin"
          if (!resolvedRole || getRolePriority(adminRole) >= getRolePriority(resolvedRole)) {
            resolvedRole = adminRole
          }
        }
      }
    }

    if (!resolvedRole) {
      return NextResponse.json(
        { success: false, error: "No linked role profile found for this account" },
        { status: 403 }
      )
    }

    if (decoded.role !== resolvedRole) {
      const userRecord = await adminAuth.getUser(uid)
      const existingCustomClaims = userRecord.customClaims || {}
      await adminAuth.setCustomUserClaims(uid, {
        ...existingCustomClaims,
        role: resolvedRole,
      })
    }

    const isSecure = new URL(request.url).protocol === "https:"
    const response = NextResponse.json({ success: true, role: resolvedRole })

    if (resolvedRole === "doctor") {
      response.cookies.set("doctorAuth", "true", {
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
        sameSite: "lax",
        secure: isSecure,
      })
      response.cookies.set("appRole", "doctor", {
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
        sameSite: "lax",
        secure: isSecure,
      })
    }

    return response
  } catch (error: any) {
    console.error("Role sync failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Role sync failed" },
      { status: 500 }
    )
  }
}
