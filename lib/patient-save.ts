import type { FollowUpData, Patient } from "@/lib/types"
import { hasDuplicateVisitDate } from "@/lib/form-validation"
import { areAllFollowUpsComplete, isMeaningfulFollowUp } from "@/lib/followup-validation"
import { isBaselineCompleteForFollowupGuard } from "@/lib/firestore-guards"
import { isPatientInfoCompleteForPatient } from "@/lib/patient-info-validation"
import { resolvePatientBaselineVisitDate } from "@/lib/study-dates"

export type BuildFollowUpsResult =
  | { ok: true; followups: FollowUpData[] }
  | { ok: false; error: string; code: "duplicate_date" | "incomplete" | "invalid_index" }

/**
 * Build the next followups array for a merge-only Firestore update.
 * Removes only empty placeholder slots ({}); never drops meaningful visit data.
 */
export function buildFollowUpsForSave(params: {
  rawFollowups: FollowUpData[] | undefined | null
  followUpIndex: number
  entry: FollowUpData
}): BuildFollowUpsResult {
  const { rawFollowups, followUpIndex, entry } = params
  const sourceFollowups = [...(rawFollowups || [])]
  const meaningfulFollowups = sourceFollowups.filter(isMeaningfulFollowUp)

  const isUpdateByIndex = followUpIndex >= 0 && followUpIndex < sourceFollowups.length

  if (isUpdateByIndex) {
    if (hasDuplicateVisitDate(entry.visitDate || "", meaningfulFollowups, followUpIndex)) {
      return {
        ok: false,
        error: "Another follow-up already uses this visit date. Choose a different date.",
        code: "duplicate_date",
      }
    }

    while (sourceFollowups.length <= followUpIndex) {
      sourceFollowups.push({} as FollowUpData)
    }

    const prior = sourceFollowups[followUpIndex]
    sourceFollowups[followUpIndex] = {
      ...entry,
      createdAt: prior?.createdAt || entry.createdAt,
    }

    const nextFollowups = sourceFollowups.filter(isMeaningfulFollowUp)
    if (!areAllFollowUpsComplete(nextFollowups)) {
      return {
        ok: false,
        error: "Follow-up data is incomplete.",
        code: "incomplete",
      }
    }

    return { ok: true, followups: nextFollowups }
  }

  if (hasDuplicateVisitDate(entry.visitDate || "", meaningfulFollowups, -1)) {
    return {
      ok: false,
      error: "Another follow-up already uses this visit date. Choose a different date.",
      code: "duplicate_date",
    }
  }

  const nextFollowups = [...meaningfulFollowups, entry]
  if (!areAllFollowUpsComplete(nextFollowups)) {
    return {
      ok: false,
      error: "Follow-up data is incomplete.",
      code: "incomplete",
    }
  }

  return { ok: true, followups: nextFollowups }
}

/**
 * Merge-only patient patch for follow-up saves (no deletes of patient document).
 * Syncs legacy readiness flags in the same write so Firestore rules see a ready patient.
 */
export function buildFollowUpSavePatch(
  followups: FollowUpData[],
  patient?: Patient | Record<string, unknown> | null
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    followups,
    updatedAt: new Date().toISOString(),
  }

  if (!patient || typeof patient !== "object") {
    return patch
  }

  const data = patient as Patient

  if (isBaselineCompleteForFollowupGuard(data) && data.baselineComplete !== true) {
    patch.baselineComplete = true
  }

  if (isPatientInfoCompleteForPatient(data) && data.patientInfoComplete !== true) {
    patch.patientInfoComplete = true
  }

  const visitDate = resolvePatientBaselineVisitDate(data as unknown as Record<string, unknown>)
  if (visitDate && data.baselineVisitDate !== visitDate) {
    patch.baselineVisitDate = visitDate
  }

  return patch
}

/** Merge-only patient patch for baseline saves (no deletes of patient document). */
export function buildBaselineSavePatch(params: {
  baseline: Record<string, unknown>
  baselineVisitDate: string
}): {
  baseline: Record<string, unknown>
  baselineComplete: true
  baselineVisitDate: string
  updatedAt: string
} {
  return {
    baseline: params.baseline,
    baselineComplete: true,
    baselineVisitDate: params.baselineVisitDate,
    updatedAt: new Date().toISOString(),
  }
}
