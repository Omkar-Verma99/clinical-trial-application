"use client"

import type React from "react"

import { useState, memo, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, arrayUnion, writeBatch, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"
import DOMPurify from "dompurify"
import type { FollowUpData, StructuredAdverseEvent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateField } from "@/components/ui/date-field"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { logError } from "@/lib/error-tracking"
import {
  ClinicalValidationRanges,
  DEFAULT_CLINICAL_VALIDATION_RANGES,
  normalizeClinicalValidationRanges,
} from "@/lib/clinical-ranges"

interface FollowUpFormProps {
  patientId: string
  existingData: FollowUpData | null
  onSuccess: () => void
  baselineDate?: string // Baseline visit date to calculate weeks
  allFollowUps?: FollowUpData[] // Track all existing visits
  followUpIndex?: number
  doctorIdOverride?: string
}

export const FollowUpForm = memo(function FollowUpForm({ patientId, existingData, onSuccess, baselineDate, allFollowUps = [], followUpIndex = 0, doctorIdOverride }: FollowUpFormProps) {
  const { toast } = useToast()
  const { user, doctor } = useAuth()
  const [loading, setLoading] = useState(false)
  const [ranges, setRanges] = useState<ClinicalValidationRanges>(DEFAULT_CLINICAL_VALIDATION_RANGES)
  const submitLockRef = useRef(false)
  const [timelinePopup, setTimelinePopup] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  })
  const [lastTimelineAlertDate, setLastTimelineAlertDate] = useState("")
  const [deletingAdverseEventId, setDeletingAdverseEventId] = useState<string | null>(null)
  const [mandatoryPopup, setMandatoryPopup] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  })
  const resolvedDoctorId = doctorIdOverride || user?.uid || ""
  
  // Calculate visitNumber based on date difference from baseline (in weeks)
  // For editing, use existing; for new, calculate from dates
  const calculateVisitNumber = (visitDate: string): number => {
    if (!visitDate || !baselineDate) return existingData?.visitNumber || 1
    
    try {
      const baseline = new Date(baselineDate)
      const visit = new Date(visitDate)
      
      // Guard against invalid dates
      if (isNaN(baseline.getTime()) || isNaN(visit.getTime())) {
        return existingData?.visitNumber || 1
      }
      
      const diffDays = Math.floor((visit.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24))
      const weeks = Math.max(1, Math.round(diffDays / 7))
      return weeks
    } catch (e) {
      return existingData?.visitNumber || 1
    }
  }
  
  const [visitDate, setVisitDate] = useState(existingData?.visitDate || "")
  const visitNumber = existingData?.visitNumber || calculateVisitNumber(visitDate)

  const calculateElapsedWeeks = (visitDateValue: string): number | null => {
    if (!baselineDate || !visitDateValue) return null
    const baseline = new Date(baselineDate)
    const visit = new Date(visitDateValue)
    if (isNaN(baseline.getTime()) || isNaN(visit.getTime())) return null
    const diffDays = Math.floor((visit.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, Math.round(diffDays / 7))
  }

  const showTimelineAlertIfNeeded = (visitDateValue: string) => {
    if (followUpIndex !== 0) return
    if (!visitDateValue || visitDateValue === lastTimelineAlertDate) return

    const elapsedWeeks = calculateElapsedWeeks(visitDateValue)
    if (elapsedWeeks === null) return

    if (elapsedWeeks < 10) {
      setTimelinePopup({
        open: true,
        title: "Early Follow-up Alert",
        message: "This patient's follow-up is scheduled BEFORE the recommended timeline (Week 10-14). Consider rescheduling if needed.",
      })
      setLastTimelineAlertDate(visitDateValue)
      return
    }

    if (elapsedWeeks > 14) {
      setTimelinePopup({
        open: true,
        title: "Delayed Follow-up Alert",
        message: `Follow-up delayed: Recorded as Week ${elapsedWeeks}, expected Week 10-14. Please note this delay.`,
      })
      setLastTimelineAlertDate(visitDateValue)
    }
  }

  const [formData, setFormData] = useState({
    visitNumber: visitNumber,
    visitDate: existingData?.visitDate || "",
    hba1c: existingData?.hba1c?.toString() || "",
    fpg: existingData?.fpg?.toString() || "",
    ppg: existingData?.ppg?.toString() || "",
    weight: existingData?.weight?.toString() || "",
    bloodPressureSystolic: existingData?.bloodPressureSystolic?.toString() || "",
    bloodPressureDiastolic: existingData?.bloodPressureDiastolic?.toString() || "",
    heartRate: existingData?.heartRate?.toString() || "",
    serumCreatinine: existingData?.serumCreatinine?.toString() || "",
    egfr: existingData?.egfr?.toString() || "",
    urinalysisType: existingData?.urinalysis?.startsWith("Abnormal") ? "Abnormal" : (existingData?.urinalysis || ""),
    urinalysisSpecify: existingData?.urinalysis?.startsWith("Abnormal") 
      ? existingData.urinalysis.replace("Abnormal: ", "") 
      : "",
    hba1cResponse: existingData?.glycemicResponse?.category || "",
    weightChange: existingData?.outcomes?.weightChange || "",
    bpControlAchieved: existingData?.outcomes?.bpControlAchieved ?? null,
    renalOutcome: existingData?.outcomes?.renalOutcome || "",
    patientContinuingTreatment: existingData?.adherence?.patientContinuingTreatment ?? null,
    discontinuationReason: existingData?.adherence?.discontinuationReason || "",
    discontinuationReasonOther: existingData?.adherence?.discontinuationReasonOtherDetails || "",
    missedDoses: existingData?.adherence?.missedDosesInLast7Days || "",
    addOnTherapy: existingData?.adherence?.addOnOrChangedTherapy ?? null,
    addOnTherapyDetails: existingData?.adherence?.addOnOrChangedTherapyDetails || "",
    adverseEventsPresent:
      existingData?.adverseEventsPresent === true
        ? true
        : existingData?.adverseEventsPresent === false
          ? false
          : (Array.isArray(existingData?.adverseEvents) && existingData.adverseEvents.length > 0) ||
              (typeof (existingData as any)?.adverseEvents === "string" && (existingData as any).adverseEvents.trim())
            ? true
            : null,
    hypoglycemiaMild: existingData?.eventsOfSpecialInterest?.hypoglycemiaMild ?? false,
    hypoglycemiaModerate: existingData?.eventsOfSpecialInterest?.hypoglycemiaModerate ?? false,
    hypoglycemiaSevere: existingData?.eventsOfSpecialInterest?.hypoglycemiaSevere ?? false,
    uti: existingData?.eventsOfSpecialInterest?.uti ?? false,
    genitalInfection: existingData?.eventsOfSpecialInterest?.genitalMycoticInfection ?? false,
    dizzinessDehydration: existingData?.eventsOfSpecialInterest?.dizzinessDehydrationSymptoms ?? false,
    hospitalizationErVisit: existingData?.eventsOfSpecialInterest?.hospitalizationOrErVisit ?? false,
    hospitalizationReason: existingData?.eventsOfSpecialInterest?.hospitalizationReason || "",
    overallEfficacy: existingData?.physicianAssessment?.overallEfficacy || "",
    overallTolerability: existingData?.physicianAssessment?.overallTolerability || "",
    complianceJudgment: existingData?.physicianAssessment?.complianceJudgment || "",
    preferLongTerm: existingData?.physicianAssessment?.preferKcMeSempaForLongTerm ?? null,
    uncontrolledT2dm: existingData?.physicianAssessment?.preferredPatientProfiles?.uncontrolledT2dm ?? false,
    obeseT2dm: existingData?.physicianAssessment?.preferredPatientProfiles?.obeseT2dm ?? false,
    ckdPatients: existingData?.physicianAssessment?.preferredPatientProfiles?.ckdPatients ?? false,
    htnT2dm: existingData?.physicianAssessment?.preferredPatientProfiles?.htnPlusT2dm ?? false,
    elderlyPatients: existingData?.physicianAssessment?.preferredPatientProfiles?.elderlyPatients ?? false,
    noPersonalIdentifiers: existingData?.dataPrivacy?.noPersonalIdentifiersRecorded ?? false,
    dataAsRoutinePractice: existingData?.dataPrivacy?.dataCollectedAsRoutineClinicalPractice ?? false,
    patientIdentityMapping: existingData?.dataPrivacy?.patientIdentityMappingAtClinicOnly ?? false,
    physicianConfirmation: existingData?.physicianDeclaration?.confirmationCheckbox ?? false,
    additionalComments: existingData?.comments || "",
  })

  const buildEmptyAdverseEvent = (): StructuredAdverseEvent => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    aeTerm: "",
    onsetDate: "",
    stopDate: "",
    severity: "",
    serious: "",
    actionTaken: "",
    actionTakenOther: "",
    outcome: "",
  })

  const [adverseEvents, setAdverseEvents] = useState<StructuredAdverseEvent[]>(() => {
    if (Array.isArray(existingData?.adverseEvents) && existingData.adverseEvents.length > 0) {
      return existingData.adverseEvents.map((event) => ({
        ...buildEmptyAdverseEvent(),
        ...event,
        id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }))
    }
    if (Array.isArray(existingData?.adverseEventsStructured) && existingData.adverseEventsStructured.length > 0) {
      return existingData.adverseEventsStructured.map((event) => ({
        ...buildEmptyAdverseEvent(),
        ...event,
        id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }))
    }
    if (typeof (existingData as any)?.adverseEvents === "string" && (existingData as any).adverseEvents.trim()) {
      const legacyActions = Array.isArray(existingData?.actionTaken) ? existingData.actionTaken : []
      const legacyOutcomes = Array.isArray(existingData?.outcome) ? existingData.outcome : []
      const preferredAction = legacyActions[0]
      const preferredOutcome = legacyOutcomes[0]

      const mappedAction: StructuredAdverseEvent["actionTaken"] =
        preferredAction === "Dose adjusted" ||
        preferredAction === "Drug stopped" ||
        preferredAction === "Referred" ||
        preferredAction === "Other"
          ? preferredAction
          : "None"

      const mappedOutcome: StructuredAdverseEvent["outcome"] =
        preferredOutcome === "Ongoing" ? "Ongoing" : "Resolved"

      return [
        {
          ...buildEmptyAdverseEvent(),
          aeTerm: (existingData as any).adverseEvents,
          actionTaken: mappedAction,
          outcome: mappedOutcome,
        },
      ]
    }
    return []
  })

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

  const updateAdverseEvent = (id: string, patch: Partial<StructuredAdverseEvent>) => {
    setAdverseEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...patch } : event)))
  }

  const addAdverseEvent = () => {
    setAdverseEvents((prev) => [...prev, buildEmptyAdverseEvent()])
  }

  const removeAdverseEvent = (id: string) => {
    setAdverseEvents((prev) => prev.filter((event) => event.id !== id))
    setDeletingAdverseEventId(null)
  }

  const confirmRemoveAdverseEvent = (id: string) => {
    setDeletingAdverseEventId(id)
  }

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

    setLoading(true)
    const startTime = Date.now()

    try {
      // VALIDATION PHASE 1: Check required fields
      const validationErrors: string[] = []
      
      if (!formData.visitDate) validationErrors.push("Visit date is required")
      if (!formData.hba1c) validationErrors.push("HbA1c is required")
      if (!formData.fpg) validationErrors.push("FPG is required")
      if (!formData.weight) validationErrors.push("Weight is required")
      if (!formData.bloodPressureSystolic) validationErrors.push("BP Systolic is required")
      if (!formData.bloodPressureDiastolic) validationErrors.push("BP Diastolic is required")
      if (!formData.hba1cResponse) validationErrors.push("HbA1c response category is required")
      if (formData.patientContinuingTreatment === null) validationErrors.push("Please select patient continuing treatment status")
      if (formData.bpControlAchieved === null) validationErrors.push("Please select blood pressure control status")
      if (formData.addOnTherapy === null) validationErrors.push("Please select add-on/change therapy status")
      if (formData.adverseEventsPresent === null) validationErrors.push("Please select adverse event status")
      if (formData.patientContinuingTreatment === false && !formData.discontinuationReason) validationErrors.push("Please specify discontinuation reason")
      if (formData.patientContinuingTreatment === false && formData.discontinuationReason === "Other" && !formData.discontinuationReasonOther.trim()) {
        validationErrors.push("Please specify discontinuation reason details")
      }
      if (formData.missedDoses === "") validationErrors.push("Missed doses information is required")
      if (!formData.overallEfficacy) validationErrors.push("Overall efficacy is required")
      if (!formData.overallTolerability) validationErrors.push("Overall tolerability is required")
      if (!formData.complianceJudgment) validationErrors.push("Compliance judgment is required")

      if (formData.adverseEventsPresent === true) {
        if (adverseEvents.length === 0) {
          validationErrors.push("Add at least one adverse event")
        }
        adverseEvents.forEach((event, index) => {
          if (!event.aeTerm.trim()) validationErrors.push(`AE #${index + 1}: term is required`)
          if (!event.onsetDate) validationErrors.push(`AE #${index + 1}: onset date is required`)
          if (!event.severity) validationErrors.push(`AE #${index + 1}: severity is required`)
          if (!event.serious) validationErrors.push(`AE #${index + 1}: serious selection is required`)
          if (!event.actionTaken) validationErrors.push(`AE #${index + 1}: action taken is required`)
          if (!event.outcome) validationErrors.push(`AE #${index + 1}: outcome is required`)
          if (event.stopDate && event.onsetDate && event.stopDate < event.onsetDate) {
            validationErrors.push(`AE #${index + 1}: stop date cannot be before onset date`)
          }
          if (event.actionTaken === "Other" && !event.actionTakenOther?.trim()) {
            validationErrors.push(`AE #${index + 1}: specify action taken for Other`)
          }
        })
      }

      if (validationErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: validationErrors.slice(0, 3).join(", ") + (validationErrors.length > 3 ? ` and ${validationErrors.length - 3} more` : ""),
        })
        return
      }

      if (
        formData.noPersonalIdentifiers !== true ||
        formData.dataAsRoutinePractice !== true ||
        formData.patientIdentityMapping !== true
      ) {
        setMandatoryPopup({
          open: true,
          title: "Data Privacy Mandatory",
          message: "Please check all Data Privacy & Confidentiality options to continue.",
        })
        return
      }

      if (formData.physicianConfirmation !== true) {
        setMandatoryPopup({
          open: true,
          title: "Physician Declaration Mandatory",
          message: "Please confirm the Physician Declaration checkbox before saving.",
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
      
      if (formData.hba1c && (isNaN(hba1c) || hba1c < ranges.hba1c.min || hba1c > ranges.hba1c.max)) {
        rangeErrors.push(`HbA1c must be between ${ranges.hba1c.min}-${ranges.hba1c.max}%`)
      }
      if (formData.fpg && (isNaN(fpg) || fpg < ranges.fpg.min || fpg > ranges.fpg.max)) {
        rangeErrors.push(`FPG must be between ${ranges.fpg.min}-${ranges.fpg.max} mg/dL`)
      }
      if (formData.ppg && (isNaN(ppg) || ppg < ranges.ppg.min || ppg > ranges.ppg.max)) {
        rangeErrors.push(`PPG must be between ${ranges.ppg.min}-${ranges.ppg.max} mg/dL`)
      }
      if (formData.weight && (isNaN(weight) || weight < ranges.weight.min || weight > ranges.weight.max)) {
        rangeErrors.push(`Weight must be between ${ranges.weight.min}-${ranges.weight.max} kg`)
      }
      if (
        formData.bloodPressureSystolic &&
        (isNaN(bpSystolic) || bpSystolic < ranges.bpSystolic.min || bpSystolic > ranges.bpSystolic.max)
      ) {
        rangeErrors.push(`BP Systolic must be between ${ranges.bpSystolic.min}-${ranges.bpSystolic.max} mmHg`)
      }
      if (
        formData.bloodPressureDiastolic &&
        (isNaN(bpDiastolic) || bpDiastolic < ranges.bpDiastolic.min || bpDiastolic > ranges.bpDiastolic.max)
      ) {
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

      if (rangeErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Invalid Values",
          description: rangeErrors.join(", "),
        })
        return
      }

      const sanitizeObject = (obj: Record<string, any>, fieldsToSanitize: string[]) => {
        const sanitized = { ...obj }
        fieldsToSanitize.forEach((field) => {
          if (sanitized[field] && typeof sanitized[field] === "string") {
            sanitized[field] = DOMPurify.sanitize(sanitized[field])
          }
        })
        return sanitized
      }

      const sanitizedFormData = sanitizeObject(formData, ["urinalysisSpecify", "addOnTherapyDetails", "hospitalizationReason"])

      const sanitizedAdverseEvents: StructuredAdverseEvent[] = formData.adverseEventsPresent
        ? adverseEvents.map((event) => ({
            ...event,
            aeTerm: DOMPurify.sanitize(event.aeTerm),
            actionTakenOther: event.actionTaken === "Other" ? DOMPurify.sanitize(event.actionTakenOther || "") : "",
          }))
        : []

      const data = {
        visitNumber: formData.visitNumber,
        patientId,
        doctorId: resolvedDoctorId,
        visitDate: formData.visitDate,
        hba1c: formData.hba1c ? Number.parseFloat(formData.hba1c) : null,
        fpg: formData.fpg ? Number.parseFloat(formData.fpg) : null,
        ppg: formData.ppg ? Number.parseFloat(formData.ppg) : null,
        weight: formData.weight ? Number.parseFloat(formData.weight) : null,
        bloodPressureSystolic: formData.bloodPressureSystolic ? Number.parseInt(formData.bloodPressureSystolic) : null,
        bloodPressureDiastolic: formData.bloodPressureDiastolic ? Number.parseInt(formData.bloodPressureDiastolic) : null,
        heartRate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
        serumCreatinine: formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : null,
        egfr: formData.egfr ? Number.parseFloat(formData.egfr) : null,
        urinalysis: formData.urinalysisType === "Abnormal" && sanitizedFormData.urinalysisSpecify ? 
          `Abnormal: ${sanitizedFormData.urinalysisSpecify}` : "Normal",
        glycemicResponse: {
          category: formData.hba1cResponse,
        },
        outcomes: {
          weightChange: formData.weightChange,
          bpControlAchieved: formData.bpControlAchieved === true,
          renalOutcome: formData.renalOutcome,
        },
        adherence: {
          patientContinuingTreatment: formData.patientContinuingTreatment === true,
          discontinuationReason: formData.discontinuationReason || null,
          discontinuationReasonOtherDetails:
            formData.patientContinuingTreatment === false && formData.discontinuationReason === "Other"
              ? DOMPurify.sanitize(formData.discontinuationReasonOther)
              : null,
          missedDosesInLast7Days: formData.missedDoses || null,
          addOnOrChangedTherapy: formData.addOnTherapy === true,
          addOnOrChangedTherapyDetails: formData.addOnTherapy === true ? sanitizedFormData.addOnTherapyDetails : null,
        },
        adverseEventsPresent: formData.adverseEventsPresent === true,
        adverseEvents: sanitizedAdverseEvents,
        adverseEventsStructured: sanitizedAdverseEvents,
        eventsOfSpecialInterest: {
          hypoglycemiaMild: formData.hypoglycemiaMild,
          hypoglycemiaModerate: formData.hypoglycemiaModerate,
          hypoglycemiaSevere: formData.hypoglycemiaSevere,
          uti: formData.uti,
          genitalMycoticInfection: formData.genitalInfection,
          dizzinessDehydrationSymptoms: formData.dizzinessDehydration,
          hospitalizationOrErVisit: formData.hospitalizationErVisit,
          hospitalizationReason: formData.hospitalizationErVisit ? sanitizedFormData.hospitalizationReason : null,
        },
        physicianAssessment: {
          overallEfficacy: formData.overallEfficacy,
          overallTolerability: formData.overallTolerability,
          complianceJudgment: formData.complianceJudgment,
          preferKcMeSempaForLongTerm: formData.preferLongTerm === true,
          preferredPatientProfiles: {
            uncontrolledT2dm: formData.uncontrolledT2dm,
            obeseT2dm: formData.obeseT2dm,
            ckdPatients: formData.ckdPatients,
            htnPlusT2dm: formData.htnT2dm,
            elderlyPatients: formData.elderlyPatients,
          },
        },
        dataPrivacy: {
          noPersonalIdentifiersRecorded: formData.noPersonalIdentifiers === true,
          dataCollectedAsRoutineClinicalPractice: formData.dataAsRoutinePractice === true,
          patientIdentityMappingAtClinicOnly: formData.patientIdentityMapping === true,
        },
        physicianDeclaration: {
          physicianName: doctor?.name || "",
          qualification: doctor?.qualification || "",
          clinicHospitalName: doctor?.studySiteCode || "",
          confirmationCheckbox: formData.physicianConfirmation === true,
          signatureMethod: "Checkbox",
          signatureDate: formData.visitDate || new Date().toISOString().split('T')[0],
        },
        comments: formData.additionalComments,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      try {
        // FIX: Check if this follow-up already exists (for editing)
        // A follow-up is uniquely identified by: visitNumber + doctorId
        // Doctor can change visitDate, but visitNumber stays the same (Week 12, Week 24, etc.)
        const patientDocRef = doc(db, "patients", patientId)
        const patientSnap = await getDoc(patientDocRef)
        
        let updateData: any = { updatedAt: new Date().toISOString() }
        
        if (patientSnap.exists()) {
          const existingFollowups = patientSnap.data().followups || []
          
          // Find if this follow-up already exists (by visitNumber + doctorId)
          const existingIndex = existingFollowups.findIndex(
            (fu: any) => fu.visitNumber === formData.visitNumber && fu.doctorId === resolvedDoctorId
          )
          
          if (existingIndex >= 0) {
            // UPDATE existing follow-up: replace the old one with new data
            const updatedFollowups = [...existingFollowups]
            updatedFollowups[existingIndex] = data
            updateData.followups = updatedFollowups
          } else {
            // ADD new follow-up: use arrayUnion for new entries
            updateData.followups = arrayUnion(data)
          }
        } else {
          // First follow-up for this patient
          updateData.followups = arrayUnion(data)
        }
        
        const batch = writeBatch(db)
        batch.set(patientDocRef, updateData, { merge: true })
        await batch.commit()

        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('✓ Follow-up form saved to Firebase')
        }
      } catch (error) {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.error("Error saving follow-up data:", error)
        }
        logError(error as Error, {
          action: "saveFollowUpData",
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
        title: "✓ Follow-up assessment saved",
        description: "Week 12 assessment has been recorded.",
      })

      onSuccess()
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error("Error saving follow-up data:", error)
      }
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
        <CardTitle>
          Follow-up Assessment{followUpIndex === 0 ? " (Week 12 ± 2 weeks)" : ""}
        </CardTitle>
        <CardDescription>Record end-of-study clinical measurements and outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION H - Follow-up Visit Date */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg">Follow-up Visit</h3>
            <div className="space-y-2">
              <Label htmlFor="visitDate">Date of Visit *</Label>
              <DateField
                id="visitDate"
                value={formData.visitDate}
                onChangeAction={(newDate) => {
                  const newVisitNumber = calculateVisitNumber(newDate)
                  setFormData({ ...formData, visitDate: newDate, visitNumber: newVisitNumber })
                  setVisitDate(newDate)
                  if (newDate) {
                    showTimelineAlertIfNeeded(newDate)
                  }
                }}
                min="1900-01-01"
                max="2100-12-31"
                ariaLabel="Date of follow-up visit required"
                required
              />
              {formData.visitDate && (
                <p className="text-sm text-muted-foreground">
                  Calculated Visit: Week {formData.visitNumber}
                </p>
              )}
            </div>
          </div>

          {/* SECTION H - Clinical Measurements */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Clinical & Lab Parameters</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hba1c">HbA1c (%) *</Label>
                <Input
                  id="hba1c"
                  type="number"
                  step="0.1"
                  min={ranges.hba1c.min}
                  max={ranges.hba1c.max}
                  placeholder="6.8"
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
                  placeholder="120"
                  value={formData.fpg}
                  onChange={(e) => setFormData({ ...formData, fpg: e.target.value })}
                  aria-label="Fasting plasma glucose in milligrams per deciliter required"
                  aria-required="true"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppg">PPG (mg/dL)</Label>
                <Input
                  id="ppg"
                  type="number"
                  min={ranges.ppg.min}
                  max={ranges.ppg.max}
                  placeholder="160"
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
                  placeholder="72.5"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpSys">BP Systolic (mmHg) *</Label>
                <Input
                  id="bpSys"
                  type="number"
                  min={ranges.bpSystolic.min}
                  max={ranges.bpSystolic.max}
                  placeholder="125"
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
                  placeholder="80"
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
                  placeholder="0.95"
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
                  placeholder="92"
                  value={formData.egfr}
                  onChange={(e) => setFormData({ ...formData, egfr: e.target.value })}
                />
              </div>
            </div>

            {/* Urinalysis with radio buttons and conditional text input */}
            <div className="space-y-3">
              <Label>Urinalysis *</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="urinalysisNormal"
                    name="urinalysis"
                    value="Normal"
                    checked={formData.urinalysisType === "Normal"}
                    onChange={() => setFormData({ ...formData, urinalysisType: "Normal", urinalysisSpecify: "" })}
                  />
                  <Label htmlFor="urinalysisNormal" className="cursor-pointer font-normal">
                    Normal
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="urinalysisAbnormal"
                    name="urinalysis"
                    value="Abnormal"
                    checked={formData.urinalysisType === "Abnormal"}
                    onChange={() => setFormData({ ...formData, urinalysisType: "Abnormal" })}
                  />
                  <Label htmlFor="urinalysisAbnormal" className="cursor-pointer font-normal">
                    Abnormal (specify):
                  </Label>
                </div>
                {formData.urinalysisType === "Abnormal" && (
                  <Input
                    type="text"
                    placeholder="Please specify abnormality..."
                    value={formData.urinalysisSpecify}
                    onChange={(e) => setFormData({ ...formData, urinalysisSpecify: e.target.value })}
                    className="ml-6"
                    required
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION I - Glycemic Response Assessment */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Glycemic Response Assessment</h3>
            <div className="space-y-3">
              <Label className="text-base font-medium">HbA1c Response Category (tick one): *</Label>
              <div className="space-y-2 ml-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="superResponder"
                    name="hba1cResponse"
                    value="Super-responder"
                    checked={formData.hba1cResponse === "Super-responder"}
                    onChange={() => setFormData({ ...formData, hba1cResponse: "Super-responder" })}
                  />
                  <Label htmlFor="superResponder" className="cursor-pointer font-normal">Super-responder (↓ ≥1.5%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="responder"
                    name="hba1cResponse"
                    value="Responder"
                    checked={formData.hba1cResponse === "Responder"}
                    onChange={() => setFormData({ ...formData, hba1cResponse: "Responder" })}
                  />
                  <Label htmlFor="responder" className="cursor-pointer font-normal">Responder (↓ 1.0–1.49%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="partialResponder"
                    name="hba1cResponse"
                    value="Partial responder"
                    checked={formData.hba1cResponse === "Partial responder"}
                    onChange={() => setFormData({ ...formData, hba1cResponse: "Partial responder" })}
                  />
                  <Label htmlFor="partialResponder" className="cursor-pointer font-normal">Partial responder (↓ 0.5–0.99%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="nonResponder"
                    name="hba1cResponse"
                    value="Non-responder"
                    checked={formData.hba1cResponse === "Non-responder"}
                    onChange={() => setFormData({ ...formData, hba1cResponse: "Non-responder" })}
                  />
                  <Label htmlFor="nonResponder" className="cursor-pointer font-normal">Non-responder (&lt;0.5%)</Label>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION J - Weight, BP & Renal Outcomes */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Weight, BP & Renal Outcomes</h3>
            
            <div className="space-y-3">
              <Label className="text-base font-medium">Weight change:</Label>
              <div className="space-y-2 ml-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="weightLoss3"
                    name="weightChange"
                    value="Loss ≥3 kg"
                    checked={formData.weightChange === "Loss ≥3 kg"}
                    onChange={() => setFormData({ ...formData, weightChange: "Loss ≥3 kg" })}
                  />
                  <Label htmlFor="weightLoss3" className="cursor-pointer font-normal">Loss ≥3 kg</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="weightLoss1to3"
                    name="weightChange"
                    value="Loss 1–2.9 kg"
                    checked={formData.weightChange === "Loss 1–2.9 kg"}
                    onChange={() => setFormData({ ...formData, weightChange: "Loss 1–2.9 kg" })}
                  />
                  <Label htmlFor="weightLoss1to3" className="cursor-pointer font-normal">Loss 1–2.9 kg</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="weightNeutral"
                    name="weightChange"
                    value="Neutral"
                    checked={formData.weightChange === "Neutral"}
                    onChange={() => setFormData({ ...formData, weightChange: "Neutral" })}
                  />
                  <Label htmlFor="weightNeutral" className="cursor-pointer font-normal">Neutral</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="weightGain"
                    name="weightChange"
                    value="Gain"
                    checked={formData.weightChange === "Gain"}
                    onChange={() => setFormData({ ...formData, weightChange: "Gain" })}
                  />
                  <Label htmlFor="weightGain" className="cursor-pointer font-normal">Gain</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Label className="text-base font-medium">Renal outcome:</Label>
              <div className="space-y-2 ml-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="renalImproved"
                    name="renalOutcome"
                    value="Improved eGFR"
                    checked={formData.renalOutcome === "Improved eGFR"}
                    onChange={() => setFormData({ ...formData, renalOutcome: "Improved eGFR" })}
                  />
                  <Label htmlFor="renalImproved" className="cursor-pointer font-normal">Improved eGFR</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="renalStable"
                    name="renalOutcome"
                    value="Stable eGFR"
                    checked={formData.renalOutcome === "Stable eGFR"}
                    onChange={() => setFormData({ ...formData, renalOutcome: "Stable eGFR" })}
                  />
                  <Label htmlFor="renalStable" className="cursor-pointer font-normal">Stable eGFR</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="renalDeclineLess"
                    name="renalOutcome"
                    value="Decline <10%"
                    checked={formData.renalOutcome === "Decline <10%"}
                    onChange={() => setFormData({ ...formData, renalOutcome: "Decline <10%" })}
                  />
                  <Label htmlFor="renalDeclineLess" className="cursor-pointer font-normal">Decline &lt;10%</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="renalDeclineMore"
                    name="renalOutcome"
                    value="Decline ≥10%"
                    checked={formData.renalOutcome === "Decline ≥10%"}
                    onChange={() => setFormData({ ...formData, renalOutcome: "Decline ≥10%" })}
                  />
                  <Label htmlFor="renalDeclineMore" className="cursor-pointer font-normal">Decline ≥10%</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Blood pressure control achieved (as per physician)? *</Label>
              <div className="flex gap-6 ml-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bpControl"
                    value="yes"
                    checked={formData.bpControlAchieved === true}
                    onChange={() => setFormData({ ...formData, bpControlAchieved: true })}
                  />
                  <span className="text-sm">Yes</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bpControl"
                    value="no"
                    checked={formData.bpControlAchieved === false}
                    onChange={() => setFormData({ ...formData, bpControlAchieved: false })}
                  />
                  <span className="text-sm">No</span>
                </Label>
              </div>
            </div>
          </div>

          {/* SECTION K - Adherence & Treatment Durability */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Adherence & Treatment Durability</h3>
            
            <div className="space-y-3">
              <Label className="text-base font-medium">Patient continuing KC MeSempa at Week 12? *</Label>
              <div className="flex gap-6 ml-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="continuing"
                    value="yes"
                    checked={formData.patientContinuingTreatment === true}
                    onChange={() => setFormData({ ...formData, patientContinuingTreatment: true, discontinuationReason: "" })}
                  />
                  <span className="text-sm">Yes</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="continuing"
                    value="no"
                    checked={formData.patientContinuingTreatment === false}
                    onChange={() => setFormData({ ...formData, patientContinuingTreatment: false })}
                  />
                  <span className="text-sm">No</span>
                </Label>
              </div>
            </div>

            {formData.patientContinuingTreatment === false && (
              <div className="space-y-3 ml-6">
                <Label className="text-base font-medium">If discontinued, reason: *</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="reasonAdverseEvent"
                      name="discontinuationReason"
                      value="Adverse event"
                      checked={formData.discontinuationReason === "Adverse event"}
                      onChange={() => setFormData({ ...formData, discontinuationReason: "Adverse event", discontinuationReasonOther: "" })}
                    />
                    <Label htmlFor="reasonAdverseEvent" className="cursor-pointer font-normal">Adverse event</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="reasonLackEfficacy"
                      name="discontinuationReason"
                      value="Lack of efficacy"
                      checked={formData.discontinuationReason === "Lack of efficacy"}
                      onChange={() => setFormData({ ...formData, discontinuationReason: "Lack of efficacy", discontinuationReasonOther: "" })}
                    />
                    <Label htmlFor="reasonLackEfficacy" className="cursor-pointer font-normal">Lack of efficacy</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="reasonCost"
                      name="discontinuationReason"
                      value="Cost"
                      checked={formData.discontinuationReason === "Cost"}
                      onChange={() => setFormData({ ...formData, discontinuationReason: "Cost", discontinuationReasonOther: "" })}
                    />
                    <Label htmlFor="reasonCost" className="cursor-pointer font-normal">Cost</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="reasonPatientPref"
                      name="discontinuationReason"
                      value="Patient preference"
                      checked={formData.discontinuationReason === "Patient preference"}
                      onChange={() => setFormData({ ...formData, discontinuationReason: "Patient preference", discontinuationReasonOther: "" })}
                    />
                    <Label htmlFor="reasonPatientPref" className="cursor-pointer font-normal">Patient preference</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="reasonOther"
                      name="discontinuationReason"
                      value="Other"
                      checked={formData.discontinuationReason === "Other"}
                      onChange={() => setFormData({ ...formData, discontinuationReason: "Other" })}
                    />
                    <Label htmlFor="reasonOther" className="cursor-pointer font-normal">Other</Label>
                  </div>
                  {formData.discontinuationReason === "Other" && (
                    <Input
                      type="text"
                      placeholder="Please specify..."
                      value={formData.discontinuationReasonOther}
                      onChange={(e) => setFormData({ ...formData, discontinuationReasonOther: e.target.value })}
                      className="ml-6"
                      required
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-medium">Missed doses in last 7 days: *</Label>
              <div className="space-y-2 ml-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="missedDoses0"
                    name="missedDoses"
                    value="0"
                    checked={formData.missedDoses === "0"}
                    onChange={() => setFormData({ ...formData, missedDoses: "0" })}
                  />
                  <Label htmlFor="missedDoses0" className="cursor-pointer font-normal">0</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="missedDoses1to2"
                    name="missedDoses"
                    value="1–2"
                    checked={formData.missedDoses === "1–2"}
                    onChange={() => setFormData({ ...formData, missedDoses: "1–2" })}
                  />
                  <Label htmlFor="missedDoses1to2" className="cursor-pointer font-normal">1–2</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="missedDoses3to5"
                    name="missedDoses"
                    value="3–5"
                    checked={formData.missedDoses === "3–5"}
                    onChange={() => setFormData({ ...formData, missedDoses: "3–5" })}
                  />
                  <Label htmlFor="missedDoses3to5" className="cursor-pointer font-normal">3–5</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="missedDosesMore5"
                    name="missedDoses"
                    value=">5"
                    checked={formData.missedDoses === ">5"}
                    onChange={() => setFormData({ ...formData, missedDoses: ">5" })}
                  />
                  <Label htmlFor="missedDosesMore5" className="cursor-pointer font-normal">&gt;5</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Any add-on / change in anti-diabetic therapy?</Label>
              <div className="flex gap-6 ml-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addOnTherapy"
                    value="no"
                    checked={formData.addOnTherapy === false}
                    onChange={() => setFormData({ ...formData, addOnTherapy: false, addOnTherapyDetails: "" })}
                  />
                  <span className="text-sm">No</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addOnTherapy"
                    value="yes"
                    checked={formData.addOnTherapy === true}
                    onChange={() => setFormData({ ...formData, addOnTherapy: true })}
                  />
                  <span className="text-sm">Yes (specify drug + dose)</span>
                </Label>
              </div>
            </div>

            {formData.addOnTherapy === true && (
              <div className="space-y-2 ml-6">
                <Input
                  id="addOnDetails"
                  type="text"
                  placeholder="E.g. Linagliptin 5mg daily"
                  value={formData.addOnTherapyDetails}
                  onChange={(e) => setFormData({ ...formData, addOnTherapyDetails: e.target.value })}
                  required={formData.addOnTherapy === true}
                />
              </div>
            )}
          </div>

          {/* SECTION L - Safety & Adverse Events */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Safety & Adverse Events</h3>
            
            <div className="space-y-3">
              <Label className="text-base font-medium">Any adverse event during study period?</Label>
              <div className="flex gap-6 ml-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="adverseEventPresent"
                    value="no"
                    checked={formData.adverseEventsPresent === false}
                    onChange={() => {
                      setFormData({ ...formData, adverseEventsPresent: false })
                      setAdverseEvents([])
                    }}
                  />
                  <span className="text-sm">No</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="adverseEventPresent"
                    value="yes"
                    checked={formData.adverseEventsPresent === true}
                    onChange={() => {
                      setFormData({ ...formData, adverseEventsPresent: true })
                      if (adverseEvents.length === 0) {
                        setAdverseEvents([buildEmptyAdverseEvent()])
                      }
                    }}
                  />
                  <span className="text-sm">Yes (complete below)</span>
                </Label>
              </div>
            </div>

            {formData.adverseEventsPresent === true && (
              <div className="space-y-4 ml-6 border-l-2 border-blue-200 pl-4">
                {adverseEvents.map((event, index) => (
                  <div key={event.id} className="space-y-4 rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Adverse Event #{index + 1}</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => confirmRemoveAdverseEvent(event.id)} aria-label={`Delete adverse event number ${index + 1}`}>
                        Remove
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`ae-term-${event.id}`}>AE Term (MedDRA preferred term) *</Label>
                      <Input
                        id={`ae-term-${event.id}`}
                        type="text"
                        placeholder="Enter adverse event term"
                        value={event.aeTerm}
                        onChange={(e) => updateAdverseEvent(event.id, { aeTerm: e.target.value })}
                        aria-label={`Adverse event term for event number ${adverseEvents.indexOf(event) + 1} using MedDRA preferred terminology required`}
                        aria-required={formData.adverseEventsPresent === true}
                        required={formData.adverseEventsPresent === true}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`ae-onset-${event.id}`}>Onset Date *</Label>
                        <DateField
                          id={`ae-onset-${event.id}`}
                          value={event.onsetDate}
                          onChangeAction={(value) => updateAdverseEvent(event.id, { onsetDate: value })}
                          min="1900-01-01"
                          max="2100-12-31"
                          ariaLabel={`Onset date for adverse event number ${adverseEvents.indexOf(event) + 1} required`}
                          required={formData.adverseEventsPresent === true}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ae-stop-${event.id}`}>Stop Date</Label>
                        <DateField
                          id={`ae-stop-${event.id}`}
                          value={event.stopDate || ""}
                          onChangeAction={(value) => updateAdverseEvent(event.id, { stopDate: value })}
                          min="1900-01-01"
                          max="2100-12-31"
                          ariaLabel={`Stop date for adverse event number ${adverseEvents.indexOf(event) + 1}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Severity *</Label>
                      <div className="flex flex-wrap gap-4">
                        {(["Mild", "Moderate", "Severe"] as const).map((option) => (
                          <Label key={option} className="flex items-center gap-2 cursor-pointer font-normal">
                            <input
                              type="radio"
                              name={`severity-${event.id}`}
                              checked={event.severity === option}
                              onChange={() => updateAdverseEvent(event.id, { severity: option })}
                            />
                            <span>{option}</span>
                          </Label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Serious *</Label>
                      <div className="flex flex-wrap gap-4">
                        {(["Yes", "No"] as const).map((option) => (
                          <Label key={option} className="flex items-center gap-2 cursor-pointer font-normal">
                            <input
                              type="radio"
                              name={`serious-${event.id}`}
                              checked={event.serious === option}
                              onChange={() => updateAdverseEvent(event.id, { serious: option })}
                            />
                            <span>{option}</span>
                          </Label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Action Taken *</Label>
                      <div className="grid md:grid-cols-2 gap-2">
                        {(["None", "Dose adjusted", "Drug stopped", "Referred", "Other"] as const).map((option) => (
                          <Label key={option} className="flex items-center gap-2 cursor-pointer font-normal">
                            <input
                              type="radio"
                              name={`action-${event.id}`}
                              checked={event.actionTaken === option}
                              onChange={() => updateAdverseEvent(event.id, { actionTaken: option })}
                            />
                            <span>{option}</span>
                          </Label>
                        ))}
                      </div>
                      {event.actionTaken === "Other" && (
                        <Input
                          type="text"
                          placeholder="Specify action taken"
                          value={event.actionTakenOther || ""}
                          onChange={(e) => updateAdverseEvent(event.id, { actionTakenOther: e.target.value })}
                          required
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Outcome *</Label>
                      <div className="flex flex-wrap gap-4">
                        {(["Resolved", "Ongoing"] as const).map((option) => (
                          <Label key={option} className="flex items-center gap-2 cursor-pointer font-normal">
                            <input
                              type="radio"
                              name={`outcome-${event.id}`}
                              checked={event.outcome === option}
                              onChange={() => updateAdverseEvent(event.id, { outcome: option })}
                            />
                            <span>{option}</span>
                          </Label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addAdverseEvent}>
                  + Add Another Adverse Event
                </Button>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-medium">Events of Special Interest (tick all that apply)</Label>
              <div className="space-y-2 ml-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.hypoglycemiaMild}
                    onCheckedChange={(checked) => setFormData({ ...formData, hypoglycemiaMild: checked as boolean })}
                  />
                  <span className="font-normal">Hypoglycemia - mild (ADA Level 1-Blood Glucose &lt;70 mg/dL and &ge;54 mg/dL)</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.hypoglycemiaModerate}
                    onCheckedChange={(checked) => setFormData({ ...formData, hypoglycemiaModerate: checked as boolean })}
                  />
                  <span className="font-normal">Hypoglycemia - moderate (ADA Level 2 - Blood glucose &lt;54 mg/dL)</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.hypoglycemiaSevere}
                    onCheckedChange={(checked) => setFormData({ ...formData, hypoglycemiaSevere: checked as boolean })}
                  />
                  <span className="font-normal">Hypoglycemia – severe</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.uti}
                    onCheckedChange={(checked) => setFormData({ ...formData, uti: checked as boolean })}
                  />
                  <span className="font-normal">UTI</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.genitalInfection}
                    onCheckedChange={(checked) => setFormData({ ...formData, genitalInfection: checked as boolean })}
                  />
                  <span className="font-normal">Genital mycotic infection</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.dizzinessDehydration}
                    onCheckedChange={(checked) => setFormData({ ...formData, dizzinessDehydration: checked as boolean })}
                  />
                  <span className="font-normal">Dizziness / dehydration symptoms</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.hospitalizationErVisit}
                    onCheckedChange={(checked) => setFormData({ ...formData, hospitalizationErVisit: checked as boolean, hospitalizationReason: "" })}
                  />
                  <span className="font-normal">Hospitalization / ER visit</span>
                </Label>
                {formData.hospitalizationErVisit && (
                  <Input
                    type="text"
                    placeholder="Specify reason..."
                    value={formData.hospitalizationReason}
                    onChange={(e) => setFormData({ ...formData, hospitalizationReason: e.target.value })}
                    className="ml-6"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION M - Physician Global Assessment */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Physician Global Assessment</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="efficacy">Overall Efficacy *</Label>
                <select
                  id="efficacy"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.overallEfficacy}
                  onChange={(e) => setFormData({ ...formData, overallEfficacy: e.target.value })}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tolerability">Overall Tolerability *</Label>
                <select
                  id="tolerability"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.overallTolerability}
                  onChange={(e) => setFormData({ ...formData, overallTolerability: e.target.value })}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compliance">Compliance *</Label>
                <select
                  id="compliance"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.complianceJudgment}
                  onChange={(e) => setFormData({ ...formData, complianceJudgment: e.target.value })}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-medium">Would you prefer KC MeSempa for long-term therapy?</Label>
              <div className="flex gap-6 ml-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="preferLongTerm"
                    value="yes"
                    checked={formData.preferLongTerm === true}
                    onChange={() => setFormData({ ...formData, preferLongTerm: true })}
                  />
                  <span className="text-sm">Yes</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="preferLongTerm"
                    value="no"
                    checked={formData.preferLongTerm === false}
                    onChange={() => setFormData({ ...formData, preferLongTerm: false })}
                  />
                  <span className="text-sm">No</span>
                </Label>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="font-semibold">Patient profiles where KC MeSempa is preferred:</Label>
              <div className="space-y-2 ml-6">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.uncontrolledT2dm}
                    onCheckedChange={(checked) => setFormData({ ...formData, uncontrolledT2dm: checked as boolean })}
                  />
                  Uncontrolled T2DM
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.obeseT2dm}
                    onCheckedChange={(checked) => setFormData({ ...formData, obeseT2dm: checked as boolean })}
                  />
                  Obese T2DM
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.ckdPatients}
                    onCheckedChange={(checked) => setFormData({ ...formData, ckdPatients: checked as boolean })}
                  />
                  CKD patients
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.htnT2dm}
                    onCheckedChange={(checked) => setFormData({ ...formData, htnT2dm: checked as boolean })}
                  />
                  HTN + T2DM
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.elderlyPatients}
                    onCheckedChange={(checked) => setFormData({ ...formData, elderlyPatients: checked as boolean })}
                  />
                  Elderly patients
                </Label>
              </div>
            </div>
          </div>

          {/* SECTION O - Data Privacy & Confidentiality */}
          <div className="space-y-4 pt-4 border-t bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Data Privacy & Confidentiality *</h3>
            <p className="text-sm text-gray-600">Please confirm the following statements (all are mandatory):</p>
            
            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.noPersonalIdentifiers}
                onCheckedChange={(checked) => setFormData({ ...formData, noPersonalIdentifiers: checked === true })}
                className="mt-1"
              />
              <span className="text-sm">No personal identifiers recorded in this CRF</span>
            </Label>

            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.dataAsRoutinePractice}
                onCheckedChange={(checked) => setFormData({ ...formData, dataAsRoutinePractice: checked === true })}
                className="mt-1"
              />
              <span className="text-sm">Data collected as part of routine clinical practice</span>
            </Label>

            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.patientIdentityMapping}
                onCheckedChange={(checked) => setFormData({ ...formData, patientIdentityMapping: checked === true })}
                className="mt-1"
              />
              <span className="text-sm">Patient identity mapping retained only at clinic level</span>
            </Label>
          </div>

          {/* SECTION P - Physician Declaration */}
          <div className="space-y-4 pt-4 border-t bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Physician Declaration *</h3>
            
            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.physicianConfirmation}
                onCheckedChange={(checked) => setFormData({ ...formData, physicianConfirmation: checked === true })}
                className="mt-1"
              />
              <span className="text-sm">
                I confirm that the above information is accurate and recorded as part of standard clinical practice.
              </span>
            </Label>
          </div>

          {/* Additional Comments */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Additional Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments (optional)</Label>
              <Textarea
                id="comments"
                placeholder="Any additional observations or clinical notes"
                value={formData.additionalComments}
                onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                rows={3}
              />
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
                "Save Follow-up Assessment"
              )}
            </Button>
          </div>

          {timelinePopup.open && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-lg bg-background border border-border p-6 space-y-4">
                <h4 className="text-lg font-semibold">{timelinePopup.title}</h4>
                <p className="text-sm text-muted-foreground">{timelinePopup.message}</p>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setTimelinePopup({ open: false, title: "", message: "" })}>
                    OK
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mandatoryPopup.open && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-lg bg-background border border-border p-6 space-y-4">
                <h4 className="text-lg font-semibold text-red-600">{mandatoryPopup.title}</h4>
                <p className="text-sm text-muted-foreground">{mandatoryPopup.message}</p>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setMandatoryPopup({ open: false, title: "", message: "" })}>
                    OK
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Confirmation dialog for deleting adverse events */}
        <AlertDialog open={!!deletingAdverseEventId} onOpenChange={(open) => { if (!open) setDeletingAdverseEventId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Adverse Event?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this adverse event? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingAdverseEventId && removeAdverseEvent(deletingAdverseEventId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
})
