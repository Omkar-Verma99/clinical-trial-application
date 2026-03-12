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

function toPipeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).join('|')
  }
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

function escapeCsv(value) {
  const stringValue = toPipeValue(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function analyzePatientData(patients) {
  let maxFollowups = 0
  let maxAdverseEventsPerFollowup = 0

  for (const patient of patients) {
    const followups = Array.isArray(patient.followups) ? patient.followups : []
    maxFollowups = Math.max(maxFollowups, followups.length)

    for (const followup of followups) {
      const adverseEvents = followup.adverseEvents || followup.adverseEventsStructured || []
      maxAdverseEventsPerFollowup = Math.max(maxAdverseEventsPerFollowup, adverseEvents.length)
    }
  }

  return {
    maxFollowups: Math.max(maxFollowups, 1),
    maxAdverseEventsPerFollowup,
  }
}

function generateDynamicColumns(maxFollowups, maxAdverseEventsPerFollowup) {
  const baseColumns = [
    'patient_code',
    'doctor_code',
    'doctor_name',
    'center_id',
    'patient_added_date',
    'baseline_date',
    'baseline_ckd_stage',
    'baseline_bp_systolic',
    'baseline_bp_diastolic',
    'baseline_weight_kg',
    'baseline_hba1c',
    'baseline_comorbidities',
  ]

  const followupColumns = []
  for (let i = 1; i <= maxFollowups; i += 1) {
    followupColumns.push(`followup_${i}_date`)
    followupColumns.push(`followup_${i}_bp_systolic`)
    followupColumns.push(`followup_${i}_bp_diastolic`)
    followupColumns.push(`followup_${i}_weight_kg`)
    followupColumns.push(`followup_${i}_hba1c`)
    followupColumns.push(`followup_${i}_comorbidities`)

    for (let j = 1; j <= maxAdverseEventsPerFollowup; j += 1) {
      followupColumns.push(`followup_${i}_adverse_event_${j}_type`)
      followupColumns.push(`followup_${i}_adverse_event_${j}_severity`)
    }
  }

  const comparisonColumns = [
    'comparison_delta_weight_kg',
    'comparison_delta_hba1c',
    'comparison_delta_bp_systolic',
    'comparison_delta_bp_diastolic',
    'comparison_summary',
  ]

  return [...baseColumns, ...followupColumns, ...comparisonColumns]
}

function collapseArrayValue(value) {
  if (Array.isArray(value)) {
    return value.filter((v) => v && v !== false).join(', ')
  }
  if (typeof value === 'object' && value !== null) {
    const selected = Object.entries(value)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
    return selected.join(', ')
  }
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return value ? String(value) : ''
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

function buildDynamicPatientRow(patient, baseline, followups, doctorName, maxFollowups, maxAdverseEventsPerFollowup) {
  const row = {
    patient_code: patient.patientCode,
    doctor_code: patient.doctorId,
    doctor_name: doctorName || patient.investigatorName || '',
    center_id: patient.studySiteCode,
    patient_added_date: formatDate(patient.createdAt),
    baseline_date: formatDate(baseline && baseline.baselineVisitDate),
    baseline_ckd_stage: (patient.comorbidities && patient.comorbidities.ckdEgfrCategory) || '',
    baseline_bp_systolic: baseline ? (baseline.bloodPressureSystolic ?? '') : '',
    baseline_bp_diastolic: baseline ? (baseline.bloodPressureDiastolic ?? '') : '',
    baseline_weight_kg: baseline ? (baseline.weight ?? '') : '',
    baseline_hba1c: baseline ? (baseline.hba1c ?? '') : '',
    baseline_comorbidities: collapseArrayValue(patient.comorbidities),
  }

  for (let i = 0; i < maxFollowups; i += 1) {
    const followup = followups[i]
    const followupNum = i + 1

    if (followup) {
      row[`followup_${followupNum}_date`] = formatDate(followup.visitDate)
      row[`followup_${followupNum}_bp_systolic`] = followup.bloodPressureSystolic || ''
      row[`followup_${followupNum}_bp_diastolic`] = followup.bloodPressureDiastolic || ''
      row[`followup_${followupNum}_weight_kg`] = followup.weight || ''
      row[`followup_${followupNum}_hba1c`] = followup.hba1c || ''
      row[`followup_${followupNum}_comorbidities`] = collapseArrayValue(followup.comorbidities)

      const adverseEvents = followup.adverseEvents || followup.adverseEventsStructured || []
      for (let j = 0; j < maxAdverseEventsPerFollowup; j += 1) {
        const ae = adverseEvents[j]
        const aeNum = j + 1
        row[`followup_${followupNum}_adverse_event_${aeNum}_type`] = ae ? (ae.aeTerm || '') : ''
        row[`followup_${followupNum}_adverse_event_${aeNum}_severity`] = ae ? (ae.severity || '') : ''
      }
    } else {
      row[`followup_${followupNum}_date`] = ''
      row[`followup_${followupNum}_bp_systolic`] = ''
      row[`followup_${followupNum}_bp_diastolic`] = ''
      row[`followup_${followupNum}_weight_kg`] = ''
      row[`followup_${followupNum}_hba1c`] = ''
      row[`followup_${followupNum}_comorbidities`] = ''
      for (let j = 0; j < maxAdverseEventsPerFollowup; j += 1) {
        const aeNum = j + 1
        row[`followup_${followupNum}_adverse_event_${aeNum}_type`] = ''
        row[`followup_${followupNum}_adverse_event_${aeNum}_severity`] = ''
      }
    }
  }

  if (baseline && followups.length > 0) {
    const lastFollowup = followups[followups.length - 1]
    const weightDelta = (lastFollowup.weight && baseline.weight) ? (lastFollowup.weight - baseline.weight) : null
    const hba1cDelta = (lastFollowup.hba1c && baseline.hba1c) ? (lastFollowup.hba1c - baseline.hba1c) : null
    const bpSystolicDelta = (lastFollowup.bloodPressureSystolic && baseline.bloodPressureSystolic)
      ? (lastFollowup.bloodPressureSystolic - baseline.bloodPressureSystolic)
      : null
    const bpDiastolicDelta = (lastFollowup.bloodPressureDiastolic && baseline.bloodPressureDiastolic)
      ? (lastFollowup.bloodPressureDiastolic - baseline.bloodPressureDiastolic)
      : null

    row.comparison_delta_weight_kg = weightDelta !== null ? weightDelta : ''
    row.comparison_delta_hba1c = hba1cDelta !== null ? hba1cDelta : ''
    row.comparison_delta_bp_systolic = bpSystolicDelta !== null ? bpSystolicDelta : ''
    row.comparison_delta_bp_diastolic = bpDiastolicDelta !== null ? bpDiastolicDelta : ''

    let summary = 'No Change'
    if (hba1cDelta && hba1cDelta < 0) summary = 'Improved'
    else if (hba1cDelta && hba1cDelta > 0) summary = 'Declined'
    row.comparison_summary = summary
  } else {
    row.comparison_delta_weight_kg = ''
    row.comparison_delta_hba1c = ''
    row.comparison_delta_bp_systolic = ''
    row.comparison_delta_bp_diastolic = ''
    row.comparison_summary = ''
  }

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
  const snap = await db.collection('patients').get()

  // Pull all patient records across all doctors.
  const allPatients = snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))

  // Resolve doctor names once and reuse.
  const doctorIds = Array.from(new Set(allPatients.map((p) => p.doctorId).filter(Boolean)))
  const doctorNameMap = new Map()
  for (const doctorId of doctorIds) {
    try {
      const doctorSnap = await db.collection('doctors').doc(doctorId).get()
      if (doctorSnap.exists) {
        const doctorData = doctorSnap.data() || {}
        doctorNameMap.set(doctorId, doctorData.name || '')
      }
    } catch (_) {
      // Ignore missing/inaccessible doctor doc and fallback to investigatorName.
    }
  }

  const { maxFollowups, maxAdverseEventsPerFollowup } = analyzePatientData(allPatients)
  const columns = generateDynamicColumns(maxFollowups, maxAdverseEventsPerFollowup)

  const rows = allPatients.map((patient) => {
    const baseline = patient.baseline || null
    const followups = Array.isArray(patient.followups) ? patient.followups : []
    const doctorName = doctorNameMap.get(patient.doctorId) || ''
    return buildDynamicPatientRow(
      patient,
      baseline,
      followups,
      doctorName,
      maxFollowups,
      maxAdverseEventsPerFollowup
    )
  })

  const header = columns.map((col) => `"${col}"`).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCsv(row[c])).join(',')).join('\n')
  const csv = `${header}\n${body}`

  const outputName = `ALL_DOCTORS_EXPORT_DYNAMIC_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.csv`
  const outputPath = path.join(root, outputName)
  fs.writeFileSync(outputPath, csv, 'utf8')

  console.log(`EXPORT_OK file=${outputName} patients=${allPatients.length} rows=${rows.length} max_followups=${maxFollowups} max_ae_per_followup=${maxAdverseEventsPerFollowup}`)
}

main().catch((error) => {
  console.error('EXPORT_FAILED', error.message)
  process.exit(1)
})
