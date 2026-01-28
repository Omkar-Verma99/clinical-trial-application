# Clinical Trial Application - Manual Testing Checklist

## Quick Start Test (5 minutes)

### 1. Application Loading
- [ ] Navigate to http://localhost:3000
- [ ] Page loads without errors
- [ ] No console errors (F12 → Console tab)
- [ ] Redirects to /login page

### 2. Navigation
- [ ] Click "Sign up" link → Goes to /signup
- [ ] Click "Sign in" link → Goes to /login
- [ ] Back/Forward buttons work correctly

---

## Authentication Testing (10 minutes)

### Signup Flow
```
1. Navigate to http://localhost:3000/signup
2. Fill form with:
   - Full Name: Dr. Test Doctor
   - Qualification: MD
   - Registration Number: REG123456
   - Email: test@example.com
   - Phone: 9876543210
   - Study Site Code: SITE001
   - Password: Test@123456
   - Confirm Password: Test@123456
3. Click Sign Up
```

**Expected Results:**
- [ ] Form validates all required fields
- [ ] Email must be valid format
- [ ] Passwords must match
- [ ] Success message appears
- [ ] Redirects to dashboard
- [ ] Doctor document created in Firestore

### Login Flow
```
1. Navigate to http://localhost:3000/login
2. Enter Email: test@example.com
3. Enter Password: Test@123456
4. Click Login
```

**Expected Results:**
- [ ] Invalid credentials show error
- [ ] Valid credentials login successfully
- [ ] Redirects to dashboard
- [ ] User name appears in header
- [ ] Can access protected pages

### Logout Flow
- [ ] Click logout button
- [ ] User redirected to login
- [ ] Cannot access dashboard without login

---

## Patient Management Testing (15 minutes)

### Add Patient
```
Navigate to http://localhost:3000/patients/add
Fill form with:
- Patient Code: PAT001
- Study Site Code: SITE001
- Investigator Name: Auto-filled from doctor
- Baseline Visit Date: Today
- Age: 45
- Gender: Male
- Height: 170
- Weight: 75
- BMI: Auto-calculated
- Duration of Diabetes: 5
- Smoking Status: Non-smoker
- Alcohol Intake: Occasional
- Select at least one diabetes complication
- Select at least one comorbidity
- Select previous drug class(es)
- Select reason for Triple FDC
```

