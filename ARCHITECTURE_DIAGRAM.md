# CRF Implementation Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: ENROLLMENT                           │
│                                                                   │
│  Doctor Registration (signup/page.tsx)                          │
│  ├── Name, Registration #, DOB, Contact                         │
│  ├── Qualification ⭐ NEW                                         │
│  └── Study Site Code (clinic/hospital) ⭐ NEW                   │
│      ↓                                                            │
│  Firebase Auth + Doctor Document in Firestore                   │
│      ↓                                                            │
│  Patient Enrollment (patients/add/page.tsx)                     │
│  ├── SECTION A: Patient ID                                      │
│  │   ├── Patient Code (anonymized)                              │
│  │   ├── Study Site Code ⭐ AUTO-FILLED from doctor             │
│  │   ├── Investigator Name ⭐ AUTO-FILLED from doctor           │
│  │   └── Baseline Visit Date                                    │
│  ├── SECTION B: Demographics & Lifestyle                        │
│  │   ├── Age, Gender                                            │
│  │   ├── Height ⭐ AUTO-CALCULATES BMI                          │
│  │   ├── BMI (auto-calculated)                                  │
│  │   ├── Smoking, Alcohol, Activity Level                       │
│  ├── SECTION C: Diabetes History                                │
│  │   ├── Duration                                               │
│  │   ├── Baseline Glycemic Severity                             │
│  │   └── Complications Checkboxes                               │
│  ├── SECTION D: Comorbidities                                   │
│  │   ├── HTN, Dyslipidemia, Obesity                             │
│  │   ├── ASCVD, Heart Failure                                   │
│  │   └── CKD + eGFR Category                                    │
│  └── SECTION E: Prior Therapy                                   │
│      ├── Treatment Type                                         │
│      ├── Drug Classes                                           │
│      └── Reason for Triple FDC                                  │
│          ↓                                                        │
│  Save to Firestore: patients collection                         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 2: BASELINE ASSESSMENT                    │
│                          (Week 0)                                │
│                                                                   │
│  Baseline Form (baseline-form.tsx)                              │
│  ├── SECTION F: Clinical Parameters                             │
│  │   ├── HbA1c, FPG, PPG (glucose markers)                      │
│  │   ├── Weight, BP (Systolic/Diastolic)                        │
│  │   ├── Heart Rate ⭐ NEW                                       │
│  │   ├── Serum Creatinine, eGFR                                 │
│  │   └── Urinalysis                                             │
│  ├── SECTION G: Treatment & Counseling                          │
│  │   ├── Dose Prescribed                                        │
│  │   ├── Treatment Initiation Date ⭐ NEW                       │
│  │   └── Counseling (Structured) ⭐ ENHANCED                    │
│  │       ├── Diet & Lifestyle                                   │
│  │       ├── Hypoglycemia Awareness                             │
│  │       ├── UTI/Genital Infection Awareness                    │
│  │       └── Hydration Advice (SGLT-2 safety) ⭐ NEW            │
│  │           ↓                                                    │
│  Save to Firestore: baselineData collection                     │
│  ├── Document contains all measurements above                   │
│  └── Used for: Baseline calculations, comparisons               │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 3: FOLLOW-UP ASSESSMENT                   │
│                        (Week 12 ± 2)                            │
│                                                                   │
│  Follow-up Form (followup-form-new.tsx)                         │
│  ├── SECTION H: Repeat Clinical Measurements                    │
│  │   ├── HbA1c, FPG, PPG                                        │
│  │   ├── Weight, BP, Heart Rate                                 │
│  │   ├── Serum Creatinine, eGFR                                 │
│  │   └── Urinalysis                                             │
│  │       ↓                                                        │
│  ├── SECTION I: Glycemic Response ⭐ AUTO-CALCULATED            │
│  │   ├── Compare: Follow-up HbA1c - Baseline HbA1c              │
│  │   ├── Category: Super-responder / Responder / Partial / Non  │
│  │   └── Calculation: If ≥1.5% reduction → Super-responder      │
│  │                    If 1.0-1.49% reduction → Responder        │
│  │                    If 0.5-0.99% reduction → Partial responder│
│  │                    If <0.5% reduction → Non-responder        │
│  │       ↓                                                        │
│  ├── SECTION J: Outcomes ⭐ AUTO-CALCULATED                     │
│  │   ├── Weight Change: Gain / Neutral / Loss 1-2.9 / Loss ≥3   │
│  │   ├── BP Control: <140/90? Yes/No                            │
│  │   ├── Renal Outcome: Improved / Stable / Decline <10% / ≥10% │
│  │   └── Calculation from: (Follow-up - Baseline) / Baseline    │
│  │       ↓                                                        │
│  ├── SECTION K: Adherence & Durability                          │
│  │   ├── Continuing Treatment? Yes/No                           │
│  │   ├── Discontinuation Reason (conditional)                   │
│  │   ├── Missed Doses (Last 7 days)                             │
│  │   └── Add-on or Changed Therapy?                             │
│  │       ↓                                                        │
│  ├── SECTION L: Safety - Events of Special Interest             │
│  │   ├── Hypoglycemia: Mild / Moderate / Severe (checkboxes)    │
│  │   ├── UTI (checkbox)                                         │
│  │   ├── Genital Mycotic Infection (checkbox)                   │
│  │   ├── Dizziness / Dehydration (checkbox)                     │
│  │   └── Hospitalization / ER (checkbox + reason field)         │
│  │       ↓                                                        │
│  ├── SECTION M: Physician Global Assessment                     │
│  │   ├── Overall Efficacy: Excellent/Good/Moderate/Poor         │
│  │   ├── Overall Tolerability: Excellent/Good/Fair/Poor         │
│  │   ├── Compliance: Excellent/Good/Fair/Poor                   │
│  │   ├── Prefer KC MeSempa Long-term? Yes/No                    │
│  │   └── Preferred Patient Profiles: 5 checkboxes               │
│  │       - Uncontrolled T2DM                                    │
│  │       - Obese T2DM                                           │
│  │       - CKD Patients                                         │
│  │       - HTN + T2DM                                           │
│  │       - Elderly Patients                                     │
│  │       ↓                                                        │
│  └── SECTION N: Patient-Reported Outcomes                       │
│      ├── Overall Satisfaction                                   │
│      ├── GI Tolerance vs Prior Therapy                          │
│      ├── Confidence in Managing Diabetes                        │
│      └── Additional Comments                                    │
│          ↓                                                        │
│  Save to Firestore: followUpData collection                     │
│  ├── All measurements                                           │
│  ├── Auto-calculated outcomes                                   │
│  ├── Safety events (structured)                                 │
│  ├── Adherence data                                             │
│  ├── Physician & patient assessments                            │
│  └── Document ready for analysis and export                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 4: OUTCOMES & COMPARISON                      │
│                                                                   │
│  Comparison View (comparison-view.tsx)                          │
│  ├── SECTION I DISPLAY: Glycemic Response                       │
│  │   ├── Response Category (colored card)                       │
│  │   ├── HbA1c Change (%)                                       │
│  │   └── Icon: Green checkmark = good response                  │
│  │                                                               │
│  ├── SECTION J DISPLAY: Outcomes                                │
│  │   ├── Weight Category (colored card)                         │
│  │   ├── BP Control Status (colored card)                       │
│  │   ├── Renal Function Decline (colored card)                  │
│  │   └── Icons: Green/Orange/Red based on outcome               │
│  │                                                               │
│  ├── SECTION K DISPLAY: Adherence                               │
│  │   ├── Treatment Status (Continuing/Discontinued)             │
│  │   ├── Discontinuation Reason (if applicable)                 │
│  │   ├── Missed Doses Count                                     │
│  │   └── Therapy Changes (flagged in orange)                    │
│  │                                                               │
│  ├── SECTION L DISPLAY: Safety Events Grid                      │
│  │   ├── Each event as colored box                              │
│  │   ├── Hypoglycemia severity color-coded                      │
│  │   ├── SGLT-2 specific events highlighted                     │
│  │   └── Hospitalization with reason displayed                  │
│  │                                                               │
│  ├── SECTION M DISPLAY: Physician Assessment                    │
│  │   ├── Efficacy, Tolerability, Compliance (green cards)       │
│  │   ├── Preference for KC MeSempa                              │
│  │   └── Patient Profiles (blue tags)                           │
│  │                                                               │
│  └── SECTION N DISPLAY: Patient Outcomes                        │
│      ├── Satisfaction (purple card)                             │
│      ├── GI Tolerance (purple card)                             │
│      └── Confidence in Management (purple card)                 │
│          ↓                                                        │
│  Data Sources:                                                   │
│  ├── baselineData for baseline values                           │
│  ├── followUpData for follow-up values & auto-calculated        │
│  └── Outcomes Calculator for clean display                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
                              App Root
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            Signup Page            Patients Detail Page
          (Doctor Registration)      (Patient Info)
                    │                         │
                    ▼                         ▼
        ┌─────────────────────┐   ┌──────────────────────┐
        │ Auth Context        │   │ Patient Data         │
        │ - Doctor Profile    │   │ - Enrollment Data    │
        │ - Study Site Code   │   │ - Baseline Data      │
        │ - Qualification     │   │ - Follow-up Data     │
        └─────────────────────┘   └──────────────────────┘
                    │                         │
                    │            ┌────────────┼────────────┐
                    │            │            │            │
                    │            ▼            ▼            ▼
                    │       ┌──────────┐ ┌─────────┐ ┌──────────────┐
                    │       │ Baseline │ │ Follow- │ │ Comparison   │
                    │       │  Form    │ │  Up     │ │ View         │
                    │       └──────────┘ │  Form   │ └──────────────┘
                    │                    └─────────┘
                    │
                    │ Auto-fills →
                    │
            ┌───────▼────────┐
            │ Add Patient    │
            │ Form (NEW)     │
            │ - SECTION A    │
            │ - SECTION B    │
            │ - SECTION C    │
            │ - SECTION D    │
            │ - SECTION E    │
            └────────────────┘
