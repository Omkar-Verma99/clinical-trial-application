import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

// Initialize Firebase only in browser environment
let firebaseApp: any = null
let auth: any = null
let db: any = null

// Firebase initialization - only runs in browser
if (typeof window !== "undefined") {
  // Firebase configuration - loaded from environment variables at build time
  // These values are compiled into the bundle, not stored as plain text in source
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  }

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

