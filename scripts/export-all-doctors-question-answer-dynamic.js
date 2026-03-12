const fs = require('fs')
const path = require('path')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

function loadServiceAccountFromEnvFile(envPath) {
  const envText = fs.readFileSync(envPath, 'utf8')
  const match = envText.match(/^FIREBASE_SERVICE_ACCOUNT_KEY=(.*)$/m)
  if (!match) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local')
  return JSON.parse(match[1].trim())
}

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function fmtBool(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return ''
}

function fmtDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().split('T')[0]
}

function prettifyKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function joinSelected(obj, labels = {}, excludeKeys = []) {
  if (!obj || typeof obj !== 'object') return ''
  const selected = []

  Object.entries(obj).forEach(([k, v]) => {
    if (excludeKeys.includes(k)) return
    if (v === true) selected.push(labels[k] || prettifyKey(k))
  })

  return selected.join(', ')
}

function joinOther(value) {
  if (!value) return ''
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return String(value)
}

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function delta(a, b) {
  const n1 = toNumberOrNull(a)
  const n2 = toNumberOrNull(b)
  if (n1 === null || n2 === null) return ''
  return (n1 - n2).toFixed(2)
}

function getMaxCounts(patients) {
  let maxFollowups = 0
  let maxAes = 0

  patients.forEach((patient) => {
    const followups = Array.isArray(patient.followups) ? patient.followups : []
    maxFollowups = Math.max(maxFollowups, followups.length)

    followups.forEach((fu) => {
      const aes = Array.isArray(fu.adverseEvents)
        ? fu.adverseEvents
        : Array.isArray(fu.adverseEventsStructured)
          ? fu.adverseEventsStructured
          : []
      maxAes = Math.max(maxAes, aes.length)
    })
  })

  return { maxFollowups: Math.max(maxFollowups, 1), maxAes }
}

