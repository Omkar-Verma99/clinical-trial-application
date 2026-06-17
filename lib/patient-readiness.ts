import { getBaselineValidationErrors } from "@/lib/baseline-validation"
import {
  getPatientInfoValidationErrors,
  isPatientInfoReadyForFollowUp,
} from "@/lib/patient-info-validation"
import {
  getFollowUpPrerequisiteIssues,
  type PrerequisiteIssue,
} from "@/lib/patient-prerequisites"
import {
  normalizeStudyDate,
  resolvePatientBaselineVisitDate,
  validateBaselineVisitDate,
  validateTreatmentInitiationDate,
} from "@/lib/study-dates"
import type { Patient } from "@/lib/types"

/** Patient Info fields + date rules required before Baseline (strict — ignores flags). */
export function isPatientInfoReadyForBaseline(patient: Patient | null | undefined): boolean {
  if (!patient) return false
  if (getPatientInfoValidationErrors(patient).length > 0) return false

  const baselineVisitDate = resolvePatientBaselineVisitDate(
    patient as unknown as Record<string, unknown>
  )
  const treatmentInitiationDate = normalizeStudyDate(patient.baseline?.treatmentInitiationDate)
  if (validateBaselineVisitDate(baselineVisitDate, treatmentInitiationDate || undefined)) {
    return false
  }

  return true
}

/** Baseline clinical + treatment fields valid (strict — ignores baselineComplete flag). */
export function isBaselineReadyStrict(patient: Patient | null | undefined): boolean {
  if (!patient) return false
  if (getBaselineValidationErrors(patient.baseline, { patient }).length > 0) return false

  const baselineVisitDate = resolvePatientBaselineVisitDate(
    patient as unknown as Record<string, unknown>
  )
  const treatmentInitiationDate = normalizeStudyDate(patient.baseline?.treatmentInitiationDate)
  if (validateTreatmentInitiationDate(treatmentInitiationDate, baselineVisitDate || undefined)) {
    return false
  }

  return true
}

/** True when Patient Info + Baseline pass all current rules (strict). */
export function isReadyForFollowUp(patient: Patient | null | undefined): boolean {
  return getFollowUpPrerequisiteIssues(patient).length === 0
}

export function getPatientInfoReadinessIssues(patient: Patient | null | undefined): string[] {
  if (!patient) return ["Patient record not found"]
  const issues = [...getPatientInfoValidationErrors(patient)]
  const baselineVisitDate = resolvePatientBaselineVisitDate(
    patient as unknown as Record<string, unknown>
  )
  const treatmentInitiationDate = normalizeStudyDate(patient.baseline?.treatmentInitiationDate)
  const dateError = validateBaselineVisitDate(
    baselineVisitDate,
    treatmentInitiationDate || undefined
  )
  if (dateError) issues.push(dateError)
  return issues
}

export function getBaselineReadinessIssues(patient: Patient | null | undefined): string[] {
  if (!patient) return ["Patient record not found"]
  const issues = [...getBaselineValidationErrors(patient.baseline, { patient })]
  const baselineVisitDate = resolvePatientBaselineVisitDate(
    patient as unknown as Record<string, unknown>
  )
  const treatmentInitiationDate = normalizeStudyDate(patient.baseline?.treatmentInitiationDate)
  const dateError = validateTreatmentInitiationDate(
    treatmentInitiationDate,
    baselineVisitDate || undefined
  )
  if (dateError) issues.push(dateError)
  return issues
}

export {
  getFollowUpPrerequisiteIssues,
  isPatientInfoReadyForFollowUp,
  type PrerequisiteIssue,
}
