# Implementation Tasks – Clinical Trial Application

## Overview
Three remaining tasks to complete the patient management workflow improvements.

---

## Task 1: Patient Dashboard Table (30 rows per page with Sticky Header)

### **Objective**
Replace the card-based patient list with a clean, scalable **table layout** in the patient dashboard.

### **Location**
- File: `app/dashboard/page.tsx`
- Component: Replace `PatientCard` rendering with table JSX

### **Requirements**

#### **Table Structure**
```
┌────────────────────────────────────────────────────────────────────┐
│ Patient Code │  Age  │ Enrolled Date  │ Study Site Code │ Actions  │ ← STICKY HEADER
├────────────────────────────────────────────────────────────────────┤
│ KC-001       │  45   │ 12-Mar-2026    │ Apollo Delhi    │ [View]   │
│ KC-002       │  52   │ 09-Mar-2026    │ Fortis Mumbai   │ [View]   │
│ ... (30 rows per page)
├────────────────────────────────────────────────────────────────────┤
│ ◀ Prev    Showing 1–30 of 120    Next ▶                            │
└────────────────────────────────────────────────────────────────────┘
```

#### **Columns**
| Column | Format | Alignment | Width |
|--------|--------|-----------|-------|
| Patient Code | Text (monospace) | Left | 15% |
| Age | Number | Center | 10% |
| Enrolled Date | `toLocaleDateString("en-IN")` | Center | 20% |
| Study Site Code | Text | Left | 30% |
| Actions (View Details) | Button | Center-Right | 25% |

#### **Pagination**
- **30 rows per page** (changed from current 12)
- Maintain existing `offset` + `limit` pagination logic
- Footer text: *"Showing X–Y of Z patients"*
- Prev/Next buttons

#### **Styling**
- Sticky header: `sticky top-0 z-10 bg-white dark:bg-slate-950`
- Table container: `max-h-[700px] overflow-y-auto`
- Hover effect on rows (light background change)
- Responsive borders between rows
- Light & Dark mode support

#### **Interaction**
- "View Details" button → Navigate to `/patients/[id]` (reuse existing `handleActionClick`)
- Click on row → Same navigation (optional enhancement)

#### **Existing Code to Preserve**
- Real-time Firestore listener: `onSnapshot(query(collection(db, "patients"), where("doctorId", "==", user.uid), orderBy("createdAt", "desc"), fbLimit(120)))`
- Pagination state: `{ offset, limit, hasMore }`
- `currentPagePatients` memoization pattern
- Doctor filtering via `doctorId`

---

## Task 2: Patient Info Tab (Editable Form in Patient Detail Page)

### **Objective**
Add a new **"Patient Info" tab** in the patient detail page that allows doctors to view and edit patient demographic/medical history data using the same form as patient registration.

### **Location**
- Files to modify:
  - `app/patients/add/page.tsx` (add dual-mode support)
  - `app/patients/[id]/page.tsx` (add new tab)

### **Requirements**

#### **Dual-Mode Form Approach**
Reuse the existing patient add form with two operational modes:

| Aspect | Add Mode | Edit Mode (Patient Info Tab) |
|--------|----------|------------------------------|
| **URL** | `/patients/add` | `/patients/add?id={patientId}` |
| **Form State** | Empty fields | Pre-filled with patient data |
| **Patient Code** | Auto-generated | Read-only (display only) |
| **Save Endpoint** | POST `/api/patients/create` | PUT `/api/patients/[id]/update` |
| **Button Text** | "Create Patient" | "Save Changes" |
| **Cancel Action** | Return to dashboard | Return to patient detail page |

#### **Form Sections (Reused from Patient Registration)**
1. Patient Identification
2. Demographics (Age, Gender, Height, BMI)
3. Diabetes History
4. Complications (with CKD eGFR)
5. Comorbidities
6. Previous Anti-Diabetic Therapy
7. Lifestyle (Smoking, Alcohol, Physical Activity)
8. Reason for KC MeSempa

#### **Read-Only Fields (Cannot Edit)**
- ✋ Patient Code
- ✋ Investigator Name (doctor who registered)

