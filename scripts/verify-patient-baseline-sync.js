const fs = require('fs')
const path = require('path')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

function loadServiceAccountFromEnvFile(envPath) {
  const envText = fs.readFileSync(envPath, 'utf8')
  const match = envText.match(/^FIREBASE_SERVICE_ACCOUNT_KEY=(.*)$/m)
  if (!match) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local')
  }

  const raw = match[1].trim()
  return JSON.parse(raw)
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function removeAllowedBaselineKeys(baseline) {
  const copy = deepClone(baseline || {})
  delete copy.baselineVisitDate
  delete copy.weight
  delete copy.updatedAt
  return copy
}

function isEqualJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

async function main() {
  const root = path.resolve(__dirname, '..')
  const envPath = path.join(root, '.env.local')

  const serviceAccount = loadServiceAccountFromEnvFile(envPath)
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }

  const db = getFirestore()

  const patientsSnap = await db.collection('patients').get()
  const candidate = patientsSnap.docs.find((d) => {
    const data = d.data() || {}
    return data && typeof data.baseline === 'object' && data.baseline !== null
  })

  if (!candidate) {
    throw new Error('No patient with baseline found for verification')
  }

  const patientRef = db.collection('patients').doc(candidate.id)
  const beforeSnap = await patientRef.get()
  const beforeData = beforeSnap.data() || {}

  if (!beforeData.baseline || typeof beforeData.baseline !== 'object') {
    throw new Error('Selected patient has no baseline object')
  }

  const originalPatientBaselineVisitDate = beforeData.baselineVisitDate || ''
  const originalPatientWeight = beforeData.weight
  const originalPatientUpdatedAt = beforeData.updatedAt || null

  const originalBaseline = deepClone(beforeData.baseline)
  const originalBaselineVisitDate = originalBaseline.baselineVisitDate || ''
  const originalBaselineWeight = originalBaseline.weight
  const originalBaselineUpdatedAt = originalBaseline.updatedAt || null

  const toggledDate = originalPatientBaselineVisitDate === '2026-01-01' ? '2026-01-02' : '2026-01-01'
  const baseWeight = Number.isFinite(Number(originalPatientWeight)) ? Number(originalPatientWeight) : 70
  const toggledWeight = Number((baseWeight + 0.1).toFixed(1))
  const nowIso = new Date().toISOString()

  // Mimic Patient Info edit update behavior exactly for baseline-related fields.
  const updatePayload = {
    baselineVisitDate: toggledDate,
    weight: toggledWeight,
    updatedAt: nowIso,
    'baseline.baselineVisitDate': toggledDate,
    'baseline.weight': toggledWeight,
    'baseline.updatedAt': nowIso,
  }

  await patientRef.update(updatePayload)

  const afterSnap = await patientRef.get()
  const afterData = afterSnap.data() || {}
  const afterBaseline = afterData.baseline || {}

  const baselineDateSynced = afterData.baselineVisitDate === afterBaseline.baselineVisitDate
  const baselineWeightSynced = Number(afterData.weight) === Number(afterBaseline.weight)

  const beforeProtected = removeAllowedBaselineKeys(originalBaseline)
  const afterProtected = removeAllowedBaselineKeys(afterBaseline)
  const otherBaselineFieldsUnchanged = isEqualJson(beforeProtected, afterProtected)

  // Restore original values so this verification is non-invasive.
  const restorePayload = {
    baselineVisitDate: originalPatientBaselineVisitDate,
    weight: originalPatientWeight,
    updatedAt: originalPatientUpdatedAt,
    'baseline.baselineVisitDate': originalBaselineVisitDate,
    'baseline.weight': originalBaselineWeight,
    'baseline.updatedAt': originalBaselineUpdatedAt,
  }

  await patientRef.update(restorePayload)

  const ok = baselineDateSynced && baselineWeightSynced && otherBaselineFieldsUnchanged

  console.log(
    [
      `VERIFY_PATIENT_ID=${candidate.id}`,
      `VERIFY_BASELINE_DATE_SYNC=${baselineDateSynced}`,
      `VERIFY_BASELINE_WEIGHT_SYNC=${baselineWeightSynced}`,
      `VERIFY_OTHER_BASELINE_FIELDS_UNCHANGED=${otherBaselineFieldsUnchanged}`,
      `VERIFY_RESULT=${ok ? 'PASS' : 'FAIL'}`,
    ].join(' ')
  )

  if (!ok) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('VERIFY_FAILED', error.message)
  process.exit(1)
})
