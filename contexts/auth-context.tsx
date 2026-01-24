"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react"
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
import { networkDetector } from "@/lib/network"
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
  const [user, setUser] = useState<User | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkOnline, setNetworkOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true)

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = networkDetector.subscribe(setNetworkOnline)
    return unsubscribe
  }, [])

  useEffect(() => {
    // Only initialize auth listener on client side
    if (typeof window === "undefined") {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        try {
          // Fetch doctor data
          const doctorDoc = await getDoc(doc(db, "doctors", user.uid))
          if (doctorDoc.exists()) {
            const docData = doctorDoc.data()
            setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
            logInfo("Doctor data fetched successfully", { userId: user.uid })
          }
        } catch (error) {
          logError(error as Error, {
            action: "fetchDoctorData",
            userId: user.uid,
            severity: "medium"
          })
        }
      } else {
        setDoctor(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!networkOnline) {
      throw new Error("No internet connection. Please check your network.")
    }
    await signInWithEmailAndPassword(auth, email, password)
    logInfo("User logged in successfully", { email })
  }, [networkOnline])

  const signup = useCallback(async (email: string, password: string, doctorData: Omit<Doctor, "id" | "createdAt">) => {
    if (!networkOnline) {
      throw new Error("No internet connection. Please check your network.")
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    try {
      // Send email verification
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
    await setDoc(doc(db, "doctors", user.uid), {
      ...doctorData,
      createdAt: new Date().toISOString(),
    })

    logInfo("Doctor account created successfully", { email, userId: user.uid })
  }, [networkOnline])

  const logout = useCallback(async () => {
    await signOut(auth)
    logInfo("User logged out successfully")
  }, [])

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
