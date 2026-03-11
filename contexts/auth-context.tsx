"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signOut,
  sendEmailVerification,
} from "firebase/auth"
import { doc, getDoc, writeBatch } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { logError, logInfo } from "@/lib/error-tracking"
import type { Doctor } from "@/lib/types"

interface AuthContextType {
  user: User | null
  doctor: Doctor | null
  loading: boolean
  doctorDataError: string | null
  retryDoctorDataFetch: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, doctorData: Omit<Doctor, "id" | "createdAt">) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  doctor: null,
  loading: true,
  doctorDataError: null,
  retryDoctorDataFetch: async () => {},
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [doctorDataError, setDoctorDataError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (typeof document !== "undefined") {
        if (currentUser) {
          document.cookie = `doctorAuth=true; path=/; max-age=${7 * 24 * 60 * 60}`
        } else {
          document.cookie = `doctorAuth=; path=/; max-age=0`
        }
      }

      if (currentUser && db) {
        try {
          const doctorDoc = await getDoc(doc(db, "doctors", currentUser.uid))
          if (doctorDoc.exists()) {
            const docData = doctorDoc.data()
            setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
            logInfo("Doctor data fetched successfully", { userId: currentUser.uid })
          } else {
            setDoctor(null)
          }
        } catch (error) {
          logError(error as Error, {
            action: "fetchDoctorData",
            userId: currentUser.uid,
            severity: "medium",
          })
          setDoctor(null)
        }
      } else {
        setDoctor(null)
        setDoctorDataError(null)
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const retryDoctorDataFetch = useCallback(async () => {
    if (!user || !db) {
      setDoctorDataError("User not authenticated. Please log in again.")
      return
    }

    try {
      const doctorDoc = await getDoc(doc(db, "doctors", user.uid))
      if (doctorDoc.exists()) {
        const docData = doctorDoc.data()
        setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
        setDoctorDataError(null)
        logInfo("Doctor data fetched successfully on retry", { userId: user.uid })
      } else {
        setDoctorDataError("Doctor profile not found. Please contact support.")
        logError("Doctor document not found", {
          action: "retryDoctorDataFetch",
          userId: user.uid,
          severity: "critical"
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch doctor profile"
      setDoctorDataError(`Error loading profile: ${errorMsg}. Please try again.`)
      logError(error as Error, {
        action: "retryDoctorDataFetch",
        userId: user.uid,
        severity: "high"
      })
    }
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("No internet connection. Please check your network.")
    }
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }

    const normalizedEmail = email.trim().toLowerCase()
    const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail)
    if (!signInMethods || signInMethods.length === 0) {
      const accountError = new Error("Your ID has not been created yet. Please sign up first to create your account.") as Error & { code: string }
      accountError.code = "app/account-not-created"
      throw accountError
    }

    await signInWithEmailAndPassword(auth, normalizedEmail, password)
    logInfo("User logged in successfully", { email: normalizedEmail })
  }, [])

  const signup = useCallback(async (email: string, password: string, doctorData: Omit<Doctor, "id" | "createdAt">) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("No internet connection. Please check your network.")
    }
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    try {
      // Send Firebase email verification with custom template
      // Template is customized in Firebase Console: Authentication → Email Templates
      await sendEmailVerification(user)
      logInfo("Verification email sent", { userId: user.uid, email })
    } catch (error) {
      logError(error as Error, {
        action: "sendEmailVerification",
        userId: user.uid,
        severity: "low"
      })
      // Don't throw - verification is optional
    }

    // Atomically create site-code lock and doctor profile to prevent duplicate center registration.
    if (!db) {
      throw new Error("Firestore is not initialized. Please refresh the page.")
    }

    const studySiteCode = doctorData.studySiteCode
    const createdAt = new Date().toISOString()
    const doctorRef = doc(db, "doctors", user.uid)
    const studySiteCodeRef = doc(db, "studySiteCodes", studySiteCode)
    const batch = writeBatch(db)

    batch.set(studySiteCodeRef, {
      doctorId: user.uid,
      studySiteCode,
      createdAt,
    })

    batch.set(doctorRef, {
      ...doctorData,
      createdAt,
    })

    try {
      await batch.commit()
    } catch (error: any) {
      // Roll back Firebase Auth user when profile/lock creation fails.
      try {
        await user.delete()
      } catch {
        // Best-effort cleanup only.
      }

      if (error?.code === "permission-denied") {
        throw new Error(`Study Site Code "${studySiteCode}" is already in use. Only one doctor per center is allowed.`)
      }

      throw error
    }

    // IMPORTANT: Immediately fetch and set the doctor data after signup
    // This ensures doctor context is available immediately after registration
    try {
      const doctorDoc = await getDoc(doc(db, "doctors", user.uid))
      if (doctorDoc.exists()) {
        const docData = doctorDoc.data()
        setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
        logInfo("Doctor data fetched immediately after signup", { userId: user.uid })
      } else {
        // Document exists but data is missing - set error for UI
        const errorMsg = "Doctor profile could not be loaded. Please try again."
        setDoctorDataError(errorMsg)
        logError("Doctor document created but no data found", {
          action: "fetchDoctorDataAfterSignup",
          userId: user.uid,
          severity: "critical"
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      setDoctorDataError(`Failed to create profile: ${errorMsg}. Please try again.`)
      logError(error as Error, {
        action: "fetchDoctorDataAfterSignup",
        userId: user.uid,
        severity: "high"
      })
    }

    logInfo("Doctor account created successfully", { email, userId: user.uid })
  }, [])

  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }
    
    // Clear user and doctor state immediately
    setUser(null)
    setDoctor(null)
    
    await signOut(auth)
    
    // Clear doctorAuth cookie on logout
    if (typeof window !== 'undefined') {
      document.cookie = `doctorAuth=; path=/; max-age=0`;
    }
    
    logInfo("User logged out successfully")
    setDoctorDataError(null)
    router.push("/login")
  }, [router])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      doctor,
      loading,
      doctorDataError,
      retryDoctorDataFetch,
      login,
      signup,
      logout,
    }),
    [user, doctor, loading, doctorDataError, retryDoctorDataFetch, login, signup, logout]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
