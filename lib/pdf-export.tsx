'use client'

import React from 'react'
import {
	Document,
	Page,
	Text,
	View,
	Svg,
	Rect,
	Circle,
	Path,
	Image,
	pdf,
	StyleSheet,
} from '@react-pdf/renderer'
import type { Patient, BaselineData, FollowUpData, Doctor } from './types'

// ============================================================================
// HELPER FUNCTION: LOAD IMAGE AS BASE64
// ============================================================================
async function loadImageAsBase64(imagePath: string): Promise<string> {
	try {
		const response = await fetch(imagePath)
		const blob = await response.blob()
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				const base64 = reader.result as string
				resolve(base64)
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	} catch (error) {
		console.warn(`Failed to load image from ${imagePath}:`, error)
		return ''
	}
}

// ============================================================================
// PROFESSIONAL COLOR PALETTE
// ============================================================================
const COLORS = {
	PRIMARY_NAVY: '#0d47a1',
	SECONDARY_BLUE: '#2196f3',
	SUCCESS_GREEN: '#4caf50',
	TEXT_DARK: '#212121',
	TEXT_LIGHT: '#666666',
	BG_LIGHT: '#f5f5f5',
	BORDER_GREY: '#cccccc',
	WHITE: '#ffffff',
}

// ============================================================================
// PDF STYLES - COMPACT & PROFESSIONAL
// ============================================================================
const styles = StyleSheet.create({
	page: {
		padding: 25,
		paddingTop: 20,
		paddingBottom: 45,
		backgroundColor: COLORS.WHITE,
		fontFamily: 'Helvetica',
		fontSize: 9,
		color: COLORS.TEXT_DARK,
	},
	// HEADER WITH LOGO
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 15,
		paddingBottom: 10,
		borderBottomWidth: 2,
		borderBottomColor: COLORS.PRIMARY_NAVY,
	},
	logo: {
		width: 50,
		height: 50,
	},
	headerContent: {
		flex: 1,
		marginLeft: 12,
	},
	headerTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: COLORS.PRIMARY_NAVY,
		marginBottom: 2,
	},
	headerSubtitle: {
		fontSize: 8,
		color: COLORS.TEXT_LIGHT,
		marginBottom: 1,
	},
	headerMeta: {
		fontSize: 7,
		color: COLORS.TEXT_LIGHT,
	},
	// SECTIONS
	sectionHeading: {
		backgroundColor: COLORS.PRIMARY_NAVY,
		color: COLORS.WHITE,
		padding: 6,
		paddingLeft: 10,
		marginTop: 10,
		marginBottom: 6,
		fontSize: 9,
		fontWeight: 'bold',
		borderRadius: 2,
	},
	// GRID LAYOUT
	gridRow: {
		flexDirection: 'row',
		marginBottom: 4,
	},
	gridCol2: {
		flex: 1,
		marginRight: 8,
	},
	gridCol3: {
		flex: 1,
		marginRight: 6,
	},
	fieldGroup: {
		marginBottom: 4,
	},
	label: {
		fontSize: 7,
		fontWeight: 'bold',
		color: COLORS.TEXT_LIGHT,
		marginBottom: 1,
		textTransform: 'uppercase',
	},
	value: {
		fontSize: 8,
		color: COLORS.TEXT_DARK,
		fontWeight: '500',
	},
	// CHOICE ITEMS
	choiceRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginBottom: 3,
		marginLeft: 6,
	},
	choiceItem: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '33.33%',
		marginBottom: 4,
	},
	choiceLabel: {
		fontSize: 8,
		marginLeft: 4,
		color: COLORS.TEXT_DARK,
	},
	choiceGroupLabel: {
		fontSize: 8,
		fontWeight: 'bold',
		color: COLORS.PRIMARY_NAVY,
		marginBottom: 3,
		marginTop: 4,
	},
	// SIGNATURE BOXES
	signatureSection: {
		marginTop: 12,
		marginBottom: 10,
	},
	signatureGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
	},
	signatureBox: {
		flex: 1,
		borderWidth: 1,
		borderColor: COLORS.BORDER_GREY,
		padding: 8,
		minHeight: 70,
	},
	signatureLabel: {
		fontSize: 7,
		fontWeight: 'bold',
		marginBottom: 3,
		textAlign: 'center',
		color: COLORS.TEXT_LIGHT,
	},
	stampBox: {
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: COLORS.BORDER_GREY,
		padding: 8,
		minHeight: 70,
		justifyContent: 'center',
		alignItems: 'center',
	},
	// FOOTER
	footer: {
		position: 'absolute',
		bottom: 20,
		left: 25,
		right: 25,
		borderTopWidth: 1,
		borderTopColor: COLORS.BORDER_GREY,
		paddingTop: 6,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	footerText: {
		fontSize: 6,
		color: COLORS.TEXT_LIGHT,
	},
})

