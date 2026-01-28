// DOCTOR - Study Investigator
export interface Doctor {
  id: string
  name: string                        // Investigator name
  registrationNumber: string          // Medical registration
  qualification: string               // Dr., MBBS, MD, etc.
  email: string
  phone: string
  dateOfBirth: string
  address: string
  studySiteCode: string               // Clinic/Hospital name (Study Site)
  createdAt: string
}

// PATIENT - Anonymized Trial Participant
export interface Patient {
  id: string
  doctorId: string
  patientCode: string                 // Anonymized patient code (PT001, etc.)
  
  // SECTION A - Patient Identification
  studySiteCode: string               // Auto-filled from doctor, can be changed per patient
  investigatorName: string            // Auto-filled from doctor name
  baselineVisitDate: string           // Week 0 visit date
  
  // SECTION B - Demographics & Lifestyle
  age: number
  gender: "Male" | "Female" | "Other"
  height?: number                     // cm
  weight?: number                     // kg
  bmi?: number                        // kg/m² (calculated)
  smokingStatus?: "Never" | "Former" | "Current"
  alcoholIntake?: "No" | "Occasional" | "Regular"
  physicalActivityLevel?: "Sedentary" | "Moderate" | "Active"
  
  // SECTION C - Diabetes History & Phenotype
  durationOfDiabetes: number
  baselineGlycemicSeverity?: "HbA1c <7.5%" | "HbA1c 7.5–8.5%" | "HbA1c 8.6–10%" | "HbA1c >10%"
  diabetesComplications?: {
    neuropathy: boolean
    retinopathy: boolean
    nephropathy: boolean
    cadOrStroke: boolean
    none: boolean
  }
  
  // SECTION D - Comorbidities
  comorbidities?: {
    hypertension: boolean
    dyslipidemia: boolean
    obesity: boolean
    ascvd: boolean
    heartFailure: boolean
    chronicKidneyDisease: boolean
    ckdEgfrCategory?: "≥90" | "60–89" | "45–59" | "30–44"
    other: string[]
  }
  
  // SECTION E - Prior Anti-Diabetic Therapy
  previousTreatmentType?: "Drug-naïve" | "Oral drugs only" | "Insulin only" | "Oral drugs + Insulin"
  previousDrugClasses?: {
    metformin: boolean
    sulfonylurea: boolean
    dpp4Inhibitor: boolean
    sglt2Inhibitor: boolean
    tzd: boolean
    insulin: boolean
    other: string[]
  }
  
  // SECTION E - Reason for Triple FDC
  reasonForTripleFDC?: {
    inadequateGlycemicControl: boolean
    weightConcerns: boolean
    hypoglycemiaOnPriorTherapy: boolean
    highPillBurden: boolean
    poorAdherence: boolean
    costConsiderations: boolean
    physicianClinicalJudgment: boolean
    other: string[]
  }
  
  // Legacy fields (for backward compatibility)
  previousTherapy?: string[]
  
  createdAt: string
}

// BASELINE ASSESSMENT - Week 0
export interface BaselineData {
  patientId: string
  
  // SECTION F - Baseline Clinical & Lab Parameters
  hba1c: number
  fpg: number                         // Fasting Plasma Glucose
  ppg?: number                        // Post-Prandial Glucose
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  heartRate?: number                  // bpm (NEW)
  serumCreatinine?: number
  egfr?: number
  urinalysis: string
  
  // SECTION G - Treatment & Counseling
  dosePrescribed: string
  treatmentInitiationDate: string     // Date KC MeSempa started (NEW)
  counseling?: {                      // Structured counseling (NEW)
    dietAndLifestyle: boolean
    hypoglycemiaAwareness: boolean
    utiGenitialInfectionAwareness: boolean
    hydrationAdvice: boolean
  }
  
  // Legacy fields (for backward compatibility)
  dietAdvice?: boolean
  counselingProvided?: boolean
  
  createdAt: string
  updatedAt: string
}

// FOLLOW-UP ASSESSMENT - Week 12 ± 2 weeks
export interface FollowUpData {
  patientId: string
  visitNumber?: number                // Visit week number (1, 2, 3, etc., calculated from date)
  visitDate?: string                  // Week 12 visit date (NEW)
  status?: "draft" | "submitted"      // Form submission status
  
