import { hasAtLeastOneCheckbox, hasDuplicateVisitDate, hasCheckboxOrOtherSelection } from "@/lib/form-validation"
import type { FormFieldIssue } from "@/lib/form-field-navigation"
import type { FollowUpData, StructuredAdverseEvent } from "@/lib/types"
import { validateFollowUpVisitDate } from "@/lib/study-dates"

type FollowUpFormState = Record<string, unknown>

export function collectFollowUpFormIssues(params: {
  formData: FollowUpFormState
  adverseEvents: StructuredAdverseEvent[]
  allFollowUps: FollowUpData[]
  followUpIndex: number
}): FormFieldIssue[] {
  const { formData, adverseEvents, allFollowUps, followUpIndex } = params
  const issues: FormFieldIssue[] = []
  const add = (fieldId: string, message: string) => issues.push({ fieldId, message })

  const visitDate = String(formData.visitDate || "")
  if (!visitDate) {
    add("visitDate", "Visit date is required (use the calendar to pick the follow-up visit date).")
  } else {
    const visitDateError = validateFollowUpVisitDate(visitDate)
    if (visitDateError) add("visitDate", visitDateError)
    if (hasDuplicateVisitDate(visitDate, allFollowUps, followUpIndex)) {
      add("visitDate", "Another follow-up already uses this visit date. Choose a different date.")
    }
  }

  if (!formData.hba1c) add("hba1c", "HbA1c (%) is required.")
  if (!formData.fpg) add("fpg", "FPG (mg/dL) is required.")
  if (!formData.ppg) add("ppg", "PPG (mg/dL) is required.")
  if (!formData.weight) add("weight", "Weight (kg) is required.")
  if (!formData.bloodPressureSystolic) add("bpSys", "BP Systolic (mmHg) is required.")
  if (!formData.bloodPressureDiastolic) add("bpDia", "BP Diastolic (mmHg) is required.")
  if (!formData.heartRate) add("heartRate", "Heart rate (bpm) is required.")
  if (!formData.serumCreatinine) add("creatinine", "Serum creatinine is required.")
  if (!formData.egfr) add("egfr", "eGFR is required.")
  if (!formData.urinalysisType) {
    add("field-urinalysis", "Select urinalysis result: Normal or Abnormal.")
  } else if (formData.urinalysisType === "Abnormal" && !String(formData.urinalysisSpecify || "").trim()) {
    add("field-urinalysis", "Specify the urinalysis abnormality.")
  }

  if (!formData.hba1cResponse) {
    add("field-hba1cResponse", "Select HbA1c response category (Super/Responder/Partial/Non-responder).")
  }
  if (!formData.weightChange) {
    add("field-weightChange", "Select weight change since baseline (Loss / Neutral / Gain).")
  }
  if (formData.patientContinuingTreatment === null) {
    add("field-patientContinuingTreatment", "Select whether the patient is continuing treatment (Yes/No).")
  }
  if (formData.bpControlAchieved === null) {
    add("field-bpControlAchieved", "Select whether blood pressure control was achieved (Yes/No).")
  }
  if (!formData.renalOutcome) {
    add("field-renalOutcome", "Select renal outcome (Improved / Stable / Decline).")
  }
  if (formData.addOnTherapy === null) {
    add("field-addOnTherapy", "Select whether add-on or changed therapy was used (Yes/No).")
  }
  if (formData.addOnTherapy === true && !String(formData.addOnTherapyDetails || "").trim()) {
    add("addOnDetails", "Specify add-on or changed therapy details.")
  }
  if (formData.adverseEventsPresent === null) {
    add("field-adverseEventsPresent", "Select whether adverse events are present (Yes/No).")
  }
  if (formData.preferLongTerm === null) {
    add("field-preferLongTerm", "Select long-term KC MeSempa preference (Yes/No).")
  }
  if (!String(formData.additionalComments || "").trim()) {
    add("comments", "Additional comments are required (enter clinical notes in the text box).")
  }

  const profileOtherText = String(formData.profileOtherText || "").trim()
  const profileChecks = {
    uncontrolledT2dm: formData.uncontrolledT2dm === true,
    obeseT2dm: formData.obeseT2dm === true,
    ckdPatients: formData.ckdPatients === true,
    htnT2dm: formData.htnT2dm === true,
    elderlyPatients: formData.elderlyPatients === true,
    other: formData.profileOther === true,
  }
  if (!hasCheckboxOrOtherSelection(profileChecks, profileOtherText)) {
    add("field-preferredProfiles", "Select at least one preferred patient profile (or Other).")
  }
  if (formData.profileOther === true && !profileOtherText) {
    add("field-preferredProfiles", "Specify the other preferred patient profile.")
  }

  const eventChecks = {
    hypoglycemiaMild: formData.hypoglycemiaMild === true,
    hypoglycemiaModerate: formData.hypoglycemiaModerate === true,
    hypoglycemiaSevere: formData.hypoglycemiaSevere === true,
    uti: formData.uti === true,
    genitalInfection: formData.genitalInfection === true,
    dizzinessDehydration: formData.dizzinessDehydration === true,
    hospitalizationErVisit: formData.hospitalizationErVisit === true,
    none: formData.eventsNone === true,
  }
  if (!hasAtLeastOneCheckbox(eventChecks)) {
    add("field-eventsOfSpecialInterest", "Select at least one event of special interest (or None).")
  }
  if (formData.hospitalizationErVisit === true && !String(formData.hospitalizationReason || "").trim()) {
    add("field-eventsOfSpecialInterest", "Specify the reason for hospitalization or ER visit.")
  }

  if (formData.patientContinuingTreatment === false && !formData.discontinuationReason) {
    add("field-patientContinuingTreatment", "Select discontinuation reason when treatment was stopped.")
  }
  if (
    formData.patientContinuingTreatment === false &&
    formData.discontinuationReason === "Other" &&
    !String(formData.discontinuationReasonOther || "").trim()
  ) {
    add("field-patientContinuingTreatment", "Specify discontinuation reason details for Other.")
  }

  if (formData.missedDoses === "") {
    add("field-missedDoses", "Select missed doses in the last 7 days (0, 1–2, 3–5, or >5).")
  }
  if (!formData.overallEfficacy) add("efficacy", "Overall efficacy judgment is required.")
  if (!formData.overallTolerability) add("tolerability", "Overall tolerability judgment is required.")
  if (!formData.complianceJudgment) add("compliance", "Compliance judgment is required.")

  if (formData.adverseEventsPresent === true) {
    if (adverseEvents.length === 0) {
      add("field-adverseEvents", "Add at least one adverse event entry.")
    }
    adverseEvents.forEach((event, index) => {
      const prefix = `AE #${index + 1}`
      if (!event.aeTerm.trim()) add("field-adverseEvents", `${prefix}: AE term is required.`)
      if (!event.onsetDate) add("field-adverseEvents", `${prefix}: onset date is required.`)
      if (!event.severity) add("field-adverseEvents", `${prefix}: severity is required.`)
      if (!event.serious) add("field-adverseEvents", `${prefix}: serious (Y/N) is required.`)
      if (!event.actionTaken) add("field-adverseEvents", `${prefix}: action taken is required.`)
      if (!event.outcome) add("field-adverseEvents", `${prefix}: outcome is required.`)
      if (event.stopDate && event.onsetDate && event.stopDate < event.onsetDate) {
        add("field-adverseEvents", `${prefix}: stop date cannot be before onset date.`)
      }
      if (event.actionTaken === "Other" && !event.actionTakenOther?.trim()) {
        add("field-adverseEvents", `${prefix}: specify action taken for Other.`)
      }
    })
  }

  return issues
}
