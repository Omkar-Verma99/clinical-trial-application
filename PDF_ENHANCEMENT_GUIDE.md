# PDF Export Enhancement Guide

## Overview
This guide documents the comprehensive PDF export improvements for the KC MeSempa Clinical Trial Application, including:

1. **Dynamic Multi-Visit Support** - Render all follow-up visits (Visit 1, 2, 3, etc.)
2. **Complete Patient Information** - All fields filled during patient registration
3. **Checkbox Styling** - Selected options shown with checkmarks (☑), unselected shown as empty (☐)
4. **Comparison Details** - Tabular comparison across baseline and all visits
5. **Data Privacy & Confidentiality** - With checkbox indicators
6. **Physician Declaration** - Signature, stamp, and qualification fields
7. **Favicon Integration** - Branded header with company logo

## Current Implementation Status

### ✅ Completed
- Header design with professional branding
- Patient identification section
- Demographics & lifestyle information
- Diabetes history & phenotype
- Comorbidities listing
- Prior anti-diabetic therapy
- Baseline clinical & lab parameters
- Single follow-up visit support
- Physician declaration with signature fields
- Download date (formattedDate)

### 🔄 In Progress
- Multi-visit follow-up rendering (allFollowUps array)
- Checkbox state visualization (checked = ☑ in green, unchecked = ☐ in gray)
- Dropdown field handling (show selected value only)
- Multi-visit comparison table
- Enhanced data privacy section

### ⏳ To Do
- Dynamic follow-up visit sections (Visit 1, Visit 2, Visit 3, etc.)
- Proper formatting for radio buttons vs checkboxes
- Event of special interest styling
- Patient-reported outcomes display
- Advanced trending analysis across visits

---

## PDF Section Structure

### Header
- **Favicon**: Circular logo placeholder (blue/orange branding)
- **Title**: "KC MeSempa"  
- **Subtitle**: "Real-World Evidence Study"
- **Document Type**: "CASE RECORD FORM - Complete Patient Assessment"
- **Patient Code & Date**: "Patient Code: PT0001 | Generated: 28/01/2026"

### Section 1: Patient Identification
Fields:
- Patient Code
- Study Site Code
- Investigator Name
- Baseline Visit Date

### Section 2: Demographics & Lifestyle
Fields:
- Age (years)
- Gender
- Height (cm)
- Weight (kg)
- BMI (kg/m²)
- Smoking Status
- Alcohol Intake
- Physical Activity Level

### Section 3: Diabetes History & Phenotype
Fields:
- Duration (years)
- Baseline Glycemic Severity
- Complications (checkboxes: Neuropathy, Retinopathy, Nephropathy, CAD/Stroke, None)

### Section 4: Comorbidities
Fields:
- Present Conditions (list all checked items)
- CKD eGFR Category (if applicable)
- Other Comorbidities (if any)

### Section 5: Prior Anti-Diabetic Therapy
Fields:
- Previous Treatment Type
- Drug Classes (checkboxes with only checked items shown)
- Reason for KC MeSempa Triple FDC

### Section 6: Baseline Clinical & Lab Parameters
Fields:
- HbA1c (%)
- FPG (mg/dL)
- PPG (mg/dL)
- Weight (kg)
- Blood Pressure (mmHg)
- Heart Rate (bpm)
- Serum Creatinine
- eGFR (mL/min)
- Urinalysis
- Counselling Provided (checkboxes: Diet & Lifestyle, Hypoglycemia Awareness, UTI/Genital Infection, Hydration Advice)
- Dose Prescribed
- Date of Initiation

### Section 7-N: DYNAMIC VISIT SECTIONS (One for each follow-up visit)

For each visit in the `followUps` array:

#### Visit Header
- Title: "VISIT 1", "VISIT 2", "VISIT 3", etc.
- Subtitle: Week information if available (e.g., "(12 weeks)")

#### 7A. Follow-up Clinical & Lab Parameters
- Visit Date
- HbA1c (%)
- FPG (mg/dL)
- PPG (mg/dL)
- Weight (kg)
- Blood Pressure (mmHg)
- Heart Rate (bpm)
- Serum Creatinine
- eGFR (mL/min)
- Urinalysis

#### 7B. Glycemic Response (Auto-calculated)
- Category (Super-responder, Responder, Partial responder, Non-responder)
- HbA1c Change (percentage and absolute)
- % Change from baseline