```

---

## Data Calculation Flow

```
┌────────────────────────────────┐
│   Baseline Data (Week 0)       │
│ - HbA1c: 8.2%                 │
│ - Weight: 82.5 kg             │
│ - eGFR: 72 mL/min/1.73m²      │
│ - BP: 138/88 mmHg             │
└────────────────┬───────────────┘
                 │
                 │ Store in Firestore
                 │
┌────────────────▼───────────────┐
│   Follow-Up Data (Week 12)     │
│ - HbA1c: 6.8%                 │
│ - Weight: 78.2 kg             │
│ - eGFR: 68 mL/min/1.73m²      │
│ - BP: 128/82 mmHg             │
└────────────────┬───────────────┘
                 │
                 ▼
     ┌───────────────────────────┐
     │ Outcomes Calculator        │
     │                            │
     │ calculateGlycemicResponse()│
     │ ├─ HbA1c Change: -1.4%     │
     │ └─ Category: RESPONDER     │
     │                            │
     │ calculateWeightOutcome()   │
     │ ├─ Change: -4.3 kg         │
     │ └─ Category: LOSS ≥3 KG    │
     │                            │
     │ calculateRenalOutcome()    │
     │ ├─ Change: -4 mL/min       │
     │ └─ Category: DECLINE <10%  │
     │                            │
     │ calculateBP()              │
     │ ├─ Control: YES            │
     │ └─ Status: CONTROLLED      │
     │                            │
     │ generateOutcomesSummary()  │
     │ └─ Human-readable text     │
     └───────────────┬────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐           ┌──────────────┐
    │ SAVE to │           │ Display in   │
    │Firestore│           │ Comparison   │
    │         │           │ View (UI)    │
    │ (Data)  │           │              │
    └─────────┘           └──────────────┘
