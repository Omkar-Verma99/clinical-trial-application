import jsPDF from "jspdf"
import type { Patient, BaselineData, FollowUpData, Doctor } from "./types"

function addSectionHeading(doc: jsPDF, heading: string, yPos: number, margin: number, pageWidth: number): number {
  if (yPos > margin) yPos += 2
  doc.setFillColor(41, 128, 185)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 7, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(heading, margin + 2, yPos + 4.5)
  doc.setTextColor(0, 0, 0)
  return yPos + 10
}

function drawKeyValue(doc: jsPDF, key: string, value: any, yPos: number, margin: number, col1Width: number, col2Start: number): number {
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(41, 128, 185)
  doc.text(key, margin, yPos)
  
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  const displayValue = value === true ? "☑ Yes" : value === false ? "☐ No" : (value?.toString() || "—")
  doc.text(displayValue, col2Start, yPos)
  return yPos + 4
}

function drawCheckbox(doc: jsPDF, label: string, checked: boolean, yPos: number, col2Start: number): number {
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const checkbox = checked ? "☑" : "☐"
  doc.text(`${checkbox} ${label}`, col2Start, yPos)
  return yPos + 3.5
}

export async function generatePatientPDF(
  patient: Patient,
  baseline: BaselineData | null,
  followUp: FollowUpData | null,
  followUps?: FollowUpData[],
  doctor?: Doctor
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  let yPos = margin
  const today = new Date()
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`
  
  const col1Width = 45
  const col2Start = margin + col1Width + 3

  // ===== HEADER WITH LOGO =====
  doc.setFillColor(25, 100, 165)
  doc.rect(0, 0, pageWidth, 32, "F")
  
  // Logo box
  doc.setFillColor(41, 128, 185)
  doc.rect(margin, 4, 10, 10, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("KC", margin + 2, 10)
  
  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("KC MeSempa - RWE Study", margin + 15, 9)
  
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Case Record Form (CRF) - Complete Patient Assessment", pageWidth / 2, 18, { align: "center" })
  doc.text(`Patient: ${patient.patientCode} | Generated: ${dateStr}`, pageWidth / 2, 24, { align: "center" })
  
  doc.setTextColor(0, 0, 0)
  yPos = 36

  // ===== SECTION 1: PATIENT IDENTIFICATION & DEMOGRAPHICS =====
  yPos = addSectionHeading(doc, "1. PATIENT IDENTIFICATION & DEMOGRAPHICS", yPos, margin, pageWidth)
  yPos = drawKeyValue(doc, "Patient Code:", patient.patientCode, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Study Site:", patient.studySiteCode, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Investigator:", patient.investigatorName || doctor?.name || "—", yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Baseline Date:", patient.baselineVisitDate, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Age (years):", patient.age, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Gender:", patient.gender, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Height (cm):", patient.height, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Weight (kg):", patient.weight, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "BMI (kg/m²):", patient.bmi, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Smoking:", patient.smokingStatus, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Alcohol:", patient.alcoholIntake, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Physical Activity:", patient.physicalActivityLevel, yPos, margin, col1Width, col2Start)
  yPos += 2

  // ===== SECTION 2: DIABETES HISTORY =====
  if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
  yPos = addSectionHeading(doc, "2. DIABETES HISTORY & CLINICAL PHENOTYPE", yPos, margin, pageWidth)
  yPos = drawKeyValue(doc, "Duration (years):", patient.durationOfDiabetes, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Baseline Severity:", patient.baselineGlycemicSeverity, yPos, margin, col1Width, col2Start)
  yPos = drawKeyValue(doc, "Previous Treatment:", patient.previousTreatmentType, yPos, margin, col1Width, col2Start)
  
  // Complications
  if (patient.diabetesComplications) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Complications:", margin, yPos)
    yPos += 3.5
    doc.setFont("helvetica", "normal")
    if (patient.diabetesComplications.neuropathy) yPos = drawCheckbox(doc, "Neuropathy", true, yPos, col2Start)
    if (patient.diabetesComplications.retinopathy) yPos = drawCheckbox(doc, "Retinopathy", true, yPos, col2Start)
    if (patient.diabetesComplications.nephropathy) yPos = drawCheckbox(doc, "Nephropathy", true, yPos, col2Start)
    if (patient.diabetesComplications.cadOrStroke) yPos = drawCheckbox(doc, "CAD/Stroke", true, yPos, col2Start)
  }
  yPos += 2

  // ===== SECTION 3: COMORBIDITIES =====
  if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
  yPos = addSectionHeading(doc, "3. COMORBIDITIES", yPos, margin, pageWidth)
  if (patient.comorbidities) {
    doc.setFont("helvetica", "normal")
    if (patient.comorbidities.hypertension) yPos = drawCheckbox(doc, "Hypertension", true, yPos, col2Start)
    if (patient.comorbidities.dyslipidemia) yPos = drawCheckbox(doc, "Dyslipidemia", true, yPos, col2Start)
    if (patient.comorbidities.obesity) yPos = drawCheckbox(doc, "Obesity", true, yPos, col2Start)
    if (patient.comorbidities.ascvd) yPos = drawCheckbox(doc, "ASCVD", true, yPos, col2Start)
    if (patient.comorbidities.heartFailure) yPos = drawCheckbox(doc, "Heart Failure", true, yPos, col2Start)
    if (patient.comorbidities.chronicKidneyDisease) yPos = drawCheckbox(doc, "Chronic Kidney Disease", true, yPos, col2Start)
    if (patient.comorbidities.ckdEgfrCategory) yPos = drawKeyValue(doc, "CKD eGFR Category:", patient.comorbidities.ckdEgfrCategory, yPos, margin, col1Width, col2Start)
  }
  yPos += 2

  // ===== SECTION 4: PRIOR ANTI-DIABETIC THERAPY =====
  if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
  yPos = addSectionHeading(doc, "4. PRIOR ANTI-DIABETIC THERAPY", yPos, margin, pageWidth)
  if (patient.previousDrugClasses) {
    doc.setFont("helvetica", "normal")
    if (patient.previousDrugClasses.metformin) yPos = drawCheckbox(doc, "Metformin", true, yPos, col2Start)
    if (patient.previousDrugClasses.sulfonylurea) yPos = drawCheckbox(doc, "Sulfonylurea", true, yPos, col2Start)
    if (patient.previousDrugClasses.dpp4Inhibitor) yPos = drawCheckbox(doc, "DPP4 Inhibitor", true, yPos, col2Start)
    if (patient.previousDrugClasses.sglt2Inhibitor) yPos = drawCheckbox(doc, "SGLT2 Inhibitor", true, yPos, col2Start)
    if (patient.previousDrugClasses.tzd) yPos = drawCheckbox(doc, "TZD", true, yPos, col2Start)
    if (patient.previousDrugClasses.insulin) yPos = drawCheckbox(doc, "Insulin", true, yPos, col2Start)
  }
  yPos += 2

  // ===== SECTION 5: REASON FOR KC MESEMPA =====
  if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
  yPos = addSectionHeading(doc, "5. REASON FOR KC MESEMPA INITIATION", yPos, margin, pageWidth)
  if (patient.reasonForTripleFDC) {
    doc.setFont("helvetica", "normal")
    if (patient.reasonForTripleFDC.inadequateGlycemicControl) yPos = drawCheckbox(doc, "Inadequate Glycemic Control", true, yPos, col2Start)
    if (patient.reasonForTripleFDC.weightConcerns) yPos = drawCheckbox(doc, "Weight Concerns", true, yPos, col2Start)
    if (patient.reasonForTripleFDC.hypoglycemiaOnPriorTherapy) yPos = drawCheckbox(doc, "Hypoglycemia on Prior Therapy", true, yPos, col2Start)
    if (patient.reasonForTripleFDC.highPillBurden) yPos = drawCheckbox(doc, "High Pill Burden", true, yPos, col2Start)
    if (patient.reasonForTripleFDC.poorAdherence) yPos = drawCheckbox(doc, "Poor Adherence", true, yPos, col2Start)
    if (patient.reasonForTripleFDC.costConsiderations) yPos = drawCheckbox(doc, "Cost Considerations", true, yPos, col2Start)
    if (patient.reasonForTripleFDC.physicianClinicalJudgment) yPos = drawCheckbox(doc, "Physician Clinical Judgment", true, yPos, col2Start)
  }
  yPos += 2

  // ===== BASELINE ASSESSMENT =====
  if (baseline) {
    if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
    yPos = addSectionHeading(doc, "6. BASELINE ASSESSMENT (WEEK 0)", yPos, margin, pageWidth)
    yPos = drawKeyValue(doc, "Baseline Date:", patient.baselineVisitDate, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "HbA1c (%):", baseline.hba1c, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "FPG (mg/dL):", baseline.fpg, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "PPG (mg/dL):", baseline.ppg, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Weight (kg):", baseline.weight, yPos, margin, col1Width, col2Start)
    const bpBaseline = baseline.bloodPressureSystolic ? `${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}` : "—"
    yPos = drawKeyValue(doc, "Blood Pressure:", bpBaseline, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Heart Rate (bpm):", baseline.heartRate, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Serum Creatinine:", baseline.serumCreatinine, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "eGFR (mL/min):", baseline.egfr, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Urinalysis:", baseline.urinalysis, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Dose Prescribed:", baseline.dosePrescribed, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Initiation Date:", baseline.treatmentInitiationDate, yPos, margin, col1Width, col2Start)
    
    // Counseling
    if (baseline.counseling) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Counselling Provided:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      if (baseline.counseling.dietAndLifestyle) yPos = drawCheckbox(doc, "Diet & Lifestyle", true, yPos, col2Start)
      if (baseline.counseling.hypoglycemiaAwareness) yPos = drawCheckbox(doc, "Hypoglycemia Awareness", true, yPos, col2Start)
      if (baseline.counseling.utiGenitialInfectionAwareness) yPos = drawCheckbox(doc, "UTI/Genital Infection", true, yPos, col2Start)
      if (baseline.counseling.hydrationAdvice) yPos = drawCheckbox(doc, "Hydration Advice", true, yPos, col2Start)
    }
    yPos += 2
  }

  // ===== FOLLOW-UP ASSESSMENTS (DYNAMIC) =====
  const visitsToShow = (followUps && followUps.length > 0) ? followUps : (followUp ? [followUp] : [])
  
  visitsToShow.forEach((visit, visitIndex) => {
    if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
    yPos = addSectionHeading(doc, `7.${visitIndex + 1} FOLLOW-UP VISIT ${visitIndex + 1} ASSESSMENT`, yPos, margin, pageWidth)
    yPos = drawKeyValue(doc, "Visit Date:", visit.visitDate, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "HbA1c (%):", visit.hba1c, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "FPG (mg/dL):", visit.fpg, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "PPG (mg/dL):", visit.ppg, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Weight (kg):", visit.weight, yPos, margin, col1Width, col2Start)
    const bpVisit = visit.bloodPressureSystolic ? `${visit.bloodPressureSystolic}/${visit.bloodPressureDiastolic}` : "—"
    yPos = drawKeyValue(doc, "Blood Pressure:", bpVisit, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Heart Rate (bpm):", visit.heartRate, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Serum Creatinine:", visit.serumCreatinine, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "eGFR (mL/min):", visit.egfr, yPos, margin, col1Width, col2Start)
    yPos = drawKeyValue(doc, "Urinalysis:", visit.urinalysis, yPos, margin, col1Width, col2Start)
    
    // Glycemic Response
    if (visit.glycemicResponse) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Glycemic Response Category:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      yPos = drawKeyValue(doc, "Category:", visit.glycemicResponse.category, yPos, margin, col1Width, col2Start)
      if (visit.glycemicResponse.hba1cChange !== null) yPos = drawKeyValue(doc, "HbA1c Change (%):", visit.glycemicResponse.hba1cChange.toFixed(2), yPos, margin, col1Width, col2Start)
    }

    // Outcomes
    if (visit.outcomes) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Outcomes:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      yPos = drawKeyValue(doc, "Weight Change:", visit.outcomes.weightChange, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "BP Control Achieved:", visit.outcomes.bpControlAchieved, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Renal Outcome:", visit.outcomes.renalOutcome, yPos, margin, col1Width, col2Start)
    }

    // Adherence
    if (visit.adherence) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Adherence & Durability:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      yPos = drawKeyValue(doc, "Continuing Treatment:", visit.adherence.patientContinuingTreatment, yPos, margin, col1Width, col2Start)
      if (!visit.adherence.patientContinuingTreatment) yPos = drawKeyValue(doc, "Discontinuation Reason:", visit.adherence.discontinuationReason, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Missed Doses (7d):", visit.adherence.missedDosesInLast7Days, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Add-on/Changed Therapy:", visit.adherence.addOnOrChangedTherapy, yPos, margin, col1Width, col2Start)
    }

    // Safety Events
    if (visit.eventsOfSpecialInterest) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Adverse Events/Safety:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      if (visit.eventsOfSpecialInterest.hypoglycemiaMild) yPos = drawCheckbox(doc, "Mild Hypoglycemia", true, yPos, col2Start)
      if (visit.eventsOfSpecialInterest.hypoglycemiaModerate) yPos = drawCheckbox(doc, "Moderate Hypoglycemia", true, yPos, col2Start)
      if (visit.eventsOfSpecialInterest.hypoglycemiaSevere) yPos = drawCheckbox(doc, "Severe Hypoglycemia", true, yPos, col2Start)
      if (visit.eventsOfSpecialInterest.uti) yPos = drawCheckbox(doc, "UTI", true, yPos, col2Start)
      if (visit.eventsOfSpecialInterest.genitalMycoticInfection) yPos = drawCheckbox(doc, "Genital Infection", true, yPos, col2Start)
      if (visit.eventsOfSpecialInterest.dizzinessDehydrationSymptoms) yPos = drawCheckbox(doc, "Dizziness/Dehydration", true, yPos, col2Start)
      if (visit.eventsOfSpecialInterest.hospitalizationOrErVisit) yPos = drawCheckbox(doc, "Hospitalization/ER Visit", true, yPos, col2Start)
    }

    // Physician Assessment
    if (visit.physicianAssessment) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Physician Assessment:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      yPos = drawKeyValue(doc, "Overall Efficacy:", visit.physicianAssessment.overallEfficacy, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Overall Tolerability:", visit.physicianAssessment.overallTolerability, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Compliance Judgment:", visit.physicianAssessment.complianceJudgment, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Prefer Long-term:", visit.physicianAssessment.preferKcMeSempaForLongTerm, yPos, margin, col1Width, col2Start)
    }

    // Patient Reported Outcomes
    if (visit.patientReportedOutcomes) {
      yPos += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Patient Reported Outcomes:", margin, yPos)
      yPos += 3
      doc.setFont("helvetica", "normal")
      yPos = drawKeyValue(doc, "Overall Satisfaction:", visit.patientReportedOutcomes.overallSatisfaction, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "GI Tolerance:", visit.patientReportedOutcomes.giToleranceVsPriorTherapy, yPos, margin, col1Width, col2Start)
      yPos = drawKeyValue(doc, "Diabetes Confidence:", visit.patientReportedOutcomes.confidenceInManagingDiabetes, yPos, margin, col1Width, col2Start)
    }

    yPos += 2
  })

  // ===== DATA PRIVACY & CONFIDENTIALITY =====
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin }
  yPos = addSectionHeading(doc, "8. DATA PRIVACY & CONFIDENTIALITY", yPos, margin, pageWidth)
  doc.setFont("helvetica", "normal")
  yPos = drawCheckbox(doc, "No personal identifiers recorded", baseline?.dataPrivacy?.noPersonalIdentifiersRecorded || false, yPos, col2Start)
  yPos = drawCheckbox(doc, "Data collected as routine clinical practice", baseline?.dataPrivacy?.dataCollectedAsRoutineClinicalPractice || false, yPos, col2Start)
  yPos = drawCheckbox(doc, "Patient identity mapping at clinic only", baseline?.dataPrivacy?.patientIdentityMappingAtClinicOnly || false, yPos, col2Start)
  yPos += 3

  // ===== PHYSICIAN DECLARATION & SIGNATURE =====
  if (yPos > pageHeight - 50) { doc.addPage(); yPos = margin }
  yPos = addSectionHeading(doc, "9. PHYSICIAN DECLARATION & CERTIFICATION", yPos, margin, pageWidth)
  
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("I confirm that the information provided in this Case Record Form is accurate and complete to the best of my knowledge.", margin, yPos)
  yPos += 8
  
  doc.setFont("helvetica", "bold")
  doc.text("Physician Name:", margin, yPos)
  yPos += 5
  doc.setDrawColor(100, 100, 100)
  doc.setLineWidth(0.3)
  doc.line(col2Start, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 3
  
  doc.setFont("helvetica", "bold")
  doc.text("Qualification:", margin, yPos)
  yPos += 5
  doc.line(col2Start, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 5
  
  doc.setFont("helvetica", "bold")
  doc.text("Date:", margin, yPos)
  doc.text(dateStr, col2Start, yPos)
  yPos += 8
  
  doc.setFont("helvetica", "bold")
  doc.text("Signature:", margin, yPos)
  yPos += 8
  doc.line(col2Start, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 5
  
  doc.setFont("helvetica", "bold")
  doc.text("Stamp/Seal:", margin, yPos)
  yPos += 8
  doc.rect(col2Start, yPos - 5, 40, 15)
  
  // ===== FOOTER =====
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated: ${dateStr} | Patient: ${patient.patientCode}`, margin, pageHeight - 5)
  doc.setTextColor(0, 0, 0)

  return doc
}

