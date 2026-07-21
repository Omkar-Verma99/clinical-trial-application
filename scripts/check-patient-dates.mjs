import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const code = process.argv[2] || "016-BHK"

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

const {
  validateBaselineVisitDate,
  validateTreatmentInitiationDate,
  normalizeStudyDate,
  resolvePatientBaselineVisitDate,
} = await import("../lib/study-dates.ts")

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
  const snap = await db.collection("patients").where("patientCode", "==", code).limit(3).get()

  if (snap.empty) {
    console.log(`No patient found for patientCode=${code}`)
    return
  }

  for (const doc of snap.docs) {
    const p = { id: doc.id, ...doc.data() }
    const baselineVisitDate = resolvePatientBaselineVisitDate(p)
    const nestedBaselineVisit = normalizeStudyDate(p.baseline?.baselineVisitDate)
    const topBaselineVisit = normalizeStudyDate(p.baselineVisitDate)
    const treatmentDate = normalizeStudyDate(p.baseline?.treatmentInitiationDate)

    console.log(`\n=== ${p.patientCode} (${doc.id}) ===`)
    console.log("top baselineVisitDate:", p.baselineVisitDate, "->", topBaselineVisit)
    console.log("nested baseline.baselineVisitDate:", p.baseline?.baselineVisitDate, "->", nestedBaselineVisit)
    console.log("resolved baselineVisitDate:", baselineVisitDate)
    console.log("treatmentInitiationDate:", p.baseline?.treatmentInitiationDate, "->", treatmentDate)
    console.log("baselineComplete:", p.baselineComplete)
    console.log("validateBaselineVisitDate:", validateBaselineVisitDate(baselineVisitDate, treatmentDate))
    console.log(
      "validateTreatmentInitiationDate:",
      validateTreatmentInitiationDate(treatmentDate, baselineVisitDate)
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
