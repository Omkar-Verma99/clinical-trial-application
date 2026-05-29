import { hasAtLeastOneTrue } from "@/lib/form-validation"
import type { BaselineData, Patient } from "@/lib/types"

const REQUIRED_BASELINE_NUMBERS = [
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value)
}

/** At least one counseling option (structured map or legacy flag). */
export function hasBaselineCounseling(baseline: Partial<BaselineData> | null | undefined): boolean {
  if (!baseline) return false
  if (baseline.counseling && typeof baseline.counseling === "object") {
    return hasAtLeastOneTrue(baseline.counseling as Record<string, boolean>)
  }
  return baseline.counselingProvided === true
}

/** True when all mandatory baseline clinical + treatment fields are present. */
export function isBaselineComplete(baseline: unknown): baseline is BaselineData {
  if (!baseline || typeof baseline !== "object") return false

  const record = baseline as Record<string, unknown>

  for (const key of REQUIRED_BASELINE_NUMBERS) {
    if (!isValidNumber(record[key])) return false
  }

  if (!isNonEmptyString(record.urinalysis)) return false
  if (!isNonEmptyString(record.dosePrescribed)) return false
  if (!isNonEmptyString(record.treatmentInitiationDate)) return false
  if (!isNonEmptyString(record.baselineVisitDate)) return false

  return hasBaselineCounseling(baseline as Partial<BaselineData>)
}

/** Patient-level check (supports legacy docs without baselineComplete flag). */
export function isBaselineCompleteForPatient(
  patient: Pick<Patient, "baseline" | "baselineComplete"> | null | undefined
): boolean {
  if (!patient) return false
  if (patient.baselineComplete === true) return true
  return isBaselineComplete(patient.baseline)
}

export const BASELINE_INCOMPLETE_MESSAGE =
  "Complete the baseline assessment (all required clinical and treatment fields) before adding or saving follow-ups."

export function getBaselineValidationErrors(baseline: unknown): string[] {
  if (!baseline || typeof baseline !== "object") {
    return ["Baseline assessment is required"]
  }

  const record = baseline as Record<string, unknown>
  const errors: string[] = []

  if (!isValidNumber(record.hba1c)) errors.push("HbA1c is required")
  if (!isValidNumber(record.fpg)) errors.push("FPG is required")
  if (!isValidNumber(record.ppg)) errors.push("PPG is required")
  if (!isValidNumber(record.weight)) errors.push("Weight is required")
  if (!isNonEmptyString(record.baselineVisitDate)) errors.push("Baseline visit date is required")
  if (!isValidNumber(record.bloodPressureSystolic)) errors.push("BP Systolic is required")
  if (!isValidNumber(record.bloodPressureDiastolic)) errors.push("BP Diastolic is required")
  if (!isValidNumber(record.heartRate)) errors.push("Heart Rate is required")
  if (!isValidNumber(record.serumCreatinine)) errors.push("Serum Creatinine is required")
  if (!isValidNumber(record.egfr)) errors.push("eGFR is required")
  if (!isNonEmptyString(record.urinalysis)) errors.push("Urinalysis is required")
  if (!isNonEmptyString(record.dosePrescribed)) errors.push("Dose prescribed is required")
  if (!isNonEmptyString(record.treatmentInitiationDate)) {
    errors.push("Treatment initiation date is required")
  }
  if (!hasBaselineCounseling(baseline as Partial<BaselineData>)) {
    errors.push("At least one counseling option must be selected")
  }

  return errors
}
