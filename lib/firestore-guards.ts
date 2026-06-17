import { hasBaselineCounseling } from "@/lib/baseline-validation"
import { areAllFollowUpsComplete } from "@/lib/followup-validation"
import { isPatientInfoCompleteForPatient } from "@/lib/patient-info-validation"
import { resolvePatientBaselineVisitDate } from "@/lib/study-dates"
import type { FollowUpData, Patient } from "@/lib/types"

/** Mirrors firestore.rules baselineCompleteForFollowup (legacy top-level date aware). */
export function isBaselineCompleteForFollowupGuard(
  patient: Patient | Record<string, unknown> | null | undefined
): boolean {
  if (!patient || typeof patient !== "object") return false
  const data = patient as Patient
  if (data.baselineComplete === true) return true

  const baseline = data.baseline
  if (!baseline || typeof baseline !== "object") return false

  const visitDate = resolvePatientBaselineVisitDate(data as unknown as Record<string, unknown>)
  if (!visitDate) return false

  const record = baseline as unknown as Record<string, unknown>
  const requiredNumbers = [
    "hba1c",
    "fpg",
    "ppg",
    "weight",
    "bloodPressureSystolic",
    "bloodPressureDiastolic",
    "heartRate",
    "serumCreatinine",
    "egfr",
  ] as const

  for (const key of requiredNumbers) {
    if (typeof record[key] !== "number" || Number.isNaN(record[key] as number)) return false
  }

  if (typeof record.urinalysis !== "string" || !record.urinalysis.trim()) return false
  if (typeof record.dosePrescribed !== "string" || !record.dosePrescribed.trim()) return false
  if (typeof record.treatmentInitiationDate !== "string" || !record.treatmentInitiationDate.trim()) {
    return false
  }

  return hasBaselineCounseling(baseline)
}

/** Mirrors firestore.rules patientReadyForFollowup. */
export function isPatientReadyForFollowupGuard(
  patient: Patient | Record<string, unknown> | null | undefined
): boolean {
  if (!patient || typeof patient !== "object") return false
  const data = patient as Patient
  if (isPatientInfoCompleteForPatient(data)) return true
  if (!data.patientCode?.trim()) return false
  return isBaselineCompleteForFollowupGuard(data)
}

/** Client-side mirror of followupsGuard before Firestore write. */
export function getFollowUpFirestoreGuardIssues(
  patient: Patient | Record<string, unknown> | null | undefined,
  followups: FollowUpData[]
): string[] {
  const issues: string[] = []

  if (!isBaselineCompleteForFollowupGuard(patient)) {
    issues.push(
      "Baseline is not complete in Firestore (missing fields or baselineComplete flag). Re-save Baseline once."
    )
  }

  if (!isPatientReadyForFollowupGuard(patient)) {
    issues.push(
      "Patient Info is not complete in Firestore (missing fields or patientInfoComplete flag). Re-save Patient Info once."
    )
  }

  if (!areAllFollowUpsComplete(followups)) {
    issues.push("One or more follow-up entries in this save are incomplete.")
  }

  return issues
}
