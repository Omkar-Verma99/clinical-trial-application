import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

let initialized = false

function initAdminApp() {
  if (initialized || getApps().length > 0) {
    initialized = true
    return
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson)
    initializeApp({
      credential: cert(serviceAccount),
    })
  } else {
    initializeApp({
      credential: applicationDefault(),
    })
  }

  initialized = true
}

export function getFirebaseAdminAuth() {
  initAdminApp()
  return getAuth()
}
