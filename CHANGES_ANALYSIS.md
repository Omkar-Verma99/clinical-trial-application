# CRF Update Analysis - Field Changes Required

**Date**: February 27, 2026  
**Status**: Deep Analysis Complete - Multiple Sections Missing

---

## 📊 SUMMARY

**Major Finding**: Baseline form is **SEVERELY INCOMPLETE**. It only shows 2 of 7+ required sections. Follow-up form is mostly complete.

| Category | Baseline Form | Follow-up Form |
|----------|---|---|
| **Sections Present** | 2 (F, G) | 10 (H-P, Notes) |
| **Sections Required** | 7+ (A-G + Declaration) | 10+ (H-P + Declaration + Privacy) |
| **Missing Fields** | ~30+ | 0-2 |
| **Priority** | 🔴 CRITICAL | 🟢 LOW |

---

## 🔴 BASELINE FORM - CRITICAL CHANGES REQUIRED

### Currently Implemented (2 sections):
```
✓ SECTION F: Clinical & Lab Parameters (Partial)
✓ SECTION G: Treatment & Counseling (Partial)
```

### COMPLETELY MISSING (5 sections):
```
✗ SECTION A: Patient Identification (ENTIRE SECTION)
✗ SECTION B: Demographics & Lifestyle (ENTIRE SECTION)  
✗ SECTION C: Diabetes History & Phenotype (ENTIRE SECTION)
✗ SECTION D: Comorbidities (ENTIRE SECTION)
✗ SECTION E: Prior Anti-Diabetic Therapy (ENTIRE SECTION)
✗ PHYSICIAN DECLARATION (AT END)
```

---

## 📋 DETAILED BASELINE CHANGES

### SECTION A: Patient Identification (NEW - MISSING ENTIRELY)
**Status**: 🔴 NOT IMPLEMENTED

Required fields:
- [ ] Patient Code: ______________________________ 
- [ ] Study Site / Clinic Code: ____________________ 
- [ ] Investigator Name: __________________________ 
- [ ] Date of Baseline Visit: ____ / ____ / ______ 

**Note**: Fields should be auto-filled from doctor profile where possible

---

### SECTION B: Demographics & Lifestyle (NEW - MISSING ENTIRELY)
**Status**: 🔴 NOT IMPLEMENTED

Required fields:
- [ ] Age (years): ______ 
- [ ] Gender: ☐ Male ☐ Female ☐ Other 
- [ ] Height (cm): ______ 
- [ ] Weight (kg): ______ (Currently in Section F, needs to move)
- [ ] BMI (kg/m²): ______ (Should auto-calculate from height/weight)

**Lifestyle Factors**:
- [ ] Smoking status: ☐ Never ☐ Former ☐ Current 
- [ ] Alcohol intake: ☐ No ☐ Occasional ☐ Regular 
- [ ] Physical activity level: ☐ Sedentary ☐ Moderate ☐ Active 

**Impact**: ~10 new fields to add

---

### SECTION C: Diabetes History & Phenotype (NEW - MISSING ENTIRELY)
**Status**: 🔴 NOT IMPLEMENTED

Required fields:
- [ ] Duration of Type 2 Diabetes (years): ______ 

**Baseline Glycemic Severity (single select)**:
- [ ] HbA1c <7.5% 
- [ ] HbA1c 7.5–8.5% 
- [ ] HbA1c 8.6–10% 
- [ ] HbA1c >10% 

**Diabetes-Related Complications (multi-select)**:
- [ ] Neuropathy 
- [ ] Retinopathy 
- [ ] Nephropathy 
- [ ] CAD / Stroke 
- [ ] None 

**Impact**: ~7 new fields to add

---

### SECTION D: Comorbidities (NEW - MISSING ENTIRELY)
**Status**: 🔴 NOT IMPLEMENTED

Required fields (multi-select):
- [ ] Hypertension 
- [ ] Dyslipidemia 
- [ ] Obesity 
- [ ] ASCVD 
- [ ] Heart Failure 
- [ ] Chronic Kidney Disease 
- [ ] Other: _______________________ 

**If CKD present – baseline eGFR category**:
- [ ] ≥90 
- [ ] 60–89 
- [ ] 45–59 
- [ ] 30–44 

**Impact**: ~8 new fields to add

---