#### **Editable Fields (All Others)**
- ✔️ Age, Gender, Height, BMI
- ✔️ Duration of Diabetes, Baseline Glycemic Severity
- ✔️ Diabetes Complications (checkboxes)
- ✔️ Comorbidities (checkboxes + conditional CKD eGFR)
- ✔️ Previous Drug Classes (checkboxes)
- ✔️ Smoking Status, Alcohol Intake, Physical Activity Level (radio)
- ✔️ Reason for Triple FDC (checkboxes)
- ✔️ Study Site Code

#### **Form Behavior**
```
Patient Detail Page
├── Tab: Overview
├── Tab: Baseline
├── Tab: Follow-ups
├── Tab: Comparison
└── Tab: Patient Info ← NEW
    ├── Display patient data
    ├── [Edit] button (top-right)
    └── On Edit click:
        ├── Enable form fields
        ├── Show [Save] [Cancel] [Reset] buttons
        └── On Save: Call PUT endpoint
```

#### **Age Validation (Blocking)**

The **Age field must be between 18-75 years**. This is a required eligibility criterion.

**Validation Rules:**
- ✋ Age < 18 → **INELIGIBLE** (too young, exclude from study)
- ✋ Age > 75 → **INELIGIBLE** (too old, exclude from study)
- ✅ Age 18-75 → **ELIGIBLE** (can proceed)

**User Experience:**

When doctor enters an invalid age (< 18 or > 75):
1. Submit button becomes **disabled** (grayed out)
2. Age field shows **error message** below it:
   - If age < 18: *"Patient must be at least 18 years old. This patient is not eligible for the study."*
   - If age > 75: *"Patient must be 75 years or younger. This patient is not eligible for the study."*
3. Error styling: Red border on age input field
4. Doctor must change age to valid range (18-75) to proceed
5. Validation happens **on blur** or **real-time** as they type

**Validation Logic:**
```javascript
const validateAge = (age) => {
  const ageNum = parseInt(age, 10)
  
  if (isNaN(ageNum)) {
    return { valid: false, error: 'Age must be a valid number' }
  }
  
  if (ageNum < 18) {
    return { valid: false, error: 'Patient must be at least 18 years old. This patient is not eligible for the study.' }
  }
  
  if (ageNum > 75) {
    return { valid: false, error: 'Patient must be 75 years or younger. This patient is not eligible for the study.' }
  }
  
  return { valid: true, error: null }
}
```

**Applicable to:**
- ✅ Patient Add Form (`/patients/add`)
- ✅ Patient Info Tab (edit mode, same form)
- ❌ NOT in Follow-up or Baseline forms

---

#### **Data Flow**

**Pre-fill on tab load:**
```javascript
useEffect(() => {
  if (activeTab === 'patient-info') {
    setFormData({
      patientCode: patient.patientCode,
      age: patient.age,
      gender: patient.gender,
      height: patient.height,
      // ... all other fields from patient record
    })
  }
}, [activeTab, patient])
```

**Save to Firestore:**
```javascript
const handleSave = async () => {
  const response = await fetch(`/api/patients/${patientId}/update`, {
    method: 'PUT',
    body: JSON.stringify(formData)
  })
  // Refresh patient data, show success toast
}
```

**Cancel/Reset:**
```javascript
const handleCancel = () => setFormData(patient)  // Revert to original
const handleReset = () => setFormData(patient)   // Discard changes
```

---

## Task 3: CKD Eligibility Validation (Form Lock)

### **Objective**
Prevent enrollment of patients with Chronic Kidney Disease (CKD) eGFR **30-40** by implementing a blocking validation with form lockout.

### **Location**
- Files: `app/patients/add/page.tsx` (Patient Add Form + Patient Info Tab via same form)
- NOT applicable to: Follow-up forms, Baseline forms, or any other assessments

### **Requirements**

#### **Trigger Condition**
When user selects:
1. **Comorbidity:** "Chronic Kidney Disease (CKD)" ✅ selected
2. **CKD eGFR:** "30-40" (mL/min/1.73m²) ✅ selected

#### **User Experience**

