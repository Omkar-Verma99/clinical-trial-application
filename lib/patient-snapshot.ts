import type { Patient } from "@/lib/types"

/** Cheap change detection for onSnapshot — avoids JSON.stringify on full patient docs. */
export function shouldUpdatePatientState(prev: Patient | null, next: Patient): boolean {
  if (!prev) return true
  if (prev.updatedAt !== next.updatedAt) return true
  if (prev.patientInfoComplete !== next.patientInfoComplete) return true
  if (prev.baselineComplete !== next.baselineComplete) return true
  if (prev.baselineVisitDate !== next.baselineVisitDate) return true
  if ((prev.followups?.length ?? 0) !== (next.followups?.length ?? 0)) return true
  if (prev.patientCode !== next.patientCode) return true
  if (prev.age !== next.age) return true
  if (prev.weight !== next.weight) return true
  if (prev.baseline?.updatedAt !== next.baseline?.updatedAt) return true

  const prevLocks = JSON.stringify(prev.sectionLocks ?? null)
  const nextLocks = JSON.stringify(next.sectionLocks ?? null)
  if (prevLocks !== nextLocks) return true

  return false
}
