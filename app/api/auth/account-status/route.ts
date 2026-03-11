import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb()
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const doctorsSnapshot = await adminDb
      .collection("doctors")
      .where("email", "==", email)
      .limit(1)
      .get()

    return NextResponse.json({
      success: true,
      exists: !doctorsSnapshot.empty,
    })
  } catch (error) {
    console.error("account-status API error", error)
    return NextResponse.json({ success: false, error: "Failed to check account status" }, { status: 500 })
  }
}
