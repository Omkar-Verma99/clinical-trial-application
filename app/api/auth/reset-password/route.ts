import { NextRequest } from "next/server"
import { getFirebaseAdminAuth } from "@/lib/firebase-admin"
import { firebaseConfig } from "@/lib/firebase-config"

type RateEntry = {
  count: number
  resetAt: number
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 5
const rateLimitStore = new Map<string, RateEntry>()

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  return req.headers.get("x-real-ip") || "unknown"
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  if (existing.count >= MAX_REQUESTS) {
    return true
  }

  existing.count += 1
  rateLimitStore.set(key, existing)
  return false
}

async function verifyRecaptcha(token: string, ip: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    return false
  }

  const params = new URLSearchParams()
  params.set("secret", secret)
  params.set("response", token)
  if (ip && ip !== "unknown") {
    params.set("remoteip", ip)
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  return !!data.success
}

async function sendFirebaseResetEmail(email: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey
  if (!apiKey) {
    throw new Error("Firebase API key is missing")
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestType: "PASSWORD_RESET",
      email,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || "Failed to send reset email")
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = body?.email?.trim()?.toLowerCase()
    const captchaToken = body?.captchaToken

    if (!email) {
      return Response.json(
        { code: "app/invalid-email", message: "Email is required" },
        { status: 400 }
      )
    }

    if (!captchaToken) {
      return Response.json(
        { code: "app/captcha-required", message: "Please complete CAPTCHA verification." },
        { status: 400 }
      )
    }

    const ip = getClientIp(req)
    const rateKey = `${ip}:${email}`
    if (isRateLimited(rateKey)) {
      return Response.json(
        { code: "app/rate-limit", message: "Too many reset attempts. Please try again later." },
        { status: 429 }
      )
    }

    const captchaValid = await verifyRecaptcha(captchaToken, ip)
    if (!captchaValid) {
      return Response.json(
        { code: "app/captcha-invalid", message: "CAPTCHA validation failed. Please try again." },
        { status: 400 }
      )
    }

    try {
      await getFirebaseAdminAuth().getUserByEmail(email)
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        return Response.json(
          {
            code: "app/account-not-created",
            message: "Your ID has not been created yet. Please sign up first to create your account.",
          },
          { status: 404 }
        )
      }

      return Response.json(
        { code: "app/auth-check-failed", message: "Unable to verify account. Please try again." },
        { status: 500 }
      )
    }

    await sendFirebaseResetEmail(email)

    return Response.json({ success: true })
  } catch {
    return Response.json(
      { code: "app/reset-failed", message: "Failed to process password reset request. Please try again." },
      { status: 500 }
    )
  }
}