#### 7C. Weight, BP & Renal Outcomes
- Weight Change
- BP Control Achieved
- Renal Outcome

#### 7D. Adherence & Treatment Durability
- Continuing Treatment (Yes/No)
- Discontinuation Reason (if applicable)
- Missed Doses (7 days)
- Add-on/Changed Therapy
- Therapy Details

#### 7E. Events of Special Interest
**Checkboxes (show selected in green, unselected in gray):**
- Mild Hypoglycemia
- Moderate Hypoglycemia
- Severe Hypoglycemia
- UTI
- Genital Mycotic Infection
- Dizziness/Dehydration Symptoms
- Hospitalization/ER Visit (with reason if checked)

#### 7F. Physician Global Assessment
- Overall Efficacy
- Overall Tolerability
- Compliance Judgment
- Prefer for Long-term Use

**Preferred Patient Profiles (checkboxes):**
- Uncontrolled T2DM
- Obese T2DM
- CKD Patients
- HTN + T2DM
- Elderly Patients

#### 7G. Patient-Reported Outcomes
- Overall Satisfaction
- GI Tolerance vs Prior Therapy
- Confidence in Managing Diabetes
- Additional Comments

---

## Checkbox & Option Styling

### Checkbox Display Format
**SELECTED:**
```
☑ Option Name (Green/Blue color - #2D7D32 or #1976D2)
```

**UNSELECTED:**
```
☐ Option Name (Gray color - #666666)
```

### Radio Button Display Format
**For single-select fields (like Gender):**
Show only the selected value as plain text:
```
Gender: Male
```

NOT as radiobuttons.

### Dropdown Fields
**For dropdown selections (like Smoking Status):**
Show only the selected value as plain text:
```
Smoking Status: Never
```

NOT all options.

---

## Multi-Visit Comparison Table

Create a comparison table showing trends across all visits:

| Metric | Baseline | Visit 1 | Visit 2 | Visit 3 |
|--------|----------|---------|---------|---------|
| HbA1c (%) | 8.2 | 7.8 | 7.5 | 7.2 |
| FPG (mg/dL) | 180 | 160 | 145 | 135 |
| Weight (kg) | 85 | 83 | 81 | 80 |
| BP (mmHg) | 140/90 | 138/88 | 135/85 | 132/82 |
| eGFR (mL/min) | 65 | 68 | 70 | 72 |

---

## Data Privacy & Confidentiality Section

Title: "DATA PRIVACY & CONFIDENTIALITY"

**Checkboxes:**
- ☑ No personal identifiers recorded (if checked)
- ☐ No personal identifiers recorded (if unchecked)

- ☑ Data collected as routine clinical practice (if checked)
- ☐ Data collected as routine clinical practice (if unchecked)

- ☑ Patient identity mapping at clinic level only (if checked)
- ☐ Patient identity mapping at clinic level only (if unchecked)

---

## Physician Declaration Section

Title: "PHYSICIAN DECLARATION"

Declaration text (italic):
"I confirm that the above information is accurate and recorded as part of standard clinical practice."

