export type LockableSection = 'overview' | 'patient_info' | 'baseline' | `followup_${number}`

export interface SectionLock {
  locked: boolean
  lockedBy?: string
  lockedByName?: string
  reason?: string
  lockedAt?: string
  updatedAt?: string
}

export type SectionLockMap = Record<string, SectionLock | undefined>

export function followupSectionKey(followUpIndex: number): LockableSection {
  return `followup_${followUpIndex + 1}`
}

export function getSectionLock(
  sectionLocks: SectionLockMap | null | undefined,
  section: LockableSection
): SectionLock | null {
  if (!sectionLocks) return null
  if (sectionLocks[section]) return sectionLocks[section] || null

  // Backward compatibility for earlier key naming used in some records.
  if (section === 'patient_info') {
    return sectionLocks['patient-info'] || null
  }

  return null
}

export function isSectionLocked(
  sectionLocks: SectionLockMap | null | undefined,
  section: LockableSection
): boolean {
  return Boolean(getSectionLock(sectionLocks, section)?.locked)
}

export function doctorLockedMessage(): string {
  return 'Locked. You cannot edit this section.'
}

export function getDoctorLockMessage(
  sectionLocks: SectionLockMap | null | undefined,
  section: LockableSection
): string {
  const lock = getSectionLock(sectionLocks, section)
  if (!lock?.locked) return doctorLockedMessage()
  if (lock.lockedByName?.trim()) {
    return `Locked by ${lock.lockedByName}. You cannot edit this section.`
  }
  if (lock.reason?.trim()) {
    return lock.reason
  }
  return doctorLockedMessage()
}

export function getFirestoreSaveErrorMessage(
  error: unknown,
  options?: {
    lockMessage?: string
    isSectionLocked?: boolean
    canOverrideLock?: boolean
    guardIssues?: string[]
  }
): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : ""

  if (code === "permission-denied") {
    if (options?.isSectionLocked && !options?.canOverrideLock) {
      return options.lockMessage || doctorLockedMessage()
    }
    if (options?.guardIssues?.length) {
      return options.guardIssues.join(" ")
    }
    return "Firestore rejected this save. Ensure baseline and patient info are complete, then try again. If this section is locked, ask an admin to unlock it."
  }

  return error instanceof Error ? error.message : "Please try again."
}
