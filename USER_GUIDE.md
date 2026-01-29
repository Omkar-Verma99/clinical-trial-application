# Clinical Trial Application - User Guide

**Version:** 2.0  
**Last Updated:** January 29, 2026  
**Status:** Production Ready

---

## 📱 What is This App?

This is a **Clinical Trial Management System** for doctors to manage patient assessments during a diabetes treatment study.

**Key Points:**
- ✅ Works **offline** (no internet needed after first login)
- ✅ **Secure** - HIPAA compliant, patient data anonymized
- ✅ **Simple** - Clean, straightforward interface
- ✅ **Automatic** - Data syncs when you're online

---

## 🚀 Getting Started (First Time)

### 1. Create Your Account (Requires Internet)

1. Open the app in your web browser
2. Click **"Sign Up"**
3. Enter:
   - Your email address
   - A strong password (8+ characters)
   - Your full name
   - Your medical license/registration number
4. Click **"Sign Up"**
5. Verify your email if prompted

### 2. First Login (Requires Internet)

1. Go back to login page
2. Enter your email and password
3. Click **"Login"**
4. You'll see: **"Welcome! Ready for offline access"**

**What Happens Behind the Scenes:**
- Server verifies you're an authorized doctor
- Your patient data is downloaded and cached
- Your credentials are securely stored (encrypted)
- You're now ready to work offline

### 3. You're Ready!

After first login, you can:
- ✅ Work offline for 30 days
- ✅ Login anytime (online or offline)
- ✅ Create and edit patient forms
- ✅ View all your patient data

---

## 💻 Main Screens

### Dashboard (Home)
- **Patient List** - All your patients at a glance
- **Recent Activity** - Latest changes and updates
- **Quick Actions** - Add patient, view reports
- **Status** - Online/Offline indicator (green = online, red = offline)

### Patient Details Page
- **Patient Info** - Demographics, medical history
- **Baseline Form** - Initial assessment (Week 0)
- **Follow-up Forms** - All follow-up visits
- **Comparison View** - Baseline vs follow-up side-by-side
- **Export** - Download as PDF/CSV/Excel

### Patient List
- **Search** - Find by patient code (PT0001, etc.)
- **Filter** - View by status (completed, pending)
- **Add New** - Click to add new patient
- **Sort** - Click column headers to sort

---

## 👤 Adding Patients

### Step 1: Click "Add Patient"

1. From dashboard, click **"Add Patient"** button
2. You'll see the patient form

### Step 2: Fill Patient Information

**Required Fields:**
- **Patient Code** - PT0001, PT0002, etc. (system auto-generates)
- **First Name** - Patient's first name
- **Last Name** - Patient's last name
- **Email** - Patient's email (optional)
- **Date of Birth** - Their birthday
- **Gender** - Male/Female
- **Duration of Diabetes** - How many years with diabetes

### Step 3: Save as Draft or Submit

- **Save as Draft** - Incomplete data, can finish later
- **Submit** - Ready to proceed to baseline form

**Notes:**
- Drafts save automatically
- Can edit anytime
- Works offline too

---

## 📋 Recording Patient Data

### Baseline Form (Week 0 Assessment)

**When:** First visit with patient  
**What:** Initial measurements and health status

**Fields to Fill:**
1. **Vital Signs**
   - Weight (kg)
   - Height (cm)
   - Blood Pressure (Systolic/Diastolic)

2. **Clinical Parameters**
   - HbA1c (%)
   - FPG - Fasting Plasma Glucose (mg/dL)
   - BMI (auto-calculated from weight/height)

3. **Medical History**
   - Current medications
   - Medication dosages
   - Other medical conditions

4. **Assessment Notes**
   - Any additional notes

**Tips:**
- All numeric fields are validated (reasonable ranges)
- BMI calculates automatically
- Save as draft if unsure
- Can edit anytime before final submission

### Follow-Up Form (Week 12 Assessment)

**When:** End-of-study visit (Week 12 ± 2 weeks)  
**What:** Outcome measurements and treatment evaluation

**Fields to Fill:**
1. **Visit Information**
   - Visit date
   - Visit number (auto-assigned)

