# DEPRECATED - See IMPLEMENTATION_TASKS.md

This file has been replaced. All task specifications are now in **IMPLEMENTATION_TASKS.md**.

---

## Page Layout Architecture

### 1. **Top Section (Above Table)**
```
┌─────────────────────────────────┐
│  H3 Heading: "Patient List"     │
│  Total Count: "(120 active)"    │
│  Quick Info Bar (optional)      │
└─────────────────────────────────┘
```
- Add a title card or section header showing the patient count for visibility.
- Optional: Add small filter/search input (future enhancement, not in MVP).

### 2. **Table Container (Scrollable)**
```
Max Height: ~600–700px
Overflow-Y: auto
───────────────────────────────
| STICKY HEADER (stays on top)  |
───────────────────────────────
| Row 1                          |
| Row 2                          |
| ... Row 30                     |
───────────────────────────────
```
- Container div with **`max-h-[700px] overflow-y-auto`** (Tailwind classes).
- The table header remains **sticky** (`sticky top-0 z-10`) while rows scroll.
- Body scrolls independently; header doesn't move.

### 3. **Footer Section (Below Table)**
```
┌─────────────────────────────────────────┐
│ [◀ Previous]  Showing 1–30 of 120     [Next ▶] │
└─────────────────────────────────────────┘
```
- Status text: "Showing **X–Y** of **Z** patients"
- Previous/Next buttons with proper disabled states.

---

## Column Specifications

| Column        | Data Type | Example       | Alignment | Width    | Format Notes                    |
|---------------|-----------|---------------|-----------|----------|--------------------------------|
| Patient Code  | String    | `KC-001`      | Left      | ~15%     | Uppercase, monospace (use `font-mono`) |
| Age           | Number    | `45`          | Center    | ~10%     | Integer in years (no unit suffix) |
| Enrolled Date | ISO Date  | `2026-03-12`  | Center    | ~20%     | Format as `DD-MMM-YYYY` (e.g., *12-Mar-2026*) using `toLocaleDateString("en-IN")` |
| Study Site    | String    | `Apollo Delhi`| Left      | ~35%     | Display clinic/hospital name from `patient.studySiteCode` |
| Actions       | Button    | —             | Right     | ~20%     | Button: "View Details" → navigates to `/patients/[id]` |

---

## Table HTML/JSX Structure

### Header Row (Sticky)
```jsx
<thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-border shadow-sm">
  <tr>
    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold">Patient Code</th>
    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold">Age</th>
    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold">Enrolled Date</th>
    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold">Study Site</th>
    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold">Actions</th>
  </tr>
</thead>
```

### Body Row (Repeating)
```jsx
<tbody>
{currentPagePatients.map((patient, idx) => (
  <tr key={patient.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 dark:bg-slate-900/50"}>
    <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-white">{patient.patientCode}</td>
    <td className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300">{patient.age}</td>
    <td className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300">
      {new Date(patient.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })}
    </td>
    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{patient.studySiteCode}</td>
    <td className="px-4 py-3 text-right">
      <button 
        onClick={(e) => handleActionClick(e, patient)}
        className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        View Details
      </button>
    </td>
  </tr>
))}
</tbody>
```

---

## Pagination Logic

### Current State Variables (Already in dashboard/page.tsx)
- **`pagination.offset`**: Starting index (0, 30, 60, etc.)
- **`pagination.limit`**: 30 records per page
- **`pagination.hasMore`**: True if there are more records beyond current page

### Displayed Records Calculation
```javascript
const currentPagePatients = patients.slice(
  pagination.offset,
  pagination.offset + pagination.limit
)
// Returns at most 30 records

const startIndex = pagination.offset + 1
const endIndex = Math.min(pagination.offset + pagination.limit, patients.length)
const totalPatients = patients.length
```

### Pagination Display
```
"Showing 1–30 of 120"  (page 1)
"Showing 31–60 of 120" (page 2)
"Showing 91–120 of 120" (page 3, last page)
```

