import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb()
    const body = await request.json()
    const rawCode = typeof body?.studySiteCode === "string" ? body.studySiteCode : ""
    const studySiteCode = rawCode.trim().toUpperCase()

    if (!studySiteCode) {
      return NextResponse.json({ success: false, error: "Study site code is required" }, { status: 400 })
    }

    const formatRegex = /^[A-Z]{3}-\d{2}$/
    if (!formatRegex.test(studySiteCode)) {
      return NextResponse.json({ success: false, error: "Invalid study site code format" }, { status: 400 })
    }

    const lockDoc = await adminDb.collection("studySiteCodes").doc(studySiteCode).get()
    if (lockDoc.exists) {
      return NextResponse.json({ success: true, available: false })
    }

    // Backward compatibility: for older records that may not yet have a lock document.
    const doctorsSnapshot = await adminDb
      .collection("doctors")
      .where("studySiteCode", "==", studySiteCode)
      .limit(1)
      .get()

    return NextResponse.json({
      success: true,
      available: doctorsSnapshot.empty,
    })
  } catch (error) {
    console.error("study-site-code-status API error", error)
    return NextResponse.json({ success: false, error: "Failed to check study site code" }, { status: 500 })
  }
}