export async function downloadPatientPDF(
  patient: Patient,
  baseline: BaselineData | null,
  followUp: FollowUpData | null,
  followUps?: FollowUpData[],
  doctor?: Doctor
) {
  try {
    const doc = await generatePatientPDF(patient, baseline, followUp, followUps, doctor)
    doc.save(`CRF_${patient.patientCode}_${new Date().toISOString().split("T")[0]}.pdf`)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw error
  }
}

export function downloadCSV(patient: Patient, baseline: BaselineData | null, followUp: FollowUpData | null, doctor?: any): void {
  let csv = "Kollectcare - CRF Clinical Trial Report\n"
  csv += `Generated: ${new Date().toLocaleDateString()}\n\n`
  
  if (doctor) {
    csv += `Investigator,${doctor.name}\n`
    csv += `Registration,${doctor.registrationNumber || "N/A"}\n\n`
  }
  
  csv += "PATIENT INFORMATION\n"
  csv += `Patient Code,${patient.patientCode}\n`
  csv += `Age,${patient.age}\n`
  csv += `Gender,${patient.gender}\n`
  csv += `Duration of Diabetes,${patient.durationOfDiabetes} years\n\n`
  
  if (baseline) {
    csv += "BASELINE DATA\n"
    csv += `HbA1c,%,${baseline.hba1c}\n`
    csv += `FPG,mg/dL,${baseline.fpg}\n`
    csv += `Weight,kg,${baseline.weight}\n`
    csv += `Blood Pressure,mmHg,${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}\n\n`
  }
  
  if (followUp) {
    csv += "FOLLOW-UP DATA\n"
    csv += `HbA1c,%,${followUp.hba1c}\n`
    csv += `FPG,mg/dL,${followUp.fpg}\n`
    csv += `Weight,kg,${followUp.weight}\n`
    csv += `Blood Pressure,mmHg,${followUp.bloodPressureSystolic}/${followUp.bloodPressureDiastolic}\n`
  }
  
  const blob = new Blob([csv], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `CRF_${patient.patientCode}_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

export function downloadExcel(patient: Patient, baseline: BaselineData | null, followUp: FollowUpData | null, doctor?: any): void {
  let tsv = "Kollectcare CRF Data Export\n"
  tsv += `Generated\t${new Date().toLocaleDateString()}\n\n`
  
  tsv += "PATIENT INFORMATION\n"
  tsv += `Patient Code\t${patient.patientCode}\n`
  tsv += `Age\t${patient.age}\n`
  tsv += `Gender\t${patient.gender}\n`
  tsv += `Duration of Diabetes\t${patient.durationOfDiabetes} years\n\n`
  
  if (baseline) {
    tsv += "BASELINE DATA\n"
    tsv += `HbA1c\t${baseline.hba1c}%\n`
    tsv += `FPG\t${baseline.fpg} mg/dL\n`
    tsv += `Weight\t${baseline.weight} kg\n`
  }
  
  if (followUp) {
    tsv += "\nFOLLOW-UP DATA\n"
    tsv += `HbA1c\t${followUp.hba1c}%\n`
    tsv += `FPG\t${followUp.fpg} mg/dL\n`
    tsv += `Weight\t${followUp.weight} kg\n`
  }
  
  const blob = new Blob([tsv], { type: "application/vnd.ms-excel" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `CRF_${patient.patientCode}_${new Date().toISOString().split("T")[0]}.xlsx`
  a.click()
  window.URL.revokeObjectURL(url)
}
