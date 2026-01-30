# Admin Panel Setup Guide
**Date:** January 30, 2026  
**Status:** Ready for Implementation

---

## STEP 1: CREATE ADMIN ACCOUNTS (FIREBASE CONSOLE)

### Method: Via Firebase Console (Manual)

#### Prerequisites
- Access to Firebase Console
- Project: `kollectcare-rwe-study`
- Firestore database access

#### Step-by-Step Instructions

**1. Open Firebase Console**
```
1. Go to: https://console.firebase.google.com/
2. Select project: "kollectcare-rwe-study"
3. Click "Firestore Database"
4. Click "Start Collection"
```

**2. Create "admins" Collection**
```
1. Collection ID: admins
2. Click "Next"
3. Click "Auto ID" to generate first document ID
4. Fill in the following fields:
```

**3. Add First Admin Document**

```javascript
{
  "email": "admin@hospital.com",
  "passwordHash": "[HASH - See Step 2 below]",
  "firstName": "Super",
  "lastName": "Admin",
  "role": "super_admin",
  "status": "active",
  "createdAt": timestamp,
  "lastLogin": timestamp,
  "loginCount": 0,
  "permissions": [
    "view_doctors",
    "view_patients", 
    "view_forms",
    "export_data",
    "view_analytics",
    "manage_admins",
    "view_audit_logs",
    "change_settings",
    "delete_data",
    "manage_roles"
  ]
}
```

---

## STEP 2: HASH PASSWORDS

You need to create bcrypt hashes for admin passwords. **DO NOT STORE PLAIN TEXT PASSWORDS.**

### Option A: Use Online BCrypt Tool (TESTING ONLY)
```
1. Go to: https://bcrypt-generator.com/
2. Enter password: "YourSecurePassword123"
3. Set rounds to: 10
4. Copy the hash
5. Paste into passwordHash field
```

### Option B: Generate Locally (Node.js)
```bash
# Install bcryptjs
npm install bcryptjs

# Create script: hash-password.js
const bcrypt = require('bcryptjs');

const password = 'YourSecurePassword123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log('Password Hash:', hash);
});

# Run:
node hash-password.js

# Output:
# Password Hash: $2a$10$8B.5j...encrypted...hash...
```

### Option C: Use Firebase Cloud Function
We'll create a Cloud Function to hash passwords and create admin accounts.

---

## STEP 3: CREATE EXAMPLE ADMIN ACCOUNTS

Here are 3 example admin accounts to create in Firebase:

### Account 1: Super Admin
```
Document ID: admin_001
Email: admin@hospital.com
Password: AdminPass123!
Password Hash: $2a$10$[bcrypt hash here]
Role: super_admin
Status: active
```

### Account 2: Study Coordinator
```
Document ID: admin_002
Email: coordinator@hospital.com
Password: CoordPass123!
Password Hash: $2a$10$[bcrypt hash here]
Role: admin
Status: active
```

### Account 3: Data Analyst
```
Document ID: admin_003
Email: analyst@hospital.com
Password: AnalystPass123!
Password Hash: $2a$10$[bcrypt hash here]
Role: admin
Status: active
```

---

## STEP 4: DETAILED FIREBASE CONSOLE STEPS

### Creating First Admin in Console

**1. Click "Start collection"**
```
Firestore Database
  └─ + Start collection
```

**2. Enter Collection Name**
```
Collection ID: admins
```

**3. Add First Document**
```
Click "Auto ID" for document ID
(Firebase will generate: admin_123456789)
```

**4. Add Fields**

| Field Name | Type | Value |
|-----------|------|-------|
| email | String | admin@hospital.com |
| firstName | String | Super |
| lastName | String | Admin |
| role | String | super_admin |
| status | String | active |
| passwordHash | String | $2a$10$[hash...] |
| createdAt | Timestamp | Current date/time |
| lastLogin | Timestamp | Current date/time |
| loginCount | Number | 0 |

**5. Add Array Field (permissions)**
- Click "Add field"
- Field name: `permissions`
- Type: Array
- Add each permission:
  - view_doctors
  - view_patients
  - view_forms
  - export_data
  - view_analytics
  - manage_admins
  - view_audit_logs
  - change_settings
  - delete_data
  - manage_roles

**6. Click "Save"**

---

## STEP 5: ADD MORE ADMINS

Repeat Step 4 for each additional admin:

### Adding Admin 2
**Document ID:** admin_002 (or use Auto ID)
```
{
  "email": "coordinator@hospital.com",
  "firstName": "Study",
  "lastName": "Coordinator",
  "role": "admin",
  "status": "active",
  "passwordHash": "$2a$10$[hash...]",
  "createdAt": timestamp,
  "lastLogin": timestamp,
  "loginCount": 0,
  "permissions": [
    "view_doctors",
    "view_patients",
    "view_forms",
    "export_data",
    "view_analytics"
  ]
}
```

### Adding Admin 3
**Document ID:** admin_003 (or use Auto ID)
```
{
  "email": "analyst@hospital.com",
  "firstName": "Data",
  "lastName": "Analyst",
  "role": "admin",
  "status": "active",
  "passwordHash": "$2a$10$[hash...]",
  "createdAt": timestamp,
  "lastLogin": timestamp,
  "loginCount": 0,
  "permissions": [
    "view_doctors",
    "view_patients",
    "view_forms",
    "export_data",
    "view_analytics"
  ]
}
```

---

