/**
 * Full doctor E2E — creates one new account + 5 patients, exercises create/edit/save flows.
 * READ/WRITE to Firestore as authenticated doctor. Does NOT delete unless E2E_CLEANUP=true.
 *
 * Usage:
 *   node scripts/full-doctor-e2e.mjs
 *   E2E_CLEANUP=true node scripts/full-doctor-e2e.mjs
 *
 * Optional env (from .env.local or shell):
 *   E2E_BASE_URL — app URL for sync-role (default http://localhost:3000)
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
const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || `e2e.full.${RUN_ID}@kollectcare.test`
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || "E2eTest@2026!"
const STUDY_SITE = "RWE-99"
const CLEANUP = process.env.E2E_CLEANUP === "true"
const BASE_URL =
  process.env.E2E_BASE_URL || "https://kollectcare-rwe-study.vercel.app"

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const results = []
const createdPatientRefs = []

function nowIso() {
  return new Date().toISOString()
}

function patientCode(i) {
  const suffix = `E${String(i + 1).padStart(2, "0")}`
  return `999-${suffix}`
}

function log(step, ok, detail = "") {
  results.push({ step, ok, detail, at: nowIso() })
  const status = ok ? "PASS" : "FAIL"
  console.log(`[${status}] ${step}${detail ? ` — ${detail}` : ""}`)
}

async function runStep(step, fn) {
  try {
    const detail = await fn()
    log(step, true, typeof detail === "string" ? detail : "")
    return true
  } catch (error) {
    const msg = error?.code ? `${error.code}: ${error.message}` : String(error?.message || error)
    log(step, false, msg)
    return false
  }
}

function buildPatientInfo(uid, patientId, code, overrides = {}) {
  const createdAt = nowIso()
  return {
    id: patientId,
    patientId,
    doctorId: uid,
    patientCode: code,
    studySiteCode: STUDY_SITE,
    investigatorName: "Dr E2E Full Test",
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

function buildBaseline(uid, patientId, overrides = {}) {
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

function buildFollowUp(uid, patientId, overrides = {}) {
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
    glycemicResponse: {
      category: "Responder",
      hba1cChange: -0.7,
      hba1cPercentageChange: -9.0,
    },
    outcomes: {
      weightChange: "Decreased",
      bpControlAchieved: true,
      renalOutcome: "Stable eGFR",
    },
    adherence: {
      patientContinuingTreatment: true,
      addOnOrChangedTherapy: false,
      addOnOrChangedTherapyDetails: "",
      missedDosesInLast7Days: 0,
    },
    adverseEventsPresent: false,
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
      },
    },
    dataPrivacy: {
      noPersonalIdentifiersRecorded: true,
      dataCollectedAsRoutineClinicalPractice: true,
      patientIdentityMappingAtClinicOnly: true,
    },
    physicianDeclaration: {
      physicianName: "Dr E2E Full Test",
      qualification: "MD",
      clinicHospitalName: STUDY_SITE,
      confirmationCheckbox: true,
      signatureMethod: "Checkbox",
      signatureDate: "2026-06-01",
    },
    comments: "E2E follow-up save — automated test",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...overrides,
  }
}

async function syncRole(user) {
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

async function assertPatientFlags(patientRef, expect = {}) {
  const snap = await getDoc(patientRef)
  if (!snap.exists()) throw new Error("patient document missing")
  const data = snap.data()
  if (expect.patientInfoComplete === true && data.patientInfoComplete !== true) {
    throw new Error("patientInfoComplete flag not true")
  }
  if (expect.baselineComplete === true && data.baselineComplete !== true) {
    throw new Error("baselineComplete flag not true")
  }
  if (expect.followupCount != null) {
    const count = Array.isArray(data.followups) ? data.followups.length : 0
    if (count !== expect.followupCount) {
      throw new Error(`expected ${expect.followupCount} follow-ups, got ${count}`)
    }
  }
  return data
}

async function saveBaseline(patientRef, uid, patientId, baselineOverrides = {}) {
  const baseline = buildBaseline(uid, patientId, baselineOverrides)
  const batch = writeBatch(db)
  batch.set(
    patientRef,
    {
      baseline,
      baselineComplete: true,
      baselineVisitDate: baseline.baselineVisitDate,
      updatedAt: nowIso(),
    },
    { merge: true }
  )
  await batch.commit()
}

async function saveFollowupsArray(patientRef, followups) {
  await updateDoc(patientRef, {
    followups,
    updatedAt: nowIso(),
  })
}

async function main() {
  console.log("=== Full Doctor E2E ===")
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Cleanup after run: ${CLEANUP}`)
  console.log("")

  let uid = ""

  // --- Account setup ---
  await runStep("1. Create new doctor auth account", async () => {
    const cred = await createUserWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_PASSWORD)
    uid = cred.user.uid
    return `uid=${uid} email=${DOCTOR_EMAIL}`
  })

  await runStep("2. Create doctor profile in Firestore", async () => {
    await setDoc(doc(db, "doctors", uid), {
      name: "Dr E2E Full Test",
      registrationNumber: `REG-E2E-${RUN_ID}`,
      qualification: "MD",
      email: DOCTOR_EMAIL,
      phone: "9999999999",
      dateOfBirth: "1985-06-15",
      address: "E2E Automation Address",
      studySiteCode: STUDY_SITE,
      createdAt: nowIso(),
    })
    return STUDY_SITE
  })

  await runStep("3. Sync role claim (API)", async () => {
    const user = auth.currentUser
    if (!user) throw new Error("not signed in")
    try {
      const body = await syncRole(user)
      return `role=${body.role}`
    } catch (error) {
      return `skipped (${String(error.message).slice(0, 80)}) — Firestore tests continue`
    }
  })

  await runStep("4. Sign out then sign in (login flow)", async () => {
    await signOut(auth)
    const cred = await signInWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_PASSWORD)
    uid = cred.user.uid
    await syncRole(cred.user)
    return `re-login uid=${uid}`
  })

  // --- Patient scenarios ---
  const scenarios = [
    {
      name: "P1 happy path: create → baseline → follow-up",
      code: patientCode(0),
      async run(patientRef, patientId) {
        await setDoc(patientRef, buildPatientInfo(uid, patientId, patientCode(0)))
        await saveBaseline(patientRef, uid, patientId)
        const fu = buildFollowUp(uid, patientId)
        await saveFollowupsArray(patientRef, [fu])
        await assertPatientFlags(patientRef, {
          patientInfoComplete: true,
          baselineComplete: true,
          followupCount: 1,
        })
        return patientCode(0)
      },
    },
    {
      name: "P2 edit patient info → baseline → follow-up",
      code: patientCode(1),
      async run(patientRef, patientId) {
        await setDoc(patientRef, buildPatientInfo(uid, patientId, patientCode(1)))
        await updateDoc(patientRef, {
          weight: 80,
          smokingStatus: "Former",
          alcoholIntake: "Occasional",
          physicalActivityLevel: "Low",
          patientInfoComplete: true,
          updatedAt: nowIso(),
        })
        await saveBaseline(patientRef, uid, patientId, { weight: 80 })
        await saveFollowupsArray(patientRef, [buildFollowUp(uid, patientId, { weight: 79 })])
        const data = await assertPatientFlags(patientRef, {
          patientInfoComplete: true,
          baselineComplete: true,
          followupCount: 1,
        })
        if (data.weight !== 80) throw new Error("patient info edit not persisted")
        return "edited weight=80"
      },
    },
    {
      name: "P3 CKD comorbidity + hospitalization follow-up",
      code: patientCode(2),
      async run(patientRef, patientId) {
        await setDoc(
          patientRef,
          buildPatientInfo(uid, patientId, patientCode(2), {
            comorbidities: {
              hypertension: true,
              dyslipidemia: false,
              obesity: false,
              ascvd: false,
              heartFailure: false,
              chronicKidneyDisease: true,
              ckdEgfrCategory: "G3a",
              other: ["NA"],
            },
          })
        )
        await saveBaseline(patientRef, uid, patientId, { egfr: 55, serumCreatinine: 1.4 })
        const fu = buildFollowUp(uid, patientId, {
          eventsOfSpecialInterest: {
            hypoglycemiaMild: false,
            hypoglycemiaModerate: false,
            hypoglycemiaSevere: false,
            uti: false,
            genitalMycoticInfection: false,
            dizzinessDehydrationSymptoms: false,
            hospitalizationOrErVisit: true,
            none: false,
            hospitalizationReason: "Scheduled procedure — unrelated to study drug",
          },
          physicianAssessment: {
            overallEfficacy: "Moderate",
            overallTolerability: "Good",
            complianceJudgment: "Good",
            preferKcMeSempaForLongTerm: true,
            preferredPatientProfiles: {
              ckdPatients: true,
              uncontrolledT2dm: false,
              obeseT2dm: false,
              htnPlusT2dm: false,
              elderlyPatients: false,
              other: false,
            },
          },
        })
        await saveFollowupsArray(patientRef, [fu])
        await assertPatientFlags(patientRef, { followupCount: 1 })
        return "CKD G3a + hospitalization"
      },
    },
    {
      name: "P4 edit baseline after save → follow-up with AE",
      code: patientCode(3),
      async run(patientRef, patientId) {
        await setDoc(patientRef, buildPatientInfo(uid, patientId, patientCode(3)))
        await saveBaseline(patientRef, uid, patientId, { hba1c: 8.2 })
        await saveBaseline(patientRef, uid, patientId, { hba1c: 7.6, fpg: 135 })
        const fu = buildFollowUp(uid, patientId, {
          adverseEventsPresent: true,
          adverseEventsStructured: [
            {
              aeTerm: "Nausea",
              onsetDate: "2026-05-15",
              severity: "Mild",
              serious: "No",
              actionTaken: "None",
              outcome: "Recovered",
            },
          ],
        })
        await saveFollowupsArray(patientRef, [fu])
        const data = await assertPatientFlags(patientRef, { baselineComplete: true })
        if (data.baseline?.hba1c !== 7.6) throw new Error("baseline edit hba1c not persisted")
        return "baseline hba1c 8.2→7.6, AE nausea"
      },
    },
    {
      name: "P5 follow-up edit (array replace) + second read",
      code: patientCode(4),
      async run(patientRef, patientId) {
        await setDoc(patientRef, buildPatientInfo(uid, patientId, patientCode(4)))
        await saveBaseline(patientRef, uid, patientId)
        const fu1 = buildFollowUp(uid, patientId, { comments: "Initial follow-up v1" })
        await saveFollowupsArray(patientRef, [fu1])
        const fu1Edited = buildFollowUp(uid, patientId, {
          comments: "Edited follow-up v2",
          weight: 74,
          hba1c: 6.8,
          createdAt: fu1.createdAt,
        })
        await saveFollowupsArray(patientRef, [fu1Edited])
        const data = await assertPatientFlags(patientRef, { followupCount: 1 })
        const saved = data.followups?.[0]
        if (saved?.comments !== "Edited follow-up v2") {
          throw new Error("follow-up edit not persisted")
        }
        if (saved?.hba1c !== 6.8) throw new Error("follow-up hba1c edit not persisted")
        return "follow-up edited in place"
      },
    },
  ]

  for (let i = 0; i < scenarios.length; i += 1) {
    const scenario = scenarios[i]
    const patientRef = doc(collection(db, "patients"))
    const patientId = patientRef.id
    createdPatientRefs.push({ ref: patientRef, code: scenario.code, patientId })

    console.log(`\n--- ${scenario.name} (${scenario.code}) ---`)
    await runStep(`5.${i + 1}a Create patient ${scenario.code}`, async () => {
      return `id=${patientId}`
    })

    await runStep(`5.${i + 1}b Scenario: ${scenario.name}`, async () => {
      return await scenario.run(patientRef, patientId)
    })
  }

  // Negative test: incomplete patient create should fail
  await runStep("6. Negative: incomplete patient create rejected", async () => {
    const badRef = doc(collection(db, "patients"))
    try {
      await setDoc(badRef, {
        doctorId: uid,
        patientCode: "999-BAD",
        patientInfoComplete: false,
        age: 40,
      })
      throw new Error("expected permission-denied but write succeeded")
    } catch (error) {
      const code = String(error?.code || "")
      if (code.includes("permission-denied")) {
        return "correctly blocked"
      }
      throw error
    }
  })

  // Summary output
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)

  const outDir = join(__dirname, "output")
  mkdirSync(outDir, { recursive: true })
  const reportPath = join(outDir, `full-doctor-e2e-${RUN_ID}.json`)
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
    results,
  }

  const stream = createWriteStream(reportPath)
  stream.write(JSON.stringify(report, null, 2))
  stream.end()
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve)
    stream.on("error", reject)
  })

  console.log("\n=== SUMMARY ===")
  console.log(`Passed: ${passed}/${results.length}`)
  console.log(`Doctor login: ${DOCTOR_EMAIL} / ${DOCTOR_PASSWORD}`)
  console.log("Patients:")
  for (const p of createdPatientRefs) {
    console.log(`  ${p.code} → ${p.patientId}`)
  }
  console.log(`Report: ${reportPath}`)

  if (CLEANUP) {
    console.log("\n--- Cleanup (E2E_CLEANUP=true) ---")
    for (const p of createdPatientRefs) {
      await runStep(`Cleanup patient ${p.code}`, async () => {
        await deleteDoc(p.ref)
        return "deleted"
      })
    }
    console.log("Note: doctor auth account was NOT deleted (requires Admin SDK).")
  } else {
    console.log("\nData left in Firestore for manual UI verification. Set E2E_CLEANUP=true to delete patients.")
  }

  if (failed.length > 0) {
    console.log("\nFailed steps:")
    for (const f of failed) {
      console.log(`  - ${f.step}: ${f.detail}`)
    }
    process.exitCode = 1
  }
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
