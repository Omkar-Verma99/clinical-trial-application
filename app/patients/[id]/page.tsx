"use client"

import { useEffect, useState, useCallback, useMemo, Suspense, lazy, memo } from "react"
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

// OPTIMIZED: Memoize form components to prevent unnecessary re-renders
const MemoizedBaselineForm = memo(BaselineForm)
const MemoizedFollowUpForm = memo(FollowUpForm)

// Lazy load ComparisonView to reduce initial bundle
const ComparisonView = lazy(() => import("@/components/comparison-view").then(mod => ({ default: mod.ComparisonView })))

// Lazy load wrapper component
const ComparisonViewLoader = ({ baseline, followUp, patient, followUps = [], exporting, onExport }: any) => (
  <Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
    <ComparisonView baseline={baseline} followUp={followUp} patient={patient} followUps={followUps} />
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
  const [followUps, setFollowUps] = useState<FollowUpData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [exporting, setExporting] = useState(false)
  // Note: selectedFollowUp removed - now using dynamic visit tabs from followUps array

  useEffect(() => {
    params
      .then((p) => setPatientId(p.id))
      .catch((error) => {
        console.error("Failed to extract patient ID from params:", error)
      })
  }, [params])

  useEffect(() => {
    // CRITICAL: Check authentication BEFORE setting up any listeners
    if (!patientId || !user?.uid || !db) {
      return () => {} // No cleanup needed
    }

    setLoading(true)
    const unsubscribers: (() => void)[] = []

    // OPTIMIZED: Get patient document (now includes baseline and followups array)
    const patientRef = doc(db, `patients/${patientId}`)

    const unsubPatient = onSnapshot(
      patientRef,
      (snap) => {
        if (snap.exists()) {
          const patientData = snap.data() as Patient & { baseline?: BaselineData; followups?: FollowUpData[] }
          setPatient({ ...patientData, id: snap.id } as Patient)
          
          // Extract baseline and followups from unified patient document
          if (patientData.baseline) {
            setBaseline(patientData.baseline)
          }
          if (patientData.followups && Array.isArray(patientData.followups)) {
            setFollowUps(patientData.followups)
            // Dynamic visit tabs are now created from followUps array
          } else {
            setFollowUps([])
          }
        } else {
          setPatient(null)
          setBaseline(null)
          setFollowUps([])
        }
        setLoading(false)
      },
      (error) => {
        // CRITICAL: Ignore permission errors if user is logged out
        if (error.code === 'permission-denied' && !user?.uid) {
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.debug("Ignoring permission error after logout")
          }
          return
        }
        console.error("Error fetching patient:", error)
        setPatient(null)
        setLoading(false)
      }
    )
    unsubscribers.push(unsubPatient)

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [patientId, user?.uid])

  const handleExportPDF = useCallback(async () => {
    if (!patient) return

    setExporting(true)
    try {
      // Pass all followups for trend analysis
      await downloadPatientPDF(patient, baseline, followUps.length > 0 ? followUps[0] : null, followUps, doctor || undefined)
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
  }, [patient, baseline, followUps, doctor])

  const handleExportCSV = useCallback(() => {
    if (!patient) return
    try {
      downloadCSV(patient, baseline, followUps.length > 0 ? followUps[0] : null, doctor)
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
  }, [patient, baseline, followUps, doctor])

  const handleExportExcel = useCallback(() => {
    if (!patient) return
    try {
      downloadExcel(patient, baseline, followUps.length > 0 ? followUps[0] : null, doctor)
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
  }, [patient, baseline, followUps, doctor])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" disabled>← Back</Button>
              <div className="flex items-center gap-3">
                <Image src="/favicon-192x192.png" alt="Kollectcare" width={28} height={28} className="h-7 w-7 rounded" />
                <span className="text-lg font-bold">Kollectcare</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Patient Info Skeleton */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-7 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-96 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-32 h-10 bg-muted rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs Skeleton */}
          <Card>
            <CardHeader>
              <div className="h-10 w-64 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
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
          <TabsList className="grid w-full gap-0" style={{ gridTemplateColumns: `repeat(${3 + followUps.length + 1}, minmax(0, 1fr))` }}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="baseline">Baseline</TabsTrigger>
            
            {/* Dynamic Visit Tabs */}
            {followUps.length > 0 && followUps.map((_, index) => (
              <TabsTrigger key={`visit-${index}`} value={`visit-${index}`}>
                Visit {index + 1}
              </TabsTrigger>
            ))}
            
            <TabsTrigger value="comparison" disabled={!baseline || followUps.length === 0}>
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
                      {!baseline && (
                        <Button onClick={() => setActiveTab("baseline")}>
                          Add Baseline Assessment
                        </Button>
                      )}
                      
                      {baseline && followUps.length === 0 && (
                        <Button 
                          onClick={() => {
                            // Create first visit
                            const firstVisit: FollowUpData = {
                              visitNumber: 1,
                              visitDate: "",
                              hba1c: null as any,
                              fpg: null as any,
                              ppg: null as any,
                              weight: null as any,
                              bloodPressureSystolic: null as any,
                              bloodPressureDiastolic: null as any,
                              serumCreatinine: null as any,
                              egfr: null as any,
                              urinalysis: "",
                              efficacy: "",
                              tolerability: "",
                              compliance: "",
                              satisfaction: "",
                              comments: "",
                              actionTaken: [],
                              outcome: [],
                              adverseEvents: "",
                              status: "draft",
                            } as FollowUpData
                            setFollowUps([firstVisit])
                            setActiveTab("visit-0")
                          }}
                        >
                          + Add First Follow-up Visit
                        </Button>
                      )}
                      
                      {baseline && followUps.length > 0 && (
                        <>
                          <Button 
                            onClick={() => setActiveTab("visit-0")}
                          >
                            View/Edit Visits ({followUps.length})
                          </Button>
                          <Button 
                            onClick={() => setActiveTab("comparison")}
                          >
                            View Comparison
                          </Button>
                        </>
                      )}

                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === "baseline" && (
            <TabsContent value="baseline">
              <MemoizedBaselineForm patientId={patient.id} existingData={baseline} onSuccess={() => setActiveTab("overview")} />
            </TabsContent>
          )}

          {/* Dynamic Visit Tabs */}
          {followUps.map((visit, visitIndex) => (
            <TabsContent key={`visit-content-${visitIndex}`} value={`visit-${visitIndex}`}>
              {baseline ? (
                <div className="space-y-6">
                  {/* Form for this visit */}
                  <MemoizedFollowUpForm
                    patientId={patient.id}
                    existingData={visit}
                    baselineDate={patient.baselineVisitDate}
                    allFollowUps={followUps}
                    onSuccess={() => {
                      // Refresh and stay on this visit
                      setActiveTab(`visit-${visitIndex}`)
                    }}
                  />

                  {/* Divider */}
                  <div className="border-t pt-6" />

                  {/* Add New Visit Button - Only show if this is the last visit */}
                  {visitIndex === followUps.length - 1 && (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => {
                          // Create new empty visit entry
                          const newVisit: FollowUpData = {
                            visitNumber: followUps.length + 1,
                            visitDate: "",
                            hba1c: null as any,
                            fpg: null as any,
                            ppg: null as any,
                            weight: null as any,
                            bloodPressureSystolic: null as any,
                            bloodPressureDiastolic: null as any,
                            serumCreatinine: null as any,
                            egfr: null as any,
                            urinalysis: "",
                            efficacy: "",
                            tolerability: "",
                            compliance: "",
                            satisfaction: "",
                            comments: "",
                            actionTaken: [],
                            outcome: [],
                            adverseEvents: "",
                            status: "draft",
                          } as FollowUpData
                          
                          // Add to followUps and switch to new visit
                          const updatedFollowUps = [...followUps, newVisit]
                          setFollowUps(updatedFollowUps)
                          setActiveTab(`visit-${updatedFollowUps.length - 1}`)
                        }}
                        size="lg"
                        className="gap-2"
                      >
                        <span>+ ADD NEW VISIT (Visit {followUps.length + 1})</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Please complete baseline assessment first</p>
                  <Button className="mt-4" onClick={() => setActiveTab("baseline")}>
                    Go to Baseline
                  </Button>
                </Card>
              )}
            </TabsContent>
          ))}

          {/* Show form for first visit if no visits exist yet */}
          {baseline && followUps.length === 0 && activeTab !== "overview" && activeTab !== "baseline" && activeTab !== "comparison" && (
            <TabsContent value="new-visit">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add First Follow-up Visit</CardTitle>
                    <CardDescription>Complete the follow-up assessment</CardDescription>
                  </CardHeader>
                </Card>
                <MemoizedFollowUpForm
                  patientId={patient.id}
                  existingData={null}
                  baselineDate={patient.baselineVisitDate}
                  allFollowUps={[]}
                  onSuccess={() => {
                    setActiveTab("overview")
                  }}
                />
              </div>
            </TabsContent>
          )}

          {activeTab === "comparison" && (
            <TabsContent value="comparison">
              {baseline && followUps.length > 0 ? (
                <div className="space-y-4">
                  <ComparisonViewLoader baseline={baseline} followUp={followUps[0]} patient={patient} followUps={followUps} exporting={exporting} onExport={handleExportPDF} />
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
