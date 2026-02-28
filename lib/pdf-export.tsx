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
	Line,
	pdf,
	StyleSheet,
} from '@react-pdf/renderer'
import type { Patient, BaselineData, FollowUpData, Doctor } from './types'

// ============================================================================
// PROFESSIONAL COLOR PALETTE
// ============================================================================
const COLORS = {
	PRIMARY_NAVY: '#1a5276',
	SECONDARY_BLUE: '#3498db',
	TEXT_DARK: '#333333',
	TEXT_LIGHT: '#555555',
	BG_LIGHT_BLUE: '#ebf5fb',
	BG_GREY_ZEBRA: '#f8f9fa',
	BORDER_GREY: '#d1d5db',
	WHITE: '#ffffff',
	ACCENT_BLUE: '#3498db',
}

// ============================================================================
// PDF STYLES
// ============================================================================
const styles = StyleSheet.create({
	page: {
		padding: 30,
		paddingTop: 35,
		paddingBottom: 50,
		backgroundColor: COLORS.WHITE,
		fontFamily: 'Helvetica',
		fontSize: 10,
		color: COLORS.TEXT_DARK,
	},
	headerContainer: {
		backgroundColor: COLORS.PRIMARY_NAVY,
		color: COLORS.WHITE,
		padding: 15,
		marginBottom: 20,
		borderRadius: 3,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 3,
	},
	headerSubtitle: {
		fontSize: 9,
		marginBottom: 2,
	},
	headerMeta: {
		fontSize: 8,
		marginTop: 3,
	},
	sectionHeading: {
		backgroundColor: COLORS.PRIMARY_NAVY,
		color: COLORS.WHITE,
		padding: 8,
		paddingLeft: 12,
		marginTop: 15,
		marginBottom: 10,
		fontSize: 11,
		fontWeight: 'bold',
		borderLeftWidth: 4,
		borderLeftColor: COLORS.ACCENT_BLUE,
	},
	row: {
		flexDirection: 'row',
		marginBottom: 5,
	},
	twoColRow: {
		flexDirection: 'row',
		marginBottom: 8,
	},
	col: {
		flex: 1,
	},
	col2: {
		flex: 2,
	},
	label: {
		fontSize: 9,
		fontWeight: 'bold',
		color: COLORS.PRIMARY_NAVY,
		marginRight: 5,
		minWidth: 80,
	},
	value: {
		fontSize: 9,
		color: COLORS.TEXT_DARK,
	},
	checkboxContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		marginLeft: 10,
	},
	radioContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		marginLeft: 10,
	},
	checkboxLabel: {
		fontSize: 9,
		color: COLORS.TEXT_DARK,
		marginLeft: 5,
	},
	choiceGroupLabel: {
		fontSize: 9,
		fontWeight: 'bold',
		color: COLORS.PRIMARY_NAVY,
		marginTop: 8,
		marginBottom: 4,
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: COLORS.BORDER_GREY,
		paddingVertical: 6,
		paddingHorizontal: 8,
	},
	tableRowEven: {
		backgroundColor: COLORS.BG_GREY_ZEBRA,
	},
	tableCell: {
		flex: 1,
		fontSize: 8,
		paddingRight: 5,
	},
	footerContainer: {
		position: 'absolute',
		bottom: 20,
		left: 30,
		right: 30,
		borderTopWidth: 1,
		borderTopColor: COLORS.BORDER_GREY,
		paddingTop: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	footerText: {
		fontSize: 7,
		color: COLORS.TEXT_LIGHT,
	},
})

// ============================================================================
// SVG VECTOR CHECKBOX COMPONENT
// ============================================================================
interface VectorCheckboxProps {
	checked: boolean
	size?: number
}

