// Firebase configuration
// Prefer cloud-provided NEXT_PUBLIC_* values at build time, fallback to stable defaults.

function fromEnvOrDefault(key: string, fallback: string): string {
  const value = process.env[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

export const firebaseConfig = {
  apiKey: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks'),
  authDomain: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'kollectcare-rwe-study.firebaseapp.com'),
  projectId: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'kollectcare-rwe-study'),
  storageBucket: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'kollectcare-rwe-study.firebasestorage.app'),
  messagingSenderId: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '940369281340'),
  appId: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_APP_ID', '1:940369281340:web:d6b3f7e8c4a9b2f1e5d8c9a'),
  measurementId: fromEnvOrDefault('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'G-QTWVYF3R19'),
}
