import jsPDF from "jspdf"
import type { Patient, BaselineData, FollowUpData, Doctor } from "./types"

// Helper function to add a section heading with professional styling
function addSectionHeading(
  doc: jsPDF,
  heading: string,
  yPos: number,
  margin: number,
  pageWidth: number
): number {
  if (yPos > margin) yPos += 3
  
  // Add subtle top border
  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(0.8)
  doc.line(margin, yPos - 1, pageWidth - margin, yPos - 1)
  
  // Blue background with gradient effect
  doc.setFillColor(41, 128, 185)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F")
  
  // White text with bold font
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(heading, margin + 4, yPos + 5.5)
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  
  return yPos + 12
}

// Helper function for a cleaner two-column key-value layout with better styling
function drawKeyValuePair(
  doc: jsPDF,
  key: string,
  value: string | number | boolean | undefined | null,
  yPos: number,
  margin: number,
  col1Width: number,
  col2Start: number,
  pageWidth?: number
): number {
  pageWidth = pageWidth || 210
  
  // Alternating light background for readability
  const isAlternate = Math.floor((yPos - margin) / 5) % 2 === 0
  if (isAlternate) {
    doc.setFillColor(245, 245, 245)
    doc.rect(margin - 1, yPos - 3.5, pageWidth - 2 * margin + 2, 5, "F")
  }
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(41, 128, 185)
  doc.text(key, margin + 1, yPos)
  
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  
  let displayValue = ""
  if (value === true) displayValue = "Yes"
  else if (value === false) displayValue = "No"
  else displayValue = value?.toString() || "____________________"
  
  // Wrap long values
  const maxWidth = pageWidth - col2Start - margin - 2
  const wrapped = doc.splitTextToSize(displayValue, maxWidth)
  doc.text(wrapped, col2Start, yPos)
  
  const lineHeight = wrapped.length > 1 ? wrapped.length * 3.5 + 2 : 5
  return yPos + lineHeight
}

