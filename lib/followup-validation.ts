import { hasAtLeastOneCheckbox } from "@/lib/form-validation"
import type { FollowUpData } from "@/lib/types"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value)
}

function eventsOfSpecialInterestOk(
  events: FollowUpData["eventsOfSpecialInterest"] | undefined
): boolean {
  if (!events) return false
  return hasAtLeastOneCheckbox({
    hypoglycemiaMild: events.hypoglycemiaMild === true,
    hypoglycemiaModerate: events.hypoglycemiaModerate === true,
    hypoglycemiaSevere: events.hypoglycemiaSevere === true,
    uti: events.uti === true,
    genitalMycoticInfection: events.genitalMycoticInfection === true,
    dizzinessDehydrationSymptoms: events.dizzinessDehydrationSymptoms === true,
    hospitalizationOrErVisit: events.hospitalizationOrErVisit === true,
    none: events.none === true,
  })
}

type PreferredPatientProfiles = NonNullable<
  NonNullable<FollowUpData["physicianAssessment"]>["preferredPatientProfiles"]
>

function preferredProfilesOk(profiles: PreferredPatientProfiles | undefined): boolean {
  if (!profiles || typeof profiles !== "object") return false
  const p = profiles as Record<string, boolean | string | undefined>
  const hasProfile = hasAtLeastOneCheckbox({
    uncontrolledT2dm: p.uncontrolledT2dm === true,
    obeseT2dm: p.obeseT2dm === true,
    ckdPatients: p.ckdPatients === true,
    htnPlusT2dm: p.htnPlusT2dm === true,
    elderlyPatients: p.elderlyPatients === true,
    other: p.other === true,
  })
  if (!hasProfile) return false
  if (p.other === true) {
    const details = p.otherDetails
    return typeof details === "string" && details.trim().length > 0 && details !== "NA"
  }
  return true
}

function adverseEventsOk(followup: FollowUpData): boolean {
  if (followup.adverseEventsPresent !== true) return true
  const events = followup.adverseEvents ?? followup.adverseEventsStructured ?? []
  if (!Array.isArray(events) || events.length === 0) return false
  return events.every(
    (event) =>
      isNonEmptyString(event.aeTerm) &&
      isNonEmptyString(event.onsetDate) &&
      isNonEmptyString(event.severity) &&
      isNonEmptyString(event.serious) &&
      isNonEmptyString(event.actionTaken) &&
      isNonEmptyString(event.outcome) &&
      (event.actionTaken !== "Other" || isNonEmptyString(event.actionTakenOther))
  )
}

/** True when all mandatory follow-up fields are present on a saved record. */
export function isFollowUpComplete(followup: unknown): followup is FollowUpData {
  if (!followup || typeof followup !== "object") return false

  const f = followup as FollowUpData

  if (!isNonEmptyString(f.visitDate)) return false
  if (!isValidNumber(f.hba1c)) return false
  if (!isValidNumber(f.fpg)) return false
  if (!isValidNumber(f.ppg)) return false
  if (!isValidNumber(f.weight)) return false
  if (!isValidNumber(f.bloodPressureSystolic)) return false
  if (!isValidNumber(f.bloodPressureDiastolic)) return false
  if (!isValidNumber(f.heartRate)) return false
  if (!isValidNumber(f.serumCreatinine)) return false
  if (!isValidNumber(f.egfr)) return false
  if (!isNonEmptyString(f.urinalysis)) return false

  if (!isNonEmptyString(f.glycemicResponse?.category)) return false

  const outcomes = f.outcomes
  if (!outcomes || !isNonEmptyString(outcomes.weightChange)) return false
  if (typeof outcomes.bpControlAchieved !== "boolean") return false
  if (!isNonEmptyString(outcomes.renalOutcome)) return false

  const adherence = f.adherence
  if (!adherence || typeof adherence.patientContinuingTreatment !== "boolean") return false
  if (adherence.missedDosesInLast7Days === undefined || adherence.missedDosesInLast7Days === null) {
    return false
  }
  if (typeof adherence.addOnOrChangedTherapy !== "boolean") return false
  if (adherence.addOnOrChangedTherapy && !isNonEmptyString(adherence.addOnOrChangedTherapyDetails)) {
    return false
  }
  if (adherence.patientContinuingTreatment === false) {
    if (!isNonEmptyString(adherence.discontinuationReason)) return false
    if (
      adherence.discontinuationReason === "Other" &&
      !isNonEmptyString(adherence.discontinuationReasonOtherDetails)
    ) {
      return false
    }
  }

  if (typeof f.adverseEventsPresent !== "boolean") return false
  if (!adverseEventsOk(f)) return false
  if (!eventsOfSpecialInterestOk(f.eventsOfSpecialInterest)) return false
  if (f.eventsOfSpecialInterest?.hospitalizationOrErVisit && !isNonEmptyString(f.eventsOfSpecialInterest.hospitalizationReason)) {
    return false
  }

  const assessment = f.physicianAssessment
  if (!assessment) return false
  if (!isNonEmptyString(assessment.overallEfficacy)) return false
  if (!isNonEmptyString(assessment.overallTolerability)) return false
  if (!isNonEmptyString(assessment.complianceJudgment)) return false
  if (typeof assessment.preferKcMeSempaForLongTerm !== "boolean") return false
  if (!preferredProfilesOk(assessment.preferredPatientProfiles)) return false

  const privacy = f.dataPrivacy
  if (
    !privacy ||
    privacy.noPersonalIdentifiersRecorded !== true ||
    privacy.dataCollectedAsRoutineClinicalPractice !== true ||
    privacy.patientIdentityMappingAtClinicOnly !== true
  ) {
    return false
  }

  if (f.physicianDeclaration?.confirmationCheckbox !== true) return false

  const comments = (f as FollowUpData & { comments?: string }).comments
  if (!isNonEmptyString(comments)) return false

  return true
}

