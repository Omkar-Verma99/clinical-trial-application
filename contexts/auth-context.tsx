"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth"
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore"
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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkOnline, setNetworkOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true)
  const unsubscribePatientsRef = useRef<(() => void) | null>(null)
  const setupPatientsListenerRef = useRef<(() => void) | null>(null)
  const isTabVisibleRef = useRef(true)

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

      // Set doctor auth cookie for middleware protection
      if (user) {
        // Set cookie to indicate user is authenticated
        if (typeof window !== 'undefined') {
          document.cookie = `doctorAuth=true; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
        }
      } else {
        // Clear cookie on logout
        if (typeof window !== 'undefined') {
          document.cookie = `doctorAuth=; path=/; max-age=0`;
        }
      }

      // Clean up previous real-time listeners when user changes
      if (unsubscribePatientsRef.current) {
        unsubscribePatientsRef.current()
        unsubscribePatientsRef.current = null
      }

      if (user) {
        try {
          // Initialize IndexedDB for this user
          await indexedDBService.initialize()

          // Fetch doctor data
          const doctorDoc = await getDoc(doc(db, "doctors", user.uid))
          if (doctorDoc.exists()) {
            const docData = doctorDoc.data()
            setDoctor({ id: doctorDoc.id, ...docData } as Doctor)
            logInfo("Doctor data fetched successfully", { userId: user.uid })
          }

          // Load and cache user's patients to optimized IndexedDB (LAZY LOADING)
          try {
            const patientsQuery = query(
              collection(db, "patients"),
              where("doctorId", "==", user.uid),
              orderBy("createdAt", "desc")
            )
            
            // Initial load: Get first batch of patients for instant UI display
            const initialDocs = await getDocs(patientsQuery)
            
            // OPTIMIZED: Save patient INDEX only (lightweight metadata)
            // Not storing entire patient object - just display fields
            for (const patientDoc of initialDocs.docs) {
              const patientData = patientDoc.data()
              await indexedDBService.savePatientIndex({
                id: patientDoc.id,
                patientCode: patientData.patientCode || '',
                age: patientData.age || 0,
                gender: patientData.gender || '',
                durationOfDiabetes: patientData.durationOfDiabetes || 0,
                createdAt: patientData.createdAt || new Date().toISOString(),
                updatedAt: patientData.updatedAt || new Date().toISOString(),
                hasBaseline: false, // Will be set by real-time listener
                hasFollowUp: false,
                doctorId: user.uid
              })
            }
            
            // Cached patients to IndexedDB

            // FUNCTION: Set up real-time listener for patient changes
            // Can be called on login and when tab visibility changes
            const setupPatientsListener = () => {
              unsubscribePatientsRef.current = onSnapshot(
                patientsQuery,
                async (snapshot) => {
                  try {
                    for (const doc of snapshot.docs) {
                      const patientData = doc.data()
                      // Update patient index with latest data
                      await indexedDBService.savePatientIndex({
                        id: doc.id,
                        patientCode: patientData.patientCode || '',
                        age: patientData.age || 0,
                        gender: patientData.gender || '',
                        durationOfDiabetes: patientData.durationOfDiabetes || 0,
                        createdAt: patientData.createdAt || new Date().toISOString(),
                        updatedAt: patientData.updatedAt || new Date().toISOString(),
                        hasBaseline: patientData.hasBaseline || false,
                        hasFollowUp: patientData.hasFollowUp || false,
                        doctorId: user.uid
                      })
                    }
                    // Real-time sync completed
                  } catch (syncError) {
                    logError(syncError as Error, {
                      action: "realtimeSyncPatients",
                      userId: user.uid,
                      severity: "medium"
                    })
                  }
                },
                (error) => {
                  // Suppress permission errors after logout (user is null)
                  if (!user) {
                    return
                  }
                  
                  if (error.code === 'permission-denied') {
                    logError(error as Error, {
                      action: "patientsListener",
                      userId: user.uid,
                      severity: "medium",
                      message: "Permission denied accessing patients"
                    })
                  } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    console.error('Patient real-time sync error:', error)
                  }
                }
              )
            }

            // Store the setup function for visibility change handler
            setupPatientsListenerRef.current = setupPatientsListener

            // Initial setup
            setupPatientsListener()

            // Handle tab visibility changes - restart listener when tab becomes visible
            // Fixes: net::ERR_NETWORK_IO_SUSPENDED error
            const handleVisibilityChange = () => {
              const isVisible = !document.hidden
              isTabVisibleRef.current = isVisible

              if (isVisible && setupPatientsListenerRef.current) {
                // Tab became visible - restart listener
                if (unsubscribePatientsRef.current) {
                  unsubscribePatientsRef.current()
                  unsubscribePatientsRef.current = null
                }
                setupPatientsListenerRef.current()
              }
            }

            document.addEventListener('visibilitychange', handleVisibilityChange)

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
      // Clean up visibility listener
      document.removeEventListener('visibilitychange', () => {})
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
    
    // CRITICAL: Clean up all listeners BEFORE signing out
    if (unsubscribePatientsRef.current) {
      unsubscribePatientsRef.current()
      unsubscribePatientsRef.current = null
    }
    
    // Clear user and doctor state immediately to prevent further Firestore calls
    setUser(null)
    setDoctor(null)
    
    // SECURITY CRITICAL: Clear all IndexedDB data on logout
    // Prevents unauthorized access to cached patient data if device is compromised
    try {
      await indexedDBService.clearAllData()
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ IndexedDB cleared on logout')
      }
    } catch (error) {
      console.error('Error clearing IndexedDB on logout:', error)
      logError(error as Error, {
        action: "clearIndexedDBOnLogout",
        severity: "high"
      })
      // Don't block logout if IndexedDB clear fails, but log the error
    }
    
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
