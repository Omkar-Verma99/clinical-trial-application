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
  const hasComorbidity =
    comorbidities &&
    Object.entries(comorbidities).some(
      ([key, value]) => key !== "ckdEgfrCategory" && value === true
    )
  if (!hasComorbidity) return false
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
