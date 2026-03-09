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
