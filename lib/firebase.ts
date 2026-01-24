import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"
import getConfig from "next/config"

// Initialize Firebase only in browser environment
let firebaseApp: any = null
let auth: any = null
let db: any = null

// Firebase initialization - only runs in browser
if (typeof window !== "undefined") {
  // Get runtime config (for App Hosting runtime variables)
  const runtimeConfig = getConfig()?.publicRuntimeConfig || {}
  
  // Firebase configuration - loaded from environment variables at build time
  // Falls back to publicRuntimeConfig for App Hosting runtime variables
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || runtimeConfig.firebaseApiKey || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || runtimeConfig.firebaseAuthDomain || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || runtimeConfig.firebaseProjectId || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || runtimeConfig.firebaseStorageBucket || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || runtimeConfig.firebaseMessagingSenderId || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || runtimeConfig.firebaseAppId || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || runtimeConfig.firebaseMeasurementId || "",
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

