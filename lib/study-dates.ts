/** Study enrollment date windows for KC MeSempa RWE trial */

export const BASELINE_VISIT_MIN = "2026-02-26"
export const BASELINE_VISIT_MAX = "2026-04-21"
export const TREATMENT_INITIATION_MIN = "2026-02-10"

export function todayIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function parseIsoDate(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function compareIsoDates(a: string, b: string): number {
  const dateA = parseIsoDate(a)
  const dateB = parseIsoDate(b)
  if (!dateA || !dateB) return 0
  return dateA.getTime() - dateB.getTime()
}

export function isNotFutureDate(value: string): boolean {
  return compareIsoDates(value, todayIsoDate()) <= 0
}

export function isDateInRange(value: string, min: string, max: string): boolean {
  return compareIsoDates(value, min) >= 0 && compareIsoDates(value, max) <= 0
}

export function validateBaselineVisitDate(
  value: string,
  treatmentInitiationDate?: string
): string | null {
  if (!value) return "Baseline visit date is required"
  if (!isNotFutureDate(value)) return "Baseline visit date cannot be in the future"
  if (!isDateInRange(value, BASELINE_VISIT_MIN, BASELINE_VISIT_MAX)) {
    return `Baseline visit date must be between 26 Feb 2026 and 21 Apr 2026`
  }
  if (treatmentInitiationDate && compareIsoDates(value, treatmentInitiationDate) < 0) {
    return "Baseline visit date cannot be before the treatment initiation date"
  }
  return null
}

export function validateTreatmentInitiationDate(
  value: string,
  baselineVisitDate?: string
): string | null {
  if (!value) return "Treatment initiation date is required"
  if (!isNotFutureDate(value)) return "Treatment initiation date cannot be in the future"
  if (compareIsoDates(value, TREATMENT_INITIATION_MIN) < 0) {
    return "Treatment initiation date cannot be before 10 Feb 2026"
  }
  if (baselineVisitDate && compareIsoDates(value, baselineVisitDate) > 0) {
    return "Treatment initiation date cannot be after the baseline visit date"
  }
  return null
}

export function validateFollowUpVisitDate(value: string): string | null {
  if (!value) return null
  if (!isNotFutureDate(value)) return "Follow-up visit date cannot be in the future"
  return null
}