2. **Outcome Measurements**
   - Weight (kg)
   - Blood Pressure
   - HbA1c (%)
   - FPG (mg/dL)

3. **Treatment Response**
   - **HbA1c Response:**
     - Response (≥1% reduction)
     - Partial Response (0.5-<1% reduction)
     - No Response (<0.5% reduction)
   - **Efficacy:** Excellent / Good / Fair / Poor
   - **Tolerability:** Excellent / Good / Fair / Poor

4. **Treatment Status**
   - Still taking medication? (Yes/No)
   - If No: Reason for discontinuation
   - Missed doses: None / Some / Many

5. **Safety & Adverse Events**
   - Any adverse events?
   - Type and severity
   - Action taken

**Tips:**
- System auto-categorizes HbA1c response
- Compare with baseline automatically
- Works offline - data saved locally
- Multiple follow-ups per patient allowed

---

## 🔄 Offline Mode

### How It Works

**First Login (Online):**
```
You Login → System Caches Your Data → Credentials Saved
```

**Working Offline:**
```
You Open App (No Internet) → Login with Saved Credentials → 
Work Normally → Everything Saved Locally
```

**Reconnecting (Online):**
```
Internet Returns → App Detects Connection → 
Auto-Sync All Pending Changes → Success ✓
```

### What Works Offline ✅

| Feature | Offline | Online |
|---------|---------|--------|
| View patient list | ✅ | ✅ |
| View patient details | ✅ | ✅ |
| View forms | ✅ | ✅ |
| Create baseline form | ✅ | ✅ |
| Create follow-up form | ✅ | ✅ |
| Edit existing forms | ✅ | ✅ |
| Save drafts | ✅ | ✅ |
| Compare baseline vs follow-up | ✅ | ✅ |
| View reports | ✅ | ✅ |
| Export PDF/CSV | ✅* | ✅ |
| Sync data to server | ❌ | ✅ |

*Offline: Uses cached data

### 30-Day Verification Window

**What is it?**

You can work offline for up to **30 days** after your last online login. After that, you need to login online once to verify your credentials (takes ~30 seconds).

**Example Timeline:**
```
Mon, Jan 1: Login online ✓
Jan 1-30: Can login offline anytime ✓
Jan 31-Feb 1: Still works offline ✓
Feb 1: After 30 days, need to verify
Connect to internet → Login online → Good for another 30 days ✓
```

**Why 30 Days?**
- Security (credentials expire)
- Healthcare compliance requirements
- Standard industry practice
- Automatic encryption reset

**When 30 Days Expires:**
1. Try to login offline
2. See message: "Please verify online"
3. Connect to internet
4. Login with your email & password
5. See: "Verification successful! Good for another 30 days"
6. Done! Can go offline again

---

## 📊 Viewing Results

### Patient Dashboard

Shows all information about one patient:
- **Patient Info** - Demographics
- **Baseline** - Week 0 measurements
- **Follow-ups** - All follow-up visits
- **Comparison** - Baseline vs Latest Follow-up

### Comparison View

**What It Shows:**
- Baseline measurements (left side)
- Follow-up measurements (right side)
- Changes (⬆️ improved, ⬇️ declined, → no change)
- Outcome category (Response, Partial Response, No Response)
- Safety status (Green = safe, Yellow = caution)

**Color Coding:**
- 🟢 **Green** - Good response / safe
- 🟡 **Yellow** - Moderate / caution
- 🔴 **Red** - Poor response / concern

**Interpretation:**
- Look at the arrows to see if parameters improved
- Check the outcome badge for overall assessment
- Review notes section for clinical context

### Reports & Analytics (Dashboard)

**Report Page Features:**
- Patient count (total enrolled)
- Response rate (% showing improvement)
- Average parameter changes
- Export trial data

**Export Options:**
- **CSV** - Spreadsheet format (Excel)
- **PDF** - Printable format
- **JSON** - Raw data format

---

## 💾 Data Management

### Auto-Save

- Forms save automatically every few seconds
- You'll see: "⏳ Saving..." → "✓ Saved"
- Works online AND offline
- No manual save needed

