# Kollectcare vs KC MeSempa RWE CRF
## Gap Analysis & Missing Features

---

## 📋 EXECUTIVE SUMMARY

The Kollectcare project has **captured ~60% of the CRF requirements**. Below are the critical gaps that need to be addressed to fully comply with the KC MeSempa RWE study protocol.

---

## 🔴 CRITICAL GAPS (High Priority)

### 1. **PATIENT IDENTIFICATION & STUDY METADATA**

#### Missing Fields:
```typescript
// CURRENT (Basic)
Patient {
  patientCode: string
  // ...
}

// SHOULD BE
Patient {
  patientCode: string
  studySiteCode: string              // ❌ MISSING - Clinic/Site identifier
  investigatorName: string           // ❌ MISSING - Doctor managing this patient
  baselineVisitDate: string          // ❌ MISSING - Explicit date field
  // ... existing fields
}
```

**CRF Reference**: SECTION A

**Impact**: Cannot track which investigator enrolled which patients, multi-site studies impossible.

---

### 2. **LIFESTYLE FACTORS (Demographics)**

#### Missing Sections:
```typescript
// CURRENT
Patient {
  age: number
  gender: "Male" | "Female" | "Other"
  // MISSING EVERYTHING BELOW
}

// SHOULD INCLUDE
Patient {
  age: number
  gender: "Male" | "Female" | "Other"
  height: number                     // ❌ MISSING - in cm
  weight: number                     // ✓ Present but only in assessments
  bmi: number                        // ❌ MISSING - calculated value
  
  // ❌ COMPLETELY MISSING LIFESTYLE SECTION
  smokingStatus: "Never" | "Former" | "Current"
  alcoholIntake: "No" | "Occasional" | "Regular"
  physicalActivityLevel: "Sedentary" | "Moderate" | "Active"
}
```

**CRF Reference**: SECTION B

**Impact**: Cannot characterize patient population, incomplete RWE analysis.

---

### 3. **DIABETES COMPLICATIONS & PHENOTYPING**

#### Missing:
```typescript
// CURRENT - Only duration
Patient {
  durationOfDiabetes: number
  // MISSING EVERYTHING BELOW
}

// SHOULD INCLUDE
Patient {
  durationOfDiabetes: number
  
  // ❌ MISSING - Baseline glycemic severity categorization
  baselineGlycemicSeverity: 
    | "HbA1c <7.5%"
    | "HbA1c 7.5–8.5%"
    | "HbA1c 8.6–10%"
    | "HbA1c >10%"
  
  // ❌ COMPLETELY MISSING - Diabetes complications
  diabetesComplications: {
    neuropathy: boolean
    retinopathy: boolean
    nephropathy: boolean
    cadOrStroke: boolean
    none: boolean
  }
}
```

**CRF Reference**: SECTION C

**Impact**: Cannot analyze response rates by baseline severity, missing safety data.

---

### 4. **COMORBIDITIES (Incomplete)**

#### Current Implementation:
```typescript
Patient {
  comorbidities: string[]  // Just free-form array
}
```

#### Should Be:
```typescript
Patient {
  comorbidities: {
    hypertension: boolean        // ✓ Present
    dyslipidemia: boolean        // ✓ Present
    obesity: boolean             // ✓ Present
    ascvd: boolean               // ❌ MISSING - Atherosclerotic CVD
    heartFailure: boolean        // ❌ MISSING - Explicit HF
    chronicKidneyDisease: boolean // ❌ MISSING - CKD
    other: string[]              // ✓ Present
    
    // ❌ MISSING - If CKD present
    ckdEgfrCategory?: 
      | "≥90"
      | "60–89"
      | "45–59"
      | "30–44"
  }
}
```

**CRF Reference**: SECTION D

**Impact**: Cannot stratify risk, required for safety analysis.

---

### 5. **PRIOR ANTI-DIABETIC THERAPY (Insufficient Detail)**

#### Current:
```typescript
Patient {
  previousTherapy: string[]  // ["OADs", "Insulin", etc.]
}
```

