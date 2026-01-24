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
  // Variables are set by GitHub Actions workflow into .env.production
  // and compiled into the app by Next.js
  // Fallback to hardcoded values for Firebase App Hosting (these are NEXT_PUBLIC so safe to expose)
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kollectcare-rwe-study.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kollectcare-rwe-study",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kollectcare-rwe-study.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "716627719667",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:716627719667:web:a828412396c68af35b8e86",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QTWVYF3R19",
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