const VectorCheckbox: React.FC<VectorCheckboxProps> = ({ checked, size = 10 }) => {
	return (
		<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
			{/* Empty or filled square */}
			<Rect
				x="1"
				y="1"
				width={size - 2}
				height={size - 2}
				fill={checked ? COLORS.PRIMARY_NAVY : 'none'}
				stroke={COLORS.PRIMARY_NAVY}
				strokeWidth="1"
			/>
			{/* X mark when checked */}
			{checked && (
				<>
					<Line
						x1="3"
						y1="3"
						x2={size - 3}
						y2={size - 3}
						stroke={COLORS.WHITE}
						strokeWidth="1.5"
					/>
					<Line
						x1={size - 3}
						y1="3"
						x2="3"
						y2={size - 3}
						stroke={COLORS.WHITE}
						strokeWidth="1.5"
					/>
				</>
			)}
		</Svg>
	)
}

// ============================================================================
// SVG VECTOR RADIO COMPONENT
// ============================================================================
interface VectorRadioProps {
	selected: boolean
	size?: number
}

const VectorRadio: React.FC<VectorRadioProps> = ({ selected, size = 10 }) => {
	return (
		<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
			{/* Outer circle */}
			<Circle
				cx={size / 2}
				cy={size / 2}
				r={(size - 2) / 2}
				fill="none"
				stroke={COLORS.PRIMARY_NAVY}
				strokeWidth="1"
			/>
			{/* Inner blue dot when selected */}
			{selected && (
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={(size - 6) / 2}
					fill={COLORS.ACCENT_BLUE}
				/>
			)}
		</Svg>
	)
}

// ============================================================================
// CHOICE ITEM COMPONENTS (Checkbox + Label)
// ============================================================================
const CheckboxItem: React.FC<{ label: string; checked: boolean }> = ({ label, checked }) => (
	<View style={styles.checkboxContainer}>
		<VectorCheckbox checked={checked} size={10} />
		<Text style={styles.checkboxLabel}>{label}</Text>
	</View>
)

const RadioItem: React.FC<{ label: string; selected: boolean }> = ({ label, selected }) => (
	<View style={styles.radioContainer}>
		<VectorRadio selected={selected} size={10} />
		<Text style={styles.checkboxLabel}>{label}</Text>
	</View>
)

// ============================================================================
// CHOICE GROUP - MULTIPLE ITEMS WITH BOLD LABEL
// ============================================================================
interface ChoiceGroupProps {
	label: string
	children: React.ReactNode
}

const ChoiceGroup: React.FC<ChoiceGroupProps> = ({ label, children }) => (
	<View style={{ marginBottom: 8 }}>
		<Text style={styles.choiceGroupLabel}>{label}</Text>
		{children}
	</View>
)

// ============================================================================
// KEY-VALUE ROW COMPONENT
// ============================================================================
interface KeyValueRowProps {
	label: string
	value: any
}

const KeyValueRow: React.FC<KeyValueRowProps> = ({ label, value }) => {
	let displayValue = '—'

	if (value === true) displayValue = 'Yes'
	else if (value === false) displayValue = 'No'
	else if (value !== null && value !== undefined && typeof value === 'number')
		displayValue = value.toFixed(2)
	else if (value) displayValue = value.toString()

	return (
		<View style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.value}>{displayValue}</Text>
		</View>
	)
}

// ============================================================================
// TWO-COLUMN DEMOGRAPHICS ROW
// ============================================================================
interface TwoColDemoRowProps {
	label1: string
	value1: any
	label2: string
	value2: any
}

const TwoColDemoRow: React.FC<TwoColDemoRowProps> = ({ label1, value1, label2, value2 }) => {
	const formatValue = (val: any) => {
		if (val === true) return 'Yes'
		if (val === false) return 'No'
		if (val !== null && val !== undefined && typeof val === 'number') return val.toFixed(2)
		if (val) return val.toString()
		return '—'
	}

	return (
		<View style={styles.twoColRow}>
			<View style={styles.col}>
				<Text style={styles.label}>{label1}</Text>
				<Text style={styles.value}>{formatValue(value1)}</Text>
			</View>
			<View style={styles.col}>
				<Text style={styles.label}>{label2}</Text>
				<Text style={styles.value}>{formatValue(value2)}</Text>
			</View>
		</View>
	)
}