### Drafts

**Creating a Draft:**
1. Start filling a form
2. Click "Save as Draft"
3. Form saves with incomplete data

**Continuing a Draft:**
1. Go back to patient
2. Click "Edit Baseline" or "Edit Follow-up"
3. Your draft data appears
4. Continue filling and save again

**Deleting a Draft:**
1. Click "Delete Draft"
2. Confirm deletion
3. Draft is removed (can't undo)

### Syncing

**Manual Sync:**
- Click "Sync Now" button (if available)
- App syncs all pending changes

**Automatic Sync:**
- Happens automatically when you:
  - Save a form (if online)
  - Go online after being offline
  - Open the app (if pending items)

**What Gets Synced:**
- New patients
- New/updated forms
- Deleted forms
- All metadata

**Sync Status:**
- ✓ All synced - Everything up to date
- ⏳ Syncing - In progress
- ⚠️ Pending - Waiting for sync
- ❌ Failed - Has errors (try again)

---

## 📤 Exporting Data

### Export Patient Record

**From Patient Detail Page:**

1. Click **"Export"** button
2. Choose format:
   - **PDF** - Formatted document
   - **CSV** - Spreadsheet
   - **Excel** - Excel workbook
3. Click **"Download"**
4. File downloads to your computer

**What's Included:**
- Patient demographics
- Baseline form data
- All follow-up forms
- Comparison summary
- Anonymized (only patient code, no name)

### Export Trial Data

**From Reports Page:**

1. Click **"Export Trial Data"**
2. Choose format
3. Click **"Download"**

**What's Included:**
- All patients
- All baseline forms
- All follow-up forms
- Summary statistics
- Completely anonymized

**Uses:**
- Analysis in Excel/spreadsheet
- Reporting to investigators
- Regulatory submissions
- Statistical analysis

---

## 🔐 Security & Privacy

### Your Password

- **Keep Secret** - Never share with anyone
- **Strong** - Use mix of letters, numbers, symbols
- **Change Regularly** - Every 90 days recommended
- **Forgotten** - Can reset via email

### Patient Data Privacy

- **Anonymized** - Only patient code visible (PT0001, etc.)
- **No Real Names** - In exports and reports
- **Encrypted** - In transit and at rest
- **Secure** - HIPAA compliant
- **Your Patients** - Only you can see your patients

### Device Security

- **Lock Your Device** - Password/biometric
- **Don't Share Device** - App has access to patient data
- **Logout When Done** - If sharing device
- **Update OS** - Keep device updated

### Password Reset

**If You Forget:**
1. Click "Forgot Password"
2. Enter your email
3. Check email for reset link
4. Click link and create new password
5. Login with new password
6. Next online login caches new password

---

## ⚠️ Troubleshooting

### Problem: Can't Login Offline

**Possible Causes:**
- Haven't logged in online first (system needs to cache data)
- More than 30 days since last online login
- Incorrect email or password

**Solutions:**
1. Connect to internet
2. Login with correct email & password
3. Wait for successful online login
4. Try offline login again
5. Contact support if still failing

### Problem: Data Not Syncing

**Possible Causes:**
- No internet connection
- Temporary server issue
- Too much data to sync

**Solutions:**
1. Check internet connection
2. Try clicking "Sync Now"
3. Wait a few minutes
4. Restart the app
5. Contact support if persists

### Problem: Form Validation Error

**Common Validation Issues:**
- **Weight too low/high** - Check entered value
- **HbA1c out of range** - Typical range 4-15%
- **Age negative** - Check date of birth
- **Missing required field** - Required fields marked with *

**Solutions:**
1. Review error message
2. Check entered value is realistic
3. Correct value
4. Try saving again
5. Contact support if value is correct

### Problem: Export File Won't Download

**Possible Causes:**
- Browser blocked the download
- Pop-ups disabled
- Insufficient disk space

**Solutions:**
1. Check browser notifications (allow)
2. Enable pop-ups for this site
3. Clear browser cache
4. Try different browser
5. Contact support if still failing

### Problem: Forms Disappear

**Possible Causes:**
- Accidentally deleted
- Sync conflict
- Cache cleared

**Recovery:**
- Check trash/deleted items (if available)
- Logout and login again
- Try another browser/device
- Contact support (may have backup)

---

## ❓ FAQ

### Q: Do I need internet for everything?

**A:** No! After first login, you only need internet to:
- Change password
- Verify account (once per month)
- See real-time updates from other doctors
- Sync new data to server

Everything else works offline.

### Q: What if I lose my device?

**A:** Your data is safe:
- Encrypted locally on device
- Also backed up on server
- Can login on new device
- Old device data not accessible without password

### Q: Can I use on multiple devices?

**A:** Yes! 
- Login on multiple computers
- Data syncs automatically
- Each device has offline cache
- Changes sync between devices

### Q: How long does data stay on device?

**A:** Indefinitely until you:
- Logout
- Clear browser cache
- Uninstall app
- Delete IndexedDB (advanced)

### Q: Can multiple doctors access same patient?

**A:** No, by design:
- Each patient assigned to one doctor
- Prevents data conflicts
- Ensures clear responsibility
- Contact admin to reassign

### Q: What if data conflicts online?

**A:** Latest version wins:
- Most recent changes always kept
- Older changes overwritten
- Resolved automatically
- No action needed

### Q: How do I backup my data?

**A:** Automatic backup:
- Server always has copy
- Export to CSV/Excel
- Backup to external drive
- Contact IT for full backup

### Q: Is the app HIPAA compliant?

**A:** Yes!
- Patient data anonymized
- Encryption in transit/at rest
- Audit logging
- Access controls
- See HIPAA_COMPLIANCE_GUIDE.md

### Q: What browsers are supported?

**A:** Latest 2 versions of:
- Chrome / Chromium
- Firefox
- Safari
- Edge

Minimum: HTML5, IndexedDB, Service Worker support

### Q: Can I uninstall and reinstall?

**A:** Yes, but:
- All local data is deleted
- Data still on server
- Login again to re-download
- Cache rebuilds automatically

---

## 📞 Getting Help

### Common Issues

**Still having issues?**
1. Check this guide first
2. Try troubleshooting section above
3. Restart the app
4. Restart your device
5. Contact IT support

### Technical Support

Contact your IT administrator or:
- Email: support@example.com
- Phone: 1-800-XXX-XXXX
- Help Desk: help@example.com

### Report a Bug

Found an issue?
1. Document what happened
2. Note your browser/device
3. Include screenshot if possible
4. Email to support with details

### Request a Feature

Have an idea?
1. Describe the feature
2. Explain how it helps
3. Email to support
4. We'll review and consider

---

## 💡 Tips & Best Practices

### Efficiency Tips
1. **Create multiple follow-ups** - Don't delete, just add new
2. **Save drafts regularly** - Every few minutes
3. **Use compare view** - Analyze response quickly
4. **Export regularly** - Backup your data
5. **Sync often** - When online, sync immediately

### Data Entry Tips
1. **Double-check values** - Before submitting
2. **Keep notes detailed** - For context
3. **Use correct units** - kg/cm/mg/dL
4. **Timestamps matter** - For compliance
5. **Names never in notes** - For privacy

### Offline Tips
1. **Pre-download patient data** - Login online first
2. **Check sync status** - Before going offline
3. **Verify connection** - Before critical work
4. **Backup device** - Don't lose device
5. **Logout carefully** - If sharing device

### Security Tips
1. **Never share password** - Not even with IT
2. **Logout when done** - Especially shared devices
3. **Update OS regularly** - Security patches
4. **Lock your device** - Always when away
5. **Verify site** - Before entering password

---

## 📚 Additional Resources

For technical details, see:
- **[README.md](README.md)** - Complete technical overview
- **[HIPAA_COMPLIANCE_GUIDE.md](HIPAA_COMPLIANCE_GUIDE.md)** - Privacy & security details
- **[SERVICE_WORKER_FIX_EXPLANATION.md](SERVICE_WORKER_FIX_EXPLANATION.md)** - Offline technical details

---

**Need help?** Contact your IT administrator  
**Last Updated:** January 29, 2026  
**Version:** 2.0

