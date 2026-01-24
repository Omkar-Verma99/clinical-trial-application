# Quick Reference Guide - CRF Implementation

## 🎯 Quick Start for Developers

### Using the Follow-up Form
```tsx
import { FollowUpForm } from '@/components/followup-form-new'

<FollowUpForm 
  patientId={patientId}
  existingData={followUpData}
  baselineData={baselineData}
  onSuccess={() => {/* refresh data */}}
/>
```

### Using the Outcomes Calculator
```tsx
import { calculateAllOutcomes } from '@/lib/outcomes-calculator'

const outcomes = calculateAllOutcomes(
  {
    hba1c: 8.2,
    weight: 82.5,
    egfr: 72,
    bpSystolic: 138,
    bpDiastolic: 88,
  },
  {
    hba1c: 6.8,
    weight: 78.2,
    egfr: 68,
    bpSystolic: 128,
    bpDiastolic: 82,
  }
)

console.log(outcomes.glycemicResponse.category) // "Responder"
console.log(outcomes.weightOutcome.category) // "Loss ≥3 kg"
console.log(outcomes.bloodPressureOutcome.overallControlled) // true
```

### Using Outcome Summaries
```tsx
import { generateOutcomesSummary } from '@/lib/outcomes-calculator'

const summaries = generateOutcomesSummary(outcomes)
// Returns: [
//   "Glycemic control: Responder (HbA1c change: -1.4%)",
//   "Weight change: Loss ≥3 kg (-4.3 kg)",
//   "Blood pressure: Controlled (<140/90)"
// ]
```

---

## 📋 Form Field Mapping

### SECTION H - Clinical Parameters
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| visitDate | date | Yes | Week 12 ± 2 weeks |
| hba1c | number | Yes | % |
| fpg | number | Yes | mg/dL |
| ppg | number | No | mg/dL |
| weight | number | Yes | kg |
| bloodPressureSystolic | number | Yes | mmHg |
| bloodPressureDiastolic | number | Yes | mmHg |
| serumCreatinine | number | No | mg/dL |
| egfr | number | No | mL/min/1.73m² |
| urinalysis | enum | Yes | "Normal" \| "Abnormal" |

### SECTION K - Adherence
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| patientContinuingTreatment | boolean | true | Main status |
| discontinuationReason | string | null | Only if discontinuing |
| missedDosesInLast7Days | enum | "0" | "0" \| "1–2" \| "3–5" \| ">5" |
| addOnOrChangedTherapy | boolean | false | Therapy change flag |
| addOnOrChangedTherapyDetails | string | null | Only if changed |

### SECTION L - Safety Events
All boolean fields (checked = event occurred):
- hypoglycemiaMild
- hypoglycemiaModerate
- hypoglycemiaSevere
- uti
- genitalMycoticInfection
- dizzinessDehydrationSymptoms
- hospitalizationOrErVisit + hospitalizationReason

### SECTION M - Physician Assessment
| Field | Type | Values |
|-------|------|--------|
| overallEfficacy | enum | "Excellent" \| "Good" \| "Moderate" \| "Poor" |
| overallTolerability | enum | "Excellent" \| "Good" \| "Fair" \| "Poor" |
| complianceJudgment | enum | "Excellent" \| "Good" \| "Fair" \| "Poor" |
| preferKcMeSempaForLongTerm | boolean | true/false |
| preferredPatientProfiles | object | 5 boolean fields |

---

## 🔢 Calculation Thresholds (CRF-Compliant)

### Glycemic Response (HbA1c reduction)
- **Super-responder**: ≥1.5% reduction
- **Responder**: 1.0-1.49% reduction
- **Partial responder**: 0.5-0.99% reduction
- **Non-responder**: <0.5% reduction

### Weight Change
- **Gain**: ≥3 kg increase
- **Neutral**: -3 to +3 kg change
- **Loss 1-2.9 kg**: 1-2.9 kg reduction
- **Loss ≥3 kg**: ≥3 kg reduction

### Renal Function Decline
- **Improved**: eGFR increase
- **Stable**: No significant change
- **Decline <10%**: 1-9.9% decline
- **Decline ≥10%**: ≥10% decline

### Blood Pressure Control
- **Controlled**: <140/90 mmHg
- **Systolic Categories**: <120 (Optimal), 120-129 (Normal), 130-139 (Elevated), ≥140 (High)
- **Diastolic Categories**: <80 (Optimal), 80-89 (Normal), ≥90 (High)

---

## 🎨 Color Coding in UI