Fields:
- Physician Name: [auto-filled from doctor.name]
- Qualification: [auto-filled from doctor.qualification]
- Study Site Code: [auto-filled from doctor.studySiteCode]
- Download Date: [today's date, no "Download Date:" label - just the date]

**Signature & Stamp Areas:**
- Physician Signature: [Empty box for manual signature] (50mm x 15mm)
- Hospital/Clinic Stamp: [Empty box for stamp] (45mm x 15mm)

---

## Implementation Code Snippet

### Dynamic Follow-up Rendering

```typescript
// Use followUps array if available, otherwise fallback to single followUp
const allFollowUps = followUps && followUps.length > 0 ? followUps : (followUp ? [followUp] : [])

allFollowUps.forEach((followUpData, visitIndex) => {
  // Visit header with week calculation
  const visitNumber = visitIndex + 1
  const visitWeek = followUpData.visitDate ? new Date(followUpData.visitDate).getTime() : null
  const baselineWeek = patient.baselineVisitDate ? new Date(patient.baselineVisitDate).getTime() : null
  let weeksDiff = ""
  if (visitWeek && baselineWeek) {
    const diffWeeks = Math.round((visitWeek - baselineWeek) / (7 * 24 * 60 * 60 * 1000))
    weeksDiff = ` (${diffWeeks} weeks)`
  }

  // Add page if needed
  if (yPosition > pageHeight - 100) { doc.addPage(); yPosition = margin }

  // Visit header
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(`VISIT ${visitNumber}${weeksDiff}`, pageWidth / 2, yPosition, { align: "center" })
  yPosition += 8

  // ... rest of visit sections
})
```

### Checkbox Styling

```typescript
// Event of special interest with colored checkboxes
const eventsList = [
  { label: "Mild Hypoglycemia", checked: followUpData.eventsOfSpecialInterest.hypoglycemiaMild },
  { label: "Moderate Hypoglycemia", checked: followUpData.eventsOfSpecialInterest.hypoglycemiaModerate },
  // ... more events
]

eventsList.forEach((event) => {
  const checkbox = event.checked ? "☑" : "☐"
  const checkColor = event.checked ? [46, 125, 50] : [100, 100, 100] // Green if checked, gray if not
  doc.setTextColor(...checkColor)
  doc.text(`${checkbox} ${event.label}`, col2Start, yPosition)
  yPosition += 4
})
doc.setTextColor(0, 0, 0) // Reset color
```

---

## Footer & Important Notes

**Footer text (italic, small font):**

"IMPORTANT: Signature and Stamp fields are BLANK. Please fill in after downloading."

"Do NOT record patient name, phone, address, or personal identifiers in this document."

"Patient Code ↔ Identity mapping must remain at clinic level only."

**Generation Info (bold, bottom right):**
"Generated: 28/01/2026 | Patient: PT0001"

---

## Testing Checklist

- [ ] PDF generates without errors
- [ ] Multi-visit data renders correctly (Visit 1, 2, 3...)
- [ ] Checkboxes display correctly (green when checked, gray when unchecked)
- [ ] Dropdown fields show only selected value
- [ ] Patient name NOT displayed in PDF (only code PT0001)
- [ ] All form fields from patient registration appear
- [ ] All baseline form fields appear
- [ ] All follow-up form fields appear for each visit
- [ ] Comparison table displays across visits
- [ ] Data Privacy section displays with correct checkboxes
- [ ] Physician Declaration section complete with date (no label)
- [ ] Signature & stamp boxes are empty (for manual filling)
- [ ] Footer warnings are present
- [ ] Page breaks occur automatically when needed
- [ ] Font sizes and colors match design spec
- [ ] Download date shows only date (format: 28/01/2026)

---

## Files to Modify

1. **lib/pdf-export.ts**
   - Update `generatePatientPDF()` function
   - Add dynamic follow-up loop
   - Add checkbox styling logic
   - Add comparison table generation

2. **app/patients/[id]/page.tsx**
   - Verify PDF export button passes `followUps` array
   - Add PDF download functionality for each visit

---

## Date Format

**All dates in PDF should be:** DD/MM/YYYY format
- Example: 28/01/2026 (not 2026-01-28 or 01/28/2026)

---

## Color Scheme

- **Header Background:** #1964A5 (Blue)
- **Section Headers:** #2980B9 (Darker Blue)
- **Checked Items:** #2D7D32 (Green)
- **Unchecked Items:** #666666 (Gray)
- **Accent:** #E67E22 (Orange)
- **Text:** #000000 (Black)
- **Alternating Row Background:** #F5F5F5 (Light Gray)

---

## Summary of User Requirements

✅ **Show all information currently filled:**
   - Patient info (all fields from patient add)
   - Baseline info (all fields from baseline form)
   - Follow-up info (all fields from each follow-up form)
   - Multiple dynamic visits (Visit 1, Visit 2, if created)

✅ **UI-like styling in PDF:**
   - If checkbox/radio selected → show filled (☑ in color)
   - If checkbox/radio unselected → show empty (☐ in gray)
   - If dropdown → show only selected value, not all options

✅ **Include all sections:**
   - Data Privacy & Confidentiality
   - Physician Declaration
   - Physician name, qualification, stamp field, signature field
   - Download date (just date, no label)

✅ **Branding:**
   - Show favicon in header circle (like app branding)
   - Professional medical form appearance
   - Similar to official case record form

---

## Next Steps

1. Enhance `generatePatientPDF()` to support multi-visit rendering
2. Add checkbox color logic
3. Implement comparison table across visits
4. Test with sample data containing multiple visits
5. Verify all user requirements are met in PDF output
6. Deploy changes