---

## Styling & Dark Mode

### Light Mode
- Header: White bg with light gray border
- Rows: White (odd) and light gray `bg-slate-50` (even)
- Text: Dark gray text

### Dark Mode
- Header: Dark slate `bg-slate-900` with subtle border
- Rows: Slate-900 (odd) and slate-900/50 (even)
- Text: Light gray/white text

---

## Interaction Behavior

| User Action | Expected Behavior |
|-------------|-------------------|
| **Click "View Details"** | Navigate to `/patients/[patient.id]` using `router.push()` (reuse existing `handleActionClick`) |
| **Scroll Down (Body)** | Header stays fixed at top; only row content scrolls |
| **Click "Previous"** | Move offset back by 30; update pagination state and re-render |
| **Click "Next"** | Move offset forward by 30; disable if no more data |
| **Load New Patient** | Real-time listener (already set up) updates `patients` state → table re-renders automatically |

---

## Code Changes Required

### File: `app/dashboard/page.tsx`

1. **Remove**: `PatientCard` component and all card-rendering JSX.
2. **Update**: `pagination.limit` from 12 to 30.
3. **Add**: New table JSX in the main `return` block where cards used to render.
4. **Keep**: All existing state, listeners, and `handleActionClick` function unchanged.
5. **Update**: `currentPagePatients` slice to use new limit of 30.

---

## Accessibility & Best Practices

- ✅ Use semantic `<table>`, `<thead>`, `<tbody>`
- ✅ Add `scope="col"` to all `<th>` elements
- ✅ Ensure button has `aria-label="View details for {patientCode}"`
- ✅ Ensure color contrast meets WCAG AA standards
- ✅ Tab navigation works smoothly (buttons, pagination controls)
- ✅ Date format is locale-aware (`en-IN` for India)

---

# TASK TWO: Patient Info Tab (Edit Patient Details)

## Feature Overview

When a doctor clicks **"View Details"** on a patient from the table, they navigate to `/patients/[id]` which shows the patient detail page.

**Current Page Tabs:**
- Overview (patient summary, status)
- Baseline (baseline assessment data)
- Follow-ups (dynamic follow-up visits, repeating section)
- Comparison (compare baseline vs follow-ups)

**New Tab to Add:**
- **Patient Info** (patient registration/demographic information, editable)

---

## What is "Patient Info" Tab?

The **Patient Info** tab is an **edit mode** for patient demographic and medical history data. It shows the **same form fields used during patient registration** (the "Add Patient" form), but:

- ✅ **Pre-filled** with the patient's current data
- ✅ **Editable** – doctor can modify fields and save changes
- ✅ **Read-only for some fields** (e.g., Patient Code, date of registration) to maintain data integrity
- ✅ **Real-time validation** to ensure data quality before saving

---

## Patient Add Form Fields (Reference)

The patient registration form includes these sections/fields:

### **1. Patient Identification**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Patient Code | Text (Auto) | Yes | `KC-001` | Read-only (assigned at registration) |
| Study Site Code / Hospital | Dropdown/Text | Yes | `Apollo Delhi` | Pre-filled, editable |
| Investigator Name | Text | No | `Dr. Omkar Verma` | Pre-filled from doctor who registered |

### **2. Demographics**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Age | Number | Yes | `45` | Editable |
| Gender | Radio (M/F/Other) | Yes | `Male` | Editable |
| Height (cm) | Number | Yes | `175` | Editable |
| BMI (kg/m²) | Number (Auto-calc) | No | `24.2` | Auto-calculated from weight (if available) |

### **3. Diabetes History**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Duration of Diabetes (years) | Number | Yes | `5.5` | Editable |
| Baseline Glycemic Severity | Radio | Yes | `HbA1c 7.5–8.5%` | Editable |
| Previous Treatment Type | Radio | Yes | `Oral drugs only` | Editable |