// ============================================================================
// CHECKMARK ICON - WITH GREEN COLOR WHEN CHECKED
// ============================================================================
const CheckIcon = ({ checked, size = 9 }: { checked: boolean; size?: number }) => (
	<Svg width={size} height={size} viewBox="0 0 12 12">
		<Rect
			x="0.5"
			y="0.5"
			width="11"
			height="11"
			rx="1"
			fill={checked ? COLORS.SUCCESS_GREEN : 'none'}
			stroke={checked ? COLORS.SUCCESS_GREEN : COLORS.BORDER_GREY}
			strokeWidth="0.8"
		/>
		{checked && (
			<Path
				d="M2.5 6.5L5 9L9.5 3"
				stroke={COLORS.WHITE}
				strokeWidth="1.2"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		)}
	</Svg>
)

// ============================================================================
// RADIO ICON
// ============================================================================
const RadioIcon = ({ selected, size = 9 }: { selected: boolean; size?: number }) => (
	<Svg width={size} height={size} viewBox="0 0 12 12">
		<Circle cx="6" cy="6" r="5.5" fill="none" stroke={COLORS.PRIMARY_NAVY} strokeWidth="0.8" />
		{selected && <Circle cx="6" cy="6" r="3" fill={COLORS.PRIMARY_NAVY} />}
	</Svg>
)

// ============================================================================
// CHECKBOX ITEM COMPONENT
// ============================================================================
const CheckboxItem = ({ label, checked }: { label: string; checked: boolean }) => (
	<View style={styles.choiceItem}>
		<CheckIcon checked={checked} size={9} />
		<Text style={styles.choiceLabel}>{label}</Text>
	</View>
)

// ============================================================================
// RADIO ITEM COMPONENT
// ============================================================================
const RadioItem = ({ label, selected }: { label: string; selected: boolean }) => (
	<View style={styles.choiceItem}>
		<RadioIcon selected={selected} size={9} />
		<Text style={styles.choiceLabel}>{label}</Text>
	</View>
)

// ============================================================================
// ASSESSMENT RADIO OPTIONS (For Physician Assessment fields in PDF)
// ============================================================================
const AssessmentRadioGroup = ({ label, options, selectedValue }: { label: string; options: string[]; selectedValue?: string }) => (
	<View style={{ marginBottom: 6 }}>
		<Text style={styles.label}>{label}</Text>
		<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginLeft: 4, marginTop: 2 }}>
			{options.map((option) => (
				<View key={option} style={{ width: '48%', marginBottom: 3 }}>
					<RadioItem label={option} selected={selectedValue === option} />
				</View>
			))}
		</View>
	</View>
)

// ============================================================================
// KEY-VALUE COMPONENT
// ============================================================================
const DataField = ({ label, value }: { label: string; value: any }) => {
	let displayValue = '—'
	if (value === true) displayValue = 'Yes'
	else if (value === false) displayValue = 'No'
	else if (value !== null && value !== undefined && typeof value === 'number')
		displayValue = value.toFixed(2)
	else if (value) displayValue = value.toString()

	return (
		<View style={styles.fieldGroup}>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.value}>{displayValue}</Text>
		</View>
	)
}

// ============================================================================
// TWO-COLUMN LAYOUT
// ============================================================================
const TwoColRow = ({
	label1,
	value1,
	label2,
	value2,
}: {
	label1: string
	value1: any
	label2: string
	value2: any
}) => (
	<View style={styles.gridRow}>
		<View style={styles.gridCol2}>
			<DataField label={label1} value={value1} />
		</View>
		<View style={styles.gridCol2}>
			<DataField label={label2} value={value2} />
		</View>
	</View>
)

