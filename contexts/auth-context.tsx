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
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { indexedDBService } from "@/lib/indexeddb-service"
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
  const unsubscribePatientsRef = { current: null as (() => void) | null }

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = networkDetector.subscribe(setNetworkOnline)
    return unsubscribe
  }, [])

  useEffect(() => {
    // Only initialize auth listener on client side
    if (typeof window === "undefined" || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      // Clean up previous real-time listeners when user changes
      if (unsubscribePatientsRef.current) {
        unsubscribePatientsRef.current()
        unsubscribePatientsRef.current = null
      }

      if (user) {
        try {
          // Initialize IndexedDB for this user
          await indexedDBService.initialize()
          if (process.env.NODE_ENV === 'development') {
            console.log('✓ IndexedDB initialized on login for user:', user.uid)
          }

          // Fetch doctor data
          const doctorDoc = await getDoc(doc(db, "doctors", user.uid))
          if (doctorDoc.exists()) {
            const docData = doctorDoc.data()
            setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
            logInfo("Doctor data fetched successfully", { userId: user.uid })
          }

          // Load and cache user's patients to IndexedDB
          try {
            const patientsQuery = query(
              collection(db, "patients"),
              where("doctorId", "==", user.uid)
            )
            const patientDocs = await getDocs(patientsQuery)
            
            // Cache each patient in IndexedDB
            for (const patientDoc of patientDocs.docs) {
              await indexedDBService.saveForm(
                patientDoc.id,
                'patient',
                patientDoc.id,
                { ...patientDoc.data(), id: patientDoc.id },
                false,
                []
              )
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`✓ Cached ${patientDocs.size} patients to IndexedDB for user:`, user.uid)
            }

            // Set up real-time listener for patient changes (additions, updates, deletions)
            // CRITICAL: Store the unsubscribe function for cleanup
            unsubscribePatientsRef.current = onSnapshot(
              patientsQuery,
              async (snapshot) => {
                try {
                  for (const doc of snapshot.docs) {
                    // Update or add patient in IndexedDB
                    await indexedDBService.saveForm(
                      doc.id,
                      'patient',
                      doc.id,
                      { ...doc.data(), id: doc.id },
                      false,
                      []
                    )
                  }
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`✓ Real-time sync: ${snapshot.docs.length} patients`)
                  }
                } catch (syncError) {
                  logError(syncError as Error, {
                    action: "realtimeSyncPatients",
                    userId: user.uid,
                    severity: "medium"
                  })
                }
              },
              (error) => {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Patient real-time sync error:', error)
                }
                logError(error as Error, {
                  action: "patientsListener",
                  userId: user.uid,
                  severity: "medium"
                })
              }
            )
          } catch (cacheError) {
            // Don't fail auth if caching fails
            logError(cacheError as Error, {
              action: "cachePatientData",
              userId: user.uid,
              severity: "low"
            })
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

    return () => {
      unsubscribe()
      // Clean up real-time listeners on unmount
      if (unsubscribePatientsRef.current) {
        unsubscribePatientsRef.current()
        unsubscribePatientsRef.current = null
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!networkOnline) {
      throw new Error("No internet connection. Please check your network.")
    }
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }
    await signInWithEmailAndPassword(auth, email, password)
    logInfo("User logged in successfully", { email })
  }, [networkOnline])

  const signup = useCallback(async (email: string, password: string, doctorData: Omit<Doctor, "id" | "createdAt">) => {
    if (!networkOnline) {
      throw new Error("No internet connection. Please check your network.")
    }
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
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
    if (!db) {
      throw new Error("Firestore is not initialized. Please refresh the page.")
    }
    await setDoc(doc(db, "doctors", user.uid), {
      ...doctorData,
      createdAt: new Date().toISOString(),
    })

    logInfo("Doctor account created successfully", { email, userId: user.uid })
  }, [networkOnline])

  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error("Firebase authentication is not initialized. Please refresh the page.")
    }
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
