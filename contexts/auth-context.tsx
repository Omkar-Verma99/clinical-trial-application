"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
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

  const syncRoleClaim = useCallback(async (currentUser: User) => {
    try {
      const idToken = await currentUser.getIdToken(true)
      await fetch("/api/auth/sync-role", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })
      await currentUser.getIdToken(true)
    } catch (error) {
      // Keep auth flow resilient; role sync can retry later.
      logError(error as Error, {
        action: "syncRoleClaim",
        userId: currentUser.uid,
        severity: "low",
      })
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser && db) {
        try {
          const doctorDoc = await getDoc(doc(db, "doctors", currentUser.uid))
          if (doctorDoc.exists()) {
            const docData = doctorDoc.data()
            setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
            if (typeof document !== "undefined") {
              document.cookie = `doctorAuth=true; path=/; max-age=${7 * 24 * 60 * 60}`
              document.cookie = `appRole=doctor; path=/; max-age=${7 * 24 * 60 * 60}`
            }
            void syncRoleClaim(currentUser)
            logInfo("Doctor data fetched successfully", { userId: currentUser.uid })
          } else {
            setDoctor(null)
            if (typeof document !== "undefined") {
              document.cookie = `doctorAuth=; path=/; max-age=0`
              document.cookie = `appRole=; path=/; max-age=0`
            }
          }
        } catch (error) {
          logError(error as Error, {
            action: "fetchDoctorData",
            userId: currentUser.uid,
            severity: "medium",
          })
          setDoctor(null)
          if (typeof document !== "undefined") {
            document.cookie = `doctorAuth=; path=/; max-age=0`
            document.cookie = `appRole=; path=/; max-age=0`
          }
        }
      } else {
        setDoctor(null)
        setDoctorDataError(null)
        if (typeof document !== "undefined") {
          document.cookie = `doctorAuth=; path=/; max-age=0`
          document.cookie = `appRole=; path=/; max-age=0`
        }
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [syncRoleClaim])

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
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)

    // Prevent non-doctor accounts from entering doctor flow.
    if (db) {
      const doctorDoc = await getDoc(doc(db, "doctors", userCredential.user.uid))
      if (!doctorDoc.exists()) {
        await signOut(auth)
        const err = new Error("This account does not have doctor access. Please use admin login.") as Error & {
          code?: string
        }
        err.code = "app/not-doctor-account"
        throw err
      }

      // Set doctor session cookies immediately to prevent middleware redirect races.
      if (typeof document !== "undefined") {
        document.cookie = `doctorAuth=true; path=/; max-age=${7 * 24 * 60 * 60}`
        document.cookie = `appRole=doctor; path=/; max-age=${7 * 24 * 60 * 60}`
      }

      const docData = doctorDoc.data()
      setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
      setDoctorDataError(null)
    }

    void syncRoleClaim(userCredential.user)
    logInfo("User logged in successfully", { email: normalizedEmail })
  }, [syncRoleClaim])

  const signup = useCallback(async (email: string, password: string, doctorData: Omit<Doctor, "id" | "createdAt">) => {
    const createAppError = (code: string, message: string) => {
      const err = new Error(message) as Error & { code?: string }
      err.code = code
      return err
    }

    const isRetryableProfileWriteError = (error: any): boolean => {
      const code = String(error?.code || "").toLowerCase()
      return (
        code === "permission-denied" ||
        code === "firestore/permission-denied" ||
        code === "unauthenticated" ||
        code === "firestore/unauthenticated"
      )
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("No internet connection. Please check your network.")
    }
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create doctor profile document after auth signup.
    if (!db) {
      throw new Error("Firestore is not initialized. Please refresh the page.")
    }

    const createdAt = new Date().toISOString()
    const doctorRef = doc(db, "doctors", user.uid)
    const doctorPayload = {
      ...doctorData,
      createdAt,
    }

    try {
      // Force token refresh to reduce first-write auth propagation races.
      await user.getIdToken(true)
    } catch (error) {
      logError(error as Error, {
        action: "refreshSignupToken",
        userId: user.uid,
        severity: "medium",
      })
      // Continue - setDoc retry block below can still succeed.
    }

    try {
      let writeSucceeded = false
      let profileWriteError: any = null

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await setDoc(doctorRef, doctorPayload)
          writeSucceeded = true
          break
        } catch (error: any) {
          profileWriteError = error

          if (attempt === 0 && isRetryableProfileWriteError(error)) {
            await new Promise((resolve) => setTimeout(resolve, 400))
            try {
              await user.getIdToken(true)
            } catch {
              // Ignore refresh retry failures; second write attempt still proceeds.
            }
            continue
          }

          break
        }
      }

      if (!writeSucceeded) {
        throw profileWriteError || createAppError("app/doctor-profile-write-failed", "Failed to create doctor profile")
      }
    } catch (error: any) {
      // Roll back Firebase Auth user when profile creation fails.
      try {
        await user.delete()
      } catch {
        // Best-effort cleanup only.
      }

      const code = String(error?.code || "").toLowerCase()
      if (
        code === "permission-denied" ||
        code === "firestore/permission-denied" ||
        code === "unauthenticated" ||
        code === "firestore/unauthenticated"
      ) {
        throw createAppError(
          "app/doctor-profile-permission-denied",
          "Unable to create doctor profile due to a permission sync issue. Please try again."
        )
      }

      throw createAppError(
        "app/doctor-profile-write-failed",
        error?.message || "Failed to create doctor profile. Please try again."
      )
    }

    // Send verification email after successful profile write (non-blocking).
    void sendEmailVerification(user)
      .then(() => {
        logInfo("Verification email sent", { userId: user.uid, email })
      })
      .catch((error) => {
        logError(error as Error, {
          action: "sendEmailVerification",
          userId: user.uid,
          severity: "low",
        })
      })

    // IMPORTANT: Immediately fetch and set the doctor data after signup
    // This ensures doctor context is available immediately after registration
    try {
      const doctorDoc = await getDoc(doc(db, "doctors", user.uid))
      if (doctorDoc.exists()) {
        const docData = doctorDoc.data()
        setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
        void syncRoleClaim(user)
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
  }, [syncRoleClaim])

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
      document.cookie = `appRole=; path=/; max-age=0`;
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