**Step 1: User selects CKD 30-40**
```
Modal/Popup appears with message:
┌─────────────────────────────────────────┐
│ ⚠️  INELIGIBLE PATIENT                  │
│                                          │
│ This patient meets exclusive criteria   │
│ and is NOT eligible for this study.     │
│                                          │
│ eGFR 30-40 ml/min/1.73m² is an         │
│ exclusion criterion.                    │
│                                          │
│ [Go Back]                               │
└─────────────────────────────────────────┘
```

**Step 2: Form is completely locked**
- ✋ All form fields → Disabled (read-only appearance)
- ✋ Submit button → Disabled
- ✋ Only interactive element → CKD eGFR dropdown (remains enabled)

**Step 3: User has 2 options**

**Option A: Fix eGFR value**
- Change eGFR from "30-40" to **any other value** (e.g., "< 30", "> 40", "Unknown")
- **Immediately:** Form unlocks, all fields become editable again
- Modal dismisses automatically
- User can continue filling form and submit

**Option B: Go Back**
- Click "Go Back" in popup
- Abandon adding this patient
- Form clears or returns to dashboard
- No patient record created

#### **Validation Logic**
```javascript
// Check eligibility on every field change
const checkEligibility = () => {
  const isCKDSelected = formData.comorbidities.chronicKidneyDisease === true
  const isEGFR30_40 = formData.comorbidities.ckdEGFR === "30-40"
  
  if (isCKDSelected && isEGFR30_40) {
    setIsIneligible(true)  // Lock form, show modal
    setFormDisabled(true)
  } else {
    setIsIneligible(false)  // Unlock form
    setFormDisabled(false)
  }
}
```

#### **Form Lock Behavior**
- When `formDisabled = true`:
  - All inputs get `disabled` attribute
  - Submit button gets `disabled` attribute
  - Cursor changes to "not-allowed" on inputs
  - Visual styling: grayed out / reduced opacity
  - Only CKD eGFR field remains **interactive** (user can change it)

#### **Automatic Unlock**
- When user changes eGFR to **anything except "30-40"**:
  - Immediately unlock form
  - Restore all field interactions
  - Hide modal (if still visible)
  - Set `formDisabled = false`

#### **Applicable Forms**
- ✅ Patient Add Form (`/patients/add`)
- ✅ Patient Info Tab (edit mode, same form)
- ❌ Follow-up Forms
- ❌ Baseline Assessment Forms
- ❌ Any other assessment forms

#### **Messages/Alerts**
- Modal title: "⚠️  Ineligible Patient"
- Modal message: "This patient meets exclusive criteria and is NOT eligible for this study. eGFR 30-40 ml/min/1.73m² is an exclusion criterion."
- Button: "Go Back"

---

## Implementation Checklist

### Task 1: Patient Dashboard Table
- [ ] Modify `app/dashboard/page.tsx`
- [ ] Replace `PatientCard` grid with table JSX
- [ ] Update pagination limit to 30
- [ ] Add sticky header styling
- [ ] Implement table columns: Patient Code, Age, Enrolled Date, Study Site, Actions
- [ ] Reuse `handleActionClick` for View Details button
- [ ] Test pagination (Prev/Next)
- [ ] Test sticky header on scroll
- [ ] Test responsive design

### Task 2: Patient Info Tab
- [ ] Modify `app/patients/add/page.tsx` - Add mode detection logic
  - [ ] Detect `?id=` query parameter
  - [ ] Load patient data if in edit mode
  - [ ] Make Patient Code field read-only in edit mode
  - [ ] Change submit endpoint (POST vs PUT)
  - [ ] Change submit button text ("Create" vs "Save")
  - [ ] Add age validation (18-75 range)
    - [ ] Create `validateAge()` function
    - [ ] Hook validation to age field onChange
    - [ ] Show error message if age < 18 or > 75
    - [ ] Disable submit button if age invalid
    - [ ] Show error styling (red border) on age input
- [ ] Modify `app/patients/[id]/page.tsx` - Add new tab
  - [ ] Add "Patient Info" tab to tabs array
  - [ ] Link to `/patients/add?id={patientId}`
- [ ] Create API endpoint: `PUT /api/patients/[id]/update`
  - [ ] Accept patient data in request body
  - [ ] Update Firestore document
  - [ ] Return success response