  // SECTION H - Follow-up Clinical & Lab Parameters
  hba1c: number
  fpg: number
  ppg?: number
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  heartRate?: number                  // bpm (for monitoring)
  serumCreatinine?: number
  egfr?: number
  urinalysis: string
  
  // SECTION I - Glycemic Response (AUTO-CALCULATED)
  glycemicResponse?: {
    category: "Super-responder" | "Responder" | "Partial responder" | "Non-responder"
    hba1cChange: number
    hba1cPercentageChange: number
  }
  
  // SECTION J - Weight, BP & Renal Outcomes
  outcomes?: {
    weightChange: "Loss ≥3 kg" | "Loss 1–2.9 kg" | "Neutral" | "Gain"
    bpControlAchieved: boolean
    renalOutcome: "Improved eGFR" | "Stable eGFR" | "Decline <10%" | "Decline ≥10%"
  }
  
  // SECTION K - Adherence & Treatment Durability (NEW)
  adherence?: {
    patientContinuingTreatment: boolean
    discontinuationReason?: "Adverse event" | "Lack of efficacy" | "Cost" | "Patient preference" | "Other"
    missedDosesInLast7Days?: 0 | "1–2" | "3–5" | ">5"
    addOnOrChangedTherapy: boolean
    addOnOrChangedTherapyDetails?: string
  }
  
  // SECTION L - Safety & Adverse Events (NEW - STRUCTURED)
  adverseEventsStructured?: Array<{
    aeTerm: string
    onsetDate: string
    severity: "Mild" | "Moderate" | "Severe"
    isSerious: boolean
    actionTaken: "None" | "Dose adjusted" | "Drug stopped" | "Referred"
    outcome: "Resolved" | "Ongoing"
  }>
  
  eventsOfSpecialInterest?: {
    hypoglycemiaMild: boolean
    hypoglycemiaModerate: boolean
    hypoglycemiaSevere: boolean
    uti: boolean
    genitalMycoticInfection: boolean
    dizzinessDehydrationSymptoms: boolean
    hospitalizationOrErVisit: boolean
    hospitalizationReason?: string
  }
  
  // SECTION M - Physician Global Assessment (UPDATED)
  physicianAssessment?: {
    overallEfficacy: "Excellent" | "Good" | "Moderate" | "Poor"
    overallTolerability: "Excellent" | "Good" | "Fair" | "Poor"
    complianceJudgment: "Excellent" | "Good" | "Fair" | "Poor"
    preferKcMeSempaForLongTerm: boolean
    
    preferredPatientProfiles?: {
      uncontrolledT2dm: boolean
      obeseT2dm: boolean
      ckdPatients: boolean
      htnPlusT2dm: boolean
      elderlyPatients: boolean
    }
  }
  
  // SECTION N - Patient-Reported Outcomes (UPDATED)
  patientReportedOutcomes?: {
    overallSatisfaction: "Very satisfied" | "Satisfied" | "Neutral" | "Not satisfied"
    giToleranceVsPriorTherapy?: "Improved" | "Same" | "Worse"
    confidenceInManagingDiabetes?: "Improved" | "Same" | "Worse"
    additionalComments?: string
  }
  
  // SECTION O - Data Privacy & Confidentiality
  dataPrivacy?: {
    noPersonalIdentifiersRecorded: boolean  // Checkbox confirmation
    dataCollectedAsRoutineClinicalPractice: boolean  // Checkbox confirmation
    patientIdentityMappingAtClinicOnly: boolean  // Checkbox confirmation
  }
  
  // SECTION P - Physician Declaration
  physicianDeclaration?: {
    physicianName: string  // Auto-filled from doctor profile
    qualification: string  // Auto-filled from doctor profile
    clinicHospitalName: string  // Auto-filled from doctor.studySiteCode
    confirmationCheckbox: boolean  // "I confirm above information is accurate..."
    signatureMethod: "Digital" | "Checkbox" | "Uploaded"  // Digital signature, checkbox, or image upload
    signatureData?: string  // Base64 encoded signature image (if uploaded)
    signatureDate: string  // YYYY-MM-DD format
  }
  
  // Legacy fields (for backward compatibility)
  adverseEvents?: string
  actionTaken?: string[]
  outcome?: string[]
  compliance?: string
  efficacy?: string
  tolerability?: string
  energyLevels?: string
  satisfaction?: string
  comments?: string
  
  createdAt: string
  updatedAt: string
}
