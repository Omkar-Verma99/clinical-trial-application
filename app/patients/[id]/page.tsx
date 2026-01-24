"use client"

import { useEffect, useState, useCallback, useMemo, Suspense, lazy } from "react"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { doc, onSnapshot, query, collection, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, BaselineData, FollowUpData } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { downloadPatientPDF, downloadCSV, downloadExcel } from "@/lib/pdf-export"
import { toast } from "@/hooks/use-toast"
import { BaselineForm } from "@/components/baseline-form"
import { FollowUpForm } from "@/components/followup-form"

// Lazy load ComparisonView to reduce initial bundle
const ComparisonView = lazy(() => import("@/components/comparison-view").then(mod => ({ default: mod.ComparisonView })))

// Lazy load wrapper component
const ComparisonViewLoader = ({ baseline, followUp, patient, exporting, onExport }: any) => (
  <Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
    <ComparisonView baseline={baseline} followUp={followUp} patient={patient} />
  </Suspense>
)

interface Props {
  params: Promise<{ id: string }>
}

export default function PatientDetailPage({ params }: Props) {
  const { user, doctor, logout } = useAuth()
  const [patientId, setPatientId] = useState<string>("")
  const [patient, setPatient] = useState<Patient | null>(null)
  const [baseline, setBaseline] = useState<BaselineData | null>(null)
  const [followUp, setFollowUp] = useState<FollowUpData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    params.then((p) => setPatientId(p.id))
  }, [params])

  useEffect(() => {
    if (!patientId || !user?.uid) return

    setLoading(true)
    const unsubscribers: (() => void)[] = []

    // Try nested structure first, then fall back to top-level
    const nestedPatientRef = doc(db, `doctors/${user.uid}/patients/${patientId}`)
    const topLevelPatientRef = doc(db, `patients/${patientId}`)

    const unsubPatient = onSnapshot(
      nestedPatientRef,
      (snap) => {
        if (snap.exists()) {
          setPatient({ id: snap.id, ...snap.data() } as Patient)
          setLoading(false)
        } else {
          // Fall back to top-level if nested doesn't exist
          const unsubTopLevel = onSnapshot(
            topLevelPatientRef,
            (topSnap) => {
              if (topSnap.exists()) {
                setPatient({ id: topSnap.id, ...topSnap.data() } as Patient)
              } else {
                setPatient(null)
              }
              setLoading(false)
            },
            (error) => {
              console.error("Error fetching patient:", error)
              setLoading(false)
            }
          )
          unsubscribers.push(unsubTopLevel)
        }
      },
      (error) => {
        console.error("Error fetching patient:", error)
        setLoading(false)
      }
    )
    unsubscribers.push(unsubPatient)

    // Fetch baseline data from top-level collection with real-time listener
    const baselineQuery = query(
      collection(db, "baselineData"),
      where("patientId", "==", patientId)
    )
    const unsubBaseline = onSnapshot(
      baselineQuery,
      (snap) => {
        if (snap.docs.length > 0) {
          setBaseline({ id: snap.docs[0].id, ...snap.docs[0].data() } as BaselineData)
        } else {
          // Also try nested structure
          const nestedBaselineRef = doc(db, `doctors/${user.uid}/patients/${patientId}/assessments/baseline`)
          const unsubNestedBaseline = onSnapshot(
            nestedBaselineRef,
            (nestedSnap) => {
              if (nestedSnap.exists()) {
                setBaseline({ id: nestedSnap.id, ...nestedSnap.data() } as BaselineData)
              } else {
                setBaseline(null)
              }
            },
            (error) => {
              console.error("Error fetching baseline:", error)
            }
          )
          unsubscribers.push(unsubNestedBaseline)
        }
      },
      (error) => {
        console.error("Error fetching baseline:", error)
      }
    )
    unsubscribers.push(unsubBaseline)

    // Fetch follow-up data from top-level collection with real-time listener
    const followUpQuery = query(
      collection(db, "followUpData"),
      where("patientId", "==", patientId)
    )
    const unsubFollowUp = onSnapshot(
      followUpQuery,
      (snap) => {
        if (snap.docs.length > 0) {
          setFollowUp({ id: snap.docs[0].id, ...snap.docs[0].data() } as FollowUpData)
        } else {
          // Also try nested structure
          const nestedFollowUpRef = doc(db, `doctors/${user.uid}/patients/${patientId}/assessments/followup`)
          const unsubNestedFollowUp = onSnapshot(
            nestedFollowUpRef,
            (nestedSnap) => {
              if (nestedSnap.exists()) {
                setFollowUp({ id: nestedSnap.id, ...nestedSnap.data() } as FollowUpData)
              } else {
                setFollowUp(null)
              }
            },
            (error) => {
              console.error("Error fetching follow-up:", error)
            }
          )
          unsubscribers.push(unsubNestedFollowUp)
        }
      },
      (error) => {
        console.error("Error fetching follow-up:", error)
      }
    )
    unsubscribers.push(unsubFollowUp)

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [patientId, user?.uid])

  const handleExportPDF = useCallback(async () => {
    if (!patient) return

    setExporting(true)
    try {
      await downloadPatientPDF(patient, baseline, followUp, doctor)
      toast({
        title: "Success",
        description: "Patient data exported to PDF successfully",
      })
    } catch (error) {
      console.error("PDF export error:", error)
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }, [patient, baseline, followUp, doctor])

  const handleExportCSV = useCallback(() => {
    if (!patient) return
    try {
      downloadCSV(patient, baseline, followUp, doctor)
      toast({
        title: "Success",
        description: "Patient data exported to CSV successfully",
      })
    } catch (error) {
      console.error("CSV export error:", error)
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      })
    }
  }, [patient, baseline, followUp, doctor])

  const handleExportExcel = useCallback(() => {
    if (!patient) return
    try {
      downloadExcel(patient, baseline, followUp, doctor)
      toast({
        title: "Success",
        description: "Patient data exported to Excel successfully",
      })
    } catch (error) {
      console.error("Excel export error:", error)
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      })
    }
  }, [patient, baseline, followUp, doctor])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Patient not found</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-balance">Patient: {patient.patientCode}</h1>
          <p className="text-muted-foreground mt-1">
            {patient.age} years • {patient.gender} • {patient.durationOfDiabetes} years with diabetes
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="baseline">Baseline</TabsTrigger>
            <TabsTrigger value="followup">Follow-up</TabsTrigger>
            <TabsTrigger value="comparison" disabled={!baseline || !followUp}>
              Comparison
            </TabsTrigger>
          </TabsList>

          {activeTab === "overview" && (
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Profile</CardTitle>
                  <CardDescription>Anonymized patient information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Patient Code</p>
                      <p className="font-medium">{patient.patientCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Age / Gender</p>
                      <p className="font-medium">
                        {patient.age} years / {patient.gender}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration of Diabetes</p>
                      <p className="font-medium">{patient.durationOfDiabetes} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Previous Therapy</p>
                      <p className="font-medium">{Array.isArray(patient.previousTherapy) ? patient.previousTherapy.join(", ") : "None"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Comorbidities</p>
                      <p className="font-medium">
                        {patient.comorbidities && typeof patient.comorbidities === 'object'
                          ? Object.entries(patient.comorbidities)
                              .filter(([key, value]) => key !== 'other' && key !== 'ckdEgfrCategory' && value === true)
                              .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
                              .join(", ") || "None"
                          : "None"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Reason for Triple FDC</p>
                      <p className="font-medium">
                        {patient.reasonForTripleFDC && typeof patient.reasonForTripleFDC === 'object'
                          ? Object.entries(patient.reasonForTripleFDC)
                              .filter(([key, value]) => key !== 'other' && value === true)
                              .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'))
                              .join(", ") || "None"
                          : "None"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex flex-wrap gap-3">
                      {!baseline && <Button onClick={() => setActiveTab("baseline")}>Add Baseline Assessment</Button>}
                      {baseline && !followUp && (
                        <Button onClick={() => setActiveTab("followup")}>Add Follow-up Assessment</Button>
                      )}
                      {baseline && followUp && (
                        <Button onClick={() => setActiveTab("comparison")}>View Comparison</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === "baseline" && (
            <TabsContent value="baseline">
              <BaselineForm patientId={patient.id} existingData={baseline} onSuccess={() => setActiveTab("overview")} />
            </TabsContent>
          )}

          {activeTab === "followup" && (
            <TabsContent value="followup">
              {baseline ? (
                <FollowUpForm
                  patientId={patient.id}
                  existingData={followUp}
                  onSuccess={() => setActiveTab("comparison")}
                />
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Please complete baseline assessment first</p>
                  <Button className="mt-4" onClick={() => setActiveTab("baseline")}>
                    Go to Baseline
                  </Button>
                </Card>
              )}
            </TabsContent>
          )}

          {activeTab === "comparison" && (
            <TabsContent value="comparison">
              {baseline && followUp ? (
                <div className="space-y-4">
                  <Card className="bg-muted/30 p-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold">Export Data</h3>
                      <p className="text-sm text-muted-foreground">Download complete trial data in various formats</p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={handleExportPDF}
                          disabled={exporting}
                          className="gap-2 bg-purple-600 hover:bg-purple-700"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {exporting ? "Exporting PDF..." : "Export PDF"}
                        </Button>
                        <Button
                          onClick={handleExportCSV}
                          variant="outline"
                          className="gap-2"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export CSV
                        </Button>
                        <Button
                          onClick={handleExportExcel}
                          variant="outline"
                          className="gap-2"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export Excel
                        </Button>
                      </div>
                    </div>
                  </Card>
                  <ComparisonViewLoader baseline={baseline} followUp={followUp} patient={patient} exporting={exporting} onExport={handleExportPDF} />
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Both baseline and follow-up data required for comparison</p>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