- [ ] Test data pre-filling (edit mode)
- [ ] Test form submission (save changes)
- [ ] Test cancel/reset functionality
- [ ] Test age validation:
  - [ ] Age < 18 shows error and disables submit
  - [ ] Age > 75 shows error and disables submit
  - [ ] Age 18-75 allows submission
  - [ ] Error clears when age is corrected

### Task 3: CKD Eligibility Validation
- [ ] Modify `app/patients/add/page.tsx` - Add validation logic
  - [ ] Create `checkEligibility()` function
  - [ ] Hook eligibility check to `handleFieldChange()`
  - [ ] Detect: CKD selected + eGFR "30-40"
  - [ ] Show ineligibility modal
  - [ ] Lock all fields except CKD eGFR
  - [ ] Disable submit button
- [ ] Create Modal/Popup component
  - [ ] Display message: "This patient meets exclusive criteria..."
  - [ ] Add "Go Back" button
  - [ ] Auto-dismiss when eGFR changes
- [ ] Auto-unlock form when eGFR changes away from "30-40"
- [ ] Test: Eligibility check at form load time (if editing existing patient with CKD 30-40)
- [ ] Test: Switching between eligible/ineligible values
- [ ] Test: Go Back button clears form/closes modal
- [ ] Verify validation does NOT apply to Follow-up or Baseline forms

---

## Task 4: Follow-up Visit Timeline Alert (Follow-up 1 Only)

### **Objective**
Alert doctors when a Follow-up 1 visit is recorded outside the recommended timeline (Week 10-14), informing them of early or delayed visits without blocking submission.

### **Location**
- File: `app/patients/[id]/page.tsx` (Follow-up 1 form only)
- NOT applicable to: Follow-up 2, Follow-up 3, or any other follow-ups

### **Requirements**

#### **Trigger Condition**
When doctor submits a **Follow-up 1 assessment**:
1. Calculate **weeks elapsed** from **Baseline visit date** → **Follow-up visit date**
2. Check if weeks fall outside the expected window of **10-14 weeks**

#### **Validation Logic**
```javascript
const calculateWeeksElapsed = (baselineDate, followupDate) => {
  const timeDiff = followupDate - baselineDate
  const daysElapsed = timeDiff / (1000 * 60 * 60 * 24)  // Convert milliseconds to days
  const weeksElapsed = Math.round(daysElapsed / 7)
  return weeksElapsed
}

const checkFollowupTimeline = (baselineDate, followupDate) => {
  const weeks = calculateWeeksElapsed(baselineDate, followupDate)
  
  if (weeks < 10) {
    return { status: 'EARLY', weeks, message: 'This patient\'s follow-up is scheduled BEFORE the recommended timeline (Week 10-14). Consider rescheduling if needed.' }
  } else if (weeks > 14) {
    return { status: 'DELAYED', weeks, message: 'Follow-up delayed: Recorded as Week ' + weeks + ', expected Week 10-14. Please note this delay.' }
  } else {
    return { status: 'OK', weeks, message: null }  // No alert
  }
}
```

#### **User Experience**

**Step 1: Doctor enters Follow-up 1 date**
- Form calculates weeks elapsed automatically (background)

**Step 2: Doctor clicks "Save Follow-up"**
- System checks timeline
- If **OK (Week 10-14)**: 
  - ✅ Save normally, no popup
  - Proceed to confirmation

**Step 3a: If Follow-up is EARLY (Week < 10)**
```
Popup appears:
┌──────────────────────────────────────┐
│ ⚠️  EARLY VISIT ALERT               │
│                                      │
│ This patient's follow-up is          │
│ scheduled BEFORE the recommended     │
│ timeline (Week 10-14).              │
│ Consider rescheduling if needed.    │
│                                      │
│ [OK] [Cancel]                       │
└──────────────────────────────────────┘
```
- Doctor can click **[OK]** → Save anyway (alert is informational only)
- Doctor can click **[Cancel]** → Go back to form (do not save)