function buildColumns(maxFollowups, maxAes) {
  const columns = [
    'Patient Code',
    'Study Site Code',
    'Doctor Name',

    // Patient Add Form
    'Baseline Visit Date (Patient Form)',
    'Age (Years)',
    'Gender',
    'Height (cm)',
    'Weight (kg) - Patient Form',
    'BMI',
    'Smoking Status',
    'Alcohol Intake',
    'Physical Activity Level',
    'Duration of Type 2 Diabetes (Years)',
    'Baseline Glycemic Severity',
    'Diabetes Complications (Selected)',
    'Comorbidities (Selected)',
    'CKD eGFR Category',
    'Comorbidities Other',
    'Previous Treatment Type',
    'Previous Drug Classes (Selected)',
    'Previous Drug Classes Other',
    'Reason for Triple FDC (Selected)',
    'Reason for Triple FDC Other',
    'Previous Therapy (Legacy)',

    // Baseline Form
    'Baseline Visit Date (Baseline Form)',
    'Baseline HbA1c (%)',
    'Baseline FPG (mg/dL)',
    'Baseline PPG (mg/dL)',
    'Baseline Weight (kg)',
    'Baseline BP Systolic (mmHg)',
    'Baseline BP Diastolic (mmHg)',
    'Baseline Heart Rate (bpm)',
    'Baseline Serum Creatinine (mg/dL)',
    'Baseline eGFR (mL/min/1.73m2)',
    'Baseline Urinalysis',
    'Dose Prescribed',
    'Treatment Initiation Date',
    'Counseling Provided (Selected)',
  ]

  for (let i = 1; i <= maxFollowups; i += 1) {
    columns.push(`Follow-up ${i} Visit Number`)
    columns.push(`Follow-up ${i} Visit Date`)
    columns.push(`Follow-up ${i} HbA1c (%)`)
    columns.push(`Follow-up ${i} FPG (mg/dL)`)
    columns.push(`Follow-up ${i} PPG (mg/dL)`)
    columns.push(`Follow-up ${i} Weight (kg)`)
    columns.push(`Follow-up ${i} BP Systolic (mmHg)`)
    columns.push(`Follow-up ${i} BP Diastolic (mmHg)`)
    columns.push(`Follow-up ${i} Heart Rate (bpm)`)
    columns.push(`Follow-up ${i} Serum Creatinine (mg/dL)`)
    columns.push(`Follow-up ${i} eGFR (mL/min/1.73m2)`)
    columns.push(`Follow-up ${i} Urinalysis`)
    columns.push(`Follow-up ${i} Glycemic Response Category`)
    columns.push(`Follow-up ${i} Glycemic Response HbA1c Change`)
    columns.push(`Follow-up ${i} Glycemic Response HbA1c % Change`)
    columns.push(`Follow-up ${i} Outcome Weight Change`)
    columns.push(`Follow-up ${i} Outcome BP Control Achieved`)
    columns.push(`Follow-up ${i} Outcome Renal`)
    columns.push(`Follow-up ${i} Continuing Treatment`)
    columns.push(`Follow-up ${i} Discontinuation Reason`)
    columns.push(`Follow-up ${i} Discontinuation Reason Details`)
    columns.push(`Follow-up ${i} Missed Doses (Last 7 Days)`)
    columns.push(`Follow-up ${i} Add-on/Changed Therapy`)
    columns.push(`Follow-up ${i} Add-on/Changed Therapy Details`)
    columns.push(`Follow-up ${i} Adverse Events Present`)
    columns.push(`Follow-up ${i} Events of Special Interest (Selected)`)
    columns.push(`Follow-up ${i} Physician Overall Efficacy`)
    columns.push(`Follow-up ${i} Physician Overall Tolerability`)
    columns.push(`Follow-up ${i} Physician Compliance Judgment`)
    columns.push(`Follow-up ${i} Prefer KC MeSempa Long Term`)
    columns.push(`Follow-up ${i} Preferred Patient Profiles (Selected)`)
    columns.push(`Follow-up ${i} Data Privacy Confirmations (Selected)`)
    columns.push(`Follow-up ${i} Physician Qualification`)
    columns.push(`Follow-up ${i} Clinic/Hospital Name`)
    columns.push(`Follow-up ${i} Physician Declaration Confirmed`)
    columns.push(`Follow-up ${i} Signature Method`)
    columns.push(`Follow-up ${i} Signature Date`)
    columns.push(`Follow-up ${i} Comments`)

    for (let j = 1; j <= maxAes; j += 1) {
      columns.push(`Follow-up ${i} Adverse Event ${j} Term`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Onset Date`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Stop Date`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Severity`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Serious`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Action Taken`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Action Taken Other`)
      columns.push(`Follow-up ${i} Adverse Event ${j} Outcome`)
    }
  }

  columns.push('Comparison vs Last Follow-up: HbA1c Change')
  columns.push('Comparison vs Last Follow-up: FPG Change')
  columns.push('Comparison vs Last Follow-up: PPG Change')
  columns.push('Comparison vs Last Follow-up: Weight Change')
  columns.push('Comparison vs Last Follow-up: BP Systolic Change')
  columns.push('Comparison vs Last Follow-up: BP Diastolic Change')
  columns.push('Comparison vs Last Follow-up: eGFR Change')

  return columns
}

