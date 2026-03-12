export type NumericRange = {
  min: number
  max: number
}

export type ClinicalValidationRanges = {
  hba1c: NumericRange
  fpg: NumericRange
  ppg: NumericRange
  weight: NumericRange
  bpSystolic: NumericRange
  bpDiastolic: NumericRange
  heartRate: NumericRange
  serumCreatinine: NumericRange
  egfr: NumericRange
}

export const DEFAULT_CLINICAL_VALIDATION_RANGES: ClinicalValidationRanges = {
  hba1c: { min: 4, max: 15 },
  fpg: { min: 50, max: 500 },
  ppg: { min: 70, max: 700 },
  weight: { min: 30, max: 200 },
  bpSystolic: { min: 70, max: 200 },
  bpDiastolic: { min: 40, max: 130 },
  heartRate: { min: 30, max: 220 },
  serumCreatinine: { min: 0.1, max: 20 },
  egfr: { min: 1, max: 200 },
}

function toFiniteNumberOrFallback(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRange(input: unknown, fallback: NumericRange): NumericRange {
  const candidate = (input || {}) as Record<string, unknown>
  const min = toFiniteNumberOrFallback(candidate.min, fallback.min)
  const max = toFiniteNumberOrFallback(candidate.max, fallback.max)

  if (min > max) {
    return { ...fallback }
  }

  return { min, max }
}

export function normalizeClinicalValidationRanges(input: unknown): ClinicalValidationRanges {
  const candidate = (input || {}) as Record<string, unknown>

  return {
    hba1c: normalizeRange(candidate.hba1c, DEFAULT_CLINICAL_VALIDATION_RANGES.hba1c),
    fpg: normalizeRange(candidate.fpg, DEFAULT_CLINICAL_VALIDATION_RANGES.fpg),
    ppg: normalizeRange(candidate.ppg, DEFAULT_CLINICAL_VALIDATION_RANGES.ppg),
    weight: normalizeRange(candidate.weight, DEFAULT_CLINICAL_VALIDATION_RANGES.weight),
    bpSystolic: normalizeRange(candidate.bpSystolic, DEFAULT_CLINICAL_VALIDATION_RANGES.bpSystolic),
    bpDiastolic: normalizeRange(candidate.bpDiastolic, DEFAULT_CLINICAL_VALIDATION_RANGES.bpDiastolic),
    heartRate: normalizeRange(candidate.heartRate, DEFAULT_CLINICAL_VALIDATION_RANGES.heartRate),
    serumCreatinine: normalizeRange(candidate.serumCreatinine, DEFAULT_CLINICAL_VALIDATION_RANGES.serumCreatinine),
    egfr: normalizeRange(candidate.egfr, DEFAULT_CLINICAL_VALIDATION_RANGES.egfr),
  }
}
