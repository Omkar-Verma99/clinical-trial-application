import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"
import { firebaseConfig as defaultConfig } from "./firebase-config"

// Initialize Firebase only in browser environment
let firebaseApp: any = null
let auth: any = null
let db: any = null

// Firebase initialization - only runs in browser
if (typeof window !== "undefined") {
  // Firebase configuration - use default hardcoded config
  const firebaseConfig = defaultConfig

  // Validate Firebase config
  const missingKeys = Object.entries(firebaseConfig || {})
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    console.error("❌ Missing Firebase configuration keys:", missingKeys)
    console.log("Available config:", firebaseConfig)
  } else {
    console.log("✓ Firebase configuration loaded successfully")
  }

  // Initialize Firebase
  if (firebaseConfig && Object.values(firebaseConfig).every(v => v)) {
    try {
      console.log("Initializing Firebase...")
      firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
      auth = getAuth(firebaseApp)
      db = getFirestore(firebaseApp)
      console.log("✓ Firebase initialized successfully with project:", firebaseConfig.projectId)

      // Initialize Analytics only in browser environment
      try {
        getAnalytics(firebaseApp)
      } catch (e) {
        console.warn("Analytics initialization failed:", e)
      }
      console.log("✓ Firebase initialized successfully")
    } catch (error) {
      console.error("❌ Firebase initialization failed:", error)
    }
  } else {
    console.warn("⚠️  Firebase config is incomplete, cannot initialize")
  }
}

export { firebaseApp, auth, db }

