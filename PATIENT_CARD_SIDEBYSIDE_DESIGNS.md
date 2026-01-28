# Side-by-Side Card + Details Panel Designs

Perfect for dashboard view! One side shows patient card, other side shows details.

---

## DESIGN S1: "Split Card + Details Panel" (BEST FOR DASHBOARD)
**Style:** Professional Hybrid + Two-Column  
**Best For:** Clean, Modern, Functional Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│ ┌─────────────────────────────────┐  ┌──────────────────────────┐  │
│ │ PATIENT CARD (35%)              │  │ PATIENT DETAILS (65%)    │  │
│ │                                 │  │                          │  │
│ │ ┌──────┐  PT0001                │  │ Basic Information        │  │
│ │ │      │  45 • Male • 5.2 Yrs   │  │ ─────────────────────    │  │
│ │ │ 👤   │                        │  │ Patient Code: PT0001     │  │
│ │ │ IMG  │  ✅ Status: Active     │  │ Age: 45 years            │  │
│ │ │      │  Enrolled: 01/28/2026  │  │ Gender: Male             │  │
│ │ └──────┘                        │  │ Duration: 5.2 years      │  │
│ │                                 │  │                          │  │
│ │ MEDICAL SUMMARY                 │  │ Medical History          │  │
│ │ Previous:                       │  │ ─────────────────────    │  │
│ │ ├─ Metformin                    │  │ Current Medications:     │  │
│ │ ├─ DPP4 Inhibitor               │  │ • Metformin 500mg BID    │  │
│ │ └─ Insulin                      │  │ • DPP4i 100mg OD         │  │
│ │                                 │  │ • Insulin 10U HS         │  │
│ │ Comorbid:                       │  │                          │  │
│ │ ├─ HTN                          │  │ Associated Conditions:   │  │
│ │ ├─ Obesity                      │  │ • Hypertension           │  │
│ │ └─ CKD Stage 2                  │  │ • Obesity (BMI 32)       │  │
│ │                                 │  │ • CKD Stage 2            │  │
│ │ PROGRESS                        │  │                          │  │
│ │ ✅ Baseline                     │  │ Assessment Timeline      │  │
│ │ ✅ Follow-up Visit 1            │  │ ─────────────────────    │  │
│ │ ⭕ Comparison                   │  │ ✅ Baseline: 01/28/26    │  │
│ │                                 │  │ ✅ Follow-up: 03/28/26   │  │
│ │ [View] [Edit] [+Add Visit]      │  │ ⭕ Overview: Pending     │  │
│ │                                 │  │                          │  │
│ └─────────────────────────────────┘  │ [View Full] [Export]     │  │
│                                      │                          │  │
│                                      └──────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Colors: 
- Card background: Light blue (#F0F9FF)
- Details background: Light gray (#F3F4F6)
- Status: Green ✅, Blue ⭕
- Accent: Teal/Medical Blue

Layout: 35% left card, 65% right details
Responsive: Stacks vertically on mobile (card top, details below)
```

**Implementation:**
```tsx
<div className="flex gap-6 p-6">
  {/* Left: Patient Card (35%) */}
  <div className="w-[35%] space-y-4">
    <Card className="p-4">
      <div className="flex gap-4">
        <Avatar src={patient.avatar} fallback={patient.name.slice(0,2)} />
        <div>
          <h3>{patient.code}</h3>
          <p>{patient.age} • {patient.gender} • {patient.duration} Yrs</p>
          <p className="text-green-600">✅ Active</p>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <h4 className="font-bold">Previous Therapy</h4>
        {/* medications list */}
      </div>
      
      <div className="mt-4 space-y-2">
        <h4 className="font-bold">Comorbidities</h4>
        {/* conditions */}
      </div>
      
      <div className="mt-4 space-y-2">
        <h4 className="font-bold">Progress</h4>
        {/* progress indicators */}
      </div>
      
      <div className="flex gap-2 mt-6">
        <Button>View</Button>
        <Button variant="outline">Edit</Button>
        <Button variant="ghost">+Visit</Button>
      </div>
    </Card>
  </div>
  
  {/* Right: Details Panel (65%) */}
  <div className="w-[65%] space-y-4">
    <Card className="p-6 bg-gray-50">
      <h4 className="font-bold mb-4">Basic Information</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Patient Code</p>
          <p className="font-semibold">{patient.code}</p>
        </div>
        {/* more fields */}
      </div>
      
      <Separator className="my-6" />
      
      <h4 className="font-bold mb-4">Medical History</h4>
      {/* detailed medications */}
      
      <Separator className="my-6" />
      
      <h4 className="font-bold mb-4">Assessment Timeline</h4>
      {/* timeline */}
      
      <div className="flex gap-2 mt-6">
        <Button>View Full</Button>
        <Button variant="outline">Export</Button>
      </div>
    </Card>
  </div>
</div>
```

---

## DESIGN S2: "Compact Card + Right Sidebar Info"
**Style:** Minimal Card + Quick Info Sidebar  
**Best For:** Dashboard List/Grid

```
COMPACT SINGLE ROW:
┌────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐  PT0001 | 45M | 5.2 Yrs                         │
│ │ ┌────┐       │  ✅ Active | Enrolled: 01/28/26                 │
│ │ │ 👤 │ ✅    │  Previous: Metformin, DPP4i, Insulin            │
│ │ │ IMG│ AC    │  Comorbid: HTN, Obesity, CKD                    │
│ │ └────┘       │  Progress: ✅ ✅ ⭕                               │
│ └──────────────┘  [View] [Edit] [+Visit]                          │
└────────────────────────────────────────────────────────────────────┘

EXPANDED VIEW (When clicking card):
┌────────────────────────────────┬─────────────────────────────┐
│ PATIENT CARD (30%)             │ DETAILS SIDEBAR (70%)       │
│                                │                             │
│ ┌────┐  PT0001                 │ Basic Info                  │
│ │ 👤 │  45M                     │ ───────────────             │
│ │ IMG│  5.2 Yrs Diabetes        │ Age: 45 | Gender: M        │
│ └────┘  ✅ Active              │ Duration: 5.2 years        │
│         01/28/2026             │ Status: ✅ Active          │
│                                │                             │
│ Medications                    │ Current Treatment          │
│ • Metformin                    │ ───────────────             │
│ • DPP4i                        │ • Metformin 500mg          │
│ • Insulin                      │ • DPP4i 100mg              │
│                                │ • Insulin 10U              │
│ Conditions                     │                             │
│ • HTN                          │ Comorbidities              │
│ • Obesity                      │ ───────────────             │
│ • CKD                          │ ✓ HTN                      │
│                                │ ✓ Obesity                  │
│ Progress                       │ ✓ CKD Stage 2              │
│ ✅ Base                        │                             │
│ ✅ F-Up                        │ Last Assessment             │
│ ⭕ Comp                        │ ───────────────             │
│                                │ 01/28/2026 (Baseline)      │
│ [✎ Edit] [+ Add Visit]         │ 03/28/2026 (Follow-up)     │
│                                │ Pending (Overview)         │
│ [→ Full View]                  │ [Print] [Share] [Export]   │
│                                │                             │
└────────────────────────────────┴─────────────────────────────┘

Colors: Teal accents, Light backgrounds
Layout: Flexible, 30/70 expanded
Responsive: Great for mobile
```

---

## DESIGN S3: "Medical Card + Tabbed Information"
**Style:** Professional Clinical + Tabbed Details  
**Best For:** Multiple Data Views (Overview, Medical, History)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│ ┌─────────────────────────────┐  ┌──────────────────────────┐  │
│ │ PATIENT OVERVIEW            │  │ OVERVIEW │ MEDICAL │ HIS │  │
│ │                             │  │ ──────────────────────── │  │
│ │ ┌─────────┐  PT0001         │  │                          │  │
│ │ │         │  45M             │  │ OVERVIEW TAB             │  │
│ │ │ 👤      │  5.2 Yrs         │  │                          │  │
│ │ │ AVATAR  │  ✅ Active       │  │ Patient ID: PT0001       │  │
│ │ │         │  01/28/2026      │  │ Age: 45 years            │  │
│ │ └─────────┘                 │  │ Gender: Male             │  │
│ │                             │  │ Duration: 5.2 years      │  │
│ │ CURRENT THERAPIES           │  │                          │  │
│ │ [Metformin 500mg]           │  │ ENROLLMENT STATUS        │  │
│ │ [DPP4 Inhibitor 100mg]      │  │ Status: ✅ Active        │  │
│ │ [Insulin 10 Units HS]       │  │ Enrolled: 01/28/2026     │  │
│ │                             │  │                          │  │
│ │ CONDITIONS                  │  │ COMPLETION STATUS        │  │
│ │ [HTN] [Obesity] [CKD]       │  │ ✅ Baseline Assessment   │  │
│ │                             │  │ ✅ Follow-up Visit 1     │  │
│ │ ASSESSMENT STATUS           │  │ ⭕ Comparison Analysis   │  │
│ │ ✅ Baseline (01/28)         │  │                          │  │
│ │ ✅ Follow-up (03/28)        │  │ NEXT ACTION              │  │
│ │ ⭕ Overview (Pending)       │  │ Schedule Comparison      │  │
│ │                             │  │                          │  │
│ │ [View] [Edit] [+Visit]      │  │ [Start Now] [Schedule]   │  │
│ │                             │  │                          │  │
│ └─────────────────────────────┘  └──────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Clicking MEDICAL tab:
┌──────────────────────────────────────────────────────────────────┐
│ [OVERVIEW] │ MEDICAL │ HISTORY │ MEDICAL TAB CONTENTS:          │
│                                                                  │
│ Current Medications                                              │
│ ─────────────────────────────────────────────────────────────   │
│ 1. Metformin 500mg | BID (Morning & Evening) | 2 months         │
│ 2. Sitagliptin (DPP4i) 100mg | OD (Morning) | 2 months          │
│ 3. Insulin Glargine 10 Units | HS (Bedtime) | 6 months          │
│                                                                  │
│ Associated Conditions                                            │
│ ─────────────────────────────────────────────────────────────   │
│ ✓ Hypertension (Controlled on current meds)                     │
│ ✓ Obesity (BMI: 32, Class I Obesity)                            │
│ ✓ Chronic Kidney Disease (Stage 2)                              │
│                                                                  │
│ Allergies & Contraindications                                   │
│ ─────────────────────────────────────────────────────────────   │
│ Penicillin (Rash)                                                │
│ Lisinopril (Dry Cough)                                           │
│                                                                  │
│ [Print] [Export] [Share with Doctor]                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Colors: Color-coded badges, Tab navigation
Layout: 35% card, 65% tabbed panel
Benefit: Card + Multiple views without page change
```

---

## DESIGN S4: "ID Card + Timeline Sidebar"
**Style:** Formal ID Card + Assessment Timeline  
**Best For:** Medical Records & Clinical Audits

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│ ┌──────────────────────────────┐  ┌─────────────────────────┐  │
│ │ PATIENT ID CARD              │  │ ASSESSMENT TIMELINE     │  │
│ │                              │  │                         │  │
│ │ ╔══════════════════════════╗ │  │ 📅 01/28/2026 ✅ ACTIVE│  │
│ │ ║ KOLLECTCARE RWE STUDY    ║ │  │    └─ BASELINE          │  │
│ │ ║                          ║ │  │    └─ HbA1c: 8.2%       │  │
│ │ ║ ┌──────┐  PT0001         ║ │  │    └─ Weight: 85kg      │  │
│ │ ║ │      │  45 | Male      ║ │  │    └─ BP: 140/90        │  │
│ │ ║ │ 👤   │  5.2 Yrs DM     ║ │  │                         │  │
│ │ ║ │ IMG  │  ✅ ACTIVE      ║ │  │ 📅 03/28/2026 ✅ DONE   │  │
│ │ ║ │      │  ENR: 01/28     ║ │  │    └─ FOLLOW-UP 1       │  │
│ │ ║ └──────┘                 ║ │  │    └─ HbA1c: 7.8%       │  │
│ │ ║                          ║ │  │    └─ Weight: 82kg      │  │
│ │ ╚══════════════════════════╝ │  │    └─ BP: 135/85        │  │
│ │                              │  │                         │  │
│ │ THERAPY                       │  │ 📅 05/28/2026 ⭕ PEND   │  │
│ │ Metformin, DPP4i, Insulin    │  │    └─ FOLLOW-UP 2       │  │
│ │                              │  │    └─ Scheduled         │  │
│ │ CONDITIONS                    │  │                         │  │
│ │ HTN • Obesity • CKD           │  │ 📅 06/28/2026 ⭕ PEND   │  │
│ │                              │  │    └─ COMPARISON        │  │
│ │ COMPLETION: 2/4 (50%)        │  │    └─ Scheduled         │  │
│ │ ████████░░░░░░░░░░           │  │                         │  │
│ │                              │  │ Progress: 50%           │  │
│ │ [View] [Edit] [Report]       │  │ ████████░░░░░░░░░░░░   │  │
│ │                              │  │                         │  │
│ └──────────────────────────────┘  │ [View All] [Compare]    │  │
│                                    │                         │  │
│                                    └─────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Colors: Professional medical blue/gold, Timeline style with dates
Layout: 40% left card, 60% right timeline
Benefit: Formal ID card + chronological assessment history
```

---

## DESIGN S5: "Expandable Row Card"
**Style:** Row-based expanding card + details  
**Best For:** Table/List view on Dashboard

```
COLLAPSED STATE (Row in table):
┌────────────────────────────────────────────────────────────────────┐
│ ⟨▷⟩ │ 👤 PT0001 │ 45M, 5.2Yrs │ Active │ ✅✅⭕ │ [Actions ▼] │
└────────────────────────────────────────────────────────────────────┘

EXPANDED STATE (Click to expand):
┌────────────────────────────────────────────────────────────────────┐
│ ⟨▼⟩ │ 👤 PT0001 │ 45M, 5.2Yrs │ Active │ ✅✅⭕ │ [Actions ▼] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌──────────────────────────┐  ┌──────────────────────────┐       │
│ │ QUICK VIEW CARD          │  │ ACTIONS & DETAILS        │       │
│ │                          │  │                          │       │
│ │ ┌─────┐  PT0001          │  │ Medical Summary          │       │
│ │ │ 👤  │  45M              │  │ ─────────────────────    │       │
│ │ │ IMG │  5.2 Yrs          │  │ Previous: Metformin,    │       │
│ │ │     │  ✅ Active        │  │           DPP4i,        │       │
│ │ │     │  01/28/2026       │  │           Insulin       │       │
│ │ └─────┘                  │  │                          │       │
│ │                          │  │ Comorbidities:           │       │
│ │ Progress                 │  │ • HTN                    │       │
│ │ ✅ Baseline              │  │ • Obesity                │       │
│ │ ✅ Follow-up 1           │  │ • CKD                    │       │
│ │ ⭕ Comparison            │  │                          │       │
│ │                          │  │ Next Action:             │       │
│ │ [Edit] [View] [+Visit]   │  │ Complete Comparison      │       │
│ │ [Full Details] [Export]  │  │                          │       │
│ │                          │  │ [Start] [Schedule]       │       │
│ │                          │  │ [Print] [Share]          │       │
│ │                          │  │                          │       │
│ └──────────────────────────┘  └──────────────────────────┘       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Colors: Zebra striping for rows, Light blue expansion
Layout: Flexible, expands inline
Responsive: Perfect for mobile list
```

---

## COMPARISON TABLE: Side-by-Side Options

| Design | Layout | Best For | Scanning | Details | Mobile |
|--------|--------|----------|----------|---------|--------|
| **S1** | 35/65 split | Clean modern dashboard | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Excellent |
| **S2** | 30/70 sidebar | Quick scan + expand | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Great |
| **S3** | 35/65 tabbed | Multi-view dashboard | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Good |
| **S4** | 40/60 timeline | Medical records | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Decent |
| **S5** | Row expand | Table/list view | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Excellent |

---

## RECOMMENDATION: Design S1 "Split Card + Details"

**Why S1 is PERFECT for your dashboard:**

✅ Clean professional layout (card on left, details on right)
✅ Perfect ratio: 35% card / 65% details (all info visible, no scroll)
✅ Shows all critical patient info at once
✅ Avatar + status + medications + conditions + progress in one view
✅ Responsive: Stacks on mobile (card top, details below)
✅ Modern, contemporary design
✅ Easy to scan + easy to read details
✅ Perfect for clinicians reviewing multiple patients

**Alternative:** S5 is best if you want a table/list view that expands inline.

---

## WHICH DESIGN DO YOU WANT?

**Side-by-Side Options:**
- **S1** - Split Card + Details (RECOMMENDED ⭐)
- **S2** - Compact + Sidebar
- **S3** - Medical + Tabbed
- **S4** - ID Card + Timeline
- **S5** - Expandable Row Card

**Once you choose, I'll implement with:**
✅ Avatar support (with initials fallback)
✅ Color-coded status indicators
✅ Responsive design (desktop + mobile)
✅ Smooth transitions and hover effects
✅ Professional spacing and typography
✅ Full dashboard integration