// ============================================================================
// MAIN CRF DOCUMENT
// ============================================================================
interface PatientCRFDocumentProps {
	patient: Patient
	baseline: BaselineData | null
	followUp: FollowUpData | null
	followUps?: FollowUpData[]
	doctor?: Doctor
	logoBase64?: string
}

const PatientCRFDocument: React.FC<PatientCRFDocumentProps> = ({
	patient,
	baseline,
	followUp,
	followUps,
	doctor,
	logoBase64,
}) => {
	const visitsToShow = followUps && followUps.length > 0 ? followUps : followUp ? [followUp] : []
	const today = new Date()
	const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

	 return (
	   <Document>
	     {/* ========== SMART AUTO-PAGINATION: All sections flow naturally, page breaks automatic ========== */}
	     <Page size="A4" style={styles.page}>
	       {/* HEADER WITH LOGO */}
	       <View style={styles.headerContainer}>
	         {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
	         <View style={styles.headerContent}>
	           <Text style={styles.headerTitle}>KC MeSempa - RWE Study</Text>
	           <Text style={styles.headerSubtitle}>Case Record Form (CRF) - Complete Patient Assessment</Text>
	           <Text style={styles.headerMeta}>
	             Patient: {patient.patientCode} | {dateStr}
	           </Text>
	         </View>
	       </View>

	       {/* SECTION 1: PATIENT IDENTIFICATION & DEMOGRAPHICS */}
	       <Text style={styles.sectionHeading}>1. PATIENT IDENTIFICATION & DEMOGRAPHICS</Text>
	       <View style={styles.gridRow}>
	         <View style={styles.gridCol3}>
	           <DataField label="Patient Code" value={patient.patientCode} />
	         </View>
	         <View style={styles.gridCol3}>
	           <DataField label="Study Site" value={patient.studySiteCode} />
	         </View>
	         <View style={styles.gridCol3}>
	           <DataField label="Investigator" value={patient.investigatorName || doctor?.name} />
	         </View>
	       </View>
	       <View style={styles.gridRow}>
	         <View style={styles.gridCol3}>
	           <DataField label="Age (yrs)" value={patient.age} />
	         </View>
	         <View style={styles.gridCol3}>
	           <DataField label="Height (cm)" value={patient.height} />
	         </View>
	         <View style={styles.gridCol3}>
	           <DataField label="BMI (kg/m²)" value={patient.bmi} />
	         </View>
	       </View>
	       <Text style={styles.choiceGroupLabel}>Gender</Text>
	       <View style={styles.choiceRow}>
	         <RadioItem label="Male" selected={patient.gender === 'Male'} />
	         <RadioItem label="Female" selected={patient.gender === 'Female'} />
	         <RadioItem label="Other" selected={patient.gender === 'Other'} />
	       </View>
	       <Text style={styles.choiceGroupLabel}>Smoking Status</Text>
	       <View style={styles.choiceRow}>
	         <RadioItem label="Never" selected={patient.smokingStatus === 'Never'} />
	         <RadioItem label="Current" selected={patient.smokingStatus === 'Current'} />
	         <RadioItem label="Former" selected={patient.smokingStatus === 'Former'} />
	       </View>
	       <Text style={styles.choiceGroupLabel}>Alcohol Intake</Text>
	       <View style={styles.choiceRow}>
	         <RadioItem label="No" selected={patient.alcoholIntake === 'No'} />
	         <RadioItem label="Occasional" selected={patient.alcoholIntake === 'Occasional'} />
	         <RadioItem label="Regular" selected={patient.alcoholIntake === 'Regular'} />
	       </View>
	       <Text style={styles.choiceGroupLabel}>Physical Activity</Text>
	       <View style={styles.choiceRow}>
	         <RadioItem label="Sedentary" selected={patient.physicalActivityLevel === 'Sedentary'} />
	         <RadioItem label="Moderate" selected={patient.physicalActivityLevel === 'Moderate'} />
	         <RadioItem label="Active" selected={patient.physicalActivityLevel === 'Active'} />
	       </View>

	       {/* SECTION 2: DIABETES HISTORY & CLINICAL PHENOTYPE */}
	       <Text style={styles.sectionHeading}>2. DIABETES HISTORY & CLINICAL PHENOTYPE</Text>
	       <View style={styles.gridRow}>
	         <View style={styles.gridCol2}>
	           <DataField label="Duration (years)" value={patient.durationOfDiabetes} />
	         </View>
	       </View>
	       <Text style={styles.choiceGroupLabel}>Diabetes Severity</Text>
	       <View style={styles.choiceRow}>
	         <RadioItem label="HbA1c <7.5%" selected={patient.baselineGlycemicSeverity === 'HbA1c <7.5%'} />
	         <RadioItem label="7.5–8.5%" selected={patient.baselineGlycemicSeverity === 'HbA1c 7.5–8.5%'} />
	         <RadioItem label="8.6–10%" selected={patient.baselineGlycemicSeverity === 'HbA1c 8.6–10%'} />
	         <RadioItem label=">10%" selected={patient.baselineGlycemicSeverity === 'HbA1c >10%'} />
	       </View>
	       <Text style={styles.choiceGroupLabel}>Previous Treatment</Text>
	       <View style={styles.choiceRow}>
	         <RadioItem label="Drug-naïve" selected={patient.previousTreatmentType === 'Drug-naïve'} />
	         <RadioItem label="Oral only" selected={patient.previousTreatmentType === 'Oral drugs only'} />
	         <RadioItem label="Insulin only" selected={patient.previousTreatmentType === 'Insulin only'} />
	         <RadioItem label="Oral + Insulin" selected={patient.previousTreatmentType === 'Oral drugs + Insulin'} />
	       </View>
	       {patient.diabetesComplications && (
	         <>
	           <Text style={styles.choiceGroupLabel}>Diabetes Complications</Text>
	           <View style={styles.choiceRow}>
	             <CheckboxItem label="Neuropathy" checked={!!patient.diabetesComplications.neuropathy} />
	             <CheckboxItem label="Retinopathy" checked={!!patient.diabetesComplications.retinopathy} />
	             <CheckboxItem label="Nephropathy" checked={!!patient.diabetesComplications.nephropathy} />
	             <CheckboxItem label="CAD/Stroke" checked={!!patient.diabetesComplications.cadOrStroke} />
	           </View>
	         </>
	       )}
	       <Text style={styles.sectionHeading}>3. COMORBIDITIES</Text>
	       {patient.comorbidities && (
	         <>
	           <View style={styles.choiceRow}>
	             <CheckboxItem label="Hypertension" checked={!!patient.comorbidities.hypertension} />
	             <CheckboxItem label="Dyslipidemia" checked={!!patient.comorbidities.dyslipidemia} />
	             <CheckboxItem label="Obesity" checked={!!patient.comorbidities.obesity} />
	             <CheckboxItem label="ASCVD" checked={!!patient.comorbidities.ascvd} />
	             <CheckboxItem label="Heart Failure" checked={!!patient.comorbidities.heartFailure} />
	             <CheckboxItem label="CKD" checked={!!patient.comorbidities.chronicKidneyDisease} />
	           </View>
	           {patient.comorbidities.chronicKidneyDisease && (
	             <>
	               <Text style={styles.choiceGroupLabel}>CKD eGFR Category</Text>
	               <View style={styles.choiceRow}>
	                 <RadioItem label="≥90" selected={patient.comorbidities.ckdEgfrCategory === '≥90'} />
	                 <RadioItem label="60–89" selected={patient.comorbidities.ckdEgfrCategory === '60–89'} />
	                 <RadioItem label="45–59" selected={patient.comorbidities.ckdEgfrCategory === '45–59'} />
	                 <RadioItem label="30–44" selected={patient.comorbidities.ckdEgfrCategory === '30–44'} />
	               </View>
	             </>
	           )}
	         </>
	       )}

	       {/* SECTION 4: PRIOR ANTI-DIABETIC THERAPY */}
	       <Text style={styles.sectionHeading}>4. PRIOR ANTI-DIABETIC THERAPY</Text>
	       {patient.previousDrugClasses && (
	         <>
	           <View style={styles.choiceRow}>
	             <CheckboxItem label="Metformin" checked={!!patient.previousDrugClasses.metformin} />
	             <CheckboxItem label="Sulfonylurea" checked={!!patient.previousDrugClasses.sulfonylurea} />
	             <CheckboxItem label="DPP4 Inhibitor" checked={!!patient.previousDrugClasses.dpp4Inhibitor} />
	             <CheckboxItem label="SGLT2 Inhibitor" checked={!!patient.previousDrugClasses.sglt2Inhibitor} />
	             <CheckboxItem label="TZD" checked={!!patient.previousDrugClasses.tzd} />
	             <CheckboxItem label="Insulin" checked={!!patient.previousDrugClasses.insulin} />
	           </View>
	         </>
	       )}
	       <Text style={styles.sectionHeading}>5. REASON FOR KC MESEMPA INITIATION</Text>
	       {patient.reasonForTripleFDC && (
	         <>
	           <View style={styles.choiceRow}>
	             <CheckboxItem label="Inadequate Glycemic Control" checked={!!patient.reasonForTripleFDC.inadequateGlycemicControl} />
	             <CheckboxItem label="Weight Concerns" checked={!!patient.reasonForTripleFDC.weightConcerns} />
	             <CheckboxItem label="Hypoglycemia on Prior Therapy" checked={!!patient.reasonForTripleFDC.hypoglycemiaOnPriorTherapy} />
	             <CheckboxItem label="High Pill Burden" checked={!!patient.reasonForTripleFDC.highPillBurden} />
	             <CheckboxItem label="Poor Adherence" checked={!!patient.reasonForTripleFDC.poorAdherence} />
	             <CheckboxItem label="Cost Considerations" checked={!!patient.reasonForTripleFDC.costConsiderations} />
	             <CheckboxItem label="Physician Clinical Judgment" checked={!!patient.reasonForTripleFDC.physicianClinicalJudgment} />
	           </View>
	         </>
	       )}

	       {/* SECTION 6: BASELINE ASSESSMENT (WEEK 0) */}
	       {baseline && (
	         <>
	           <Text style={styles.sectionHeading}>6. BASELINE ASSESSMENT (WEEK 0)</Text>
	           <DataField label="Baseline Date" value={patient.baselineVisitDate} />
	           <TwoColRow label1="HbA1c (%)" value1={baseline.hba1c} label2="FPG (mg/dL)" value2={baseline.fpg} />
	           <TwoColRow label1="PPG (mg/dL)" value1={baseline.ppg} label2="Weight (kg)" value2={baseline.weight} />
	           <TwoColRow label1="BP (mmHg)" value1={baseline.bloodPressureSystolic ? `${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}` : '—'} label2="Heart Rate (bpm)" value2={baseline.heartRate} />
	           <TwoColRow label1="Serum Creatinine" value1={baseline.serumCreatinine} label2="eGFR (mL/min)" value2={baseline.egfr} />
	           <DataField label="Urinalysis" value={baseline.urinalysis} />
	           <DataField label="Dose Prescribed" value={baseline.dosePrescribed} />
	           <DataField label="Initiation Date" value={baseline.treatmentInitiationDate} />
	           {baseline.counseling && (
	             <>
	               <Text style={styles.choiceGroupLabel}>Counselling Provided</Text>
	               <View style={styles.choiceRow}>
	                 <CheckboxItem label="Diet & Lifestyle" checked={!!baseline.counseling.dietAndLifestyle} />
	                 <CheckboxItem label="Hypoglycemia Awareness" checked={!!baseline.counseling.hypoglycemiaAwareness} />
	                 <CheckboxItem label="UTI/Genital Awareness" checked={!!baseline.counseling.utiGenitialInfectionAwareness} />
	                 <CheckboxItem label="Hydration Advice" checked={!!baseline.counseling.hydrationAdvice} />
	               </View>
	             </>
	           )}
	         </>
	       )}

	       {/* SECTION 7: FOLLOW-UP VISITS (all visits, auto-paginated) */}
	       {visitsToShow.length > 0 && visitsToShow.map((visit, visitIdx) => (
	         <View key={visitIdx} style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: visitIdx < visitsToShow.length - 1 ? 1 : 0, borderBottomColor: COLORS.BORDER_GREY }}>
	           <Text style={styles.sectionHeading}>7.{visitIdx + 1} FOLLOW-UP VISIT {visitIdx + 1}</Text>
	           <DataField label="Visit Date" value={visit.visitDate} />
	           <TwoColRow label1="HbA1c (%)" value1={visit.hba1c} label2="FPG (mg/dL)" value2={visit.fpg} />
	           <TwoColRow label1="PPG (mg/dL)" value1={visit.ppg} label2="Weight (kg)" value2={visit.weight} />
	           <TwoColRow label1="BP (mmHg)" value1={visit.bloodPressureSystolic ? `${visit.bloodPressureSystolic}/${visit.bloodPressureDiastolic}` : '—'} label2="Heart Rate (bpm)" value2={visit.heartRate} />
	           <TwoColRow label1="Serum Creatinine" value1={visit.serumCreatinine} label2="eGFR (mL/min)" value2={visit.egfr} />
	           <DataField label="Urinalysis" value={visit.urinalysis} />
	           {visit.glycemicResponse && (
	             <>
	               <Text style={styles.choiceGroupLabel}>Glycemic Response</Text>
	               <AssessmentRadioGroup label="Category" options={['Super-responder', 'Responder', 'Partial responder', 'Non-responder']} selectedValue={visit.glycemicResponse.category} />
	               {visit.glycemicResponse.hba1cChange !== null && (
	                 <DataField label="HbA1c Change (%)" value={visit.glycemicResponse.hba1cChange} />
	               )}
	             </>
	           )}
	           {visit.outcomes && (
	             <>
	               <Text style={styles.choiceGroupLabel}>Clinical Outcomes</Text>
	               <AssessmentRadioGroup label="Weight Change" options={['Loss ≥3 kg', 'Loss 1–2.9 kg', 'Neutral', 'Gain']} selectedValue={visit.outcomes.weightChange} />
	               <DataField label="BP Control Achieved" value={visit.outcomes.bpControlAchieved} />
	               <AssessmentRadioGroup label="Renal Outcome" options={['Improved eGFR', 'Stable eGFR', 'Decline <10%', 'Decline ≥10%']} selectedValue={visit.outcomes.renalOutcome} />
	             </>
	           )}
	           {visit.adherence && (
	             <>
	               <Text style={styles.choiceGroupLabel}>Adherence & Durability</Text>
	               <DataField label="Continuing Treatment" value={visit.adherence.patientContinuingTreatment} />
	               {!visit.adherence.patientContinuingTreatment && (
	                 <AssessmentRadioGroup label="Discontinuation Reason" options={['Adverse event', 'Lack of efficacy', 'Cost', 'Patient preference', 'Other']} selectedValue={visit.adherence.discontinuationReason} />
	               )}
	               <DataField label="Missed Doses (7d)" value={visit.adherence.missedDosesInLast7Days} />
	               <DataField label="Add-on Therapy" value={visit.adherence.addOnOrChangedTherapy} />
	             </>
	           )}
	           {visit.eventsOfSpecialInterest && (
	             <>
	               <Text style={styles.choiceGroupLabel}>Events of Special Interest</Text>
	               <View style={styles.choiceRow}>
	                 <CheckboxItem label="Hypoglycemia - Mild" checked={!!visit.eventsOfSpecialInterest.hypoglycemiaMild} />
	                 <CheckboxItem label="Hypoglycemia - Moderate" checked={!!visit.eventsOfSpecialInterest.hypoglycemiaModerate} />
	                 <CheckboxItem label="Hypoglycemia - Severe" checked={!!visit.eventsOfSpecialInterest.hypoglycemiaSevere} />
	                 <CheckboxItem label="UTI" checked={!!visit.eventsOfSpecialInterest.uti} />
	                 <CheckboxItem label="Genital Mycotic Infection" checked={!!visit.eventsOfSpecialInterest.genitalMycoticInfection} />
	                 <CheckboxItem label="Dizziness / Dehydration" checked={!!visit.eventsOfSpecialInterest.dizzinessDehydrationSymptoms} />
	                 <CheckboxItem label="Hospitalization / ER Visit" checked={!!visit.eventsOfSpecialInterest.hospitalizationOrErVisit} />
	               </View>
	             </>
	           )}
	           {visit.physicianAssessment && (
	             <>
	               <Text style={styles.choiceGroupLabel}>Physician Assessment</Text>
	               <AssessmentRadioGroup label="Overall Efficacy" options={['Excellent', 'Good', 'Moderate', 'Poor']} selectedValue={visit.physicianAssessment.overallEfficacy} />
	               <AssessmentRadioGroup label="Overall Tolerability" options={['Excellent', 'Good', 'Fair', 'Poor']} selectedValue={visit.physicianAssessment.overallTolerability} />
	               <AssessmentRadioGroup label="Compliance Judgment" options={['Excellent', 'Good', 'Fair', 'Poor']} selectedValue={visit.physicianAssessment.complianceJudgment} />
	               <DataField label="Prefer Long-term" value={visit.physicianAssessment.preferKcMeSempaForLongTerm} />
	             </>
	           )}
	         </View>
	       ))}

	       {/* FOOTER (auto-paginated) */}
	       <View style={styles.footer} fixed>
	         <Text style={styles.footerText}>Confidential | {patient.patientCode}</Text>
	         <Text style={styles.footerText}>Auto-paginated</Text>
	       </View>
	     </Page>

	     {/* FINAL PAGE: DATA PRIVACY & DECLARATION (always last) */}
	     <Page size="A4" style={styles.page}>
	       <View style={{ marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER_GREY }}>
	         <Text style={styles.headerTitle}>KC MeSempa - RWE Study | {patient.patientCode}</Text>
	       </View>
	       <Text style={styles.sectionHeading}>8. DATA PRIVACY & CONFIDENTIALITY</Text>
	       {followUp?.dataPrivacy && (
	         <>
	           <View style={styles.choiceRow}>
	             <CheckboxItem label="No Personal Identifiers Recorded" checked={!!followUp.dataPrivacy.noPersonalIdentifiersRecorded} />
	             <CheckboxItem label="Data Collected as Routine Clinical Practice" checked={!!followUp.dataPrivacy.dataCollectedAsRoutineClinicalPractice} />
	             <CheckboxItem label="Patient Identity Mapping at Clinic Only" checked={!!followUp.dataPrivacy.patientIdentityMappingAtClinicOnly} />
	           </View>
	         </>
	       )}
	       <Text style={styles.sectionHeading}>9. PHYSICIAN DECLARATION & CERTIFICATION</Text>
	       <Text style={{ fontSize: 8, marginBottom: 8, lineHeight: 1.3 }}>
	         I confirm that the information provided in this Case Record Form is accurate and complete to the best of my knowledge.
	       </Text>
	       <View style={styles.gridRow}>
	         <View style={styles.gridCol2}>
	           <DataField label="Physician Name" value={doctor?.name} />
	         </View>
	         <View style={styles.gridCol2}>
	           <DataField label="Qualification" value={doctor?.qualification} />
	         </View>
	       </View>
	       <View style={styles.gridRow}>
	         <View style={styles.gridCol2}>
	           <DataField label="Registration No" value={doctor?.registrationNumber} />
	         </View>
	         <View style={styles.gridCol2}>
	           <DataField label="Date" value={dateStr} />
	         </View>
	       </View>
	       <View style={styles.signatureSection}>
	         <View style={styles.signatureGrid}>
	           <View style={styles.signatureBox}>
	             <Text style={styles.signatureLabel}>Authorized Physician</Text>
	             <Text style={styles.signatureLabel}>Signature</Text>
	             <View style={{ flex: 1 }} />
	             <Text style={{ fontSize: 6, color: COLORS.TEXT_LIGHT }}>Date: ___________</Text>
	           </View>
	           <View style={styles.stampBox}>
	             <Text style={styles.signatureLabel}>Official Hospital/Clinic Stamp</Text>
	           </View>
	         </View>
	       </View>
	       <View style={styles.footer} fixed>
	         <Text style={styles.footerText}>Confidential | {patient.patientCode}</Text>
	         <Text style={styles.footerText}>Declaration</Text>
	       </View>
	     </Page>
	   </Document>
	)
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function downloadPatientPDF(
	patient: Patient,
	baseline: BaselineData | null,
	followUp: FollowUpData | null,
	followUps?: FollowUpData[],
	doctor?: Doctor
) {
	try {
		// Load logo image as base64
		const logoBase64 = await loadImageAsBase64('/logo.jpg')

		const pdfDocument = (
			<PatientCRFDocument
				patient={patient}
				baseline={baseline}
				followUp={followUp}
				followUps={followUps}
				doctor={doctor}
				logoBase64={logoBase64}
			/>
		)

		const blob = await pdf(pdfDocument).toBlob()
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `CRF_${patient.patientCode}_${new Date().toISOString().split('T')[0]}.pdf`
		link.click()
		URL.revokeObjectURL(url)
	} catch (error) {
		console.error('Error generating PDF:', error)
		throw error
	}
}

