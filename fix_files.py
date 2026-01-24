#!/usr/bin/env python3
import os

# Patient detail page content
patient_detail_content = '''\"use client\"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, BaselineData, FollowUpData } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { exportPatientPDF } from "@/lib/pdf-export"
import { toast } from "@/hooks/use-toast"
import BaselineForm from "@/components/baseline-form"
import FollowUpForm from "@/components/followup-form"
import ComparisonView from "@/components/comparison-view"

interface Props {
  params: Promise<{ id: string }>
}

export default function PatientDetailPage({ params }: Props) {
  const { user } = useAuth()
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

    const patientRef = doc(db, `doctors/${user.uid}/patients/${patientId}`)
    const unsubPatient = onSnapshot(
      patientRef,
      (snap) => {
        if (snap.exists()) {
          setPatient({ id: snap.id, ...snap.data() } as Patient)
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
    unsubscribers.push(unsubPatient)

    const baselineRef = doc(db, `doctors/${user.uid}/patients/${patientId}/assessments/baseline`)
    const unsubBaseline = onSnapshot(
      baselineRef,
      (snap) => {
        if (snap.exists()) {
          setBaseline({ id: snap.id, ...snap.data() } as BaselineData)
        } else {
          setBaseline(null)
        }
      },
      (error) => {
        console.error("Error fetching baseline:", error)
      }
    )
    unsubscribers.push(unsubBaseline)

    const followUpRef = doc(db, `doctors/${user.uid}/patients/${patientId}/assessments/followup`)
    const unsubFollowUp = onSnapshot(
      followUpRef,
      (snap) => {
        if (snap.exists()) {
          setFollowUp({ id: snap.id, ...snap.data() } as FollowUpData)
        } else {
          setFollowUp(null)
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

  const handleExportPDF = async () => {
    if (!patient) return

    setExporting(true)
    try {
      await exportPatientPDF(patient, baseline, followUp)
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
  }

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
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary-foreground">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.5" />
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xl font-bold">Kollectcare</span>
            </div>
          </div>
          <Button
            onClick={handleExportPDF}
            disabled={exporting}
            className="gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
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
                    <p className="font-medium">{patient.previousTherapy.join(", ")}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Comorbidities</p>
                    <p className="font-medium">{patient.comorbidities.join(", ") || "None"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Reason for Triple FDC</p>
                    <p className="font-medium">{patient.reasonForTripleFDC}</p>
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

          <TabsContent value="baseline">
            <BaselineForm patientId={patient.id} existingData={baseline} onSuccess={() => setActiveTab("overview")} />
          </TabsContent>

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

          <TabsContent value="comparison">
            {baseline && followUp ? (
              <ComparisonView baseline={baseline} followUp={followUp} patient={patient} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Both baseline and follow-up data required for comparison</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
'''

# Write patient detail file
with open("app/patients/[id]/page.tsx", "w", encoding="utf-8") as f:
    f.write(patient_detail_content)

print("✓ Created app/patients/[id]/page.tsx")

# Read the dashboard page to check its status
try:
    with open("app/dashboard/page.tsx", "r", encoding="utf-8") as f:
        dashboard_content = f.read()
    
    # Check if it has the broken return statement
    if "}" in dashboard_content and dashboard_content.count("return (") > 1:
        # Multiple returns - likely broken. Need to check lines around 311-313
        lines = dashboard_content.split("\n")
        if len(lines) > 310:
            context = "\n".join(lines[300:320])
            print(f"\n[Dashboard page context around line 311]:\n{context}")
    else:
        print("Dashboard file looks OK")
except Exception as e:
    print(f"Error reading dashboard: {e}")