#### Should Be:
```typescript
Patient {
  // Treatment type classification
  previousTreatmentType: 
    | "Drug-naïve"
    | "Oral drugs only"
    | "Insulin only"
    | "Oral drugs + Insulin"
  
  // ❌ MISSING - Specific drug classes used
  previousDrugClasses: {
    metformin: boolean
    sulfonylurea: boolean
    dpp4Inhibitor: boolean
    sglt2Inhibitor: boolean
    tzd: boolean
    insulin: boolean
    other: string[]
  }
  
  // ✓ Present but should be structured
  reasonForTripleFDC: {
    inadequateGlycemicControl: boolean
    weightConcerns: boolean
    hypoglycemiaOnPriorTherapy: boolean
    highPillBurden: boolean
    poorAdherence: boolean
    costConsiderations: boolean
    physicianClinicalJudgment: boolean
    other: string[]
  }
}
```

**CRF Reference**: SECTION E

**Impact**: Cannot analyze treatment sequences, missing key efficacy context.

---

### 6. **BASELINE ASSESSMENT - Missing Heart Rate**

#### Current:
```typescript
BaselineData {
  hba1c: number
  fpg: number
  ppg?: number
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  // ❌ MISSING
  heartRate?: number  // in bpm
  // ... rest present
}
```

**CRF Reference**: SECTION F

**Impact**: Cannot track vital sign changes, incomplete safety profile.

---

### 7. **BASELINE COUNSELLING - Missing Hydration Advice**

#### Current:
```typescript
BaselineData {
  dietAdvice: boolean
  counselingProvided: boolean  // Generic flag
  // ❌ MISSING STRUCTURED COUNSELLING
}

// Should be:
BaselineData {
  counselling: {
    dietAndLifestyle: boolean
    hypoglycemiaAwareness: boolean
    utiGenitialInfectionAwareness: boolean
    hydrationAdvice: boolean  // ❌ MISSING - Important for SGLT-2 inhibitors
  }
  
  // ❌ MISSING - Explicit initiation date
  treatmentInitiationDate: string  // ISO date
}
```

**CRF Reference**: SECTION G

**Impact**: Cannot track hydration counseling (critical for SGLT-2 inhibitor safety).

---

### 8. **GLYCEMIC RESPONSE CATEGORIZATION (MISSING)**

#### Not in Current Project:
```typescript
// ❌ COMPLETELY MISSING - Should be calculated in comparison
interface GlycemicResponse {
  category:
    | "Super-responder"      // ↓ ≥1.5%
    | "Responder"            // ↓ 1.0–1.49%
    | "Partial responder"    // ↓ 0.5–0.99%
    | "Non-responder"        // <0.5%
  hba1cChange: number
  percentageChange: number
}
```

**CRF Reference**: SECTION I

**Impact**: Cannot categorize treatment response, essential for efficacy analysis.

---

### 9. **WEIGHT, BP & RENAL OUTCOMES (MISSING)**

#### Not Structured in Follow-up:
```typescript
FollowUpData {
  // Current has values but not categorized
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  egfr?: number
  
  // ❌ MISSING - Outcome categorization
  outcomes: {
    weightChange:
      | "Loss ≥3 kg"
      | "Loss 1–2.9 kg"
      | "Neutral"
      | "Gain"
    
    bpControlAchieved: boolean
    
    renalOutcome:
      | "Improved eGFR"
      | "Stable eGFR"
      | "Decline <10%"
      | "Decline ≥10%"
  }
}
```

**CRF Reference**: SECTION J

**Impact**: Cannot analyze secondary outcomes, critical for comprehensive RWE.

---

### 10. **ADHERENCE & TREATMENT DURABILITY (COMPLETELY MISSING)**

#### Not in Current Project:
```typescript
FollowUpData {
  // ❌ COMPLETELY MISSING ENTIRE SECTION
  adherence: {
    patientContinuingTreatment: boolean
    
    discontinuationReason?: 
      | "Adverse event"
      | "Lack of efficacy"
      | "Cost"
      | "Patient preference"
      | "Other"
    
    missedDosesInLast7Days:
      | 0
      | "1–2"
      | "3–5"
      | ">5"
    
    addOnOrChangedTherapy: boolean
    addOnOrChangedTherapyDetails?: string
  }
}
```

**CRF Reference**: SECTION K

**Impact**: Cannot assess real-world treatment durability, cannot track medication switching.

---

### 11. **SAFETY & ADVERSE EVENTS (Underdeveloped)**