function buildRow(patient, doctorName, maxFollowups, maxAes) {
  const row = {}

  const baseline = patient.baseline || null
  const followups = Array.isArray(patient.followups) ? patient.followups : []

  row['Patient Code'] = patient.patientCode || ''
  row['Study Site Code'] = patient.studySiteCode || ''
  row['Doctor Name'] = patient.investigatorName || doctorName || ''

  row['Baseline Visit Date (Patient Form)'] = fmtDate(patient.baselineVisitDate)
  row['Age (Years)'] = patient.age ?? ''
  row['Gender'] = patient.gender || ''
  row['Height (cm)'] = patient.height ?? ''
  row['Weight (kg) - Patient Form'] = patient.weight ?? ''
  row['BMI'] = patient.bmi ?? ''
  row['Smoking Status'] = patient.smokingStatus || ''
  row['Alcohol Intake'] = patient.alcoholIntake || ''
  row['Physical Activity Level'] = patient.physicalActivityLevel || ''
  row['Duration of Type 2 Diabetes (Years)'] = patient.durationOfDiabetes ?? ''
  row['Baseline Glycemic Severity'] = patient.baselineGlycemicSeverity || ''

  row['Diabetes Complications (Selected)'] = joinSelected(
    patient.diabetesComplications,
    {
      neuropathy: 'Neuropathy',
      retinopathy: 'Retinopathy',
      nephropathy: 'Nephropathy',
      cadOrStroke: 'CAD/Stroke',
      none: 'None',
    }
  )

  row['Comorbidities (Selected)'] = joinSelected(
    patient.comorbidities,
    {
      hypertension: 'Hypertension',
      dyslipidemia: 'Dyslipidemia',
      obesity: 'Obesity',
      ascvd: 'ASCVD',
      heartFailure: 'Heart Failure',
      chronicKidneyDisease: 'Chronic Kidney Disease',
    },
    ['ckdEgfrCategory', 'other']
  )
  row['CKD eGFR Category'] = patient.comorbidities?.ckdEgfrCategory || ''
  row['Comorbidities Other'] = joinOther(patient.comorbidities?.other)
  row['Previous Treatment Type'] = patient.previousTreatmentType || ''

  row['Previous Drug Classes (Selected)'] = joinSelected(
    patient.previousDrugClasses,
    {
      metformin: 'Metformin',
      sulfonylurea: 'Sulfonylurea',
      dpp4Inhibitor: 'DPP4 Inhibitor',
      sglt2Inhibitor: 'SGLT2 Inhibitor',
      tzd: 'TZD',
      insulin: 'Insulin',
    },
    ['other']
  )
  row['Previous Drug Classes Other'] = joinOther(patient.previousDrugClasses?.other)

  row['Reason for Triple FDC (Selected)'] = joinSelected(
    patient.reasonForTripleFDC,
    {
      inadequateGlycemicControl: 'Inadequate Glycemic Control',
      weightConcerns: 'Weight Concerns',
      hypoglycemiaOnPriorTherapy: 'Hypoglycemia On Prior Therapy',
      highPillBurden: 'High Pill Burden',
      poorAdherence: 'Poor Adherence',
      costConsiderations: 'Cost Considerations',
      physicianClinicalJudgment: 'Physician Clinical Judgment',
    },
    ['other']
  )
  row['Reason for Triple FDC Other'] = joinOther(patient.reasonForTripleFDC?.other)
  row['Previous Therapy (Legacy)'] = joinOther(patient.previousTherapy)

  row['Baseline Visit Date (Baseline Form)'] = fmtDate(baseline?.baselineVisitDate)
  row['Baseline HbA1c (%)'] = baseline?.hba1c ?? ''
  row['Baseline FPG (mg/dL)'] = baseline?.fpg ?? ''
  row['Baseline PPG (mg/dL)'] = baseline?.ppg ?? ''
  row['Baseline Weight (kg)'] = baseline?.weight ?? ''
  row['Baseline BP Systolic (mmHg)'] = baseline?.bloodPressureSystolic ?? ''
  row['Baseline BP Diastolic (mmHg)'] = baseline?.bloodPressureDiastolic ?? ''
  row['Baseline Heart Rate (bpm)'] = baseline?.heartRate ?? ''
  row['Baseline Serum Creatinine (mg/dL)'] = baseline?.serumCreatinine ?? ''
  row['Baseline eGFR (mL/min/1.73m2)'] = baseline?.egfr ?? ''
  row['Baseline Urinalysis'] = baseline?.urinalysis || ''
  row['Dose Prescribed'] = baseline?.dosePrescribed || ''
  row['Treatment Initiation Date'] = fmtDate(baseline?.treatmentInitiationDate)
  row['Counseling Provided (Selected)'] = joinSelected(
    baseline?.counseling,
    {
      dietAndLifestyle: 'Diet and Lifestyle',
      hypoglycemiaAwareness: 'Hypoglycemia Awareness',
      utiGenitialInfectionAwareness: 'UTI/Genital Infection Awareness',
      hydrationAdvice: 'Hydration Advice',
    }
  )

  for (let i = 1; i <= maxFollowups; i += 1) {
    const fu = followups[i - 1]

    row[`Follow-up ${i} Visit Number`] = fu?.visitNumber ?? ''
    row[`Follow-up ${i} Visit Date`] = fmtDate(fu?.visitDate)
    row[`Follow-up ${i} HbA1c (%)`] = fu?.hba1c ?? ''
    row[`Follow-up ${i} FPG (mg/dL)`] = fu?.fpg ?? ''
    row[`Follow-up ${i} PPG (mg/dL)`] = fu?.ppg ?? ''
    row[`Follow-up ${i} Weight (kg)`] = fu?.weight ?? ''
    row[`Follow-up ${i} BP Systolic (mmHg)`] = fu?.bloodPressureSystolic ?? ''
    row[`Follow-up ${i} BP Diastolic (mmHg)`] = fu?.bloodPressureDiastolic ?? ''
    row[`Follow-up ${i} Heart Rate (bpm)`] = fu?.heartRate ?? ''
    row[`Follow-up ${i} Serum Creatinine (mg/dL)`] = fu?.serumCreatinine ?? ''
    row[`Follow-up ${i} eGFR (mL/min/1.73m2)`] = fu?.egfr ?? ''
    row[`Follow-up ${i} Urinalysis`] = fu?.urinalysis || ''
    row[`Follow-up ${i} Glycemic Response Category`] = fu?.glycemicResponse?.category || ''
    row[`Follow-up ${i} Glycemic Response HbA1c Change`] = fu?.glycemicResponse?.hba1cChange ?? ''
    row[`Follow-up ${i} Glycemic Response HbA1c % Change`] = fu?.glycemicResponse?.hba1cPercentageChange ?? ''
    row[`Follow-up ${i} Outcome Weight Change`] = fu?.outcomes?.weightChange || ''
    row[`Follow-up ${i} Outcome BP Control Achieved`] = fmtBool(fu?.outcomes?.bpControlAchieved)
    row[`Follow-up ${i} Outcome Renal`] = fu?.outcomes?.renalOutcome || ''
    row[`Follow-up ${i} Continuing Treatment`] = fmtBool(fu?.adherence?.patientContinuingTreatment)
    row[`Follow-up ${i} Discontinuation Reason`] = fu?.adherence?.discontinuationReason || ''
    row[`Follow-up ${i} Discontinuation Reason Details`] = fu?.adherence?.discontinuationReasonOtherDetails || ''
    row[`Follow-up ${i} Missed Doses (Last 7 Days)`] = fu?.adherence?.missedDosesInLast7Days ?? ''
    row[`Follow-up ${i} Add-on/Changed Therapy`] = fmtBool(fu?.adherence?.addOnOrChangedTherapy)
    row[`Follow-up ${i} Add-on/Changed Therapy Details`] = fu?.adherence?.addOnOrChangedTherapyDetails || ''
    row[`Follow-up ${i} Adverse Events Present`] = fmtBool(fu?.adverseEventsPresent)

    row[`Follow-up ${i} Events of Special Interest (Selected)`] = joinSelected(
      fu?.eventsOfSpecialInterest,
      {
        hypoglycemiaMild: 'Hypoglycemia Mild',
        hypoglycemiaModerate: 'Hypoglycemia Moderate',
        hypoglycemiaSevere: 'Hypoglycemia Severe',
        uti: 'UTI',
        genitalMycoticInfection: 'Genital Mycotic Infection',
        dizzinessDehydrationSymptoms: 'Dizziness/Dehydration Symptoms',
        hospitalizationOrErVisit: 'Hospitalization/ER Visit',
      },
      ['hospitalizationReason']
    )

    row[`Follow-up ${i} Physician Overall Efficacy`] = fu?.physicianAssessment?.overallEfficacy || ''
    row[`Follow-up ${i} Physician Overall Tolerability`] = fu?.physicianAssessment?.overallTolerability || ''
    row[`Follow-up ${i} Physician Compliance Judgment`] = fu?.physicianAssessment?.complianceJudgment || ''
    row[`Follow-up ${i} Prefer KC MeSempa Long Term`] = fmtBool(fu?.physicianAssessment?.preferKcMeSempaForLongTerm)

    row[`Follow-up ${i} Preferred Patient Profiles (Selected)`] = joinSelected(
      fu?.physicianAssessment?.preferredPatientProfiles,
      {
        uncontrolledT2dm: 'Uncontrolled T2DM',
        obeseT2dm: 'Obese T2DM',
        ckdPatients: 'CKD Patients',
        htnPlusT2dm: 'HTN + T2DM',
        elderlyPatients: 'Elderly Patients',
      }
    )

    row[`Follow-up ${i} Data Privacy Confirmations (Selected)`] = joinSelected(
      fu?.dataPrivacy,
      {
        noPersonalIdentifiersRecorded: 'No Personal Identifiers Recorded',
        dataCollectedAsRoutineClinicalPractice: 'Data Collected As Routine Clinical Practice',
        patientIdentityMappingAtClinicOnly: 'Patient Identity Mapping At Clinic Only',
      }
    )

    row[`Follow-up ${i} Physician Qualification`] = fu?.physicianDeclaration?.qualification || ''
    row[`Follow-up ${i} Clinic/Hospital Name`] = fu?.physicianDeclaration?.clinicHospitalName || ''
    row[`Follow-up ${i} Physician Declaration Confirmed`] = fmtBool(fu?.physicianDeclaration?.confirmationCheckbox)
    row[`Follow-up ${i} Signature Method`] = fu?.physicianDeclaration?.signatureMethod || ''
    row[`Follow-up ${i} Signature Date`] = fmtDate(fu?.physicianDeclaration?.signatureDate)
    row[`Follow-up ${i} Comments`] = fu?.comments || ''

    const aes = Array.isArray(fu?.adverseEvents)
      ? fu.adverseEvents
      : Array.isArray(fu?.adverseEventsStructured)
        ? fu.adverseEventsStructured
        : []

    for (let j = 1; j <= maxAes; j += 1) {
      const ae = aes[j - 1]
      row[`Follow-up ${i} Adverse Event ${j} Term`] = ae?.aeTerm || ''
      row[`Follow-up ${i} Adverse Event ${j} Onset Date`] = fmtDate(ae?.onsetDate)
      row[`Follow-up ${i} Adverse Event ${j} Stop Date`] = fmtDate(ae?.stopDate)
      row[`Follow-up ${i} Adverse Event ${j} Severity`] = ae?.severity || ''
      row[`Follow-up ${i} Adverse Event ${j} Serious`] = ae?.serious || ''
      row[`Follow-up ${i} Adverse Event ${j} Action Taken`] = ae?.actionTaken || ''
      row[`Follow-up ${i} Adverse Event ${j} Action Taken Other`] = ae?.actionTakenOther || ''
      row[`Follow-up ${i} Adverse Event ${j} Outcome`] = ae?.outcome || ''
    }
  }

  const lastFu = followups.length > 0 ? followups[followups.length - 1] : null
  row['Comparison vs Last Follow-up: HbA1c Change'] = lastFu ? delta(lastFu.hba1c, baseline?.hba1c) : ''
  row['Comparison vs Last Follow-up: FPG Change'] = lastFu ? delta(lastFu.fpg, baseline?.fpg) : ''
  row['Comparison vs Last Follow-up: PPG Change'] = lastFu ? delta(lastFu.ppg, baseline?.ppg) : ''
  row['Comparison vs Last Follow-up: Weight Change'] = lastFu ? delta(lastFu.weight, baseline?.weight) : ''
  row['Comparison vs Last Follow-up: BP Systolic Change'] = lastFu ? delta(lastFu.bloodPressureSystolic, baseline?.bloodPressureSystolic) : ''
  row['Comparison vs Last Follow-up: BP Diastolic Change'] = lastFu ? delta(lastFu.bloodPressureDiastolic, baseline?.bloodPressureDiastolic) : ''
  row['Comparison vs Last Follow-up: eGFR Change'] = lastFu ? delta(lastFu.egfr, baseline?.egfr) : ''

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
        doctorNameMap.set(doctorId, doctorSnap.data()?.name || '')
      }
    } catch (_) {
      // Keep fallback to patient.investigatorName
    }
  }

  const { maxFollowups, maxAes } = getMaxCounts(patients)
  const columns = buildColumns(maxFollowups, maxAes)

  const rows = patients.map((patient) => {
    const doctorName = doctorNameMap.get(patient.doctorId) || ''
    return buildRow(patient, doctorName, maxFollowups, maxAes)
  })

  const header = columns.map((c) => csvEscape(c)).join(',')
  const body = rows.map((row) => columns.map((c) => csvEscape(row[c])).join(',')).join('\n')
  const csv = `${header}\n${body}`

  const fileName = `ALL_DOCTORS_QA_DYNAMIC_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.csv`
  const outputPath = path.join(root, fileName)
  fs.writeFileSync(outputPath, csv, 'utf8')

  console.log(`EXPORT_OK file=${fileName} patients=${patients.length} rows=${rows.length} max_followups=${maxFollowups} max_ae=${maxAes}`)
}

main().catch((error) => {
  console.error('EXPORT_FAILED', error.message)
  process.exit(1)
})
