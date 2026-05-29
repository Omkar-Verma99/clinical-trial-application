/** Shared form validation helpers */

export const NA_VALUE = "NA"

export function normalizeOtherText(value: string): string {
  const trimmed = value.trim()
  return trimmed || NA_VALUE
}

export function normalizeOtherArray(value: string): string[] {
  const trimmed = value.trim()
  return trimmed ? [trimmed] : [NA_VALUE]
}

export function hasAtLeastOneTrue(values: Record<string, boolean>): boolean {
  return Object.values(values).some(Boolean)
}

export function hasAtLeastOneCheckbox(
  values: Record<string, boolean>,
  excludeKeys: string[] = []
): boolean {
  return Object.entries(values).some(([key, value]) => !excludeKeys.includes(key) && value)
}

export function parseUrinalysisFields(urinalysis?: string): {
  urinalysisType: "Normal" | "Abnormal" | ""
  urinalysisSpecify: string
} {
  if (!urinalysis) return { urinalysisType: "", urinalysisSpecify: "" }
  if (urinalysis.startsWith("Abnormal")) {
    return {
      urinalysisType: "Abnormal",
      urinalysisSpecify: urinalysis.replace(/^Abnormal:\s*/, ""),
    }
  }
  if (urinalysis === "Normal") return { urinalysisType: "Normal", urinalysisSpecify: "" }
  return { urinalysisType: "", urinalysisSpecify: "" }
}

export function hasDuplicateVisitDate(
  visitDate: string,
  followUps: Array<{ visitDate?: string }>,
  excludeIndex: number
): boolean {
  if (!visitDate) return false
  return followUps.some((visit, index) => index !== excludeIndex && visit.visitDate === visitDate)
}
