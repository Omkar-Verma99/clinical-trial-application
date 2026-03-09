# ADVERSE EVENTS (AE) FORM REDESIGN - PLANNING DOCUMENT

---

## 1. UNDERSTANDING YOUR REQUIREMENTS

### Current User Flow (What Exists Now)
**Safety & Adverse Events Section** (Follow-up Form, Section L)
```
Q: "Any adverse event during study period?"
├─ Radio: Yes / No
└─ IF YES:
    ├─ Free-text Textarea: "Adverse Event Details (MedDRA preferred term)"
    │  (Placeholder: "AE Term, Onset Date, Severity, Serious (Yes/No), Action Taken, Outcome")
    ├─ Action Taken: Multiple Checkboxes [None] [Adjusted dose] [Drug stopped] [Referred]
    └─ Outcome: Multiple Checkboxes [Resolved] [Ongoing] [Unknown]
```

### NEW DESIRED STRUCTURE (What You Want)
When **"Yes"** is selected for adverse event, show:

**Fields for EACH Adverse Event:**
1. **AE Term** (MedDRA) → Free text box (required if any AE exists)
2. **Onset Date** → Date picker (start date of AE)
3. **Stop Date** → Date picker (end date of AE)
4. **Severity** → **Radio buttons** (Mild | Moderate | Severe) [SINGLE SELECT, not multiple]
5. **Serious** → **Radio buttons** (Yes | No) [SINGLE SELECT, not multiple]
6. **Action Taken** → **Radio buttons** (None | Dose adjusted | Drug stopped | Referred | Other)
   - **IF "Other" selected** → Free text box appears to specify action
7. **Outcome** → **Radio buttons** (Resolved | Ongoing) [SINGLE SELECT, not multiple]

**Multiple Events Support:**
- **ADD Button** → Allows user to add another adverse event row
- Each event appears as a separate row/card
- User can add 2, 3, 4+ adverse events as needed

**PDF/Export Format:**
- Display as a **table** with columns:
  - AE Term | Onset Date | Stop Date | Severity | Serious | Action Taken | Outcome
  - Each row = one adverse event
  - Same layout as the image you provided (MedDRA table format)

---

## 2. CURRENT IMPLEMENTATION ANALYSIS

### What Exists Now

#### Frontend (Components)
**File**: `components/followup-form.tsx` (Lines 953-1047)

Current structure:
```typescript
// Form state:
const [formData, setFormData] = useState({
  adverseEventsPresent: false,           // Radio: Yes/No
  adverseEventsText: "",                 // Free-text textarea (all AE details combined)
  // ... other fields
});

const [actionTaken, setActionTaken] = useState({
  None: false,
  AdjustedDose: false,
  StoppedMedication: false,
  Referred: false,
});

const [outcome, setOutcome] = useState({
  Resolved: false,
  Ongoing: false,
  Unknown: false,
});
```

Issues with current approach:
- ❌ All AE details crammed into ONE textarea (free-text, unstructured)
- ❌ Cannot handle multiple adverse events naturally
- ❌ Action Taken = multiple checkboxes (but should be single radio + optional "Other" field)
- ❌ Outcome = multiple checkboxes (but should be single radio)
- ❌ Severity not captured (user has to type it in textarea)
- ❌ Dates not captured separately (no Onset/Stop date fields)
- ❌ PDF cannot render as structured table (only shows textarea text)

#### Database (Firestore)
**File**: `lib/types.ts` (FollowUpData interface, Line 171-179)

Current storage:
```typescript
adverseEventsPresent?: boolean;              // Only tracks if AE exists

// Already in types but not used yet:
adverseEventsStructured?: Array<{
  aeTerm: string
  onsetDate: string
  severity: "Mild" | "Moderate" | "Severe"
  isSerious: boolean
  actionTaken: "None" | "Dose adjusted" | "Drug stopped" | "Referred"
  outcome: "Resolved" | "Ongoing"
}>

// Legacy (still in use, but will be deprecated):
adverseEventsText?: string                  // Unstructured textarea content
actionTaken?: string[]                      // Array of selected actions
outcome?: string[]                          // Array of selected outcomes
```

