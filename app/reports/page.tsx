"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ReportsPage() {
  const { user, doctor, loading } = useAuth()
  const router = useRouter()
  const [reportData, setReportData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchReportData = async () => {
      if (!user) return

      try {
        // Fetch all patients for this doctor
        const patientsQuery = query(collection(db, "patients"), where("doctorId", "==", user.uid))
        const patientsSnapshot = await getDocs(patientsQuery)
        const patients = patientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Patient[]

        // Fetch baseline and follow-up data for each patient
        const reports = await Promise.all(
          patients.map(async (patient) => {
            const baselineQuery = query(collection(db, "baselineData"), where("patientId", "==", patient.id))
            const baselineSnapshot = await getDocs(baselineQuery)
            const baseline = baselineSnapshot.empty
              ? null
              : ({ ...baselineSnapshot.docs[0].data(), id: baselineSnapshot.docs[0].id } as any)

            const followUpQuery = query(collection(db, "followUpData"), where("patientId", "==", patient.id))
            const followUpSnapshot = await getDocs(followUpQuery)
            const followUp = followUpSnapshot.empty
              ? null
              : ({ ...followUpSnapshot.docs[0].data(), id: followUpSnapshot.docs[0].id } as any)

            return { patient, baseline, followUp }
          }),
        )

        setReportData(reports)
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchReportData()
  }, [user])

  const exportExcel = () => {
    const completeReports = reportData.filter((r) => r.baseline && r.followUp)

    if (completeReports.length === 0) {
      alert("No complete trials to export")
      return
    }

    const headers = [
      "Patient Code",
      "Age",
      "Gender",
      "Duration of Diabetes",
      "Baseline HbA1c (%)",
      "Follow-up HbA1c (%)",
      "HbA1c Change",
      "Baseline FPG (mg/dL)",
      "Follow-up FPG (mg/dL)",
      "FPG Change",
      "Baseline Weight (kg)",
      "Follow-up Weight (kg)",
      "Weight Change (kg)",
      "Compliance",
      "Efficacy",
      "Tolerability",
    ]

    const rows = completeReports.map(({ patient, baseline, followUp }) => [
      patient.patientCode,
      patient.age,
      patient.gender,
      patient.durationOfDiabetes,
      baseline.hba1c,
      followUp.hba1c,
      (followUp.hba1c - baseline.hba1c).toFixed(1),
      baseline.fpg,
      followUp.fpg,
      (followUp.fpg - baseline.fpg).toFixed(1),
      baseline.weight,
      followUp.weight,
      (followUp.weight - baseline.weight).toFixed(1),
      followUp.compliance,
      followUp.efficacy,
      followUp.tolerability,
    ])

    // Create CSV content (Excel can import CSV)
    const csv = [headers.join(","), ...rows.map((row) => row.map(cell => `"${cell}"`).join(","))].join("\n")

    // Create blob with Excel MIME type
    const blob = new Blob([csv], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kollectcare-trial-data-${new Date().toISOString().split("T")[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const completeReports = reportData.filter((r) => r.baseline && r.followUp)

    if (completeReports.length === 0) {
      alert("No complete trials to export")
      return
    }

    const headers = [
      "Patient Code",
      "Age",
      "Gender",
      "Duration of Diabetes",
      "Baseline HbA1c",
      "Follow-up HbA1c",
      "HbA1c Change",
      "Baseline FPG",
      "Follow-up FPG",
      "FPG Change",
      "Baseline Weight",
      "Follow-up Weight",
      "Weight Change",
      "Compliance",
      "Efficacy",
      "Tolerability",
    ]

    const rows = completeReports.map(({ patient, baseline, followUp }) => [
      patient.patientCode,
      patient.age,
      patient.gender,
      patient.durationOfDiabetes,
      baseline.hba1c,
      followUp.hba1c,
      (followUp.hba1c - baseline.hba1c).toFixed(1),
      baseline.fpg,
      followUp.fpg,
      (followUp.fpg - baseline.fpg).toFixed(1),
      baseline.weight,
      followUp.weight,
      (followUp.weight - baseline.weight).toFixed(1),
      followUp.compliance,
      followUp.efficacy,
      followUp.tolerability,
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kollectcare-trial-data-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const completeTrials = reportData.filter((r) => r.baseline && r.followUp).length
  const inProgressTrials = reportData.filter((r) => r.baseline && !r.followUp).length
  const notStartedTrials = reportData.filter((r) => !r.baseline).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
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
          <h1 className="text-3xl font-bold text-balance">Trial Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Overview of all clinical trial data</p>
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
                    <p className="text-sm text-muted-foreground">Complete Trials</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{completeTrials}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-3xl font-bold mt-1 text-amber-600">{inProgressTrials}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Not Started</p>
                    <p className="text-3xl font-bold mt-1 text-muted-foreground">{notStartedTrials}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download complete trial data in various formats</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button onClick={exportExcel} disabled={completeTrials === 0}>
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
                  disabled={completeTrials === 0}
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

            {/* Trial Results Summary */}
            {completeTrials > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Aggregate Results</CardTitle>
                  <CardDescription>Average outcomes across all completed trials</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. HbA1c Reduction</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(
                          reportData
                            .filter((r) => r.baseline && r.followUp)
                            .reduce((sum, r) => sum + (r.baseline.hba1c - r.followUp.hba1c), 0) / completeTrials
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
                            .reduce((sum, r) => sum + (r.baseline.fpg - r.followUp.fpg), 0) / completeTrials
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
                            .reduce((sum, r) => sum + (r.followUp.weight - r.baseline.weight), 0) / completeTrials
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
                <CardDescription>Overview of all enrolled patients and their trial progress</CardDescription>
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
