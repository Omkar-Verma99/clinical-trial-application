# Form Fields Default Values Audit

**Generated:** March 11, 2026  
**Audit Scope:** All form files in the clinical trial application  
**Status:** Complete field analysis with issues identified

---

## ⚠️ CRITICAL ISSUES FOUND

### Issue 1: `treatmentInitiationDate` in BaselineForm (HIGH PRIORITY)
- **Location:** [components/baseline-form.tsx](components/baseline-form.tsx#L46)
- **Problem:** Initialized to today's date: `new Date().toISOString().split('T')[0]`
- **Impact:** Form will auto-populate with current date, potentially saving wrong treatment dates
- **Recommendation:** Initialize to empty string `""` like other date fields
- **Severity:** HIGH - This is medical data that must be manually entered

### Issue 2: `patientContinuingTreatment` in FollowupForm (MEDIUM PRIORITY)
- **Location:** [components/followup-form.tsx](components/followup-form.tsx#L82)
- **Problem:** Initialized to `true` as default: `patientContinuingTreatment: existingData?.adherence?.patientContinuingTreatment ?? true`
- **Impact:** Assumes patient is continuing treatment by default (bias)
- **Recommendation:** Change to `?? false` or require explicit user selection
- **Severity:** MEDIUM - Could lead to incorrect data entry if user doesn't notice

### Issue 3: `baselineVisitDate` in PatientForm (HIGH PRIORITY)
- **Location:** [app/patients/add/page.tsx](app/patients/add/page.tsx#L82)
- **Problem:** Initialized to today's date: `new Date().toISOString().split('T')[0]`
- **Impact:** Auto-populates with current date, but should be empty initially
- **Recommendation:** Initialize to empty string `""` 
- **Severity:** HIGH - Medical record date should be explicit

### Issue 4: Doctor Info Auto-Population (LOW PRIORITY)
- **Location:** [app/patients/add/page.tsx](app/patients/add/page.tsx#L79-L81)
- **Problem:** `studySiteCode` and `investigatorName` are auto-populated from doctor context
- **Impact:** May be correct, but user cannot change these values if incorrect
- **Recommendation:** Allow user override with validation
- **Severity:** LOW - Usually correct but limits flexibility

---

## BASELINE FORM DEFAULTS

### Form Component: `BaselineForm`
**File:** [components/baseline-form.tsx](components/baseline-form.tsx)

| Field Name | Current Default | Type | Should Have Default? | Issue |
|---|---|---|---|---|
| baselineVisitDate | `""` | date | NO | Read-only, managed from Patient Info - ✓ OK |
| hba1c | `""` | number | NO | ✓ OK - Empty is correct |
| fpg | `""` | number | NO | ✓ OK - Empty is correct |
| ppg | `""` | number | NO | ✓ OK - Empty is correct |
| weight | `""` | number | NO | ✓ OK - Read-only, prefilled from patient data |
| bloodPressureSystolic | `""` | number | NO | ✓ OK - Empty is correct |
| bloodPressureDiastolic | `""` | number | NO | ✓ OK - Empty is correct |
| heartRate | `""` | number | NO | ✓ OK - Optional field |
| serumCreatinine | `""` | number | NO | ✓ OK - Optional field |
| egfr | `""` | number | NO | ✓ OK - Optional field |
| urinalysisType | `"Normal"` (if no abnormality detected) | radio | YES | ✓ OK - Logical default |
| urinalysisSpecify | `""` | text | NO | ✓ OK - Only shown when abnormal |
| dosePrescribed | `""` | select | NO | ✓ OK - Empty is correct |
| treatmentInitiationDate | `TODAY'S DATE` | date | NO | ⚠️ **ISSUE 1** - Should be empty |
| counseling.dietAndLifestyle | `false` | checkbox | NO | ✓ OK - Empty is correct |
| counseling.hypoglycemiaAwareness | `false` | checkbox | NO | ✓ OK - Empty is correct |
| counseling.utiGenitialInfectionAwareness | `false` | checkbox | NO | ✓ OK - Empty is correct |
| counseling.hydrationAdvice | `false` | checkbox | NO | ✓ OK - Empty is correct |

**Notes:**
- Form has prefill logic that loads patient baseline weight and visit date from Firestore
- All numeric fields appropriately default to empty
- Counseling checkboxes correctly default to false

---

## FOLLOWUP FORM DEFAULTS

### Form Component: `FollowUpForm`
**File:** [components/followup-form.tsx](components/followup-form.tsx)

| Field Name | Current Default | Type | Should Have Default? | Issue |
|---|---|---|---|---|
| visitDate | `""` | date | NO | ✓ OK - Empty is correct |
| visitNumber | `1` (fallback) | number | MAYBE | Calculated from visitDate - ✓ OK |
| hba1c | `""` | number | NO | ✓ OK |
| fpg | `""` | number | NO | ✓ OK |
| ppg | `""` | number | NO | ✓ OK |
| weight | `""` | number | NO | ✓ OK |
| bloodPressureSystolic | `""` | number | NO | ✓ OK |
| bloodPressureDiastolic | `""` | number | NO | ✓ OK |
| heartRate | `""` | number | NO | ✓ OK |
| serumCreatinine | `""` | number | NO | ✓ OK |
| egfr | `""` | number | NO | ✓ OK |
| urinalysisType | `"Normal"` | radio | YES | ✓ OK - Logical default |
| urinalysisSpecify | `""` | text | NO | ✓ OK - Conditional field |
| hba1cResponse | `""` | radio | NO | ✓ OK - Empty is correct |
| weightChange | `""` | radio | NO | ✓ OK - Empty is correct |
| bpControlAchieved | `false` | radio | NO | ✓ OK - Explicit choice required |
| patientContinuingTreatment | `true` | radio | NO | ⚠️ **ISSUE 2** - Should be false/empty |
| discontinuationReason | `""` | radio | DEPENDS | Only if not continuing - ✓ OK |
| discontinuationReasonOther | `""` | text | DEPENDS | Only if "Other" selected - ✓ OK |
| missedDoses | `""` | radio | NO | ✓ OK - Explicit choice required |
| addOnTherapy | `false` | checkbox | NO | ✓ OK |
| addOnTherapyDetails | `""` | text | DEPENDS | Only if addOnTherapy=true - ✓ OK |
| adverseEventsPresent | Complex logic | boolean | NO | ✓ OK - Derived from data |
| hypoglycemiaMild | `false` | checkbox | NO | ✓ OK |
| hypoglycemiaModerate | `false` | checkbox | NO | ✓ OK |
| hypoglycemiaSevere | `false` | checkbox | NO | ✓ OK |
| uti | `false` | checkbox | NO | ✓ OK |
| genitalInfection | `false` | checkbox | NO | ✓ OK |
| dizzinessDehydration | `false` | checkbox | NO | ✓ OK |
| hospitalizationErVisit | `false` | checkbox | NO | ✓ OK |
| hospitalizationReason | `""` | text | DEPENDS | Only if hospitalization=true - ✓ OK |
| overallEfficacy | `""` | radio/select | NO | ✓ OK |
| overallTolerability | `""` | radio/select | NO | ✓ OK |
| complianceJudgment | `""` | radio/select | NO | ✓ OK |
| preferLongTerm | `false` | checkbox | NO | ✓ OK |
| uncontrolledT2dm | `false` | checkbox | NO | ✓ OK |
| obeseT2dm | `false` | checkbox | NO | ✓ OK |
| ckdPatients | `false` | checkbox | NO | ✓ OK |
| htnT2dm | `false` | checkbox | NO | ✓ OK |
| elderlyPatients | `false` | checkbox | NO | ✓ OK |
| noPersonalIdentifiers | `false` | checkbox | NO | ✓ OK |
| dataAsRoutinePractice | `false` | checkbox | NO | ✓ OK |
| patientIdentityMapping | `false` | checkbox | NO | ✓ OK |
| physicianConfirmation | `false` | checkbox | NO | ✓ OK |
| additionalComments | `""` | textarea | NO | ✓ OK |

**Notes:**
- **CRITICAL:** Line 82 shows `patientContinuingTreatment: existingData?.adherence?.patientContinuingTreatment ?? true`
- This means if no existing data, defaults to `true` (patient is continuing)
- All adverse event checkboxes correctly default to false
- Conditional fields properly managed with visibility logic

---

## PATIENT ADD/EDIT FORM DEFAULTS

### Form Component: `PatientFormPage`
**File:** [app/patients/add/page.tsx](app/patients/add/page.tsx)

| Field Name | Current Default | Type | Should Have Default? | Issue |
|---|---|---|---|---|
| patientCode | `""` | text | NO | ✓ OK |
| studySiteCode | `doctor?.studySiteCode \|\| ""` | text | MAYBE | Auto-filled from doctor - ⚠️ ISSUE 4 |
| investigatorName | `doctor?.name \|\| ""` | text | MAYBE | Auto-filled from doctor - ⚠️ ISSUE 4 |
| baselineVisitDate | `TODAY'S DATE` | date | NO | ⚠️ **ISSUE 3** - Should be empty |
| age | `""` | number | NO | ✓ OK |
| gender | `""` | select | NO | ✓ OK |
| height | `""` | number | NO | ✓ OK |
| weight | `""` | number | NO | ✓ OK |
| bmi | `""` (auto-calculated) | number | DEPENDS | ✓ OK - Calculated field |
| bmiManuallyEdited | `false` | boolean | YES | ✓ OK - Flag for manual override |
| durationOfDiabetes | `""` | number | NO | ✓ OK |
| baselineGlycemicSeverity | `""` | select | NO | ✓ OK |
| smokingStatus | `""` | select | NO | ✓ OK |
| alcoholIntake | `""` | select | NO | ✓ OK |
| physicalActivityLevel | `""` | select | NO | ✓ OK |
| **Diabetes Complications** | | | | |
| neuropathy | `false` | checkbox | NO | ✓ OK |
| retinopathy | `false` | checkbox | NO | ✓ OK |
| nephropathy | `false` | checkbox | NO | ✓ OK |
| cadOrStroke | `false` | checkbox | NO | ✓ OK |
| none | `false` | checkbox | NO | ✓ OK |
| **Comorbidities** | | | | |
| hypertension | `false` | checkbox | NO | ✓ OK |
| dyslipidemia | `false` | checkbox | NO | ✓ OK |
| obesity | `false` | checkbox | NO | ✓ OK |
| ascvd | `false` | checkbox | NO | ✓ OK |
| heartFailure | `false` | checkbox | NO | ✓ OK |
| chronicKidneyDisease | `false` | checkbox | NO | ✓ OK |
| other | `""` | text | NO | ✓ OK |
| ckdEgfrCategory | `""` | select | DEPENDS | Only if CKD=true - ✓ OK |
| **Previous Treatment** | | | | |
| previousTreatmentType | `""` | radio | NO | ✓ OK |
| **Previous Drug Classes** | | | | |
| metformin | `false` | checkbox | NO | ✓ OK |
| sulfonylurea | `false` | checkbox | NO | ✓ OK |
| dpp4Inhibitor | `false` | checkbox | NO | ✓ OK |
| sglt2Inhibitor | `false` | checkbox | NO | ✓ OK |
| tzd | `false` | checkbox | NO | ✓ OK |
| insulin | `false` | checkbox | NO | ✓ OK |
| other | `""` | text | NO | ✓ OK |
| **Reason for Triple FDC** | | | | |
| inadequateGlycemicControl | `false` | checkbox | NO | ✓ OK |
| weightConcerns | `false` | checkbox | NO | ✓ OK |
| hypoglycemiaOnPriorTherapy | `false` | checkbox | NO | ✓ OK |
| highPillBurden | `false` | checkbox | NO | ✓ OK |
| poorAdherence | `false` | checkbox | NO | ✓ OK |
| costConsiderations | `false` | checkbox | NO | ✓ OK |
| physicianClinicalJudgment | `false` | checkbox | NO | ✓ OK |
| other | `""` | text | NO | ✓ OK |

**Notes:**
- Auto-filled fields from doctor context may cause issues if doctor info is incorrect
- BMI is correctly auto-calculated from height/weight
- All checkbox groups default to false (not selected) - ✓ OK
- Required field validation enforces user selection

---

## SIGNUP FORM DEFAULTS

### Form Component: `SignupPage`
**File:** [app/signup/page.tsx](app/signup/page.tsx)

| Field Name | Current Default | Type | Should Have Default? | Issue |
|---|---|---|---|---|
| name | `""` | text | NO | ✓ OK |
| registrationNumber | `""` | text | NO | ✓ OK |
| qualification | `""` | text | NO | ✓ OK |
| email | `""` | email | NO | ✓ OK |
| phone | `""` | tel | NO | ✓ OK |
| dateOfBirth | `""` | date | NO | ✓ OK |
| address | `""` | text | NO | ✓ OK |
| studySiteCode | `""` | text | NO | ✓ OK |
| password | `""` | password | NO | ✓ OK |
| confirmPassword | `""` | password | NO | ✓ OK |

**Notes:**
- All fields correctly initialize to empty strings
- No problematic defaults

---

## LOGIN FORM DEFAULTS

### Form Component: `LoginFormContent` (wrapped in `LoginFormWrapper`)
**File:** [components/login-form.tsx](components/login-form.tsx)

| Field Name | Current Default | Type | Should Have Default? | Issue |
|---|---|---|---|---|
| email | `""` | email | NO | ✓ OK |
| password | `""` | password | NO | ✓ OK |

**Notes:**
- Simple form with correct empty defaults
- Has proper redirect handling via `redirectTo` from URL params

---

## SUMMARY OF ISSUES

### Critical Issues (Fix Immediately)
1. **BaselineForm - treatmentInitiationDate** (Line 46)
   - Change: `treatmentInitiationDate: (existingData as any)?.treatmentInitiationDate || new Date().toISOString().split('T')[0]`
   - To: `treatmentInitiationDate: (existingData as any)?.treatmentInitiationDate || ""`

2. **PatientAddForm - baselineVisitDate** (Line 82)
   - Change: `baselineVisitDate: new Date().toISOString().split('T')[0]`
   - To: `baselineVisitDate: ""`

### Important Issues (Fix Soon)
3. **FollowUpForm - patientContinuingTreatment** (Line 82)
   - Change: `patientContinuingTreatment: existingData?.adherence?.patientContinuingTreatment ?? true`
   - To: `patientContinuingTreatment: existingData?.adherence?.patientContinuingTreatment ?? false`
   - Or require explicit user selection without default

### Low Priority Issues
4. **PatientAddForm - Doctor Auto-Fill** (Lines 79-81)
   - Should allow user override or at least confirmation
   - Consider adding a "Verify" button for auto-filled fields

---

## HARDCODED VALUES CHECK

### Values That Should Not Be Hardcoded
- ✓ **treatmentInitiationDate:** Currently hardcoded to today - **ISSUE FOUND**
- ✓ **baselineVisitDate:** Currently hardcoded to today - **ISSUE FOUND**
- ✓ **urinalysisType:** Defaults to "Normal" - OK (can be changed)
- ✓ **patientContinuingTreatment:** Defaults to true - **ISSUE FOUND**

### Validation-Only Fields
- ✓ Age validation (18-75) - works correctly
- ✓ BMI calculation - works correctly
- ✓ Numeric range validation - works correctly

---

## CONDITIONAL FIELD LOGIC CHECK

### BaselineForm
- ✓ urinalysisSpecify: Only shown when urinalysisType = "Abnormal" - **CORRECT**

### FollowUpForm
- ✓ discontinuationReason: Only shown when patientContinuingTreatment = false - **CORRECT**
- ✓ discontinuationReasonOther: Only shown when discontinuationReason = "Other" - **CORRECT**
- ✓ addOnTherapyDetails: Only shown when addOnTherapy = true - **CORRECT**
- ✓ hospitalizationReason: Only shown when hospitalizationErVisit = true - **CORRECT**
- ✓ All adverse event fields properly gated - **CORRECT**

### PatientAddForm
- ✓ ckdEgfrCategory: Only shown when chronicKidneyDisease = true - **CORRECT**
- ✓ Validation for CKD eGFR eligibility - **CORRECT**

---

## RECOMMENDATIONS

### Immediate Actions
1. Fix the three critical defaults (treatmentInitiationDate, baselineVisitDate, patientContinuingTreatment)
2. Add clear visual indicators for auto-populated fields
3. Add success/warning toasts when defaults are applied

### Best Practices Going Forward
1. Never auto-populate date fields with today's date unless explicitly intended
2. Never default boolean "continuing treatment" fields to true - use explicit user selection
3. Always allow users to override auto-filled fields from context
4. Consider adding a confirmation step for forms with auto-populated medical dates