**Critical Bug Checks:**
- [ ] PatientId not empty (fixed bug #1)
- [ ] DoctorId auto-populated (fixed bug #3)
- [ ] Form cannot submit if doctor not authenticated
- [ ] Draft save works
- [ ] Full enrollment works with validation

**Data Integrity Checks:**
- [ ] Patient appears in dashboard immediately
- [ ] Patient code matches what was entered
- [ ] Doctor association is correct
- [ ] Patient data saved to Firestore

### View Patient List
```
Navigate to http://localhost:3000/dashboard
```

**Expected Results:**
- [ ] All patients for logged-in doctor are shown
- [ ] Other doctors' patients NOT visible
- [ ] Patient cards show:
  - Patient Code
  - Age, Gender
  - Duration of Diabetes
  - Previous Therapy
  - Comorbidities
  - Status indicators (Baseline/FollowUp)
- [ ] Can click on patient to view details
- [ ] Pagination works (if >10 patients)

---

## Baseline Form Testing (20 minutes)

### Create Baseline Assessment
```
1. Click on a patient from dashboard
2. Click "Create Baseline Assessment" or "Edit Baseline"
3. Fill form with clinical parameters:
   - HbA1c: 8.5
   - FPG: 150
   - PPG: 220
   - Weight: 75
   - BP Systolic: 130
   - BP Diastolic: 85
   - Serum Creatinine: 0.9
   - eGFR: 90
   - Urinalysis: Normal
   - Dose Prescribed: 5mg
   - Treatment Initiation Date: Today
   - Select counseling checkboxes
4. Click "Save as Draft" → Then "Submit"
```

**Critical Bug Checks:**
- [ ] PatientId preserved in all operations (fixed bug #2)
- [ ] DoctorId auto-set (fixed bug #3)
- [ ] User validation prevents save if not authenticated (fixed bug #3)
- [ ] CreatedAt timestamp not overwritten on updates (fixed bug #5)

**Validation Checks:**
- [ ] Required fields validation works
- [ ] Numeric range validation works
- [ ] HbA1c: 4-15%
- [ ] FPG: 50-500 mg/dL
- [ ] Weight: 30-200 kg
- [ ] BP ranges validated

**Data Integrity Checks:**
- [ ] BaselineData saved to Firestore with:
  - patientId ✅
  - doctorId ✅
  - All clinical parameters
  - createdAt (original) ✅
  - updatedAt (current)
- [ ] No empty patientId in Firestore
- [ ] Firestore rules accept the data

### Edit Baseline
```
1. Click "Edit" on existing baseline
2. Change one value (e.g., HbA1c: 7.5)
3. Click "Submit"
```

**Expected Results:**
- [ ] Data updates in Firestore
- [ ] UpdatedAt timestamp changes
- [ ] CreatedAt timestamp NOT changed (fixed bug #5)
- [ ] PatientId NOT changed
- [ ] DoctorId NOT changed

---

## Followup Form Testing (20 minutes)

### Create Followup Assessment
```
1. Navigate to patient detail
2. Click "Create Follow-up Assessment"
3. Fill form with:
   - Visit Date: 3 months from baseline
   - Clinical parameters (same format as baseline)
   - HbA1c Response: Improved/Same/Worsened
   - Weight Change: Enter value
   - BP Control: Yes/No
   - Adverse Events: Select checkboxes
   - Action Taken: Select actions
   - Efficacy: Excellent/Good/Fair/Poor
   - Tolerability: Excellent/Good/Fair/Poor
   - Compliance: Enter percentage
   - Satisfaction: Very Satisfied/Satisfied/Neutral/Dissatisfied
4. Click "Save as Draft" → Then "Submit"
```

**Critical Bug Checks:**
- [ ] PatientId validated before sync (fixed bug #2)
- [ ] DoctorId auto-set (fixed bug #3)
- [ ] User authentication check works (fixed bug #3)
- [ ] Sync process validates fields (fixed bug #4)

**Data Integrity Checks:**
- [ ] FollowupData saved with patientId ✅
- [ ] FollowupData saved with doctorId ✅
- [ ] All required fields present
- [ ] No empty patientId in sync queue

---

## Comparison View Testing (10 minutes)

### View Baseline vs Followup Comparison
```
1. Click on patient with both baseline and followup
2. Navigate to "Comparison" tab
```

**Expected Results:**
- [ ] Baseline values displayed
- [ ] Followup values displayed
- [ ] Changes calculated:
  - HbA1c change
  - Weight change
  - BP change
- [ ] Visual indicators show improvement/decline
- [ ] All data formatted correctly

---

## Reports Page Testing (10 minutes)

### Generate Reports
```
1. Navigate to http://localhost:3000/reports
2. View list of trials
```

**Expected Results:**
- [ ] Shows only completed trials (with baseline AND followup)
- [ ] Patient code visible
- [ ] Age, gender, duration displayed
- [ ] Clinical parameters shown
- [ ] HbA1c change calculated
- [ ] Weight change calculated

### Export Functionality
```
1. Click "Export to Excel"
2. Wait for download
3. Open Excel file
```

**Expected Results:**
- [ ] File downloads without errors
- [ ] Data properly formatted in Excel
- [ ] All columns present
- [ ] No data missing

**Repeat for CSV and PDF exports:**
- [ ] CSV exports correctly
- [ ] PDF exports correctly
- [ ] File opens without corruption

---

## Offline Sync Testing (15 minutes)

### Simulate Offline Mode
```
1. Open F12 Developer Tools
2. Go to Network tab
3. Check "Offline" checkbox
4. Navigate to create baseline form
5. Fill form and click "Save as Draft"
```

**Expected Results:**
- [ ] Form saves to IndexedDB successfully
- [ ] No Firestore connection required
- [ ] Success message shows
- [ ] Can continue working offline

### Go Back Online
```
1. Uncheck "Offline" in Network tab
2. Wait 30 seconds (background sync runs every 30s)
3. Check Firestore console
```

**Expected Results:**
- [ ] Data syncs to Firestore automatically
- [ ] No manual action required
- [ ] Sync completes successfully
- [ ] Firestore records match IndexedDB data

---

## Security Testing (20 minutes)

### Cross-Doctor Access Test
```
1. Login as Doctor A (test@example.com)
2. Add Patient: PAT-A-001
3. Logout
4. Login as Doctor B (test2@example.com)
5. Try to access /patients/[PAT-A-ID]
```

**Expected Results:**
- [ ] Doctor B cannot see Doctor A's patients
- [ ] Dashboard shows empty (or only Doctor B's patients)
- [ ] Firestore queries filtered by doctorId
- [ ] Permission denied errors NOT visible to user

### Empty PatientId Test
```
1. Open browser DevTools Console
2. Create baseline form with empty patientId
3. Attempt to submit
```

**Expected Results:**
- [ ] Client-side validation prevents submission
- [ ] If bypassed, Firestore rules reject it (fixed bug #1)
- [ ] Error message shown to user
- [ ] Record NOT saved

### Invalid PatientId Test
```
1. Create patient: PAT001
2. In DevTools, attempt to save baseline with patientId "INVALID"
```

**Expected Results:**
- [ ] Firestore rules reject (patient doesn't exist)
- [ ] Permission denied error
- [ ] Data NOT saved

---

## Real-Time Sync Testing (10 minutes)

### Multi-Tab Sync Test
```
1. Open patient in Tab 1
2. Open same patient in Tab 2
3. Edit baseline in Tab 1, submit
4. Check Tab 2 for updates
```

**Expected Results:**
- [ ] Tab 2 updates in real-time (within 2-3 seconds)
- [ ] New values appear without page refresh
- [ ] No stale data shown

### Concurrent Edit Test
```
1. Open baseline in Tab 1
2. Open same baseline in Tab 2
3. Edit different fields in each tab
4. Submit both
```

**Expected Results:**
- [ ] Last submitted version wins (expected behavior)
- [ ] No data corruption
- [ ] UpdatedAt timestamp correct in both cases
- [ ] CreatedAt NOT changed (fixed bug #5)

---

## Error Handling Testing (10 minutes)

### Network Error Test
```
1. Start filling baseline form
2. Turn off internet (unplug network)
3. Click "Submit"
```

**Expected Results:**
- [ ] Error message shows
- [ ] Data saved to IndexedDB
- [ ] Data syncs when online again

### Invalid Data Test
```
1. Open baseline form
2. Enter HbA1c: 20 (out of range 4-15)
3. Click "Submit"
```

**Expected Results:**
- [ ] Validation error shows
- [ ] Clear message: "HbA1c must be between 4-15%"
- [ ] Form not submitted

### Missing Required Fields
```
1. Open baseline form
2. Leave HbA1c empty
3. Click "Submit"
```

**Expected Results:**
- [ ] Error shows
- [ ] Clear message: "HbA1c is required"
- [ ] Form not submitted

---

## Performance Testing (10 minutes)

### Page Load Time
```
1. Open DevTools → Performance tab
2. Navigate to /dashboard
3. Check load time
```

**Expected Results:**
- [ ] Initial load < 3 seconds
- [ ] Subsequent loads < 1 second (from cache)

### Form Response Time
```
1. Open baseline form
2. Enter clinical parameter values
3. Check response time
```

**Expected Results:**
- [ ] No lag in typing
- [ ] Form responds instantly
- [ ] No jank or visual stuttering

### List Rendering
```
1. Go to dashboard with 20+ patients
2. Scroll through list
3. Check for performance issues
```

**Expected Results:**
- [ ] Smooth scrolling
- [ ] No lag
- [ ] All patient cards render correctly

---

## Browser Console Check

**CRITICAL:** Before considering testing complete, check console for errors:

```
Open F12 → Console tab
Expected: 0 errors, 0 warnings (except network requests)
```

**Check for:**
- [ ] No "Cannot read property" errors
- [ ] No "Undefined is not a function" errors
- [ ] No "Permission denied" errors
- [ ] No IndexedDB errors
- [ ] No Firebase initialization errors

---

## Mobile Responsiveness Testing

**Test on mobile breakpoints:**

### Mobile (375px)
```
Open DevTools → Toggle device toolbar
Set to iPhone 12
```

- [ ] Layout responsive
- [ ] Forms visible and usable
- [ ] Buttons clickable
- [ ] No horizontal scroll

### Tablet (768px)
```
Set to iPad
```

- [ ] Two-column layout works
- [ ] Forms properly aligned
- [ ] Data tables readable

### Desktop (1920px)
```
Full browser
```

- [ ] Multi-column layout works
- [ ] Charts/graphs properly sized
- [ ] No wasted space

---

## Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Build | ✅ Pass | 0 errors |
| Dev Server | ✅ Pass | Running on :3000 |
| Authentication | [ ] Test | Ready for testing |
| Patient Management | [ ] Test | Ready for testing |
| Baseline Form | [ ] Test | Ready for testing |
| Followup Form | [ ] Test | Ready for testing |
| Dashboard | [ ] Test | Ready for testing |
| Reports | [ ] Test | Ready for testing |
| Offline Sync | [ ] Test | Ready for testing |
| Real-Time Updates | [ ] Test | Ready for testing |
| Security | [ ] Test | Ready for testing |
| Error Handling | [ ] Test | Ready for testing |
| Performance | [ ] Test | Ready for testing |
| Mobile | [ ] Test | Ready for testing |

---

## Critical Test Outcomes

### ✅ All Critical Bugs Fixed:
1. Empty patientId validation ✅
2. Sync queue validation ✅
3. User authentication checks ✅
4. Sync process validation ✅
5. CreatedAt protection ✅
6. Firebase init check ✅
7. State dependency fix ✅
8. Empty string handling ✅

### ✅ Build Verification:
- Zero compilation errors ✅
- All routes compile ✅
- TypeScript strict mode ✅

### ✅ Security:
- Firestore rules deployed ✅
- PatientId validation active ✅
- Doctor ownership enforced ✅

### ⚠️ Requires Manual Verification:
- Full user workflows
- Real-time synchronization
- Permission enforcement
- Cross-doctor isolation
- Performance under load

---

## Sign-Off

**Tester:** ________________  
**Date:** ________________  
**Status:** [ ] Pass [ ] Fail  
**Comments:** ____________

---

**Application Ready for Production:** [ ] Yes [ ] No