## STEP 6: TEST ADMIN LOGIN

### Test Super Admin
```
1. Open app: https://app--kollectcare-rwe-study.us-central1.hosted.app/admin/login
2. Email: admin@hospital.com
3. Password: AdminPass123!
4. Click "Sign In"
5. Should redirect to: /admin/dashboard
```

### Test Regular Admin
```
1. Open app: https://app--kollectcare-rwe-study.us-central1.hosted.app/admin/login
2. Email: coordinator@hospital.com
3. Password: CoordPass123!
4. Click "Sign In"
5. Should redirect to: /admin/dashboard
```

### Troubleshooting Login
```
If login fails:
1. Check email in Firestore (exact match)
2. Check password hash is correct
3. Check role is "admin" or "super_admin"
4. Check status is "active"
5. Check passwordHash field exists
6. See browser console for error details
```

---

## STEP 7: ADMIN FEATURES BY ROLE

### Super Admin Permissions
```
✅ View all doctors
✅ View all patients
✅ View all forms
✅ Export data (CSV/PDF)
✅ View analytics
✅ Manage admin users
✅ View audit logs (complete history)
✅ Change system settings
✅ Delete data
✅ Manage admin roles
```

### Regular Admin Permissions
```
✅ View all doctors
✅ View all patients
✅ View all forms
✅ Export data (CSV/PDF)
✅ View analytics
❌ Manage admin users
❌ View audit logs
❌ Change system settings
❌ Delete data
❌ Manage admin roles
```

---

## STEP 8: MANAGE MULTIPLE ADMINS

### Creating New Admin (After First Setup)

**Option A: Firebase Console (Manual)**
```
1. Go to Firestore > admins collection
2. Click "Add document"
3. Click "Auto ID"
4. Fill in all fields (same as Step 4)
5. Click "Save"
```

**Option B: Via Admin UI (Future)**
```
1. Login as super admin
2. Go to /admin/settings
3. Click "Add New Admin"
4. Fill form
5. System generates hash automatically
6. Creates account in Firestore
```

### Disable Admin Account
```
1. Go to Firestore > admins collection
2. Open admin document
3. Change "status" from "active" to "inactive"
4. Save
5. Admin can no longer login
```

### Change Admin Password
```
1. Admin logs in to /admin/settings
2. Click "Change Password"
3. Enter old password
4. Enter new password
5. System hashes new password
6. Updates Firestore
```

---

## STEP 9: SECURITY BEST PRACTICES

### Password Requirements
```
✅ Minimum 8 characters
✅ At least 1 uppercase letter
✅ At least 1 lowercase letter
✅ At least 1 number
✅ At least 1 special character
✅ Never share with others
✅ Change every 90 days
```

### Admin Account Security
```
✅ Use strong, unique passwords
✅ Enable 2FA when available
✅ Review audit logs regularly
✅ Disable inactive accounts
✅ Limit number of admins
✅ Separate roles by responsibility
✅ Monitor login times
✅ Log all admin actions
```

---

## STEP 10: NEXT STEPS

Once admin accounts are created:

1. ✅ **Test Admin Login** - Verify all admins can login
2. ✅ **Review Dashboard** - Check all metrics display correctly
3. ✅ **Test Data Export** - Verify CSV/PDF exports work
4. ✅ **Review Audit Logs** - Check super admin can see logs
5. ✅ **Doctor App Unaffected** - Verify doctors still work normally

---

## SETUP CHECKLIST

- [ ] Create "admins" collection in Firestore
- [ ] Create super admin account (admin@hospital.com)
- [ ] Create regular admin account (coordinator@hospital.com)
- [ ] Create data analyst account (analyst@hospital.com)
- [ ] Hash all passwords with bcrypt
- [ ] Test super admin login
- [ ] Test regular admin login
- [ ] Test data analyst login
- [ ] Verify audit logging works
- [ ] Check doctor app still works
- [ ] Review all admin permissions
- [ ] Enable 2FA (if available)
- [ ] Document admin credentials securely

---

## FIRESTORE STRUCTURE FINAL

```
firestore/
├─ patients/ (existing)
│  └─ P001, P002, P003, ...
│
├─ doctors/ (existing)
│  └─ doc_123, doc_456, doc_789, ...
│
├─ formResponses/ (existing)
│  └─ resp_P001_baseline, resp_P001_followup, ...
│
├─ admins/ (NEW)
│  ├─ admin_001
│  │  ├─ email: "admin@hospital.com"
│  │  ├─ role: "super_admin"
│  │  ├─ status: "active"
│  │  └─ permissions: [...]
│  │
│  ├─ admin_002
│  │  ├─ email: "coordinator@hospital.com"
│  │  ├─ role: "admin"
│  │  ├─ status: "active"
│  │  └─ permissions: [...]
│  │
│  └─ admin_003
│     ├─ email: "analyst@hospital.com"
│     ├─ role: "admin"
│     ├─ status: "active"
│     └─ permissions: [...]
│
├─ auditLogs/ (NEW)
│  └─ log_2026_01_30_001, log_2026_01_30_002, ...
│
└─ exports/ (NEW)
   └─ export_2026_01_30_001, export_2026_01_30_002, ...
```

---

## VIDEO WALKTHROUGH

[Optional: Add links to video tutorials if available]

---

*Admin Setup Guide Version: 1.0*  
*Last Updated: January 30, 2026*  
*Status: Ready for Deployment*