export function areAllFollowUpsComplete(followups: unknown): boolean {
  if (!Array.isArray(followups)) return false
  return followups.every((entry) => isFollowUpComplete(entry))
}

export const FOLLOWUP_INCOMPLETE_MESSAGE =
  "Complete all required follow-up fields before saving."

/** Debug helper: which follow-up checks failed (no PII). */
export function getFollowUpIncompleteReasons(followup: unknown): string[] {
  if (!followup || typeof followup !== "object") return ["missing_followup_object"]
  const f = followup as FollowUpData
  const reasons: string[] = []
  if (!isNonEmptyString(f.visitDate)) reasons.push("visitDate")
  if (!isValidNumber(f.hba1c)) reasons.push("hba1c")
  if (!isValidNumber(f.fpg)) reasons.push("fpg")
  if (!isValidNumber(f.ppg)) reasons.push("ppg")
  if (!isValidNumber(f.weight)) reasons.push("weight")
  if (!isValidNumber(f.bloodPressureSystolic)) reasons.push("bloodPressureSystolic")
  if (!isValidNumber(f.bloodPressureDiastolic)) reasons.push("bloodPressureDiastolic")
  if (!isValidNumber(f.heartRate)) reasons.push("heartRate")
  if (!isValidNumber(f.serumCreatinine)) reasons.push("serumCreatinine")
  if (!isValidNumber(f.egfr)) reasons.push("egfr")
  if (!isNonEmptyString(f.urinalysis)) reasons.push("urinalysis")
  if (!isNonEmptyString(f.glycemicResponse?.category)) reasons.push("glycemicResponse.category")
  if (!f.outcomes?.weightChange) reasons.push("outcomes.weightChange")
  if (typeof f.outcomes?.bpControlAchieved !== "boolean") reasons.push("outcomes.bpControlAchieved")
  if (!f.outcomes?.renalOutcome) reasons.push("outcomes.renalOutcome")
  if (!f.adherence) reasons.push("adherence")
  if (f.adherence && (f.adherence.missedDosesInLast7Days === undefined || f.adherence.missedDosesInLast7Days === null)) {
    reasons.push("adherence.missedDosesInLast7Days")
  }
  if (!eventsOfSpecialInterestOk(f.eventsOfSpecialInterest)) reasons.push("eventsOfSpecialInterest")
  if (!f.physicianAssessment) reasons.push("physicianAssessment")
  if (f.physicianDeclaration?.confirmationCheckbox !== true) reasons.push("physicianDeclaration")
  const comments = (f as FollowUpData & { comments?: string }).comments
  if (!isNonEmptyString(comments)) reasons.push("comments")
  if (!isFollowUpComplete(followup) && reasons.length === 0) reasons.push("other")
  return reasons
}
