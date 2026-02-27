/**
 * API Route for Custom Verification Email
 * Sends branded emails instead of using Firebase defaults
 */

import { NextRequest, NextResponse } from "next/server"
import { sendCustomVerificationEmail } from "@/lib/custom-email"
import { auth } from "@/lib/firebase"
import { User } from "firebase/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, verificationLink } = await request.json()

    // Validate inputs
    if (!email || !verificationLink) {
      return NextResponse.json(
        { error: "Missing email or verification link" },
        { status: 400 }
      )
    }

    // Create a user object for the email service
    const user = {
      email,
      uid: "verification"
    } as User

    // Send custom email
    await sendCustomVerificationEmail(user, verificationLink)

    return NextResponse.json(
      { message: "Verification email sent successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in verify-email API:", error)
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    )
  }
}
