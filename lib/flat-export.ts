import type { BaselineData, FollowUpData, Patient } from "@/lib/types"

export const FLAT_EXPORT_COLUMNS: string[] = [
  "patient_patientCode",
  "patient_studySiteCode",
  "patient_investigatorName",
  "patient_baselineVisitDate",
  "patient_age",
  "patient_gender",
  "patient_height_cm",
  "patient_weight_kg",
  "patient_bmi",
  "patient_smokingStatus",
  "patient_alcoholIntake",
  "patient_physicalActivityLevel",
  "patient_durationOfDiabetes_years",
  "patient_baselineGlycemicSeverity",
  "patient_diabetesComplications_neuropathy",
  "patient_diabetesComplications_retinopathy",
  "patient_diabetesComplications_nephropathy",
  "patient_diabetesComplications_cadOrStroke",
  "patient_diabetesComplications_none",
  "patient_comorbidities_hypertension",
  "patient_comorbidities_dyslipidemia",
  "patient_comorbidities_obesity",
  "patient_comorbidities_ascvd",
  "patient_comorbidities_heartFailure",
  "patient_comorbidities_chronicKidneyDisease",
  "patient_comorbidities_ckdEgfrCategory",
  "patient_comorbidities_other",
  "patient_previousTreatmentType",
  "patient_previousDrugClasses_metformin",
  "patient_previousDrugClasses_sulfonylurea",
  "patient_previousDrugClasses_dpp4Inhibitor",
  "patient_previousDrugClasses_sglt2Inhibitor",
  "patient_previousDrugClasses_tzd",
  "patient_previousDrugClasses_insulin",
  "patient_previousDrugClasses_other",
  "patient_reasonForTripleFDC_inadequateGlycemicControl",
  "patient_reasonForTripleFDC_weightConcerns",
  "patient_reasonForTripleFDC_hypoglycemiaOnPriorTherapy",
  "patient_reasonForTripleFDC_highPillBurden",
  "patient_reasonForTripleFDC_poorAdherence",
  "patient_reasonForTripleFDC_costConsiderations",
  "patient_reasonForTripleFDC_physicianClinicalJudgment",
  "patient_reasonForTripleFDC_other",
  "patient_previousTherapy",
  "patient_createdAt",
  "patient_updatedAt",
  "baseline_patientId",
  "baseline_doctorId",
  "baseline_baselineVisitDate",
  "baseline_hba1c_pct",
  "baseline_fpg_mg_dL",
  "baseline_ppg_mg_dL",
  "baseline_weight_kg",
  "baseline_bloodPressureSystolic_mmHg",
  "baseline_bloodPressureDiastolic_mmHg",
  "baseline_heartRate_bpm",
  "baseline_serumCreatinine_mg_dL",
  "baseline_egfr_ml_min_1_73m2",
  "baseline_urinalysis",
  "baseline_dosePrescribed",
  "baseline_treatmentInitiationDate",
  "baseline_counseling_dietAndLifestyle",
  "baseline_counseling_hypoglycemiaAwareness",
  "baseline_counseling_utiGenitialInfectionAwareness",
  "baseline_counseling_hydrationAdvice",
  "baseline_dietAdvice_legacy",
  "baseline_counselingProvided_legacy",
  "baseline_createdAt",
  "baseline_updatedAt",
  "followup_index",
  "followup_patientId",
  "followup_doctorId",
  "followup_visitNumber",
  "followup_visitDate",
  "followup_hba1c_pct",
  "followup_fpg_mg_dL",
  "followup_ppg_mg_dL",
  "followup_weight_kg",
  "followup_bloodPressureSystolic_mmHg",
  "followup_bloodPressureDiastolic_mmHg",
  "followup_heartRate_bpm",
  "followup_serumCreatinine_mg_dL",
  "followup_egfr_ml_min_1_73m2",
  "followup_urinalysis",
  "followup_glycemicResponse_category",
  "followup_glycemicResponse_hba1cChange",
  "followup_glycemicResponse_hba1cPercentageChange",
  "followup_outcomes_weightChange",
  "followup_outcomes_bpControlAchieved",
  "followup_outcomes_renalOutcome",
  "followup_adherence_patientContinuingTreatment",
  "followup_adherence_discontinuationReason",
  "followup_adherence_discontinuationReasonOtherDetails",
  "followup_adherence_missedDosesInLast7Days",
  "followup_adherence_addOnOrChangedTherapy",
  "followup_adherence_addOnOrChangedTherapyDetails",
  "followup_adverseEventsPresent",
  "followup_eventsOfSpecialInterest_hypoglycemiaMild",
  "followup_eventsOfSpecialInterest_hypoglycemiaModerate",
  "followup_eventsOfSpecialInterest_hypoglycemiaSevere",
  "followup_eventsOfSpecialInterest_uti",
  "followup_eventsOfSpecialInterest_genitalMycoticInfection",
  "followup_eventsOfSpecialInterest_dizzinessDehydrationSymptoms",
  "followup_eventsOfSpecialInterest_hospitalizationOrErVisit",
  "followup_eventsOfSpecialInterest_hospitalizationReason",
  "followup_physicianAssessment_overallEfficacy",
  "followup_physicianAssessment_overallTolerability",
  "followup_physicianAssessment_complianceJudgment",
  "followup_physicianAssessment_preferKcMeSempaForLongTerm",
  "followup_physicianAssessment_preferredPatientProfiles_uncontrolledT2dm",
  "followup_physicianAssessment_preferredPatientProfiles_obeseT2dm",
  "followup_physicianAssessment_preferredPatientProfiles_ckdPatients",
  "followup_physicianAssessment_preferredPatientProfiles_htnPlusT2dm",
  "followup_physicianAssessment_preferredPatientProfiles_elderlyPatients",
  "followup_dataPrivacy_noPersonalIdentifiersRecorded",
  "followup_dataPrivacy_dataCollectedAsRoutineClinicalPractice",
  "followup_dataPrivacy_patientIdentityMappingAtClinicOnly",
  "followup_physicianDeclaration_physicianName",
  "followup_physicianDeclaration_qualification",
  "followup_physicianDeclaration_clinicHospitalName",
  "followup_physicianDeclaration_confirmationCheckbox",
  "followup_physicianDeclaration_signatureMethod",
  "followup_physicianDeclaration_signatureData",
  "followup_physicianDeclaration_signatureDate",
  "followup_adverseEventsText_legacy",
  "followup_actionTaken_legacy",
  "followup_outcome_legacy",
  "followup_compliance_legacy",
  "followup_efficacy_legacy",
  "followup_tolerability_legacy",
  "followup_energyLevels_legacy",
  "followup_satisfaction_legacy",
  "followup_comments",
  "followup_createdAt",
  "followup_updatedAt",
  "adverseEvent_id",
  "adverseEvent_aeTerm",
  "adverseEvent_onsetDate",
  "adverseEvent_stopDate",
  "adverseEvent_severity",
  "adverseEvent_serious",
  "adverseEvent_actionTaken",
  "adverseEvent_actionTakenOther",
  "adverseEvent_outcome",
  "row_type",
  "adverse_event_index",
]