#### Current:
```typescript
FollowUpData {
  adverseEvents: string                    // ❌ Just free text
  actionTaken: string[]                    // ✓ Somewhat present
  outcome: string[]                        // ✓ Somewhat present
  // MISSING STRUCTURE
}
```

#### Should Be:
```typescript
FollowUpData {
  // ❌ MISSING - Structured AE table
  adverseEvents: Array<{
    aeTerm: string                    // MedDRA preferred term
    onsetDate: string
    severity: "Mild" | "Moderate" | "Severe"
    isSerious: boolean
    actionTaken: "None" | "Dose adjusted" | "Drug stopped" | "Referred"
    outcome: "Resolved" | "Ongoing"
  }>
  
  // ❌ MISSING - Events of Special Interest
  eventsOfSpecialInterest: {
    hypoglycemiaMild: boolean
    hypoglycemiaModerate: boolean
    hypoglycemiaSevere: boolean
    uti: boolean
    genitalMycoticInfection: boolean
    dizzinessDehydrationSymptoms: boolean
    hospitalizationOrErVisit: boolean
    hospitalizationReason?: string
  }
}
```

**CRF Reference**: SECTION L

**Impact**: Cannot submit to regulatory bodies, incomplete safety surveillance.

---

### 12. **PHYSICIAN ASSESSMENT (Incomplete Options)**

#### Current:
```typescript
FollowUpData {
  efficacy: string                // ✓ Present
  tolerability: string            // ✓ Present
  compliance: string              // ✓ Present
  // ❌ MISSING ADDITIONAL FIELDS
}
```

#### Should Include:
```typescript
FollowUpData {
  physicianAssessment: {
    overallEfficacy: "Excellent" | "Good" | "Moderate" | "Poor"
    overallTolerability: "Excellent" | "Good" | "Fair" | "Poor"
    complianceJudgment: "Excellent" | "Good" | "Fair" | "Poor"
    
    // ❌ MISSING - Long-term preference
    preferKcMeSempaForLongTerm: boolean
    
    // ❌ MISSING - Patient profile preferences
    preferredPatientProfiles: {
      uncontrolledT2dm: boolean
      obeseT2dm: boolean
      ckdPatients: boolean
      htnPlusT2dm: boolean
      elderlyPatients: boolean
    }
  }
}
```

**CRF Reference**: SECTION M

**Impact**: Cannot assess physician preference, bias potential.

---

### 13. **PATIENT-REPORTED OUTCOMES (Incomplete)**

#### Current:
```typescript
FollowUpData {
  satisfaction: string            // ✓ Present
  energyLevels: string            // ✓ Present
  // MISSING:
}
```

#### Should Include:
```typescript
FollowUpData {
  patientReportedOutcomes: {
    overallSatisfaction: 
      | "Very satisfied"
      | "Satisfied"
      | "Neutral"
      | "Not satisfied"
    
    // ❌ MISSING - GI tolerance comparison
    giToleranceVsPriorTherapy:
      | "Improved"
      | "Same"
      | "Worse"
    
    // ❌ MISSING - Confidence in managing diabetes
    confidenceInManagingDiabetes:
      | "Improved"
      | "Same"
      | "Worse"
    
    additionalComments?: string
  }
}
```

**CRF Reference**: SECTION N

**Impact**: Cannot assess patient-centered outcomes, missing HRQoL data.

---

## 🟡 MEDIUM PRIORITY GAPS

### 14. **Study Metadata & Audit Trail**

#### Missing:
- Study site/clinic code tracking
- Visit date tracking (separate from createdAt)
- Investigator assignment per patient
- Physician declaration / signature digital equivalent
- Data entry timestamp vs visit timestamp distinction

---

### 15. **Data Validation & Logic**

#### Current Issues:
- No BMI calculation/storage
- No automatic glycemic severity categorization from HbA1c values
- No response category auto-calculation
- No renal outcome categorization logic
- No weight change categorization

---

### 16. **Compliance & Regulatory**

#### Missing:
- Data privacy attestation fields
- Physician declaration section
- Audit trail (who edited what, when)
- Data completeness checks
- CRF version tracking

---

## 🟢 WHAT'S ALREADY GOOD

