/**
 * One-off patient readiness check by patientCode.
 * Usage: node scripts/check-patient-readiness.mjs 001-ABK
 */

import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
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

const code = process.argv[2] || "001-ABK"

async function main() {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app")
  const { getFirestore } = await import("firebase-admin/firestore")

  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY not set")
    const sa = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"))
    initializeApp({ credential: cert(sa) })
  }

  const db = getFirestore()
  const snap = await db.collection("patients").where("patientCode", "==", code).limit(5).get()

  if (snap.empty) {
    console.log(`No patient found for patientCode=${code}`)
    process.exit(0)
  }

  // Dynamic import TS via tsx register - use compiled approach: spawn tsx on a ts file
  // For mjs we duplicate minimal checks inline using same logic as audit script
  const {
    getBaselineReadinessIssues,
    getPatientInfoReadinessIssues,
    isBaselineReadyStrict,
    isReadyForFollowUp,
  } = await import("../lib/patient-readiness.ts")
  const { getFollowUpPrerequisiteIssues } = await import("../lib/patient-prerequisites.ts")

  for (const doc of snap.docs) {
    const p = { id: doc.id, ...doc.data() }
    console.log(`\n=== ${p.patientCode} (${doc.id}) ===`)
    console.log("age:", p.age, "gender:", p.gender, "site:", p.studySiteCode)
    console.log("patientInfoComplete:", p.patientInfoComplete)
    console.log("baselineComplete:", p.baselineComplete)
    console.log("has baseline:", !!p.baseline)
    console.log("followups:", Array.isArray(p.followups) ? p.followups.length : 0)
    console.log("\nButton would enable:", isBaselineReadyStrict(p) && isReadyForFollowUp(p))
    console.log("isBaselineReadyStrict:", isBaselineReadyStrict(p))
    console.log("isReadyForFollowUp:", isReadyForFollowUp(p))
    console.log("\nPatient info issues:", getPatientInfoReadinessIssues(p))
    console.log("Baseline issues:", getBaselineReadinessIssues(p))
    console.log("All prerequisite issues:", getFollowUpPrerequisiteIssues(p))
    if (p.baseline) {
      const b = p.baseline
      console.log("\nBaseline snapshot:")
      console.log("  hba1c:", b.hba1c, "fpg:", b.fpg, "urinalysis:", b.urinalysis)
      console.log("  heartRate:", b.heartRate)
      console.log("  dosePrescribed:", b.dosePrescribed ? "set" : "MISSING")
      console.log("  treatmentInitiationDate:", b.treatmentInitiationDate)
      console.log("  baselineVisitDate (nested):", b.baselineVisitDate)
      console.log("  baselineVisitDate (top):", p.baselineVisitDate)
      console.log("  counseling:", JSON.stringify(b.counseling))
      console.log("  counselingProvided:", b.counselingProvided)
    }
    console.log("\ncomorbidities:", JSON.stringify(p.comorbidities, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
