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

// Design S1: Split Card + Details Panel
const PatientCard = ({ patient, getNextStatus, getStatusColor, handleActionClick }: any) => {
  const statusInfo = getNextStatus(patient)
  const initials = patient.patientCode?.slice(2, 4) || "PT"
  
  // Format comorbidities
  const comorbidities = patient.comorbidities && typeof patient.comorbidities === 'object'
    ? Object.entries(patient.comorbidities)
        .filter(([key, value]) => key !== 'other' && key !== 'ckdEgfrCategory' && value === true)
        .map(([key]) => {
          const labels: Record<string, string> = {
            hypertension: "HTN",
            dyslipidemia: "Dyslipidemia",
            obesity: "Obesity",
            ascvd: "ASCVD",
            heartFailure: "Heart Failure",
            chronicKidneyDisease: "CKD"
          }
          return labels[key] || key
        })
    : []

  const previousTherapies = Array.isArray(patient.previousTherapy) 
    ? patient.previousTherapy 
    : patient.previousDrugClasses 
      ? Object.entries(patient.previousDrugClasses)
          .filter(([key, value]) => key !== 'other' && value === true)
          .map(([key]) => {
            const labels: Record<string, string> = {
              metformin: "Metformin",
              sulfonylurea: "Sulfonylurea",
              dpp4Inhibitor: "DPP4i",
              sglt2Inhibitor: "SGLT2i",
              tzd: "TZD",
              insulin: "Insulin"
            }
            return labels[key] || key
          })
      : []

  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex gap-0 h-full min-h-64">
        {/* LEFT: Patient Card (35%) */}
        <div className="w-[35%] border-r border-border bg-gradient-to-b from-blue-50 dark:from-slate-900 to-white dark:to-slate-950 p-4 space-y-3">
          {/* Avatar Section */}
          <div className="space-y-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{patient.patientCode}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {patient.age}y • {patient.gender} • {patient.durationOfDiabetes}y DM
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge className={`${getStatusColor(statusInfo.status)} px-2 py-0.5 text-xs`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Enrollment Info */}
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
            <p>Enrolled: {new Date(patient.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}</p>
          </div>

          {/* Medical Summary */}
          <div className="space-y-2 border-t border-blue-200 dark:border-slate-700 pt-2">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PREVIOUS THERAPY</p>
              <div className="flex flex-wrap gap-1">
                {previousTherapies.length > 0 ? (
                  previousTherapies.slice(0, 2).map((therapy: string) => (
                    <span key={therapy} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full">
                      {therapy}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">None</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">COMORBIDITIES</p>
              <div className="flex flex-wrap gap-1">
                {comorbidities.length > 0 ? (
                  comorbidities.slice(0, 2).map((condition) => (
                    <span key={condition} className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded-full">
                      {condition}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="border-t border-blue-200 dark:border-slate-700 pt-2 space-y-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">PROGRESS</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${patient.hasBaseline ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {patient.hasBaseline ? "✓ Baseline" : "○ Baseline"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${patient.hasFollowUp ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {patient.hasFollowUp ? "✓ Follow-up" : "○ Follow-up"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${patient.hasBaseline && patient.hasFollowUp ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {patient.hasBaseline && patient.hasFollowUp ? "✓ Comparison" : "○ Comparison"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={(e) => handleActionClick(e, patient)}
            className={`w-full px-3 py-2 rounded-md font-semibold text-white transition-all text-xs mt-1 ${
              statusInfo.status === "completed"
                ? "bg-green-600 hover:bg-green-700 hover:shadow-md"
                : statusInfo.status === "in-progress"
                  ? "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                  : "bg-yellow-600 hover:bg-yellow-700 hover:shadow-md"
            }`}
          >
            {statusInfo.action}
          </button>
        </div>

        {/* RIGHT: Details Panel (65%) */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Header */}
          <div className="mb-4 pb-3 border-b border-border">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase">PATIENT DETAILS</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Patient Code</p>
                <p className="font-semibold text-slate-900 dark:text-white">{patient.patientCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                <p className="font-semibold text-slate-900 dark:text-white text-xs">{statusInfo.label}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Age</p>
                <p className="font-semibold text-slate-900 dark:text-white">{patient.age}y</p>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="space-y-3 flex-1">
            <div>
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">MEDICAL HISTORY</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Previous Meds</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {previousTherapies.length > 0 ? previousTherapies.join(", ") : "None"}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Comorbidities</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {comorbidities.length > 0 ? comorbidities.join(", ") : "None"}
                  </p>
                </div>
              </div>
            </div>

            {/* Assessment Timeline */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase">ASSESSMENT STATUS</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-1">
                  <span className="text-sm">{patient.hasBaseline ? "✅" : "⭕"}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Baseline</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{patient.hasBaseline ? "✓" : "Pending"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-1">
                  <span className="text-sm">{patient.hasFollowUp ? "✅" : "⭕"}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Follow-up</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{patient.hasFollowUp ? "✓" : "Pending"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-border mt-2">
            <Button 
              size="sm"
              className="w-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-xs h-8"
              onClick={(e) => handleActionClick(e, patient)}
            >
              View Details →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, doctor, loading, logout } = useAuth()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithStatus[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [pagination, setPagination] = useState({ offset: 0, limit: 15, hasMore: false })
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
      router.push("/login?from=/dashboard")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !db) return

    // Set up real-time listener for patient list
    // Optimized query: Use limit to fetch only necessary patients (pagination-aware)
    // Fetching limit + 1 to check if hasMore
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
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white dark:bg-slate-950">
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
