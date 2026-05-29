/**
 * Read-only audit: list patients missing fields/flags per current validation rules.
 * Does NOT modify or delete any Firestore data.
 *
 * Usage: node scripts/audit-patient-validation.mjs
 * Output: scripts/output/patient-validation-audit-YYYYMMDD.csv
 */

import { createWriteStream, mkdirSync, existsSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

function loadEnvFile(filename) {
  const path = join(ROOT, filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env.production")

function parseServiceAccount(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
  }
}

function initAdmin() {
  if (getApps().length > 0) return
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY not set in .env.local")
  }
  initializeApp({ credential: cert(parseServiceAccount(raw)) })
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function isValidNumber(value) {
  return typeof value === "number" && !Number.isNaN(value)
}

function mapHasAnyTrue(map, excludeKeys = []) {
  if (!map || typeof map !== "object") return false
  return Object.entries(map).some(([key, value]) => !excludeKeys.includes(key) && value === true)
}

function getPatientInfoMissing(data) {
  const missing = []
  if (!isNonEmptyString(data.patientCode)) missing.push("patientCode")
  if (!isNonEmptyString(data.baselineVisitDate)) missing.push("baselineVisitDate")
  if (!isValidNumber(data.age)) missing.push("age")
  if (!isNonEmptyString(data.gender)) missing.push("gender")
  if (!isValidNumber(data.height)) missing.push("height")
  if (!isValidNumber(data.weight)) missing.push("weight")
  if (!isValidNumber(data.durationOfDiabetes)) missing.push("durationOfDiabetes")
  if (!isNonEmptyString(data.baselineGlycemicSeverity)) missing.push("baselineGlycemicSeverity")
  if (!isNonEmptyString(data.smokingStatus)) missing.push("smokingStatus")
  if (!isNonEmptyString(data.alcoholIntake)) missing.push("alcoholIntake")
  if (!isNonEmptyString(data.physicalActivityLevel)) missing.push("physicalActivityLevel")
  if (!isNonEmptyString(data.previousTreatmentType)) missing.push("previousTreatmentType")

  const complications = data.diabetesComplications
  if (!mapHasAnyTrue(complications)) missing.push("diabetesComplications")

  const comorbidities = data.comorbidities
  const hasComorbidity =
    comorbidities &&
    Object.entries(comorbidities).some(([key, value]) => key !== "ckdEgfrCategory" && value === true)
  if (!hasComorbidity) missing.push("comorbidities")
  if (comorbidities?.chronicKidneyDisease === true && !isNonEmptyString(comorbidities.ckdEgfrCategory)) {
    missing.push("comorbidities.ckdEgfrCategory")
  }

  if (!mapHasAnyTrue(data.previousDrugClasses)) missing.push("previousDrugClasses")

  const reasons = data.reasonForTripleFDC
  if (!reasons) {
    missing.push("reasonForTripleFDC")
  } else {
    const hasReason =
      reasons.inadequateGlycemicControl === true ||
      reasons.weightConcerns === true ||
      reasons.hypoglycemiaOnPriorTherapy === true ||
      reasons.highPillBurden === true ||
      reasons.poorAdherence === true ||
      reasons.costConsiderations === true ||
      reasons.physicianClinicalJudgment === true ||
      (Array.isArray(reasons.other)
        ? reasons.other.some((v) => typeof v === "string" && v.trim() && v !== "NA")
        : typeof reasons.other === "string" && reasons.other.trim().length > 0)
    if (!hasReason) missing.push("reasonForTripleFDC.selection")
  }

  return missing
}

function hasBaselineCounseling(baseline) {
  if (!baseline || typeof baseline !== "object") return false
  if (baseline.counseling && typeof baseline.counseling === "object") {
    return mapHasAnyTrue(baseline.counseling)
  }
  return baseline.counselingProvided === true
}

function getBaselineMissing(baseline) {
  const missing = []
  if (!baseline || typeof baseline !== "object") {
    missing.push("baseline (entire object)")
    return missing
  }
  for (const key of [
    "hba1c",
    "fpg",
    "ppg",
    "weight",
    "bloodPressureSystolic",
    "bloodPressureDiastolic",
    "heartRate",
    "serumCreatinine",
    "egfr",
  ]) {
    if (!isValidNumber(baseline[key])) missing.push(`baseline.${key}`)
  }
  if (!isNonEmptyString(baseline.urinalysis)) missing.push("baseline.urinalysis")
  if (!isNonEmptyString(baseline.dosePrescribed)) missing.push("baseline.dosePrescribed")
  if (!isNonEmptyString(baseline.treatmentInitiationDate)) missing.push("baseline.treatmentInitiationDate")
  if (!isNonEmptyString(baseline.baselineVisitDate)) missing.push("baseline.baselineVisitDate")
  if (!hasBaselineCounseling(baseline)) missing.push("baseline.counseling")
  return missing
}

function getFollowUpMissing(f) {
  const missing = []
  if (!f || typeof f !== "object") return ["followup_object"]

  if (!isNonEmptyString(f.visitDate)) missing.push("visitDate")
  if (!isValidNumber(f.hba1c)) missing.push("hba1c")
  if (!isValidNumber(f.fpg)) missing.push("fpg")
  if (!isValidNumber(f.ppg)) missing.push("ppg")
  if (!isValidNumber(f.weight)) missing.push("weight")
  if (!isValidNumber(f.bloodPressureSystolic)) missing.push("bloodPressureSystolic")
  if (!isValidNumber(f.bloodPressureDiastolic)) missing.push("bloodPressureDiastolic")
  if (!isValidNumber(f.heartRate)) missing.push("heartRate")
  if (!isValidNumber(f.serumCreatinine)) missing.push("serumCreatinine")
  if (!isValidNumber(f.egfr)) missing.push("egfr")
  if (!isNonEmptyString(f.urinalysis)) missing.push("urinalysis")
  if (!isNonEmptyString(f.glycemicResponse?.category)) missing.push("glycemicResponse.category")
  if (!isNonEmptyString(f.outcomes?.weightChange)) missing.push("outcomes.weightChange")
  if (typeof f.outcomes?.bpControlAchieved !== "boolean") missing.push("outcomes.bpControlAchieved")
  if (!isNonEmptyString(f.outcomes?.renalOutcome)) missing.push("outcomes.renalOutcome")

  const adherence = f.adherence
  if (!adherence) {
    missing.push("adherence")
  } else {
    if (typeof adherence.patientContinuingTreatment !== "boolean") missing.push("adherence.patientContinuingTreatment")
    if (adherence.missedDosesInLast7Days === undefined || adherence.missedDosesInLast7Days === null) {
      missing.push("adherence.missedDosesInLast7Days")
    }
    if (typeof adherence.addOnOrChangedTherapy !== "boolean") missing.push("adherence.addOnOrChangedTherapy")
    if (adherence.addOnOrChangedTherapy && !isNonEmptyString(adherence.addOnOrChangedTherapyDetails)) {
      missing.push("adherence.addOnOrChangedTherapyDetails")
    }
    if (adherence.patientContinuingTreatment === false) {
      if (!isNonEmptyString(adherence.discontinuationReason)) missing.push("adherence.discontinuationReason")
      if (
        adherence.discontinuationReason === "Other" &&
        !isNonEmptyString(adherence.discontinuationReasonOtherDetails)
      ) {
        missing.push("adherence.discontinuationReasonOtherDetails")
      }
    }
  }

  if (typeof f.adverseEventsPresent !== "boolean") missing.push("adverseEventsPresent")
  if (f.adverseEventsPresent === true) {
    const events = f.adverseEvents ?? f.adverseEventsStructured ?? []
    if (!Array.isArray(events) || events.length === 0) missing.push("adverseEvents")
  }

  const events = f.eventsOfSpecialInterest
  if (!mapHasAnyTrue(events, ["hospitalizationReason"])) missing.push("eventsOfSpecialInterest")
  if (events?.hospitalizationOrErVisit === true && !isNonEmptyString(events.hospitalizationReason)) {
    missing.push("eventsOfSpecialInterest.hospitalizationReason")
  }

  const assessment = f.physicianAssessment
  if (!assessment) {
    missing.push("physicianAssessment")
  } else {
    if (!isNonEmptyString(assessment.overallEfficacy)) missing.push("physicianAssessment.overallEfficacy")
    if (!isNonEmptyString(assessment.overallTolerability)) missing.push("physicianAssessment.overallTolerability")
    if (!isNonEmptyString(assessment.complianceJudgment)) missing.push("physicianAssessment.complianceJudgment")
    if (typeof assessment.preferKcMeSempaForLongTerm !== "boolean") missing.push("physicianAssessment.preferKcMeSempaForLongTerm")
    const profiles = assessment.preferredPatientProfiles
    if (!mapHasAnyTrue(profiles, ["otherDetails"])) missing.push("physicianAssessment.preferredPatientProfiles")
    if (profiles?.other === true) {
      const details = profiles.otherDetails
      if (typeof details !== "string" || !details.trim() || details === "NA") {
        missing.push("physicianAssessment.preferredPatientProfiles.otherDetails")
      }
    }
  }

  const privacy = f.dataPrivacy
  if (
    !privacy ||
    privacy.noPersonalIdentifiersRecorded !== true ||
    privacy.dataCollectedAsRoutineClinicalPractice !== true ||
    privacy.patientIdentityMappingAtClinicOnly !== true
  ) {
    missing.push("dataPrivacy")
  }

  if (f.physicianDeclaration?.confirmationCheckbox !== true) missing.push("physicianDeclaration")
  const comments = f.comments ?? f.additionalComments
  if (!isNonEmptyString(comments)) missing.push("comments")

  return missing
}

function csvEscape(value) {
  const s = String(value ?? "")
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function isStubBaseline(baseline) {
  if (!baseline || typeof baseline !== "object") return false
  const keys = Object.keys(baseline).filter((k) => !["updatedAt", "createdAt", "doctorId", "patientId"].includes(k))
  if (keys.length <= 3) {
    const onlySyncFields = keys.every((k) =>
      ["baselineVisitDate", "weight", "baselineVisitDate"].includes(k)
    )
    return onlySyncFields && !isValidNumber(baseline.hba1c)
  }
  return false
}

async function main() {
  initAdmin()
  const db = getFirestore()

  console.log("Fetching all patients (read-only)...")
  const snap = await db.collection("patients").get()
  console.log(`Found ${snap.size} patient documents.`)

  const rows = []
  const summary = {
    total: snap.size,
    missingPatientInfoFlag: 0,
    patientInfoDataIncomplete: 0,
    missingBaselineFlag: 0,
    baselineDataIncomplete: 0,
    stubBaseline: 0,
    hasIncompleteFollowup: 0,
    blockedFollowupSave: 0,
  }

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const patientId = docSnap.id

    const patientInfoMissing = getPatientInfoMissing(data)
    const patientInfoDataComplete = patientInfoMissing.length === 0
    const patientInfoFlag = data.patientInfoComplete === true
    const patientInfoRulesOk = patientInfoFlag || patientInfoDataComplete

    const baseline = data.baseline
    const baselineMissing = getBaselineMissing(baseline)
    const baselineDataComplete = baselineMissing.length === 0
    const baselineFlag = data.baselineComplete === true
    const baselineRulesOk = baselineFlag || baselineDataComplete
    const stub = isStubBaseline(baseline)

    const followups = Array.isArray(data.followups) ? data.followups : []
    const incompleteFollowups = []
    for (let i = 0; i < followups.length; i++) {
      const missing = getFollowUpMissing(followups[i])
      if (missing.length > 0) {
        incompleteFollowups.push({ index: i + 1, missing })
      }
    }
    const allFollowupsComplete = incompleteFollowups.length === 0
    const canSaveFollowup = baselineRulesOk && patientInfoRulesOk && allFollowupsComplete

    const actions = []
    if (!patientInfoDataComplete) actions.push("Complete Patient Info fields")
    else if (!patientInfoFlag) actions.push("Re-save Patient Info (sets patientInfoComplete flag)")
    if (stub) actions.push("Replace stub baseline with full Baseline form")
    else if (!baselineDataComplete) actions.push("Complete Baseline fields")
    else if (!baselineFlag) actions.push("Re-save Baseline (sets baselineComplete flag)")
    for (const fu of incompleteFollowups) {
      actions.push(`Complete Follow-up ${fu.index} (${fu.missing.slice(0, 5).join("; ")}${fu.missing.length > 5 ? "..." : ""})`)
    }
    if (actions.length === 0) actions.push("OK — no action needed")

    if (!patientInfoFlag) summary.missingPatientInfoFlag++
    if (!patientInfoDataComplete) summary.patientInfoDataIncomplete++
    if (!baselineFlag) summary.missingBaselineFlag++
    if (!baselineDataComplete) summary.baselineDataIncomplete++
    if (stub) summary.stubBaseline++
    if (incompleteFollowups.length > 0) summary.hasIncompleteFollowup++
    if (!canSaveFollowup) summary.blockedFollowupSave++

    rows.push({
      patientId,
      patientCode: data.patientCode ?? "",
      doctorId: data.doctorId ?? "",
      studySiteCode: data.studySiteCode ?? "",
      createdAt: data.createdAt ?? "",
      patientInfoFlag,
      patientInfoDataComplete,
      patientInfoMissing: patientInfoMissing.join("; "),
      baselineFlag,
      baselineDataComplete,
      baselineStub: stub,
      baselineMissing: baselineMissing.join("; "),
      followupCount: followups.length,
      incompleteFollowupIndexes: incompleteFollowups.map((f) => f.index).join("; "),
      incompleteFollowupDetails: incompleteFollowups
        .map((f) => `FU${f.index}:${f.missing.join("|")}`)
        .join(" || "),
      canSaveFollowupPerFirestoreRules: canSaveFollowup,
      recommendedActions: actions.join(" | "),
    })
  }

  rows.sort((a, b) => String(a.patientCode).localeCompare(String(b.patientCode)))

  const outDir = join(__dirname, "output")
  mkdirSync(outDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const outPath = join(outDir, `patient-validation-audit-${date}.csv`)

  const headers = [
    "patientId",
    "patientCode",
    "doctorId",
    "studySiteCode",
    "createdAt",
    "patientInfoComplete_flag",
    "patientInfo_data_complete",
    "patientInfo_missing_fields",
    "baselineComplete_flag",
    "baseline_data_complete",
    "baseline_is_stub_only",
    "baseline_missing_fields",
    "followup_count",
    "incomplete_followup_indexes",
    "incomplete_followup_missing_fields",
    "can_save_followup_per_rules",
    "recommended_actions",
  ]

  const stream = createWriteStream(outPath, { encoding: "utf8" })
  stream.write(headers.join(",") + "\n")
  for (const row of rows) {
    stream.write(
      [
        row.patientId,
        row.patientCode,
        row.doctorId,
        row.studySiteCode,
        row.createdAt,
        row.patientInfoFlag,
        row.patientInfoDataComplete,
        row.patientInfoMissing,
        row.baselineFlag,
        row.baselineDataComplete,
        row.baselineStub,
        row.baselineMissing,
        row.followupCount,
        row.incompleteFollowupIndexes,
        row.incompleteFollowupDetails,
        row.canSaveFollowupPerFirestoreRules,
        row.recommendedActions,
      ]
        .map(csvEscape)
        .join(",") + "\n"
    )
  }
  stream.end()

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve)
    stream.on("error", reject)
  })

  const needsAction = rows.filter((r) => r.recommendedActions !== "OK — no action needed")

  console.log("\n=== AUDIT SUMMARY (read-only, no data changed) ===")
  console.log(JSON.stringify(summary, null, 2))
  console.log(`Patients needing action: ${needsAction.length} / ${rows.length}`)
  console.log(`CSV written to: ${outPath}`)

  if (needsAction.length > 0) {
    console.log("\nSample patients needing action (first 10):")
    for (const r of needsAction.slice(0, 10)) {
      console.log(`  ${r.patientCode || r.patientId}: ${r.recommendedActions}`)
    }
  }
}

main().catch((err) => {
  console.error("Audit failed:", err.message || err)
  process.exit(1)
})