Good news: **The database type already has `adverseEventsStructured` array defined!**
⚠️ But it's NOT being used to save/load data yet.

---

## 3. PROPOSED NEW STRUCTURE

### Frontend Form State Changes

#### New Type Definition (in `types.ts`)
```typescript
export interface AdverseEvent {
  id: string                                          // Unique ID for each AE row (uuid or timestamp)
  aeTerm: string                                      // MedDRA term
  onsetDate: string                                   // YYYY-MM-DD format
  stopDate: string                                    // YYYY-MM-DD format
  severity: "Mild" | "Moderate" | "Severe"          // Single select (radio)
  isSerious: "Yes" | "No"                             // Single select (radio, changed from boolean)
  actionTaken: "None" | "Dose adjusted" | "Drug stopped" | "Referred" | "Other"  // Single select (radio)
  actionTakenOther?: string                           // Free text if action = "Other"
  outcome: "Resolved" | "Ongoing"                     // Single select (radio)
}

// Update FollowUpData interface:
export interface FollowUpData {
  // ... existing fields ...
  
  // SECTION L - Safety & Adverse Events (UPDATED)
  adverseEventsPresent?: boolean                      // "Yes/No" radio
  adverseEvents?: AdverseEvent[]                      // Array of structured events
  
  // Events of Special Interest (UNCHANGED):
  eventsOfSpecialInterest?: {
    hypoglycemiaMild: boolean
    // ... rest unchanged
  }
}
```

#### Form Component State (in `followup-form.tsx`)
```typescript
// Replace old adverseEventsPresent + adverseEventsText + actionTaken + outcome with:

  const [adverseEventsPresent, setAdverseEventsPresent] = useState(false);  // Radio: Yes/No
  
  const [adverseEvents, setAdverseEvents] = useState<AdverseEvent[]>([]);    // Array of AE records
  
  // Example state after user adds 2 events:
  // adverseEvents = [
  //   {
  //     id: "ae-1",
  //     aeTerm: "Nausea",
  //     onsetDate: "2024-01-15",
  //     stopDate: "2024-01-20",
  //     severity: "Mild",
  //     isSerious: "No",
  //     actionTaken: "None",
  //     outcome: "Resolved"
  //   },
  //   {
  //     id: "ae-2",
  //     aeTerm: "Headache",
  //     onsetDate: "2024-01-18",
  //     stopDate: "2024-02-02",
  //     severity: "Moderate",
  //     isSerious: "No",
  //     actionTaken: "Dose adjusted",
  //     outcome: "Resolved"
  //   }
  // ]
```

---

## 4. FORM UI STRUCTURE

### New Section Layout (When "Yes" Selected)

