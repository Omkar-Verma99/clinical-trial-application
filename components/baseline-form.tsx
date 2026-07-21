"use client"

import type React from "react"

import { useState, memo, useEffect, useRef, useMemo, useCallback } from "react"
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
import { hasAtLeastOneTrue, parseUrinalysisFields } from "@/lib/form-validation"
import { preserveScrollPosition } from "@/lib/scroll-preserve"
import {
  TREATMENT_INITIATION_MIN,
  todayIsoDate,
  normalizeStudyDate,
  validateBaselineVisitDateForEdit,
  validateTreatmentInitiationDateForEdit,
} from "@/lib/study-dates"
import { isBaselineComplete } from "@/lib/baseline-validation"
import { buildBaselineSavePatch } from "@/lib/patient-save"
import { reportFormFieldIssues, type FormFieldIssue } from "@/lib/form-field-navigation"
import { usePersistentFieldHighlights } from "@/hooks/use-persistent-field-highlights"
import { isBaselineFieldValidInSavedRecord } from "@/lib/readiness-field-highlights"
import { getFirestoreSaveErrorMessage } from "@/lib/section-locks"
import { useAdminAuth } from "@/contexts/admin-auth-context"

interface BaselineFormProps {
  patientId: string
  existingData: BaselineData | null
  patientBaselineVisitDate?: string
  patientWeight?: number | null
  doctorIdOverride?: string
  isSectionLocked?: boolean
  lockMessage?: string
  canOverrideLock?: boolean
  focusFieldId?: string
  highlightFieldIds?: string[]
  /** Fields invalid in Firestore — stay red until saved record passes validation. */
  savedInvalidFieldIds?: string[]
  onFocusFieldHandled?: () => void
  onSuccess: () => void
}