### SECTION E: Prior Anti-Diabetic Therapy (NEW - MISSING ENTIRELY)
**Status**: 🔴 NOT IMPLEMENTED

**Previous Treatment Type (single select)**:
- [ ] Drug-naïve 
- [ ] Oral drugs only 
- [ ] Insulin only 
- [ ] Oral drugs + Insulin 

**Previously used drug classes (multi-select)**:
- [ ] Metformin 
- [ ] Sulfonylurea 
- [ ] DPP-4 inhibitor 
- [ ] SGLT-2 inhibitor 
- [ ] TZD 
- [ ] Insulin 

**Reason for initiating KC MeSempa (multi-select)**:
- [ ] Inadequate glycemic control 
- [ ] Weight concerns 
- [ ] Hypoglycemia on prior therapy 
- [ ] High pill burden 
- [ ] Poor adherence 
- [ ] Cost considerations 
- [ ] Physician clinical judgment 
- [ ] Other: _______________________ 

**Impact**: ~13 new fields to add

---

### SECTION F: Baseline Clinical & Lab Parameters (EXISTS BUT INCOMPLETE)
**Status**: 🟡 PARTIALLY IMPLEMENTED

**Current fields** (OK):
- ✓ HbA1c (%) 
- ✓ Fasting Plasma Glucose (FPG, mg/dL)
- ✓ Post-Prandial Glucose (PPG, mg/dL)
- ✓ Weight (kg)
- ✓ Blood Pressure (mmHg)
- ✓ Heart Rate (bpm)
- ✓ Serum Creatinine (mg/dL)
- ✓ eGFR (mL/min/1.73 m²)
- ✓ Urinalysis

**All fields match CRF** ✓

---

### SECTION G: Treatment & Counselling (EXISTS - MATCH CRF)
**Status**: 🟢 MATCHES

**Current fields** (OK):
- ✓ KC MeSempa dose prescribed
- ✓ Date of initiation
- ✓ Counselling provided (4 checkboxes):
  - ✓ Diet & lifestyle
  - ✓ Hypoglycemia awareness
  - ✓ UTI / genital infection awareness
  - ✓ Hydration advice

**All fields match CRF** ✓

---

### PHYSICIAN DECLARATION (NEW - MISSING)
**Status**: 🔴 NOT IMPLEMENTED

Required fields at end:
- [ ] Physician Name: __________________________ 
- [ ] Qualification: __________________________ 
- [ ] Clinic / Hospital Name: ___________________ 
- [ ] Signature & Stamp: _______________________ 
- [ ] Date: ____ / ____ / ______ 

**Note**: Should be auto-filled from doctor profile with confirmation

**Impact**: 5 new fields to add

---

## 🟢 FOLLOW-UP FORM - MOSTLY COMPLETE

### Current Status:
✓ SECTION H: Follow-up Visit Date & Clinical Parameters  
✓ SECTION I: Glycemic Response Assessment  
✓ SECTION J: Weight, BP & Renal Outcomes  
✓ SECTION K: Adherence & Treatment Durability  
✓ SECTION L: Safety & Adverse Events  
✓ SECTION M: Physician Global Assessment  
✓ SECTION N: Patient-Reported Outcomes  
✓ SECTION O: Data Privacy & Confidentiality  
✓ SECTION P: Physician Declaration  
✓ Additional Notes  

### Minor Adjustments Needed:
**SECTION L - Safety & Adverse Events**
- Current: Free-text entry + checkboxes
- CRF shows: Structured table format with columns:
  - [ ] AE Term
  - [ ] Onset Date
  - [ ] Severity (Mild/Moderate/Severe)
  - [ ] Serious (Yes/No)
  - [ ] Action Taken
  - [ ] Outcome
  
**Current implementation might be sufficient**, but structured table would match CRF better.

---

## 📈 TOTAL CHANGES REQUIRED

### Baseline Form:
| Category | Fields | Status |
|----------|--------|--------|
| Section A (Patient ID) | 4 | 🔴 NEW |
| Section B (Demographics) | 10 | 🔴 NEW |
| Section C (Diabetes History) | 7 | 🔴 NEW |
| Section D (Comorbidities) | 8 | 🔴 NEW |
| Section E (Prior Therapy) | 13 | 🔴 NEW |
| Section F (Lab Params) | 9 | 🟢 EXISTS |
| Section G (Treatment) | 5 | 🟢 EXISTS |
| Physician Declaration | 5 | 🔴 NEW |
| **TOTAL** | **~61 fields** | **~42 new fields** |