export async function generatePatientPDF(
  patient: Patient,
  baseline: BaselineData | null,
  followUp: FollowUpData | null,
  followUps?: FollowUpData[],
  doctor?: Doctor
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 12
  let yPosition = margin
  const currentDate = new Date()
  const formattedDate = `${String(currentDate.getDate()).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}`

  const col1Width = 55
  const col2Start = margin + col1Width + 5

  // ===== PROFESSIONAL HEADER WITH ENHANCED DESIGN =====
  // Top accent stripe
  doc.setFillColor(230, 126, 34)
  doc.rect(0, 0, pageWidth, 3, "F")
  
  // Main blue background
  doc.setFillColor(25, 100, 165)
  doc.rect(0, 3, pageWidth, 48, "F")
  
  // Left colored box for logo area
  doc.setFillColor(41, 128, 185)
  doc.rect(margin - 2, 8, 15, 15, "F")
  
  // Logo circle placeholder in white
  doc.setFillColor(255, 255, 255)
  doc.circle(margin + 5.5, 15.5, 6.5)
  
  // Company name and header text in white
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont("helvetica", "bold")
  doc.text("KC MeSempa", margin + 20, 16)
  
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text("Real-World Evidence Study", margin + 20, 22)
  
  // Subtitle and document info
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("CASE RECORD FORM - Complete Patient Assessment", pageWidth / 2, 29, { align: "center" })
  
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.text(`Patient Code: ${patient.patientCode} | Generated: ${formattedDate}`, pageWidth / 2, 34, { align: "center" })
  
  // Bottom accent line
  doc.setFillColor(230, 126, 34)
  doc.rect(0, 50, pageWidth, 1.5, "F")
  
  doc.setTextColor(0, 0, 0)
  yPosition = 54

  // ===== PATIENT IDENTIFICATION =====
  yPosition = addSectionHeading(doc, "PATIENT IDENTIFICATION", yPosition, margin, pageWidth)
  yPosition = drawKeyValuePair(doc, "Patient Code:", patient.patientCode, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Study Site Code:", patient.studySiteCode, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Investigator Name:", patient.investigatorName || doctor?.name, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Baseline Visit Date:", patient.baselineVisitDate, yPosition, margin, col1Width, col2Start)
  yPosition += 3

  // ===== DEMOGRAPHICS & LIFESTYLE =====
  if (yPosition > pageHeight - 80) { doc.addPage(); yPosition = margin }
  yPosition = addSectionHeading(doc, "DEMOGRAPHICS & LIFESTYLE", yPosition, margin, pageWidth)
  yPosition = drawKeyValuePair(doc, "Age (years):", patient.age, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Gender:", patient.gender, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Height (cm):", patient.height, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Weight (kg):", patient.weight, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "BMI (kg/m²):", patient.bmi, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Smoking Status:", patient.smokingStatus, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Alcohol Intake:", patient.alcoholIntake, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Physical Activity:", patient.physicalActivityLevel, yPosition, margin, col1Width, col2Start)
  yPosition += 3

  // ===== DIABETES HISTORY & PHENOTYPE =====
  if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
  yPosition = addSectionHeading(doc, "DIABETES HISTORY & PHENOTYPE", yPosition, margin, pageWidth)
  yPosition = drawKeyValuePair(doc, "Duration (years):", patient.durationOfDiabetes, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Baseline Severity:", patient.baselineGlycemicSeverity, yPosition, margin, col1Width, col2Start)
  
  // Complications
  doc.setFont("helvetica", "bold")
  doc.text("Complications:", margin, yPosition)
  doc.setFont("helvetica", "normal")
  const complications = patient.diabetesComplications
    ? Object.entries(patient.diabetesComplications)
        .filter(([, v]) => v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(", ")
    : "None"
  doc.text(complications || "None", col2Start, yPosition)
  yPosition += 5
  yPosition += 3

  // ===== COMORBIDITIES =====
  if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
  yPosition = addSectionHeading(doc, "COMORBIDITIES", yPosition, margin, pageWidth)
  
  const comorbidities = patient.comorbidities
    ? Object.entries(patient.comorbidities)
        .filter(([k, v]) => k !== "other" && k !== "ckdEgfrCategory" && v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(", ")
    : "None"
  doc.setFont("helvetica", "bold")
  doc.text("Present Conditions:", margin, yPosition)
  doc.setFont("helvetica", "normal")
  const wrapped = doc.splitTextToSize(comorbidities || "None", pageWidth - 2 * margin - col1Width)
  doc.text(wrapped, col2Start, yPosition)
  yPosition += wrapped.length * 4 + 2

  if (patient.comorbidities?.ckdEgfrCategory) {
    yPosition = drawKeyValuePair(doc, "CKD eGFR Category:", patient.comorbidities.ckdEgfrCategory, yPosition, margin, col1Width, col2Start)
  }

  if (patient.comorbidities?.other && patient.comorbidities.other.length > 0) {
    const otherComorb = patient.comorbidities.other.join(", ")
    yPosition = drawKeyValuePair(doc, "Other Comorbidities:", otherComorb, yPosition, margin, col1Width, col2Start)
  }
  yPosition += 3

  // ===== PRIOR ANTI-DIABETIC THERAPY =====
  if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
  yPosition = addSectionHeading(doc, "PRIOR ANTI-DIABETIC THERAPY", yPosition, margin, pageWidth)
  yPosition = drawKeyValuePair(doc, "Previous Treatment:", patient.previousTreatmentType, yPosition, margin, col1Width, col2Start)
  
  if (patient.previousDrugClasses) {
    const drugClasses = Object.entries(patient.previousDrugClasses)
      .filter(([k, v]) => k !== "other" && v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
      .join(", ")
    doc.setFont("helvetica", "bold")
    doc.text("Drug Classes:", margin, yPosition)
    doc.setFont("helvetica", "normal")
    doc.text(drugClasses || "None", col2Start, yPosition)
    yPosition += 5

    if (patient.previousDrugClasses.other && patient.previousDrugClasses.other.length > 0) {
      const otherDrugs = patient.previousDrugClasses.other.join(", ")
      yPosition = drawKeyValuePair(doc, "Other Drug Classes:", otherDrugs, yPosition, margin, col1Width, col2Start)
    }
  }

  if (patient.reasonForTripleFDC) {
    const reasons = Object.entries(patient.reasonForTripleFDC)
      .filter(([k, v]) => k !== "other" && v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1"))
      .join(", ")
    doc.setFont("helvetica", "bold")
    doc.text("Reason for KC MeSempa:", margin, yPosition)
    doc.setFont("helvetica", "normal")
    doc.text(reasons || "None", col2Start, yPosition)
    yPosition += 5

    if (patient.reasonForTripleFDC.other && patient.reasonForTripleFDC.other.length > 0) {
      const otherReasons = patient.reasonForTripleFDC.other.join(", ")
      yPosition = drawKeyValuePair(doc, "Other Reasons:", otherReasons, yPosition, margin, col1Width, col2Start)
    }
  }
  yPosition += 3

  // ===== BASELINE CLINICAL & LAB PARAMETERS =====
  if (baseline) {
    if (yPosition > pageHeight - 80) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "BASELINE CLINICAL & LAB PARAMETERS (WEEK 0)", yPosition, margin, pageWidth)
    
    yPosition = drawKeyValuePair(doc, "HbA1c (%):", baseline.hba1c, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "FPG (mg/dL):", baseline.fpg, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "PPG (mg/dL):", baseline.ppg, yPosition, margin, col1Width, col2Start)
    
    const bpBaseline = baseline.bloodPressureSystolic ? `${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}` : ""
    yPosition = drawKeyValuePair(doc, "Blood Pressure (mmHg):", bpBaseline, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "Heart Rate (bpm):", baseline.heartRate, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "Serum Creatinine:", baseline.serumCreatinine, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "eGFR (mL/min):", baseline.egfr, yPosition, margin, col1Width, col2Start)
    
    // Urinalysis
    doc.setFont("helvetica", "bold")
    doc.text("Urinalysis:", margin, yPosition)
    doc.setFont("helvetica", "normal")
    const urinalysisDisplay = baseline.urinalysis?.includes("Abnormal") 
      ? `Abnormal: ${baseline.urinalysis.replace(/Abnormal:?\s*/i, "").trim()}`
      : baseline.urinalysis || "Not specified"
    doc.text(urinalysisDisplay, col2Start, yPosition)
    yPosition += 5
    
    // Counseling with proper checkboxes
    if (baseline.counseling) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(41, 128, 185)
      doc.text("Counselling Provided:", margin + 1, yPosition)
      yPosition += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      
      const counsellingItems = [
        { label: "Diet & Lifestyle", checked: baseline.counseling.dietAndLifestyle },
        { label: "Hypoglycemia Awareness", checked: baseline.counseling.hypoglycemiaAwareness },
        { label: "UTI/Genital Infection", checked: baseline.counseling.utiGenitialInfectionAwareness },
        { label: "Hydration Advice", checked: baseline.counseling.hydrationAdvice },
      ]
      
      counsellingItems.forEach((item) => {
        const checkbox = item.checked ? "☑" : "☐"
        doc.text(`${checkbox} ${item.label}`, col2Start, yPosition)
        yPosition += 4
      })
      yPosition += 2
    }
    
    yPosition += 3
    yPosition = drawKeyValuePair(doc, "Dose Prescribed:", baseline.dosePrescribed, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "Date of Initiation:", baseline.treatmentInitiationDate, yPosition, margin, col1Width, col2Start)
    yPosition += 3
  }

  // ===== SECTION H: FOLLOW-UP PARAMETERS =====
  if (followUp) {
    if (yPosition > pageHeight - 100) { doc.addPage(); yPosition = margin }
    
    // VISIT 2 Header
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("VISIT 2 - END OF STUDY (WEEK 12 ± 2 WEEKS)", pageWidth / 2, yPosition, { align: "center" })
    yPosition += 8
    
    yPosition = addSectionHeading(doc, "FOLLOW-UP CLINICAL & LAB PARAMETERS", yPosition, margin, pageWidth)
    
    yPosition = drawKeyValuePair(doc, "Visit Date:", followUp.visitDate || formattedDate, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "HbA1c (%):", followUp.hba1c, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "FPG (mg/dL):", followUp.fpg, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "Weight (kg):", followUp.weight, yPosition, margin, col1Width, col2Start)
    
    const bpFollowUp = followUp.bloodPressureSystolic ? `${followUp.bloodPressureSystolic}/${followUp.bloodPressureDiastolic}` : ""
    yPosition = drawKeyValuePair(doc, "Blood Pressure (mmHg):", bpFollowUp, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "Serum Creatinine:", followUp.serumCreatinine, yPosition, margin, col1Width, col2Start)
    yPosition = drawKeyValuePair(doc, "eGFR (mL/min):", followUp.egfr, yPosition, margin, col1Width, col2Start)
    
    // Urinalysis
    doc.setFont("helvetica", "bold")
    doc.text("Urinalysis:", margin, yPosition)
    doc.setFont("helvetica", "normal")
    const fuUrinalysisDisplay = followUp.urinalysis?.includes("Abnormal")
      ? `Abnormal: ${followUp.urinalysis.replace(/Abnormal:?\s*/i, "").trim()}`
      : followUp.urinalysis || "Not specified"
    doc.text(fuUrinalysisDisplay, col2Start, yPosition)
    yPosition += 5
    yPosition += 3

    // ===== SECTION I: GLYCEMIC RESPONSE =====
    if (yPosition > pageHeight - 50) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "GLYCEMIC RESPONSE (AUTO-CALCULATED)", yPosition, margin, pageWidth)
    
    if (followUp.glycemicResponse) {
      yPosition = drawKeyValuePair(doc, "Category:", followUp.glycemicResponse.category, yPosition, margin, col1Width, col2Start)
      if (followUp.glycemicResponse.hba1cChange !== undefined && followUp.glycemicResponse.hba1cChange !== null) {
        yPosition = drawKeyValuePair(doc, "HbA1c Change:", `${followUp.glycemicResponse.hba1cChange.toFixed(2)}%`, yPosition, margin, col1Width, col2Start)
      }
      if (followUp.glycemicResponse.hba1cPercentageChange !== undefined && followUp.glycemicResponse.hba1cPercentageChange !== null) {
        yPosition = drawKeyValuePair(doc, "% Change:", `${followUp.glycemicResponse.hba1cPercentageChange.toFixed(1)}%`, yPosition, margin, col1Width, col2Start)
      }
    }
    yPosition += 3

    // ===== SECTION J: OUTCOMES =====
    if (yPosition > pageHeight - 50) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "WEIGHT, BP & RENAL OUTCOMES", yPosition, margin, pageWidth)
    
    if (followUp.outcomes) {
      yPosition = drawKeyValuePair(doc, "Weight Change:", followUp.outcomes.weightChange, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "BP Control Achieved:", followUp.outcomes.bpControlAchieved, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "Renal Outcome:", followUp.outcomes.renalOutcome, yPosition, margin, col1Width, col2Start)
    }
    yPosition += 3

    // ===== SECTION K: ADHERENCE =====
    if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "ADHERENCE & TREATMENT DURABILITY", yPosition, margin, pageWidth)
    
    if (followUp.adherence) {
      yPosition = drawKeyValuePair(doc, "Continuing Treatment:", followUp.adherence.patientContinuingTreatment, yPosition, margin, col1Width, col2Start)
      if (!followUp.adherence.patientContinuingTreatment && followUp.adherence.discontinuationReason) {
        yPosition = drawKeyValuePair(doc, "Discontinuation Reason:", followUp.adherence.discontinuationReason, yPosition, margin, col1Width, col2Start)
      }
      yPosition = drawKeyValuePair(doc, "Missed Doses (7 days):", followUp.adherence.missedDosesInLast7Days, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "Add-on/Changed Therapy:", followUp.adherence.addOnOrChangedTherapy, yPosition, margin, col1Width, col2Start)
      if (followUp.adherence.addOnOrChangedTherapyDetails) {
        yPosition = drawKeyValuePair(doc, "Therapy Details:", followUp.adherence.addOnOrChangedTherapyDetails, yPosition, margin, col1Width, col2Start)
      }
    }
    yPosition += 3

    // ===== SECTION L: SAFETY & ADVERSE EVENTS =====
    if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "SAFETY & ADVERSE EVENTS", yPosition, margin, pageWidth)
    
    if (followUp.eventsOfSpecialInterest) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.text("Events of Special Interest:", margin, yPosition)
      yPosition += 4
      doc.setFont("helvetica", "normal")
      
      if (followUp.eventsOfSpecialInterest.hypoglycemiaMild) doc.text("☑ Mild Hypoglycemia", col2Start, yPosition); else doc.text("☐ Mild Hypoglycemia", col2Start, yPosition)
      yPosition += 3
      if (followUp.eventsOfSpecialInterest.hypoglycemiaModerate) doc.text("☑ Moderate Hypoglycemia", col2Start, yPosition); else doc.text("☐ Moderate Hypoglycemia", col2Start, yPosition)
      yPosition += 3
      if (followUp.eventsOfSpecialInterest.hypoglycemiaSevere) doc.text("☑ Severe Hypoglycemia", col2Start, yPosition); else doc.text("☐ Severe Hypoglycemia", col2Start, yPosition)
      yPosition += 3
      if (followUp.eventsOfSpecialInterest.uti) doc.text("☑ UTI", col2Start, yPosition); else doc.text("☐ UTI", col2Start, yPosition)
      yPosition += 3
      if (followUp.eventsOfSpecialInterest.genitalMycoticInfection) doc.text("☑ Genital Mycotic Infection", col2Start, yPosition); else doc.text("☐ Genital Mycotic Infection", col2Start, yPosition)
      yPosition += 3
      if (followUp.eventsOfSpecialInterest.dizzinessDehydrationSymptoms) doc.text("☑ Dizziness/Dehydration", col2Start, yPosition); else doc.text("☐ Dizziness/Dehydration", col2Start, yPosition)
      yPosition += 3
      if (followUp.eventsOfSpecialInterest.hospitalizationOrErVisit) {
        doc.text("☑ Hospitalization/ER Visit", col2Start, yPosition)
        if (followUp.eventsOfSpecialInterest.hospitalizationReason) {
          yPosition += 3
          yPosition = drawKeyValuePair(doc, "Reason:", followUp.eventsOfSpecialInterest.hospitalizationReason, yPosition, margin, col1Width, col2Start)
        }
      } else {
        doc.text("☐ Hospitalization/ER Visit", col2Start, yPosition)
      }
      yPosition += 3
      doc.setFontSize(9)
    }
    yPosition += 3

    // ===== SECTION M: PHYSICIAN ASSESSMENT =====
    if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "PHYSICIAN GLOBAL ASSESSMENT", yPosition, margin, pageWidth)
    
    if (followUp.physicianAssessment) {
      yPosition = drawKeyValuePair(doc, "Overall Efficacy:", followUp.physicianAssessment.overallEfficacy, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "Overall Tolerability:", followUp.physicianAssessment.overallTolerability, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "Compliance Judgment:", followUp.physicianAssessment.complianceJudgment, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "Prefer Long-term:", followUp.physicianAssessment.preferKcMeSempaForLongTerm, yPosition, margin, col1Width, col2Start)
      
      if (followUp.physicianAssessment.preferredPatientProfiles) {
        doc.setFont("helvetica", "bold")
        doc.text("Preferred Patient Profiles:", margin, yPosition)
        yPosition += 4
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        
        if (followUp.physicianAssessment.preferredPatientProfiles.uncontrolledT2dm) doc.text("☑ Uncontrolled T2DM", col2Start, yPosition); else doc.text("☐ Uncontrolled T2DM", col2Start, yPosition)
        yPosition += 3
        if (followUp.physicianAssessment.preferredPatientProfiles.obeseT2dm) doc.text("☑ Obese T2DM", col2Start, yPosition); else doc.text("☐ Obese T2DM", col2Start, yPosition)
        yPosition += 3
        if (followUp.physicianAssessment.preferredPatientProfiles.ckdPatients) doc.text("☑ CKD Patients", col2Start, yPosition); else doc.text("☐ CKD Patients", col2Start, yPosition)
        yPosition += 3
        if (followUp.physicianAssessment.preferredPatientProfiles.htnPlusT2dm) doc.text("☑ HTN + T2DM", col2Start, yPosition); else doc.text("☐ HTN + T2DM", col2Start, yPosition)
        yPosition += 3
        if (followUp.physicianAssessment.preferredPatientProfiles.elderlyPatients) doc.text("☑ Elderly Patients", col2Start, yPosition); else doc.text("☐ Elderly Patients", col2Start, yPosition)
        yPosition += 3
        doc.setFontSize(9)
      }
    }
    yPosition += 3

    // ===== SECTION N: PATIENT-REPORTED OUTCOMES =====
    if (yPosition > pageHeight - 50) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "PATIENT-REPORTED OUTCOMES", yPosition, margin, pageWidth)
    
    if (followUp.patientReportedOutcomes) {
      yPosition = drawKeyValuePair(doc, "Overall Satisfaction:", followUp.patientReportedOutcomes.overallSatisfaction, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "GI Tolerance:", followUp.patientReportedOutcomes.giToleranceVsPriorTherapy, yPosition, margin, col1Width, col2Start)
      yPosition = drawKeyValuePair(doc, "Diabetes Confidence:", followUp.patientReportedOutcomes.confidenceInManagingDiabetes, yPosition, margin, col1Width, col2Start)
      
      if (followUp.patientReportedOutcomes.additionalComments) {
        doc.setFont("helvetica", "bold")
        doc.text("Comments:", margin, yPosition)
        yPosition += 4
        doc.setFont("helvetica", "normal")
        const wrapped = doc.splitTextToSize(followUp.patientReportedOutcomes.additionalComments, pageWidth - 2 * margin - col1Width)
        doc.text(wrapped, col2Start, yPosition)
        yPosition += wrapped.length * 3
      }
    }
    yPosition += 3

    // ===== SECTION O: DATA PRIVACY =====
    if (yPosition > pageHeight - 50) { doc.addPage(); yPosition = margin }
    yPosition = addSectionHeading(doc, "DATA PRIVACY & CONFIDENTIALITY", yPosition, margin, pageWidth)
    
    if (followUp.dataPrivacy) {
      doc.setFontSize(8)
      if (followUp.dataPrivacy.noPersonalIdentifiersRecorded) doc.text("☑ No personal identifiers recorded", col2Start, yPosition); else doc.text("☐ No personal identifiers recorded", col2Start, yPosition)
      yPosition += 4
      if (followUp.dataPrivacy.dataCollectedAsRoutineClinicalPractice) doc.text("☑ Data collected as routine practice", col2Start, yPosition); else doc.text("☐ Data collected as routine practice", col2Start, yPosition)
      yPosition += 4
      if (followUp.dataPrivacy.patientIdentityMappingAtClinicOnly) doc.text("☑ Identity mapping at clinic only", col2Start, yPosition); else doc.text("☐ Identity mapping at clinic only", col2Start, yPosition)
      yPosition += 4
      doc.setFontSize(9)
    }
    yPosition += 3
  }

  // ===== SECTION: MULTI-VISIT TREND ANALYSIS (If Multiple Followups) =====
  if (followUps && followUps.length > 1) {
    if (yPosition > pageHeight - 100) { doc.addPage(); yPosition = margin }
    
    yPosition = addSectionHeading(doc, "MULTI-VISIT TREND ANALYSIS", yPosition, margin, pageWidth)
    
    // Create a comparison table
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    
    const tableData: (string | number)[][] = []
    const headers = ["Metric", "Baseline", ...followUps.map(v => `Visit ${v.visitNumber}`)]
    tableData.push(headers as string[])
    
    // Add key metrics rows
    const metrics = [
      { label: "HbA1c (%)", key: "hba1c" },
      { label: "FPG (mg/dL)", key: "fpg" },
      { label: "Weight (kg)", key: "weight" },
      { label: "BP (mmHg)", key: "bp" },
      { label: "Serum Creatinine", key: "serumCreatinine" },
      { label: "eGFR (mL/min)", key: "egfr" }
    ]
    
    for (const metric of metrics) {
      const row: (string | number)[] = [metric.label]
      
      // Baseline value
      if (metric.key === "bp" && baseline) {
        row.push(`${baseline.bloodPressureSystolic || ""}/${baseline.bloodPressureDiastolic || ""}`)
      } else if (baseline && metric.key in baseline) {
        row.push((baseline as any)[metric.key] || "")
      } else {
        row.push("")
      }
      
      // Followup values
      for (const followup of followUps) {
        if (metric.key === "bp") {
          row.push(`${followup.bloodPressureSystolic || ""}/${followup.bloodPressureDiastolic || ""}`)
        } else if (metric.key in followup) {
          row.push((followup as any)[metric.key] || "")
        } else {
          row.push("")
        }
      }
      
      tableData.push(row)
    }
    
    // Draw simple table
    let tableYPos = yPosition + 5
    const colWidth = (pageWidth - 2 * margin) / tableData[0].length
    
    // Header row
    doc.setFillColor(41, 128, 185)
    doc.setTextColor(255, 255, 255)
    for (let i = 0; i < tableData[0].length; i++) {
      doc.rect(margin + i * colWidth, tableYPos - 3, colWidth, 5, "F")
      doc.setFontSize(8)
      doc.text(tableData[0][i].toString(), margin + i * colWidth + 1, tableYPos, { maxWidth: colWidth - 1 })
    }
    tableYPos += 5
    
    // Data rows
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    for (let rowIdx = 1; rowIdx < tableData.length; rowIdx++) {
      const isAlt = rowIdx % 2 === 0
      if (isAlt) {
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, tableYPos - 3, pageWidth - 2 * margin, 5, "F")
      }
      
      for (let i = 0; i < tableData[rowIdx].length; i++) {
        doc.setFontSize(7)
        doc.text(tableData[rowIdx][i].toString(), margin + i * colWidth + 1, tableYPos, { maxWidth: colWidth - 1 })
      }
      tableYPos += 5
    }
    
    yPosition = tableYPos + 5
    
    // Summary trends
    if (baseline && followUps.length > 0) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Key Observations:", margin, yPosition)
      yPosition += 5
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      
      const observations: string[] = []
      
      if (baseline.hba1c && followUps[0].hba1c) {
        const change = (followUps[followUps.length - 1].hba1c || 0) - baseline.hba1c
        const direction = change < 0 ? "decreased" : "increased"
        const trend = followUps.map(f => f.hba1c).join(" → ")
        observations.push(`HbA1c ${direction}: ${baseline.hba1c}% → ${trend}%`)
      }
      
      if (baseline.weight && followUps[0].weight) {
        const change = (followUps[followUps.length - 1].weight || 0) - baseline.weight
        const direction = change < 0 ? "decreased" : "increased"
        const trend = followUps.map(f => f.weight).join(" → ")
        observations.push(`Weight ${direction}: ${baseline.weight} kg → ${trend} kg`)
      }
      
      for (const obs of observations) {
        const wrapped = doc.splitTextToSize(obs, pageWidth - 2 * margin - 5)
        doc.text(wrapped, margin + 5, yPosition)
        yPosition += wrapped.length * 3
      }
    }
    
    yPosition += 5
  }

  // ===== SECTION P: PHYSICIAN DECLARATION =====
  if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin }
  yPosition = addSectionHeading(doc, "PHYSICIAN DECLARATION", yPosition, margin, pageWidth)

  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.text("I confirm that the above information is accurate and recorded as part of standard clinical practice.", margin + 3, yPosition)
  yPosition += 8

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  yPosition = drawKeyValuePair(doc, "Physician Name:", doctor?.name, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Qualification:", doctor?.qualification, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Study Site Code:", doctor?.studySiteCode, yPosition, margin, col1Width, col2Start)
  yPosition = drawKeyValuePair(doc, "Download Date:", formattedDate, yPosition, margin, col1Width, col2Start)
  yPosition += 8

  // Signature and Stamp area
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Physician Signature:", margin, yPosition)
  doc.setDrawColor(100, 100, 100)
  doc.rect(margin, yPosition + 2, 50, 15)
  
  doc.text("Hospital/Clinic Stamp:", margin + 70, yPosition)
  doc.rect(margin + 70, yPosition + 2, 45, 15)
  yPosition += 22

  // Footer
  yPosition = pageHeight - 15
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.setFont("helvetica", "italic")
  doc.text("IMPORTANT: Signature and Stamp fields are BLANK. Please fill in after downloading.", margin, yPosition)
  doc.text("Do NOT record patient name, phone, address, or personal identifiers in this document.", margin, yPosition + 3)
  doc.text("Patient Code ↔ Identity mapping must remain at clinic level only.", margin, yPosition + 6)

  doc.setTextColor(41, 128, 185)
  doc.setFont("helvetica", "bold")
  doc.text(`Generated: ${formattedDate} | Patient: ${patient.patientCode}`, margin, pageHeight - 2)

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

export function downloadCSV(
  patient: Patient,
  baseline: BaselineData | null,
  followUp: FollowUpData | null,
  doctor?: any
): void {
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

export function downloadExcel(
  patient: Patient,
  baseline: BaselineData | null,
  followUp: FollowUpData | null,
  doctor?: any
): void {
  // Simple Excel-like format (TSV)
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