```

---

## TypeScript Type Hierarchy

```
interface Doctor {
  ├── id: string
  ├── uid: string
  ├── name: string
  ├── registrationNumber: string
  ├── qualification: string ⭐ NEW
  ├── studySiteCode: string ⭐ RENAMED (was clinicHospitalName)
  ├── phone: string
  ├── email: string
  └── ... other fields
}

interface Patient {
  ├── SECTION A
  │   ├── patientCode: string
  │   ├── baselineVisitDate: string
  │   ├── studySiteCode: string
  │   └── investigatorName: string
  ├── SECTION B
  │   ├── age: number
  │   ├── gender: string
  │   ├── height: number ⭐ NEW
  │   ├── bmi: number ⭐ NEW
  │   ├── smokingStatus: string ⭐ NEW
  │   ├── alcoholIntake: string ⭐ NEW
  │   └── physicalActivityLevel: string ⭐ NEW
  ├── SECTION C
  │   ├── durationOfDiabetes: number
  │   ├── baselineGlycemicSeverity: string
  │   └── diabetesComplications: string[] ⭐ NEW
  ├── SECTION D
  │   ├── hypertension: boolean ⭐ NEW
  │   ├── dyslipidemia: boolean ⭐ NEW
  │   ├── obesity: boolean ⭐ NEW
  │   ├── ascvd: boolean ⭐ NEW
  │   ├── heartFailure: boolean ⭐ NEW
  │   ├── chronicKidneyDisease: boolean ⭐ NEW
  │   ├── ckdEgfrCategory: string ⭐ NEW
  │   └── otherComorbidities: string ⭐ NEW
  ├── SECTION E
  │   ├── previousTreatmentType: string ⭐ NEW
  │   ├── previousDrugClasses: string[] ⭐ NEW
  │   ├── reasonForTripleFDC: object ⭐ NEW
  │   └── otherReasonForTripleFDC: string ⭐ NEW
  └── ... legacy fields preserved
}

