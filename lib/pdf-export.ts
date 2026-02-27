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
	let displayValue = "—"
  
	if (value === true) displayValue = "☑ Yes"
	else if (value === false) displayValue = "☐ No"
	else if (value !== null && value !== undefined && typeof value === "number") displayValue = value.toFixed(2)
	else if (value) displayValue = value.toString()
  
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

function drawRadio(doc: jsPDF, label: string, selected: boolean, yPos: number, col2Start: number): number {
	doc.setFontSize(9)
	doc.setFont("helvetica", "normal")
	const radio = selected ? "●" : "○"
	doc.text(`${radio} ${label}`, col2Start, yPos)
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

	// HEADER WITH LOGO
	doc.setFillColor(25, 100, 165)
	doc.rect(0, 0, pageWidth, 32, "F")
	// Add custom logo
	try {
		doc.addImage("/logo.jpg", "JPEG", margin, 4, 18, 18)
	} catch (e) {
		// fallback: KC box
		doc.setFillColor(41, 128, 185)
		doc.rect(margin, 4, 10, 10, "F")
		doc.setTextColor(255, 255, 255)
		doc.setFontSize(14)
		doc.setFont("helvetica", "bold")
		doc.text("KC", margin + 2, 10)
	}
	doc.setTextColor(255, 255, 255)
	doc.setFontSize(18)
	doc.setFont("helvetica", "bold")
	doc.text("KC MeSempa - RWE Study", margin + 25, 9)
	doc.setFontSize(8)
	doc.setFont("helvetica", "normal")
	doc.text("Case Record Form (CRF) - Complete Patient Assessment", pageWidth / 2, 18, { align: "center" })
	doc.text(`Patient: ${patient.patientCode} | Generated: ${dateStr}`, pageWidth / 2, 24, { align: "center" })
  
	doc.setTextColor(0, 0, 0)
	yPos = 36

	// PATIENT IDENTIFICATION
	yPos = addSectionHeading(doc, "1. PATIENT IDENTIFICATION & DEMOGRAPHICS", yPos, margin, pageWidth)
	yPos = drawKeyValue(doc, "Patient Code:", patient.patientCode, yPos, margin, col1Width, col2Start)
	yPos = drawKeyValue(doc, "Study Site:", patient.studySiteCode, yPos, margin, col1Width, col2Start)
	yPos = drawKeyValue(doc, "Investigator:", patient.investigatorName || doctor?.name || "—", yPos, margin, col1Width, col2Start)
	yPos = drawKeyValue(doc, "Baseline Date:", patient.baselineVisitDate, yPos, margin, col1Width, col2Start)
	yPos = drawKeyValue(doc, "Age (years):", patient.age, yPos, margin, col1Width, col2Start)
	// Gender (radio)
	yPos = drawRadio(doc, "Male", patient.gender === "Male", yPos, col2Start)
	yPos = drawRadio(doc, "Female", patient.gender === "Female", yPos, col2Start)
	yPos = drawRadio(doc, "Other", patient.gender === "Other", yPos, col2Start)
	yPos = drawKeyValue(doc, "Height (cm):", patient.height, yPos, margin, col1Width, col2Start)
	yPos = drawKeyValue(doc, "Weight (kg):", patient.weight, yPos, margin, col1Width, col2Start)
	yPos = drawKeyValue(doc, "BMI (kg/m²):", patient.bmi, yPos, margin, col1Width, col2Start)
	// Smoking (radio)
	yPos = drawRadio(doc, "Never", patient.smokingStatus === "Never", yPos, col2Start)
	yPos = drawRadio(doc, "Current", patient.smokingStatus === "Current", yPos, col2Start)
	yPos = drawRadio(doc, "Former", patient.smokingStatus === "Former", yPos, col2Start)
	// Alcohol (radio)
	yPos = drawRadio(doc, "No", patient.alcoholIntake === "No", yPos, col2Start)
	yPos = drawRadio(doc, "Occasional", patient.alcoholIntake === "Occasional", yPos, col2Start)
	yPos = drawRadio(doc, "Regular", patient.alcoholIntake === "Regular", yPos, col2Start)
	// Physical Activity (radio)
	yPos = drawRadio(doc, "Sedentary", patient.physicalActivityLevel === "Sedentary", yPos, col2Start)
	yPos = drawRadio(doc, "Moderate", patient.physicalActivityLevel === "Moderate", yPos, col2Start)
	yPos = drawRadio(doc, "Active", patient.physicalActivityLevel === "Active", yPos, col2Start)
	yPos += 2

	// DIABETES HISTORY
	if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
	yPos = addSectionHeading(doc, "2. DIABETES HISTORY & CLINICAL PHENOTYPE", yPos, margin, pageWidth)
	yPos = drawKeyValue(doc, "Duration (years):", patient.durationOfDiabetes, yPos, margin, col1Width, col2Start)
	// Baseline Severity (radio)
	yPos = drawRadio(doc, "HbA1c <7.5%", patient.baselineGlycemicSeverity === "HbA1c <7.5%", yPos, col2Start)
	yPos = drawRadio(doc, "HbA1c 7.5–8.5%", patient.baselineGlycemicSeverity === "HbA1c 7.5–8.5%", yPos, col2Start)
	yPos = drawRadio(doc, "HbA1c 8.6–10%", patient.baselineGlycemicSeverity === "HbA1c 8.6–10%", yPos, col2Start)
	yPos = drawRadio(doc, "HbA1c >10%", patient.baselineGlycemicSeverity === "HbA1c >10%", yPos, col2Start)
	// Previous Treatment (radio)
	yPos = drawRadio(doc, "Drug-naïve", patient.previousTreatmentType === "Drug-naïve", yPos, col2Start)
	yPos = drawRadio(doc, "Oral drugs only", patient.previousTreatmentType === "Oral drugs only", yPos, col2Start)
	yPos = drawRadio(doc, "Insulin only", patient.previousTreatmentType === "Insulin only", yPos, col2Start)
	yPos = drawRadio(doc, "Oral drugs + Insulin", patient.previousTreatmentType === "Oral drugs + Insulin", yPos, col2Start)
	if (patient.diabetesComplications) {
		doc.setFontSize(9)
		doc.setFont("helvetica", "bold")
		doc.text("Complications:", margin, yPos)
		yPos += 3.5
		doc.setFont("helvetica", "normal")
		yPos = drawCheckbox(doc, "Neuropathy", !!patient.diabetesComplications.neuropathy, yPos, col2Start)
		yPos = drawCheckbox(doc, "Retinopathy", !!patient.diabetesComplications.retinopathy, yPos, col2Start)
		yPos = drawCheckbox(doc, "Nephropathy", !!patient.diabetesComplications.nephropathy, yPos, col2Start)
		yPos = drawCheckbox(doc, "CAD/Stroke", !!patient.diabetesComplications.cadOrStroke, yPos, col2Start)
		yPos = drawCheckbox(doc, "None", !patient.diabetesComplications.neuropathy && !patient.diabetesComplications.retinopathy && !patient.diabetesComplications.nephropathy && !patient.diabetesComplications.cadOrStroke, yPos, col2Start)
	}
	yPos += 2

	// COMORBIDITIES
	if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
	yPos = addSectionHeading(doc, "3. COMORBIDITIES", yPos, margin, pageWidth)
	if (patient.comorbidities) {
		doc.setFont("helvetica", "normal")
		yPos = drawCheckbox(doc, "Hypertension", !!patient.comorbidities.hypertension, yPos, col2Start)
		yPos = drawCheckbox(doc, "Dyslipidemia", !!patient.comorbidities.dyslipidemia, yPos, col2Start)
		yPos = drawCheckbox(doc, "Obesity", !!patient.comorbidities.obesity, yPos, col2Start)
		yPos = drawCheckbox(doc, "ASCVD", !!patient.comorbidities.ascvd, yPos, col2Start)
		yPos = drawCheckbox(doc, "Heart Failure", !!patient.comorbidities.heartFailure, yPos, col2Start)
		yPos = drawCheckbox(doc, "Chronic Kidney Disease", !!patient.comorbidities.chronicKidneyDisease, yPos, col2Start)
		yPos = drawCheckbox(doc, "None", !patient.comorbidities.hypertension && !patient.comorbidities.dyslipidemia && !patient.comorbidities.obesity && !patient.comorbidities.ascvd && !patient.comorbidities.heartFailure && !patient.comorbidities.chronicKidneyDisease, yPos, col2Start)
		// CKD eGFR Category dropdown
		const egfrOptions = ["≥90", "60–89", "45–59", "30–44"];
		egfrOptions.forEach(opt => {
			const selected = !!(patient.comorbidities && patient.comorbidities.ckdEgfrCategory === opt);
			yPos = drawRadio(doc, `CKD eGFR Category: ${opt}`, selected, yPos, col2Start);
		});
	}
	yPos += 2

	// PRIOR THERAPY
	if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
	yPos = addSectionHeading(doc, "4. PRIOR ANTI-DIABETIC THERAPY", yPos, margin, pageWidth)
	if (patient.previousDrugClasses) {
		doc.setFont("helvetica", "normal")
		yPos = drawCheckbox(doc, "Metformin", !!patient.previousDrugClasses.metformin, yPos, col2Start)
		yPos = drawCheckbox(doc, "Sulfonylurea", !!patient.previousDrugClasses.sulfonylurea, yPos, col2Start)
		yPos = drawCheckbox(doc, "DPP4 Inhibitor", !!patient.previousDrugClasses.dpp4Inhibitor, yPos, col2Start)
		yPos = drawCheckbox(doc, "SGLT2 Inhibitor", !!patient.previousDrugClasses.sglt2Inhibitor, yPos, col2Start)
		yPos = drawCheckbox(doc, "TZD", !!patient.previousDrugClasses.tzd, yPos, col2Start)
		yPos = drawCheckbox(doc, "Insulin", !!patient.previousDrugClasses.insulin, yPos, col2Start)
		if (patient.previousDrugClasses.other && patient.previousDrugClasses.other.length > 0) {
			patient.previousDrugClasses.other.forEach(opt => {
				yPos = drawCheckbox(doc, `Other: ${opt}`, true, yPos, col2Start);
			});
		}
	}
	yPos += 2

	// INITIATION REASONS
	if (yPos > pageHeight - 80) { doc.addPage(); yPos = margin }
	yPos = addSectionHeading(doc, "5. REASON FOR KC MESEMPA INITIATION", yPos, margin, pageWidth)
	if (patient.reasonForTripleFDC) {
		doc.setFont("helvetica", "normal")
		yPos = drawCheckbox(doc, "Inadequate Glycemic Control", !!patient.reasonForTripleFDC.inadequateGlycemicControl, yPos, col2Start)
		yPos = drawCheckbox(doc, "Weight Concerns", !!patient.reasonForTripleFDC.weightConcerns, yPos, col2Start)
		yPos = drawCheckbox(doc, "Hypoglycemia on Prior Therapy", !!patient.reasonForTripleFDC.hypoglycemiaOnPriorTherapy, yPos, col2Start)
		yPos = drawCheckbox(doc, "High Pill Burden", !!patient.reasonForTripleFDC.highPillBurden, yPos, col2Start)
		yPos = drawCheckbox(doc, "Poor Adherence", !!patient.reasonForTripleFDC.poorAdherence, yPos, col2Start)
		yPos = drawCheckbox(doc, "Cost Considerations", !!patient.reasonForTripleFDC.costConsiderations, yPos, col2Start)
		yPos = drawCheckbox(doc, "Physician Clinical Judgment", !!patient.reasonForTripleFDC.physicianClinicalJudgment, yPos, col2Start)
		if (patient.reasonForTripleFDC.other && patient.reasonForTripleFDC.other.length > 0) {
			patient.reasonForTripleFDC.other.forEach(opt => {
				yPos = drawCheckbox(doc, `Other: ${opt}`, true, yPos, col2Start);
			});
		}
	}
	yPos += 2

	// BASELINE ASSESSMENT
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

	// FOLLOW-UPS
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
		if (visit.glycemicResponse) {
			yPos += 1
			doc.setFont("helvetica", "bold")
			doc.setFontSize(9)
			doc.text("Glycemic Response Category:", margin, yPos)
			yPos += 3
			doc.setFont("helvetica", "normal")
			yPos = drawKeyValue(doc, "Category:", visit.glycemicResponse.category, yPos, margin, col1Width, col2Start)
			if (visit.glycemicResponse.hba1cChange !== null && visit.glycemicResponse.hba1cChange !== undefined) {
				yPos = drawKeyValue(doc, "HbA1c Change (%):", Number(visit.glycemicResponse.hba1cChange).toFixed(2), yPos, margin, col1Width, col2Start)
			}
		}
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
		if (visit.eventsOfSpecialInterest) {
			yPos += 1
			doc.setFont("helvetica", "bold")
			doc.setFontSize(9)
			doc.text("Events of Special Interest (tick all that apply):", margin, yPos)
			yPos += 3
			doc.setFont("helvetica", "normal")
			yPos = drawCheckbox(doc, "Hypoglycemia – mild (ADA Level 1-Blood Glucose <70 mg/dL and ≥54 mg/dL)", !!visit.eventsOfSpecialInterest.hypoglycemiaMild, yPos, col2Start)
			yPos = drawCheckbox(doc, "Hypoglycemia – moderate (ADA Level 2 - Blood glucose <54 mg/dL)", !!visit.eventsOfSpecialInterest.hypoglycemiaModerate, yPos, col2Start)
			yPos = drawCheckbox(doc, "Hypoglycemia – severe", !!visit.eventsOfSpecialInterest.hypoglycemiaSevere, yPos, col2Start)
			yPos = drawCheckbox(doc, "UTI", !!visit.eventsOfSpecialInterest.uti, yPos, col2Start)
			yPos = drawCheckbox(doc, "Genital mycotic infection", !!visit.eventsOfSpecialInterest.genitalMycoticInfection, yPos, col2Start)
			yPos = drawCheckbox(doc, "Dizziness / dehydration symptoms", !!visit.eventsOfSpecialInterest.dizzinessDehydrationSymptoms, yPos, col2Start)
			yPos = drawCheckbox(doc, "Hospitalization / ER visit", !!visit.eventsOfSpecialInterest.hospitalizationOrErVisit, yPos, col2Start)
		}
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
		yPos += 2
	})

	// DATA PRIVACY
	if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin }
	yPos = addSectionHeading(doc, "7. DATA PRIVACY & CONFIDENTIALITY", yPos, margin, pageWidth)
	doc.setFont("helvetica", "normal")
	yPos = drawCheckbox(doc, "No personal identifiers recorded", followUp?.dataPrivacy?.noPersonalIdentifiersRecorded || false, yPos, col2Start)
	yPos = drawCheckbox(doc, "Data collected as routine clinical practice", followUp?.dataPrivacy?.dataCollectedAsRoutineClinicalPractice || false, yPos, col2Start)
	yPos = drawCheckbox(doc, "Patient identity mapping at clinic only", followUp?.dataPrivacy?.patientIdentityMappingAtClinicOnly || false, yPos, col2Start)
	yPos += 3

	// PHYSICIAN DECLARATION
	if (yPos > pageHeight - 50) { doc.addPage(); yPos = margin }
	yPos = addSectionHeading(doc, "8. PHYSICIAN DECLARATION & CERTIFICATION", yPos, margin, pageWidth)
	doc.setFontSize(8)
	doc.setFont("helvetica", "normal")
	doc.text("I confirm that the information provided in this Case Record Form is accurate and complete to the best of my knowledge.", margin, yPos)
	yPos += 8
	doc.setFont("helvetica", "bold")
	doc.text("Physician Name:", margin, yPos)
	doc.setFont("helvetica", "normal")
	doc.text(doctor?.name || "—", col2Start, yPos)
	yPos += 5
	doc.setDrawColor(100, 100, 100)
	doc.setLineWidth(0.3)
	doc.line(col2Start, yPos - 2, pageWidth - margin, yPos - 2)
	yPos += 3
	doc.setFont("helvetica", "bold")
	doc.text("Qualification:", margin, yPos)
	doc.setFont("helvetica", "normal")
	doc.text(doctor?.qualification || "—", col2Start, yPos)
	yPos += 5
	doc.line(col2Start, yPos - 2, pageWidth - margin, yPos - 2)
	yPos += 5
	doc.setFont("helvetica", "bold")
	doc.text("Date:", margin, yPos)
	doc.setFont("helvetica", "normal")
	doc.text(dateStr, col2Start, yPos)
	yPos += 8
	doc.setFont("helvetica", "bold")
	doc.text("Signature:", margin, yPos)
	yPos += 8
	doc.line(col2Start, yPos - 2, pageWidth - margin, yPos - 2)
	yPos += 5
	doc.text("Stamp/Seal:", margin, yPos)
	yPos += 8
	doc.rect(col2Start, yPos - 5, 40, 15)

	// FOOTER
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

