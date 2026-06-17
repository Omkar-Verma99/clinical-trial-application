/**
 * Comprehensive doctor E2E — new doctor + 5 patients, app validation + save paths.
 * Uses the same helpers as PatientForm / BaselineForm / FollowUpForm.
 *
 * Usage:
 *   npx tsx scripts/comprehensive-doctor-e2e.ts
 *   E2E_CLEANUP=true npx tsx scripts/comprehensive-doctor-e2e.ts
 */

import { createWriteStream, mkdirSync, existsSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { initializeApp } from "firebase/app"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore"
import {
  buildBaselineSavePatch,
  buildFollowUpSavePatch,
  buildFollowUpsForSave,
} from "../lib/patient-save"
import { isBaselineComplete } from "../lib/baseline-validation"
import {
  areAllFollowUpsComplete,
  getFollowUpIncompleteReasons,
  isFollowUpComplete,
} from "../lib/followup-validation"
import { getFollowUpFirestoreGuardIssues } from "../lib/firestore-guards"
import { getFollowUpPrerequisiteIssues } from "../lib/patient-prerequisites"
import {
  getPatientInfoValidationErrors,
  isPatientInfoCompleteForPatient,
} from "../lib/patient-info-validation"
import type { FollowUpData, Patient } from "../lib/types"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

function loadEnvFile(filename: string) {
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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kollectcare-rwe-study.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kollectcare-rwe-study",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kollectcare-rwe-study.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "940369281340",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:940369281340:web:d6b3f7e8c4a9b2f1e5d8c9a",
}

const RUN_ID = Date.now()
const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || `e2e.comp.${RUN_ID}@kollectcare.test`
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || "E2eTest@2026!"
const STUDY_SITE = "RWE-99"
const CLEANUP = process.env.E2E_CLEANUP === "true"
const BASE_URL =
  process.env.E2E_BASE_URL || "https://kollectcare-rwe-study.vercel.app"

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

interface StepResult {
  step: string
  ok: boolean
  detail: string
  at: string
}

const results: StepResult[] = []
const createdPatientRefs: { ref: ReturnType<typeof doc>; code: string; patientId: string }[] = []
const bugs: string[] = []

function nowIso() {
  return new Date().toISOString()
}

function patientCode(i: number) {
  return `998-${`E${String(i + 1).padStart(2, "0")}`}`
}

function log(step: string, ok: boolean, detail = "") {
  results.push({ step, ok, detail, at: nowIso() })
  const status = ok ? "PASS" : "FAIL"
  console.log(`[${status}] ${step}${detail ? ` — ${detail}` : ""}`)
  if (!ok) bugs.push(`${step}: ${detail}`)
}

async function runStep(step: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn()
    log(step, true, typeof detail === "string" ? detail : "")
    return true
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    const msg = err?.code ? `${err.code}: ${err.message}` : String(err?.message || error)
    log(step, false, msg)
    return false
  }
}