```css
/* Green - Good Outcomes */
.bg-green-50      /* Background */
.text-green-700   /* Text */
.border-green-200 /* Border */

/* Orange/Yellow - Intermediate */
.bg-orange-50
.text-orange-700
.border-orange-200

/* Red - Concerning */
.bg-red-100
.text-red-900
.border-red-300

/* Blue - Physician Assessment */
.bg-blue-50
.text-blue-900

/* Purple - Patient Outcomes */
.bg-purple-50
```

---

## 📊 Firestore Document Structure

### baselineData Document
```json
{
  "patientId": "abc123",
  "hba1c": 8.2,
  "fpg": 142,
  "ppg": 185,
  "weight": 82.5,
  "bloodPressureSystolic": 138,
  "bloodPressureDiastolic": 88,
  "heartRate": 72,
  "serumCreatinine": 1.1,
  "egfr": 72,
  "urinalysis": "Normal",
  "dosePrescribed": "KC MeSempa 5mg",
  "treatmentInitiationDate": "2024-01-15",
  "counseling": {
    "dietAndLifestyle": true,
    "hypoglycemiaAwareness": true,
    "utiGenitialInfectionAwareness": true,
    "hydrationAdvice": true
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### followUpData Document
```json
{
  "patientId": "abc123",
  "visitDate": "2024-04-15",
  
  "hba1c": 6.8,
  "fpg": 118,
  "ppg": 152,
  "weight": 78.2,
  "bloodPressureSystolic": 128,
  "bloodPressureDiastolic": 82,
  "serumCreatinine": 1.05,
  "egfr": 68,
  "urinalysis": "Normal",
  
  "glycemicResponse": {
    "category": "Responder",
    "hba1cChange": -1.4,
    "hba1cPercentageChange": -17.1
  },
  
  "outcomes": {
    "weightChange": "Loss ≥3 kg",
    "bpControlAchieved": true,
    "renalOutcome": "Decline <10%"
  },
  
  "adherence": {
    "patientContinuingTreatment": true,
    "discontinuationReason": null,
    "missedDosesInLast7Days": "0",
    "addOnOrChangedTherapy": false,
    "addOnOrChangedTherapyDetails": null
  },
  
  "eventsOfSpecialInterest": {
    "hypoglycemiaMild": false,
    "hypoglycemiaModerate": false,
    "hypoglycemiaSevere": false,
    "uti": false,
    "genitalMycoticInfection": false,
    "dizzinessDehydrationSymptoms": false,
    "hospitalizationOrErVisit": false,
    "hospitalizationReason": ""
  },
  
  "physicianAssessment": {
    "overallEfficacy": "Excellent",
    "overallTolerability": "Excellent",
    "complianceJudgment": "Excellent",
    "preferKcMeSempaForLongTerm": true,
    "preferredPatientProfiles": {
      "uncontrolledT2dm": true,
      "obeseT2dm": true,
      "ckdPatients": false,
      "htnPlusT2dm": true,
      "elderlyPatients": false
    }
  },
  
  "patientReportedOutcomes": {
    "overallSatisfaction": "Very satisfied",
    "giToleranceVsPriorTherapy": "Improved",
    "confidenceInManagingDiabetes": "Improved",
    "additionalComments": "Feeling much better overall"
  },
  
  "createdAt": "2024-04-15T00:00:00Z",
  "updatedAt": "2024-04-15T00:00:00Z"
}
```

---

## 🔗 Component Dependencies

```
FollowUpForm (new)
├── Uses: Firebase (addDoc, updateDoc)
├── Uses: useToast hook
├── Uses: Shadcn UI components (Button, Input, Label, Card, Checkbox, Textarea, Select)
├── Uses: Lucide icons (not currently, but ready)
└── Outputs: Complete followUpData document

ComparisonView (enhanced)
├── Uses: calculateAllOutcomes function
├── Uses: generateOutcomesSummary (optional)
├── Uses: Shadcn UI components (Card, CardHeader, CardTitle, etc.)
├── Uses: Lucide icons (ArrowDown, ArrowUp, CheckCircle, AlertCircle)
├── Inputs: baseline, followUp, patient data
└── Displays: CRF SECTIONS I-N outcomes