export function downloadCSV(patient: Patient, baseline: BaselineData | null, followUp: FollowUpData | null, doctor?: Doctor): void {
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

export function downloadExcel(patient: Patient, baseline: BaselineData | null, followUp: FollowUpData | null, doctor?: Doctor): void {
	let csv = "Kollectcare CRF Data Export\n"
	csv += `Generated,${new Date().toLocaleDateString()}\n\n`
  
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
		csv += `HbA1c (%),${baseline.hba1c}\n`
		csv += `FPG (mg/dL),${baseline.fpg}\n`
		csv += `Weight (kg),${baseline.weight}\n`
		csv += `Blood Pressure (mmHg),${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}\n`
		csv += `Serum Creatinine,${baseline.serumCreatinine}\n`
		csv += `eGFR,${baseline.egfr}\n\n`
	}
  
	if (followUp) {
		csv += "FOLLOW-UP DATA\n"
		csv += `HbA1c (%),${followUp.hba1c}\n`
		csv += `FPG (mg/dL),${followUp.fpg}\n`
		csv += `Weight (kg),${followUp.weight}\n`
		csv += `Blood Pressure (mmHg),${followUp.bloodPressureSystolic}/${followUp.bloodPressureDiastolic}\n`
		csv += `Serum Creatinine,${followUp.serumCreatinine}\n`
		csv += `eGFR,${followUp.egfr}\n`
	}

	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
	const url = window.URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `CRF_${patient.patientCode}_${new Date().toISOString().split("T")[0]}.csv`
	a.click()
	window.URL.revokeObjectURL(url)
}
