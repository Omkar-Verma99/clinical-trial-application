"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useIndexedDBSync } from "@/hooks/use-indexed-db-sync"
import { sanitizeInput, sanitizeObject } from "@/lib/sanitize"
import { logError } from "@/lib/error-tracking"
import { useNetworkStatus } from "@/lib/network"
import Link from "next/link"

export default function AddPatientPage() {
  const { user, doctor } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const isOnline = useNetworkStatus()
  // NOTE: Pass empty string as patientId since we're creating a new patient
  // The real patientId will be generated after patient creation
  // This prevents real-time listeners from trying to sync non-existent data
  const { saveFormData } = useIndexedDBSync("")
  const [loading, setLoading] = useState(false)
  const [bmiMismatchWarning, setBmiMismatchWarning] = useState(false)

  const [formData, setFormData] = useState({
    patientCode: "",
    studySiteCode: doctor?.studySiteCode || "",
    investigatorName: doctor?.name || "",
    baselineVisitDate: new Date().toISOString().split('T')[0],
    age: "",
    gender: "",
    height: "",
    weight: "",
    bmi: "",
    bmiManuallyEdited: false,
    durationOfDiabetes: "",
    smokingStatus: "",
    alcoholIntake: "",
    physicalActivityLevel: "",
    reasonForTripleFDC: "",
  })

  const [diabetesComplications, setDiabetesComplications] = useState({
    neuropathy: false,
    retinopathy: false,
    nephropathy: false,
    cadOrStroke: false,
    none: false,
  })

  const [comorbidities, setComorbidities] = useState({
    hypertension: false,
    dyslipidemia: false,
    obesity: false,
    ascvd: false,
    heartFailure: false,
    chronicKidneyDisease: false,
    other: "",
    ckdEgfrCategory: "",
  })

  const [previousTreatmentType, setPreviousTreatmentType] = useState("")

  const [previousDrugClasses, setPreviousDrugClasses] = useState({
    metformin: false,
    sulfonylurea: false,
    dpp4Inhibitor: false,
    sglt2Inhibitor: false,
    tzd: false,
    insulin: false,
    other: "",
  })

  const [reasonForTripleFDC, setReasonForTripleFDC] = useState({
    inadequateGlycemicControl: false,
    weightConcerns: false,
    hypoglycemiaOnPriorTherapy: false,
    highPillBurden: false,
    poorAdherence: false,
    costConsiderations: false,
    physicianClinicalJudgment: false,
    other: "",
  })

  // Auto-calculate BMI
  const calculateBMI = (height: number, weight: number) => {
    if (height && weight) {
      const heightM = height / 100
      return (weight / (heightM * heightM)).toFixed(1)
    }
    return ""
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseFloat(e.target.value)
    setFormData(prev => ({ ...prev, height: e.target.value }))
    
    // Auto-calculate BMI if weight is set and BMI hasn't been manually edited
    if (height && formData.weight && !formData.bmiManuallyEdited) {
      const calculatedBMI = calculateBMI(height, parseFloat(formData.weight))
      setFormData(prev => ({ ...prev, bmi: calculatedBMI }))
      setBmiMismatchWarning(false)
    }
  }

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const weight = parseFloat(e.target.value)
    const height = parseFloat(formData.height) || 0
    
    setFormData(prev => ({ ...prev, weight: e.target.value }))
    
    // Auto-calculate BMI if height is set and BMI hasn't been manually edited
    if (height && weight && !formData.bmiManuallyEdited) {
      const calculatedBMI = calculateBMI(height, weight)
      setFormData(prev => ({ ...prev, bmi: calculatedBMI }))
      setBmiMismatchWarning(false)
    }
  }

  const handleBMIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bmi = e.target.value
    // Mark as manually edited if user changes BMI
    setFormData(prev => ({ 
      ...prev, 
      bmi,
      bmiManuallyEdited: bmi !== calculateBMI(parseFloat(formData.height) || 0, parseFloat(formData.weight) || 0)
    }))
  }

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault()
    if (!user || !user.uid || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not initialized or user not authenticated. Please refresh the page.",
      })
      return
    }

    // Check network connectivity (only required for full enrollment, not drafts)
    if (!isOnline && !saveAsDraft) {
      toast({
        variant: "destructive",
        title: "No Connection",
        description: "Please check your internet connection and try again.",
      })
      return
    }

    // SKIP VALIDATION FOR DRAFTS - user can save incomplete patient data
    if (!saveAsDraft) {
      // Validate required fields (only for full enrollment)
      const requiredFields = [
        { field: formData.patientCode, name: "Patient Code" },
        { field: formData.age, name: "Age" },
        { field: formData.gender, name: "Gender" },
        { field: formData.durationOfDiabetes, name: "Duration of Diabetes" },
        { field: previousTreatmentType, name: "Previous Treatment Type" },
      ]

      const missingFields = requiredFields.filter(f => !f.field).map(f => f.name)
      
      if (missingFields.length > 0) {
        toast({
          variant: "destructive",
          title: "Missing Required Fields",
          description: `Please fill in: ${missingFields.join(", ")}`,
        })
        return
      }

      // Check if at least one reason for triple FDC is selected
      if (!Object.values(reasonForTripleFDC).some(v => v)) {
        toast({
          variant: "destructive",
          title: "Missing Selection",
          description: "Please select at least one reason for KC MeSempa initiation",
        })
        return
      }

      // Validate BMI if provided
      const height = parseFloat(formData.height)
      const weight = parseFloat(formData.bmi)
      if (height && weight && bmiMismatchWarning) {
        toast({
          variant: "destructive",
          title: "BMI Validation Error",
          description: "The entered BMI does not match the calculated value from height/weight. Please correct the values.",
        })
        return
      }
    }

    setLoading(true)

    try {
      const selectedDrugClasses = [
        ...Object.entries(previousDrugClasses)
          .filter(([key, value]) => key !== "other" && value)
          .map(([key]) => key),
        ...(previousDrugClasses.other ? [sanitizeInput(previousDrugClasses.other)] : []),
      ]

      const selectedComorbidities = [
        ...Object.entries(comorbidities)
          .filter(([key, value]) => key !== "other" && key !== "ckdEgfrCategory" && value)
          .map(([key]) => key),
        ...(comorbidities.other ? [sanitizeInput(comorbidities.other)] : []),
      ]

      const selectedReasons = Object.entries(reasonForTripleFDC)
        .filter(([key, value]) => key !== "other" && value)
        .map(([key]) => key)
        .concat(reasonForTripleFDC.other ? [sanitizeInput(reasonForTripleFDC.other)] : [])

      // Sanitize text inputs
      const sanitizedFormData = sanitizeObject(formData, ['patientCode', 'studySiteCode', 'investigatorName', 'smokingStatus', 'alcoholIntake', 'physicalActivityLevel'])

      const patientData = {
        doctorId: user.uid,
        patientCode: sanitizedFormData.patientCode,
        studySiteCode: sanitizedFormData.studySiteCode,
        investigatorName: sanitizedFormData.investigatorName,
        baselineVisitDate: sanitizedFormData.baselineVisitDate,
        age: Number.parseInt(sanitizedFormData.age),
        gender: sanitizedFormData.gender,
        height: sanitizedFormData.height ? Number.parseFloat(sanitizedFormData.height) : null,
        weight: sanitizedFormData.weight ? Number.parseFloat(sanitizedFormData.weight) : null,
        bmi: sanitizedFormData.bmi ? Number.parseFloat(sanitizedFormData.bmi) : null,
        durationOfDiabetes: Number.parseFloat(sanitizedFormData.durationOfDiabetes),
        smokingStatus: sanitizedFormData.smokingStatus || null,
        alcoholIntake: sanitizedFormData.alcoholIntake || null,
        physicalActivityLevel: sanitizedFormData.physicalActivityLevel || null,
        
        // Diabetes complications
        diabetesComplications: Object.keys(diabetesComplications).some(key => diabetesComplications[key as keyof typeof diabetesComplications])
          ? diabetesComplications
          : null,
        
        // Comorbidities
        comorbidities: {
          hypertension: comorbidities.hypertension,
          dyslipidemia: comorbidities.dyslipidemia,
          obesity: comorbidities.obesity,
          ascvd: comorbidities.ascvd,
          heartFailure: comorbidities.heartFailure,
          chronicKidneyDisease: comorbidities.chronicKidneyDisease,
          ckdEgfrCategory: comorbidities.ckdEgfrCategory || null,
          other: selectedComorbidities.filter(c => !["hypertension", "dyslipidemia", "obesity", "ascvd", "heartFailure", "chronicKidneyDisease"].includes(c)),
        },
        
        // Prior therapy
        previousTreatmentType: previousTreatmentType,
        previousDrugClasses: Object.keys(previousDrugClasses)
          .filter(key => key !== "other")
          .reduce((acc, key) => {
            acc[key as keyof typeof previousDrugClasses] = previousDrugClasses[key as keyof typeof previousDrugClasses]
            return acc
          }, {} as any),
        
        // Reason for triple FDC
        reasonForTripleFDC: {
          inadequateGlycemicControl: reasonForTripleFDC.inadequateGlycemicControl,
          weightConcerns: reasonForTripleFDC.weightConcerns,
          hypoglycemiaOnPriorTherapy: reasonForTripleFDC.hypoglycemiaOnPriorTherapy,
          highPillBurden: reasonForTripleFDC.highPillBurden,
          poorAdherence: reasonForTripleFDC.poorAdherence,
          costConsiderations: reasonForTripleFDC.costConsiderations,
          physicianClinicalJudgment: reasonForTripleFDC.physicianClinicalJudgment,
          other: reasonForTripleFDC.other ? [sanitizeInput(reasonForTripleFDC.other)] : [],
        },
        
        // Legacy fields for backward compatibility
        previousTherapy: selectedDrugClasses,
        
        createdAt: new Date().toISOString(),
      }

      // CRITICAL: Save to IndexedDB FIRST (immediate, offline-safe)
      const patientId = `patient-${user.uid}-${Date.now()}`
      const idbResult = await saveFormData(
        patientId,
        'patient',
        patientData,
        saveAsDraft,
        []
      )

      if (!idbResult.success) {
        toast({
          variant: "destructive",
          title: "Error saving locally",
          description: idbResult.error || "Failed to save to local storage",
        })
        setLoading(false)
        return
      }

      // Only submit to Firebase if not draft
      if (!saveAsDraft) {
        try {
          const docRef = await addDoc(collection(db, "patients"), patientData)

          if (!docRef.id) {
            throw new Error("Failed to create patient record")
          }

          // Update IndexedDB with Firebase ID
          await saveFormData(
            patientId,
            'patient',
            { ...patientData, firebaseId: docRef.id },
            false,
            []
          )
        } catch (firebaseError) {
          // Don't fail - already saved locally, will sync in background
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.warn('Firebase save failed, will retry:', firebaseError)
          }
        }
      }

      const actionMsg = saveAsDraft ? "saved as draft" : "enrolled in the trial"
      toast({
        title: "Patient added successfully",
        description: `Patient ${formData.patientCode} has been ${actionMsg}.`,
      })

      if (!saveAsDraft) {
        await router.push("/dashboard")
      }
    } catch (error) {
      logError(error as Error, {
        action: "addPatient",
        severity: "high"
      })
      toast({
        variant: "destructive",
        title: "Error adding patient",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Enroll Patient in Trial</CardTitle>
            <CardDescription>KC MeSempa RWE Study - Case Record Form (CRF) Section A-E</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Patient Identification */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Patient Identification</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientCode">Patient Code *</Label>
                    <Input
                      id="patientCode"
                      placeholder="PT001 (Anonymized)"
                      value={formData.patientCode}
                      onChange={(e) => setFormData({ ...formData, patientCode: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Clinic-specific code. DO NOT use patient name.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baselineVisitDate">Baseline Visit Date (Week 0) *</Label>
                    <Input
                      id="baselineVisitDate"
                      type="date"
                      value={formData.baselineVisitDate}
                      onChange={(e) => setFormData({ ...formData, baselineVisitDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="studySiteCode">Study Site Code *</Label>
                    <Input
                      id="studySiteCode"
                      placeholder={doctor?.studySiteCode || "Your clinic name"}
                      value={formData.studySiteCode}
                      onChange={(e) => setFormData({ ...formData, studySiteCode: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Auto-filled from your profile. Can be changed per patient.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investigatorName">Investigator Name *</Label>
                    <Input
                      id="investigatorName"
                      placeholder={doctor?.name || "Your name"}
                      value={formData.investigatorName}
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">Auto-filled from your profile.</p>
                  </div>
                </div>
              </div>

              {/* Demographics & Lifestyle */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Demographics & Lifestyle</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years) *</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="45"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="170"
                      value={formData.height}
                      onChange={handleHeightChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={formData.weight}
                      onChange={handleWeightChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bmi">BMI (kg/m²)</Label>
                    <Input
                      id="bmi"
                      type="number"
                      step="0.1"
                      placeholder="Auto-calculated"
                      value={formData.bmi}
                      onChange={handleBMIChange}
                    />
                    <p className="text-xs text-muted-foreground">Auto-calculated, editable</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Gender *</Label>
                  <div className="flex gap-4">
                    {["Male", "Female", "Other"].map((gender) => (
                      <label key={gender} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={gender}
                          checked={formData.gender === gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          required
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{gender}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Smoking Status</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.smokingStatus}
                      onChange={(e) => setFormData({ ...formData, smokingStatus: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Never">Never</option>
                      <option value="Former">Former</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alcohol Intake</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.alcoholIntake}
                      onChange={(e) => setFormData({ ...formData, alcoholIntake: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="No">No</option>
                      <option value="Occasional">Occasional</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Physical Activity Level</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.physicalActivityLevel}
                      onChange={(e) => setFormData({ ...formData, physicalActivityLevel: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Sedentary">Sedentary</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Diabetes History & Phenotype */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Diabetes History & Phenotype</h3>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="durationOfDiabetes">Duration of Type 2 Diabetes (years) *</Label>
                  <Input
                    id="durationOfDiabetes"
                    type="number"
                    step="0.1"
                    placeholder="5.5"
                    value={formData.durationOfDiabetes}
                    onChange={(e) => setFormData({ ...formData, durationOfDiabetes: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Diabetes-Related Complications</Label>
                  <div className="space-y-2">
                    {Object.entries(diabetesComplications).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`complication-${key}`}
                          checked={value}
                          onCheckedChange={(checked) =>
                            setDiabetesComplications({ ...diabetesComplications, [key]: checked as boolean })
                          }
                        />
                        <Label htmlFor={`complication-${key}`} className="cursor-pointer font-normal">
                          {key === "cadOrStroke" ? "CAD / Stroke" : key.charAt(0).toUpperCase() + key.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comorbidities */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Comorbidities</h3>
                <div className="space-y-3">
                  {["hypertension", "dyslipidemia", "obesity", "ascvd", "heartFailure", "chronicKidneyDisease"].map((condition) => (
                    <div key={condition} className="flex items-center gap-2">
                      <Checkbox
                        id={condition}
                        checked={comorbidities[condition as keyof typeof comorbidities] as boolean}
                        onCheckedChange={(checked) =>
                          setComorbidities({ ...comorbidities, [condition]: checked as boolean })
                        }
                      />
                      <Label htmlFor={condition} className="cursor-pointer font-normal">
                        {condition === "ascvd" ? "ASCVD" : condition === "heartFailure" ? "Heart Failure" : condition === "chronicKidneyDisease" ? "Chronic Kidney Disease" : condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>

                {comorbidities.chronicKidneyDisease && (
                  <div className="space-y-2 mt-4">
                    <Label>If CKD present - Baseline eGFR Category</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={comorbidities.ckdEgfrCategory}
                      onChange={(e) => setComorbidities({ ...comorbidities, ckdEgfrCategory: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="≥90">≥90</option>
                      <option value="60–89">60–89</option>
                      <option value="45–59">45–59</option>
                      <option value="30–44">30–44</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label htmlFor="otherComorbidity">Other Comorbidities</Label>
                  <Input
                    id="otherComorbidity"
                    placeholder="Specify other conditions"
                    value={comorbidities.other}
                    onChange={(e) => setComorbidities({ ...comorbidities, other: e.target.value })}
                  />
                </div>
              </div>

              {/* Prior Anti-Diabetic Therapy */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Prior Anti-Diabetic Therapy</h3>

                <div className="space-y-2 mb-6">
                  <Label>Previous Treatment Type *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={previousTreatmentType}
                    onChange={(e) => setPreviousTreatmentType(e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="Drug-naïve">Drug-naïve</option>
                    <option value="Oral drugs only">Oral drugs only</option>
                    <option value="Insulin only">Insulin only</option>
                    <option value="Oral drugs + Insulin">Oral drugs + Insulin</option>
                  </select>
                </div>

                <div className="space-y-3 mb-6">
                  <Label>Previously Used Drug Classes</Label>
                  <div className="space-y-2">
                    {["metformin", "sulfonylurea", "dpp4Inhibitor", "sglt2Inhibitor", "tzd", "insulin"].map((drug) => (
                      <div key={drug} className="flex items-center gap-2">
                        <Checkbox
                          id={drug}
                          checked={previousDrugClasses[drug as keyof typeof previousDrugClasses] as boolean}
                          onCheckedChange={(checked) =>
                            setPreviousDrugClasses({ ...previousDrugClasses, [drug]: checked as boolean })
                          }
                        />
                        <Label htmlFor={drug} className="cursor-pointer font-normal">
                          {drug === "dpp4Inhibitor" ? "DPP-4 Inhibitor" : drug === "sglt2Inhibitor" ? "SGLT-2 Inhibitor" : drug === "tzd" ? "TZD" : drug.charAt(0).toUpperCase() + drug.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Reason for Initiating KC MeSempa *</Label>
                  <div className="space-y-2">
                    {[
                      { key: "inadequateGlycemicControl", label: "Inadequate glycemic control" },
                      { key: "weightConcerns", label: "Weight concerns" },
                      { key: "hypoglycemiaOnPriorTherapy", label: "Hypoglycemia on prior therapy" },
                      { key: "highPillBurden", label: "High pill burden" },
                      { key: "poorAdherence", label: "Poor adherence" },
                      { key: "costConsiderations", label: "Cost considerations" },
                      { key: "physicianClinicalJudgment", label: "Physician clinical judgment" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={key}
                          checked={reasonForTripleFDC[key as keyof typeof reasonForTripleFDC] as boolean}
                          onCheckedChange={(checked) =>
                            setReasonForTripleFDC({ ...reasonForTripleFDC, [key]: checked as boolean })
                          }
                        />
                        <Label htmlFor={key} className="cursor-pointer font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Input
                    placeholder="Other reasons"
                    value={reasonForTripleFDC.other}
                    onChange={(e) => setReasonForTripleFDC({ ...reasonForTripleFDC, other: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Enrolling Patient..." : "Enroll Patient"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  disabled={loading}
                  onClick={() => handleSubmit(new Event('click') as any, true)}
                >
                  Save as Draft
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
