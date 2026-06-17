import { hasAtLeastOneCheckbox } from "@/lib/form-validation"
import type { Patient } from "@/lib/types"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value)
}

function mapHasAnyTrue(map: Record<string, boolean> | undefined | null): boolean {
  if (!map) return false
  return hasAtLeastOneCheckbox(map)
}

const COMORBIDITY_CONDITION_KEYS = [
  "hypertension",
  "dyslipidemia",
  "obesity",
  "ascvd",
  "heartFailure",
  "chronicKidneyDisease",
] as const

function comorbidityOtherHasText(other: unknown): boolean {
  if (Array.isArray(other)) {
    return other.some((v) => typeof v === "string" && v.trim().length > 0 && v !== "NA")
  }
  return typeof other === "string" && other.trim().length > 0 && other !== "NA"
}

/** Requires explicit none, a selected condition, or other text — empty/legacy maps are missing. */
export function comorbiditySelectionOk(comorbidities: Record<string, unknown> | undefined): boolean {
  if (!comorbidities) return false
  if (comorbidities.none === true) return true

  const hasSelectedCondition = COMORBIDITY_CONDITION_KEYS.some((key) => comorbidities[key] === true)
  if (hasSelectedCondition) return true

  return comorbidityOtherHasText(comorbidities.other)
}

/** True when all mandatory patient-info (sections A–E) fields are present. */
export function isPatientInfoComplete(patient: unknown): boolean {
  if (!patient || typeof patient !== "object") return false

  const data = patient as Record<string, unknown>

  if (!isNonEmptyString(data.patientCode)) return false
  if (!isNonEmptyString(data.baselineVisitDate)) return false
  if (!isValidNumber(data.age)) return false
  if (!isNonEmptyString(data.gender)) return false
  if (!isValidNumber(data.height)) return false
  if (!isValidNumber(data.weight)) return false
  if (!isValidNumber(data.durationOfDiabetes)) return false
  if (!isNonEmptyString(data.baselineGlycemicSeverity)) return false
  if (!isNonEmptyString(data.smokingStatus)) return false
  if (!isNonEmptyString(data.alcoholIntake)) return false
  if (!isNonEmptyString(data.physicalActivityLevel)) return false
  if (!isNonEmptyString(data.previousTreatmentType)) return false

  const complications = data.diabetesComplications as Record<string, boolean> | undefined
  if (!mapHasAnyTrue(complications)) return false

  const comorbidities = data.comorbidities as Record<string, unknown> | undefined
  if (!comorbiditySelectionOk(comorbidities)) return false
  if (
    comorbidities?.chronicKidneyDisease === true &&
    !isNonEmptyString(comorbidities.ckdEgfrCategory)
  ) {
    return false
  }

  const drugClasses = data.previousDrugClasses as Record<string, boolean> | undefined
  if (!mapHasAnyTrue(drugClasses)) return false

  const reasons = data.reasonForTripleFDC as Record<string, unknown> | undefined
  if (!reasons) return false
  const hasReason =
    reasons.inadequateGlycemicControl === true ||
    reasons.weightConcerns === true ||
    reasons.hypoglycemiaOnPriorTherapy === true ||
    reasons.highPillBurden === true ||
    reasons.poorAdherence === true ||
    reasons.costConsiderations === true ||
    reasons.physicianClinicalJudgment === true ||
    (Array.isArray(reasons.other)
      ? reasons.other.some((v) => typeof v === "string" && v.trim() && v !== "NA")
      : typeof reasons.other === "string" && reasons.other.trim().length > 0)

  return hasReason
}

export function isPatientInfoCompleteForPatient(
  patient: Patient | null | undefined
): boolean {
  if (!patient) return false
  if (patient.patientInfoComplete === true) return true
  return isPatientInfoComplete(patient)
}

export const PATIENT_INFO_INCOMPLETE_MESSAGE =
  "Complete all required Patient Info fields (sections A–E) before saving other sections."

/** Lists missing/invalid patient-info fields (ignores patientInfoComplete flag). */
export function getPatientInfoValidationErrors(patient: unknown): string[] {
  if (!patient || typeof patient !== "object") {
    return ["Patient record is required"]
  }

  const data = patient as Record<string, unknown>
  const errors: string[] = []

  if (!isNonEmptyString(data.patientCode)) errors.push("Participant code is required")
  if (!isNonEmptyString(data.baselineVisitDate)) errors.push("Baseline visit date is required")
  if (!isValidNumber(data.age)) errors.push("Age is required")
  if (!isNonEmptyString(data.gender)) errors.push("Gender is required")
  if (!isValidNumber(data.height)) errors.push("Height is required")
  if (!isValidNumber(data.weight)) errors.push("Weight is required")
  if (!isValidNumber(data.durationOfDiabetes)) errors.push("Duration of diabetes is required")
  if (!isNonEmptyString(data.baselineGlycemicSeverity)) {
    errors.push("Baseline glycemic severity is required")
  }
  if (!isNonEmptyString(data.smokingStatus)) errors.push("Smoking status is required")
  if (!isNonEmptyString(data.alcoholIntake)) errors.push("Alcohol intake is required")
  if (!isNonEmptyString(data.physicalActivityLevel)) {
    errors.push("Physical activity level is required")
  }
  if (!isNonEmptyString(data.previousTreatmentType)) {
    errors.push("Previous treatment type is required")
  }

  const complications = data.diabetesComplications as Record<string, boolean> | undefined
  if (!mapHasAnyTrue(complications)) {
    errors.push("At least one diabetes complication (or None) is required")
  }

  const comorbidities = data.comorbidities as Record<string, unknown> | undefined
  if (!comorbiditySelectionOk(comorbidities)) {
    errors.push("At least one comorbidity (or None) is required")
  }
  if (
    comorbidities?.chronicKidneyDisease === true &&
    !isNonEmptyString(comorbidities.ckdEgfrCategory)
  ) {
    errors.push("CKD eGFR category is required when Chronic Kidney Disease is selected")
  }

  const drugClasses = data.previousDrugClasses as Record<string, boolean> | undefined
  if (!mapHasAnyTrue(drugClasses)) {
    errors.push("At least one previous drug class (or None) is required")
  }

  const reasons = data.reasonForTripleFDC as Record<string, unknown> | undefined
  if (!reasons) {
    errors.push("At least one reason for KC MeSempa is required")
  } else {
    const hasReason =
      reasons.inadequateGlycemicControl === true ||
      reasons.weightConcerns === true ||
      reasons.hypoglycemiaOnPriorTherapy === true ||
      reasons.highPillBurden === true ||
      reasons.poorAdherence === true ||
      reasons.costConsiderations === true ||
      reasons.physicianClinicalJudgment === true ||
      (Array.isArray(reasons.other)
        ? reasons.other.some((v) => typeof v === "string" && v.trim() && v !== "NA")
        : typeof reasons.other === "string" && reasons.other.trim().length > 0)
    if (!hasReason) {
      errors.push("At least one reason for KC MeSempa is required")
    }
  }

  return errors
}

/** Strict readiness check for follow-up (does not trust patientInfoComplete flag alone). */
export function isPatientInfoReadyForFollowUp(patient: Patient | null | undefined): boolean {
  if (!patient) return false
  return getPatientInfoValidationErrors(patient).length === 0
}
