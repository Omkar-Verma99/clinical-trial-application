import { getBaselineValidationErrors } from "@/lib/baseline-validation"
import { getPatientInfoValidationErrors } from "@/lib/patient-info-validation"
import {
  normalizeStudyDate,
  resolvePatientBaselineVisitDate,
  validateBaselineVisitDate,
  validateTreatmentInitiationDate,
} from "@/lib/study-dates"
import type { Patient } from "@/lib/types"

export type PrerequisiteSection = "patient-info" | "baseline"

export interface PrerequisiteIssue {
  section: PrerequisiteSection
  message: string
}

/** Strict checks for legacy patients — ignores patientInfoComplete / baselineComplete flags. */
export function getFollowUpPrerequisiteIssues(
  patient: Patient | null | undefined
): PrerequisiteIssue[] {
  const issues: PrerequisiteIssue[] = []

  if (!patient) {
    return [{ section: "patient-info", message: "Patient record not found" }]
  }

  for (const message of getPatientInfoValidationErrors(patient)) {
    issues.push({ section: "patient-info", message })
  }

  const baselineVisitDate = resolvePatientBaselineVisitDate(
    patient as unknown as Record<string, unknown>
  )
  const treatmentInitiationDate = normalizeStudyDate(patient.baseline?.treatmentInitiationDate)

  const baselineVisitDateError = validateBaselineVisitDate(
    baselineVisitDate,
    treatmentInitiationDate || undefined
  )
  if (baselineVisitDateError) {
    issues.push({ section: "patient-info", message: baselineVisitDateError })
  }

  for (const message of getBaselineValidationErrors(patient.baseline)) {
    issues.push({ section: "baseline", message })
  }

  const treatmentDateError = validateTreatmentInitiationDate(
    treatmentInitiationDate,
    baselineVisitDate || undefined
  )
  if (treatmentDateError) {
    issues.push({ section: "baseline", message: treatmentDateError })
  }

  return issues
}

export function getPrimaryPrerequisiteSection(
  issues: PrerequisiteIssue[]
): PrerequisiteSection {
  if (issues.some((issue) => issue.section === "patient-info")) {
    return "patient-info"
  }
  return "baseline"
}

export function formatPrerequisiteIssueList(issues: PrerequisiteIssue[], limit = 5): string {
  return issues
    .slice(0, limit)
    .map((issue) => issue.message)
    .join(", ")
}
