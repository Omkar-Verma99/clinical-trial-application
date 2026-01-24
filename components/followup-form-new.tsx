"use client"

import type React from "react"

import { useState, memo } from "react"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { FollowUpData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { sanitizeInput, sanitizeObject } from "@/lib/sanitize"
import { logError } from "@/lib/error-tracking"
import { useNetworkStatus } from "@/lib/network"

interface FollowUpFormProps {
  patientId: string
  existingData: FollowUpData | null
  baselineData: any
  onSuccess: () => void
}

export const FollowUpForm = memo(function FollowUpForm({ patientId, existingData, baselineData, onSuccess }: FollowUpFormProps) {
  const { toast } = useToast()
  const isOnline = useNetworkStatus()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    visitDate: (existingData as any)?.visitDate || new Date().toISOString().split('T')[0],
    hba1c: existingData?.hba1c?.toString() || "",
    fpg: existingData?.fpg?.toString() || "",
    ppg: existingData?.ppg?.toString() || "",
    weight: existingData?.weight?.toString() || "",
    bloodPressureSystolic: existingData?.bloodPressureSystolic?.toString() || "",
    bloodPressureDiastolic: existingData?.bloodPressureDiastolic?.toString() || "",
    heartRate: existingData?.heartRate?.toString() || "",
    serumCreatinine: existingData?.serumCreatinine?.toString() || "",
    egfr: existingData?.egfr?.toString() || "",
    urinalysis: existingData?.urinalysis || "",
    comments: (existingData as any)?.comments || (existingData as any)?.patientReportedOutcomes?.additionalComments || "",
  })

  // Adherence data
  const [adherence, setAdherence] = useState({
    patientContinuingTreatment: (existingData as any)?.adherence?.patientContinuingTreatment ?? true,
    discontinuationReason: (existingData as any)?.adherence?.discontinuationReason || "",
    missedDosesInLast7Days: (existingData as any)?.adherence?.missedDosesInLast7Days?.toString() || "0",
    addOnOrChangedTherapy: (existingData as any)?.adherence?.addOnOrChangedTherapy || false,
    addOnOrChangedTherapyDetails: (existingData as any)?.adherence?.addOnOrChangedTherapyDetails || "",
  })

  // Adverse events (structured)
  const [eventsOfInterest, setEventsOfInterest] = useState({
    hypoglycemiaMild: (existingData as any)?.eventsOfSpecialInterest?.hypoglycemiaMild || false,
    hypoglycemiaModerate: (existingData as any)?.eventsOfSpecialInterest?.hypoglycemiaModerate || false,
    hypoglycemiaSevere: (existingData as any)?.eventsOfSpecialInterest?.hypoglycemiaSevere || false,
    uti: (existingData as any)?.eventsOfSpecialInterest?.uti || false,
    genitalMycoticInfection: (existingData as any)?.eventsOfSpecialInterest?.genitalMycoticInfection || false,
    dizzinessDehydrationSymptoms: (existingData as any)?.eventsOfSpecialInterest?.dizzinessDehydrationSymptoms || false,
    hospitalizationOrErVisit: (existingData as any)?.eventsOfSpecialInterest?.hospitalizationOrErVisit || false,
    hospitalizationReason: (existingData as any)?.eventsOfSpecialInterest?.hospitalizationReason || "",
  })

  // Physician assessment
  const [physicianAssessment, setPhysicianAssessment] = useState({
    overallEfficacy: (existingData as any)?.physicianAssessment?.overallEfficacy || (existingData?.efficacy as string) || "",
    overallTolerability: (existingData as any)?.physicianAssessment?.overallTolerability || (existingData?.tolerability as string) || "",
    complianceJudgment: (existingData as any)?.physicianAssessment?.complianceJudgment || (existingData?.compliance as string) || "",
    preferKcMeSempaForLongTerm: (existingData as any)?.physicianAssessment?.preferKcMeSempaForLongTerm || false,
  })

  const [patientProfiles, setPatientProfiles] = useState({
    uncontrolledT2dm: (existingData as any)?.physicianAssessment?.preferredPatientProfiles?.uncontrolledT2dm || false,
    obeseT2dm: (existingData as any)?.physicianAssessment?.preferredPatientProfiles?.obeseT2dm || false,
    ckdPatients: (existingData as any)?.physicianAssessment?.preferredPatientProfiles?.ckdPatients || false,
    htnPlusT2dm: (existingData as any)?.physicianAssessment?.preferredPatientProfiles?.htnPlusT2dm || false,
    elderlyPatients: (existingData as any)?.physicianAssessment?.preferredPatientProfiles?.elderlyPatients || false,
  })

  // Patient reported outcomes
  const [patientOutcomes, setPatientOutcomes] = useState({
    overallSatisfaction: (existingData as any)?.patientReportedOutcomes?.overallSatisfaction || (existingData?.satisfaction as string) || "",
    giToleranceVsPriorTherapy: (existingData as any)?.patientReportedOutcomes?.giToleranceVsPriorTherapy || "",
    confidenceInManagingDiabetes: (existingData as any)?.patientReportedOutcomes?.confidenceInManagingDiabetes || "",
  })

  // Adverse Events Table (SECTION L - general AE)
  const [adverseEvents, setAdverseEvents] = useState<Array<{
    id: string
    aeTerm: string
    onsetDate: string
    severity: "Mild" | "Moderate" | "Severe"
    isSerious: boolean
    actionTaken: "None" | "Dose adjusted" | "Drug stopped" | "Referred"
    outcome: "Resolved" | "Ongoing"
  }>>((existingData as any)?.adverseEventsStructured || [])

  const [newAE, setNewAE] = useState({
    aeTerm: "",
    onsetDate: "",
    severity: "Mild" as const,
    isSerious: false,
    actionTaken: "None" as const,
    outcome: "Ongoing" as const,
  })

  // Data Privacy (SECTION O)
  const [dataPrivacy, setDataPrivacy] = useState({
    noPersonalIdentifiersRecorded: (existingData as any)?.dataPrivacy?.noPersonalIdentifiersRecorded || false,
    dataCollectedAsRoutineClinicalPractice: (existingData as any)?.dataPrivacy?.dataCollectedAsRoutineClinicalPractice || false,
    patientIdentityMappingAtClinicOnly: (existingData as any)?.dataPrivacy?.patientIdentityMappingAtClinicOnly || false,
  })

  // Physician Declaration (SECTION P)
  const [physicianDeclaration, setPhysicianDeclaration] = useState({
    confirmationCheckbox: (existingData as any)?.physicianDeclaration?.confirmationCheckbox || false,
    signatureMethod: (existingData as any)?.physicianDeclaration?.signatureMethod || "Checkbox" as const,
  })

  const addAdverseEvent = () => {
    if (!newAE.aeTerm || !newAE.onsetDate) {
      toast({ title: "Error", description: "AE Term and Onset Date are required", variant: "destructive" })
      return
    }

    // Check for duplicate adverse events
    const isDuplicate = adverseEvents.some(
      ae => ae.aeTerm.toLowerCase() === newAE.aeTerm.toLowerCase() && ae.onsetDate === newAE.onsetDate
    )
    
    if (isDuplicate) {
      toast({
        title: "Duplicate Entry",
        description: "This adverse event with the same onset date already exists.",
        variant: "destructive"
      })
      return
    }

    setAdverseEvents([...adverseEvents, { id: Date.now().toString(), ...newAE }])
    setNewAE({ aeTerm: "", onsetDate: "", severity: "Mild", isSerious: false, actionTaken: "None", outcome: "Ongoing" })
  }

  const removeAdverseEvent = (id: string) => {
    setAdverseEvents(adverseEvents.filter((ae) => ae.id !== id))
  }

  // Calculate glycemic response automatically
  const calculateGlycemicResponse = (baseHba1c: number, followUpHba1c: number) => {
    const change = followUpHba1c - baseHba1c
    const percentChange = (change / baseHba1c) * 100

    if (change <= -1.5) return { category: "Super-responder", change, percentChange }
    if (change <= -1.0) return { category: "Responder", change, percentChange }
    if (change <= -0.5) return { category: "Partial responder", change, percentChange }
    return { category: "Non-responder", change, percentChange }
  }

  // Calculate weight and renal outcomes
  const calculateOutcomes = () => {
    const baselineWeight = baselineData?.weight
    const currentWeight = parseFloat(formData.weight)
    const weightDiff = currentWeight - baselineWeight

    let weightCategory = "Neutral"
    if (weightDiff >= 3) weightCategory = "Gain"
    else if (weightDiff >= 1 && weightDiff < 3) weightCategory = "Neutral"
    else if (weightDiff > -3 && weightDiff < 0) weightCategory = "Loss 1–2.9 kg"
    else if (weightDiff <= -3) weightCategory = "Loss ≥3 kg"

    return { weightCategory, weightDiff }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check network connectivity
    if (!isOnline) {
      toast({
        variant: "destructive",
        title: "No Connection",
        description: "Please check your internet connection and try again.",
      })
      return
    }

    setLoading(true)

    try {
      if (!formData.hba1c || !formData.fpg || !formData.weight) {
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: "Please fill in all required clinical parameters.",
        })
        setLoading(false)
        return
      }

      const baselineHba1c = baselineData?.hba1c
      const followUpHba1c = Number.parseFloat(formData.hba1c)
      const glycemicResponse = calculateGlycemicResponse(baselineHba1c, followUpHba1c)
      const outcomes = calculateOutcomes()

      // Calculate renal outcome
      const baselineEgfr = baselineData?.egfr
      const followUpEgfr = formData.egfr ? Number.parseFloat(formData.egfr) : null
      let renalOutcome = "Stable eGFR"
      if (followUpEgfr && baselineEgfr) {
        const change = followUpEgfr - baselineEgfr
        if (change > 0) renalOutcome = "Improved eGFR"
        else if (change >= -10 && change < 0) renalOutcome = "Decline <10%"
        else if (change < -10) renalOutcome = "Decline ≥10%"
      }

      const data = {
        patientId,
        visitDate: formData.visitDate,
        
        // Section H - Clinical Parameters
        hba1c: followUpHba1c,
        fpg: Number.parseFloat(formData.fpg),
        ppg: formData.ppg ? Number.parseFloat(formData.ppg) : null,
        weight: Number.parseFloat(formData.weight),
        bloodPressureSystolic: Number.parseInt(formData.bloodPressureSystolic),
        bloodPressureDiastolic: Number.parseInt(formData.bloodPressureDiastolic),
        heartRate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
        serumCreatinine: formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : null,
        egfr: followUpEgfr,
        urinalysis: formData.urinalysis,
        
        // Section I - Glycemic Response (AUTO-CALCULATED)
        glycemicResponse: {
          category: glycemicResponse.category,
          hba1cChange: Number(glycemicResponse.change.toFixed(2)),
          hba1cPercentageChange: Number(glycemicResponse.percentChange.toFixed(1)),
        },
        
        // Section J - Outcomes
        outcomes: {
          weightChange: outcomes.weightCategory,
          bpControlAchieved: Number.parseInt(formData.bloodPressureSystolic) < 140 && Number.parseInt(formData.bloodPressureDiastolic) < 90,
          renalOutcome,
        },
        
        // Section K - Adherence
        adherence: {
          patientContinuingTreatment: adherence.patientContinuingTreatment,
          discontinuationReason: adherence.discontinuationReason || null,
          missedDosesInLast7Days: adherence.missedDosesInLast7Days,
          addOnOrChangedTherapy: adherence.addOnOrChangedTherapy,
          addOnOrChangedTherapyDetails: adherence.addOnOrChangedTherapyDetails || null,
        },
        
        // Section L - Events of Special Interest
        eventsOfSpecialInterest: eventsOfInterest,
        
        // Section M - Physician Assessment
        physicianAssessment: {
          overallEfficacy: physicianAssessment.overallEfficacy,
          overallTolerability: physicianAssessment.overallTolerability,
          complianceJudgment: physicianAssessment.complianceJudgment,
          preferKcMeSempaForLongTerm: physicianAssessment.preferKcMeSempaForLongTerm,
          preferredPatientProfiles: patientProfiles,
        },
        
        // Section N - Patient Reported Outcomes
        patientReportedOutcomes: {
          overallSatisfaction: patientOutcomes.overallSatisfaction,
          giToleranceVsPriorTherapy: patientOutcomes.giToleranceVsPriorTherapy,
          confidenceInManagingDiabetes: patientOutcomes.confidenceInManagingDiabetes,
          additionalComments: formData.comments,
        },
        
        // Section L - Adverse Events (General AE Table)
        adverseEventsStructured: adverseEvents,
        
        // Section O - Data Privacy & Confidentiality
        dataPrivacy: {
          noPersonalIdentifiersRecorded: dataPrivacy.noPersonalIdentifiersRecorded,
          dataCollectedAsRoutineClinicalPractice: dataPrivacy.dataCollectedAsRoutineClinicalPractice,
          patientIdentityMappingAtClinicOnly: dataPrivacy.patientIdentityMappingAtClinicOnly,
        },
        
        // Section P - Physician Declaration
        physicianDeclaration: {
          physicianName: "Dr. [Auto-filled from doctor profile]",
          qualification: "MBBS, MD [Auto-filled]",
          clinicHospitalName: "Study Site [Auto-filled]",
          confirmationCheckbox: physicianDeclaration.confirmationCheckbox,
          signatureMethod: physicianDeclaration.signatureMethod,
          signatureDate: new Date().toISOString().split('T')[0],
        },
        
        // Legacy fields for backward compatibility
        adverseEvents: "",
        actionTaken: [],
        outcome: [],
        compliance: physicianAssessment.complianceJudgment,
        efficacy: physicianAssessment.overallEfficacy,
        tolerability: physicianAssessment.overallTolerability,
        energyLevels: patientOutcomes.confidenceInManagingDiabetes,
        satisfaction: patientOutcomes.overallSatisfaction,
        comments: formData.comments,
        
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (existingData && (existingData as any).id) {
        await updateDoc(doc(db, "followUpData", (existingData as any).id), data)
        toast({
          title: "Follow-up data updated",
          description: "Week 12 assessment has been updated.",
        })
      } else {
        await addDoc(collection(db, "followUpData"), data)
        toast({
          title: "Follow-up data saved",
          description: "Week 12 assessment has been recorded.",
        })
      }

      onSuccess()
    } catch (error) {
      logError(error as Error, {
        action: "saveFollowUpData",
        severity: "high"
      })
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
        <CardDescription>Record end-of-study measurements, safety, adherence, and outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Clinical & Laboratory Parameters */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Clinical & Laboratory Parameters (Week 12)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="visitDate">Visit Date (Week 12 ± 2 weeks) *</Label>
              <Input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                required
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="urinalysis">Urinalysis *</Label>
              <select
                id="urinalysis"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.urinalysis}
                onChange={(e) => setFormData({ ...formData, urinalysis: e.target.value })}
                required
              >
                <option value="">Select...</option>
                <option value="Normal">Normal</option>
                <option value="Abnormal">Abnormal (specify in comments)</option>
              </select>
            </div>
          </div>

          {/* Adherence & Treatment Durability */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">Adherence & Treatment Durability</h3>
            
            <div className="space-y-3">
              <Label className="text-base">Patient continuing KC MeSempa at Week 12? *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="continuing"
                    checked={adherence.patientContinuingTreatment}
                    onChange={() => setAdherence({ ...adherence, patientContinuingTreatment: true })}
                    className="h-4 w-4"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="continuing"
                    checked={!adherence.patientContinuingTreatment}
                    onChange={() => setAdherence({ ...adherence, patientContinuingTreatment: false })}
                    className="h-4 w-4"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {!adherence.patientContinuingTreatment && (
              <div className="space-y-2">
                <Label htmlFor="discReason">Reason for Discontinuation</Label>
                <select
                  id="discReason"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={adherence.discontinuationReason}
                  onChange={(e) => setAdherence({ ...adherence, discontinuationReason: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Adverse event">Adverse event</option>
                  <option value="Lack of efficacy">Lack of efficacy</option>
                  <option value="Cost">Cost</option>
                  <option value="Patient preference">Patient preference</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Missed doses in last 7 days</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={adherence.missedDosesInLast7Days}
                onChange={(e) => setAdherence({ ...adherence, missedDosesInLast7Days: e.target.value })}
              >
                <option value="0">0</option>
                <option value="1–2">1–2</option>
                <option value="3–5">3–5</option>
                <option value=">5">&gt;5</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="addOn"
                  checked={adherence.addOnOrChangedTherapy}
                  onCheckedChange={(checked) => setAdherence({ ...adherence, addOnOrChangedTherapy: checked as boolean })}
                />
                <Label htmlFor="addOn" className="cursor-pointer font-normal">
                  Any add-on / change in anti-diabetic therapy?
                </Label>
              </div>
              {adherence.addOnOrChangedTherapy && (
                <Input
                  placeholder="Specify drug and dose"
                  value={adherence.addOnOrChangedTherapyDetails}
                  onChange={(e) => setAdherence({ ...adherence, addOnOrChangedTherapyDetails: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Safety - Events of Special Interest */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">Safety - Events of Special Interest</h3>
            
            <div className="space-y-2">
              <Label className="text-base font-semibold">Hypoglycemia</Label>
              <div className="pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hypoMild"
                    checked={eventsOfInterest.hypoglycemiaMild}
                    onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, hypoglycemiaMild: checked as boolean })}
                  />
                  <Label htmlFor="hypoMild" className="cursor-pointer font-normal">Mild</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hypoMod"
                    checked={eventsOfInterest.hypoglycemiaModerate}
                    onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, hypoglycemiaModerate: checked as boolean })}
                  />
                  <Label htmlFor="hypoMod" className="cursor-pointer font-normal">Moderate</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hypoSev"
                    checked={eventsOfInterest.hypoglycemiaSevere}
                    onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, hypoglycemiaSevere: checked as boolean })}
                  />
                  <Label htmlFor="hypoSev" className="cursor-pointer font-normal">Severe</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uti"
                  checked={eventsOfInterest.uti}
                  onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, uti: checked as boolean })}
                />
                <Label htmlFor="uti" className="cursor-pointer font-normal">UTI</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="genital"
                  checked={eventsOfInterest.genitalMycoticInfection}
                  onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, genitalMycoticInfection: checked as boolean })}
                />
                <Label htmlFor="genital" className="cursor-pointer font-normal">Genital mycotic infection</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dizziness"
                  checked={eventsOfInterest.dizzinessDehydrationSymptoms}
                  onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, dizzinessDehydrationSymptoms: checked as boolean })}
                />
                <Label htmlFor="dizziness" className="cursor-pointer font-normal">Dizziness / dehydration symptoms</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hospitalization"
                  checked={eventsOfInterest.hospitalizationOrErVisit}
                  onCheckedChange={(checked) => setEventsOfInterest({ ...eventsOfInterest, hospitalizationOrErVisit: checked as boolean })}
                />
                <Label htmlFor="hospitalization" className="cursor-pointer font-normal">Hospitalization / ER visit</Label>
              </div>
              {eventsOfInterest.hospitalizationOrErVisit && (
                <Input
                  placeholder="Reason for hospitalization/ER visit"
                  value={eventsOfInterest.hospitalizationReason}
                  onChange={(e) => setEventsOfInterest({ ...eventsOfInterest, hospitalizationReason: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Adverse Event Details Table */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">Adverse Event Details (MedDRA)</h3>
            
            {/* Add New AE */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
              <h4 className="font-semibold text-sm">Add Adverse Event</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aeTerm" className="text-sm">AE Term (MedDRA)</Label>
                  <Input
                    id="aeTerm"
                    placeholder="e.g., Nausea, Diarrhea, Hypoglycemia"
                    value={newAE.aeTerm}
                    onChange={(e) => setNewAE({ ...newAE, aeTerm: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="aeOnset" className="text-sm">Onset Date</Label>
                  <Input
                    id="aeOnset"
                    type="date"
                    value={newAE.onsetDate}
                    onChange={(e) => setNewAE({ ...newAE, onsetDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aeSeverity" className="text-sm">Severity</Label>
                  <select
                    id="aeSeverity"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newAE.severity}
                    onChange={(e) => setNewAE({ ...newAE, severity: e.target.value as any })}
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="aeSerious" className="text-sm">Is Serious</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="aeSerious"
                      checked={newAE.isSerious}
                      onCheckedChange={(checked) => setNewAE({ ...newAE, isSerious: checked as boolean })}
                    />
                    <Label htmlFor="aeSerious" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aeAction" className="text-sm">Action Taken</Label>
                  <select
                    id="aeAction"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newAE.actionTaken}
                    onChange={(e) => setNewAE({ ...newAE, actionTaken: e.target.value as any })}
                  >
                    <option value="None">None</option>
                    <option value="Dose adjusted">Dose adjusted</option>
                    <option value="Drug stopped">Drug stopped</option>
                    <option value="Referred">Referred</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="aeOutcome" className="text-sm">Outcome</Label>
                  <select
                    id="aeOutcome"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newAE.outcome}
                    onChange={(e) => setNewAE({ ...newAE, outcome: e.target.value as any })}
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Ongoing">Ongoing</option>
                  </select>
                </div>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={addAdverseEvent}>
                + Add AE
              </Button>
            </div>

            {/* AE Table */}
            {adverseEvents.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border">
                      <th className="border p-2 text-left">AE Term</th>
                      <th className="border p-2 text-left">Onset</th>
                      <th className="border p-2 text-left">Severity</th>
                      <th className="border p-2 text-center">Serious</th>
                      <th className="border p-2 text-left">Action</th>
                      <th className="border p-2 text-left">Outcome</th>
                      <th className="border p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adverseEvents.map((ae) => (
                      <tr key={ae.id} className="border hover:bg-slate-50">
                        <td className="border p-2">{ae.aeTerm}</td>
                        <td className="border p-2">{ae.onsetDate}</td>
                        <td className="border p-2">{ae.severity}</td>
                        <td className="border p-2 text-center">{ae.isSerious ? "Yes" : "No"}</td>
                        <td className="border p-2">{ae.actionTaken}</td>
                        <td className="border p-2">{ae.outcome}</td>
                        <td className="border p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdverseEvent(ae.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION M - PHYSICIAN ASSESSMENT */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">SECTION M: Physician Global Assessment</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="efficacy">Overall Efficacy *</Label>
                <select
                  id="efficacy"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={physicianAssessment.overallEfficacy}
                  onChange={(e) => setPhysicianAssessment({ ...physicianAssessment, overallEfficacy: e.target.value })}
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
                  value={physicianAssessment.overallTolerability}
                  onChange={(e) => setPhysicianAssessment({ ...physicianAssessment, overallTolerability: e.target.value })}
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
                  value={physicianAssessment.complianceJudgment}
                  onChange={(e) => setPhysicianAssessment({ ...physicianAssessment, complianceJudgment: e.target.value })}
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

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="longTerm"
                  checked={physicianAssessment.preferKcMeSempaForLongTerm}
                  onCheckedChange={(checked) => setPhysicianAssessment({ ...physicianAssessment, preferKcMeSempaForLongTerm: checked as boolean })}
                />
                <Label htmlFor="longTerm" className="cursor-pointer font-normal">
                  Would you prefer KC MeSempa for long-term therapy?
                </Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Patient profiles where KC MeSempa is preferred</Label>
              <div className="pl-4 space-y-2">
                {[
                  { key: "uncontrolledT2dm", label: "Uncontrolled T2DM" },
                  { key: "obeseT2dm", label: "Obese T2DM" },
                  { key: "ckdPatients", label: "CKD patients" },
                  { key: "htnPlusT2dm", label: "HTN + T2DM" },
                  { key: "elderlyPatients", label: "Elderly patients" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={patientProfiles[key as keyof typeof patientProfiles]}
                      onCheckedChange={(checked) => setPatientProfiles({ ...patientProfiles, [key]: checked as boolean })}
                    />
                    <Label htmlFor={key} className="cursor-pointer font-normal">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION N - PATIENT REPORTED OUTCOMES */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">SECTION N: Patient-Reported Outcomes</h3>
            
            <div className="space-y-2">
              <Label htmlFor="satisfaction">Overall Satisfaction with Therapy *</Label>
              <select
                id="satisfaction"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={patientOutcomes.overallSatisfaction}
                onChange={(e) => setPatientOutcomes({ ...patientOutcomes, overallSatisfaction: e.target.value })}
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
              <Label htmlFor="giTolerance">GI Tolerance vs Prior Therapy</Label>
              <select
                id="giTolerance"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={patientOutcomes.giToleranceVsPriorTherapy}
                onChange={(e) => setPatientOutcomes({ ...patientOutcomes, giToleranceVsPriorTherapy: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="Improved">Improved</option>
                <option value="Same">Same</option>
                <option value="Worse">Worse</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence in Managing Diabetes</Label>
              <select
                id="confidence"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={patientOutcomes.confidenceInManagingDiabetes}
                onChange={(e) => setPatientOutcomes({ ...patientOutcomes, confidenceInManagingDiabetes: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="Improved">Improved</option>
                <option value="Same">Same</option>
                <option value="Worse">Worse</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea
                id="comments"
                placeholder="Any additional clinical observations or patient feedback"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <div className="pt-4 border-t bg-blue-50 p-4 rounded">
            <p className="text-sm text-blue-900 font-semibold">
              ℹ️ Glycemic Response, Weight Change, and Renal Outcomes will be automatically calculated and displayed in the comparison view.
            </p>
          </div>

          {/* SECTION O - DATA PRIVACY & CONFIDENTIALITY */}
          <div className="space-y-4 pt-4 border-t bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2">SECTION O: Data Privacy & Confidentiality</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
                <Checkbox
                  id="noPersonalId"
                  checked={dataPrivacy.noPersonalIdentifiersRecorded}
                  onCheckedChange={(checked) => setDataPrivacy({ ...dataPrivacy, noPersonalIdentifiersRecorded: checked as boolean })}
                  className="mt-1"
                />
                <Label htmlFor="noPersonalId" className="font-normal cursor-pointer">
                  ☑️ <span className="font-semibold">No personal identifiers recorded</span> in this CRF (no name, phone, address, Aadhaar, etc.)
                </Label>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
                <Checkbox
                  id="routinePractice"
                  checked={dataPrivacy.dataCollectedAsRoutineClinicalPractice}
                  onCheckedChange={(checked) => setDataPrivacy({ ...dataPrivacy, dataCollectedAsRoutineClinicalPractice: checked as boolean })}
                  className="mt-1"
                />
                <Label htmlFor="routinePractice" className="font-normal cursor-pointer">
                  ☑️ <span className="font-semibold">Data collected as part of routine clinical practice</span> using KC MeSempa
                </Label>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
                <Checkbox
                  id="identityMapping"
                  checked={dataPrivacy.patientIdentityMappingAtClinicOnly}
                  onCheckedChange={(checked) => setDataPrivacy({ ...dataPrivacy, patientIdentityMappingAtClinicOnly: checked as boolean })}
                  className="mt-1"
                />
                <Label htmlFor="identityMapping" className="font-normal cursor-pointer">
                  ☑️ <span className="font-semibold">Patient identity mapping retained at clinic level only</span> (not shared with external parties)
                </Label>
              </div>
            </div>
          </div>

          {/* SECTION P - PHYSICIAN DECLARATION */}
          <div className="space-y-4 pt-4 border-t bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2">SECTION P: Physician Declaration</h3>
            
            <div className="space-y-3 text-sm bg-white p-4 rounded border border-green-200">
              <p className="font-semibold italic text-green-900">
                "I confirm that the above information is accurate and recorded as part of standard clinical practice."
              </p>

              <div className="pt-3 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-600">Physician Name</Label>
                  <Input
                    type="text"
                    placeholder="Auto-filled from doctor profile"
                    disabled
                    defaultValue={(existingData as any)?.physicianDeclaration?.physicianName || "Dr. [Name]"}
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-600">Qualification</Label>
                  <Input
                    type="text"
                    placeholder="Auto-filled from doctor profile"
                    disabled
                    defaultValue={(existingData as any)?.physicianDeclaration?.qualification || "MBBS, MD"}
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-600">Clinic / Hospital Name</Label>
                  <Input
                    type="text"
                    placeholder="Auto-filled from study site"
                    disabled
                    defaultValue={(existingData as any)?.physicianDeclaration?.clinicHospitalName || "Study Site"}
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-600">Signature Method</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={physicianDeclaration.signatureMethod}
                    onChange={(e) => setPhysicianDeclaration({ ...physicianDeclaration, signatureMethod: e.target.value as any })}
                  >
                    <option value="Checkbox">Electronic Checkbox Signature</option>
                    <option value="Digital">Digital Signature</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-100 rounded border border-green-300 mt-4">
                  <Checkbox
                    id="declaration"
                    checked={physicianDeclaration.confirmationCheckbox}
                    onCheckedChange={(checked) => setPhysicianDeclaration({ ...physicianDeclaration, confirmationCheckbox: checked as boolean })}
                  />
                  <Label htmlFor="declaration" className="font-semibold cursor-pointer">
                    I confirm that the above information is accurate and recorded as per standard clinical practice
                  </Label>
                </div>

                <div className="text-xs text-gray-500 pt-2">
                  <p>Signature Date: {new Date().toISOString().split('T')[0]}</p>
                  <p>Method: {physicianDeclaration.signatureMethod}</p>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !physicianDeclaration.confirmationCheckbox || !dataPrivacy.noPersonalIdentifiersRecorded || !dataPrivacy.dataCollectedAsRoutineClinicalPractice || !dataPrivacy.patientIdentityMappingAtClinicOnly}>
            {loading ? "Saving Follow-up Assessment..." : "Save Follow-up Assessment (All Sections Complete)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
})
