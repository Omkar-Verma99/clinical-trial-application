"use client"

export default function DebugPage() {
  return (
    <div style={{ padding: "20px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Firebase Configuration Debug</h1>
      <p>
        {JSON.stringify(
          {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
          },
          null,
          2
        )}
      </p>
    </div>
  )
}
