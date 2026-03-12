import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics"
import { firebaseConfig } from "./firebase-config"

// Initialize Firebase only in browser environment
let firebaseApp: any = null
let auth: any = null
let db: any = null
const enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_FIREBASE_ANALYTICS === "true"

// Firebase initialization - only runs in browser
if (typeof window !== "undefined") {
  // Firebase configuration - using hardcoded values from firebase-config.ts
  // This ensures the config is always available and included in the bundle

  // Validate Firebase config
  const missingKeys = Object.entries(firebaseConfig || {})
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    console.error("❌ Missing Firebase configuration keys:", missingKeys)
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // In production, still try to initialize but log the issue
      console.warn("⚠️ Firebase config incomplete - app may not function properly")
    }
  }

  // Initialize Firebase only if config is complete
  if (firebaseConfig && Object.values(firebaseConfig).every(v => v && v.length > 0)) {
    try {
      firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
      auth = getAuth(firebaseApp)
      db = getFirestore(firebaseApp)

      // Initialize Analytics only when explicitly enabled.
      if (enableAnalytics) {
        isAnalyticsSupported()
          .then((supported) => {
            if (supported) {
              try {
                getAnalytics(firebaseApp)
              } catch {
                // Analytics init failures are non-critical.
              }
            }
          })
          .catch(() => {
            // Analytics support detection failures are non-critical.
          })
      }
    } catch (error) {
      // Suppress Firebase initialization errors in console (they're handled by error logging)
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error("Firebase initialization error (non-critical):", error)
      }
    }
  } else {
    console.warn("⚠️  Firebase config is incomplete, cannot initialize")
  }
}

// Validate that Firebase is properly initialized
if (typeof window !== "undefined" && firebaseConfig) {
  if (!firebaseApp) {
    console.warn("⚠️  Firebase App not initialized - check configuration and browser environment")
  }
  if (!auth) {
    console.warn("⚠️  Firebase Auth not initialized - check configuration")
  }
  if (!db) {
    console.warn("⚠️  Firebase Firestore not initialized - check configuration")
  }
}

export { firebaseApp, auth, db }

