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
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON from .env.local')
  }
}

function toPipeValue(value) {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join('|')
  if (value === undefined || value === null) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function escapeCsv(value) {
  const str = toPipeValue(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function getPatientBaseRow(patientId, patient, baseline) {
  return {
    patient_id: patientId,
    patient_patientId: patientId,
    patient_doctorId: patient.doctorId,
    patient_patientCode: patient.patientCode,
    patient_studySiteCode: patient.studySiteCode,
    patient_investigatorName: patient.investigatorName,
    patient_baselineVisitDate: patient.baselineVisitDate,
    patient_age: patient.age,
    patient_gender: patient.gender,
    patient_height_cm: patient.height,
    patient_weight_kg: patient.weight,
    patient_bmi: patient.bmi,
    patient_smokingStatus: patient.smokingStatus,
    patient_alcoholIntake: patient.alcoholIntake,
    patient_physicalActivityLevel: patient.physicalActivityLevel,
    patient_durationOfDiabetes_years: patient.durationOfDiabetes,
    patient_baselineGlycemicSeverity: patient.baselineGlycemicSeverity,
    patient_diabetesComplications_neuropathy: patient.diabetesComplications?.neuropathy,
    patient_diabetesComplications_retinopathy: patient.diabetesComplications?.retinopathy,
    patient_diabetesComplications_nephropathy: patient.diabetesComplications?.nephropathy,
    patient_diabetesComplications_cadOrStroke: patient.diabetesComplications?.cadOrStroke,
    patient_diabetesComplications_none: patient.diabetesComplications?.none,
    patient_comorbidities_hypertension: patient.comorbidities?.hypertension,
    patient_comorbidities_dyslipidemia: patient.comorbidities?.dyslipidemia,
    patient_comorbidities_obesity: patient.comorbidities?.obesity,
    patient_comorbidities_ascvd: patient.comorbidities?.ascvd,
    patient_comorbidities_heartFailure: patient.comorbidities?.heartFailure,
    patient_comorbidities_chronicKidneyDisease: patient.comorbidities?.chronicKidneyDisease,
    patient_comorbidities_ckdEgfrCategory: patient.comorbidities?.ckdEgfrCategory,
    patient_comorbidities_other: patient.comorbidities?.other,
    patient_previousTreatmentType: patient.previousTreatmentType,
    patient_previousDrugClasses_metformin: patient.previousDrugClasses?.metformin,
    patient_previousDrugClasses_sulfonylurea: patient.previousDrugClasses?.sulfonylurea,
    patient_previousDrugClasses_dpp4Inhibitor: patient.previousDrugClasses?.dpp4Inhibitor,
    patient_previousDrugClasses_sglt2Inhibitor: patient.previousDrugClasses?.sglt2Inhibitor,
    patient_previousDrugClasses_tzd: patient.previousDrugClasses?.tzd,
    patient_previousDrugClasses_insulin: patient.previousDrugClasses?.insulin,
    patient_previousDrugClasses_other: patient.previousDrugClasses?.other,
    patient_reasonForTripleFDC_inadequateGlycemicControl: patient.reasonForTripleFDC?.inadequateGlycemicControl,
    patient_reasonForTripleFDC_weightConcerns: patient.reasonForTripleFDC?.weightConcerns,
    patient_reasonForTripleFDC_hypoglycemiaOnPriorTherapy: patient.reasonForTripleFDC?.hypoglycemiaOnPriorTherapy,
    patient_reasonForTripleFDC_highPillBurden: patient.reasonForTripleFDC?.highPillBurden,
    patient_reasonForTripleFDC_poorAdherence: patient.reasonForTripleFDC?.poorAdherence,
    patient_reasonForTripleFDC_costConsiderations: patient.reasonForTripleFDC?.costConsiderations,
    patient_reasonForTripleFDC_physicianClinicalJudgment: patient.reasonForTripleFDC?.physicianClinicalJudgment,
    patient_reasonForTripleFDC_other: patient.reasonForTripleFDC?.other,
    patient_previousTherapy: patient.previousTherapy,
    patient_createdAt: patient.createdAt,
    patient_updatedAt: patient.updatedAt,

    baseline_patientId: baseline?.patientId ?? patientId,
    baseline_doctorId: baseline?.doctorId ?? patient.doctorId,
    baseline_baselineVisitDate: baseline?.baselineVisitDate,
    baseline_hba1c_pct: baseline?.hba1c,
    baseline_fpg_mg_dL: baseline?.fpg,
    baseline_ppg_mg_dL: baseline?.ppg,
    baseline_weight_kg: baseline?.weight,
    baseline_bloodPressureSystolic_mmHg: baseline?.bloodPressureSystolic,
    baseline_bloodPressureDiastolic_mmHg: baseline?.bloodPressureDiastolic,
    baseline_heartRate_bpm: baseline?.heartRate,
    baseline_serumCreatinine_mg_dL: baseline?.serumCreatinine,
    baseline_egfr_ml_min_1_73m2: baseline?.egfr,
    baseline_urinalysis: baseline?.urinalysis,
    baseline_dosePrescribed: baseline?.dosePrescribed,
    baseline_treatmentInitiationDate: baseline?.treatmentInitiationDate,
    baseline_counseling_dietAndLifestyle: baseline?.counseling?.dietAndLifestyle,
    baseline_counseling_hypoglycemiaAwareness: baseline?.counseling?.hypoglycemiaAwareness,
    baseline_counseling_utiGenitialInfectionAwareness: baseline?.counseling?.utiGenitialInfectionAwareness,
    baseline_counseling_hydrationAdvice: baseline?.counseling?.hydrationAdvice,
    baseline_dietAdvice_legacy: baseline?.dietAdvice,
    baseline_counselingProvided_legacy: baseline?.counselingProvided,
    baseline_createdAt: baseline?.createdAt,
    baseline_updatedAt: baseline?.updatedAt,
  }
}

function getFollowupRow(patientId, patient, followup, followupIndex) {
  return {
    followup_index: followup ? followupIndex + 1 : '',
    followup_patientId: followup?.patientId ?? patientId,
    followup_doctorId: followup?.doctorId ?? patient.doctorId,
    followup_visitNumber: followup?.visitNumber,
    followup_visitDate: followup?.visitDate,
    followup_hba1c_pct: followup?.hba1c,
    followup_fpg_mg_dL: followup?.fpg,
    followup_ppg_mg_dL: followup?.ppg,
    followup_weight_kg: followup?.weight,
    followup_bloodPressureSystolic_mmHg: followup?.bloodPressureSystolic,
    followup_bloodPressureDiastolic_mmHg: followup?.bloodPressureDiastolic,
    followup_heartRate_bpm: followup?.heartRate,
    followup_serumCreatinine_mg_dL: followup?.serumCreatinine,
    followup_egfr_ml_min_1_73m2: followup?.egfr,
    followup_urinalysis: followup?.urinalysis,
    followup_glycemicResponse_category: followup?.glycemicResponse?.category,
    followup_glycemicResponse_hba1cChange: followup?.glycemicResponse?.hba1cChange,
    followup_glycemicResponse_hba1cPercentageChange: followup?.glycemicResponse?.hba1cPercentageChange,
    followup_outcomes_weightChange: followup?.outcomes?.weightChange,
    followup_outcomes_bpControlAchieved: followup?.outcomes?.bpControlAchieved,
    followup_outcomes_renalOutcome: followup?.outcomes?.renalOutcome,
    followup_adherence_patientContinuingTreatment: followup?.adherence?.patientContinuingTreatment,
    followup_adherence_discontinuationReason: followup?.adherence?.discontinuationReason,
    followup_adherence_discontinuationReasonOtherDetails: followup?.adherence?.discontinuationReasonOtherDetails,
    followup_adherence_missedDosesInLast7Days: followup?.adherence?.missedDosesInLast7Days,
    followup_adherence_addOnOrChangedTherapy: followup?.adherence?.addOnOrChangedTherapy,
    followup_adherence_addOnOrChangedTherapyDetails: followup?.adherence?.addOnOrChangedTherapyDetails,
    followup_adverseEventsPresent: followup?.adverseEventsPresent,
    followup_eventsOfSpecialInterest_hypoglycemiaMild: followup?.eventsOfSpecialInterest?.hypoglycemiaMild,
    followup_eventsOfSpecialInterest_hypoglycemiaModerate: followup?.eventsOfSpecialInterest?.hypoglycemiaModerate,
    followup_eventsOfSpecialInterest_hypoglycemiaSevere: followup?.eventsOfSpecialInterest?.hypoglycemiaSevere,
    followup_eventsOfSpecialInterest_uti: followup?.eventsOfSpecialInterest?.uti,
    followup_eventsOfSpecialInterest_genitalMycoticInfection: followup?.eventsOfSpecialInterest?.genitalMycoticInfection,
    followup_eventsOfSpecialInterest_dizzinessDehydrationSymptoms: followup?.eventsOfSpecialInterest?.dizzinessDehydrationSymptoms,
    followup_eventsOfSpecialInterest_hospitalizationOrErVisit: followup?.eventsOfSpecialInterest?.hospitalizationOrErVisit,
    followup_eventsOfSpecialInterest_hospitalizationReason: followup?.eventsOfSpecialInterest?.hospitalizationReason,
    followup_physicianAssessment_overallEfficacy: followup?.physicianAssessment?.overallEfficacy,
    followup_physicianAssessment_overallTolerability: followup?.physicianAssessment?.overallTolerability,
    followup_physicianAssessment_complianceJudgment: followup?.physicianAssessment?.complianceJudgment,
    followup_physicianAssessment_preferKcMeSempaForLongTerm: followup?.physicianAssessment?.preferKcMeSempaForLongTerm,
    followup_physicianAssessment_preferredPatientProfiles_uncontrolledT2dm: followup?.physicianAssessment?.preferredPatientProfiles?.uncontrolledT2dm,
    followup_physicianAssessment_preferredPatientProfiles_obeseT2dm: followup?.physicianAssessment?.preferredPatientProfiles?.obeseT2dm,
    followup_physicianAssessment_preferredPatientProfiles_ckdPatients: followup?.physicianAssessment?.preferredPatientProfiles?.ckdPatients,
    followup_physicianAssessment_preferredPatientProfiles_htnPlusT2dm: followup?.physicianAssessment?.preferredPatientProfiles?.htnPlusT2dm,
    followup_physicianAssessment_preferredPatientProfiles_elderlyPatients: followup?.physicianAssessment?.preferredPatientProfiles?.elderlyPatients,
    followup_dataPrivacy_noPersonalIdentifiersRecorded: followup?.dataPrivacy?.noPersonalIdentifiersRecorded,
    followup_dataPrivacy_dataCollectedAsRoutineClinicalPractice: followup?.dataPrivacy?.dataCollectedAsRoutineClinicalPractice,
    followup_dataPrivacy_patientIdentityMappingAtClinicOnly: followup?.dataPrivacy?.patientIdentityMappingAtClinicOnly,
    followup_physicianDeclaration_physicianName: followup?.physicianDeclaration?.physicianName,
    followup_physicianDeclaration_qualification: followup?.physicianDeclaration?.qualification,
    followup_physicianDeclaration_clinicHospitalName: followup?.physicianDeclaration?.clinicHospitalName,
    followup_physicianDeclaration_confirmationCheckbox: followup?.physicianDeclaration?.confirmationCheckbox,
    followup_physicianDeclaration_signatureMethod: followup?.physicianDeclaration?.signatureMethod,
    followup_physicianDeclaration_signatureData: followup?.physicianDeclaration?.signatureData,
    followup_physicianDeclaration_signatureDate: followup?.physicianDeclaration?.signatureDate,
    followup_adverseEventsText_legacy: followup?.adverseEventsText,
    followup_actionTaken_legacy: followup?.actionTaken,
    followup_outcome_legacy: followup?.outcome,
    followup_compliance_legacy: followup?.compliance,
    followup_efficacy_legacy: followup?.efficacy,
    followup_tolerability_legacy: followup?.tolerability,
    followup_energyLevels_legacy: followup?.energyLevels,
    followup_satisfaction_legacy: followup?.satisfaction,
    followup_comments: followup?.comments,
    followup_createdAt: followup?.createdAt,
    followup_updatedAt: followup?.updatedAt,
  }
}

async function main() {
  const root = path.resolve(__dirname, '..')
  const envPath = path.join(root, '.env.local')
  const templatePath = path.join(root, 'ALL_FIELDS_EXPORT_TEMPLATE_SERIAL.csv')

  const serviceAccount = loadServiceAccountFromEnvFile(envPath)
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }

  const db = getFirestore()
  const headerLine = fs.readFileSync(templatePath, 'utf8').split(/\r?\n/)[0]
  const columns = headerLine.split(',').map((c) => c.replace(/^"|"$/g, ''))

  const snap = await db.collection('patients').get()
  const rows = []

  for (const docSnap of snap.docs) {
    const patientId = docSnap.id
    const patient = docSnap.data() || {}
    const baseline = patient.baseline || null
    const followups = Array.isArray(patient.followups) ? patient.followups : []

    const baseRow = getPatientBaseRow(patientId, patient, baseline)

    if (followups.length === 0) {
      rows.push({
        ...baseRow,
        ...getFollowupRow(patientId, patient, null, 0),
        row_type: baseline ? 'PATIENT_BASELINE_ONLY' : 'PATIENT_ONLY',
        adverse_event_index: '',
      })
      continue
    }

    followups.forEach((followup, followupIndex) => {
      const followupRow = getFollowupRow(patientId, patient, followup, followupIndex)
      const adverseEvents = followup?.adverseEvents || followup?.adverseEventsStructured || []

      if (!Array.isArray(adverseEvents) || adverseEvents.length === 0) {
        rows.push({
          ...baseRow,
          ...followupRow,
          row_type: 'FOLLOWUP_ONLY',
          adverse_event_index: '',
        })
        return
      }

      adverseEvents.forEach((event, eventIndex) => {
        rows.push({
          ...baseRow,
          ...followupRow,
          adverseEvent_id: event?.id,
          adverseEvent_aeTerm: event?.aeTerm,
          adverseEvent_onsetDate: event?.onsetDate,
          adverseEvent_stopDate: event?.stopDate,
          adverseEvent_severity: event?.severity,
          adverseEvent_serious: event?.serious,
          adverseEvent_actionTaken: event?.actionTaken,
          adverseEvent_actionTakenOther: event?.actionTakenOther,
          adverseEvent_outcome: event?.outcome,
          row_type: 'FOLLOWUP_WITH_AE',
          adverse_event_index: eventIndex + 1,
        })
      })
    })
  }

  const csvBody = rows
    .map((row) => columns.map((col) => escapeCsv(row[col])).join(','))
    .join('\n')

  const outputName = `ALL_DOCTORS_EXPORT_SERIAL_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.csv`
  const outputPath = path.join(root, outputName)
  fs.writeFileSync(outputPath, `${headerLine}\n${csvBody}`, 'utf8')

  console.log(`EXPORT_OK file=${outputName} patients=${snap.size} rows=${rows.length}`)
}

main().catch((error) => {
  console.error('EXPORT_FAILED', error.message)
  process.exit(1)
})