| Feature | Status | Notes |
|---------|--------|-------|
| Basic Patient Demographics | ✓ 60% | Has age, gender; missing height, BMI, lifestyle |
| Baseline Assessments | ✓ 85% | Has labs; missing heart rate, structured counseling |
| Follow-up Assessments | ✓ 75% | Has labs & some outcomes; missing structured AE table |
| Physician Assessments | ✓ 70% | Has efficacy/tolerability/compliance; missing long-term preference |
| Patient Satisfaction | ✓ 60% | Has satisfaction; missing GI tolerance, confidence |
| Export Capabilities | ✓ 90% | PDF/CSV/Excel; needs additional fields |
| Real-time Sync | ✓ 100% | Firestore listeners working well |
| Authentication | ✓ 100% | Firebase auth secure |
| Data Anonymization | ✓ 100% | No PII stored |

---

## 📊 IMPLEMENTATION ROADMAP

### Phase 1: Patient Demographics Enhancement (HIGH PRIORITY)
```
1. Add height, BMI fields to Patient model
2. Add lifestyle factors (smoking, alcohol, activity)
3. Add study site code & investigator assignment
4. Add explicit baseline visit date
5. Update baseline form UI
```

**Estimated Effort**: 4-6 hours

---

### Phase 2: Diabetes Phenotyping (HIGH PRIORITY)
```
1. Add diabetes complications checkboxes
2. Add baseline glycemic severity categorization
3. Add comorbidity structure (ASCVD, HF, CKD explicit)
4. Add CKD eGFR category
5. Update add patient form
```

**Estimated Effort**: 4-5 hours

---

### Phase 3: Prior Therapy Detail (MEDIUM PRIORITY)
```
1. Refactor previousTherapy to treatment type + drug classes
2. Structure reason for triple FDC as checkboxes
3. Add validation (e.g., "Drug-naive" excludes prior drugs)
4. Update forms
```

**Estimated Effort**: 3-4 hours

---

### Phase 4: Baseline Form Enhancements (MEDIUM PRIORITY)
```
1. Add heart rate field
2. Structure counseling checkboxes (remove generic flag)
3. Add treatment initiation date
4. Add hydration advice checkbox
5. Update Firestore schema
```

**Estimated Effort**: 2-3 hours

---

### Phase 5: Adherence & Durability (HIGH PRIORITY)
```
1. Add adherence section to follow-up form
2. Add discontinuation tracking
3. Add missed doses tracking
4. Add therapy change tracking
5. Implement conditional logic (show reason if discontinued)
```

**Estimated Effort**: 5-6 hours

---

### Phase 6: Safety & Adverse Events (CRITICAL)
```
1. Replace free-text AE field with structured table
2. Add AE table with date, severity, seriousness, action, outcome
3. Add Events of Special Interest checkboxes
4. Add hospitalization tracking
5. Update follow-up form with AE data entry UI
```

**Estimated Effort**: 8-10 hours (most complex)

---

### Phase 7: Outcomes Categorization (MEDIUM PRIORITY)
```
1. Implement glycemic response auto-calculation
2. Add weight change categorization
3. Add BP control assessment
4. Add renal outcome categorization
5. Display in comparison view
```

**Estimated Effort**: 4-5 hours

---

### Phase 8: Physician & Patient Assessment (MEDIUM PRIORITY)
```
1. Update physician assessment options (add "Moderate")
2. Add long-term preference field
3. Add preferred patient profiles checkboxes
4. Add GI tolerance vs prior therapy
5. Add confidence in managing diabetes
6. Refactor assessment section in follow-up form
```

**Estimated Effort**: 3-4 hours

---

### Phase 9: Compliance & Regulatory (LOW PRIORITY)
```
1. Add data privacy attestation fields
2. Add physician declaration section
3. Add audit trail logging
4. Implement data completeness checks
5. Add CRF version tracking
```

**Estimated Effort**: 6-8 hours

---

## 🔗 DATABASE SCHEMA CHANGES REQUIRED