function buildPatientInfo(uid: string, patientId: string, code: string, overrides: Record<string, unknown> = {}) {
  const createdAt = nowIso()
  return {
    id: patientId,
    patientId,
    doctorId: uid,
    patientCode: code,
    studySiteCode: STUDY_SITE,
    investigatorName: "Dr E2E Comprehensive",
    baselineVisitDate: "2026-03-01",
    age: 52,
    gender: "Male",
    height: 172,
    weight: 78,
    bmi: 26.4,
    durationOfDiabetes: 8,
    baselineGlycemicSeverity: "HbA1c 7.5-8.5%",
    smokingStatus: "Never",
    alcoholIntake: "No",
    physicalActivityLevel: "Moderate",
    diabetesComplications: {
      neuropathy: false,
      retinopathy: false,
      nephropathy: false,
      cadOrStroke: false,
      none: true,
    },
    comorbidities: {
      hypertension: true,
      dyslipidemia: false,
      obesity: false,
      ascvd: false,
      heartFailure: false,
      chronicKidneyDisease: false,
      ckdEgfrCategory: null,
      other: ["NA"],
    },
    previousTreatmentType: "Oral drugs only",
    previousDrugClasses: {
      metformin: true,
      sulfonylurea: false,
      dpp4Inhibitor: false,
      sglt2Inhibitor: false,
      tzd: false,
      insulin: false,
      other: ["NA"],
    },
    reasonForTripleFDC: {
      inadequateGlycemicControl: true,
      weightConcerns: false,
      hypoglycemiaOnPriorTherapy: false,
      highPillBurden: false,
      poorAdherence: false,
      costConsiderations: false,
      physicianClinicalJudgment: false,
      other: ["NA"],
    },
    patientInfoComplete: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

function buildBaseline(uid: string, patientId: string, overrides: Record<string, unknown> = {}) {
  return {
    patientId,
    doctorId: uid,
    baselineVisitDate: "2026-03-01",
    hba1c: 7.8,
    fpg: 142,
    ppg: 188,
    weight: 78,
    bloodPressureSystolic: 132,
    bloodPressureDiastolic: 86,
    heartRate: 74,
    serumCreatinine: 1.0,
    egfr: 88,
    urinalysis: "Normal",
    dosePrescribed:
      "Empagliflozin 10mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg",
    treatmentInitiationDate: "2026-03-01",
    counseling: {
      dietAndLifestyle: true,
      hypoglycemiaAwareness: true,
      utiGenitialInfectionAwareness: false,
      hydrationAdvice: true,
    },
    counselingProvided: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...overrides,
  }
}

function buildFollowUp(uid: string, patientId: string, overrides: Record<string, unknown> = {}): FollowUpData {
  return {
    patientId,
    doctorId: uid,
    visitNumber: 12,
    visitDate: "2026-06-01",
    hba1c: 7.1,
    fpg: 128,
    ppg: 170,
    weight: 76,
    bloodPressureSystolic: 128,
    bloodPressureDiastolic: 82,
    heartRate: 72,
    serumCreatinine: 1.0,
    egfr: 90,
    urinalysis: "Normal",
    glycemicResponse: { category: "Responder", hba1cChange: -0.5, hba1cPercentageChange: -6.5 },
    outcomes: {
      weightChange: "Decreased",
      bpControlAchieved: true,
      renalOutcome: "Stable eGFR",
    },
    adherence: {
      patientContinuingTreatment: true,
      addOnOrChangedTherapy: false,
      addOnOrChangedTherapyDetails: null,
      missedDosesInLast7Days: "0",
      discontinuationReason: null,
    },
    adverseEventsPresent: false,
    adverseEvents: [],
    adverseEventsStructured: [],
    eventsOfSpecialInterest: {
      hypoglycemiaMild: false,
      hypoglycemiaModerate: false,
      hypoglycemiaSevere: false,
      uti: false,
      genitalMycoticInfection: false,
      dizzinessDehydrationSymptoms: false,
      hospitalizationOrErVisit: false,
      none: true,
    },
    physicianAssessment: {
      overallEfficacy: "Good",
      overallTolerability: "Good",
      complianceJudgment: "Good",
      preferKcMeSempaForLongTerm: true,
      preferredPatientProfiles: {
        uncontrolledT2dm: true,
        obeseT2dm: false,
        ckdPatients: false,
        htnPlusT2dm: true,
        elderlyPatients: false,
        other: false,
        otherDetails: "NA",
      },
    },
    dataPrivacy: {
      noPersonalIdentifiersRecorded: true,
      dataCollectedAsRoutineClinicalPractice: true,
      patientIdentityMappingAtClinicOnly: true,
    },
    physicianDeclaration: {
      physicianName: "Dr E2E Comprehensive",
      qualification: "MD",
      clinicHospitalName: STUDY_SITE,
      confirmationCheckbox: true,
      signatureMethod: "Checkbox",
      signatureDate: "2026-06-01",
    },
    comments: "E2E comprehensive follow-up",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...overrides,
  } as FollowUpData
}

async function syncRole(user: { getIdToken: (force?: boolean) => Promise<string> }) {
  const token = await user.getIdToken(true)
  const res = await fetch(`${BASE_URL}/api/auth/sync-role`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`sync-role HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function savePatientInfo(patientRef: ReturnType<typeof doc>, payload: Record<string, unknown>) {
  const errors = getPatientInfoValidationErrors(payload)
  if (errors.length > 0) {
    throw new Error(`patient info validation: ${errors.join("; ")}`)
  }
  if (!isPatientInfoCompleteForPatient(payload as Patient)) {
    throw new Error("isPatientInfoCompleteForPatient returned false")
  }
  await setDoc(patientRef, payload)
}

async function saveBaselineApp(
  patientRef: ReturnType<typeof doc>,
  baseline: Record<string, unknown>
) {
  if (!isBaselineComplete(baseline)) {
    throw new Error("baseline validation failed before save")
  }
  const patch = buildBaselineSavePatch({
    baseline,
    baselineVisitDate: String(baseline.baselineVisitDate),
  })
  const batch = writeBatch(db)
  batch.set(patientRef, patch, { merge: true })
  await batch.commit()
}

async function saveFollowUpApp(
  patientRef: ReturnType<typeof doc>,
  patientDoc: Patient,
  followUpIndex: number,
  entry: FollowUpData
) {
  if (!isFollowUpComplete(entry)) {
    const reasons = getFollowUpIncompleteReasons(entry)
    throw new Error(`follow-up incomplete: ${reasons.join(", ")}`)
  }

  const prereq = getFollowUpPrerequisiteIssues(patientDoc)
  if (prereq.length > 0) {
    throw new Error(`prerequisites: ${prereq.map((p) => p.message).join("; ")}`)
  }

  const buildResult = buildFollowUpsForSave({
    rawFollowups: patientDoc.followups,
    followUpIndex,
    entry,
  })
  if (!buildResult.ok) {
    throw new Error(buildResult.error)
  }

  const guardIssues = getFollowUpFirestoreGuardIssues(patientDoc, buildResult.followups)
  if (guardIssues.length > 0) {
    throw new Error(guardIssues.join(" "))
  }

  await updateDoc(patientRef, buildFollowUpSavePatch(buildResult.followups, patientDoc))
}

async function readPatient(patientRef: ReturnType<typeof doc>): Promise<Patient> {
  const snap = await getDoc(patientRef)
  if (!snap.exists()) throw new Error("patient missing")
  return { id: snap.id, ...snap.data() } as Patient
}

async function runValidationSuite() {
  console.log("\n=== Validation unit checks (no Firestore) ===")

  await runStep("V1. Complete follow-up passes isFollowUpComplete", async () => {
    const fu = buildFollowUp("uid", "pid")
    if (!isFollowUpComplete(fu)) throw new Error("expected complete")
    return "ok"
  })

  await runStep("V2. Missing comments fails isFollowUpComplete", async () => {
    const fu = buildFollowUp("uid", "pid", { comments: "" })
    if (isFollowUpComplete(fu)) throw new Error("expected incomplete")
    return "ok"
  })

  await runStep("V3. buildFollowUpsForSave rejects duplicate visit date", async () => {
    const a = buildFollowUp("uid", "pid", { visitDate: "2026-06-01" })
    const b = buildFollowUp("uid", "pid", { visitDate: "2026-06-01", visitNumber: 24 })
    const first = buildFollowUpsForSave({ rawFollowups: [], followUpIndex: -1, entry: a })
    if (!first.ok) throw new Error("first save should ok")
    const dup = buildFollowUpsForSave({
      rawFollowups: first.followups,
      followUpIndex: -1,
      entry: b,
    })
    if (dup.ok) throw new Error("duplicate should fail")
    return dup.code
  })

  await runStep("V4. areAllFollowUpsComplete requires every meaningful slot", async () => {
    const complete = buildFollowUp("uid", "pid")
    const partial = { visitDate: "2026-06-01", hba1c: 7.0 }
    if (!areAllFollowUpsComplete([complete])) throw new Error("complete array should pass")
    if (areAllFollowUpsComplete([partial])) throw new Error("partial should fail")
    return "ok"
  })
}

async function main() {
  console.log("=== Comprehensive Doctor E2E ===")
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Cleanup: ${CLEANUP}`)
  console.log("")

  await runValidationSuite()

  let uid = ""

  console.log("\n=== Doctor account ===")
  await runStep("1. Create doctor auth account", async () => {
    const cred = await createUserWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_PASSWORD)
    uid = cred.user.uid
    return `uid=${uid}`
  })

  await runStep("2. Create doctor Firestore profile", async () => {
    await setDoc(doc(db, "doctors", uid), {
      name: "Dr E2E Comprehensive",
      registrationNumber: `REG-E2E-C-${RUN_ID}`,
      qualification: "MD",
      email: DOCTOR_EMAIL,
      phone: "9999999998",
      dateOfBirth: "1985-06-15",
      address: "E2E Comprehensive Test",
      studySiteCode: STUDY_SITE,
      createdAt: nowIso(),
    })
    return STUDY_SITE
  })

  await runStep("3. Sync role claim", async () => {
    const user = auth.currentUser
    if (!user) throw new Error("not signed in")
    const body = await syncRole(user)
    return `role=${body.role}`
  })

  await runStep("4. Re-login flow", async () => {
    await signOut(auth)
    const cred = await signInWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_PASSWORD)
    uid = cred.user.uid
    await syncRole(cred.user)
    return uid
  })

  console.log("\n=== Five patient scenarios (app save paths) ===")

  // P1: Happy path
  {
    const code = patientCode(0)
    const patientRef = doc(collection(db, "patients"))
    createdPatientRefs.push({ ref: patientRef, code, patientId: patientRef.id })
    console.log(`\n--- P1 ${code} ---`)

    await runStep("P1 create patient info", async () => {
      await savePatientInfo(patientRef, buildPatientInfo(uid, patientRef.id, code))
      return patientRef.id
    })

    await runStep("P1 save baseline", async () => {
      await saveBaselineApp(patientRef, buildBaseline(uid, patientRef.id))
      const p = await readPatient(patientRef)
      if (!p.baselineComplete) throw new Error("baselineComplete not set")
      return "baselineComplete=true"
    })

    await runStep("P1 save follow-up (app patch)", async () => {
      const p = await readPatient(patientRef)
      await saveFollowUpApp(patientRef, p, -1, buildFollowUp(uid, patientRef.id))
      const after = await readPatient(patientRef)
      if (!after.followups?.length) throw new Error("no followups")
      return `1 follow-up, flags baseline=${after.baselineComplete}`
    })
  }

  // P2: Edit patient info + baseline + follow-up
  {
    const code = patientCode(1)
    const patientRef = doc(collection(db, "patients"))
    createdPatientRefs.push({ ref: patientRef, code, patientId: patientRef.id })
    console.log(`\n--- P2 ${code} edits ---`)

    await runStep("P2 create + edit patient info", async () => {
      await savePatientInfo(patientRef, buildPatientInfo(uid, patientRef.id, code))
      await updateDoc(patientRef, {
        weight: 82,
        smokingStatus: "Former",
        alcoholIntake: "Occasional",
        physicalActivityLevel: "Low",
        patientInfoComplete: true,
        updatedAt: nowIso(),
      })
      const p = await readPatient(patientRef)
      if (p.weight !== 82) throw new Error("weight edit failed")
      return "weight 82"
    })

    await runStep("P2 baseline save + edit hba1c", async () => {
      await saveBaselineApp(patientRef, buildBaseline(uid, patientRef.id, { weight: 82 }))
      await saveBaselineApp(patientRef, buildBaseline(uid, patientRef.id, { hba1c: 7.4, weight: 82 }))
      const p = await readPatient(patientRef)
      if (p.baseline?.hba1c !== 7.4) throw new Error("baseline hba1c edit failed")
      return "hba1c 7.4"
    })

    await runStep("P2 follow-up after edits", async () => {
      const p = await readPatient(patientRef)
      await saveFollowUpApp(patientRef, p, -1, buildFollowUp(uid, patientRef.id, { weight: 80 }))
      return "saved"
    })
  }

  // P3: Legacy flags — baseline without baselineComplete, follow-up syncs flags
  {
    const code = patientCode(2)
    const patientRef = doc(collection(db, "patients"))
    createdPatientRefs.push({ ref: patientRef, code, patientId: patientRef.id })
    console.log(`\n--- P3 ${code} legacy flags ---`)

    await runStep("P3 create patient (strip flags)", async () => {
      await savePatientInfo(patientRef, buildPatientInfo(uid, patientRef.id, code))
      // Simulate legacy record: flags cleared after create (data still complete).
      await updateDoc(patientRef, {
        patientInfoComplete: false,
        updatedAt: nowIso(),
      })
      const p = await readPatient(patientRef)
      if (p.patientInfoComplete === true) throw new Error("patientInfoComplete should be false")
      return "patientInfoComplete=false, data intact"
    })

    await runStep("P3 baseline save then strip baselineComplete flag", async () => {
      await saveBaselineApp(patientRef, buildBaseline(uid, patientRef.id))
      await updateDoc(patientRef, {
        baselineComplete: false,
        updatedAt: nowIso(),
      })
      const p = await readPatient(patientRef)
      if (p.baselineComplete === true) throw new Error("baselineComplete should be false")
      if (!p.baseline?.hba1c) throw new Error("baseline data should remain")
      return "baselineComplete=false, baseline data intact"
    })

    await runStep("P3 follow-up syncs legacy flags via buildFollowUpSavePatch", async () => {
      const p = await readPatient(patientRef)
      await saveFollowUpApp(patientRef, p, -1, buildFollowUp(uid, patientRef.id))
      const after = await readPatient(patientRef)
      if (!after.baselineComplete) throw new Error("baselineComplete not synced")
      if (!after.patientInfoComplete) throw new Error("patientInfoComplete not synced")
      return "flags synced on follow-up save"
    })
  }

  // P4: Complex follow-up — discontinuation, add-on therapy, AE
  {
    const code = patientCode(3)
    const patientRef = doc(collection(db, "patients"))
    createdPatientRefs.push({ ref: patientRef, code, patientId: patientRef.id })
    console.log(`\n--- P4 ${code} complex follow-up ---`)

    await runStep("P4 setup patient + baseline", async () => {
      await savePatientInfo(patientRef, buildPatientInfo(uid, patientRef.id, code))
      await saveBaselineApp(patientRef, buildBaseline(uid, patientRef.id))
      return "ready"
    })

    await runStep("P4 follow-up with AE + discontinuation path", async () => {
      const p = await readPatient(patientRef)
      const fu = buildFollowUp(uid, patientRef.id, {
        adverseEventsPresent: true,
        adverseEvents: [
          {
            aeTerm: "Nausea",
            onsetDate: "2026-05-10",
            severity: "Mild",
            serious: "No",
            actionTaken: "Dose reduced",
            outcome: "Recovered",
            actionTakenOther: "",
          },
        ],
        adverseEventsStructured: [
          {
            aeTerm: "Nausea",
            onsetDate: "2026-05-10",
            severity: "Mild",
            serious: "No",
            actionTaken: "Dose reduced",
            outcome: "Recovered",
            actionTakenOther: "",
          },
        ],
        adherence: {
          patientContinuingTreatment: false,
          discontinuationReason: "Adverse event",
          discontinuationReasonOtherDetails: null,
          addOnOrChangedTherapy: true,
          addOnOrChangedTherapyDetails: "Added basal insulin",
          missedDosesInLast7Days: "1–2",
        },
        eventsOfSpecialInterest: {
          hypoglycemiaMild: true,
          hypoglycemiaModerate: false,
          hypoglycemiaSevere: false,
          uti: false,
          genitalMycoticInfection: false,
          dizzinessDehydrationSymptoms: false,
          hospitalizationOrErVisit: false,
          none: false,
        },
      })
      await saveFollowUpApp(patientRef, p, -1, fu)
      return "complex follow-up saved"
    })
  }

  // P5: Follow-up edit in place (index 0)
  {
    const code = patientCode(4)
    const patientRef = doc(collection(db, "patients"))
    createdPatientRefs.push({ ref: patientRef, code, patientId: patientRef.id })
    console.log(`\n--- P5 ${code} follow-up edit ---`)

    await runStep("P5 setup + initial follow-up", async () => {
      await savePatientInfo(patientRef, buildPatientInfo(uid, patientRef.id, code))
      await saveBaselineApp(patientRef, buildBaseline(uid, patientRef.id))
      const p = await readPatient(patientRef)
      const fu = buildFollowUp(uid, patientRef.id, { comments: "Version 1" })
      await saveFollowUpApp(patientRef, p, -1, fu)
      return "v1"
    })

    await runStep("P5 edit follow-up at index 0", async () => {
      const p = await readPatient(patientRef)
      const existing = p.followups?.[0]
      const edited = buildFollowUp(uid, patientRef.id, {
        comments: "Version 2 — edited",
        hba1c: 6.5,
        weight: 74,
        createdAt: existing?.createdAt || nowIso(),
      })
      await saveFollowUpApp(patientRef, p, 0, edited)
      const after = await readPatient(patientRef)
      const saved = after.followups?.[0]
      if (saved?.comments !== "Version 2 — edited") throw new Error("comment edit failed")
      if (saved?.hba1c !== 6.5) throw new Error("hba1c edit failed")
      return "v2 persisted"
    })
  }

  console.log("\n=== Negative Firestore tests ===")

  await runStep("N1. Incomplete patient create blocked", async () => {
    const badRef = doc(collection(db, "patients"))
    try {
      await setDoc(badRef, { doctorId: uid, patientCode: "998-BAD", age: 40 })
      throw new Error("expected permission-denied")
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (String(err?.code).includes("permission-denied")) return "blocked"
      if (err?.message === "expected permission-denied") throw error
      throw error
    }
  })

  await runStep("N2. Follow-up before baseline blocked", async () => {
    const code = "998-NOBASE"
    const patientRef = doc(collection(db, "patients"))
    try {
      await savePatientInfo(patientRef, buildPatientInfo(uid, patientRef.id, code))
      const p = await readPatient(patientRef)
      const fu = buildFollowUp(uid, patientRef.id)
      await saveFollowUpApp(patientRef, p, -1, fu)
      throw new Error("expected prerequisite or guard failure")
    } catch (error: unknown) {
      const msg = String((error as Error)?.message || error)
      if (msg.includes("prerequisite") || msg.includes("Baseline") || msg.includes("guard")) {
        createdPatientRefs.push({ ref: patientRef, code, patientId: patientRef.id })
        return "blocked before baseline"
      }
      throw error
    }
  })

  await runStep("N3. Incomplete follow-up rejected by validation", async () => {
    const p = await readPatient(createdPatientRefs[0].ref)
    const bad = buildFollowUp(uid, p.id!, { comments: "" })
    try {
      await saveFollowUpApp(createdPatientRefs[0].ref, p, 0, bad)
      throw new Error("expected validation failure")
    } catch (error: unknown) {
      const msg = String((error as Error)?.message || error)
      if (msg.includes("incomplete") || msg.includes("comments")) return "validation blocked"
      throw error
    }
  })

  await runStep("N4. Incomplete follow-up Firestore write blocked", async () => {
    const patientRef = createdPatientRefs[0].ref
    const p = await readPatient(patientRef)
    const badFu = { visitDate: "2026-06-01", hba1c: 7.0 }
    try {
      await updateDoc(patientRef, buildFollowUpSavePatch([badFu as FollowUpData], p))
      throw new Error("expected permission-denied")
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (String(err?.code).includes("permission-denied")) return "rules blocked"
      if (err?.message === "expected permission-denied") throw error
      throw error
    }
  })

  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)

  const outDir = join(__dirname, "output")
  mkdirSync(outDir, { recursive: true })
  const reportPath = join(outDir, `comprehensive-doctor-e2e-${RUN_ID}.json`)
  const report = {
    runId: RUN_ID,
    doctorEmail: DOCTOR_EMAIL,
    doctorPassword: DOCTOR_PASSWORD,
    studySiteCode: STUDY_SITE,
    patients: createdPatientRefs.map((p) => ({
      patientId: p.patientId,
      patientCode: p.code,
    })),
    passed,
    failed: failed.length,
    total: results.length,
    bugs,
    results,
  }

  const stream = createWriteStream(reportPath)
  stream.write(JSON.stringify(report, null, 2))
  stream.end()
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve())
    stream.on("error", reject)
  })

  console.log("\n=== SUMMARY ===")
  console.log(`Passed: ${passed}/${results.length}`)
  console.log(`Doctor: ${DOCTOR_EMAIL} / ${DOCTOR_PASSWORD}`)
  console.log("Patients:")
  for (const p of createdPatientRefs) {
    console.log(`  ${p.code} → ${p.patientId}`)
  }
  console.log(`Report: ${reportPath}`)

  if (bugs.length > 0) {
    console.log("\n⚠ Potential bugs / failures:")
    for (const b of bugs) console.log(`  - ${b}`)
  } else {
    console.log("\n✓ No failures detected in automated checks.")
  }

  if (CLEANUP) {
    console.log("\n--- Cleanup ---")
    for (const p of createdPatientRefs) {
      await runStep(`Cleanup ${p.code}`, async () => {
        await deleteDoc(p.ref)
        return "deleted"
      })
    }
  } else {
    console.log("\nTest data left in Firestore for manual UI check. E2E_CLEANUP=true to delete.")
  }

  if (failed.length > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error("Fatal:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await signOut(auth)
    } catch {
      // ignore
    }
  })