### **4. Complications**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Diabetes Complications | Checkboxes | No | ☑ Neuropathy, ☑ Retinopathy | Editable (multi-select) |
| - Neuropathy | Checkbox | — | ☑ | Subset of complications |
| - Retinopathy | Checkbox | — | ☑ | Subset of complications |
| - Nephropathy | Checkbox | — | ☐ | Subset of complications |
| - CAD/Stroke | Checkbox | — | ☑ | Subset of complications |

### **5. Comorbidities**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Hypertension | Checkbox | No | ☑ | Editable |
| Dyslipidemia | Checkbox | No | ☑ | Editable |
| Obesity | Checkbox | No | ☑ | Editable |
| ASCVD | Checkbox | No | ☐ | Editable |
| Heart Failure | Checkbox | No | ☐ | Editable |
| CKD (Chronic Kidney Disease) | Checkbox | No | ☑ | Editable |
| - CKD eGFR Category | Radio (if CKD checked) | Conditional | `60–89` | Editable only if CKD = true |

### **6. Previous Anti-Diabetic Therapy**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Previous Drug Classes | Checkboxes | No | ☑ Metformin, ☑ Insulin | Editable (multi-select) |
| - Metformin | Checkbox | — | ☑ | |
| - Sulfonylurea | Checkbox | — | ☐ | |
| - DPP4 Inhibitor | Checkbox | — | ☑ | |
| - SGLT2 Inhibitor | Checkbox | — | ☐ | |
| - TZD | Checkbox | — | ☐ | |
| - Insulin | Checkbox | — | ☑ | |

### **7. Lifestyle**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Smoking Status | Radio | Yes | `Former` | Editable |
| Alcohol Intake | Radio | Yes | `Occasional` | Editable |
| Physical Activity Level | Radio | Yes | `Moderate` | Editable |

### **8. Reason for KC MeSempa Initiation**
| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Reason for Triple FDC | Checkboxes | No | ☑ Inadequate Glycemic Control | Editable (multi-select) |
| - Inadequate Glycemic Control | Checkbox | — | ☑ | |
| - Weight Concerns | Checkbox | — | ☑ | |
| - Hypoglycemia on Prior Therapy | Checkbox | — | ☐ | |
| - High Pill Burden | Checkbox | — | ☑ | |
| - Poor Adherence | Checkbox | — | ☐ | |
| - Cost Considerations | Checkbox | — | ☐ | |
| - Physician Clinical Judgment | Checkbox | — | ☑ | |

---

## Patient Info Tab Layout

### **Visual Structure**