### Patient Collection - New Fields
```typescript
interface Patient {
  // EXISTING
  id: string
  doctorId: string
  patientCode: string
  age: number
  gender: "Male" | "Female" | "Other"
  durationOfDiabetes: number
  previousTherapy: string[]
  comorbidities: string[]
  reasonForTripleFDC: string
  createdAt: string
  
  // NEW FIELDS - PHASE 1
  studySiteCode: string
  investigatorName: string
  baselineVisitDate: string
  height: number                    // cm
  bmi: number                       // calculated
  smokingStatus: "Never" | "Former" | "Current"
  alcoholIntake: "No" | "Occasional" | "Regular"
  physicalActivityLevel: "Sedentary" | "Moderate" | "Active"
  
  // NEW FIELDS - PHASE 2
  baselineGlycemicSeverity: "HbA1c <7.5%" | "HbA1c 7.5–8.5%" | "HbA1c 8.6–10%" | "HbA1c >10%"
  diabetesComplications: {
    neuropathy: boolean
    retinopathy: boolean
    nephropathy: boolean
    cadOrStroke: boolean
    none: boolean
  }
  
  // NEW FIELDS - PHASE 2
  comorbidities: {
    hypertension: boolean
    dyslipidemia: boolean
    obesity: boolean
    ascvd: boolean
    heartFailure: boolean
    chronicKidneyDisease: boolean
    ckdEgfrCategory?: "≥90" | "60–89" | "45–59" | "30–44"
    other: string[]
  }
  
  // NEW FIELDS - PHASE 3
  previousTreatmentType: "Drug-naïve" | "Oral drugs only" | "Insulin only" | "Oral drugs + Insulin"
  previousDrugClasses: {
    metformin: boolean
    sulfonylurea: boolean
    dpp4Inhibitor: boolean
    sglt2Inhibitor: boolean
    tzd: boolean
    insulin: boolean
    other: string[]
  }
  
  reasonForTripleFDC: {
    inadequateGlycemicControl: boolean
    weightConcerns: boolean
    hypoglycemiaOnPriorTherapy: boolean
    highPillBurden: boolean
    poorAdherence: boolean
    costConsiderations: boolean
    physicianClinicalJudgment: boolean
    other: string[]
  }
}
```

### BaselineData Collection - New Fields
```typescript
interface BaselineData {
  // EXISTING
  patientId: string
  hba1c: number
  fpg: number
  ppg?: number
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  serumCreatinine?: number
  egfr?: number
  urinalysis: string
  dosePrescribed: string
  dietAdvice: boolean
  counselingProvided: boolean
  createdAt: string
  updatedAt: string
  
  // NEW FIELDS - PHASE 4
  heartRate?: number                // bpm
  treatmentInitiationDate: string
  counseling: {
    dietAndLifestyle: boolean
    hypoglycemiaAwareness: boolean
    utiGenitialInfectionAwareness: boolean
    hydrationAdvice: boolean
  }
}
```

### FollowUpData Collection - Major Expansion
```typescript
interface FollowUpData {
  // EXISTING
  patientId: string
  hba1c: number
  fpg: number
  ppg?: number
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  serumCreatinine?: number
  egfr?: number
  urinalysis: string
  adverseEvents: string
  actionTaken: string[]
  outcome: string[]
  compliance: string
  efficacy: string
  tolerability: string
  energyLevels: string
  satisfaction: string
  comments: string
  createdAt: string
  updatedAt: string
  
  // NEW FIELDS - PHASE 5: ADHERENCE
  adherence: {
    patientContinuingTreatment: boolean
    discontinuationReason?: "Adverse event" | "Lack of efficacy" | "Cost" | "Patient preference" | "Other"
    missedDosesInLast7Days: 0 | "1–2" | "3–5" | ">5"
    addOnOrChangedTherapy: boolean
    addOnOrChangedTherapyDetails?: string
  }
  
  // NEW FIELDS - PHASE 6: SAFETY (STRUCTURED)
  adverseEventsStructured: Array<{
    aeTerm: string
    onsetDate: string
    severity: "Mild" | "Moderate" | "Severe"
    isSerious: boolean
    actionTaken: "None" | "Dose adjusted" | "Drug stopped" | "Referred"
    outcome: "Resolved" | "Ongoing"
  }>
  
  eventsOfSpecialInterest: {
    hypoglycemiaMild: boolean
    hypoglycemiaModerate: boolean
    hypoglycemiaSevere: boolean
    uti: boolean
    genitalMycoticInfection: boolean
    dizzinessDehydrationSymptoms: boolean
    hospitalizationOrErVisit: boolean
    hospitalizationReason?: string
  }
  
  // NEW FIELDS - PHASE 7: OUTCOMES
  outcomes: {
    glycemicResponseCategory: "Super-responder" | "Responder" | "Partial responder" | "Non-responder"
    hba1cChange: number
    hba1cPercentageChange: number
    
    weightChange: "Loss ≥3 kg" | "Loss 1–2.9 kg" | "Neutral" | "Gain"
    
    bpControlAchieved: boolean
    
    renalOutcome: "Improved eGFR" | "Stable eGFR" | "Decline <10%" | "Decline ≥10%"
  }
  
  // NEW FIELDS - PHASE 8: ASSESSMENTS
  physicianAssessment: {
    overallEfficacy: "Excellent" | "Good" | "Moderate" | "Poor"
    overallTolerability: "Excellent" | "Good" | "Fair" | "Poor"
    complianceJudgment: "Excellent" | "Good" | "Fair" | "Poor"
    preferKcMeSempaForLongTerm: boolean
    
    preferredPatientProfiles: {
      uncontrolledT2dm: boolean
      obeseT2dm: boolean
      ckdPatients: boolean
      htnPlusT2dm: boolean
      elderlyPatients: boolean
    }
  }
  
  patientReportedOutcomes: {
    overallSatisfaction: "Very satisfied" | "Satisfied" | "Neutral" | "Not satisfied"
    giToleranceVsPriorTherapy: "Improved" | "Same" | "Worse"
    confidenceInManagingDiabetes: "Improved" | "Same" | "Worse"
    additionalComments?: string
  }
}
```