interface BaselineData {
  ├── patientId: string
  ├── SECTION F
  │   ├── hba1c: number
  │   ├── fpg: number
  │   ├── ppg: number
  │   ├── weight: number
  │   ├── bloodPressureSystolic: number
  │   ├── bloodPressureDiastolic: number
  │   ├── heartRate: number ⭐ NEW
  │   ├── serumCreatinine: number
  │   ├── egfr: number
  │   └── urinalysis: string
  ├── SECTION G
  │   ├── dosePrescribed: string
  │   ├── treatmentInitiationDate: string ⭐ NEW
  │   └── counseling: CounselingObject ⭐ STRUCTURED
  │       ├── dietAndLifestyle: boolean
  │       ├── hypoglycemiaAwareness: boolean
  │       ├── utiGenitialInfectionAwareness: boolean
  │       └── hydrationAdvice: boolean ⭐ NEW
  └── ... legacy fields
}

interface FollowUpData {
  ├── patientId: string
  ├── visitDate: string
  ├── SECTION H
  │   ├── hba1c: number
  │   ├── fpg: number
  │   ├── ppg: number
  │   ├── weight: number
  │   ├── bloodPressureSystolic: number
  │   ├── bloodPressureDiastolic: number
  │   ├── serumCreatinine: number
  │   ├── egfr: number
  │   └── urinalysis: string
  ├── SECTION I - AUTO-CALCULATED ⭐
  │   └── glycemicResponse: {
  │       ├── category: string
  │       ├── hba1cChange: number
  │       └── hba1cPercentageChange: number
  │   }
  ├── SECTION J - AUTO-CALCULATED ⭐
  │   └── outcomes: {
  │       ├── weightChange: string
  │       ├── bpControlAchieved: boolean
  │       └── renalOutcome: string
  │   }
  ├── SECTION K
  │   └── adherence: {
  │       ├── patientContinuingTreatment: boolean
  │       ├── discontinuationReason: string
  │       ├── missedDosesInLast7Days: string
  │       ├── addOnOrChangedTherapy: boolean
  │       └── addOnOrChangedTherapyDetails: string
  │   }
  ├── SECTION L
  │   └── eventsOfSpecialInterest: {
  │       ├── hypoglycemiaMild: boolean
  │       ├── hypoglycemiaModerate: boolean
  │       ├── hypoglycemiaSevere: boolean
  │       ├── uti: boolean
  │       ├── genitalMycoticInfection: boolean
  │       ├── dizzinessDehydrationSymptoms: boolean
  │       ├── hospitalizationOrErVisit: boolean
  │       └── hospitalizationReason: string
  │   }
  ├── SECTION M
  │   └── physicianAssessment: {
  │       ├── overallEfficacy: string
  │       ├── overallTolerability: string
  │       ├── complianceJudgment: string
  │       ├── preferKcMeSempaForLongTerm: boolean
  │       └── preferredPatientProfiles: {
  │           ├── uncontrolledT2dm: boolean
  │           ├── obeseT2dm: boolean
  │           ├── ckdPatients: boolean
  │           ├── htnPlusT2dm: boolean
  │           └── elderlyPatients: boolean
  │       }
  │   }
  ├── SECTION N
  │   └── patientReportedOutcomes: {
  │       ├── overallSatisfaction: string
  │       ├── giToleranceVsPriorTherapy: string
  │       ├── confidenceInManagingDiabetes: string
  │       └── additionalComments: string
  │   }
  └── ... legacy fields
}

interface OutcomesCalculation {
  ├── glycemicResponse
  │   ├── category: "Super-responder" | "Responder" | "Partial responder" | "Non-responder"
  │   ├── hba1cChange: number
  │   └── hba1cPercentageChange: number
  ├── weightOutcome
  │   ├── category: "Gain" | "Neutral" | "Loss 1-2.9 kg" | "Loss ≥3 kg"
  │   ├── weightChange: number
  │   └── percentageChange: number
  ├── renalOutcome
  │   ├── category: "Improved eGFR" | "Stable eGFR" | "Decline <10%" | "Decline ≥10%"
  │   ├── eGfrChange: number
  │   └── percentageChange: number
  └── bloodPressureOutcome
      ├── systolicControlled: boolean
      ├── diastolicControlled: boolean
      ├── overallControlled: boolean
      ├── systolicCategory: string
      └── diastolicCategory: string
}
```

---

## Form Submission Flow

```
User Fills FollowUpForm
        │
        ▼
