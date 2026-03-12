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
import { DateField } from "@/components/ui/date-field"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { sanitizeObject } from "@/lib/sanitize"
import { logError } from "@/lib/error-tracking"
import {
  ClinicalValidationRanges,
  DEFAULT_CLINICAL_VALIDATION_RANGES,
  normalizeClinicalValidationRanges,
} from "@/lib/clinical-ranges"

interface BaselineFormProps {
  patientId: string
  existingData: BaselineData | null
  patientBaselineVisitDate?: string
  patientWeight?: number | null
  doctorIdOverride?: string
  onSuccess: () => void
}

export const BaselineForm = memo(function BaselineForm({ patientId, existingData, patientBaselineVisitDate, patientWeight, doctorIdOverride, onSuccess }: BaselineFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [ranges, setRanges] = useState<ClinicalValidationRanges>(DEFAULT_CLINICAL_VALIDATION_RANGES)
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

  useEffect(() => {
    const loadRanges = async () => {
      try {
        const response = await fetch('/api/config/clinical-ranges', { cache: 'no-store' })
        const data = await response.json()
        if (response.ok && data?.success) {
          setRanges(normalizeClinicalValidationRanges(data.ranges))
        }
      } catch {
        setRanges(DEFAULT_CLINICAL_VALIDATION_RANGES)
      }
    }

    loadRanges()
  }, [])

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
      const ppg = formData.ppg ? Number.parseFloat(formData.ppg) : NaN
      const weight = formData.weight ? Number.parseFloat(formData.weight) : NaN
      const bpSystolic = formData.bloodPressureSystolic ? Number.parseInt(formData.bloodPressureSystolic) : NaN
      const bpDiastolic = formData.bloodPressureDiastolic ? Number.parseInt(formData.bloodPressureDiastolic) : NaN
      const heartRate = formData.heartRate ? Number.parseInt(formData.heartRate) : NaN
      const serumCreatinine = formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : NaN
      const egfr = formData.egfr ? Number.parseFloat(formData.egfr) : NaN

      const rangeErrors: string[] = []
      
      if (isNaN(hba1c) || hba1c < ranges.hba1c.min || hba1c > ranges.hba1c.max) {
        rangeErrors.push(`HbA1c must be between ${ranges.hba1c.min}-${ranges.hba1c.max}%`)
      }
      if (isNaN(fpg) || fpg < ranges.fpg.min || fpg > ranges.fpg.max) {
        rangeErrors.push(`FPG must be between ${ranges.fpg.min}-${ranges.fpg.max} mg/dL`)
      }
      if (formData.ppg && (isNaN(ppg) || ppg < ranges.ppg.min || ppg > ranges.ppg.max)) {
        rangeErrors.push(`PPG must be between ${ranges.ppg.min}-${ranges.ppg.max} mg/dL`)
      }
      if (isNaN(weight) || weight < ranges.weight.min || weight > ranges.weight.max) {
        rangeErrors.push(`Weight must be between ${ranges.weight.min}-${ranges.weight.max} kg`)
      }
      if (isNaN(bpSystolic) || bpSystolic < ranges.bpSystolic.min || bpSystolic > ranges.bpSystolic.max) {
        rangeErrors.push(`BP Systolic must be between ${ranges.bpSystolic.min}-${ranges.bpSystolic.max} mmHg`)
      }
      if (isNaN(bpDiastolic) || bpDiastolic < ranges.bpDiastolic.min || bpDiastolic > ranges.bpDiastolic.max) {
        rangeErrors.push(`BP Diastolic must be between ${ranges.bpDiastolic.min}-${ranges.bpDiastolic.max} mmHg`)
      }
      if (formData.heartRate && (isNaN(heartRate) || heartRate < ranges.heartRate.min || heartRate > ranges.heartRate.max)) {
        rangeErrors.push(`Heart Rate must be between ${ranges.heartRate.min}-${ranges.heartRate.max} bpm`)
      }
      if (
        formData.serumCreatinine &&
        (isNaN(serumCreatinine) || serumCreatinine < ranges.serumCreatinine.min || serumCreatinine > ranges.serumCreatinine.max)
      ) {
        rangeErrors.push(`Serum Creatinine must be between ${ranges.serumCreatinine.min}-${ranges.serumCreatinine.max} mg/dL`)
      }
      if (formData.egfr && (isNaN(egfr) || egfr < ranges.egfr.min || egfr > ranges.egfr.max)) {
        rangeErrors.push(`eGFR must be between ${ranges.egfr.min}-${ranges.egfr.max} mL/min/1.73m2`)
      }

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
        doctorId: doctorIdOverride || user?.uid || "",
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
              <DateField
                id="baselineVisitDate"
                value={formData.baselineVisitDate}
                min="1900-01-01"
                max="2100-12-31"
                readOnly
                required
                ariaLabel="Baseline visit date at week zero required"
                onChangeAction={() => {}}
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
                  min={ranges.hba1c.min}
                  max={ranges.hba1c.max}
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
                  min={ranges.fpg.min}
                  max={ranges.fpg.max}
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
                  min={ranges.ppg.min}
                  max={ranges.ppg.max}
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
                  min={ranges.weight.min}
                  max={ranges.weight.max}
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
                  min={ranges.bpSystolic.min}
                  max={ranges.bpSystolic.max}
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
                  min={ranges.bpDiastolic.min}
                  max={ranges.bpDiastolic.max}
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
                  min={ranges.heartRate.min}
                  max={ranges.heartRate.max}
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
                  min={ranges.serumCreatinine.min}
                  max={ranges.serumCreatinine.max}
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
                  min={ranges.egfr.min}
                  max={ranges.egfr.max}
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
              <DateField
                id="initDate"
                value={formData.treatmentInitiationDate}
                onChangeAction={(value) => setFormData((prev) => ({ ...prev, treatmentInitiationDate: value }))}
                min="1900-01-01"
                max="2100-12-31"
                ariaLabel="Date when treatment was initiated required"
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