type ExportRecord = Record<string, unknown>

function toPipeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "")).join("|")
  }

  if (value === undefined || value === null) {
    return ""
  }

  return String(value)
}

function escapeCsv(value: unknown): string {
  const stringValue = toPipeValue(value)
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function getPatientBaseRow(patient: Patient, baseline: BaselineData | null): ExportRecord {
  return {
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
    patient_updatedAt: (patient as any).updatedAt,

    baseline_patientId: baseline?.patientId ?? patient.id,
    baseline_doctorId: (baseline as any)?.doctorId ?? patient.doctorId,
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

function getFollowupRow(patient: Patient, followup: FollowUpData | null, followupIndex: number): ExportRecord {
  return {
    followup_index: followup ? followupIndex + 1 : "",
    followup_patientId: followup?.patientId ?? patient.id,
    followup_doctorId: (followup as any)?.doctorId ?? patient.doctorId,
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

export function buildFlatExportRows(
  patient: Patient,
  baseline: BaselineData | null,
  followUps: FollowUpData[]
): ExportRecord[] {
  const baseRow = getPatientBaseRow(patient, baseline)
  const rows: ExportRecord[] = []

  if (!followUps || followUps.length === 0) {
    rows.push({
      ...baseRow,
      ...getFollowupRow(patient, null, 0),
      row_type: baseline ? "PATIENT_BASELINE_ONLY" : "PATIENT_ONLY",
      adverse_event_index: "",
    })
    return rows
  }

  followUps.forEach((followup, idx) => {
    const followupRow = getFollowupRow(patient, followup, idx)
    const adverseEvents = followup.adverseEvents || followup.adverseEventsStructured || []

    if (adverseEvents.length === 0) {
      rows.push({
        ...baseRow,
        ...followupRow,
        row_type: "FOLLOWUP_ONLY",
        adverse_event_index: "",
      })
      return
    }

    adverseEvents.forEach((event, eventIndex) => {
      rows.push({
        ...baseRow,
        ...followupRow,
        adverseEvent_id: event.id,
        adverseEvent_aeTerm: event.aeTerm,
        adverseEvent_onsetDate: event.onsetDate,
        adverseEvent_stopDate: event.stopDate,
        adverseEvent_severity: event.severity,
        adverseEvent_serious: event.serious,
        adverseEvent_actionTaken: event.actionTaken,
        adverseEvent_actionTakenOther: event.actionTakenOther,
        adverseEvent_outcome: event.outcome,
        row_type: "FOLLOWUP_WITH_AE",
        adverse_event_index: eventIndex + 1,
      })
    })
  })

  return rows
}

export function buildFlatCsv(columns: string[], rows: ExportRecord[]): string {
  const header = columns.join(",")
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")).join("\n")
  return `${header}\n${body}`
}

export function downloadCsvFile(columns: string[], rows: ExportRecord[], filename: string): void {
  const csv = buildFlatCsv(columns, rows)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadExcelFile(columns: string[], rows: ExportRecord[], filename: string): void {
  const headerHtml = columns.map((column) => `<th>${column}</th>`).join("")
  const rowsHtml = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${toPipeValue(row[column])}</td>`).join("")}</tr>`)
    .join("")

  const html = `\ufeff<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================================================
// DYNAMIC CSV EXPORT (One Row Per Patient with Dynamic Followup/Adverse Events)
// ============================================================================

interface DynamicExportRecord extends Record<string, unknown> {
  patient_code?: string
  doctor_code?: string
  center_id?: string
  patient_added_date?: string
  baseline_date?: string
  baseline_ckd_stage?: string
  baseline_bp_systolic?: string | number
  baseline_bp_diastolic?: string | number
  baseline_weight_kg?: string | number
  baseline_hba1c?: string | number
  baseline_comorbidities?: string
  comparison_delta_weight_kg?: string | number
  comparison_delta_hba1c?: string | number
  comparison_delta_bp_systolic?: string | number
  comparison_delta_bp_diastolic?: string | number
  comparison_summary?: string
  [key: string]: unknown
}

/**
 * Analyze all patients to determine max followups and adverse events per followup
 */
function analyzePatientData(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>
): { maxFollowups: number; maxAdverseEventsPerFollowup: number } {
  let maxFollowups = 0
  let maxAdverseEventsPerFollowup = 0

  for (const patient of patients) {
    const followups = followUpData.get(patient.id) || []
    maxFollowups = Math.max(maxFollowups, followups.length)

    for (const followup of followups) {
      const adverseEvents = followup.adverseEvents || followup.adverseEventsStructured || []
      maxAdverseEventsPerFollowup = Math.max(maxAdverseEventsPerFollowup, adverseEvents.length)
    }
  }

  return { maxFollowups: Math.max(maxFollowups, 1), maxAdverseEventsPerFollowup }
}

/**
 * Generate dynamic column headers based on data
 */
function generateDynamicColumns(maxFollowups: number, maxAdverseEventsPerFollowup: number): string[] {
  const baseColumns = [
    "patient_code",
    "doctor_code",
    "center_id",
    "patient_added_date",
    "baseline_date",
    "baseline_ckd_stage",
    "baseline_bp_systolic",
    "baseline_bp_diastolic",
    "baseline_weight_kg",
    "baseline_hba1c",
    "baseline_comorbidities",
  ]

  const followupColumns: string[] = []

  for (let i = 1; i <= maxFollowups; i++) {
    followupColumns.push(`followup_${i}_date`)
    followupColumns.push(`followup_${i}_bp_systolic`)
    followupColumns.push(`followup_${i}_bp_diastolic`)
    followupColumns.push(`followup_${i}_weight_kg`)
    followupColumns.push(`followup_${i}_hba1c`)
    followupColumns.push(`followup_${i}_comorbidities`)

    // Add adverse event columns for this followup
    for (let j = 1; j <= maxAdverseEventsPerFollowup; j++) {
      followupColumns.push(`followup_${i}_adverse_event_${j}_type`)
      followupColumns.push(`followup_${i}_adverse_event_${j}_severity`)
    }
  }

  const comparisonColumns = [
    "comparison_delta_weight_kg",
    "comparison_delta_hba1c",
    "comparison_delta_bp_systolic",
    "comparison_delta_bp_diastolic",
    "comparison_summary",
  ]

  return [...baseColumns, ...followupColumns, ...comparisonColumns]
}

/**
 * Collapse checkbox/array values to pipe-separated string
 */
function collapseArrayValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((v) => v && v !== false).join(", ")
  }
  if (typeof value === "object" && value !== null) {
    // Handle checkbox objects like { hypertension: true, diabetes: false }
    const selected = Object.entries(value)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
    return selected.join(", ")
  }
  if (value === true) {
    return "Yes"
  }
  if (value === false) {
    return "No"
  }
  return value ? String(value) : ""
}

/**
 * Build a single row for a patient in dynamic CSV format
 */
function buildDynamicPatientRow(
  patient: Patient,
  baseline: BaselineData | null,
  followups: FollowUpData[],
  maxFollowups: number,
  maxAdverseEventsPerFollowup: number
): DynamicExportRecord {
  const row: DynamicExportRecord = {
    patient_code: patient.patientCode,
    doctor_code: patient.doctorId,
    center_id: patient.studySiteCode,
    patient_added_date: patient.createdAt ? new Date(patient.createdAt as any).toISOString().split("T")[0] : "",
    baseline_date: baseline?.baselineVisitDate
      ? new Date(baseline.baselineVisitDate as any).toISOString().split("T")[0]
      : "",
    baseline_ckd_stage: (patient.comorbidities?.ckdEgfrCategory as string) || "",
    baseline_bp_systolic: baseline?.bloodPressureSystolic ?? "",
    baseline_bp_diastolic: baseline?.bloodPressureDiastolic ?? "",
    baseline_weight_kg: baseline?.weight ?? "",
    baseline_hba1c: baseline?.hba1c ?? "",
    baseline_comorbidities: collapseArrayValue(patient.comorbidities),
  }

  // Process each followup
  for (let i = 0; i < maxFollowups; i++) {
    const followup = followups?.[i]
    const followupNum = i + 1

    if (followup) {
      row[`followup_${followupNum}_date`] = followup.visitDate
        ? new Date(followup.visitDate as any).toISOString().split("T")[0]
        : ""
      row[`followup_${followupNum}_bp_systolic`] = followup.bloodPressureSystolic || ""
      row[`followup_${followupNum}_bp_diastolic`] = followup.bloodPressureDiastolic || ""
      row[`followup_${followupNum}_weight_kg`] = followup.weight || ""
      row[`followup_${followupNum}_hba1c`] = followup.hba1c || ""
      row[`followup_${followupNum}_comorbidities`] = collapseArrayValue((followup as any).comorbidities)

      // Process adverse events for this followup
      const adverseEvents = followup.adverseEvents || followup.adverseEventsStructured || []
      for (let j = 0; j < maxAdverseEventsPerFollowup; j++) {
        const aeEvent = adverseEvents[j]
        const aeNum = j + 1

        if (aeEvent) {
          row[`followup_${followupNum}_adverse_event_${aeNum}_type`] = aeEvent.aeTerm || ""
          row[`followup_${followupNum}_adverse_event_${aeNum}_severity`] = aeEvent.severity || ""
        } else {
          row[`followup_${followupNum}_adverse_event_${aeNum}_type`] = ""
          row[`followup_${followupNum}_adverse_event_${aeNum}_severity`] = ""
        }
      }
    } else {
      // Empty followup - fill with empty strings
      row[`followup_${followupNum}_date`] = ""
      row[`followup_${followupNum}_bp_systolic`] = ""
      row[`followup_${followupNum}_bp_diastolic`] = ""
      row[`followup_${followupNum}_weight_kg`] = ""
      row[`followup_${followupNum}_hba1c`] = ""
      row[`followup_${followupNum}_comorbidities`] = ""

      for (let j = 0; j < maxAdverseEventsPerFollowup; j++) {
        const aeNum = j + 1
        row[`followup_${followupNum}_adverse_event_${aeNum}_type`] = ""
        row[`followup_${followupNum}_adverse_event_${aeNum}_severity`] = ""
      }
    }
  }

  // Add comparison metrics
  if (baseline && followups && followups.length > 0) {
    const lastFollowup = followups[followups.length - 1]
    const weightDelta =
      lastFollowup.weight && baseline.weight ? lastFollowup.weight - baseline.weight : null
    const hba1cDelta =
      lastFollowup.hba1c && baseline.hba1c ? lastFollowup.hba1c - baseline.hba1c : null
    const bpSystolicDelta =
      lastFollowup.bloodPressureSystolic && baseline.bloodPressureSystolic
        ? lastFollowup.bloodPressureSystolic - baseline.bloodPressureSystolic
        : null
    const bpDiastolicDelta =
      lastFollowup.bloodPressureDiastolic && baseline.bloodPressureDiastolic
        ? lastFollowup.bloodPressureDiastolic - baseline.bloodPressureDiastolic
        : null

    row.comparison_delta_weight_kg = weightDelta !== null ? weightDelta : ""
    row.comparison_delta_hba1c = hba1cDelta !== null ? hba1cDelta : ""
    row.comparison_delta_bp_systolic = bpSystolicDelta !== null ? bpSystolicDelta : ""
    row.comparison_delta_bp_diastolic = bpDiastolicDelta !== null ? bpDiastolicDelta : ""

    // Simple summary
    let summary = "No Change"
    if (
      hba1cDelta &&
      hba1cDelta < 0
    ) {
      summary = "Improved"
    } else if (hba1cDelta && hba1cDelta > 0) {
      summary = "Declined"
    }
    row.comparison_summary = summary
  } else {
    row.comparison_delta_weight_kg = ""
    row.comparison_delta_hba1c = ""
    row.comparison_delta_bp_systolic = ""
    row.comparison_delta_bp_diastolic = ""
    row.comparison_summary = ""
  }

  return row
}

/**
 * Build all rows in dynamic CSV format (one per patient)
 */
export function buildDynamicExportRows(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>
): DynamicExportRecord[] {
  if (patients.length === 0) {
    return []
  }

  // Analyze data to determine column counts
  const { maxFollowups, maxAdverseEventsPerFollowup } = analyzePatientData(
    patients,
    baselines,
    followUpData
  )

  // Build one row per patient
  const rows: DynamicExportRecord[] = []
  for (const patient of patients) {
    const baseline = baselines.get(patient.id) || null
    const followups = followUpData.get(patient.id) || []
    const row = buildDynamicPatientRow(patient, baseline, followups, maxFollowups, maxAdverseEventsPerFollowup)
    rows.push(row)
  }

  return rows
}

/**
 * Generate CSV content in dynamic format
 */
export function buildDynamicCsv(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>
): string {
  const rows = buildDynamicExportRows(patients, baselines, followUpData)
  if (rows.length === 0) {
    return ""
  }

  // Generate columns
  const { maxFollowups, maxAdverseEventsPerFollowup } = analyzePatientData(
    patients,
    baselines,
    followUpData
  )
  const columns = generateDynamicColumns(maxFollowups, maxAdverseEventsPerFollowup)

  // Build CSV
  const header = columns.map((col) => `"${col}"`).join(",")
  const body = rows
    .map((row) => columns.map((column) => escapeCsv(row[column])).join(","))
    .join("\n")
  return `${header}\n${body}`
}

/**
 * Download CSV in dynamic format
 */
export function downloadDynamicCsv(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>,
  filename: string
): void {
  const csv = buildDynamicCsv(patients, baselines, followUpData)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Download Excel in dynamic format
 */
export function downloadDynamicExcel(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>,
  filename: string
): void {
  const rows = buildDynamicExportRows(patients, baselines, followUpData)
  if (rows.length === 0) {
    return
  }

  const { maxFollowups, maxAdverseEventsPerFollowup } = analyzePatientData(
    patients,
    baselines,
    followUpData
  )
  const columns = generateDynamicColumns(maxFollowups, maxAdverseEventsPerFollowup)

  const headerHtml = columns.map((column) => `<th>${column}</th>`).join("")
  const rowsHtml = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${toPipeValue(row[column])}</td>`).join("")}</tr>`)
    .join("")

  const html = `\ufeff<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