```
┌─────────────────────────────────────────────────────────┐
│ Safety & Adverse Events                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Q: "Any adverse event during study period?"            │
│    ◉ Yes   ○ No                                         │
│                                                         │
│ IF YES:                                                 │
│ ┌──────────────────────────────────────────────────┐   │
│ │ ADVERSE EVENT #1                    [Delete ✕]  │   │
│ ├──────────────────────────────────────────────────┤   │
│ │ AE Term (MedDRA) *                               │   │
│ │ [Input: ___________________________]              │   │
│ │                                                  │   │
│ │ Onset Date *    │   Stop Date                    │   │
│ │ [Date Picker]   │   [Date Picker]                │   │
│ │                                                  │   │
│ │ Severity *                                       │   │
│ │ ◉ Mild  ○ Moderate  ○ Severe                    │   │
│ │                                                  │   │
│ │ Serious *                                        │   │
│ │ ◉ Yes  ○ No                                      │   │
│ │                                                  │   │
│ │ Action Taken *                                   │   │
│ │ ◉ None  ○ Dose adjusted  ○ Drug stopped        │   │
│ │ ○ Referred  ○ Other                              │   │
│ │                                                  │   │
│ │ Outcome *                                        │   │
│ │ ◉ Resolved  ○ Ongoing                           │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Add Another Adverse Event]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Interaction Rules

1. **Add Button Functionality:**
   - When clicked, appends new empty `AdverseEvent` object to `adverseEvents[]`
   - New row appears below existing events
   - User can fill in the details
   - Button text: "+ Add Another Adverse Event"

2. **Delete Button:**
   - Each AE card has a red "✕" button in top-right
   - Removes that specific AE from the array
   - If user deletes all events but keeps "Yes" selected → `adverseEvents: []` (array is empty)

3. **Action Taken "Other" Logic:**
   - If user selects "Other" radio → free text box appears below
   - User types specific action taken
   - Stored in `actionTakenOther` field
   - Only required when "Other" is selected

4. **Validation:**
   - If `adverseEventsPresent = true`, at least ONE complete AE must be filled
   - All fields marked with `*` are required within each AE card
   - Form cannot be submitted if `adverseEventsPresent = true` but `adverseEvents[]` is empty

---

## 5. BACKEND CHANGES NEEDED

### Database Storage Changes

#### Current Firestore Document Structure
```typescript
{
  patientId: "pt-123",
  visitDate: "2024-01-20",
  adverseEventsPresent: true,
  adverseEventsText: "Nausea, started 1/15, resolved 1/20. Mild. Not serious. No action taken.",
  actionTaken: ["None"],
  outcome: ["Resolved"],
  // ... other follow-up fields
}
```

#### New Firestore Document Structure
```typescript
{
  patientId: "pt-123",
  visitDate: "2024-01-20",
  adverseEventsPresent: true,
  adverseEvents: [
    {
      id: "ae-1",
      aeTerm: "Nausea",
      onsetDate: "2024-01-15",
      stopDate: "2024-01-20",
      severity: "Mild",
      isSerious: "No",
      actionTaken: "None",
      actionTakenOther: null,
      outcome: "Resolved"
    },
    {
      id: "ae-2",
      aeTerm: "Headache",
      onsetDate: "2024-01-18",
      stopDate: "2024-02-02",
      severity: "Moderate",
      isSerious: "No",
      actionTaken: "Other",
      actionTakenOther: "Reduced dose temporarily",
      outcome: "Resolved"
    }
  ],
  // ... other follow-up fields
}
```

### Migration Strategy
- **Old fields** (`adverseEventsText`, `actionTaken[]`, `outcome[]`) will be **deprecated** but kept for backward compatibility
- **New field** `adverseEvents[]` becomes the primary storage
- When loading a form, check if `adverseEvents` exists; if not, show empty state
- When saving, write to `adverseEvents` array (ignore old fields)

### Firestore Rules (No Changes Needed)
- Existing security rules for follow-up data already apply to nested arrays
- No new collection or subcollection needed
- Just a field within existing `FollowUpData` document

---

## 6. DATA FLOW (Read & Write)

### WRITE FLOW (Saving Form)

```typescript
// When user clicks "Save Assessment" button:

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  
  // ... existing validation ...
  
  // Build the adverseEvents array for Firestore
  const adverseEventsToSave = adverseEventsPresent ? adverseEvents : [];
  
  // Prepare Firestore payload
  const followUpPayload = {
    patientId: patient.id,
    visitDate: formData.visitDate,
    
    // Safety section
    adverseEventsPresent: adverseEventsPresent,
    adverseEvents: adverseEventsToSave,      // NEW: structured array
    
    // Events of Special Interest (unchanged)
    eventsOfSpecialInterest: {
      hypoglycemiaMild: formData.hypoglycemiaMild,
      // ... rest unchanged
    },
    
    // ... other sections (outcomes, adherence, etc.)
  };
  
  // Save to Firestore
  await updateDoc(docRef, followUpPayload);
};
```

**Firestore Save Structure:**
```
Patients (collection)
  └─ pt-123 (document)
       └─ followUps (subcollection)
            └─ followUp-week12 (document)
                 ├─ adverseEventsPresent: true
                 └─ adverseEvents: [
                      {
                        id: "ae-1",
                        aeTerm: "Nausea",
                        onsetDate: "2024-01-15",
                        stopDate: "2024-01-20",
                        severity: "Mild",
                        isSerious: "No",
                        actionTaken: "None",
                        actionTakenOther: null,
                        outcome: "Resolved"
                      },
                      { ... }
                    ]