export const BaselineForm = memo(function BaselineForm({
  patientId,
  existingData,
  patientBaselineVisitDate,
  patientWeight,
  doctorIdOverride,
  isSectionLocked = false,
  lockMessage = "Locked. You cannot edit this section.",
  canOverrideLock = false,
  focusFieldId,
  highlightFieldIds,
  savedInvalidFieldIds,
  onFocusFieldHandled,
  onSuccess,
}: BaselineFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth()
  const [loading, setLoading] = useState(false)
  const [ranges, setRanges] = useState<ClinicalValidationRanges>(DEFAULT_CLINICAL_VALIDATION_RANGES)
  const submitLockRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const lastSyncedBaselineAtRef = useRef<string | null>(null)

  const initialUrinalysis = parseUrinalysisFields(existingData?.urinalysis)

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
    urinalysisType: initialUrinalysis.urinalysisType,
    urinalysisSpecify: initialUrinalysis.urinalysisSpecify,
    
    // SECTION G - Treatment & Counseling
    dosePrescribed: existingData?.dosePrescribed || "",
    treatmentInitiationDate: (existingData as any)?.treatmentInitiationDate || "",
  })

  useEffect(() => {
    if (!existingData) return

    const syncStamp = existingData.updatedAt || existingData.createdAt || ""
    if (lastSyncedBaselineAtRef.current === syncStamp) return
    if (submitLockRef.current || loading) return

    lastSyncedBaselineAtRef.current = syncStamp
    const urinalysis = parseUrinalysisFields(existingData.urinalysis)

    setFormData((prev) => ({
      ...prev,
      baselineVisitDate: existingData.baselineVisitDate || prev.baselineVisitDate,
      hba1c: existingData.hba1c?.toString() || "",
      fpg: existingData.fpg?.toString() || "",
      ppg: existingData.ppg?.toString() || "",
      weight: existingData.weight?.toString() || "",
      bloodPressureSystolic: existingData.bloodPressureSystolic?.toString() || "",
      bloodPressureDiastolic: existingData.bloodPressureDiastolic?.toString() || "",
      heartRate: (existingData as any).heartRate?.toString() || "",
      serumCreatinine: existingData.serumCreatinine?.toString() || "",
      egfr: existingData.egfr?.toString() || "",
      urinalysisType: urinalysis.urinalysisType,
      urinalysisSpecify: urinalysis.urinalysisSpecify,
      dosePrescribed: existingData.dosePrescribed || "",
      treatmentInitiationDate: (existingData as any).treatmentInitiationDate || "",
    }))

    setCounseling({
      dietAndLifestyle: (existingData as any).counseling?.dietAndLifestyle ?? existingData.dietAdvice ?? false,
      hypoglycemiaAwareness: (existingData as any).counseling?.hypoglycemiaAwareness ?? false,
      utiGenitialInfectionAwareness: (existingData as any).counseling?.utiGenitialInfectionAwareness ?? false,
      hydrationAdvice: (existingData as any).counseling?.hydrationAdvice ?? false,
    })
  }, [existingData, loading])

  useEffect(() => {
    // PREFILL logic moved to props-driven approach
    if (patientBaselineVisitDate || patientWeight) {
      setFormData((prev) => ({
        ...prev,
        baselineVisitDate: patientBaselineVisitDate || prev.baselineVisitDate,
        weight: typeof patientWeight === "number" ? patientWeight.toString() : prev.weight,
      }))
    }
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

  const externalHighlightIds = useMemo(() => {
    const merged = [
      ...new Set([...(highlightFieldIds ?? []), ...(savedInvalidFieldIds ?? [])]),
    ]
    if (merged.length) return merged
    if (focusFieldId) return [focusFieldId]
    return undefined
  }, [focusFieldId, highlightFieldIds, savedInvalidFieldIds])

  const isBaselineFieldValid = useCallback(
    (fieldId: string): boolean => {
      if (savedInvalidFieldIds?.includes(fieldId)) {
        return isBaselineFieldValidInSavedRecord(fieldId, existingData, patientBaselineVisitDate)
      }

      const inRange = (value: string, min: number, max: number) => {
        const parsed = Number.parseFloat(value)
        return !!value && Number.isFinite(parsed) && parsed >= min && parsed <= max
      }

      const baselineForCompare =
        normalizeStudyDate(patientBaselineVisitDate) ||
        normalizeStudyDate(formData.baselineVisitDate)
      const legacyPair = {
        baseline: baselineForCompare,
        treatment: normalizeStudyDate(existingData?.treatmentInitiationDate),
      }

      switch (fieldId) {
        case "hba1c":
          return inRange(formData.hba1c, ranges.hba1c.min, ranges.hba1c.max)
        case "fpg":
          return inRange(formData.fpg, ranges.fpg.min, ranges.fpg.max)
        case "ppg":
          return inRange(formData.ppg, ranges.ppg.min, ranges.ppg.max)
        case "weight":
          return inRange(formData.weight, ranges.weight.min, ranges.weight.max)
        case "baselineVisitDate":
          return (
            !!formData.baselineVisitDate &&
            !validateBaselineVisitDateForEdit(
              formData.baselineVisitDate,
              formData.treatmentInitiationDate,
              legacyPair
            )
          )
        case "bpSys":
          return inRange(formData.bloodPressureSystolic, ranges.bpSystolic.min, ranges.bpSystolic.max)
        case "bpDia":
          return inRange(formData.bloodPressureDiastolic, ranges.bpDiastolic.min, ranges.bpDiastolic.max)
        case "heartRate":
          return inRange(formData.heartRate, ranges.heartRate.min, ranges.heartRate.max)
        case "creatinine":
          return inRange(formData.serumCreatinine, ranges.serumCreatinine.min, ranges.serumCreatinine.max)
        case "egfr":
          return inRange(formData.egfr, ranges.egfr.min, ranges.egfr.max)
        case "field-urinalysis":
          return (
            !!formData.urinalysisType &&
            (formData.urinalysisType !== "Abnormal" || !!formData.urinalysisSpecify.trim())
          )
        case "dose":
          return !!formData.dosePrescribed
        case "initDate":
          return (
            !!formData.treatmentInitiationDate &&
            !validateTreatmentInitiationDateForEdit(
              formData.treatmentInitiationDate,
              baselineForCompare,
              legacyPair
            )
          )
        case "field-counseling":
          return hasAtLeastOneTrue(counseling)
        default:
          return true
      }
    },
    [counseling, existingData, formData, patientBaselineVisitDate, ranges, savedInvalidFieldIds]
  )

  const { showHighlightBanner, setValidationIssues, clearAllHighlights } = usePersistentFieldHighlights({
    formRef,
    externalFieldIds: externalHighlightIds,
    isFieldValid: isBaselineFieldValid,
    onExternalHandled: onFocusFieldHandled,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSectionLocked && !canOverrideLock) {
      toast({
        variant: "destructive",
        title: "Section locked",
        description: lockMessage,
      })
      return
    }

    // Prevent double-submission
    if (submitLockRef.current || loading) {
      return
    }
    submitLockRef.current = true

    if (!user?.uid && !isAdminAuthenticated) {
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

    const abortValidation = (issues: FormFieldIssue[], title?: string) => {
      setValidationIssues(issues)
      reportFormFieldIssues(issues, toast, title, { skipHighlight: true })
      setLoading(false)
      submitLockRef.current = false
    }

    const validationIssues: FormFieldIssue[] = []
    const addIssue = (fieldId: string, message: string) => validationIssues.push({ fieldId, message })

    try {
      if (!formData.hba1c) addIssue("hba1c", "HbA1c (%) is required.")
      if (!formData.fpg) addIssue("fpg", "FPG (mg/dL) is required.")
      if (!formData.ppg) addIssue("ppg", "PPG (mg/dL) is required.")
      if (!formData.weight) addIssue("weight", "Weight (kg) is required.")
      if (!formData.baselineVisitDate) addIssue("baselineVisitDate", "Baseline visit date is required.")

      const baselineForCompare =
        normalizeStudyDate(patientBaselineVisitDate) ||
        normalizeStudyDate(formData.baselineVisitDate)
      const legacyPair = {
        baseline: baselineForCompare,
        treatment: normalizeStudyDate(existingData?.treatmentInitiationDate),
      }

      if (!formData.bloodPressureSystolic) addIssue("bpSys", "BP Systolic (mmHg) is required.")
      if (!formData.bloodPressureDiastolic) addIssue("bpDia", "BP Diastolic (mmHg) is required.")
      if (!formData.heartRate) addIssue("heartRate", "Heart rate (bpm) is required.")
      if (!formData.serumCreatinine) addIssue("creatinine", "Serum creatinine is required.")
      if (!formData.egfr) addIssue("egfr", "eGFR is required.")
      if (!formData.urinalysisType) addIssue("field-urinalysis", "Select urinalysis result: Normal or Abnormal.")
      if (!formData.dosePrescribed) addIssue("dose", "Select the KC MeSempa dose prescribed.")
      if (!formData.treatmentInitiationDate) addIssue("initDate", "Treatment initiation date is required.")
      if (!hasAtLeastOneTrue(counseling)) {
        addIssue("field-counseling", "Select at least one counseling option.")
      }

      const treatmentDateError = validateTreatmentInitiationDateForEdit(
        formData.treatmentInitiationDate,
        baselineForCompare || undefined,
        legacyPair
      )
      if (treatmentDateError) addIssue("initDate", treatmentDateError)

      if (validationIssues.length > 0) {
        abortValidation(validationIssues, "Missing required fields")
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

      const rangeIssues: FormFieldIssue[] = []

      if (isNaN(hba1c) || hba1c < ranges.hba1c.min || hba1c > ranges.hba1c.max) {
        rangeIssues.push({ fieldId: "hba1c", message: `HbA1c must be between ${ranges.hba1c.min}-${ranges.hba1c.max}%.` })
      }
      if (isNaN(fpg) || fpg < ranges.fpg.min || fpg > ranges.fpg.max) {
        rangeIssues.push({ fieldId: "fpg", message: `FPG must be between ${ranges.fpg.min}-${ranges.fpg.max} mg/dL.` })
      }
      if (isNaN(ppg) || ppg < ranges.ppg.min || ppg > ranges.ppg.max) {
        rangeIssues.push({ fieldId: "ppg", message: `PPG must be between ${ranges.ppg.min}-${ranges.ppg.max} mg/dL.` })
      }
      if (isNaN(weight) || weight < ranges.weight.min || weight > ranges.weight.max) {
        rangeIssues.push({ fieldId: "weight", message: `Weight must be between ${ranges.weight.min}-${ranges.weight.max} kg.` })
      }
      if (isNaN(bpSystolic) || bpSystolic < ranges.bpSystolic.min || bpSystolic > ranges.bpSystolic.max) {
        rangeIssues.push({ fieldId: "bpSys", message: `BP Systolic must be between ${ranges.bpSystolic.min}-${ranges.bpSystolic.max} mmHg.` })
      }
      if (isNaN(bpDiastolic) || bpDiastolic < ranges.bpDiastolic.min || bpDiastolic > ranges.bpDiastolic.max) {
        rangeIssues.push({ fieldId: "bpDia", message: `BP Diastolic must be between ${ranges.bpDiastolic.min}-${ranges.bpDiastolic.max} mmHg.` })
      }
      if (isNaN(heartRate) || heartRate < ranges.heartRate.min || heartRate > ranges.heartRate.max) {
        rangeIssues.push({ fieldId: "heartRate", message: `Heart rate must be between ${ranges.heartRate.min}-${ranges.heartRate.max} bpm.` })
      }
      if (
        isNaN(serumCreatinine) ||
        serumCreatinine < ranges.serumCreatinine.min ||
        serumCreatinine > ranges.serumCreatinine.max
      ) {
        rangeIssues.push({
          fieldId: "creatinine",
          message: `Serum creatinine must be between ${ranges.serumCreatinine.min}-${ranges.serumCreatinine.max} mg/dL.`,
        })
      }
      if (isNaN(egfr) || egfr < ranges.egfr.min || egfr > ranges.egfr.max) {
        rangeIssues.push({ fieldId: "egfr", message: `eGFR must be between ${ranges.egfr.min}-${ranges.egfr.max} mL/min/1.73m².` })
      }

      if (formData.urinalysisType === "Abnormal" && !formData.urinalysisSpecify.trim()) {
        rangeIssues.push({ fieldId: "field-urinalysis", message: "Specify the urinalysis abnormality." })
      }

      if (rangeIssues.length > 0) {
        abortValidation(rangeIssues, "Invalid values")
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
        ppg: Number.parseFloat(formData.ppg),
        weight: weightValue,
        bloodPressureSystolic: bpSystolicValue,
        bloodPressureDiastolic: bpDiastolicValue,
        heartRate: Number.parseInt(formData.heartRate),
        serumCreatinine: Number.parseFloat(formData.serumCreatinine),
        egfr: Number.parseFloat(formData.egfr),
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

      if (!isBaselineComplete(data)) {
        toast({
          variant: "destructive",
          title: "Baseline incomplete",
          description: "All required baseline fields must be filled before saving.",
        })
        return
      }

      try {
        // Save to Firebase in a single batch (merge to preserve other fields)
        const patientDocRef = doc(db, "patients", patientId)
        const batch = writeBatch(db)
        const baselinePayload = buildBaselineSavePatch({
          baseline: data,
          baselineVisitDate: formData.baselineVisitDate,
        })
        batch.set(patientDocRef, baselinePayload, { merge: true })

        await batch.commit()
        lastSyncedBaselineAtRef.current = data.updatedAt
      } catch (error) {
        const firebaseCode =
          typeof error === "object" && error && "code" in error
            ? String((error as any).code)
            : "unknown"
        logError(error as Error, {
          action: "saveBaselineData",
          firebaseCode,
          patientId,
          userId: user?.uid,
          severity: "high"
        })
        toast({
          variant: "destructive",
          title: "Error saving data",
          description: getFirestoreSaveErrorMessage(error, {
            isSectionLocked,
            canOverrideLock,
            lockMessage,
          }),
        })
        return
      }

      clearAllHighlights()
      toast({
        title: "✓ Baseline data saved",
        description: "Week 0 assessment has been recorded.",
      })

      preserveScrollPosition(onSuccess)
    } catch (error) {
      logError(error as Error, {
        action: "saveBaselineData",
        severity: "high"
      })
      toast({
        variant: "destructive",
        title: "Error saving data",
        description: getFirestoreSaveErrorMessage(error, {
          isSectionLocked,
          canOverrideLock,
          lockMessage,
        }),
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
        {isSectionLocked && !canOverrideLock && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {lockMessage}
          </div>
        )}
        {showHighlightBanner && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Fields marked in <span className="font-semibold">red</span> below must be corrected before saving.
          </div>
        )}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={loading || (isSectionLocked && !canOverrideLock)} className="space-y-6">
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
              <p className="text-xs text-muted-foreground">
                Read-only here. Set or change the baseline visit date on the Patient Info tab (format dd/mm/yyyy, e.g. 11/04/2026).
              </p>
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
                <Label htmlFor="ppg">PPG (mg/dL) *</Label>
                <Input
                  id="ppg"
                  type="number"
                  min={ranges.ppg.min}
                  max={ranges.ppg.max}
                  placeholder="180"
                  value={formData.ppg}
                  onChange={(e) => setFormData({ ...formData, ppg: e.target.value })}
                  required
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
              <div id="heartRate" className="space-y-2">
                <Label htmlFor="heartRate-input">Heart Rate (bpm) *</Label>
                <Input
                  id="heartRate-input"
                  type="number"
                  min={ranges.heartRate.min}
                  max={ranges.heartRate.max}
                  placeholder="72"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creatinine">Serum Creatinine (mg/dL) *</Label>
                <Input
                  id="creatinine"
                  type="number"
                  step="0.01"
                  min={ranges.serumCreatinine.min}
                  max={ranges.serumCreatinine.max}
                  placeholder="1.0"
                  value={formData.serumCreatinine}
                  onChange={(e) => setFormData({ ...formData, serumCreatinine: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="egfr">eGFR (mL/min/1.73m²) *</Label>
                <Input
                  id="egfr"
                  type="number"
                  min={ranges.egfr.min}
                  max={ranges.egfr.max}
                  placeholder="90"
                  value={formData.egfr}
                  onChange={(e) => setFormData({ ...formData, egfr: e.target.value })}
                  required
                />
              </div>
            </div>

            <div id="field-urinalysis" className="space-y-2">
              <Label htmlFor="urinalysis">Urinalysis *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="urinalysisNormal"
                    name="urinalysis"
                    value="Normal"
                    checked={formData.urinalysisType === "Normal"}
                    onChange={() => setFormData({ ...formData, urinalysisType: "Normal", urinalysisSpecify: "" })}
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
                    onChange={() => setFormData({ ...formData, urinalysisType: "Abnormal" })}
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
                min={TREATMENT_INITIATION_MIN}
                max={todayIsoDate()}
                ariaLabel="Date when treatment was initiated required"
                required
              />
            </div>

            <div id="field-counseling" className="space-y-3">
              <Label className="text-base font-semibold">Counseling Provided * (select at least one)</Label>
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
          </fieldset>
        </form>
      </CardContent>
    </Card>
  )
})