export function downloadCSV(
	patient: Patient,
	baseline: BaselineData | null,
	followUp: FollowUpData | null,
	doctor?: Doctor
): void {
	let csv = 'Kollectcare - CRF Clinical Trial Report\n'
	csv += `Generated: ${new Date().toLocaleDateString()}\n\n`

	if (doctor) {
		csv += `Investigator,${doctor.name}\n`
		csv += `Registration,${doctor.registrationNumber || 'N/A'}\n\n`
	}

	csv += 'PATIENT INFORMATION\n'
	csv += `Patient Code,${patient.patientCode}\n`
	csv += `Age,${patient.age}\n`
	csv += `Gender,${patient.gender}\n`
	csv += `Duration of Diabetes,${patient.durationOfDiabetes} years\n\n`

	if (baseline) {
		csv += 'BASELINE DATA\n'
		csv += `HbA1c,%,${baseline.hba1c}\n`
		csv += `FPG,mg/dL,${baseline.fpg}\n`
		csv += `Weight,kg,${baseline.weight}\n`
		csv += `Blood Pressure,mmHg,${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}\n\n`
	}

	if (followUp) {
		csv += 'FOLLOW-UP DATA\n'
		csv += `HbA1c,%,${followUp.hba1c}\n`
		csv += `FPG,mg/dL,${followUp.fpg}\n`
		csv += `Weight,kg,${followUp.weight}\n`
		csv += `Blood Pressure,mmHg,${followUp.bloodPressureSystolic}/${followUp.bloodPressureDiastolic}\n`
	}

	const blob = new Blob([csv], { type: 'text/csv' })
	const url = window.URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `CRF_${patient.patientCode}_${new Date().toISOString().split('T')[0]}.csv`
	a.click()
	window.URL.revokeObjectURL(url)
}