**Step 3b: If Follow-up is DELAYED (Week > 14)**
```
Popup appears:
┌──────────────────────────────────────┐
│ ⚠️  DELAYED VISIT ALERT              │
│                                      │
│ Follow-up delayed: Recorded as       │
│ Week {X}, expected Week 10-14.      │
│ Please note this delay.             │
│                                      │
│ [OK] [Cancel]                       │
└──────────────────────────────────────┘
```
- Doctor can click **[OK]** → Save anyway (alert is informational only)
- Doctor can click **[Cancel]** → Go back to form (do not save)

#### **Key Behaviors**

✅ **Alert-only (no form lock)**
- Does NOT disable form
- Does NOT prevent submission
- Just notifies doctor of timeline deviation

✅ **Informational messages**
- Show actual weeks calculated: "Recorded as Week {X}"
- Remind expected range: "expected Week 10-14"

✅ **Follow-up 1 only**
- Check only on **Follow-up 1** form
- Ignore for Follow-up 2, 3, or other follow-ups
- Implementation: Only apply validation if `followupNumber === 1` or `followupType === 'WEEK_10_14'`

#### **Applicable Forms**
- ✅ Follow-up 1 (Week 10-14 visit)
- ❌ Follow-up 2, 3, etc.
- ❌ Baseline Assessment
- ❌ Patient Add Form
- ❌ Patient Info Tab

#### **Implementation Checklist for Task 4**
- [ ] Modify `app/patients/[id]/page.tsx` (Follow-up 1 component)
  - [ ] Create `calculateWeeksElapsed()` function
  - [ ] Create `checkFollowupTimeline()` function
  - [ ] Hook check to form submission (before API call)
  - [ ] Pass baseline date + followup date to checkFunction
- [ ] Create Timeline Alert Modal component
  - [ ] Display warning icon + message
  - [ ] Show calculated weeks: "Recorded as Week {X}"
  - [ ] Add [OK] and [Cancel] buttons
  - [ ] [OK] → Proceed with save
  - [ ] [Cancel] → Close modal, return to form
- [ ] Test: Early visit (Week < 10) - shows alert
- [ ] Test: Delayed visit (Week > 14) - shows alert
- [ ] Test: On-time visit (Week 10-14) - no alert
- [ ] Test: [OK] button saves follow-up successfully
- [ ] Test: [Cancel] button closes modal without saving
- [ ] Verify validation does NOT apply to Follow-up 2, 3, or other assessments

---

## Backend API Needed

### **New Endpoint: PUT /api/patients/[id]/update**

**Purpose:** Update existing patient information (used by Patient Info Tab)

**Request:**
```
PUT /api/patients/{patientId}/update
Content-Type: application/json

{
  "age": 46,
  "gender": "Male",
  "height": 175,
  "durationOfDiabetes": 5.8,
  "baselineGlycemicSeverity": "HbA1c 7.5–8.5%",
  "previousTreatmentType": "Oral drugs only",
  "diabetesComplications": { ... },
  "comorbidities": { ... },
  "previousDrugClasses": { ... },
  "smokingStatus": "Former",
  "alcoholIntake": "Occasional",
  "physicalActivityLevel": "Moderate",
  "reasonForTripleFDC": { ... },
  "studySiteCode": "Apollo Delhi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient info updated successfully",
  "patientId": "doc-id-here",
  "updatedAt": "2026-03-09T14:30:00Z"
}
```

**Authentication:** Must check `user.uid` matches patient's `doctorId` (doctor can only edit own patients)

**Firestore Update:** Only update editable fields, preserve `patientCode`, `doctorId`, `createdAt`

---

## Summary

| Task | Status | Files | Key Features |
|------|--------|-------|--------------|
| **Task 1: Dashboard Table** | 📋 Ready | `app/dashboard/page.tsx` | 30 rows/page, sticky header, table layout |
| **Task 2: Patient Info Tab** | 📋 Ready | `app/patients/add/page.tsx`, `app/patients/[id]/page.tsx` | Reuse form, dual mode, PUT endpoint |
| **Task 3: CKD Validation** | 📋 Ready | `app/patients/add/page.tsx` | Form lock, modal, auto-unlock |
| **Task 4: Followup Timeline Alert** | 📋 Ready | `app/patients/[id]/page.tsx` | Timeline check for Follow-up 1, alert-only |

**All specifications complete. Ready for implementation!** ✅