Validates Required Fields
├─ HbA1c, FPG, Weight, BP, Urinalysis (SECTION H)
├─ Efficacy, Tolerability, Compliance (SECTION M)
└─ Overall Satisfaction (SECTION N)
        │
        ▼ (All required fields present)
        │
Extracts Form Data
├─ Clinical measurements → numbers
├─ Adherence details → object
├─ Safety events → boolean object
├─ Assessments → strings
└─ Comments → string
        │
        ▼
Calculates Outcomes ⭐
├─ calculateGlycemicResponse(baseline.hba1c, followUp.hba1c)
│   └─ Returns: category, hba1cChange, hba1cPercentageChange
├─ calculateWeightOutcome(baseline.weight, followUp.weight)
│   └─ Returns: category, weightChange, percentageChange
├─ calculateRenalOutcome(baseline.egfr, followUp.egfr)
│   └─ Returns: category, eGfrChange, percentageChange
└─ calculateBloodPressureOutcome(...)
    └─ Returns: systolicControlled, diastolicControlled, overallControlled
        │
        ▼
Assembles Firestore Document
├─ All measurements from SECTION H
├─ Auto-calculated outcomes (SECTIONS I-J)
├─ Adherence object (SECTION K)
├─ Safety events object (SECTION L)
├─ Physician assessment (SECTION M)
├─ Patient outcomes (SECTION N)
├─ Legacy fields (for backward compatibility)
├─ createdAt timestamp
└─ updatedAt timestamp
        │
        ▼
Saves to Firestore
├─ If existing: updateDoc() with document ID
└─ If new: addDoc() to followUpData collection
        │
        ▼
Shows Success Toast
│
Calls onSuccess() Callback
│
Redirects to Patient Detail Page
│
Triggers Firestore listener in comparison-view.tsx
│
Auto-refreshes ComparisonView with new outcomes
        │
        ▼
User Sees:
├─ Glycemic Response Category (SECTION I display)
├─ Weight/Renal/BP Outcomes (SECTION J display)
├─ Adherence Summary (SECTION K display)
├─ Safety Events Grid (SECTION L display)
├─ Physician Assessment (SECTION M display)
└─ Patient Outcomes (SECTION N display)
```

---

## File Integration Map

```
lib/types.ts
├─ Used by: ALL form components
├─ Updated with: 40+ new CRF fields
└─ Provides: Type safety for entire app

lib/outcomes-calculator.ts ⭐ NEW
├─ Used by: followup-form-new.tsx, comparison-view.tsx, future exports
├─ Provides: Pure calculation functions
└─ Exports: 6 functions + OutcomesCalculation interface

components/followup-form-new.tsx ⭐ NEW
├─ Imported by: app/patients/[id]/page.tsx
├─ Imports: types, ui components, firebase
├─ Uses: outcomes-calculator functions
└─ Saves: followUpData with calculated outcomes

components/comparison-view.tsx ⭐ ENHANCED
├─ Imported by: app/patients/[id]/page.tsx
├─ Imports: outcomes-calculator, ui components
├─ Displays: CRF SECTIONS I-N with auto-calculated values
└─ Uses: useMemo for performance optimization

app/patients/add/page.tsx ⭐ ENHANCED
├─ Uses: types.Patient interface (20+ fields)
├─ Imports: auth context for auto-fill
└─ Saves: CRF SECTIONS A-E data

components/baseline-form.tsx ⭐ ENHANCED
├─ Uses: types.BaselineData interface
├─ Imports: outcomes-calculator (for calculation prep)
└─ Saves: CRF SECTIONS F-G data

app/signup/page.tsx ⭐ ENHANCED
├─ Uses: types.Doctor interface
├─ Saves: Doctor with qualification + studySiteCode
└─ Provides: Auto-fill data for patient forms
```

---

## Browser Console for Testing

```javascript
// Get latest follow-up data
db.collection('followUpData')
  .where('patientId', '==', 'abc123')
  .orderBy('visitDate', 'desc')
  .limit(1)
  .get()
  .then(snap => {
    const data = snap.docs[0].data()
    console.log('Follow-up Data:', data)
    console.log('Glycemic Response:', data.glycemicResponse)
    console.log('Weight Outcome:', data.outcomes.weightChange)
    console.log('Adherence:', data.adherence)
  })

// Test calculation function
import { calculateGlycemicResponse } from '@/lib/outcomes-calculator'
const result = calculateGlycemicResponse(8.2, 6.8)
console.log(result) // { category: "Responder", hba1cChange: -1.4, ... }
```

---

*Architecture Diagram - Last Updated: Phase 3 Implementation*
