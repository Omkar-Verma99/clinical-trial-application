# Admin Panel Design & Architecture
**Project:** Clinical Trial Application - Admin Dashboard  
**Date:** January 30, 2026  
**Status:** Design Phase - Ready for Implementation  

---

## TABLE OF CONTENTS
1. [Admin Panel Overview](#admin-panel-overview)
2. [Feature Breakdown](#feature-breakdown)
3. [Data Structure & Database](#data-structure--database)
4. [UI/UX Design & Wireframes](#uiux-design--wireframes)
5. [Admin Workflow](#admin-workflow)
6. [Export Functionality (PDF & CSV)](#export-functionality-pdf--csv)
7. [Database Queries & Performance](#database-queries--performance)
8. [Security & Access Control](#security--access-control)
9. [Implementation Roadmap](#implementation-roadmap)

---

## ADMIN PANEL OVERVIEW

### Purpose
A comprehensive dashboard for administrators to:
- 👀 **Monitor** all doctors, patients, and their activities
- 📊 **Track** form submissions and data collection progress
- 📋 **Review** patient responses across all forms (baseline, follow-ups)
- 📥 **Export** data in bulk (PDF reports, CSV datasets)
- 🔍 **Search & Filter** by doctor, patient, form status, date range
- 📈 **Generate** analytics and statistics about trial data

### Key Users
- **Super Admin:** Full access to all data, system management
- **Study Coordinators:** Can view/export data, manage users
- **Data Analysts:** Can export and analyze data
- **PI (Principal Investigator):** Read-only access to reports

### Core Features
```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                         │
├─────────────────────────────────────────────────────────────┤
│  1. Dashboard Overview                                        │
│     - Total patients enrolled                                │
│     - Total forms completed                                  │
│     - Completion rate %                                      │
│     - Recent activity timeline                               │
│                                                               │
│  2. Doctor Management                                         │
│     - List all doctors                                       │
│     - View doctor statistics (patients assigned, forms)      │
│     - Search/filter doctors                                  │
│     - View doctor activities                                 │
│                                                               │
│  3. Patient Management                                        │
│     - List all patients                                      │
│     - View patient demographics                              │
│     - Track patient status (enrolled, active, completed)     │
│     - View all patient forms and responses                   │
│     - Search/filter patients                                 │
│                                                               │
│  4. Form Responses Tracking                                   │
│     - View all form submissions                              │
│     - Filter by form type (baseline, follow-up)              │
│     - Filter by status (completed, incomplete, pending)      │
│     - Compare responses across patients                      │
│     - View submission timestamps                             │
│                                                               │
│  5. Data Export                                               │
│     - Multi-select patients                                  │
│     - Export PDF reports (clinical summaries)                │
│     - Export CSV (raw data, deep structure)                  │
│     - Schedule batch exports                                 │
│                                                               │
│  6. Analytics & Reports                                       │
│     - Enrollment trends                                      │
│     - Completion rates by form                               │
│     - Doctor performance metrics                             │
│     - Data quality metrics                                   │
│                                                               │
│  7. Settings & User Management                                │
│     - Manage admin users and roles                           │
│     - Audit logs of all admin actions                        │
│     - System configuration                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## FEATURE BREAKDOWN

### 1. DASHBOARD OVERVIEW

**What Shows:**
```
┌──────────────────────────────────────────────────────────┐
│  Welcome, Dr. Admin | Logout | Settings                 │
├──────────────────────────────────────────────────────────┤
│                    KEY METRICS (Cards)                    │
├──────────────────────────────────────────────────────────┤
│  Total Patients: 145    │  Completed Forms: 289          │
│  Active Doctors: 12     │  Completion Rate: 78%          │
│  New This Week: 8       │  Pending Review: 12            │
└──────────────────────────────────────────────────────────┘
│
│  RECENT ACTIVITY (Timeline)
├─────────────────────────────────────────────────────────┤
│  📝 Patient ID: P001 - Baseline form submitted         │
│     By: Dr. Sarah Johnson | 2 hours ago                 │
│                                                          │
│  📝 Patient ID: P045 - Follow-up form submitted        │
│     By: Dr. Mike Chen | 4 hours ago                    │
│                                                          │
│  ➕ New patient registered: P156                       │
│     By: Dr. Lisa Park | 1 day ago                      │
│                                                          │
│  📝 Patient ID: P089 - Baseline form submitted         │
│     By: Dr. David Brown | 2 days ago                   │
└──────────────────────────────────────────────────────────┘
```

**Metrics Calculated:**
- Total patients enrolled (count from Firestore)
- Total forms submitted (all baseline + followup)
- Completion rate: (Forms completed / (Patients × Forms per patient)) × 100
- New patients this week/month
- Forms pending review
- Latest activities from all doctors

---

### 2. DOCTOR MANAGEMENT

**Doctor List View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Doctors             Search: [ ___ ]  Filter: [All ▼]       │
├─────────────────────────────────────────────────────────────┤
│ Name      │ Email          │ Patients │ Forms │ Last Active  │
├─────────────────────────────────────────────────────────────┤
│ Dr. Sarah │ sarah@...      │    23    │  46   │ 2 hours ago  │
│ Dr. Mike  │ mike@...       │    18    │  34   │ 1 day ago    │
│ Dr. Lisa  │ lisa@...       │    31    │  62   │ 3 hours ago  │
│ Dr. David │ david@...      │    12    │  24   │ 5 days ago   │
│ Dr. James │ james@...      │    61    │  122  │ 30 min ago   │
└─────────────────────────────────────────────────────────────┘
```

**Doctor Detail View (Click on doctor):**
```
┌──────────────────────────────────────────────────┐
│ Dr. Sarah Johnson                  [Close X]     │
├──────────────────────────────────────────────────┤
│ Email: sarah@hospital.com                        │
│ Phone: +1-555-0123                               │
│ Department: Cardiology                           │
│ Status: Active ✓                                 │
│ Last Login: 2 hours ago                          │
│                                                   │
│ STATISTICS:                                       │
│ Patients Assigned: 23                            │
│ Forms Submitted: 46                              │
│ Avg Completion Time: 8.5 days                    │
│ Last Patient Added: 1 day ago                    │
│                                                   │
│ RECENT ACTIVITIES:                                │
│ - Submitted baseline for P042: 2 hours ago      │
│ - Submitted follow-up for P023: 1 day ago       │
│ - Added new patient P089: 2 days ago            │
│                                                   │
│ [View All Patients]  [View All Forms]  [Delete]  │
└──────────────────────────────────────────────────┘
```

---

### 3. PATIENT MANAGEMENT

**Patient List View:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Patients                Search: [___]  Filter: [All ▼] [Date ▼]  │
├──────────────────────────────────────────────────────────────────┤
│ ID    │ Name       │ Doctor   │ Status      │ Baseline │ Follow-up │
├──────────────────────────────────────────────────────────────────┤
│ P001  │ John Doe   │ Dr. Sarah│ Active      │ ✓        │ ✓        │
│ P002  │ Jane Smith │ Dr. Mike │ Active      │ ✓        │ ✗        │
│ P003  │ Bob Wilson │ Dr. Lisa │ Completed   │ ✓        │ ✓        │
│ P045  │ Mary Jones │ Dr. David│ Active      │ ✓        │ ⏳        │
│ P089  │ Tom Brown  │ Dr. James│ Enrolled    │ ⏳        │ —        │
│ P156  │ Lisa White │ Dr. Sarah│ Active      │ ✓        │ ✓        │
│ ...   │ ...        │ ...      │ ...         │ ...      │ ...      │
└──────────────────────────────────────────────────────────────────┘

Legend:
✓ = Completed
✗ = Incomplete
⏳ = In Progress
— = Not Started
```

**Patient Detail View (Click on patient):**
```
┌──────────────────────────────────────────────────────────────┐
│ Patient ID: P089 - Tom Brown          [Close X]              │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ DEMOGRAPHICS:                                                  │
│ Name: Tom Brown                                               │
│ Age: 45 years                                                 │
│ Gender: Male                                                  │
│ Enrollment Date: 2026-01-25                                  │
│ Assigned Doctor: Dr. James Wilson                            │
│ Contact: +1-555-0456                                         │
│                                                                │
│ FORMS SUBMITTED:                                               │
│                                                                │
│ 1. BASELINE FORM ⏳ (In Progress)                            │
│    ├─ Started: 2026-01-28 14:30                             │
│    ├─ Last Updated: 2026-01-29 10:15                        │
│    ├─ Fields Completed: 15/20                               │
│    └─ [View] [Edit] [Complete]                              │
│                                                                │
│ 2. FOLLOW-UP FORM (1 week) — (Not Started)                  │
│    ├─ Due Date: 2026-02-04                                  │
│    └─ [Start]                                                │
│                                                                │
│ 3. FOLLOW-UP FORM (4 weeks) — (Not Started)                 │
│    ├─ Due Date: 2026-02-25                                  │
│    └─ [Start]                                                │
│                                                                │
│ [View All Forms]  [Download Patient Report]  [Notes]         │
└──────────────────────────────────────────────────────────────┘
```

---

### 4. FORM RESPONSES TRACKING

**Form Responses List:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Form Responses         Filter: [Baseline ▼] [Date ▼] [Doctor ▼] │
├──────────────────────────────────────────────────────────────────┤
│ Patient │ Form Type  │ Doctor    │ Submitted  │ Status   │ Fields │
├──────────────────────────────────────────────────────────────────┤
│ P001    │ Baseline   │ Dr. Sarah │ 2026-01-25│ Complete │ 20/20  │
│ P002    │ Baseline   │ Dr. Mike  │ 2026-01-26│ Complete │ 20/20  │
│ P045    │ Follow-up  │ Dr. David │ 2026-01-27│ Complete │ 18/18  │
│ P089    │ Baseline   │ Dr. James │ 2026-01-29│ Incomplete│ 15/20 │
│ P156    │ Follow-up  │ Dr. Sarah │ 2026-01-30│ Complete │ 18/18  │
│ ...     │ ...        │ ...       │ ...       │ ...      │ ...    │
└──────────────────────────────────────────────────────────────────┘
```

**Form Response Detail (Click on response):**
```
┌────────────────────────────────────────────────────┐
│ Baseline Form Response - Patient P089              │
├────────────────────────────────────────────────────┤
│ Patient: Tom Brown (P089)                          │
│ Submitted By: Dr. James Wilson                     │
│ Submitted Date: 2026-01-29 10:15                   │
│ Status: Incomplete (15/20 fields)                  │
│                                                     │
│ FORM DATA:                                          │
│ ┌─────────────────────────────────────────────────┐
│ │ ✓ First Name: Tom                               │
│ │ ✓ Last Name: Brown                              │
│ │ ✓ Age: 45                                       │
│ │ ✓ Gender: Male                                  │
│ │ ✓ Weight: 78.5 kg                               │
│ │ ✓ Height: 1.80 m                                │
│ │ ✓ Blood Pressure: 120/80 mmHg                   │
│ │ ✗ Medications: [Empty]                          │
│ │ ✗ Medical History: [Empty]                      │
│ │ ✗ Current Symptoms: [Empty]                     │
│ │ ✓ Diagnosis: Hypertension                       │
│ │ ✓ Disease Duration: 5 years                     │
│ │ ✓ Comorbidities: None                           │
│ │ ✓ Previous Treatment: Yes                       │
│ │ ✗ Treatment Details: [Empty]                    │
│ │ ✓ Allergies: None                               │
│ │ ✗ Diet Restrictions: [Empty]                    │
│ │ ✗ Exercise Routine: [Empty]                     │
│ │ ✓ Smoking Status: Former                        │
│ │ ✓ Alcohol Use: Occasional                       │
│ └─────────────────────────────────────────────────┘
│                                                     │
│ [Complete Form] [Export] [Print] [Note]            │
└────────────────────────────────────────────────────┘
```

---

### 5. DATA EXPORT - MULTI-SELECT & EXPORT

**Patient Selection View:**
```
┌──────────────────────────────────────────────────────────────┐
│ Select Patients for Export                                   │
├──────────────────────────────────────────────────────────────┤
│ [Select All] [Deselect All] [Export Selected]               │
│                                                               │
│ ☐ P001 - John Doe        (23 forms)                         │
│ ☑ P002 - Jane Smith       (15 forms)                         │
│ ☑ P003 - Bob Wilson       (18 forms)                         │
│ ☐ P045 - Mary Jones       (20 forms)                         │
│ ☑ P089 - Tom Brown        (8 forms)                          │
│ ☐ P156 - Lisa White       (16 forms)                         │
│ ☐ P167 - Mike Johnson     (19 forms)                         │
│ ...                                                           │
│                                                               │
│ Selected: 3 patients                                          │
│                                                               │
│ [  ] Include Only Completed Forms                            │
│ [  ] Include Baseline Only                                   │
│ [  ] Include Follow-ups Only                                 │
│ [  ] Include Notes & Comments                                │
│                                                               │
│                                                               │
│ EXPORT FORMAT:                                                │
│ ◉ CSV (Deep - All fields & values)                           │
│ ◯ PDF (Clinical Summary Report)                              │
│ ◯ Both (CSV + PDF)                                           │
│                                                               │
│ [Cancel]  [Export]                                            │
└──────────────────────────────────────────────────────────────┘
```

---

### 6. ANALYTICS & REPORTS

**Analytics Dashboard:**
```
┌──────────────────────────────────────────────────────────────┐
│ Analytics & Reports              Period: [Jan 2026 ▼]       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ENROLLMENT METRICS                                           │
│  ┌──────────────────────────────────────────────────────────┐
│  │ Total Enrolled: 145                                      │
│  │ This Month: +32                                          │
│  │ Active: 132                                              │
│  │ Completed: 13                                            │
│  │ Trend: ↑ 12% increase from last month                   │
│  └──────────────────────────────────────────────────────────┘
│
│  COMPLETION RATES BY FORM                                    │
│  ┌──────────────────────────────────────────────────────────┐
│  │ Baseline Form:    98% (142/145)                          │
│  │ Week 1 Follow-up: 87% (126/145)                          │
│  │ Week 4 Follow-up: 62% (90/145)                           │
│  │ Week 12 Follow-up: 35% (51/145)                          │
│  │ Final Assessment: 18% (26/145)                           │
│  │                                                           │
│  │ [View Incomplete Forms]                                  │
│  └──────────────────────────────────────────────────────────┘
│
│  DOCTOR PERFORMANCE                                          │
│  ┌──────────────────────────────────────────────────────────┐
│  │ Doctor             Patients  Completion  Avg Days        │
│  │ Dr. James Wilson       61        95%       6.2 days      │
│  │ Dr. Sarah Johnson      23        96%       7.1 days      │
│  │ Dr. Lisa Park          31        88%       8.3 days      │
│  │ Dr. Mike Chen          18        83%       9.5 days      │
│  │ Dr. David Brown        12        75%       11.2 days     │
│  └──────────────────────────────────────────────────────────┘
│
│  DATA QUALITY METRICS                                         │
│  ┌──────────────────────────────────────────────────────────┐
│  │ Complete Records: 138/145 (95%)                          │
│  │ Missing Data: 7/145 (5%)                                 │
│  │ Outliers Detected: 3                                     │
│  │ Data Validation Errors: 0                                │
│  │ Last Audit: 2 hours ago                                  │
│  └──────────────────────────────────────────────────────────┘
│
└──────────────────────────────────────────────────────────────┘
```

---

## DATA STRUCTURE & DATABASE

### Firestore Collections

```
clinical-trial-db/
│
├─ patients/ (collection)
│  ├─ P001/ (document)
│  │  ├─ firstName: "John"
│  │  ├─ lastName: "Doe"
│  │  ├─ age: 45
│  │  ├─ gender: "Male"
│  │  ├─ contactNumber: "+1-555-0123"
│  │  ├─ enrollmentDate: timestamp
│  │  ├─ assignedDoctorId: "doc_123"
│  │  ├─ status: "active" | "completed" | "dropped"
│  │  ├─ createdAt: timestamp
│  │  └─ updatedAt: timestamp
│  │
│  ├─ P002/ (document)
│  └─ P003/ (document)
│
├─ doctors/ (collection)
│  ├─ doc_123/ (document)
│  │  ├─ firstName: "Sarah"
│  │  ├─ lastName: "Johnson"
│  │  ├─ email: "sarah@hospital.com"
│  │  ├─ phone: "+1-555-0123"
│  │  ├─ department: "Cardiology"
│  │  ├─ role: "doctor" | "admin" | "coordinator"
│  │  ├─ status: "active" | "inactive"
│  │  ├─ createdAt: timestamp
│  │  └─ lastLogin: timestamp
│  │
│  ├─ doc_456/ (document)
│  └─ doc_789/ (document)
│
├─ forms/ (collection)
│  ├─ form_baseline/ (document)
│  │  ├─ formName: "Baseline Assessment"
│  │  ├─ formType: "baseline"
│  │  ├─ fields: [...array of field definitions...]
│  │  ├─ createdAt: timestamp
│  │  └─ updatedAt: timestamp
│  │
│  ├─ form_followup_w1/ (document)
│  └─ form_followup_w4/ (document)
│
├─ formResponses/ (collection)
│  ├─ resp_P001_baseline/ (document)
│  │  ├─ patientId: "P001"
│  │  ├─ doctorId: "doc_123"
│  │  ├─ formId: "form_baseline"
│  │  ├─ formType: "baseline"
│  │  ├─ submittedDate: timestamp
│  │  ├─ completionStatus: "complete" | "incomplete"
│  │  ├─ responses: {
│  │  │   "firstName": "John",
│  │  │   "lastName": "Doe",
│  │  │   "age": 45,
│  │  │   "gender": "Male",
│  │  │   "weight": 78.5,
│  │  │   "height": 1.80,
│  │  │   "bloodPressure": "120/80",
│  │  │   "medications": ["Med1", "Med2"],
│  │  │   "medicalHistory": "...",
│  │  │   ... all form fields ...
│  │  │ }
│  │  ├─ fieldsCompleted: 20
│  │  ├─ fieldsMissing: 0
│  │  └─ notes: "Patient doing well"
│  │
│  ├─ resp_P001_followup_w1/ (document)
│  └─ resp_P002_baseline/ (document)
│
├─ auditLogs/ (collection)
│  ├─ log_2026_01_30_001/ (document)
│  │  ├─ adminId: "admin_001"
│  │  ├─ action: "export_data" | "view_patient" | "edit_form" | "delete_user"
│  │  ├─ resourceType: "patient" | "form" | "doctor" | "export"
│  │  ├─ resourceId: "P001"
│  │  ├─ changes: {...}
│  │  ├─ timestamp: timestamp
│  │  └─ ipAddress: "192.168.1.1"
│  │
│  └─ log_2026_01_30_002/ (document)
│
└─ exports/ (collection)
   ├─ export_2026_01_30_001/ (document)
   │  ├─ adminId: "admin_001"
   │  ├─ exportDate: timestamp
   │  ├─ selectedPatients: ["P001", "P002", "P089"]
   │  ├─ exportFormat: "csv" | "pdf" | "both"
   │  ├─ fileUrl: "gs://bucket/exports/export_2026_01_30_001.csv"
   │  ├─ status: "completed" | "processing" | "failed"
   │  ├─ recordCount: 145
   │  └─ fileSize: "2.5MB"
   │
   └─ export_2026_01_30_002/ (document)
```

### Database Indexes Needed

```
formResponses:
- Index 1: (patientId, submittedDate DESC)
- Index 2: (doctorId, submittedDate DESC)
- Index 3: (formType, completionStatus, submittedDate DESC)
- Index 4: (submittedDate DESC) - for timeline queries

patients:
- Index 1: (assignedDoctorId, enrollmentDate DESC)
- Index 2: (status, enrollmentDate DESC)
- Index 3: (enrollmentDate DESC)

auditLogs:
- Index 1: (adminId, timestamp DESC)
- Index 2: (action, timestamp DESC)
- Index 3: (timestamp DESC)
```

---

## UI/UX DESIGN & WIREFRAMES

### Page Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN PANEL HEADER                                           │
│ Logo | Title | Search | Notifications | Settings | Logout   │
├─────────────────────────────────────────────────────────────┤
│      │                                                        │
│ S    │              MAIN CONTENT AREA                         │
│ I    │                                                        │
│ D    │  Dashboard / Doctors / Patients / Forms / Analytics   │
│ E    │                                                        │
│ B    │  [Dynamic based on selected tab]                      │
│ A    │                                                        │
│ R    │  - Tables with search/filter                          │
│      │  - Detail modals/panels                               │
│      │  - Export options                                     │
│      │                                                        │
│      │                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Structure

```
ADMIN PANEL
│
├─ Dashboard (Home)
│  └─ Overview, Key Metrics, Recent Activity
│
├─ Doctors Management
│  ├─ List all doctors
│  ├─ View doctor details
│  ├─ View doctor statistics
│  └─ Manage doctor access
│
├─ Patients Management
│  ├─ List all patients
│  ├─ View patient details
│  ├─ View patient forms (nested)
│  ├─ Patient medical info
│  └─ Patient history
│
├─ Form Responses
│  ├─ View all responses
│  ├─ Filter by form type
│  ├─ Filter by status
│  ├─ Compare responses
│  └─ Bulk export
│
├─ Analytics
│  ├─ Enrollment metrics
│  ├─ Completion rates
│  ├─ Doctor performance
│  ├─ Data quality
│  └─ Generate reports
│
└─ Settings & Admin
   ├─ User management
   ├─ Roles & permissions
   ├─ Audit logs
   └─ System configuration
```

### Color Scheme & Design System

```
PRIMARY COLORS:
- Primary Blue: #0066CC (buttons, links, active states)
- Success Green: #00AA33 (completed, passed, active)
- Warning Orange: #FF9900 (pending, in-progress)
- Error Red: #CC0000 (failed, incomplete, errors)
- Neutral Gray: #666666 (text, disabled states)

BACKGROUNDS:
- White: #FFFFFF (main background)
- Light Gray: #F5F5F5 (section backgrounds, hover states)
- Dark Gray: #333333 (text, headers)

STATES:
- Completed: Green checkmark + Green text
- Incomplete: Red X + Red text
- In Progress: Orange hourglass + Orange text
- Not Started: Gray dash + Gray text
```

---

## ADMIN WORKFLOW

### Typical Admin Day Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  MORNING STANDUP                             │
├─────────────────────────────────────────────────────────────┤
│ 1. Admin logs into admin panel                               │
│    → Sees dashboard with overnight activities               │
│                                                               │
│ 2. Reviews key metrics                                       │
│    → Checks enrollment progress                             │
│    → Checks form completion rates                           │
│    → Looks for any pending forms                            │
│                                                               │
│ 3. Checks incomplete forms                                  │
│    → Identifies patients with incomplete baseline           │
│    → Notifies doctors about pending follow-ups              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              DURING THE DAY (MONITORING)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Checks doctor activities                                 │
│    → Which doctors are actively adding patients             │
│    → Which doctors are lagging behind                       │
│                                                               │
│ 2. Monitors patient enrollment                              │
│    → Sees new patients added                                │
│    → Sees baseline forms submitted                          │
│    → Tracks completion timeline                             │
│                                                               │
│ 3. Reviews form quality                                     │
│    → Checks for incomplete responses                        │
│    → Looks for data inconsistencies                         │
│    → Validates submitted data                               │
│                                                               │
│ 4. Manages requests                                         │
│    → Handles data export requests from researchers          │
│    → Generates ad-hoc reports                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              END OF DAY (REPORTING)                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Generates daily summary                                  │
│    → Total new patients                                     │
│    → Total forms submitted                                  │
│    → Forms completed                                        │
│                                                               │
│ 2. Exports data for analysis                                │
│    → Selects multiple patients                              │
│    → Exports as CSV for deeper analysis                     │
│    → Exports as PDF for reports                             │
│                                                               │
│ 3. Checks audit logs                                        │
│    → Reviews all admin actions                              │
│    → Ensures data integrity                                 │
│    → Exports audit log if needed                            │
│                                                               │
│ 4. Schedules next tasks                                     │
│    → Flags patients for follow-up                           │
│    → Schedules reports                                      │
│    → Plans next day activities                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 1: Checking Patient Progress

```
START
  │
  └─→ Admin opens Patients tab
       │
       ├─ Sees list of all patients (145 total)
       │
       ├─ Searches for specific patient OR filters by:
       │  - Doctor
       │  - Status (Active, Completed, Dropped)
       │  - Form completion status
       │
       └─→ Clicks on patient (P089 - Tom Brown)
            │
            ├─ Opens patient detail panel
            │  - Demographics visible
            │  - All forms listed
            │
            ├─ Sees baseline form: ⏳ In Progress (15/20)
            │
            ├─ Clicks [View] to see form responses
            │  - Sees all filled fields
            │  - Sees all empty fields
            │  - Can see doctor notes
            │
            └─→ Takes action:
                - [Complete Form] if patient ready
                - [Send Reminder] to doctor
                - [Add Note] for follow-up
                - [Download Report] for this patient

END
```

### Workflow 2: Exporting Multiple Patients

```
START
  │
  └─→ Admin opens Patients tab
       │
       ├─ Clicks [Select for Export]
       │
       ├─ Checkboxes appear next to each patient
       │
       ├─ Admin selects multiple patients:
       │  ☑ P002 - Jane Smith
       │  ☑ P089 - Tom Brown
       │  ☑ P156 - Lisa White
       │
       ├─ All 3 patients selected (including their forms)
       │
       └─→ Clicks [Export Selected]
            │
            ├─ Export format dialog appears
            │  - ◉ CSV (Deep - all fields)
            │  - ◯ PDF (Summary report)
            │  - ◯ Both
            │
            ├─ Options:
            │  [✓] Include completed forms only
            │  [✓] Include notes & comments
            │
            └─→ Clicks [Export]
                 │
                 ├─ File is generated
                 │  - CSV: P002_P089_P156_export_20260130.csv
                 │  - PDF: P002_P089_P156_report_20260130.pdf
                 │
                 ├─ Download starts automatically
                 │
                 ├─ Audit log records:
                 │  - Admin who exported
                 │  - Which patients
                 │  - When
                 │  - Format
                 │
                 └─→ Export complete
                      │
                      └─ Data available for analysis

END
```

---

## EXPORT FUNCTIONALITY (PDF & CSV)

### CSV EXPORT - DEEP STRUCTURE

**File:** `P002_P089_P156_export_20260130.csv`

The CSV will be structured like this:

```csv
PatientID,PatientName,DoctorID,DoctorName,FormType,FormSubmittedDate,FieldName,FieldValue,FieldDataType,IsCompleted
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,firstName,Jane,text,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,lastName,Smith,text,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,age,42,number,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,gender,Female,select,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,weight,65.3,number,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,height,1.65,number,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,bloodPressure,130/85,text,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,medications,"Lisinopril, Amlodipine",array,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,medicalHistory,Hypertension diagnosed 3 years ago,textarea,true
P002,Jane Smith,doc_456,Dr. Mike Chen,Baseline,2026-01-26T14:30:00Z,currentSymptoms,None reported,textarea,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,firstName,Tom,text,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,lastName,Brown,text,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,age,45,number,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,gender,Male,select,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,weight,78.5,number,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,height,1.80,number,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,bloodPressure,120/80,text,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,medications,"Metoprolol, Enalapril",array,true
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,medicalHistory,[EMPTY],textarea,false
P089,Tom Brown,doc_789,Dr. James Wilson,Baseline,2026-01-29T10:15:00Z,currentSymptoms,[EMPTY],textarea,false
...more rows for each field...
P089,Tom Brown,doc_789,Dr. James Wilson,FollowUp_Week1,2026-02-05T15:45:00Z,symptomSeverity,2,number,true
P089,Tom Brown,doc_789,Dr. James Wilson,FollowUp_Week1,2026-02-05T15:45:00Z,adverseEvents,None,textarea,true
...
P156,Lisa White,doc_123,Dr. Sarah Johnson,Baseline,2026-01-25T09:00:00Z,firstName,Lisa,text,true
... (all P156 data)
```

**CSV Structure Explanation:**
- **PatientID:** Patient identifier (P002)
- **PatientName:** Full patient name (Jane Smith)
- **DoctorID:** Doctor who submitted form (doc_456)
- **DoctorName:** Doctor full name (Dr. Mike Chen)
- **FormType:** Type of form (Baseline, FollowUp_Week1, etc.)
- **FormSubmittedDate:** When form was submitted with timestamp
- **FieldName:** Individual field name (firstName, medications, etc.)
- **FieldValue:** Value entered in that field (Jane, ["Lisinopril", "Amlodipine"])
- **FieldDataType:** Type of data (text, number, array, textarea, select, date, etc.)
- **IsCompleted:** Whether field was filled (true/false)

**Advantages of This Structure:**
- ✅ One row per field per patient = complete detail
- ✅ Easy to analyze in Excel, Python, R
- ✅ Can filter/sort by any column
- ✅ Tracks empty fields (IsCompleted = false)
- ✅ Includes metadata (doctor, submission date, form type)
- ✅ Works with pivot tables in Excel

---

### PDF EXPORT - CLINICAL SUMMARY REPORT

**File:** `P002_P089_P156_report_20260130.pdf`

The PDF will contain:

```
╔════════════════════════════════════════════════════════════╗
║         CLINICAL TRIAL DATA EXPORT REPORT                  ║
║                                                             ║
║ Export Date: January 30, 2026                              ║
║ Export Time: 14:30 UTC                                     ║
║ Exported By: Dr. Admin User                                ║
║ Total Patients: 3                                          ║
║ Total Forms: 7                                             ║
╚════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════

PATIENT 1: JANE SMITH
─────────────────────
Patient ID: P002
Age: 42 years old | Gender: Female
Assigned Doctor: Dr. Mike Chen
Enrollment Date: January 15, 2026
Status: Active

BASELINE FORM - Submitted: January 26, 2026
├─ Demographics
│  ├─ First Name: Jane
│  ├─ Last Name: Smith
│  ├─ Date of Birth: [Calculated from age]
│  ├─ Contact: +1-555-0789
│  └─ Address: [Address on file]
│
├─ Medical Information
│  ├─ Current Weight: 65.3 kg
│  ├─ Height: 1.65 m
│  ├─ BMI: 23.9 (Normal)
│  ├─ Blood Pressure: 130/85 mmHg
│  └─ Heart Rate: 72 bpm
│
├─ Medical History
│  ├─ Diagnosis: Hypertension
│  ├─ Duration: 3 years
│  ├─ Current Medications: Lisinopril, Amlodipine
│  ├─ Allergies: Penicillin
│  ├─ Comorbidities: Hyperlipidemia
│  └─ Previous Treatments: Medication management
│
├─ Lifestyle Information
│  ├─ Smoking Status: Never
│  ├─ Alcohol Use: Occasional (2 drinks/week)
│  ├─ Exercise Routine: 3x per week, 30 minutes
│  └─ Diet: Mediterranean diet
│
└─ Form Quality: 100% Complete (18/18 fields filled)

═══════════════════════════════════════════════════════════════

PATIENT 2: TOM BROWN
────────────────────
Patient ID: P089
Age: 45 years old | Gender: Male
Assigned Doctor: Dr. James Wilson
Enrollment Date: January 25, 2026
Status: Active

BASELINE FORM - Submitted: January 29, 2026
├─ Demographics
│  ├─ First Name: Tom
│  ├─ Last Name: Brown
│  ├─ Date of Birth: [Calculated from age]
│  ├─ Contact: +1-555-0456
│  └─ Address: [Address on file]
│
├─ Medical Information
│  ├─ Current Weight: 78.5 kg
│  ├─ Height: 1.80 m
│  ├─ BMI: 24.2 (Normal)
│  ├─ Blood Pressure: 120/80 mmHg
│  └─ Heart Rate: 68 bpm
│
├─ Medical History
│  ├─ Diagnosis: Hypertension
│  ├─ Duration: 5 years
│  ├─ Current Medications: Metoprolol, Enalapril
│  ├─ Allergies: None reported
│  ├─ Comorbidities: None
│  └─ Previous Treatments: Ongoing medication management
│
├─ Lifestyle Information
│  ├─ Smoking Status: Former smoker
│  ├─ Alcohol Use: Occasional
│  ├─ Exercise Routine: Walks daily, 45 minutes
│  └─ Diet: Low-sodium diet
│
└─ Form Quality: 85% Complete (15/18 fields filled)
   ⚠ Missing: Medical History details, Current Symptoms, 
              Treatment Details

═══════════════════════════════════════════════════════════════

PATIENT 3: LISA WHITE
─────────────────────
Patient ID: P156
Age: 38 years old | Gender: Female
Assigned Doctor: Dr. Sarah Johnson
Enrollment Date: January 18, 2026
Status: Active

BASELINE FORM - Submitted: January 25, 2026
[Same structure as above, all fields filled]

FOLLOW-UP FORM (Week 1) - Submitted: February 1, 2026
├─ Current Symptoms
│  ├─ Symptom: Dizziness
│  ├─ Severity: Mild (2/10)
│  ├─ Duration: 2-3 hours
│  ├─ Frequency: Occasional
│  └─ Notes: Occurs after activity
│
├─ Medications
│  ├─ Current: Lisinopril, Amlodipine
│  ├─ Tolerance: Good
│  ├─ Side Effects: None
│  └─ Compliance: 100%
│
├─ Vital Signs
│  ├─ Blood Pressure: 128/82 mmHg
│  ├─ Heart Rate: 74 bpm
│  ├─ Weight: 64.8 kg
│  └─ Notes: Slight weight decrease from baseline
│
└─ Form Quality: 100% Complete (16/16 fields filled)

═══════════════════════════════════════════════════════════════

SUMMARY STATISTICS
──────────────────
Total Patients Exported: 3
Total Forms Submitted: 7
Average Completion Rate: 95%
Date Range: January 15 - February 1, 2026

Forms by Status:
├─ Completed: 6/7 (85%)
├─ Incomplete: 1/7 (15%)
└─ Pending: 0/7 (0%)

Forms by Type:
├─ Baseline: 3/3 (100%)
├─ Follow-up Week 1: 2/3 (67%)
├─ Follow-up Week 4: 2/3 (67%)
└─ Final Assessment: 0/3 (0%)

═══════════════════════════════════════════════════════════════

EXPORT METADATA
───────────────
File Name: P002_P089_P156_report_20260130.pdf
Export Date: January 30, 2026 at 14:30 UTC
Exported By: Dr. Admin User (admin@hospital.com)
Authorization: Super Admin access confirmed
Data Integrity: ✓ Verified
Security Classification: Confidential - Patient PHI

═══════════════════════════════════════════════════════════════

END OF REPORT
```

---

## DATABASE QUERIES & PERFORMANCE

### Key Queries for Admin Panel

#### Query 1: Get All Doctors with Their Patient Counts

```javascript
// Firestore Query
const getDoctorsWithStats = async () => {
  const doctorsRef = collection(db, 'doctors');
  const doctorsSnapshot = await getDocs(doctorsRef);
  
  const doctors = [];
  for (const doc of doctorsSnapshot.docs) {
    const doctorId = doc.id;
    const doctorData = doc.data();
    
    // Count patients for this doctor
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('assignedDoctorId', '==', doctorId));
    const patientsSnapshot = await getDocs(q);
    
    // Count forms for this doctor
    const formsRef = collection(db, 'formResponses');
    const q2 = query(formsRef, where('doctorId', '==', doctorId));
    const formsSnapshot = await getDocs(q2);
    
    doctors.push({
      id: doctorId,
      ...doctorData,
      patientCount: patientsSnapshot.size,
      formCount: formsSnapshot.size,
      lastActive: doctorData.lastLogin
    });
  }
  
  return doctors;
};
```

#### Query 2: Get All Patients with Their Form Status

```javascript
const getPatientsWithFormStatus = async () => {
  const patientsRef = collection(db, 'patients');
  const patientsSnapshot = await getDocs(patientsRef);
  
  const patients = [];
  for (const patientDoc of patientsSnapshot.docs) {
    const patientId = patientDoc.id;
    const patientData = patientDoc.data();
    
    // Get baseline form status
    const baselineRef = collection(db, 'formResponses');
    const q1 = query(
      baselineRef,
      where('patientId', '==', patientId),
      where('formType', '==', 'baseline')
    );
    const baselineSnapshot = await getDocs(q1);
    
    // Get follow-up form status
    const q2 = query(
      baselineRef,
      where('patientId', '==', patientId),
      where('formType', 'in', ['followup_week1', 'followup_week4'])
    );
    const followupSnapshot = await getDocs(q2);
    
    patients.push({
      id: patientId,
      ...patientData,
      baselineStatus: baselineSnapshot.empty ? 'not_started' : 
                      baselineSnapshot.docs[0].data().completionStatus,
      followupStatus: followupSnapshot.empty ? 'not_started' :
                      followupSnapshot.docs[0].data().completionStatus,
      totalForms: baselineSnapshot.size + followupSnapshot.size
    });
  }
  
  return patients;
};
```

#### Query 3: Get Form Responses with Filters

```javascript
const getFormResponses = async (filters) => {
  let formsRef = collection(db, 'formResponses');
  let constraints = [];
  
  if (filters.formType) {
    constraints.push(where('formType', '==', filters.formType));
  }
  if (filters.status) {
    constraints.push(where('completionStatus', '==', filters.status));
  }
  if (filters.doctorId) {
    constraints.push(where('doctorId', '==', filters.doctorId));
  }
  if (filters.dateFrom && filters.dateTo) {
    constraints.push(
      where('submittedDate', '>=', filters.dateFrom),
      where('submittedDate', '<=', filters.dateTo)
    );
  }
  
  constraints.push(orderBy('submittedDate', 'desc'));
  
  const q = query(formsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

#### Query 4: Get Patient Detail with All Forms

```javascript
const getPatientDetail = async (patientId) => {
  // Get patient data
  const patientRef = doc(db, 'patients', patientId);
  const patientDoc = await getDoc(patientRef);
  
  if (!patientDoc.exists()) return null;
  
  // Get all forms for this patient
  const formsRef = collection(db, 'formResponses');
  const q = query(formsRef, where('patientId', '==', patientId));
  const formsSnapshot = await getDocs(q);
  
  // Get doctor info
  const doctorId = patientDoc.data().assignedDoctorId;
  const doctorRef = doc(db, 'doctors', doctorId);
  const doctorDoc = await getDoc(doctorRef);
  
  return {
    id: patientId,
    ...patientDoc.data(),
    doctor: doctorDoc.exists() ? doctorDoc.data() : null,
    forms: formsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  };
};
```

### Performance Optimization Strategies

```
CHALLENGE: Large datasets (145+ patients, 300+ forms)
SOLUTION: Implement pagination and lazy loading

1. Pagination for tables:
   - Load 20 patients per page
   - Use firestore limit() and offset()
   - User clicks "Next Page" or "Load More"

2. Search indexing:
   - Create Firestore indexes for common filters
   - Index on (doctorId, date)
   - Index on (formType, status)

3. Caching:
   - Cache doctor list (rarely changes)
   - Cache form definitions (never changes)
   - Use React Query or SWR for data fetching

4. Lazy loading:
   - Load patient details only when requested
   - Load form responses on demand
   - Don't load all data on page load

5. Export optimization:
   - Generate CSV/PDF in Cloud Function
   - Stream large files instead of loading in memory
   - Show progress bar for long operations
```

---

## SECURITY & ACCESS CONTROL

### Admin Panel Access Restrictions

```firestore.rules
// Admin Panel Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admin Panel Routes - Super Admin Only
    match /adminPanel/{document=**} {
      allow read, write: if isAdmin() && isSuperAdmin();
    }
    
    // Doctors Collection - Admin Only
    match /doctors/{doctorId} {
      // Admins can read all
      allow read: if isAdmin();
      // Only super admin can modify
      allow write: if isAdmin() && isSuperAdmin();
      // Doctors can only read their own info
      allow read: if request.auth.uid == doctorId;
    }
    
    // Patients Collection - Admin Only
    match /patients/{patientId} {
      // Admins can read all
      allow read: if isAdmin();
      // Only super admin can delete
      allow delete: if isAdmin() && isSuperAdmin();
      // Doctors can read their assigned patients
      allow read: if getAssignedPatientDoctorId(patientId) == request.auth.uid;
    }
    
    // Form Responses - Admin Read Only
    match /formResponses/{responseId} {
      // Admins can read all forms
      allow read: if isAdmin();
      // Prevent admin from modifying submitted forms
      allow write: if false;
    }
    
    // Audit Logs - Super Admin Only
    match /auditLogs/{logId} {
      // Only super admin can read
      allow read: if isAdmin() && isSuperAdmin();
      // Only system can write (via Cloud Function)
      allow write: if false;
    }
    
    // Exports - Track who exported what
    match /exports/{exportId} {
      // Admin can read their own exports
      allow read: if resource.data.adminId == request.auth.uid && isAdmin();
      // System creates exports (via Cloud Function)
      allow write: if false;
    }
    
    // Helper functions
    function isAdmin() {
      return get(/databases/$(database)/documents/doctors/$(request.auth.uid))
        .data.role in ['admin', 'super_admin'];
    }
    
    function isSuperAdmin() {
      return get(/databases/$(database)/documents/doctors/$(request.auth.uid))
        .data.role == 'super_admin';
    }
    
    function getAssignedPatientDoctorId(patientId) {
      return get(/databases/$(database)/documents/patients/$(patientId))
        .data.assignedDoctorId;
    }
  }
}
```

### User Roles & Permissions

```
ROLE: Super Admin
├─ Access all data
├─ Can create/edit/delete users
├─ Can view audit logs
├─ Can export all data
├─ Can manage admin users
├─ Can change system settings
└─ Cannot modify submitted forms (data integrity)

ROLE: Admin / Study Coordinator
├─ Can view all doctors
├─ Can view all patients
├─ Can view all form responses
├─ Can export data (with audit logging)
├─ Cannot create/delete users
├─ Cannot view audit logs
├─ Cannot change system settings
└─ Cannot modify submitted forms

ROLE: Data Analyst
├─ Can view patients (read-only)
├─ Can view forms (read-only)
├─ Can export data to CSV/PDF
├─ Cannot view doctor details
├─ Cannot manage users
├─ Cannot access settings
└─ Read-only access to everything

ROLE: PI (Principal Investigator)
├─ Can view summary reports
├─ Can view completion statistics
├─ Cannot view raw data
├─ Cannot export individual responses
├─ Cannot access settings
└─ Read-only, high-level view only
```

### Audit Logging

```
EVERY ADMIN ACTION IS LOGGED:

When admin views patient:
  ✓ Log entry created
  ├─ Admin ID: admin_123
  ├─ Action: "view_patient_detail"
  ├─ Resource: Patient P089
  ├─ Timestamp: 2026-01-30T14:30:00Z
  ├─ IP Address: 192.168.1.1
  └─ Duration: 5 minutes

When admin exports data:
  ✓ Log entry created
  ├─ Admin ID: admin_123
  ├─ Action: "export_data"
  ├─ Selected Patients: [P002, P089, P156]
  ├─ Export Format: CSV
  ├─ File Size: 2.5 MB
  ├─ Timestamp: 2026-01-30T15:45:00Z
  └─ File URL: gs://bucket/exports/...

When admin modifies user:
  ✓ Log entry created
  ├─ Admin ID: admin_123
  ├─ Action: "modify_user"
  ├─ User: doc_456 (Dr. Mike Chen)
  ├─ Changes: role: doctor → role: admin
  ├─ Timestamp: 2026-01-30T16:00:00Z
  └─ Reason: [If provided by admin]
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Core Admin Panel (Week 1-2)
- [x] Design completed
- [ ] Create admin layout & navigation
- [ ] Build dashboard with key metrics
- [ ] Implement doctor management page
- [ ] Implement patient list page
- [ ] Add search & filter functionality

**Deliverables:**
- Admin route protection (auth middleware)
- Dashboard showing overview
- Doctor list with details modal
- Patient list with details modal

### Phase 2: Form Responses & Analytics (Week 3)
- [ ] Build form responses viewer
- [ ] Add filtering by form type & status
- [ ] Create analytics dashboard
- [ ] Implement completion rate calculations
- [ ] Add doctor performance metrics

**Deliverables:**
- Form responses list page
- Form detail viewer
- Analytics with charts
- Completion rate tracking

### Phase 3: Data Export System (Week 4)
- [ ] Implement multi-select functionality
- [ ] Create CSV export logic (deep structure)
- [ ] Create PDF export logic (clinical summary)
- [ ] Build export progress tracking
- [ ] Add export history page

**Deliverables:**
- Multi-select UI for patients
- CSV export with all fields
- PDF export with summaries
- Export queue management
- Export history log

### Phase 4: Audit Logging & Security (Week 5)
- [ ] Implement audit log system
- [ ] Add access control middleware
- [ ] Create audit log viewer
- [ ] Implement role-based permissions
- [ ] Add security headers

**Deliverables:**
- Audit log collection in Firestore
- Admin action tracking
- Audit log viewer (super admin only)
- Role-based page access
- Security monitoring

### Phase 5: Testing & Optimization (Week 6)
- [ ] Unit tests for admin functions
- [ ] Performance testing with 1000+ records
- [ ] Security testing & penetration tests
- [ ] User acceptance testing
- [ ] Performance optimization

**Deliverables:**
- Test suite with >80% coverage
- Performance benchmark results
- Security audit report
- UAT sign-off

---

## COMPONENT STRUCTURE

```
/app/admin/
│
├─ layout.tsx
│  └─ Admin layout with sidebar & header
│
├─ page.tsx
│  └─ Dashboard overview
│
├─ doctors/
│  ├─ page.tsx (list)
│  └─ [id]/page.tsx (detail)
│
├─ patients/
│  ├─ page.tsx (list)
│  └─ [id]/page.tsx (detail with forms)
│
├─ forms/
│  ├─ page.tsx (form responses list)
│  └─ [id]/page.tsx (response detail)
│
├─ analytics/
│  └─ page.tsx (metrics & reports)
│
├─ exports/
│  ├─ page.tsx (export history)
│  └─ new/page.tsx (create new export)
│
├─ audit-logs/
│  └─ page.tsx (admin action logs)
│
├─ settings/
│  └─ page.tsx (admin settings)
│
└─ components/
   ├─ DoctorsList.tsx
   ├─ PatientsList.tsx
   ├─ PatientDetail.tsx
   ├─ FormResponsesList.tsx
   ├─ ExportModal.tsx
   ├─ AnalyticsDashboard.tsx
   ├─ AuditLog.tsx
   ├─ AdminHeader.tsx
   ├─ AdminSidebar.tsx
   └─ ...
```

---

## DATABASE & STORAGE

### Firestore Collections to Create

```
✓ patients/ - existing, used by admin
✓ doctors/ - existing, used by admin
✓ forms/ - existing, used by admin
✓ formResponses/ - existing, used by admin
+ adminPanel/ - NEW: admin panel settings
+ auditLogs/ - NEW: admin action tracking
+ exports/ - NEW: export history & metadata
```

### Cloud Storage

```
gs://bucket/exports/
├─ CSV/
│  └─ P002_P089_P156_export_20260130.csv
├─ PDF/
│  └─ P002_P089_P156_report_20260130.pdf
└─ Archive/
   └─ [old exports]
```

---

## SUMMARY

### What Will Be Built

✅ **Admin Dashboard**
- Overview with key metrics
- Recent activity timeline
- Enrollment progress tracking

✅ **Doctor Management**
- List all doctors with statistics
- View doctor performance metrics
- Track doctor activities

✅ **Patient Management**
- List all patients with status
- View complete patient details
- Track patient forms and responses

✅ **Form Response Tracking**
- View all submitted forms
- Filter by type, status, date
- View detailed form responses

✅ **Data Export System**
- Multi-select patients
- Export as CSV (deep structure, all fields)
- Export as PDF (clinical summaries)
- Track export history

✅ **Analytics & Reports**
- Enrollment trends
- Completion rate tracking
- Doctor performance metrics
- Data quality metrics

✅ **Security & Auditing**
- Role-based access control
- Super Admin / Admin / Data Analyst roles
- Complete audit logging of all admin actions
- Data integrity protections

### Next Steps

1. **User Approval** - Confirm this design meets your needs
2. **Clarifications** - Any questions about features or structure?
3. **Start Coding** - Once approved, we'll implement Phase 1 (Core Admin Panel)

---

*Design Document Version: 1.0*  
*Created: January 30, 2026*  
*Status: Ready for Implementation*