---

## 📋 QUICK REFERENCE: WHAT'S MISSING BY CRF SECTION

| CRF Section | Current % | Missing Items |
|-------------|-----------|----------------|
| A. Patient ID | 50% | Study site code, Investigator name, Visit date |
| B. Demographics | 40% | Height, BMI, Smoking, Alcohol, Activity level |
| C. Diabetes History | 40% | Baseline severity categorization, Complications |
| D. Comorbidities | 60% | ASCVD, HF, CKD explicit; eGFR category |
| E. Prior Therapy | 50% | Drug class detail, Treatment type classification |
| F. Baseline Labs | 95% | Heart rate only |
| G. Baseline Counseling | 60% | Structured checkboxes, Hydration advice, Init date |
| H. Follow-up Labs | 100% | ✓ Complete |
| I. Glycemic Response | 0% | ❌ Completely missing |
| J. Weight/BP/Renal | 0% | ❌ Completely missing |
| K. Adherence | 0% | ❌ Completely missing |
| L. Safety & AE | 30% | Structured table, Special interest events |
| M. Physician Assessment | 70% | Long-term preference, Patient profiles |
| N. Patient Outcomes | 60% | GI tolerance, Confidence |
| O. Data Privacy | 80% | Attestation fields |
| P. Physician Declaration | 0% | ❌ Missing |

---

## 🎯 PRIORITY IMPLEMENTATION MATRIX

### MUST HAVE (Do First)
- [ ] Adherence & Durability tracking (Phase 5)
- [ ] Safety & Adverse Events structure (Phase 6)
- [ ] Outcomes categorization (Phase 7)
- [ ] Diabetes phenotyping (Phase 2)
- [ ] Prior therapy detail (Phase 3)

### SHOULD HAVE (Do Next)
- [ ] Lifestyle factors (Phase 1)
- [ ] Baseline form enhancements (Phase 4)
- [ ] Physician & patient assessment (Phase 8)

### NICE TO HAVE (Do Later)
- [ ] Compliance & regulatory (Phase 9)
- [ ] Advanced data validation

### TOTAL ESTIMATED EFFORT: 40-50 hours of development

---

## 💡 RECOMMENDATIONS

1. **Start with Phases 5-7** (adherence, safety, outcomes) - These are critical for regulatory submission
2. **Update Firestore schema** before adding UI - Backend first approach
3. **Implement data validation** for new fields (e.g., contraints on certain combinations)
4. **Create migration script** if deploying to existing database
5. **Add comprehensive testing** for new form logic
6. **Consider form versioning** to track CRF changes over time
7. **Add data completeness indicator** before export
8. **Implement auto-calculation** for BMI, response categories, outcome categories

---

**Analysis Date**: January 23, 2026  
**Status**: Partially Compliant (60% of CRF requirements met)
