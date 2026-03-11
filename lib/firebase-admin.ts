import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured")
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON")
  }

  if (typeof parsed?.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n")
  }

  return parsed
}

let cachedAdminDb: ReturnType<typeof getFirestore> | null = null

export function getAdminDb() {
  if (cachedAdminDb) {
    return cachedAdminDb
  }

  const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(getServiceAccount()),
      })

  cachedAdminDb = getFirestore(adminApp)
  return cachedAdminDb
}