```
┌────────────────────────────────────────────────────┐
│  Patient: PT_0001                                   │
│  45 years • Male • 5.5 years with diabetes         │
├────────────────────────────────────────────────────┤
│ [Overview] [Baseline] [Follow-ups] [Comparison] [Patient Info] │  ← New Tab
├────────────────────────────────────────────────────┤
│                  PATIENT INFO                       │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ ✏️ Edit Mode Enabled                         │  │  ← State indicator
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  1. PATIENT IDENTIFICATION                         │
│  ├─ Patient Code: KC-001 [Read-Only]              │
│  ├─ Study Site Code: Apollo Delhi [Editable]      │
│  └─ Investigator: Dr. Omkar Verma [Read-Only]     │
│                                                    │
│  2. DEMOGRAPHICS                                   │
│  ├─ Age: [45] years [Editable]                    │
│  ├─ Gender: ◉ Male ○ Female ○ Other [Editable]   │
│  ├─ Height: [175] cm [Editable]                   │
│  └─ BMI: 24.2 kg/m² [Auto-calculated]             │
│                                                    │
│  3. DIABETES HISTORY                               │
│  ├─ Duration: [5.5] years [Editable]              │
│  ├─ Severity: ◉ HbA1c 7.5–8.5% [Editable]        │
│  └─ Previous Treatment: ○ Oral drugs only [Edit]  │
│                                                    │
│  4. COMPLICATIONS                                  │
│  ├─ ☑ Neuropathy [Editable]                       │
│  ├─ ☑ Retinopathy [Editable]                      │
│  ├─ ☐ Nephropathy [Editable]                      │
│  └─ ☑ CAD/Stroke [Editable]                       │
│                                                    │
│  5. COMORBIDITIES                                  │
│  ├─ ☑ Hypertension [Editable]                     │
│  ├─ ☑ Dyslipidemia [Editable]                     │
│  ├─ ☑ Obesity [Editable]                          │
│  ├─ ☑ CKD [Editable]                              │
│  │  └─ eGFR Category: ○ 60–89 [Editable]         │
│  └─ ...                                            │
│                                                    │
│  6. PREVIOUS THERAPY                               │
│  ├─ ☑ Metformin [Editable]                        │
│  ├─ ☑ Insulin [Editable]                          │
│  └─ ...                                            │
│                                                    │
│  7. LIFESTYLE                                      │
│  ├─ Smoking: ○ Former [Editable]                  │
│  ├─ Alcohol: ○ Occasional [Editable]              │
│  └─ Activity: ○ Moderate [Editable]               │
│                                                    │
│  8. REASON FOR KC MESEMPA                          │
│  ├─ ☑ Inadequate Glycemic Control [Editable]     │
│  ├─ ☑ Weight Concerns [Editable]                  │
│  └─ ...                                            │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ [✓ Save Changes]    [✕ Cancel]  [⟳ Reset]   │  │  ← Action Buttons
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Tab Navigation & State Management

### **Tab Definition**
```jsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: 'Eye' },
  { id: 'baseline', label: 'Baseline', icon: 'Calendar' },
  { id: 'followups', label: 'Follow-ups', icon: 'Repeat' },
  { id: 'comparison', label: 'Comparison', icon: 'BarChart3' },
  { id: 'patient-info', label: 'Patient Info', icon: 'User' }  // ← NEW
]
```

### **Active Tab State**
```javascript
const [activeTab, setActiveTab] = useState('overview')

// Switch to Patient Info
const handleTabClick = (tabId) => {
  setActiveTab(tabId)
}
```

---

## Patient Info Tab – Using Existing Add Form

### **Approach: Reuse Existing Form Component**

Instead of creating a duplicate form, we'll **reuse the existing patient add form** with two modes:

| Aspect | Add/Create Mode | Edit Mode (Patient Info Tab) |
|--------|-----------------|------------------------------|
| **URL** | `/patients/add` | `/patients/[id]/edit` (or `/patients/[id]?mode=edit`) |
| **Form State** | Empty fields | Pre-filled with patient data from Firestore |
| **Patient Code** | Auto-generated | Read-only (display only) |
| **Save Endpoint** | POST `/api/patients/create` | PUT `/api/patients/[id]/update` |
| **Cancel Behavior** | Return to dashboard | Return to patient detail page |
| **Button Text** | "Create Patient" | "Save Changes" |

---

## Implementation Strategy

### **1. Update Patient Add Form Component**

The existing patient add form ([`app/patients/add/page.tsx`](app/patients/add/page.tsx)) should be modified to support both modes:

```jsx
// app/patients/add/page.tsx
export default function PatientAddPage({ searchParams }) {
  const patientId = searchParams?.id  // Passed when editing existing patient
  const isEditMode = !!patientId
  
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(isEditMode)

  // Load patient data if in edit mode
  useEffect(() => {
    if (isEditMode && patientId) {
      const fetchPatient = async () => {
        const patientDoc = await getDoc(doc(db, 'patients', patientId))
        setPatient(patientDoc.data())
        setLoading(false)
      }
      fetchPatient()
    }
  }, [isEditMode, patientId])

  // Same form fields and UI, but:
  // - Pre-filled with patient data if editing
  // - Save button calls PUT (edit) instead of POST (create)
  // - Patient Code is read-only in edit mode
}
```

### **2. Add "Patient Info" Tab in Patient Detail Page**

The patient detail page already has tabs: Overview, Baseline, Follow-ups, Comparison.

Add a new tab:
```jsx
<Tab id="patient-info" label="Patient Info">
  <Link href={`/patients/add?id=${patientId}`}>
    <Button>Edit Patient Information</Button>
  </Link>
