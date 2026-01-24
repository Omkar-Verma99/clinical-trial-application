import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase only in browser environment
let firebaseApp: any = null
let auth: any = null
let db: any = null

if (typeof window !== "undefined") {
  firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
  auth = getAuth(firebaseApp)
  db = getFirestore(firebaseApp)
  
  // Initialize Analytics only in browser environment
  getAnalytics(firebaseApp)
}

export { firebaseApp, auth, db }