### Follow-up Form:
| Category | Fields | Status |
|----------|--------|--------|
| Section H (Visit Data) | 9 | 🟢 EXISTS |
| Section I (Glycemic) | 4 | 🟢 EXISTS |
| Section J (Outcomes) | 3 | 🟢 EXISTS |
| Section K (Adherence) | 4 | 🟢 EXISTS |
| Section L (Adverse Events) | 6+ | 🟡 PARTIAL |
| Section M (Assessment) | 7 | 🟢 EXISTS |
| Section N (Patient-Reported) | 3 | 🟢 EXISTS |
| Section O (Privacy) | 3 | 🟢 EXISTS |
| Section P (Declaration) | 5 | 🟢 EXISTS |
| **TOTAL** | **~44 fields** | **~1-2 adjustments** |

---

## 🎯 IMPLEMENTATION PRIORITY

### Priority 1 (CRITICAL - Must implement):
1. **Baseline SECTION A** - Patient Identification (4 fields)
2. **Baseline SECTION B** - Demographics & Lifestyle (10 fields)
3. **Baseline SECTION C** - Diabetes History (7 fields)
4. **Baseline SECTION D** - Comorbidities (8 fields)
5. **Baseline SECTION E** - Prior Therapy (13 fields)
6. **Baseline Physician Declaration** (5 fields)

### Priority 2 (MEDIUM - Nice to have):
7. Follow-up Section L - Structure adverse events as proper table

### Priority 3 (LOW - Optional):
8. Field name tweaks or label adjustments

---

## 💾 DATA STRUCTURE UPDATES NEEDED

### types.ts - Baseline Interface (EXPAND):
Current:
```typescript
export interface BaselineData {
  patientId: string
  hba1c: number
  fpg: number
  ppg?: number
  weight: number
  ...
}
```

Needs to add:
```typescript
// SECTION A - Patient Identification
patientCode?: string
studySiteCode?: string
investigatorName?: string
baselineVisitDate?: string

// SECTION B - Demographics & Lifestyle
age?: number
gender?: "Male" | "Female" | "Other"
height?: number
bmi?: number
smokingStatus?: string
alcoholIntake?: string
physicalActivityLevel?: string

// SECTION C - Diabetes History
durationOfDiabetes?: number
baselineGlycemicSeverity?: string
diabetesComplications?: {...}

// SECTION D - Comorbidities  
comorbidities?: {...}
ckdEgfrCategory?: string

// SECTION E - Prior Therapy
previousTreatmentType?: string
previousDrugClasses?: {...}
reasonForTripleFDC?: {...}

// Physician Declaration
physicianDeclaration?: {...}
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Baseline Form Frontend:
- [ ] Add SECTION A UI
- [ ] Add SECTION B UI
- [ ] Add SECTION C UI
- [ ] Add SECTION D UI
- [ ] Add SECTION E UI
- [ ] Add Physician Declaration UI
- [ ] Update form validation
- [ ] Test data submission
- [ ] Test offline save
- [ ] Test Firebase sync

### Baseline Form Types:
- [ ] Update BaselineData interface
- [ ] Add all new field types
- [ ] Update validation logic
- [ ] Update sanitization rules

### Database:
- [ ] No schema changes (Firestore flexible)
- [ ] Update migration for existing data (if any)
- [ ] Backward compatibility (legacy fields)

### Follow-up Form (Minor):
- [ ] Consider Section L table restructure (optional)

### Testing:
- [ ] Test all new fields required validation
- [ ] Test offline functionality
- [ ] Test data persistence
- [ ] Test PDF export (if applicable)
- [ ] Test admin view of new fields

---

## 🚀 NEXT STEPS

1. **Expand types.ts** - Add all missing BaselineData fields
2. **Rewrite baseline-form.tsx** - Add 5 new sections (~400+ lines)
3. **Update validation logic** - Handle new field requirements
4. **Test offline/online sync** - Ensure data flows correctly
5. **Update admin exports** - Display new fields in exports
6. **Create migration** - For any existing baseline records (if needed)
7. **Deploy with version bump** - Update version.json and push

---

**Status**: Ready for implementation  
**Estimated Effort**: 8-12 hours development  
**Risk Level**: Medium (large frontend changes, but types already exist)
