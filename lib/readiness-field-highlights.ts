import {
  BASELINE_FIELD_IDS,
  PATIENT_INFO_FIELD_IDS,
} from "@/lib/form-field-navigation"
import { getBaselineValidationErrors } from "@/lib/baseline-validation"
import { getPatientInfoValidationErrors } from "@/lib/patient-info-validation"
import {
  getBaselineReadinessIssues,
  getPatientInfoReadinessIssues,
} from "@/lib/patient-readiness"
import type { BaselineData, Patient } from "@/lib/types"

export function getBaselineReadinessFieldIds(
  patient: Patient | null | undefined
): string[] {
  return [
    ...new Set(
      getBaselineReadinessIssues(patient)
        .map((message) => BASELINE_FIELD_IDS[message])
        .filter((id): id is string => Boolean(id))
    ),
  ]
}

export function getPatientInfoReadinessFieldIds(
  patient: Patient | null | undefined
): string[] {
  return [
    ...new Set(
      getPatientInfoReadinessIssues(patient)
        .map((message) => PATIENT_INFO_FIELD_IDS[message])
        .filter((id): id is string => Boolean(id))
    ),
  ]
}

export function mergeHighlightFieldIds(
  ...groups: (string[] | undefined)[]
): string[] | undefined {
  const merged = [...new Set(groups.flatMap((g) => g ?? []))]
  return merged.length > 0 ? merged : undefined
}

/** True when a baseline field is valid in the last saved Firestore record (not draft form state). */
export function isBaselineFieldValidInSavedRecord(
  fieldId: string,
  existingData: BaselineData | null | undefined,
  patientBaselineVisitDate?: string
): boolean {
  const errors = getBaselineValidationErrors(existingData ?? {}, {
    patient: {
      baselineVisitDate: patientBaselineVisitDate ?? "",
      baseline: existingData ?? undefined,
    },
  })
  const invalidIds = errors
    .map((message) => BASELINE_FIELD_IDS[message])
    .filter((id): id is string => Boolean(id))
  return !invalidIds.includes(fieldId)
}

/** True when a patient-info field is valid in the last saved Firestore record. */
export function isPatientInfoFieldValidInSavedRecord(
  fieldId: string,
  patient: Patient | Record<string, unknown> | null | undefined
): boolean {
  if (!patient) return false
  const errors = getPatientInfoValidationErrors(patient)
  const invalidIds = errors
    .map((message) => PATIENT_INFO_FIELD_IDS[message])
    .filter((id): id is string => Boolean(id))
  return !invalidIds.includes(fieldId)
}
