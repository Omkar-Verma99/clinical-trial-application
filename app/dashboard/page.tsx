"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, BaselineData, FollowUpData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface PatientWithStatus extends Patient {
  hasBaseline: boolean
  hasFollowUp: boolean
}

// Patient card component for better code splitting
const PatientCard = ({ patient, getNextStatus, getStatusColor, handleActionClick }: any) => {
  const statusInfo = getNextStatus(patient)
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl">Patient Code: {patient.patientCode}</CardTitle>
              <Badge className={getStatusColor(statusInfo.status)}>
                {statusInfo.label}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {patient.age} years • {patient.gender} • {patient.durationOfDiabetes} years with diabetes
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              Added {new Date(patient.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Previous Therapy</p>
            <p className="font-medium">{Array.isArray(patient.previousTherapy) ? patient.previousTherapy.join(", ") : "None"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Comorbidities</p>
            <p className="font-medium">
              {patient.comorbidities && typeof patient.comorbidities === 'object'
                ? Object.entries(patient.comorbidities)
                    .filter(([key, value]) => key !== 'other' && key !== 'ckdEgfrCategory' && value === true)
                    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
                    .join(", ") || "None"
                : "None"}
            </p>
          </div>
        </div>

        {/* Status Progress Indicators */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className={`h-3 w-3 rounded-full mx-auto mb-2 ${patient.hasBaseline ? "bg-green-500" : "bg-gray-300"}`} />
              <p className="text-xs font-medium text-muted-foreground">Baseline</p>
              <p className="text-xs text-gray-500">{patient.hasBaseline ? "Completed" : "Pending"}</p>
            </div>
            <div className="text-center">
              <div className={`h-3 w-3 rounded-full mx-auto mb-2 ${patient.hasFollowUp ? "bg-green-500" : "bg-gray-300"}`} />
              <p className="text-xs font-medium text-muted-foreground">Follow-up</p>
              <p className="text-xs text-gray-500">{patient.hasFollowUp ? "Completed" : "Pending"}</p>
            </div>
            <div className="text-center">
              <div className={`h-3 w-3 rounded-full mx-auto mb-2 ${patient.hasBaseline && patient.hasFollowUp ? "bg-green-500" : "bg-gray-300"}`} />
              <p className="text-xs font-medium text-muted-foreground">Overview</p>
              <p className="text-xs text-gray-500">{patient.hasBaseline && patient.hasFollowUp ? "Ready" : "Not Ready"}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={(e) => handleActionClick(e, patient)}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              statusInfo.status === "completed"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : statusInfo.status === "in-progress"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-yellow-600 hover:bg-yellow-700 text-white"
            }`}
          >
            {statusInfo.action}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user, doctor, loading, logout } = useAuth()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithStatus[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [pagination, setPagination] = useState({ offset: 0, limit: 50, hasMore: false })
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [indexedDBReady, setIndexedDBReady] = useState(false)

  // Debounced pagination handler
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }

  const debouncedPaginationChange = useMemo(
    () => debounce((newOffset: number) => {
      setPaginationLoading(true)
      setPagination(prev => ({ ...prev, offset: newOffset }))
    }, 300),
    []
  )

  const handleNextPage = useCallback(() => {
    debouncedPaginationChange(pagination.offset + pagination.limit)
  }, [pagination, debouncedPaginationChange])

  const handlePrevPage = useCallback(() => {
    debouncedPaginationChange(Math.max(0, pagination.offset - pagination.limit))
  }, [pagination, debouncedPaginationChange])

  // Initialize patient list with pagination from optimized IndexedDB
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !db) return

    // Set up real-time listener for patient list
    const q = query(
      collection(db, "patients"),
      where("doctorId", "==", user.uid),
      orderBy("createdAt", "desc")
    )

    // Set a timeout to ensure loading state is cleared even if listener fails
    const timeoutId = setTimeout(() => {
      if (loadingPatients) {
        setLoadingPatients(false)
      }
    }, 5000)

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        try {
          const patientsData: PatientWithStatus[] = []

          // V4 Schema: Build list from unified /patients documents
          for (const patientDoc of querySnapshot.docs) {
            const patientData = patientDoc.data() as Omit<Patient, 'id'>
            
            patientsData.push({
              ...patientData,
              id: patientDoc.id,
              hasBaseline: !!patientData.baseline,
              hasFollowUp: !!(patientData.followups && patientData.followups.length > 0),
            } as PatientWithStatus)
          }

          // Apply pagination
          const paginatedPatients = patientsData.slice(pagination.offset, pagination.offset + pagination.limit)

          setPatients(paginatedPatients)
          setLoadingPatients(false)
          setIndexedDBReady(true)
          setPagination(prev => ({
            ...prev,
            hasMore: querySnapshot.docs.length > pagination.offset + pagination.limit
          }))
          setPaginationLoading(false)
          clearTimeout(timeoutId)
        } catch (error) {
          console.error("Error fetching patient details:", error)
          setLoadingPatients(false)
          setPaginationLoading(false)
          clearTimeout(timeoutId)
        }
      },
      (error) => {
        console.error("Error setting up real-time listener:", error)
        setLoadingPatients(false)
        setPaginationLoading(false)
        clearTimeout(timeoutId)
      }
    )

    return () => {
      unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [user, pagination.offset])

  const getNextStatus = useCallback((patient: PatientWithStatus) => {
    if (!patient.hasBaseline) {
      return { status: "awaiting", label: "Baseline Pending", action: "Complete Baseline" }
    } else if (!patient.hasFollowUp) {
      return { status: "in-progress", label: "Follow-up Pending", action: "Complete Follow-up" }
    } else {
      return { status: "completed", label: "Completed", action: "View Details" }
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "awaiting":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }, [])

  const handleActionClick = useCallback((e: React.MouseEvent, patient: PatientWithStatus) => {
    e.preventDefault()
    router.push(`/patients/${patient.id}`)
  }, [router])

  // Memoize patient list rendering
  const patientsList = useMemo(() => {
    return patients.map((patient) => (
      <PatientCard
        key={patient.id}
        patient={patient}
        getNextStatus={getNextStatus}
        getStatusColor={getStatusColor}
        handleActionClick={handleActionClick}
      />
    ))
  }, [patients, getNextStatus, getStatusColor, handleActionClick])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={32} height={32} className="h-8 w-8 rounded" />
            <span className="text-xl font-bold">Kollectcare</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="outline" className="bg-transparent">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Reports
              </Button>
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{doctor?.name}</p>
              <p className="text-xs text-muted-foreground">{doctor?.registrationNumber}</p>
            </div>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-balance">Patient Management</h1>
            <p className="text-muted-foreground mt-1">Manage your clinical trial participants</p>
          </div>
          <Link href="/patients/add">
            <Button size="lg">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Patient
            </Button>
          </Link>
        </div>

        {loadingPatients ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : patients.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No patients yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first patient to the clinical trial</p>
                <Link href="/patients/add">
                  <Button>Add Your First Patient</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4">{patientsList}</div>
            
            {/* PAGINATION CONTROLS - WITH LOADING STATE */}
            <div className="flex items-center justify-between py-4 px-4 border-t border-border/40">
              <div className="text-sm text-muted-foreground">
                {paginationLoading ? (
                  <>Updating...</>
                ) : (
                  <>
                    Showing patients {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.offset + patients.length)} 
                    {pagination.hasMore && ` (more available)`}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0 || paginationLoading}
                  className="bg-transparent"
                >
                  {paginationLoading ? "..." : "Previous"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore || patients.length < pagination.limit || paginationLoading}
                  className="bg-transparent"
                >
                  {paginationLoading ? "..." : "Next"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
