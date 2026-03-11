"use client"

import type React from "react"

import { useState, memo, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, writeBatch, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"
import type { BaselineData } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { sanitizeObject } from "@/lib/sanitize"
import { logError } from "@/lib/error-tracking"

// Validate date input: ensure year is 4 digits (1900-2100), month 1-12, day valid for month
const validateDateInput = (value: string): string => {
  if (!value) return ""
  
  // Only validate dates in YYYY-MM-DD format
  const dateRegex = /^\d{0,4}(-\d{0,2})?(-\d{0,2})?$/
  if (!dateRegex.test(value)) return "" // Invalid format, clear it
  
  const parts = value.split("-")
  
  // Validate year (if provided)
  if (parts[0] && parts[0].length > 4) {
    return value.substring(0, 4) // Limit to 4 digits
  }
  if (parts[0] && parts[0].length === 4) {
    const year = parseInt(parts[0])
    if (year < 1900 || year > 2100) return "" // Invalid year range
  }
  
  // Validate month (if provided)
  if (parts[1]) {
    if (parts[1].length > 2) {
      return parts[0] + "-" + parts[1].substring(0, 2) // Limit to 2 digits
    }
    const month = parseInt(parts[1])
    if (month > 12) return parts[0] + "-12" // Max month is 12
    if (month < 1 && parts[1].length === 2) return parts[0] + "-01" // Min month is 01
  }
  
  // Validate day (if provided)
  if (parts[2]) {
    if (parts[2].length > 2) {
      return parts[0] + "-" + parts[1] + "-" + parts[2].substring(0, 2) // Limit to 2 digits
    }
    const day = parseInt(parts[2])
    if (day > 31) return parts[0] + "-" + parts[1] + "-31" // Max day is 31
    if (day < 1 && parts[2].length === 2) return parts[0] + "-" + parts[1] + "-01" // Min day is 01
  }
  
  return value
}

interface BaselineFormProps {
  patientId: string
  existingData: BaselineData | null
  patientBaselineVisitDate?: string
  patientWeight?: number | null
  onSuccess: () => void
}

export const BaselineForm = memo(function BaselineForm({ patientId, existingData, patientBaselineVisitDate, patientWeight, onSuccess }: BaselineFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const submitLockRef = useRef(false)

  const [formData, setFormData] = useState({
    baselineVisitDate: (existingData as any)?.baselineVisitDate || "",
    // SECTION F - Clinical & Lab Parameters
    hba1c: existingData?.hba1c?.toString() || "",
    fpg: existingData?.fpg?.toString() || "",
    ppg: existingData?.ppg?.toString() || "",
    weight: existingData?.weight?.toString() || "",
    bloodPressureSystolic: existingData?.bloodPressureSystolic?.toString() || "",
    bloodPressureDiastolic: existingData?.bloodPressureDiastolic?.toString() || "",
    heartRate: (existingData as any)?.heartRate?.toString() || "",
    serumCreatinine: existingData?.serumCreatinine?.toString() || "",
    egfr: existingData?.egfr?.toString() || "",
    urinalysisType: existingData?.urinalysis?.includes("Abnormal") ? "Abnormal" : (existingData?.urinalysis || ""),
    urinalysisSpecify: (existingData as any)?.urinalysisSpecify || "",
    
    // SECTION G - Treatment & Counseling
    dosePrescribed: existingData?.dosePrescribed || "",
    treatmentInitiationDate: (existingData as any)?.treatmentInitiationDate || "",
  })

  useEffect(() => {
    if (!patientId || !db) return

    const prefillFromPatient = async () => {
      try {
        const patientRef = doc(db, "patients", patientId)
        const patientSnap = await getDoc(patientRef)
        if (!patientSnap.exists()) return

        const patientData = patientSnap.data() as any
        const baselineVisitDate = patientData?.baselineVisitDate || ""
        const baselineWeight =
          typeof patientData?.weight === "number" && Number.isFinite(patientData.weight)
            ? patientData.weight.toString()
            : ""

        setFormData((prev) => ({
          ...prev,
          baselineVisitDate: baselineVisitDate || prev.baselineVisitDate,
          weight: baselineWeight || prev.weight,
          treatmentInitiationDate: prev.treatmentInitiationDate || baselineVisitDate || prev.treatmentInitiationDate,
        }))
      } catch {
        // Ignore prefill failures and continue with manual entry.
      }
    }

    void prefillFromPatient()
  }, [patientId])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      baselineVisitDate: patientBaselineVisitDate || prev.baselineVisitDate,
      weight:
        typeof patientWeight === "number" && Number.isFinite(patientWeight)
          ? patientWeight.toString()
          : prev.weight,
    }))
  }, [patientBaselineVisitDate, patientWeight])

  const [counseling, setCounseling] = useState({
    dietAndLifestyle: (existingData as any)?.counseling?.dietAndLifestyle ?? existingData?.dietAdvice ?? false,
    hypoglycemiaAwareness: (existingData as any)?.counseling?.hypoglycemiaAwareness ?? false,
    utiGenitialInfectionAwareness: (existingData as any)?.counseling?.utiGenitialInfectionAwareness ?? false,
    hydrationAdvice: (existingData as any)?.counseling?.hydrationAdvice ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double-submission
    if (submitLockRef.current || loading) {
      return
    }
    submitLockRef.current = true

    // CRITICAL: Verify user is loaded and has uid before saving
    if (!user?.uid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not authenticated. Please refresh the page.",
      })
      submitLockRef.current = false
      return
    }

    // Show loading immediately
    setLoading(true)
    const startTime = Date.now()

    // Define validationErrors outside conditional so it's always available
    const validationErrors: string[] = []

    try {
      // VALIDATION PHASE 1: Check required fields
      if (!formData.hba1c) validationErrors.push("HbA1c is required")
      if (!formData.fpg) validationErrors.push("FPG is required")
      if (!formData.weight) validationErrors.push("Weight is required")
      if (!formData.baselineVisitDate) validationErrors.push("Baseline visit date is required")
      if (!formData.bloodPressureSystolic) validationErrors.push("BP Systolic is required")
      if (!formData.bloodPressureDiastolic) validationErrors.push("BP Diastolic is required")
      if (!formData.dosePrescribed) validationErrors.push("Dose prescribed is required")
      if (!formData.treatmentInitiationDate) validationErrors.push("Treatment initiation date is required")

      if (validationErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: validationErrors.join(", "),
        })
        return
      }

      // VALIDATION PHASE 2: Parse and validate numeric ranges
      const hba1c = formData.hba1c ? Number.parseFloat(formData.hba1c) : NaN
      const fpg = formData.fpg ? Number.parseFloat(formData.fpg) : NaN
      const weight = formData.weight ? Number.parseFloat(formData.weight) : NaN
      const bpSystolic = formData.bloodPressureSystolic ? Number.parseInt(formData.bloodPressureSystolic) : NaN
      const bpDiastolic = formData.bloodPressureDiastolic ? Number.parseInt(formData.bloodPressureDiastolic) : NaN

      const rangeErrors: string[] = []
      
      if (isNaN(hba1c) || hba1c < 4 || hba1c > 15) rangeErrors.push("HbA1c must be between 4-15%")
      if (isNaN(fpg) || fpg < 50 || fpg > 500) rangeErrors.push("FPG must be between 50-500 mg/dL")
      if (isNaN(weight) || weight < 30 || weight > 200) rangeErrors.push("Weight must be between 30-200 kg")
      if (isNaN(bpSystolic) || bpSystolic < 70 || bpSystolic > 200) rangeErrors.push("BP Systolic must be between 70-200 mmHg")
      if (isNaN(bpDiastolic) || bpDiastolic < 40 || bpDiastolic > 130) rangeErrors.push("BP Diastolic must be between 40-130 mmHg")

      if (formData.urinalysisType === "Abnormal" && !formData.urinalysisSpecify) {
        rangeErrors.push("Please specify abnormality for urinalysis")
      }

      if (rangeErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Invalid Values",
          description: rangeErrors.join(", "),
        })
        return
      }

      // Sanitize text inputs
      const sanitizedFormData = sanitizeObject(formData, ['dosePrescribed', 'urinalysisSpecify'])

      // Parse numeric values
      const hba1cValue = Number.parseFloat(formData.hba1c)
      const fpgValue = Number.parseFloat(formData.fpg)
      const weightValue = Number.parseFloat(formData.weight)
      const bpSystolicValue = Number.parseInt(formData.bloodPressureSystolic)
      const bpDiastolicValue = Number.parseInt(formData.bloodPressureDiastolic)

      const data = {
        patientId,
        doctorId: user?.uid || "",
        baselineVisitDate: formData.baselineVisitDate,
        
        // Clinical Parameters
        hba1c: hba1cValue,
        fpg: fpgValue,
        ppg: formData.ppg ? Number.parseFloat(formData.ppg) : null,
        weight: weightValue,
        bloodPressureSystolic: bpSystolicValue,
        bloodPressureDiastolic: bpDiastolicValue,
        heartRate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
        serumCreatinine: formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : null,
        egfr: formData.egfr ? Number.parseFloat(formData.egfr) : null,
        urinalysis: formData.urinalysisType === "Abnormal" && sanitizedFormData.urinalysisSpecify 
          ? `Abnormal: ${sanitizedFormData.urinalysisSpecify}`
          : "Normal",
        
        // Treatment & Counseling
        dosePrescribed: sanitizedFormData.dosePrescribed,
        treatmentInitiationDate: formData.treatmentInitiationDate,
        
        // Structured counseling
        counseling,
        
        // Legacy fields for backward compatibility
        dietAdvice: counseling.dietAndLifestyle,
        counselingProvided: Object.values(counseling).some(v => v),
        
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      try {
        // Save to Firebase in a single batch (merge to preserve other fields)
        const patientDocRef = doc(db, "patients", patientId)
        const batch = writeBatch(db)
        batch.set(patientDocRef, {
          baseline: data,
          baselineVisitDate: formData.baselineVisitDate,
          updatedAt: new Date().toISOString()
        }, { merge: true })

        await batch.commit()

        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('✓ Form saved to Firebase')
        }
      } catch (error) {
        logError(error as Error, {
          action: "saveBaselineData",
          severity: "high"
        })
        toast({
          variant: "destructive",
          title: "Error saving data",
          description: error instanceof Error ? error.message : "Please try again.",
        })
        return
      }

      toast({
        title: "✓ Baseline data saved",
        description: "Week 0 assessment has been recorded.",
      })

      onSuccess()
    } catch (error) {
      logError(error as Error, {
        action: "saveBaselineData",
        severity: "high"
      })
      toast({
        variant: "destructive",
        title: "Error saving data",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      // Ensure minimum loading time of 400ms for visual feedback
      const elapsedTime = Date.now() - startTime
      const minimumLoadingTime = 400
      if (elapsedTime < minimumLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime))
      }
      setLoading(false)
      submitLockRef.current = false
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baseline Clinical Assessment (Week 0)</CardTitle>
        <CardDescription>Record initial clinical measurements and treatment plan per KC MeSempa CRF</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg">Baseline Visit</h3>
            <div className="space-y-2">
              <Label htmlFor="baselineVisitDate">Baseline Visit Date *</Label>
              <Input
                id="baselineVisitDate"
                type="date"
                value={formData.baselineVisitDate}
                aria-label="Baseline visit date at week zero required"
                aria-required="true"
                readOnly
                required
              />
              <p className="text-xs text-muted-foreground">Managed from Patient Info tab.</p>
            </div>
          </div>

          {/* SECTION F - CLINICAL & LAB PARAMETERS */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Clinical & Laboratory Parameters</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hba1c">HbA1c (%) *</Label>
                <Input
                  id="hba1c"
                  type="number"
                  step="0.1"
                  placeholder="7.5"
                  value={formData.hba1c}
                  onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })}
                  aria-label="HbA1c percentage required"
                  aria-required="true"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fpg">FPG (mg/dL) *</Label>
                <Input
                  id="fpg"
                  type="number"
                  placeholder="140"
                  value={formData.fpg}
                  onChange={(e) => setFormData({ ...formData, fpg: e.target.value })}                  aria-label="Fasting plasma glucose in milligrams per deciliter required"
                  aria-required="true"                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppg">PPG (mg/dL)</Label>
                <Input
                  id="ppg"
                  type="number"
                  placeholder="180"
                  value={formData.ppg}
                  onChange={(e) => setFormData({ ...formData, ppg: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={formData.weight}
                  readOnly
                  required
                />
                <p className="text-xs text-muted-foreground">Managed from Patient Info tab.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpSys">BP Systolic (mmHg) *</Label>
                <Input
                  id="bpSys"
                  type="number"
                  placeholder="130"
                  value={formData.bloodPressureSystolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpDia">BP Diastolic (mmHg) *</Label>
                <Input
                  id="bpDia"
                  type="number"
                  placeholder="85"
                  value={formData.bloodPressureDiastolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creatinine">Serum Creatinine (mg/dL)</Label>
                <Input
                  id="creatinine"
                  type="number"
                  step="0.01"
                  placeholder="1.0"
                  value={formData.serumCreatinine}
                  onChange={(e) => setFormData({ ...formData, serumCreatinine: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="egfr">eGFR (mL/min/1.73m²)</Label>
                <Input
                  id="egfr"
                  type="number"
                  placeholder="90"
                  value={formData.egfr}
                  onChange={(e) => setFormData({ ...formData, egfr: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urinalysis">Urinalysis *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="urinalysisNormal"
                    name="urinalysis"
                    value="Normal"
                    checked={formData.urinalysisType === "Normal"}
                    onChange={(e) => setFormData({ ...formData, urinalysisType: e.target.value, urinalysisSpecify: "" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="urinalysisNormal" className="font-normal cursor-pointer">Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="urinalysisAbnormal"
                    name="urinalysis"
                    value="Abnormal"
                    checked={formData.urinalysisType === "Abnormal"}
                    onChange={(e) => setFormData({ ...formData, urinalysisType: e.target.value })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="urinalysisAbnormal" className="font-normal cursor-pointer">Abnormal (specify)</Label>
                </div>
              </div>
              {/* Conditional field for abnormal specification */}
              {formData.urinalysisType === "Abnormal" && (
                <Input
                  placeholder="Please specify abnormality..."
                  value={formData.urinalysisSpecify}
                  onChange={(e) => setFormData({ ...formData, urinalysisSpecify: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* SECTION G - TREATMENT & COUNSELING */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">Treatment & Counseling</h3>
            
            <div className="space-y-2">
              <Label htmlFor="dose">KC MeSempa Dose Prescribed *</Label>
              <select
                id="dose"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.dosePrescribed}
                onChange={(e) => setFormData({ ...formData, dosePrescribed: e.target.value })}
                required
              >
                <option value="">Select dose...</option>
                <option value="Empagliflozin 10mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg">Empagliflozin 10mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg</option>
                <option value="Empagliflozin 25mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg">Empagliflozin 25mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initDate">Treatment Initiation Date *</Label>
              <Input
                id="initDate"
                type="date"
                value={formData.treatmentInitiationDate}
                onChange={(e) => setFormData({ ...formData, treatmentInitiationDate: validateDateInput(e.target.value) })}
                aria-label="Date when treatment was initiated required"
                aria-required="true"
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Counseling Provided (select all applicable)</Label>
              <div className="space-y-2 pl-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dietAdvice"
                    checked={counseling.dietAndLifestyle}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, dietAndLifestyle: checked as boolean })}
                  />
                  <Label htmlFor="dietAdvice" className="cursor-pointer font-normal">
                    Diet & lifestyle advice
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hypoglycemia"
                    checked={counseling.hypoglycemiaAwareness}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, hypoglycemiaAwareness: checked as boolean })}
                  />
                  <Label htmlFor="hypoglycemia" className="cursor-pointer font-normal">
                    Hypoglycemia awareness
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="utiAdvice"
                    checked={counseling.utiGenitialInfectionAwareness}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, utiGenitialInfectionAwareness: checked as boolean })}
                  />
                  <Label htmlFor="utiAdvice" className="cursor-pointer font-normal">
                    UTI / genital infection awareness
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hydration"
                    checked={counseling.hydrationAdvice}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, hydrationAdvice: checked as boolean })}
                  />
                  <Label htmlFor="hydration" className="cursor-pointer font-normal">
                    Hydration advice (important for SGLT-2 inhibitors)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Saving...
                </>
              ) : (
                "Save Assessment"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
})