```

### READ FLOW (Loading Form)

```typescript
// When form mounts or patient data loads:

useEffect(() => {
  if (patient?.followUps && patient.followUps.length > 0) {
    const existingFollowUp = patient.followUps[0];
    
    // Load adverse events
    setAdverseEventsPresent(existingFollowUp.adverseEventsPresent ?? false);
    
    if (existingFollowUp.adverseEvents && Array.isArray(existingFollowUp.adverseEvents)) {
      setAdverseEvents(existingFollowUp.adverseEvents);  // Load all AE records
    } else {
      setAdverseEvents([]);                             // Empty if none exist
    }
    
    // ... load other form fields ...
  }
}, [patient]);
```

**Firestore Read Flow:**
```
1. Get patient document by ID
2. Query followUps subcollection for Week 12 visit
3. Extract adverseEvents array
4. Map each array element to form state
5. UI renders adverseEvents.map(...) to show all events
```

---

## 7. PDF EXPORT CHANGES

### Current PDF Implementation
**File**: `lib/pdf-export.tsx`

Currently doesn't show adverse events as structured table.

### New PDF Table Format

**Each cell in the table should show ALL options with the selected one marked**, similar to how other radio button selections are displayed in the PDF:

```
SAFETY & ADVERSE EVENTS

┌──────────────┬─────────────┬──────────────┬────────────────────────────┬──────────────────┬──────────────────────────────────┬──────────────────┐
│ AE Term      │ Onset Date  │ Stop Date    │ Severity                   │ Serious          │ Action Taken                     │ Outcome          │
├──────────────┼─────────────┼──────────────┼────────────────────────────┼──────────────────┼──────────────────────────────────┼──────────────────┤
│ Nausea       │ 2024-01-15  │ 2024-01-20   │ ☐ Mild                     │ ☑ Yes            │ ☐ None                           │ ☑ Resolved       │
│              │             │              │ ☑ Moderate                 │ ☐ No             │ ☐ Dose adjusted                  │ ☐ Ongoing        │
│              │             │              │ ☐ Severe                   │                  │ ☐ Drug stopped                   │                  │
│              │             │              │                            │                  │ ☐ Referred                       │                  │
│              │             │              │                            │                  │ ☐ Other                         │                  │
├──────────────┼─────────────┼──────────────┼────────────────────────────┼──────────────────┼──────────────────────────────────┼──────────────────┤
│ Headache     │ 2024-01-18  │ 2024-02-02   │ ☐ Mild                     │ ☐ Yes            │ ☐ None                           │ ☑ Resolved       │
│              │             │              │ ☑ Moderate                 │ ☑ No             │ ☑ Dose adjusted                  │ ☐ Ongoing        │
│              │             │              │ ☐ Severe                   │                  │ ☐ Drug stopped                   │                  │
│              │             │              │                            │                  │ ☐ Referred                       │                  │
│              │             │              │                            │                  │ ☐ Other                         │                  │
└──────────────┴─────────────┴──────────────┴────────────────────────────┴──────────────────┴──────────────────────────────────┴──────────────────┘
```

**Legend:**
- ☑ = Selected option
- ☐ = Unselected option

**Special Case - "Other" Action:**
- If `actionTaken = "Other"`, show:
  ```
  ☐ None
  ☐ Dose adjusted
  ☐ Drug stopped
  ☐ Referred
  ☑ Other: [User's specified text]
  ```

### PDF Code Changes (Pseudo-code)
```typescript
// In pdf-export.tsx, replace current AE section with:

if (visit?.adverseEventsPresent && visit?.adverseEvents?.length > 0) {
  <Text style={styles.sectionTitle}>Safety & Adverse Events</Text>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>AE Term</TableCell>
        <TableCell>Onset Date</TableCell>
        <TableCell>Stop Date</TableCell>
        <TableCell>Severity</TableCell>
        <TableCell>Serious</TableCell>
        <TableCell>Action Taken</TableCell>
        <TableCell>Outcome</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {visit.adverseEvents.map((ae) => (
        <TableRow key={ae.id}>
          <TableCell>{ae.aeTerm}</TableCell>
          <TableCell>{ae.onsetDate}</TableCell>
          <TableCell>{ae.stopDate}</TableCell>
          
          {/* Severity - Show all options with checkmark on selected */}
          <TableCell>
            {`${ae.severity === 'Mild' ? '☑' : '☐'} Mild\n`}
            {`${ae.severity === 'Moderate' ? '☑' : '☐'} Moderate\n`}
            {`${ae.severity === 'Severe' ? '☑' : '☐'} Severe`}
          </TableCell>
          
          {/* Serious - Show both options with checkmark on selected */}
          <TableCell>
            {`${ae.isSerious === 'Yes' ? '☑' : '☐'} Yes\n`}
            {`${ae.isSerious === 'No' ? '☑' : '☐'} No`}
          </TableCell>
          
          {/* Action Taken - Show all options with checkmark on selected */}
          <TableCell>
            {`${ae.actionTaken === 'None' ? '☑' : '☐'} None\n`}
            {`${ae.actionTaken === 'Dose adjusted' ? '☑' : '☐'} Dose adjusted\n`}
            {`${ae.actionTaken === 'Drug stopped' ? '☑' : '☐'} Drug stopped\n`}
            {`${ae.actionTaken === 'Referred' ? '☑' : '☐'} Referred\n`}
            {ae.actionTaken === 'Other' 
              ? `☑ Other: ${ae.actionTakenOther}`
              : `☐ Other`}
          </TableCell>
          
          {/* Outcome - Show both options with checkmark on selected */}
          <TableCell>
            {`${ae.outcome === 'Resolved' ? '☑' : '☐'} Resolved\n`}
            {`${ae.outcome === 'Ongoing' ? '☑' : '☐'} Ongoing`}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
}
```

---

## 8. COMPARISON VIEW & SYNC CHANGES

### Comparison View (`components/comparison-view.tsx`)
Currently doesn't show adverse events table.

**Change needed:**
- Add section to display adverseEvents as table (same format as PDF, but in HTML)
- Show when comparing baseline vs follow-up (if follow-up has AE data)

### Background Sync (`app/api/sync/route.ts`)
**Current behavior**: Syncs all follow-up fields including `adverseEventsText`, `actionTaken[]`, `outcome[]`

**New behavior**:
- Also sync `adverseEvents[]` array
- Ensure array is properly serialized/deserialized
- Handle empty array (`[]`) correctly (not `null` or `undefined`)

---

## 9. SUMMARY OF CHANGES

### Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `lib/types.ts` | Add `AdverseEvent` interface; update `FollowUpData.adverseEvents` field | Type safety |
| `components/followup-form.tsx` | Redesign Section L UI; convert state to array-based; implement Add/Delete logic | Form UI/UX |
| `lib/pdf-export.tsx` | Create rendered table for adverseEvents; replace unstructured text | PDF output |
| `components/comparison-view.tsx` | Add adverseEvents table display | Comparison view |
| `app/api/sync/route.ts` | Ensure adverseEvents array is synced | Offline sync |

### Database Changes
- ✅ No schema migration needed (Firestore is schema-less)
- ⚠️ Keep old fields for backward compatibility (read-only)
- ✅ Write to `adverseEvents` array going forward

### Backward Compatibility
- Old documents with `adverseEventsText` + `actionTaken[]` + `outcome[]` still readable
- When loading, prefer `adverseEvents` if it exists
- When saving, always write `adverseEvents`
- Old fields gradually phased out

---

## 10. VALIDATION RULES SUMMARY

### Field-Level Validation

| Field | Type | Validation Rules |
|-------|------|------------------|
| AE Term | Text | Required if `adverseEventsPresent = true` |
| Onset Date | Date | Required; must be ≤ Stop Date |
| Stop Date | Date | Optional; if provided, must be ≥ Onset Date |
| Severity | Radio | Required (single select: Mild/Moderate/Severe) |
| Serious | Radio | Required (single select: Yes/No) |
| Action Taken | Radio | Required (single select) |
| Action Taken Other | Text | Required ONLY if Action Taken = "Other" |
| Outcome | Radio | Required (single select: Resolved/Ongoing) |

### Form-Level Validation

- If `adverseEventsPresent = true`, user MUST add ≥ 1 complete AE record
- Cannot submit form if `adverseEventsPresent = true` and `adverseEvents.length = 0`
- Each AE record must have all required fields filled

---

## 11. USER SCENARIOS

### Scenario A: Single Adverse Event
```
User selects "Yes" for adverse event
→ Form shows 1 empty AE card
→ User fills: Nausea, 1/15-1/20, Mild, No, None, Resolved
→ User clicks Save
→ Saved as: adverseEvents: [{ aeTerm: "Nausea", ... }]
```

### Scenario B: Multiple Adverse Events
```
User selects "Yes"
→ Adds 1st AE: Nausea
→ Clicks "+ Add Another Adverse Event"
→ Adds 2nd AE: Headache
→ Clicks "+ Add Another Adverse Event"
→ Adds 3rd AE: Rash
→ User clicks Save
→ Saved as: adverseEvents: [{...}, {...}, {...}]
```

### Scenario C: Edit Existing Events
```
User loads existing follow-up with 2 AEs
→ Form pre-fills with both events
→ User edits 1st AE severity: Mild → Moderate
→ User deletes 3rd AE (if it was added)
→ User clicks Save
→ Updated in database
```

### Scenario D: "Other" Action Taken
```
User selects "Other" for Action Taken
→ Free text box appears below
→ User types: "Patient requested to switch to insulin"
→ Saved as: actionTaken: "Other", actionTakenOther: "Patient requested to switch..."
```

---

## 12. NEXT STEPS (WHEN READY TO CODE)

1. ✅ Review this document
2. ✅ Confirm understanding with user
3. ⏳ Update `lib/types.ts` → Add `AdverseEvent` interface
4. ⏳ Update `components/followup-form.tsx` → Rebuild Section L UI
5. ⏳ Update form state management (old → new structure)
6. ⏳ Update `lib/pdf-export.tsx` → Table rendering
7. ⏳ Test save/load cycle
8. ⏳ Test PDF export
9. ⏳ Update `components/comparison-view.tsx` if needed
10. ⏳ Test offline sync

---

## QUESTIONS FOR CLARIFICATION

Before proceeding with code, please confirm:

1. ✅ **Field Names** → "AE Term", "Onset Date", "Stop Date", "Severity", "Serious", "Action Taken", "Outcome" — is this correct?

2. ✅ **Severity Options** → Only Mild, Moderate, Severe (not other scales)?

3. ✅ **Action Taken Options** → None, Dose adjusted, Drug stopped, Referred, Other? (Any other options from CRF?)

4. ✅ **Outcome Options** → Only Resolved, Ongoing? (Not "Unknown"?)

5. ✅ **Stop Date** → Optional or required? (User asked for it, but should it be mandatory?)

6. ✅ **IDs for Each Row** → Use UUID or timestamp string for row identification?

7. ✅ **Age/Order Preservation** → Should rows appear in the order user added them, or sorted by date?

---

## END OF PLANNING DOCUMENT

Once you confirm the above points, I can proceed with implementation.
