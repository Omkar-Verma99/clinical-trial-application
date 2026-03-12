"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  downloadQuestionAnswerDynamicCsv,
  downloadQuestionAnswerDynamicExcel,
} from "@/lib/flat-export"

export default function ReportsPage() {
  const { user, doctor, loading } = useAuth()
  const router = useRouter()
  const [reportData, setReportData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [baselines, setBaselines] = useState<Map<string, any>>(new Map())
  const [followUpData, setFollowUpData] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchReportData = async () => {
      if (!user || !db) return

      try {
        // Fetch all patients for this doctor
        const patientsQuery = query(collection(db, "patients"), where("doctorId", "==", user.uid))
        const patientsSnapshot = await getDocs(patientsQuery)
        const patients = patientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Patient[]

        // Create maps to store baselines and followups
        const baselinesMap = new Map<string, any>()
        const followUpDataMap = new Map<string, any>()

        // Fetch baseline and follow-up data for each patient from V4 unified schema
        const reports = await Promise.all(
          patients.map(async (patient) => {
            try {
              // V4 Schema: Get baseline & followups from unified /patients/{id} document
              const patientDocRef = doc(db, "patients", patient.id)
              const patientSnapshot = await getDoc(patientDocRef)
              
              if (patientSnapshot.exists()) {
                const patientData = patientSnapshot.data()
                baselinesMap.set(patient.id, patientData.baseline || null)
                followUpDataMap.set(patient.id, patientData.followups || [])
                
                return {
                  patient,
                  baseline: patientData.baseline || null,
                  followUp: patientData.followups && patientData.followups.length > 0 ? patientData.followups[0] : null,
                  followUps: patientData.followups && patientData.followups.length > 0 ? patientData.followups : [],
                }
              }
              
              baselinesMap.set(patient.id, null)
              followUpDataMap.set(patient.id, [])
              return { patient, baseline: null, followUp: null, followUps: [] }
            } catch (patientError) {
              console.error(`Error fetching data for patient ${patient.id}:`, patientError)
              baselinesMap.set(patient.id, null)
              followUpDataMap.set(patient.id, [])
              return { patient, baseline: null, followUp: null, followUps: [] }
            }
          }),
        )

        setReportData(reports)
        setBaselines(baselinesMap)
        setFollowUpData(followUpDataMap)
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchReportData().catch((error) => {
      console.error("Uncaught error in fetchReportData:", error)
    })
  }, [user])

  const exportExcel = async () => {
    if (reportData.length === 0) {
      alert("No RWE patient data available to export")
      return
    }

    const patientsToExport = reportData.map((r) => r.patient)

    const doctorNamesByPatientId = new Map<string, string>()
    reportData.forEach((r) => {
      doctorNamesByPatientId.set(r.patient.id, r.patient.investigatorName || doctor?.name || "")
    })

    await downloadQuestionAnswerDynamicExcel(
      patientsToExport,
      baselines,
      followUpData,
      `kollectcare-rwe-data-${new Date().toISOString().split("T")[0]}.xlsx`,
      doctorNamesByPatientId,
    )
  }

  const exportCSV = () => {
    if (reportData.length === 0) {
      alert("No RWE patient data available to export")
      return
    }

    const patientsToExport = reportData.map((r) => r.patient)

    const doctorNamesByPatientId = new Map<string, string>()
    reportData.forEach((r) => {
      doctorNamesByPatientId.set(r.patient.id, r.patient.investigatorName || doctor?.name || "")
    })

    downloadQuestionAnswerDynamicCsv(
      patientsToExport,
      baselines,
      followUpData,
      `kollectcare-rwe-data-${new Date().toISOString().split("T")[0]}.csv`,
      doctorNamesByPatientId,
    )
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const completeStudies = reportData.filter((r) => r.baseline && r.followUp).length
  const inProgressStudies = reportData.filter((r) => r.baseline && !r.followUp).length
  const notStartedStudies = reportData.filter((r) => !r.baseline).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={28} height={28} className="h-7 w-7 rounded" />
            <span className="text-lg font-bold">Kollectcare</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-balance">RWE Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Overview of all RWE study data</p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                    <p className="text-3xl font-bold mt-1">{reportData.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Complete RWE Studies</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{completeStudies}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-3xl font-bold mt-1 text-amber-600">{inProgressStudies}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Not Started</p>
                    <p className="text-3xl font-bold mt-1 text-muted-foreground">{notStartedStudies}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download complete RWE study data in various formats</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button onClick={exportExcel} disabled={completeStudies === 0}>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export Excel
                </Button>
                <Button
                  onClick={exportCSV}
                  variant="outline"
                  disabled={completeStudies === 0}
                  className="bg-transparent"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV Data
                </Button>
              </CardContent>
            </Card>

            {/* RWE Results Summary */}
            {completeStudies > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Aggregate Results</CardTitle>
                  <CardDescription>Average outcomes across all completed RWE studies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. HbA1c Reduction</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(
                          reportData
                            .filter((r) => r.baseline && r.followUp)
                            .reduce((sum, r) => sum + (r.baseline.hba1c - r.followUp.hba1c), 0) / completeStudies
                        ).toFixed(2)}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. FPG Reduction</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(
                          reportData
                            .filter((r) => r.baseline && r.followUp)
                            .reduce((sum, r) => sum + (r.baseline.fpg - r.followUp.fpg), 0) / completeStudies
                        ).toFixed(1)}{" "}
                        mg/dL
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Weight Change</p>
                      <p className="text-2xl font-bold">
                        {(
                          reportData
                            .filter((r) => r.baseline && r.followUp)
                            .reduce((sum, r) => sum + (r.followUp.weight - r.baseline.weight), 0) / completeStudies
                        ).toFixed(1)}{" "}
                        kg
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Patient List with Status */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Status</CardTitle>
                <CardDescription>Overview of all enrolled patients and their RWE study progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.map(({ patient, baseline, followUp }) => {
                    const status = followUp ? "Complete" : baseline ? "In Progress" : "Not Started"
                    const statusColor =
                      status === "Complete"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : status === "In Progress"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"

                    return (
                      <Link key={patient.id} href={`/patients/${patient.id}`}>
                        <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{patient.patientCode}</p>
                              <p className="text-sm text-muted-foreground">
                                {patient.age}y • {patient.gender}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>{status}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