export function downloadExcel(
	patient: Patient,
	baseline: BaselineData | null,
	followUp: FollowUpData | null,
	doctor?: Doctor
): void {
	let csv = 'Kollectcare CRF Data Export\n'
	csv += `Generated,${new Date().toLocaleDateString()}\n\n`

	if (doctor) {
		csv += `Investigator,${doctor.name}\n`
		csv += `Registration,${doctor.registrationNumber || 'N/A'}\n\n`
	}

	csv += 'PATIENT INFORMATION\n'
	csv += `Patient Code,${patient.patientCode}\n`
	csv += `Age,${patient.age}\n`
	csv += `Gender,${patient.gender}\n`
	csv += `Duration of Diabetes,${patient.durationOfDiabetes} years\n\n`

	if (baseline) {
		csv += 'BASELINE DATA\n'
		csv += `HbA1c (%),${baseline.hba1c}\n`
		csv += `FPG (mg/dL),${baseline.fpg}\n`
		csv += `Weight (kg),${baseline.weight}\n`
		csv += `Blood Pressure (mmHg),${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}\n`
		csv += `Serum Creatinine,${baseline.serumCreatinine}\n`
		csv += `eGFR,${baseline.egfr}\n\n`
	}

	if (followUp) {
		csv += 'FOLLOW-UP DATA\n'
		csv += `HbA1c (%),${followUp.hba1c}\n`
		csv += `FPG (mg/dL),${followUp.fpg}\n`
		csv += `Weight (kg),${followUp.weight}\n`
		csv += `Blood Pressure (mmHg),${followUp.bloodPressureSystolic}/${followUp.bloodPressureDiastolic}\n`
		csv += `Serum Creatinine,${followUp.serumCreatinine}\n`
		csv += `eGFR,${followUp.egfr}\n`
	}

	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	const url = window.URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `CRF_${patient.patientCode}_${new Date().toISOString().split('T')[0]}.csv`
	a.click()
	window.URL.revokeObjectURL(url)
}
