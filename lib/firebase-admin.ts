import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

let initialized = false

function parseServiceAccountFromEnv(raw: string) {
  // Accept plain JSON as well as base64-encoded JSON secrets.
  try {
    return JSON.parse(raw)
  } catch {
    const decoded = Buffer.from(raw, "base64").toString("utf8")
    return JSON.parse(decoded)
  }
}

function initAdminApp() {
  if (initialized || getApps().length > 0) {
    initialized = true
    return
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountRaw) {
    try {
      const serviceAccount = parseServiceAccountFromEnv(serviceAccountRaw)
      initializeApp({
        credential: cert(serviceAccount),
      })
      initialized = true
      return
    } catch (error) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_KEY is present but invalid JSON/base64 JSON: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Cloud runtime path (App Hosting/Cloud Run/GCP).
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.FUNCTION_TARGET) {
    initializeApp({
      credential: applicationDefault(),
    })
    initialized = true
    return
  }

  throw new Error(
    "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON or base64 JSON), or run in a GCP runtime with application default credentials."
  )

}

export function getFirebaseAdminAuth() {
  initAdminApp()
  return getAuth()
}

export function getFirebaseAdminDb() {
  initAdminApp()
  return getFirestore()
}
