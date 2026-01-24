"use client"

import type React from "react"

import { useState, memo } from "react"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DOMPurify from "dompurify"
import type { FollowUpData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useIndexedDBSync } from "@/hooks/use-indexed-db-sync"
import { Textarea } from "@/components/ui/textarea"

interface FollowUpFormProps {
  patientId: string
  existingData: FollowUpData | null
  onSuccess: () => void
}

export const FollowUpForm = memo(function FollowUpForm({ patientId, existingData, onSuccess }: FollowUpFormProps) {
  const { toast } = useToast()
  const { saveFormData } = useIndexedDBSync(patientId)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    visitDate: existingData?.visitDate || "",
    hba1c: existingData?.hba1c?.toString() || "",
    fpg: existingData?.fpg?.toString() || "",
    ppg: existingData?.ppg?.toString() || "",
    weight: existingData?.weight?.toString() || "",
    bloodPressureSystolic: existingData?.bloodPressureSystolic?.toString() || "",
    bloodPressureDiastolic: existingData?.bloodPressureDiastolic?.toString() || "",
    serumCreatinine: existingData?.serumCreatinine?.toString() || "",
    egfr: existingData?.egfr?.toString() || "",
    urinalysisType: existingData?.urinalysis?.startsWith("Abnormal") ? "Abnormal" : "Normal",
    urinalysisSpecify: existingData?.urinalysis?.startsWith("Abnormal") 
      ? existingData.urinalysis.replace("Abnormal: ", "") 
      : "",
    hba1cResponse: "",
    weightChange: "",
    bpControlAchieved: false,
    renalOutcome: "",
    patientContinuingTreatment: true,
    discontinuationReason: "",
    discontinuationReasonOther: "",
    missedDoses: "",
    addOnTherapy: false,
    addOnTherapyDetails: "",
    adverseEventsPresent: false,
    adverseEventsText: existingData?.adverseEvents || "",
    hypoglycemiaMild: false,
    hypoglycemiaModerate: false,
    hypoglycemiaSevere: false,
    uti: false,
    genitalInfection: false,
    dizzinessDehydration: false,
    hospitalizationErVisit: false,
    hospitalizationReason: "",
    overallEfficacy: existingData?.efficacy || "",
    overallTolerability: existingData?.tolerability || "",
    complianceJudgment: existingData?.compliance || "",
    preferLongTerm: false,
    uncontrolledT2dm: false,
    obeseT2dm: false,
    ckdPatients: false,
    htnT2dm: false,
    elderlyPatients: false,
    overallSatisfaction: existingData?.satisfaction || "",
    giTolerance: "",
    confidenceInManaging: "",
    noPersonalIdentifiers: false,
    dataAsRoutinePractice: false,
    patientIdentityMapping: false,
    physicianConfirmation: false,
    additionalComments: existingData?.comments || "",
  })

  const [actionTaken, setActionTaken] = useState({
    None: existingData?.actionTaken?.includes("None") || false,
    AdjustedDose: existingData?.actionTaken?.includes("Adjusted dose") || false,
    StoppedMedication: existingData?.actionTaken?.includes("Stopped medication") || false,
    Referred: existingData?.actionTaken?.includes("Referred") || false,
    Other: existingData?.actionTaken?.includes("Other") || false,
  })

  const [outcome, setOutcome] = useState({
    Resolved: existingData?.outcome?.includes("Resolved") || false,
    Ongoing: existingData?.outcome?.includes("Ongoing") || false,
    Unknown: existingData?.outcome?.includes("Unknown") || false,
  })

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault()
    setLoading(true)

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
      if (!formData.patientContinuingTreatment && !formData.discontinuationReason) validationErrors.push("Please specify discontinuation reason")
      if (!formData.missedDoses && formData.missedDoses !== "0") validationErrors.push("Missed doses information is required")
      if (!formData.overallEfficacy) validationErrors.push("Overall efficacy is required")
      if (!formData.overallTolerability) validationErrors.push("Overall tolerability is required")
      if (!formData.complianceJudgment) validationErrors.push("Compliance judgment is required")
      if (!formData.overallSatisfaction) validationErrors.push("Overall satisfaction is required")

      if (!saveAsDraft && validationErrors.length > 0) {
        setLoading(false)
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: validationErrors.slice(0, 3).join(", ") + (validationErrors.length > 3 ? ` and ${validationErrors.length - 3} more` : ""),
        })
        return
      }

      // VALIDATION PHASE 2: Parse and validate numeric ranges
      const hba1c = Number.parseFloat(formData.hba1c)
      const fpg = Number.parseFloat(formData.fpg)
      const weight = Number.parseFloat(formData.weight)
      const bpSystolic = Number.parseInt(formData.bloodPressureSystolic)
      const bpDiastolic = Number.parseInt(formData.bloodPressureDiastolic)

      const rangeErrors: string[] = []
      
      if (formData.hba1c && (isNaN(hba1c) || hba1c < 4 || hba1c > 15)) rangeErrors.push("HbA1c must be between 4-15%")
      if (formData.fpg && (isNaN(fpg) || fpg < 50 || fpg > 500)) rangeErrors.push("FPG must be between 50-500 mg/dL")
      if (formData.weight && (isNaN(weight) || weight < 30 || weight > 200)) rangeErrors.push("Weight must be between 30-200 kg")
      if (formData.bloodPressureSystolic && (isNaN(bpSystolic) || bpSystolic < 70 || bpSystolic > 200)) rangeErrors.push("BP Systolic must be between 70-200 mmHg")
      if (formData.bloodPressureDiastolic && (isNaN(bpDiastolic) || bpDiastolic < 40 || bpDiastolic > 130)) rangeErrors.push("BP Diastolic must be between 40-130 mmHg")

      if (!saveAsDraft && rangeErrors.length > 0) {
        setLoading(false)
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

      const sanitizedFormData = sanitizeObject(formData, ["urinalysisSpecify", "addOnTherapyDetails", "hospitalizationReason", "adverseEventsText"])

      const data = {
        patientId,
        visitDate: formData.visitDate,
        hba1c: formData.hba1c ? Number.parseFloat(formData.hba1c) : null,
        fpg: formData.fpg ? Number.parseFloat(formData.fpg) : null,
        ppg: formData.ppg ? Number.parseFloat(formData.ppg) : null,
        weight: formData.weight ? Number.parseFloat(formData.weight) : null,
        bloodPressureSystolic: formData.bloodPressureSystolic ? Number.parseInt(formData.bloodPressureSystolic) : null,
        bloodPressureDiastolic: formData.bloodPressureDiastolic ? Number.parseInt(formData.bloodPressureDiastolic) : null,
        serumCreatinine: formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : null,
        egfr: formData.egfr ? Number.parseFloat(formData.egfr) : null,
        urinalysis: formData.urinalysisType === "Abnormal" && sanitizedFormData.urinalysisSpecify ? 
          `Abnormal: ${sanitizedFormData.urinalysisSpecify}` : "Normal",
        glycemicResponse: {
          category: formData.hba1cResponse,
        },
        outcomes: {
          weightChange: formData.weightChange,
          bpControlAchieved: formData.bpControlAchieved,
          renalOutcome: formData.renalOutcome,
        },
        adherence: {
          patientContinuingTreatment: formData.patientContinuingTreatment,
          discontinuationReason: formData.discontinuationReason || null,
          missedDosesInLast7Days: formData.missedDoses || null,
          addOnOrChangedTherapy: formData.addOnTherapy,
          addOnOrChangedTherapyDetails: formData.addOnTherapy ? sanitizedFormData.addOnTherapyDetails : null,
        },
        adverseEvents: formData.adverseEventsText,
        actionTaken: Object.entries(actionTaken)
          .filter(([_, value]) => value)
          .map(([key]) =>
            key === "AdjustedDose" ? "Adjusted dose" : key === "StoppedMedication" ? "Stopped medication" : key,
          ),
        outcome: Object.entries(outcome)
          .filter(([_, value]) => value)
          .map(([key]) => key),
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
          preferKcMeSempaForLongTerm: formData.preferLongTerm,
          preferredPatientProfiles: {
            uncontrolledT2dm: formData.uncontrolledT2dm,
            obeseT2dm: formData.obeseT2dm,
            ckdPatients: formData.ckdPatients,
            htnPlusT2dm: formData.htnT2dm,
            elderlyPatients: formData.elderlyPatients,
          },
        },
        patientReportedOutcomes: {
          overallSatisfaction: formData.overallSatisfaction,
          giToleranceVsPriorTherapy: formData.giTolerance,
          confidenceInManagingDiabetes: formData.confidenceInManaging,
        },
        dataPrivacy: {
          noPersonalIdentifiersRecorded: formData.noPersonalIdentifiers,
          dataCollectedAsRoutineClinicalPractice: formData.dataAsRoutinePractice,
          patientIdentityMappingAtClinicOnly: true,
        },
        physicianDeclaration: {
          confirmationCheckbox: formData.physicianConfirmation,
        },
        comments: formData.additionalComments,
        isDraft: saveAsDraft,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // CRITICAL: Save to IndexedDB FIRST (immediate, offline-safe)
      const formId = (existingData as any)?.id || `followup-${patientId}-${Date.now()}`
      const idbResult = await saveFormData(
        formId,
        'followup',
        data,
        saveAsDraft,
        saveAsDraft ? [] : validationErrors
      )

      if (!idbResult.success) {
        setLoading(false)
        toast({
          variant: "destructive",
          title: "Error saving locally",
          description: idbResult.error || "Failed to save to local storage",
        })
        return
      }

      // Only submit to Firebase if not draft (background sync will handle it)
      if (!saveAsDraft) {
        try {
          if (existingData && (existingData as any).id) {
            await updateDoc(doc(db, "followUpData", (existingData as any).id), data)
          } else {
            const docRef = await addDoc(collection(db, "followUpData"), data)
            // Store Firebase ID for future updates
            await saveFormData(
              formId,
              'followup',
              { ...data, firebaseId: docRef.id },
              false,
              validationErrors
            )
          }
        } catch (firebaseError) {
          // Don't fail - already saved locally, will sync in background
          if (process.env.NODE_ENV === 'development') {
            console.warn('Firebase save failed, will retry:', firebaseError)
          }
        }
      }

      toast({
        title: saveAsDraft ? "✓ Saved as draft" : "✓ Follow-up assessment saved",
        description: saveAsDraft ? "You can continue editing later." : "Week 12 assessment has been recorded.",
      })

      setLoading(false)
      onSuccess()
    } catch (error) {
      setLoading(false)
      if (process.env.NODE_ENV === 'development') {
        console.error("Error saving follow-up data:", error)
      }
      toast({
        variant: "destructive",
        title: "Error saving data",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Assessment (Week 12 ± 2 weeks)</CardTitle>
        <CardDescription>Record end-of-study clinical measurements and outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION H - Follow-up Visit Date */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg">Follow-up Visit (Week 12 ± 2 weeks)</h3>
            <div className="space-y-2">
              <Label htmlFor="visitDate">Date of Visit *</Label>
              <Input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                required
              />
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
                  placeholder="6.8"
                  value={formData.hba1c}
                  onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fpg">FPG (mg/dL) *</Label>
                <Input
                  id="fpg"
                  type="number"
                  placeholder="120"
                  value={formData.fpg}
                  onChange={(e) => setFormData({ ...formData, fpg: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppg">PPG (mg/dL)</Label>
                <Input
                  id="ppg"
                  type="number"
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
                  placeholder="80"
                  value={formData.bloodPressureDiastolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creatinine">Serum Creatinine (mg/dL)</Label>
                <Input
                  id="creatinine"
                  type="number"
                  step="0.01"
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
                    value="Decline &lt;10%"
                    checked={formData.renalOutcome === "Decline &lt;10%"}
                    onChange={() => setFormData({ ...formData, renalOutcome: "Decline &lt;10%" })}
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
                    checked={formData.patientContinuingTreatment}
                    onChange={() => setFormData({ ...formData, patientContinuingTreatment: true, discontinuationReason: "" })}
                  />
                  <span className="text-sm">Yes</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="continuing"
                    value="no"
                    checked={!formData.patientContinuingTreatment}
                    onChange={() => setFormData({ ...formData, patientContinuingTreatment: false })}
                  />
                  <span className="text-sm">No</span>
                </Label>
              </div>
            </div>

            {!formData.patientContinuingTreatment && (
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
                    checked={!formData.addOnTherapy}
                    onChange={() => setFormData({ ...formData, addOnTherapy: false, addOnTherapyDetails: "" })}
                  />
                  <span className="text-sm">No</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addOnTherapy"
                    value="yes"
                    checked={formData.addOnTherapy}
                    onChange={() => setFormData({ ...formData, addOnTherapy: true })}
                  />
                  <span className="text-sm">Yes (specify drug + dose)</span>
                </Label>
              </div>
            </div>

            {formData.addOnTherapy && (
              <div className="space-y-2 ml-6">
                <Input
                  id="addOnDetails"
                  type="text"
                  placeholder="E.g. Linagliptin 5mg daily"
                  value={formData.addOnTherapyDetails}
                  onChange={(e) => setFormData({ ...formData, addOnTherapyDetails: e.target.value })}
                  required={formData.addOnTherapy}
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
                    checked={!formData.adverseEventsPresent}
                    onChange={() => setFormData({ ...formData, adverseEventsPresent: false, adverseEventsText: "" })}
                  />
                  <span className="text-sm">No</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="adverseEventPresent"
                    value="yes"
                    checked={formData.adverseEventsPresent}
                    onChange={() => setFormData({ ...formData, adverseEventsPresent: true })}
                  />
                  <span className="text-sm">Yes (complete below)</span>
                </Label>
              </div>
            </div>

            {formData.adverseEventsPresent && (
              <div className="space-y-4 ml-6 border-l-2 border-blue-200 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="adverseEventsText">Adverse Event Details (MedDRA preferred term) *</Label>
                  <Textarea
                    id="adverseEventsText"
                    placeholder="AE Term, Onset Date, Severity, Serious (Yes/No), Action Taken, Outcome"
                    value={formData.adverseEventsText}
                    onChange={(e) => setFormData({ ...formData, adverseEventsText: e.target.value })}
                    rows={4}
                    required={formData.adverseEventsPresent}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Action Taken</Label>
                  <div className="space-y-2">
                    {Object.entries(actionTaken).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) => setActionTaken({ ...actionTaken, [key]: checked as boolean })}
                        />
                        <Label htmlFor={key} className="cursor-pointer font-normal">
                          {key === "AdjustedDose"
                            ? "Adjusted dose"
                            : key === "StoppedMedication"
                              ? "Stopped medication"
                              : key}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Outcome</Label>
                  <div className="space-y-2">
                    {Object.entries(outcome).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`outcome-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => setOutcome({ ...outcome, [key]: checked as boolean })}
                        />
                        <Label htmlFor={`outcome-${key}`} className="cursor-pointer font-normal">
                          {key}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
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
                  <span className="font-normal">Hypoglycemia – mild</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.hypoglycemiaModerate}
                    onCheckedChange={(checked) => setFormData({ ...formData, hypoglycemiaModerate: checked as boolean })}
                  />
                  <span className="font-normal">Hypoglycemia – moderate</span>
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

          {/* SECTION N - Patient-Reported Outcomes */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Patient-Reported Outcomes</h3>
            
            <div className="space-y-2">
              <Label htmlFor="satisfaction">Overall satisfaction with therapy *</Label>
              <select
                id="satisfaction"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.overallSatisfaction}
                onChange={(e) => setFormData({ ...formData, overallSatisfaction: e.target.value })}
                required
              >
                <option value="">Select...</option>
                <option value="Very satisfied">Very satisfied</option>
                <option value="Satisfied">Satisfied</option>
                <option value="Neutral">Neutral</option>
                <option value="Not satisfied">Not satisfied</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="giTolerance">GI tolerance vs prior therapy</Label>
              <select
                id="giTolerance"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.giTolerance}
                onChange={(e) => setFormData({ ...formData, giTolerance: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="Improved">Improved</option>
                <option value="Same">Same</option>
                <option value="Worse">Worse</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Patient confidence in managing diabetes</Label>
              <select
                id="confidence"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.confidenceInManaging}
                onChange={(e) => setFormData({ ...formData, confidenceInManaging: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="Improved">Improved</option>
                <option value="Same">Same</option>
                <option value="Worse">Worse</option>
              </select>
            </div>
          </div>

          {/* SECTION O - Data Privacy & Confidentiality */}
          <div className="space-y-4 pt-4 border-t bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Data Privacy & Confidentiality</h3>
            <p className="text-sm text-gray-600">Please confirm the following statements:</p>
            
            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.noPersonalIdentifiers}
                onCheckedChange={(checked) => setFormData({ ...formData, noPersonalIdentifiers: checked as boolean })}
                className="mt-1"
              />
              <span className="text-sm">No personal identifiers recorded in this CRF</span>
            </Label>

            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.dataAsRoutinePractice}
                onCheckedChange={(checked) => setFormData({ ...formData, dataAsRoutinePractice: checked as boolean })}
                className="mt-1"
              />
              <span className="text-sm">Data collected as part of routine clinical practice</span>
            </Label>

            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.patientIdentityMapping}
                onCheckedChange={(checked) => setFormData({ ...formData, patientIdentityMapping: checked as boolean })}
                className="mt-1"
              />
              <span className="text-sm">Patient identity mapping retained only at clinic level</span>
            </Label>
          </div>

          {/* SECTION P - Physician Declaration */}
          <div className="space-y-4 pt-4 border-t bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Physician Declaration</h3>
            
            <Label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.physicianConfirmation}
                onCheckedChange={(checked) => setFormData({ ...formData, physicianConfirmation: checked as boolean })}
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
              {loading ? "Saving..." : "Save Follow-up Assessment"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={loading}
              className="flex-1 bg-transparent"
            >
              Save as Draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
})
