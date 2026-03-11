import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb()
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const uid = typeof body?.uid === "string" ? body.uid.trim() : ""

    if (!email && !uid) {
      return NextResponse.json({ success: false, error: "Email or UID is required" }, { status: 400 })
    }

    let exists = false;

    // Check by UID if provided
    if (uid) {
      const docSnap = await adminDb.collection("doctors").doc(uid).get();
      exists = docSnap.exists;
    }

    // If not found by UID, check by normalized email
    if (!exists && email) {
      const doctorsSnapshot = await adminDb
        .collection("doctors")
        .where("email", "==", email)
        .limit(1)
        .get();
      exists = !doctorsSnapshot.empty;
    }

    return NextResponse.json({
      success: true,
      exists,
    })
  } catch (error) {
    console.error("account-status API error", error)
    return NextResponse.json({ success: false, error: "Failed to check account status" }, { status: 500 })
  }
}
