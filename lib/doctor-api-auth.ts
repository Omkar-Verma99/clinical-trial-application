import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin"

export async function getAuthorizedDoctor(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

  if (!token) {
    return {
      ok: false as const,
      response: Response.json(
        { success: false, error: "Missing doctor authorization token. Sign in again." },
        { status: 401 }
      ),
    }
  }

  let doctorId = ""
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token)
    doctorId = String(decoded.uid || "")
  } catch {
    return {
      ok: false as const,
      response: Response.json(
        { success: false, error: "Invalid or expired session. Sign in again." },
        { status: 401 }
      ),
    }
  }

  if (!doctorId) {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Invalid session" }, { status: 401 }),
    }
  }

  const db = getFirebaseAdminDb()
  const doctorDoc = await db.collection("doctors").doc(doctorId).get()
  if (!doctorDoc.exists) {
    return {
      ok: false as const,
      response: Response.json({ success: false, error: "Doctor profile not found" }, { status: 403 }),
    }
  }

  return { ok: true as const, doctorId, db }
}
