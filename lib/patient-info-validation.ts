import { hasAtLeastOneCheckbox, hasCheckboxOrOtherSelection } from "@/lib/form-validation"
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

function comorbidityCheckboxes(comorbidities: Record<string, unknown>): Record<string, boolean> {
  return {
    hypertension: comorbidities.hypertension === true,
    dyslipidemia: comorbidities.dyslipidemia === true,
    obesity: comorbidities.obesity === true,
    ascvd: comorbidities.ascvd === true,
    heartFailure: comorbidities.heartFailure === true,
    chronicKidneyDisease: comorbidities.chronicKidneyDisease === true,
    none: comorbidities.none === true,
    otherSelected: comorbidities.otherSelected === true,
  }
}

/** Requires explicit none, a selected condition, or other text — empty/legacy maps are missing. */
export function comorbiditySelectionOk(comorbidities: Record<string, unknown> | undefined): boolean {
  if (!comorbidities) return false
  return hasCheckboxOrOtherSelection(comorbidityCheckboxes(comorbidities), comorbidities.other)
}

function previousDrugClassCheckboxes(drugClasses: Record<string, unknown>): Record<string, boolean> {
  return {
    metformin: drugClasses.metformin === true,
    sulfonylurea: drugClasses.sulfonylurea === true,
    dpp4Inhibitor: drugClasses.dpp4Inhibitor === true,
    sglt2Inhibitor: drugClasses.sglt2Inhibitor === true,
    tzd: drugClasses.tzd === true,
    insulin: drugClasses.insulin === true,
    none: drugClasses.none === true,
    otherSelected: drugClasses.otherSelected === true,
  }
}

export function previousDrugClassesSelectionOk(
  drugClasses: Record<string, unknown> | undefined
): boolean {
  if (!drugClasses) return false
  return hasCheckboxOrOtherSelection(previousDrugClassCheckboxes(drugClasses), drugClasses.other)
}

function reasonForTripleFDCCheckboxes(reasons: Record<string, unknown>): Record<string, boolean> {
  return {
    inadequateGlycemicControl: reasons.inadequateGlycemicControl === true,
    weightConcerns: reasons.weightConcerns === true,
    hypoglycemiaOnPriorTherapy: reasons.hypoglycemiaOnPriorTherapy === true,
    highPillBurden: reasons.highPillBurden === true,
    poorAdherence: reasons.poorAdherence === true,
    costConsiderations: reasons.costConsiderations === true,
    physicianClinicalJudgment: reasons.physicianClinicalJudgment === true,
    otherSelected: reasons.otherSelected === true,
  }
}

export function reasonForTripleFDCSelectionOk(
  reasons: Record<string, unknown> | undefined
): boolean {
  if (!reasons) return false
  return hasCheckboxOrOtherSelection(reasonForTripleFDCCheckboxes(reasons), reasons.other)
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

  const drugClasses = data.previousDrugClasses as Record<string, unknown> | undefined
  if (!previousDrugClassesSelectionOk(drugClasses)) return false

  const reasons = data.reasonForTripleFDC as Record<string, unknown> | undefined
  if (!reasonForTripleFDCSelectionOk(reasons)) return false

  return true
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

  const drugClasses = data.previousDrugClasses as Record<string, unknown> | undefined
  if (!previousDrugClassesSelectionOk(drugClasses)) {
    errors.push("At least one previous drug class (or None) is required")
  }

  const reasons = data.reasonForTripleFDC as Record<string, unknown> | undefined
  if (!reasonForTripleFDCSelectionOk(reasons)) {
    errors.push("At least one reason for KC MeSempa is required")
  }

  return errors
}

/** Strict readiness check for follow-up (does not trust patientInfoComplete flag alone). */
export function isPatientInfoReadyForFollowUp(patient: Patient | null | undefined): boolean {
  if (!patient) return false
  return getPatientInfoValidationErrors(patient).length === 0
}