// ============================================================================
// MAIN PATIENT CRF DOCUMENT COMPONENT
// ============================================================================
interface PatientCRFDocumentProps {
	patient: Patient
	baseline: BaselineData | null
	followUp: FollowUpData | null
	followUps?: FollowUpData[]
	doctor?: Doctor
}

const PatientCRFDocument: React.FC<PatientCRFDocumentProps> = ({
	patient,
	baseline,
	followUp,
	followUps,
	doctor,
}) => {
	const visitsToShow = followUps && followUps.length > 0 ? followUps : followUp ? [followUp] : []
	const today = new Date()
	const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

	return (
		<Document>
			{/* ========== PAGE 1: HEADER + PATIENT ID + DEMOGRAPHICS ========== */}
			<Page size="A4" style={styles.page}>
				{/* HEADER */}
				<View style={styles.headerContainer}>
					<Text style={styles.headerTitle}>KC MeSempa - RWE Study</Text>
					<Text style={styles.headerSubtitle}>Case Record Form (CRF) - Complete Patient Assessment</Text>
					<Text style={styles.headerMeta}>
						Patient: {patient.patientCode} | Generated: {dateStr}
					</Text>
				</View>

				{/* SECTION 1: PATIENT IDENTIFICATION & DEMOGRAPHICS */}
				<Text style={styles.sectionHeading}>1. PATIENT IDENTIFICATION & DEMOGRAPHICS</Text>

				<KeyValueRow label="Patient Code:" value={patient.patientCode} />
				<KeyValueRow label="Study Site:" value={patient.studySiteCode} />
				<KeyValueRow label="Investigator:" value={patient.investigatorName || doctor?.name || '—'} />
				<KeyValueRow label="Baseline Date:" value={patient.baselineVisitDate} />
				<KeyValueRow label="Age (years):" value={patient.age} />

				{/* GENDER - Multiple choice with label */}
				<ChoiceGroup label="Gender:">
					<RadioItem label="Male" selected={patient.gender === 'Male'} />
					<RadioItem label="Female" selected={patient.gender === 'Female'} />
					<RadioItem label="Other" selected={patient.gender === 'Other'} />
				</ChoiceGroup>

				{/* TWO-COLUMN DEMOGRAPHICS */}
				<TwoColDemoRow
					label1="Height (cm):"
					value1={patient.height}
					label2="Weight (kg):"
					value2={patient.weight}
				/>
				<KeyValueRow label="BMI (kg/m²):" value={patient.bmi} />

				{/* SMOKING STATUS - Multiple choice with label */}
				<ChoiceGroup label="Smoking Status:">
					<RadioItem label="Never" selected={patient.smokingStatus === 'Never'} />
					<RadioItem label="Current" selected={patient.smokingStatus === 'Current'} />
					<RadioItem label="Former" selected={patient.smokingStatus === 'Former'} />
				</ChoiceGroup>

				{/* ALCOHOL INTAKE - Multiple choice with label */}
				<ChoiceGroup label="Alcohol Intake:">
					<RadioItem label="No" selected={patient.alcoholIntake === 'No'} />
					<RadioItem label="Occasional" selected={patient.alcoholIntake === 'Occasional'} />
					<RadioItem label="Regular" selected={patient.alcoholIntake === 'Regular'} />
				</ChoiceGroup>

				{/* PHYSICAL ACTIVITY - Multiple choice with label */}
				<ChoiceGroup label="Physical Activity:">
					<RadioItem label="Sedentary" selected={patient.physicalActivityLevel === 'Sedentary'} />
					<RadioItem label="Moderate" selected={patient.physicalActivityLevel === 'Moderate'} />
					<RadioItem label="Active" selected={patient.physicalActivityLevel === 'Active'} />
				</ChoiceGroup>

				{/* FOOTER */}
				<View style={styles.footerContainer} fixed>
					<Text style={styles.footerText}>
						Confidential Medical Record | Patient: {patient.patientCode}
					</Text>
					<Text style={styles.footerText}>Page 1</Text>
				</View>
			</Page>

			{/* ========== PAGE 2: DIABETES HISTORY & COMORBIDITIES ========== */}
			<Page size="A4" style={styles.page}>
				{/* SECTION 2: DIABETES HISTORY & CLINICAL PHENOTYPE */}
				<Text style={styles.sectionHeading}>2. DIABETES HISTORY & CLINICAL PHENOTYPE</Text>

				<KeyValueRow label="Duration (years):" value={patient.durationOfDiabetes} />

				{/* DIABETES SEVERITY - Multiple choice with label */}
				<ChoiceGroup label="Diabetes Severity:">
					<RadioItem label="HbA1c <7.5%" selected={patient.baselineGlycemicSeverity === 'HbA1c <7.5%'} />
					<RadioItem label="HbA1c 7.5–8.5%" selected={patient.baselineGlycemicSeverity === 'HbA1c 7.5–8.5%'} />
					<RadioItem label="HbA1c 8.6–10%" selected={patient.baselineGlycemicSeverity === 'HbA1c 8.6–10%'} />
					<RadioItem label="HbA1c >10%" selected={patient.baselineGlycemicSeverity === 'HbA1c >10%'} />
				</ChoiceGroup>

				{/* PREVIOUS TREATMENT - Multiple choice with label */}
				<ChoiceGroup label="Previous Treatment:">
					<RadioItem label="Drug-naïve" selected={patient.previousTreatmentType === 'Drug-naïve'} />
					<RadioItem label="Oral drugs only" selected={patient.previousTreatmentType === 'Oral drugs only'} />
					<RadioItem label="Insulin only" selected={patient.previousTreatmentType === 'Insulin only'} />
					<RadioItem label="Oral drugs + Insulin" selected={patient.previousTreatmentType === 'Oral drugs + Insulin'} />
				</ChoiceGroup>

				{/* DIABETES COMPLICATIONS */}
				{patient.diabetesComplications && (
					<ChoiceGroup label="Diabetes Complications:">
						<CheckboxItem label="Neuropathy" checked={!!patient.diabetesComplications.neuropathy} />
						<CheckboxItem label="Retinopathy" checked={!!patient.diabetesComplications.retinopathy} />
						<CheckboxItem label="Nephropathy" checked={!!patient.diabetesComplications.nephropathy} />
						<CheckboxItem label="CAD/Stroke" checked={!!patient.diabetesComplications.cadOrStroke} />
						<CheckboxItem
							label="None"
							checked={
								!patient.diabetesComplications.neuropathy &&
								!patient.diabetesComplications.retinopathy &&
								!patient.diabetesComplications.nephropathy &&
								!patient.diabetesComplications.cadOrStroke
							}
						/>
					</ChoiceGroup>
				)}

				{/* SECTION 3: COMORBIDITIES */}
				<Text style={styles.sectionHeading}>3. COMORBIDITIES</Text>

				{patient.comorbidities && (
					<>
						<ChoiceGroup label="Comorbidities Present:">
							<CheckboxItem label="Hypertension" checked={!!patient.comorbidities.hypertension} />
							<CheckboxItem label="Dyslipidemia" checked={!!patient.comorbidities.dyslipidemia} />
							<CheckboxItem label="Obesity" checked={!!patient.comorbidities.obesity} />
							<CheckboxItem label="ASCVD" checked={!!patient.comorbidities.ascvd} />
							<CheckboxItem label="Heart Failure" checked={!!patient.comorbidities.heartFailure} />
							<CheckboxItem label="Chronic Kidney Disease" checked={!!patient.comorbidities.chronicKidneyDisease} />
							<CheckboxItem
								label="None"
								checked={
									!patient.comorbidities.hypertension &&
									!patient.comorbidities.dyslipidemia &&
									!patient.comorbidities.obesity &&
									!patient.comorbidities.ascvd &&
									!patient.comorbidities.heartFailure &&
									!patient.comorbidities.chronicKidneyDisease
								}
							/>
						</ChoiceGroup>

						{/* CKD CATEGORY - Multiple choice with label */}
						<ChoiceGroup label="CKD eGFR Category:">
							<RadioItem label="≥90" selected={patient.comorbidities.ckdEgfrCategory === '≥90'} />
							<RadioItem label="60–89" selected={patient.comorbidities.ckdEgfrCategory === '60–89'} />
							<RadioItem label="45–59" selected={patient.comorbidities.ckdEgfrCategory === '45–59'} />
							<RadioItem label="30–44" selected={patient.comorbidities.ckdEgfrCategory === '30–44'} />
						</ChoiceGroup>
					</>
				)}

				{/* FOOTER */}
				<View style={styles.footerContainer} fixed>
					<Text style={styles.footerText}>
						Confidential Medical Record | Patient: {patient.patientCode}
					</Text>
					<Text style={styles.footerText}>Page 2</Text>
				</View>
			</Page>

			{/* ========== PAGE 3: PRIOR THERAPY & INITIATION REASONS ========== */}
			<Page size="A4" style={styles.page}>
				{/* SECTION 4: PRIOR ANTI-DIABETIC THERAPY */}
				<Text style={styles.sectionHeading}>4. PRIOR ANTI-DIABETIC THERAPY</Text>

				{patient.previousDrugClasses && (
					<ChoiceGroup label="Previous Drug Classes:">
						<CheckboxItem label="Metformin" checked={!!patient.previousDrugClasses.metformin} />
						<CheckboxItem label="Sulfonylurea" checked={!!patient.previousDrugClasses.sulfonylurea} />
						<CheckboxItem label="DPP4 Inhibitor" checked={!!patient.previousDrugClasses.dpp4Inhibitor} />
						<CheckboxItem label="SGLT2 Inhibitor" checked={!!patient.previousDrugClasses.sglt2Inhibitor} />
						<CheckboxItem label="TZD" checked={!!patient.previousDrugClasses.tzd} />
						<CheckboxItem label="Insulin" checked={!!patient.previousDrugClasses.insulin} />
						{patient.previousDrugClasses.other &&
							patient.previousDrugClasses.other.map((othDrug, idx) => (
								<CheckboxItem key={idx} label={`Other: ${othDrug}`} checked={true} />
							))}
					</ChoiceGroup>
				)}

				{/* SECTION 5: REASON FOR KC MESEMPA INITIATION */}
				<Text style={styles.sectionHeading}>5. REASON FOR KC MESEMPA INITIATION</Text>

				{patient.reasonForTripleFDC && (
					<ChoiceGroup label="Reasons for Initiation:">
						<CheckboxItem
							label="Inadequate Glycemic Control"
							checked={!!patient.reasonForTripleFDC.inadequateGlycemicControl}
						/>
						<CheckboxItem label="Weight Concerns" checked={!!patient.reasonForTripleFDC.weightConcerns} />
						<CheckboxItem
							label="Hypoglycemia on Prior Therapy"
							checked={!!patient.reasonForTripleFDC.hypoglycemiaOnPriorTherapy}
						/>
						<CheckboxItem label="High Pill Burden" checked={!!patient.reasonForTripleFDC.highPillBurden} />
						<CheckboxItem label="Poor Adherence" checked={!!patient.reasonForTripleFDC.poorAdherence} />
						<CheckboxItem
							label="Cost Considerations"
							checked={!!patient.reasonForTripleFDC.costConsiderations}
						/>
						<CheckboxItem
							label="Physician Clinical Judgment"
							checked={!!patient.reasonForTripleFDC.physicianClinicalJudgment}
						/>
						{patient.reasonForTripleFDC.other &&
							patient.reasonForTripleFDC.other.map((othReason, idx) => (
								<CheckboxItem key={idx} label={`Other: ${othReason}`} checked={true} />
							))}
					</ChoiceGroup>
				)}

				{/* FOOTER */}
				<View style={styles.footerContainer} fixed>
					<Text style={styles.footerText}>
						Confidential Medical Record | Patient: {patient.patientCode}
					</Text>
					<Text style={styles.footerText}>Page 3</Text>
				</View>
			</Page>

			{/* ========== PAGE 4: BASELINE ASSESSMENT ========== */}
			{baseline && (
				<Page size="A4" style={styles.page}>
					<Text style={styles.sectionHeading}>6. BASELINE ASSESSMENT (WEEK 0)</Text>

					<KeyValueRow label="Baseline Date:" value={patient.baselineVisitDate} />

					<TwoColDemoRow label1="HbA1c (%):" value1={baseline.hba1c} label2="FPG (mg/dL):" value2={baseline.fpg} />
					<TwoColDemoRow
						label1="PPG (mg/dL):"
						value1={baseline.ppg}
						label2="Weight (kg):"
						value2={baseline.weight}
					/>

					<KeyValueRow
						label="Blood Pressure:"
						value={
							baseline.bloodPressureSystolic
								? `${baseline.bloodPressureSystolic}/${baseline.bloodPressureDiastolic}`
								: '—'
						}
					/>
					<TwoColDemoRow
						label1="Heart Rate (bpm):"
						value1={baseline.heartRate}
						label2="Serum Creatinine:"
						value2={baseline.serumCreatinine}
					/>

					<TwoColDemoRow label1="eGFR (mL/min):" value1={baseline.egfr} label2="Urinalysis:" value2={baseline.urinalysis} />

					<KeyValueRow label="Dose Prescribed:" value={baseline.dosePrescribed} />
					<KeyValueRow label="Initiation Date:" value={baseline.treatmentInitiationDate} />

					{/* COUNSELING PROVIDED */}
					{baseline.counseling && (
						<ChoiceGroup label="Counselling Provided:">
							<CheckboxItem label="Diet & Lifestyle" checked={!!baseline.counseling.dietAndLifestyle} />
							<CheckboxItem label="Hypoglycemia Awareness" checked={!!baseline.counseling.hypoglycemiaAwareness} />
							<CheckboxItem label="UTI/Genital Infection Awareness" checked={!!baseline.counseling.utiGenitialInfectionAwareness} />
							<CheckboxItem label="Hydration Advice" checked={!!baseline.counseling.hydrationAdvice} />
						</ChoiceGroup>
					)}

					{/* FOOTER */}
					<View style={styles.footerContainer} fixed>
						<Text style={styles.footerText}>
							Confidential Medical Record | Patient: {patient.patientCode}
						</Text>
						<Text style={styles.footerText}>Page 4</Text>
					</View>
				</Page>
			)}

			{/* ========== FOLLOW-UP ASSESSMENT PAGES ========== */}
			{visitsToShow.map((visit, visitIdx) => (
				<Page key={visitIdx} size="A4" style={styles.page}>
					<Text style={styles.sectionHeading}>
						7.{visitIdx + 1} FOLLOW-UP VISIT {visitIdx + 1} ASSESSMENT
					</Text>

					<KeyValueRow label="Visit Date:" value={visit.visitDate} />

					<TwoColDemoRow label1="HbA1c (%):" value1={visit.hba1c} label2="FPG (mg/dL):" value2={visit.fpg} />
					<TwoColDemoRow label1="PPG (mg/dL):" value1={visit.ppg} label2="Weight (kg):" value2={visit.weight} />

					<KeyValueRow
						label="Blood Pressure:"
						value={
							visit.bloodPressureSystolic
								? `${visit.bloodPressureSystolic}/${visit.bloodPressureDiastolic}`
								: '—'
						}
					/>
					<TwoColDemoRow
						label1="Heart Rate (bpm):"
						value1={visit.heartRate}
						label2="Serum Creatinine:"
						value2={visit.serumCreatinine}
					/>

					<TwoColDemoRow label1="eGFR (mL/min):" value1={visit.egfr} label2="Urinalysis:" value2={visit.urinalysis} />

					{/* GLYCEMIC RESPONSE */}
					{visit.glycemicResponse && (
						<>
							<Text style={{ ...styles.choiceGroupLabel, marginTop: 12 }}>Glycemic Response:</Text>
							<KeyValueRow label="Category:" value={visit.glycemicResponse.category} />
							{visit.glycemicResponse.hba1cChange !== null && visit.glycemicResponse.hba1cChange !== undefined && (
								<KeyValueRow label="HbA1c Change (%):" value={Number(visit.glycemicResponse.hba1cChange).toFixed(2)} />
							)}
						</>
					)}

					{/* OUTCOMES */}
					{visit.outcomes && (
						<>
							<Text style={{ ...styles.choiceGroupLabel, marginTop: 12 }}>Outcomes:</Text>
							<KeyValueRow label="Weight Change:" value={visit.outcomes.weightChange} />
							<KeyValueRow label="BP Control Achieved:" value={visit.outcomes.bpControlAchieved} />
							<KeyValueRow label="Renal Outcome:" value={visit.outcomes.renalOutcome} />
						</>
					)}

					{/* ADHERENCE */}
					{visit.adherence && (
						<>
							<Text style={{ ...styles.choiceGroupLabel, marginTop: 12 }}>Adherence & Durability:</Text>
							<KeyValueRow label="Continuing Treatment:" value={visit.adherence.patientContinuingTreatment} />
							{!visit.adherence.patientContinuingTreatment && (
								<KeyValueRow label="Discontinuation Reason:" value={visit.adherence.discontinuationReason} />
							)}
							<KeyValueRow label="Missed Doses (7d):" value={visit.adherence.missedDosesInLast7Days} />
							<KeyValueRow label="Add-on/Changed Therapy:" value={visit.adherence.addOnOrChangedTherapy} />
						</>
					)}

					{/* EVENTS OF SPECIAL INTEREST - WITH VECTORCHECKBOX */}
					{visit.eventsOfSpecialInterest && (
						<ChoiceGroup label="Events of Special Interest (tick all that apply):">
							<CheckboxItem
								label="Hypoglycemia – mild (ADA Level 1-Blood Glucose <70 mg/dL and ≥54 mg/dL)"
								checked={!!visit.eventsOfSpecialInterest.hypoglycemiaMild}
							/>
							<CheckboxItem
								label="Hypoglycemia – moderate (ADA Level 2 - Blood glucose <54 mg/dL)"
								checked={!!visit.eventsOfSpecialInterest.hypoglycemiaModerate}
							/>
							<CheckboxItem
								label="Hypoglycemia – severe"
								checked={!!visit.eventsOfSpecialInterest.hypoglycemiaSevere}
							/>
							<CheckboxItem label="UTI" checked={!!visit.eventsOfSpecialInterest.uti} />
							<CheckboxItem
								label="Genital mycotic infection"
								checked={!!visit.eventsOfSpecialInterest.genitalMycoticInfection}
							/>
							<CheckboxItem
								label="Dizziness / dehydration symptoms"
								checked={!!visit.eventsOfSpecialInterest.dizzinessDehydrationSymptoms}
							/>
							<CheckboxItem
								label="Hospitalization / ER visit"
								checked={!!visit.eventsOfSpecialInterest.hospitalizationOrErVisit}
							/>
						</ChoiceGroup>
					)}

					{/* PHYSICIAN ASSESSMENT */}
					{visit.physicianAssessment && (
						<>
							<Text style={{ ...styles.choiceGroupLabel, marginTop: 12 }}>Physician Assessment:</Text>
							<KeyValueRow label="Overall Efficacy:" value={visit.physicianAssessment.overallEfficacy} />
							<KeyValueRow label="Overall Tolerability:" value={visit.physicianAssessment.overallTolerability} />
							<KeyValueRow label="Compliance Judgment:" value={visit.physicianAssessment.complianceJudgment} />
							<KeyValueRow
								label="Prefer Long-term:"
								value={visit.physicianAssessment.preferKcMeSempaForLongTerm}
							/>
						</>
					)}

					{/* FOOTER WITH DYNAMIC PAGE NUMBER */}
					<View style={styles.footerContainer} fixed>
						<Text style={styles.footerText}>
							Confidential Medical Record | Patient: {patient.patientCode}
						</Text>
						<Text style={styles.footerText}>Page {visitIdx + 5}</Text>
					</View>
				</Page>
			))}

			{/* ========== FINAL PAGE: DATA PRIVACY & PHYSICIAN DECLARATION ========== */}
			<Page size="A4" style={styles.page}>
				{/* SECTION: DATA PRIVACY & CONFIDENTIALITY */}
				<Text style={styles.sectionHeading}>8. DATA PRIVACY & CONFIDENTIALITY</Text>

				{followUp?.dataPrivacy && (
					<ChoiceGroup label="Data Privacy Confirmations:">
						<CheckboxItem
							label="No personal identifiers recorded"
							checked={!!followUp.dataPrivacy.noPersonalIdentifiersRecorded}
						/>
						<CheckboxItem
							label="Data collected as routine clinical practice"
							checked={!!followUp.dataPrivacy.dataCollectedAsRoutineClinicalPractice}
						/>
						<CheckboxItem
							label="Patient identity mapping at clinic only"
							checked={!!followUp.dataPrivacy.patientIdentityMappingAtClinicOnly}
						/>
					</ChoiceGroup>
				)}

				{/* SECTION: PHYSICIAN DECLARATION & CERTIFICATION */}
				<Text style={styles.sectionHeading}>9. PHYSICIAN DECLARATION & CERTIFICATION</Text>

				<Text style={{ fontSize: 9, marginBottom: 10, lineHeight: 1.4 }}>
					I confirm that the information provided in this Case Record Form is accurate and complete to the best of my
					knowledge.
				</Text>

				<View style={{ marginBottom: 15 }}>
					<View style={styles.row}>
						<Text style={styles.label}>Physician Name:</Text>
						<Text style={styles.value}>{doctor?.name || '—'}</Text>
					</View>
					<View style={styles.row} />
				</View>

				<View style={{ marginBottom: 15 }}>
					<View style={styles.row}>
						<Text style={styles.label}>Qualification:</Text>
						<Text style={styles.value}>{doctor?.qualification || '—'}</Text>
					</View>
					<View style={styles.row} />
				</View>

				<View style={{ marginBottom: 15 }}>
					<View style={styles.row}>
						<Text style={styles.label}>Date:</Text>
						<Text style={styles.value}>{dateStr}</Text>
					</View>
				</View>

				<View style={{ marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.BORDER_GREY }}>
					<Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>Signature: ___________________</Text>
					<Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>Stamp/Seal:</Text>
				</View>

				{/* FOOTER */}
				<View style={styles.footerContainer} fixed>
					<Text style={styles.footerText}>
						Confidential Medical Record | Patient: {patient.patientCode}
					</Text>
					<Text style={styles.footerText}>
						Page {baseline ? (visitsToShow.length > 0 ? visitsToShow.length + 5 : 5) : visitsToShow.length + 4}
					</Text>
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
		const pdfDocument = (
			<PatientCRFDocument
				patient={patient}
				baseline={baseline}
				followUp={followUp}
				followUps={followUps}
				doctor={doctor}
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
