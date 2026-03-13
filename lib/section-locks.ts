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
