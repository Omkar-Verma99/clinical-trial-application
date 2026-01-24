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
  // Try to get config from Firebase App Hosting's FIREBASE_WEBAPP_CONFIG first
  let firebaseConfig: any = null
  
  // Check if FIREBASE_WEBAPP_CONFIG is available (Firebase App Hosting)
  const webappConfigStr = process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG
  
  if (webappConfigStr) {
    try {
      firebaseConfig = JSON.parse(webappConfigStr)
      console.log("✓ Using FIREBASE_WEBAPP_CONFIG from Firebase App Hosting")
    } catch (e) {
      console.warn("Could not parse FIREBASE_WEBAPP_CONFIG, falling back to individual env vars", e)
      firebaseConfig = null
    }
  }
  
  // Fall back to individual environment variables
  if (!firebaseConfig) {
    firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }
    console.log("✓ Using individual NEXT_PUBLIC_FIREBASE_* env vars")
  }
  
  // Validate Firebase config
  const missingKeys = Object.entries(firebaseConfig || {})
    .filter(([, value]) => !value)
    .map(([key]) => key)
  
  if (missingKeys.length > 0) {
    console.error("❌ Missing Firebase configuration keys:", missingKeys)
    console.error("Available env vars:", {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      webappConfig: !!webappConfigStr,
    })
  } else {
    console.log("✓ All Firebase configuration keys present")
  }
  
  // Initialize Firebase
  if (firebaseConfig && Object.values(firebaseConfig).every(v => v)) {
    try {
      console.log("Initializing Firebase with:", { 
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain 
      })
      firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
      auth = getAuth(firebaseApp)
      db = getFirestore(firebaseApp)
      
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

