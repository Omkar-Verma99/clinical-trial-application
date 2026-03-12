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
  return JSON.parse(match[1].trim())
}

function toCsvValue(value) {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join('|')
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function escapeCsv(value) {
  const str = toCsvValue(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function flattenAny(row, prefix, value) {
  if (value === undefined || value === null) {
    row[prefix] = ''
    return
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      row[prefix] = ''
      return
    }

    const allPrimitive = value.every((item) => !isPlainObject(item) && !Array.isArray(item))
    if (allPrimitive) {
      row[prefix] = value.map((item) => toCsvValue(item)).join('|')
      return
    }

    value.forEach((item, index) => {
      flattenAny(row, `${prefix}_${index + 1}`, item)
    })
    return
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      row[prefix] = ''
      return
    }

    entries.forEach(([key, nestedValue]) => {
      const childPrefix = prefix ? `${prefix}_${key}` : key
      flattenAny(row, childPrefix, nestedValue)
    })
    return
  }

  row[prefix] = value
}

function buildPatientRow(patient, doctorName) {
  const row = {}

  row.patient_id = patient.id || ''
  row.doctor_name = doctorName || patient.investigatorName || ''

  const patientCore = { ...patient }
  const baseline = patientCore.baseline || null
  const followupsRaw = Array.isArray(patientCore.followups) ? patientCore.followups : []

  delete patientCore.baseline
  delete patientCore.followups

  flattenAny(row, 'patient', patientCore)

  if (baseline) {
    flattenAny(row, 'baseline', baseline)
  }

  followupsRaw.forEach((followup, followupIndex) => {
    const followupClone = { ...followup }
    if (!Array.isArray(followupClone.adverseEvents) && Array.isArray(followupClone.adverseEventsStructured)) {
      followupClone.adverseEvents = followupClone.adverseEventsStructured
    }
    delete followupClone.adverseEventsStructured

    flattenAny(row, `followup_${followupIndex + 1}`, followupClone)
  })

  row.followup_count = followupsRaw.length
  return row
}

async function main() {
  const root = path.resolve(__dirname, '..')
  const envPath = path.join(root, '.env.local')

  const serviceAccount = loadServiceAccountFromEnvFile(envPath)
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }

  const db = getFirestore()
  const patientSnap = await db.collection('patients').get()
  const patients = patientSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))

  const doctorIds = Array.from(new Set(patients.map((p) => p.doctorId).filter(Boolean)))
  const doctorNameMap = new Map()
  for (const doctorId of doctorIds) {
    try {
      const doctorSnap = await db.collection('doctors').doc(doctorId).get()
      if (doctorSnap.exists) {
        const doctorData = doctorSnap.data() || {}
        doctorNameMap.set(doctorId, doctorData.name || '')
      }
    } catch (_) {
      // Keep fallback behavior.
    }
  }

  const rows = patients.map((patient) => {
    const doctorName = doctorNameMap.get(patient.doctorId) || ''
    return buildPatientRow(patient, doctorName)
  })

  const allColumns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key))
      return set
    }, new Set())
  ).sort()

  const header = allColumns.map((column) => `"${column}"`).join(',')
  const body = rows
    .map((row) => allColumns.map((column) => escapeCsv(row[column])).join(','))
    .join('\n')

  const outputName = `ALL_DOCTORS_DYNAMIC_ALL_FIELDS_PREVIEW_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.csv`
  const outputPath = path.join(root, outputName)

  fs.writeFileSync(outputPath, `${header}\n${body}`, 'utf8')

  console.log(`EXPORT_OK file=${outputName} patients=${patients.length} rows=${rows.length} columns=${allColumns.length}`)
}

main().catch((error) => {
  console.error('EXPORT_FAILED', error.message)
  process.exit(1)
})
