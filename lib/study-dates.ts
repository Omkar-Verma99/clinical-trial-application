/** Study enrollment date windows for KC MeSempa RWE trial */

export const BASELINE_VISIT_MIN = "2026-02-26"
export const BASELINE_VISIT_MAX = "2026-04-21"
export const TREATMENT_INITIATION_MIN = "2026-02-10"

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function dateToIsoString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Normalize legacy Firestore / UI date values to YYYY-MM-DD. */
export function normalizeStudyDate(value: unknown): string {
  if (value == null || value === "") return ""

  if (typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number }
    if (typeof maybeTimestamp.toDate === "function") {
      const d = maybeTimestamp.toDate()
      return Number.isNaN(d.getTime()) ? "" : dateToIsoString(d)
    }
    if (typeof maybeTimestamp.seconds === "number") {
      const d = new Date(maybeTimestamp.seconds * 1000)
      return Number.isNaN(d.getTime()) ? "" : dateToIsoString(d)
    }
  }

  const str = String(value).trim()
  if (!str) return ""

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [yearStr, monthStr, dayStr] = str.split("-")
    const year = Number.parseInt(yearStr, 10)
    const month = Number.parseInt(monthStr, 10)
    const day = Number.parseInt(dayStr, 10)
    const parsed = new Date(year, month - 1, day)
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return dateToIsoString(parsed)
    }
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dayStr, monthStr, yearStr] = str.split("/")
    const day = Number.parseInt(dayStr, 10)
    const month = Number.parseInt(monthStr, 10)
    const year = Number.parseInt(yearStr, 10)
    const parsed = new Date(year, month - 1, day)
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return dateToIsoString(parsed)
    }
  }

  const parsed = new Date(str.includes("T") ? str : `${str}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? "" : dateToIsoString(parsed)
}

export function resolvePatientBaselineVisitDate(patient: Record<string, unknown> | null | undefined): string {
  if (!patient) return ""
  const nested = patient.baseline as Record<string, unknown> | undefined
  return (
    normalizeStudyDate(patient.baselineVisitDate) ||
    normalizeStudyDate(nested?.baselineVisitDate)
  )
}

export function todayIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function parseIsoDate(value: string): Date | null {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : normalizeStudyDate(value)
  if (!normalized) return null

  const [yearStr, monthStr, dayStr] = normalized.split("-")
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const day = Number.parseInt(dayStr, 10)
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null
  }
  return parsed
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
