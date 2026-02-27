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
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, doctorData: Omit<Doctor, "id" | "createdAt">) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  doctor: null,
  loading: true,
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
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("No internet connection. Please check your network.")
    }
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }
    await signInWithEmailAndPassword(auth, email, password)
    logInfo("User logged in successfully", { email })
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

    // Create doctor document
    if (!db) {
      throw new Error("Firestore is not initialized. Please refresh the page.")
    }
    await setDoc(doc(db, "doctors", user.uid), {
      ...doctorData,
      createdAt: new Date().toISOString(),
    })

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
    router.push("/login")
  }, [router])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      doctor,
      loading,
      login,
      signup,
      logout,
    }),
    [user, doctor, loading, login, signup, logout]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
