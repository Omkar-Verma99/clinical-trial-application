import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

// Try to get config from Firebase App Hosting's FIREBASE_WEBAPP_CONFIG first
let firebaseConfig: any = null

if (typeof window !== "undefined") {
  // Check if FIREBASE_WEBAPP_CONFIG is available (Firebase App Hosting)
  if (process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG)
    } catch (e) {
      console.warn("Could not parse FIREBASE_WEBAPP_CONFIG, falling back to individual env vars")
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
  }
}

// Validate Firebase config in browser environment
if (typeof window !== "undefined") {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  
  if (missingKeys.length > 0) {
    console.error("Missing Firebase configuration keys:", missingKeys)
    console.error("Available env vars:", {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    })
  }
}

// Initialize Firebase only in browser environment
let firebaseApp: any = null
let auth: any = null
let db: any = null

if (typeof window !== "undefined") {
  try {
    firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
    auth = getAuth(firebaseApp)
    db = getFirestore(firebaseApp)
    
    // Initialize Analytics only in browser environment
    getAnalytics(firebaseApp)
  } catch (error) {
    console.error("Firebase initialization error:", error)
  }
}

export { firebaseApp, auth, db }