</Tab>
```

Or, directly render the form on this tab using the same form component (if it's been extracted).

### **3. Form Modes**

Add a conditional in the form to detect mode:

```jsx
const isEditMode = !!patientId

return (
  <form onSubmit={isEditMode ? handleUpdatePatient : handleCreatePatient}>
    {/* Form fields - same for both modes */}
    
    {/* Patient Code - Read-only in edit mode */}
    <Input
      value={formData.patientCode}
      disabled={isEditMode}
      readOnly={isEditMode}
    />
    
    {/* Submit Button - Different text per mode */}
    <Button type="submit" className="w-full">
      {isEditMode ? "Save Changes" : "Create Patient"}
    </Button>
  </form>
)
```

---

## Data Pre-filling (Edit Mode)

### **Load & Populate Form**
```javascript
useEffect(() => {
  if (isEditMode && patient) {
    setFormData({
      patientCode: patient.patientCode,
      age: patient.age,
      gender: patient.gender,
      height: patient.height,
      durationOfDiabetes: patient.durationOfDiabetes,
      baselineGlycemicSeverity: patient.baselineGlycemicSeverity,
      previousTreatmentType: patient.previousTreatmentType,
      diabetesComplications: patient.diabetesComplications,
      comorbidities: patient.comorbidities,
      previousDrugClasses: patient.previousDrugClasses,
      smokingStatus: patient.smokingStatus,
      alcoholIntake: patient.alcoholIntake,
      physicalActivityLevel: patient.physicalActivityLevel,
      reasonForTripleFDC: patient.reasonForTripleFDC,
      studySiteCode: patient.studySiteCode
    })
  }
}, [isEditMode, patient])
```

---

## Save Logic

### **Create New Patient (POST)**
```javascript
const handleCreatePatient = async (e) => {
  e.preventDefault()
  
  try {
    const response = await fetch('/api/patients/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    const data = await response.json()
    router.push(`/patients/${data.patientId}`)
    toast({ title: 'Patient created successfully' })
  } catch (error) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' })
  }
}
```

### **Update Existing Patient (PUT)**
```javascript
const handleUpdatePatient = async (e) => {
  e.preventDefault()
  
  try {
    const response = await fetch(`/api/patients/${patientId}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    const data = await response.json()
    router.push(`/patients/${patientId}`)  // Go back to patient detail
    toast({ title: 'Patient info updated successfully' })
  } catch (error) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' })
  }
}
```

---

## Backend API Endpoints

### **Endpoint 1: Create New Patient (Already Exists)**
```
POST /api/patients/create
```

### **Endpoint 2: Update Existing Patient (Needs to be Added)**
```
PUT /api/patients/[id]/update
```

**Request Body:**
```json
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
  "message": "Patient updated successfully",
  "patientId": "doc-id-here"
}
```

---

## Summary: Simplified Approach

✅ **Reuse existing form** – No duplicate form code  
✅ **Two modes in one component** – Create (new patient) and Edit (existing patient)  
✅ **Pre-fill on edit** – Load patient data from Firestore and populate form  
✅ **Patient Info tab redirects** – Link to `/patients/add?id={patientId}` which loads form in edit mode  
✅ **Same validation** – Both modes use identical validation rules  
✅ **DRY principle** – Maintain form logic in one place, reduce technical debt  
✅ **Minimal changes needed** – Update existing form component + add new API endpoint (PUT) + add tab link