Outcomes Calculator (new)
├── No dependencies (pure functions)
├── Inputs: baseline and follow-up clinical values
├── Outputs: Structured outcome objects
└── Used by: FollowUpForm, ComparisonView, Future export functions
```

---

## ✅ Validation Rules

### Required Fields
- hba1c, fpg, weight, bp systolic/diastolic, urinalysis (SECTION H)
- overallEfficacy, overallTolerability, complianceJudgment (SECTION M)
- overallSatisfaction (SECTION N)

### Conditional Required
- discontinuationReason (if patientContinuingTreatment = false)
- hospitalizationReason (if hospitalizationOrErVisit = true)
- addOnOrChangedTherapyDetails (if addOnOrChangedTherapy = true)

### Data Type Validation
- All numeric fields use HTML5 number inputs
- All dates use HTML5 date inputs
- All enums use select dropdowns
- All boolean fields use checkboxes

### Business Logic Validation
- visitDate must be within Week 12 ± 2 weeks of baseline
- serumCreatinine and egfr should be consistent (eGFR = 186 × (Cr/0.88)^-1.154 × age^-0.203)
- Weight change should be plausible (not ±50% change in 12 weeks)

---

## 🐛 Debugging Tips

### To Check Calculated Outcomes
```tsx
// In browser console, after follow-up form submission:
console.log('Glycemic Response:', outcomes.glycemicResponse)
console.log('Weight Outcome:', outcomes.weightOutcome)
console.log('Renal Outcome:', outcomes.renalOutcome)
```

### To Trace Form State
```tsx
// Add in FollowUpForm component:
console.log('formData:', formData)
console.log('adherence:', adherence)
console.log('eventsOfInterest:', eventsOfInterest)
```

### To Verify Firestore Data
```javascript
// In Firebase console:
db.collection('followUpData').doc(followUpId).get().then(doc => {
  console.log('Follow-up Data:', doc.data())
  console.log('Glycemic Response:', doc.data().glycemicResponse)
})
```

---

## 📱 Mobile Responsiveness

- `md:grid-cols-` used for responsive grids (3 cols on desktop, 1-2 on mobile)
- All inputs full-width on mobile, proper spacing on larger screens
- Form sections use border-t for visual separation
- Cards use consistent padding (pt-6, pt-4)
- Select dropdowns properly sized for touch

---

## 🎓 Common Use Cases

### Display Baseline vs Follow-up Comparison
```tsx
import ComparisonView from '@/components/comparison-view'

<ComparisonView 
  baseline={baselineData}
  followUp={followUpData}
  patient={patientData}
/>
```

### Generate Report Summary
```tsx
import { generateOutcomesSummary } from '@/lib/outcomes-calculator'

const summaries = generateOutcomesSummary(outcomes)
const reportText = summaries.join('\n')
// Export to PDF or email
```

### Check if Patient is Super-Responder
```tsx
if (outcomes.glycemicResponse.category === "Super-responder") {
  // Mark for case study
  // Send success notification
  // Include in publication
}
```

### Export Outcomes to Excel
```tsx
const exportData = {
  patientId: followUp.patientId,
  baselineHbA1c: baseline.hba1c,
  followUpHbA1c: followUp.hba1c,
  glyce micResponse: outcomes.glycemicResponse.category,
  weightChange: outcomes.weightOutcome.category,
  treatmentContinuing: adherence.patientContinuingTreatment,
  // ... more fields
}
```

---

## 🔐 Security Considerations

- All form inputs sanitized by React
- Firestore rules should validate document structure
- Never expose patient IDs in URLs (use encrypted IDs if needed)
- Ensure doctor can only see their own patients
- Audit trail for all data modifications

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Form not submitting | Check required fields highlighted in red |
| Calculations showing NaN | Ensure baseline.hba1c and followUp.hba1c are numbers |
| ComparisonView blank | Check if followUpData exists in Firestore |
| Styling looks off | Clear browser cache, reload, check Tailwind CSS build |
| Z-index issues with modals | Check Radix UI zIndex settings |

---

## 📚 File Locations

```
clinical-trial-application/
├── components/
│   ├── followup-form-new.tsx         (NEW - Week 12 form)
│   ├── followup-form.tsx             (Legacy - still functional)
│   ├── baseline-form.tsx             (Enhanced - Sections F-G)
│   ├── comparison-view.tsx           (Enhanced - Display outcomes)
│   └── ui/                           (Shadcn components)
│
├── lib/
│   ├── outcomes-calculator.ts        (NEW - Calculation functions)
│   ├── types.ts                      (Enhanced - CRF schema)
│   ├── firebase.ts                   (DB config)
│   └── utils.ts                      (Helpers)
│
├── app/
│   ├── patients/
│   │   ├── add/page.tsx             (Enhanced - 5 CRF sections)
│   │   └── [id]/page.tsx            (Uses FollowUpForm)
│   └── signup/page.tsx              (Enhanced - qualification field)
│
└── Documentation/
    ├── CRF_FOLLOWUP_IMPLEMENTATION.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── CRF_GAP_ANALYSIS.md
    └── PROJECT_ANALYSIS.md
```

---

**This is a living document - update as new features are added**

---

*Last Updated: Implementation Phase 3*
*Version: 1.0*
*Status: Ready for Use*
