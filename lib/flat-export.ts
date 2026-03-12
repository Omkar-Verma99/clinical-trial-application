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
type GenericExportRecord = Record<string, unknown>

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

async function downloadXlsxWithBorders(columns: string[], rows: GenericExportRecord[], filename: string): Promise<void> {
  const excelModule = await import("exceljs")
  const WorkbookCtor = excelModule.Workbook
  const workbook = new WorkbookCtor()
  const worksheet = workbook.addWorksheet("Export")

  worksheet.addRow(columns)
  rows.forEach((row) => {
    worksheet.addRow(columns.map((column) => toPipeValue(row[column])))
  })

  worksheet.columns = columns.map((column) => ({
    header: column,
    key: column,
    width: Math.max(16, Math.min(40, column.length + 4)),
  }))

  const borderStyle = {
    top: { style: "thin" as const },
    left: { style: "thin" as const },
    bottom: { style: "thin" as const },
    right: { style: "thin" as const },
  }

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = borderStyle
      if (rowNumber === 1) {
        cell.font = { bold: true }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8EEF9" },
        }
      }
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".xlsx") ? filename : `${filename.replace(/\.[^.]+$/, "")}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
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
  const utf8Bom = "\uFEFF"
  const blob = new Blob([utf8Bom, csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadExcelFile(columns: string[], rows: ExportRecord[], filename: string): Promise<void> {
  await downloadXlsxWithBorders(columns, rows, filename)
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
export async function downloadDynamicExcel(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>,
  filename: string
): Promise<void> {
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

  await downloadXlsxWithBorders(columns, rows, filename)
}

function formatDateValue(value: unknown): string {
  if (!value) return ""
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().split("T")[0]
}

function yesNo(value: unknown): string {
  if (value === true) return "Yes"
  if (value === false) return "No"
  return ""
}

function joinSelectedOptions(
  value: unknown,
  labels: Record<string, string> = {},
  excludeKeys: string[] = []
): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ""
  return Object.entries(value as Record<string, unknown>)
    .filter(([key, flag]) => !excludeKeys.includes(key) && flag === true)
    .map(([key]) => labels[key] || key)
    .join(", ")
}

function joinOtherValue(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v)).join(", ")
  return String(value)
}

function numericDiff(current: unknown, baseline: unknown): string {
  const n1 = Number(current)
  const n2 = Number(baseline)
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) return ""
  return (n1 - n2).toFixed(2)
}

function getQaDynamicMaxCounts(
  patients: Patient[],
  followUpData: Map<string, FollowUpData[]>
): { maxFollowups: number; maxAes: number } {
  let maxFollowups = 0
  let maxAes = 0

  patients.forEach((patient) => {
    const followups = followUpData.get(patient.id) || []
    maxFollowups = Math.max(maxFollowups, followups.length)

    followups.forEach((followup) => {
      const aes = followup.adverseEvents || followup.adverseEventsStructured || []
      maxAes = Math.max(maxAes, aes.length)
    })
  })

  return { maxFollowups: Math.max(maxFollowups, 1), maxAes }
}

function buildQaDynamicColumns(maxFollowups: number, maxAes: number): string[] {
  const columns = [
    "Patient Code",
    "Study Site Code",
    "Doctor Name",
    "Baseline Visit Date (Patient Form)",
    "Age (Years)",
    "Gender",
    "Height (cm)",
    "Weight (kg) - Patient Form",
    "BMI",
    "Smoking Status",
    "Alcohol Intake",
    "Physical Activity Level",
    "Duration of Type 2 Diabetes (Years)",
    "Baseline Glycemic Severity",
    "Diabetes Complications (Selected)",
    "Comorbidities (Selected)",
    "CKD eGFR Category",
    "Comorbidities Other",
    "Previous Treatment Type",
    "Previous Drug Classes (Selected)",
    "Previous Drug Classes Other",
    "Reason for Triple FDC (Selected)",
    "Reason for Triple FDC Other",
    "Previous Therapy (Legacy)",
    "Baseline Visit Date (Baseline Form)",
    "Baseline HbA1c (%)",
    "Baseline FPG (mg/dL)",
    "Baseline PPG (mg/dL)",
    "Baseline Weight (kg)",
    "Baseline BP Systolic (mmHg)",
    "Baseline BP Diastolic (mmHg)",
    "Baseline Heart Rate (bpm)",
    "Baseline Serum Creatinine (mg/dL)",
    "Baseline eGFR (mL/min/1.73m2)",
    "Baseline Urinalysis",
    "Dose Prescribed",
    "Treatment Initiation Date",
    "Counseling Provided (Selected)",
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

  columns.push("Comparison vs Last Follow-up: HbA1c Change")
  columns.push("Comparison vs Last Follow-up: FPG Change")
  columns.push("Comparison vs Last Follow-up: PPG Change")
  columns.push("Comparison vs Last Follow-up: Weight Change")
  columns.push("Comparison vs Last Follow-up: BP Systolic Change")
  columns.push("Comparison vs Last Follow-up: BP Diastolic Change")
  columns.push("Comparison vs Last Follow-up: eGFR Change")

  return columns
}

function buildQaDynamicRow(
  patient: Patient,
  baseline: BaselineData | null,
  followups: FollowUpData[],
  doctorName: string,
  maxFollowups: number,
  maxAes: number
): GenericExportRecord {
  const row: GenericExportRecord = {}

  row["Patient Code"] = patient.patientCode || ""
  row["Study Site Code"] = patient.studySiteCode || ""
  row["Doctor Name"] = patient.investigatorName || doctorName || ""
  row["Baseline Visit Date (Patient Form)"] = formatDateValue(patient.baselineVisitDate)
  row["Age (Years)"] = patient.age ?? ""
  row["Gender"] = patient.gender || ""
  row["Height (cm)"] = patient.height ?? ""
  row["Weight (kg) - Patient Form"] = patient.weight ?? ""
  row["BMI"] = patient.bmi ?? ""
  row["Smoking Status"] = patient.smokingStatus || ""
  row["Alcohol Intake"] = patient.alcoholIntake || ""
  row["Physical Activity Level"] = patient.physicalActivityLevel || ""
  row["Duration of Type 2 Diabetes (Years)"] = patient.durationOfDiabetes ?? ""
  row["Baseline Glycemic Severity"] = patient.baselineGlycemicSeverity || ""
  row["Diabetes Complications (Selected)"] = joinSelectedOptions(patient.diabetesComplications, {
    neuropathy: "Neuropathy",
    retinopathy: "Retinopathy",
    nephropathy: "Nephropathy",
    cadOrStroke: "CAD/Stroke",
    none: "None",
  })
  row["Comorbidities (Selected)"] = joinSelectedOptions(
    patient.comorbidities,
    {
      hypertension: "Hypertension",
      dyslipidemia: "Dyslipidemia",
      obesity: "Obesity",
      ascvd: "ASCVD",
      heartFailure: "Heart Failure",
      chronicKidneyDisease: "Chronic Kidney Disease",
    },
    ["ckdEgfrCategory", "other"]
  )
  row["CKD eGFR Category"] = patient.comorbidities?.ckdEgfrCategory || ""
  row["Comorbidities Other"] = joinOtherValue(patient.comorbidities?.other)
  row["Previous Treatment Type"] = patient.previousTreatmentType || ""
  row["Previous Drug Classes (Selected)"] = joinSelectedOptions(
    patient.previousDrugClasses,
    {
      metformin: "Metformin",
      sulfonylurea: "Sulfonylurea",
      dpp4Inhibitor: "DPP4 Inhibitor",
      sglt2Inhibitor: "SGLT2 Inhibitor",
      tzd: "TZD",
      insulin: "Insulin",
    },
    ["other"]
  )
  row["Previous Drug Classes Other"] = joinOtherValue(patient.previousDrugClasses?.other)
  row["Reason for Triple FDC (Selected)"] = joinSelectedOptions(
    patient.reasonForTripleFDC,
    {
      inadequateGlycemicControl: "Inadequate Glycemic Control",
      weightConcerns: "Weight Concerns",
      hypoglycemiaOnPriorTherapy: "Hypoglycemia On Prior Therapy",
      highPillBurden: "High Pill Burden",
      poorAdherence: "Poor Adherence",
      costConsiderations: "Cost Considerations",
      physicianClinicalJudgment: "Physician Clinical Judgment",
    },
    ["other"]
  )
  row["Reason for Triple FDC Other"] = joinOtherValue(patient.reasonForTripleFDC?.other)
  row["Previous Therapy (Legacy)"] = joinOtherValue(patient.previousTherapy)

  row["Baseline Visit Date (Baseline Form)"] = formatDateValue(baseline?.baselineVisitDate)
  row["Baseline HbA1c (%)"] = baseline?.hba1c ?? ""
  row["Baseline FPG (mg/dL)"] = baseline?.fpg ?? ""
  row["Baseline PPG (mg/dL)"] = baseline?.ppg ?? ""
  row["Baseline Weight (kg)"] = baseline?.weight ?? ""
  row["Baseline BP Systolic (mmHg)"] = baseline?.bloodPressureSystolic ?? ""
  row["Baseline BP Diastolic (mmHg)"] = baseline?.bloodPressureDiastolic ?? ""
  row["Baseline Heart Rate (bpm)"] = baseline?.heartRate ?? ""
  row["Baseline Serum Creatinine (mg/dL)"] = baseline?.serumCreatinine ?? ""
  row["Baseline eGFR (mL/min/1.73m2)"] = baseline?.egfr ?? ""
  row["Baseline Urinalysis"] = baseline?.urinalysis || ""
  row["Dose Prescribed"] = baseline?.dosePrescribed || ""
  row["Treatment Initiation Date"] = formatDateValue(baseline?.treatmentInitiationDate)
  row["Counseling Provided (Selected)"] = joinSelectedOptions(baseline?.counseling, {
    dietAndLifestyle: "Diet and Lifestyle",
    hypoglycemiaAwareness: "Hypoglycemia Awareness",
    utiGenitialInfectionAwareness: "UTI/Genital Infection Awareness",
    hydrationAdvice: "Hydration Advice",
  })

  for (let i = 1; i <= maxFollowups; i += 1) {
    const fu = followups[i - 1]
    row[`Follow-up ${i} Visit Number`] = fu?.visitNumber ?? ""
    row[`Follow-up ${i} Visit Date`] = formatDateValue(fu?.visitDate)
    row[`Follow-up ${i} HbA1c (%)`] = fu?.hba1c ?? ""
    row[`Follow-up ${i} FPG (mg/dL)`] = fu?.fpg ?? ""
    row[`Follow-up ${i} PPG (mg/dL)`] = fu?.ppg ?? ""
    row[`Follow-up ${i} Weight (kg)`] = fu?.weight ?? ""
    row[`Follow-up ${i} BP Systolic (mmHg)`] = fu?.bloodPressureSystolic ?? ""
    row[`Follow-up ${i} BP Diastolic (mmHg)`] = fu?.bloodPressureDiastolic ?? ""
    row[`Follow-up ${i} Heart Rate (bpm)`] = fu?.heartRate ?? ""
    row[`Follow-up ${i} Serum Creatinine (mg/dL)`] = fu?.serumCreatinine ?? ""
    row[`Follow-up ${i} eGFR (mL/min/1.73m2)`] = fu?.egfr ?? ""
    row[`Follow-up ${i} Urinalysis`] = fu?.urinalysis || ""
    row[`Follow-up ${i} Glycemic Response Category`] = fu?.glycemicResponse?.category || ""
    row[`Follow-up ${i} Glycemic Response HbA1c Change`] = fu?.glycemicResponse?.hba1cChange ?? ""
    row[`Follow-up ${i} Glycemic Response HbA1c % Change`] = fu?.glycemicResponse?.hba1cPercentageChange ?? ""
    row[`Follow-up ${i} Outcome Weight Change`] = fu?.outcomes?.weightChange || ""
    row[`Follow-up ${i} Outcome BP Control Achieved`] = yesNo(fu?.outcomes?.bpControlAchieved)
    row[`Follow-up ${i} Outcome Renal`] = fu?.outcomes?.renalOutcome || ""
    row[`Follow-up ${i} Continuing Treatment`] = yesNo(fu?.adherence?.patientContinuingTreatment)
    row[`Follow-up ${i} Discontinuation Reason`] = fu?.adherence?.discontinuationReason || ""
    row[`Follow-up ${i} Discontinuation Reason Details`] = fu?.adherence?.discontinuationReasonOtherDetails || ""
    row[`Follow-up ${i} Missed Doses (Last 7 Days)`] = fu?.adherence?.missedDosesInLast7Days ?? ""
    row[`Follow-up ${i} Add-on/Changed Therapy`] = yesNo(fu?.adherence?.addOnOrChangedTherapy)
    row[`Follow-up ${i} Add-on/Changed Therapy Details`] = fu?.adherence?.addOnOrChangedTherapyDetails || ""
    row[`Follow-up ${i} Adverse Events Present`] = yesNo(fu?.adverseEventsPresent)
    row[`Follow-up ${i} Events of Special Interest (Selected)`] = joinSelectedOptions(
      fu?.eventsOfSpecialInterest,
      {
        hypoglycemiaMild: "Hypoglycemia Mild",
        hypoglycemiaModerate: "Hypoglycemia Moderate",
        hypoglycemiaSevere: "Hypoglycemia Severe",
        uti: "UTI",
        genitalMycoticInfection: "Genital Mycotic Infection",
        dizzinessDehydrationSymptoms: "Dizziness/Dehydration Symptoms",
        hospitalizationOrErVisit: "Hospitalization/ER Visit",
      },
      ["hospitalizationReason"]
    )
    row[`Follow-up ${i} Physician Overall Efficacy`] = fu?.physicianAssessment?.overallEfficacy || ""
    row[`Follow-up ${i} Physician Overall Tolerability`] = fu?.physicianAssessment?.overallTolerability || ""
    row[`Follow-up ${i} Physician Compliance Judgment`] = fu?.physicianAssessment?.complianceJudgment || ""
    row[`Follow-up ${i} Prefer KC MeSempa Long Term`] = yesNo(fu?.physicianAssessment?.preferKcMeSempaForLongTerm)
    row[`Follow-up ${i} Preferred Patient Profiles (Selected)`] = joinSelectedOptions(
      fu?.physicianAssessment?.preferredPatientProfiles,
      {
        uncontrolledT2dm: "Uncontrolled T2DM",
        obeseT2dm: "Obese T2DM",
        ckdPatients: "CKD Patients",
        htnPlusT2dm: "HTN + T2DM",
        elderlyPatients: "Elderly Patients",
      }
    )
    row[`Follow-up ${i} Data Privacy Confirmations (Selected)`] = joinSelectedOptions(
      fu?.dataPrivacy,
      {
        noPersonalIdentifiersRecorded: "No Personal Identifiers Recorded",
        dataCollectedAsRoutineClinicalPractice: "Data Collected As Routine Clinical Practice",
        patientIdentityMappingAtClinicOnly: "Patient Identity Mapping At Clinic Only",
      }
    )
    row[`Follow-up ${i} Physician Qualification`] = fu?.physicianDeclaration?.qualification || ""
    row[`Follow-up ${i} Clinic/Hospital Name`] = fu?.physicianDeclaration?.clinicHospitalName || ""
    row[`Follow-up ${i} Physician Declaration Confirmed`] = yesNo(fu?.physicianDeclaration?.confirmationCheckbox)
    row[`Follow-up ${i} Signature Method`] = fu?.physicianDeclaration?.signatureMethod || ""
    row[`Follow-up ${i} Signature Date`] = formatDateValue(fu?.physicianDeclaration?.signatureDate)
    row[`Follow-up ${i} Comments`] = fu?.comments || ""

    const aes = fu?.adverseEvents || fu?.adverseEventsStructured || []
    for (let j = 1; j <= maxAes; j += 1) {
      const ae = aes[j - 1]
      row[`Follow-up ${i} Adverse Event ${j} Term`] = ae?.aeTerm || ""
      row[`Follow-up ${i} Adverse Event ${j} Onset Date`] = formatDateValue(ae?.onsetDate)
      row[`Follow-up ${i} Adverse Event ${j} Stop Date`] = formatDateValue(ae?.stopDate)
      row[`Follow-up ${i} Adverse Event ${j} Severity`] = ae?.severity || ""
      row[`Follow-up ${i} Adverse Event ${j} Serious`] = ae?.serious || ""
      row[`Follow-up ${i} Adverse Event ${j} Action Taken`] = ae?.actionTaken || ""
      row[`Follow-up ${i} Adverse Event ${j} Action Taken Other`] = ae?.actionTakenOther || ""
      row[`Follow-up ${i} Adverse Event ${j} Outcome`] = ae?.outcome || ""
    }
  }

  const lastFollowup = followups.length > 0 ? followups[followups.length - 1] : null
  row["Comparison vs Last Follow-up: HbA1c Change"] = lastFollowup ? numericDiff(lastFollowup.hba1c, baseline?.hba1c) : ""
  row["Comparison vs Last Follow-up: FPG Change"] = lastFollowup ? numericDiff(lastFollowup.fpg, baseline?.fpg) : ""
  row["Comparison vs Last Follow-up: PPG Change"] = lastFollowup ? numericDiff(lastFollowup.ppg, baseline?.ppg) : ""
  row["Comparison vs Last Follow-up: Weight Change"] = lastFollowup ? numericDiff(lastFollowup.weight, baseline?.weight) : ""
  row["Comparison vs Last Follow-up: BP Systolic Change"] = lastFollowup
    ? numericDiff(lastFollowup.bloodPressureSystolic, baseline?.bloodPressureSystolic)
    : ""
  row["Comparison vs Last Follow-up: BP Diastolic Change"] = lastFollowup
    ? numericDiff(lastFollowup.bloodPressureDiastolic, baseline?.bloodPressureDiastolic)
    : ""
  row["Comparison vs Last Follow-up: eGFR Change"] = lastFollowup ? numericDiff(lastFollowup.egfr, baseline?.egfr) : ""

  return row
}

export function buildQuestionAnswerDynamicExport(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>,
  doctorNamesByPatientId?: Map<string, string>
): { columns: string[]; rows: GenericExportRecord[] } {
  const { maxFollowups, maxAes } = getQaDynamicMaxCounts(patients, followUpData)
  const columns = buildQaDynamicColumns(maxFollowups, maxAes)

  const rows = patients.map((patient) =>
    buildQaDynamicRow(
      patient,
      baselines.get(patient.id) || null,
      followUpData.get(patient.id) || [],
      doctorNamesByPatientId?.get(patient.id) || "",
      maxFollowups,
      maxAes
    )
  )

  return { columns, rows }
}

export function downloadQuestionAnswerDynamicCsv(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>,
  filename: string,
  doctorNamesByPatientId?: Map<string, string>
): void {
  const { columns, rows } = buildQuestionAnswerDynamicExport(
    patients,
    baselines,
    followUpData,
    doctorNamesByPatientId
  )
  downloadCsvFile(columns, rows, filename)
}

export async function downloadQuestionAnswerDynamicExcel(
  patients: Patient[],
  baselines: Map<string, BaselineData | null>,
  followUpData: Map<string, FollowUpData[]>,
  filename: string,
  doctorNamesByPatientId?: Map<string, string>
): Promise<void> {
  const { columns, rows } = buildQuestionAnswerDynamicExport(
    patients,
    baselines,
    followUpData,
    doctorNamesByPatientId
  )
  await downloadXlsxWithBorders(columns, rows, filename)
}
