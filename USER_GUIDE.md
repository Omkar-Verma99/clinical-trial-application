# Clinical Trial Application - Complete User Guide

**Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**Document Type:** Comprehensive User Guide  
**Status:** Production Ready

---

## Welcome to Clinical Trial Application

This comprehensive guide covers everything you need to know to use the Clinical Trial Application effectively, including **complete offline support** for areas with unreliable internet connectivity.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Getting Started (First Time)](#getting-started-first-time)
3. [Login & Authentication](#login--authentication)
4. [Offline Mode Explained](#offline-mode-explained)
5. [Managing Patients](#managing-patients)
6. [Recording Data](#recording-data)
7. [Viewing Results & Comparisons](#viewing-results--comparisons)
8. [Syncing & Data Management](#syncing--data-management)
9. [Mobile Features](#mobile-features)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)
12. [Best Practices](#best-practices)

---

## System Requirements

### Browser Requirements
- **Chrome, Firefox, Safari, or Edge** (latest 2 versions)
- **JavaScript enabled**
- **IndexedDB enabled** (for offline functionality)
- **localStorage enabled**

### Device Support

| Device | Status | Notes |
|--------|--------|-------|
| Desktop/Laptop | ✅ Full Support | Optimal experience, all features |
| Tablet | ✅ Full Support | Touch-optimized interface |
| Mobile | ✅ Full Support | Responsive design, mobile-optimized forms |

### Network Requirements
- **First Login:** Internet connection required (one-time verification)
- **Offline Usage:** Works for 30 days without internet
- **Re-verification:** ~30 seconds online every 30 days
- **Auto-Sync:** Happens automatically when internet is available

---

## Getting Started (First Time)

### Step 1: Open the Application

Navigate to the application URL in your web browser:
- **Development:** http://localhost:3000
- **Production:** https://your-app-domain.com

### Step 2: Sign Up for an Account

1. Click **"Sign Up"** button on the landing page
2. Fill in your information:
   - **Email Address** - Your work email
   - **Password** - Create a strong password (8+ characters)
   - **Full Name** - Your complete name
   - **Registration/License Number** - Your medical credentials
3. Click **"Sign Up"** to create your account
4. Verify your email (if verification is enabled)

### Step 3: First Login (Must Be Online)

1. Click **"Login"** on the landing page
2. Enter your email address
3. Enter your password
4. Click **"Login"**
5. System verifies your credentials with the server
6. Once verified:
   - Your credentials are encrypted and stored locally (AES-256)
   - Your patient list is pre-cached
   - Offline access is enabled for 30 days

**Important:** Your first login MUST be online. The server needs to verify you're an authorized doctor before offline access is enabled.

### Step 4: Set Up Your Profile (Optional)

1. Go to **Settings** (if available)
2. Update your:
   - Full name
   - Contact information
   - Study site designation
   - Preferences

---

## Login & Authentication

### Logging In (Online)

**When you have internet:**

1. Go to the login page
2. Enter your email address
3. Enter your password
4. Click **"Login"**
5. You're logged in and can access all features

**What Happens Automatically:**
- ✅ Your credentials are securely encrypted (AES-256)
- ✅ Your patient list is updated
- ✅ Any pending data is synced to the server
- ✅ Your offline access counter is reset

### Logging In (Offline)

**When you DON'T have internet:**

1. Go to the login page
2. Enter your email address (must match what you registered)
3. Enter your password (must be correct)
4. Click **"Login"**
5. System checks your locally stored encrypted credentials
6. If credentials match, you're logged in offline ✓

**What You Can Do Offline:**
- ✅ View your patient list
- ✅ View patient details
- ✅ View baseline forms
- ✅ View follow-up forms
- ✅ Add new patients
- ✅ Add new forms
- ✅ Edit existing forms
- ✅ View reports and comparisons

**What You Can't Do Offline:**
- ❌ Change your password
- ❌ Change account settings
- ❌ Add new doctor accounts

### Monthly Re-Verification

**How It Works:**

After 30 days of your last online login, you'll see a message:
> "Monthly re-verification required. Please login online to verify your account."

**What to Do:**

1. Connect to the internet
2. Go back to the login page
3. Enter your email and password (same as before)
4. Click **"Login"**
5. You'll see: "Verification successful! Good for another 30 days"
6. You're set for another 30 days of offline access

**Takes:** ~30 seconds  
**How Often:** Once per month (approximately)  
**Why?** Security best practice (same as banking apps)

### Password Management

**Changing Your Password:**

1. Go to **Settings**
2. Click **"Change Password"**
3. Enter your current password
4. Enter your new password
5. Confirm your new password
6. Click **"Save"**

**Requires:** Internet connection

**Forgot Your Password:**

1. On the login page, click **"Forgot Password?"**
2. Enter your email address
3. Check your email for a reset link
4. Click the link and create a new password
5. Go back to login with your new password

**Requires:** Internet connection

**Important:** Your new password will NOT work offline until you login online once. The new password will be encrypted and stored locally.

---

## Offline Mode Explained

### What is Offline Mode?

**Simple Answer:**  
Work without internet and your data stays safe and is saved.

**Technical Answer:**  
Your device stores encrypted local copies of your data and automatically syncs with the server when you reconnect to the internet.

### How It Works (3 Steps)

#### Step 1: First Login (Online Required)
```
You → Open App → Enter Email & Password → 
Server Verifies Your Identity → 
Credentials Encrypted & Stored → Access Granted
```

**What Happens:**
- Server confirms you're an authorized doctor
- Your credentials are securely encrypted (AES-256)
- Your patient list is cached locally
- Sync database is initialized
- You're now ready for offline use

#### Step 2: Work Offline
```
You → Open App → Login with Stored Credentials → 
Credentials Decrypted → Access Granted → Work Freely
```

**What Happens:**
- App checks if internet is available (shows offline indicator)
- Uses locally stored encrypted credentials
- All forms and data saved to local device
- No internet needed
- Everything saved safely locally

#### Step 3: Sync When Online
```
You → Connect to Internet → App Detects Connection → 
Auto-Sync Pending Data → Server Validation → 
All Data Backed Up
```

**What Happens:**
- App automatically detects internet connection
- Sends all pending changes to server
- Server validates the data
- Updates are confirmed
- Green "Synced" indicator appears

### The 30-Day Window

#### How It Works

You can work offline for **30 days** after your last online login.

**Example Timeline:**
- Monday, Jan 1: Login online
- Jan 1-30: Can login offline anytime
- Feb 1: Need to verify online once (~30 seconds)
- Feb 1-Mar 2: Can login offline again
- Mar 3: Need to verify online once
- And so on...

#### Why 30 Days?

✅ **Security:** Credentials expire for safety  
✅ **Compliance:** Healthcare regulations require periodic verification  
✅ **Industry Standard:** Same as major banking apps  
✅ **Technology:** Resets encryption keys automatically  

#### What Happens After 30 Days?

1. Try to login offline
2. See message: **"Please verify online"**
3. Connect to internet
4. Login once with email & password
5. See: **"Verification successful! Good for another 30 days"**
6. Done! Good for another 30 days

#### No Worries!

This is **normal and expected**:
- ❌ NOT an error
- ❌ NOT permanent
- ✅ Happens once per month
- ✅ Takes ~30 seconds
- ✅ All data remains safe

### What Works Offline

#### ✅ Full Offline Support

- **Patient Management**
  - ✓ View your patient list (pre-cached)
  - ✓ View patient details and history
  - ✓ Add new patients (queued for sync)
  - ✓ Search and filter patients

- **Forms & Data Entry**
  - ✓ Add baseline forms (Week 0)
  - ✓ Add follow-up forms (Week 12)
  - ✓ Edit existing forms
  - ✓ Save drafts
  - ✓ Continue editing anytime

- **Viewing & Analysis**
  - ✓ View all baseline data
  - ✓ View all follow-up data
  - ✓ View comparison reports
  - ✓ View aggregate trial reports
  - ✓ See calculated outcomes

- **Mobile Features**
  - ✓ Mobile-responsive design
  - ✓ Touch-optimized forms
  - ✓ Mobile-friendly buttons
  - ✓ Mobile navigation

#### ⚠️ Limited Offline Support

- Viewing patient list limited to ~50 per page
- Based on your last online session
- More patients load once online

#### ❌ Requires Internet

- **First login** (one-time verification)
- **Monthly re-verification** (once per month, ~30 seconds)
- **Password changes** (security requirement)
- **Account settings** changes
- **Adding new doctors** (admin feature)

### Automatic Sync Process

#### When Sync Happens

Syncing automatically occurs when:
- ✅ You connect to the internet (app detects automatically)
- ✅ You login online
- ✅ Periodically during your session (every few minutes)

#### What Gets Synced

All your pending changes:
- ✅ New patients created offline
- ✅ New forms filled offline
- ✅ Existing forms edited offline
- ✅ Any data entered offline

#### How Sync Works

1. **App detects internet** → Starts sync automatically
2. **Sends pending data** → To the server securely
3. **Server validates** → Checks all data is correct
4. **Conflicts resolved** → If same data edited both places
5. **Updates confirmed** → Green checkmark appears
6. **Error handling** → Failed items retry automatically

#### Sync Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| ✓ | Synced | All data synced, fully backed up |
| ⏳ | Syncing | Currently syncing data in progress |
| ⚠️ | Pending | Data waiting to sync (will sync when online) |
| ❌ | Error | Sync failed (will retry automatically) |

---

## Managing Patients

### Viewing Your Patient List

1. Click **"Patients"** in the navigation menu
2. See all your patients listed
3. Patients are shown with:
   - Patient ID
   - Age
   - Gender
   - Status (Has baseline, Follow-up completed, etc.)
   - Last updated date

### Offline Patient List

- **Pre-cached:** Up to 50 patients per page
- **Updated:** From your last online session
- **Browsing:** Search and filter works offline
- **Adding More:** Loading more patients requires internet

### Adding a New Patient

**Works Offline!** You can add patients without internet.

1. Click **"Add Patient"** button
2. Fill in patient information:
   - **Name** (required) - Patient's full name
   - **Date of Birth** (required) - Patient's DOB
   - **Patient ID** (required) - Unique identifier (must be unique)
   - **Gender** - Select from dropdown
   - **Contact Information** - Phone/email if available
   - **Medical History** - Previous conditions
   - **Current Medications** - What they're taking
   - **Comorbidities** - Other health conditions

3. Click **"Save"**
   - Data is saved **locally on your device** ✓
   - Data is queued for sync when online
   - You can continue working offline

4. When you go **online:**
   - Data automatically syncs to server
   - Server validates the patient ID is unique
   - Green checkmark appears when done

### Duplicate Patient Check

**The system prevents duplicate patient IDs:**

- ✅ Checks offline database
- ✅ Checks server database (when online)
- ✅ Won't let you create duplicate
- ✅ Shows error if ID already exists

**If Duplicate Error Appears:**
1. Check if patient already exists
2. Use a different patient ID
3. Click "Save" again

### Viewing Patient Details

1. Click any patient from the list
2. You'll see:
   - **Patient Profile** - Name, DOB, contact info
   - **Baseline Form** - Week 0 data (if filled)
   - **Follow-up Form** - Week 12 data (if filled)
   - **Comparison** - Baseline vs Follow-up results
   - **Forms** - History of all forms
   - **Actions** - Edit, delete, export options

3. Click any section to view details

---

## Recording Data

### Baseline Assessment (Week 0)

**When to Complete:** At patient's first visit  
**Time to Complete:** 10-15 minutes  
**Can Save as Draft:** Yes, complete later  
**Works Offline:** Yes ✓

#### How to Record Baseline

1. Go to **Patients**
2. Click on the patient you want to assess
3. Click **"Baseline"** tab
4. Fill in the form with patient's current measurements:

**Clinical Measurements:**
- Weight (kg)
- Blood Pressure (Systolic/Diastolic)
- Heart Rate (bpm)
- Temperature (°C)
- Other vitals as needed

**Lab Parameters:**
- HbA1c (%)
- Fasting Plasma Glucose (mg/dL)
- Post-Prandial Glucose (mg/dL)
- Serum Creatinine (mg/dL)
- eGFR (mL/min/1.73m²)
- Urinalysis findings

**Medical Observations:**
- Previous diabetes therapies
- Current symptoms
- Comorbidities
- Counseling provided

**Treatment Plan:**
- Medication dosage
- Treatment initiation date
- Patient education completed

5. Click **"Save"** (works offline)
   - Form saved locally
   - Shows "Saved" indicator
   - Ready to sync when online

6. Click **"Finalize"** (optional)
   - Marks form as complete
   - Can still edit if needed

### Follow-up Assessment (Week 12)

**When to Complete:** After 12 weeks (±2 weeks)  
**Time to Complete:** 10-15 minutes  
**Can Save as Draft:** Yes  
**Works Offline:** Yes ✓

#### How to Record Follow-up

1. Go to **Patients**
2. Click on the patient
3. Click **"Follow-up"** tab
4. Fill in follow-up measurements (same as baseline)

**Repeat Measurements:**
- All vital signs again
- All lab parameters again
- Current status

**Adverse Events:**
- Any side effects experienced
- Severity (Mild/Moderate/Severe)
- Action taken (Stopped medication, Reduced dose, etc.)
- Whether resolved

**Physician Assessment:**
- Efficacy rating (Excellent/Good/Fair/Poor)
- Tolerability assessment
- Patient compliance status
- Overall impression

**Patient-Reported Outcomes:**
- Energy levels (How patient feels)
- Overall satisfaction with treatment
- Any comments or observations

5. Click **"Save"** (works offline)
6. Click **"Finalize"** to mark complete

### Editing Forms

**Before Syncing:**
1. Click on the patient
2. Click on the form you want to edit
3. Click **"Edit"** button
4. Make changes
5. Click **"Save"**

**After Syncing:**
1. Form is now on server
2. You can still edit online or offline
3. Changes sync automatically

### Saving vs Finalizing

| Action | Meaning | Can Edit? | Sync Status |
|--------|---------|-----------|-------------|
| **Save** | Save work in progress | ✓ Yes | Will sync |
| **Finalize** | Mark form complete | ✓ Yes (can still edit) | Will sync |

Both actions save to local device. Both will sync when online.

---

## Viewing Results & Comparisons

### View Patient's Baseline Data

1. Click on patient
2. Click **"Baseline"** tab
3. See all Week 0 measurements
4. View recorded date and time
5. See status (Saved/Finalized)

### View Patient's Follow-up Data

1. Click on patient
2. Click **"Follow-up"** tab
3. See all Week 12 measurements
4. View recorded date and time
5. See status (Saved/Finalized)

### View Baseline vs Follow-up Comparison

**The system automatically calculates changes!**

1. Click on patient
2. Click **"Comparison"** tab
3. System shows:
   - Side-by-side comparison (Week 0 vs Week 12)
   - **Color coding:**
     - 🟢 **Green** = Improvement
     - 🔴 **Red** = Decline
     - ⚪ **Gray** = No change

### Automatic Calculations

The system automatically calculates:

**Glycemic Response:**
- Excellent: ≥1.5% reduction in HbA1c
- Good: 1-1.5% reduction
- Fair: <1% reduction
- No response: No reduction or increase

**Weight Change:**
- Calculated in kg and %
- Green if decreased (improvement)
- Red if increased (decline)

**Blood Pressure Change:**
- Systolic change
- Diastolic change
- Status: Improved/Maintained/Worsened

**Renal Function:**
- eGFR change assessment
- Status: Stable/Improved/Declined

**Safety Profile:**
- Number of adverse events
- Severity breakdown
- Resolution status

---

## Syncing & Data Management

### Understanding Sync Queue

**Sync Queue** = Pending data waiting to sync to server

**What Goes in Sync Queue:**
- ✓ New patients created offline
- ✓ New forms filled offline
- ✓ Existing forms edited offline
- ✓ Any changes made offline

**Where Does Data Go:**
- Offline: Stored in IndexedDB on your device
- When Online: Automatically sent to Firebase server
- Always Encrypted: AES-256 encryption throughout

### Automatic Sync (Recommended)

**Let the app sync automatically:**

The app will automatically sync when:
- ✓ You go online
- ✓ You login online
- ✓ Periodically during your session

**You Don't Need to Do Anything!**
- Data syncs in the background
- You can keep working
- Green checkmark shows when done

### Manual Sync (If Needed)

If you want to force sync immediately:

1. Look for **"Sync"** button (usually top or bottom of screen)
2. Click **"Sync"** button
3. Shows current status:
   - "Synced ✓" - Everything is up to date
   - "Syncing..." - Currently syncing
   - "Pending ⏳" - Waiting to sync
4. Once finished, shows "Synced ✓"

### Checking Sync Status

**Connection Indicator** (usually top of screen):
- 🟢 **Green** = Online, can sync
- 🔴 **Red** = Offline, will sync later
- ⚪ **Gray** = Unknown

**Data Status Icons:**
- ✓ **Checkmark** = Synced
- ⏳ **Hourglass** = Syncing
- ⚠️ **Warning** = Pending
- ❌ **X** = Error (will retry)

### What to Do If Sync Fails

**If You See an Error:**

1. **Check internet connection**
   - Make sure you're actually online
   - Try loading another website
   - Restart your router if needed

2. **Refresh the page**
   - Press Ctrl+R (Windows) or Cmd+R (Mac)
   - Wait for page to reload
   - Try syncing again

3. **Clear browser cache** (if problem persists)
   - Go to Settings → Clear browsing data
   - Select "All time"
   - Click "Clear data"
   - Reload the application

4. **Try again**
   - Sync should work now
   - Data will catch up automatically

5. **Contact support** (if still failing)
   - Note the error message
   - Include patient ID
   - Include timestamp

### Data Export

**Export Patient Data:**

1. Click on patient
2. Look for **"Export"** button
3. Choose format:
   - **PDF** - For printing/reports
   - **JSON** - For data analysis
   - **CSV** - For Excel
4. File downloads automatically

**Export Trial Reports:**

1. Go to **"Reports"** section
2. View trial statistics
3. Click **"Export"** button
4. Choose format (CSV, JSON, PDF)
5. Customize filter (by site, date range, etc.)
6. File downloads automatically

---

## Mobile Features

### Using on Mobile Devices

**Fully Responsive Design:**

The application is optimized for mobile devices with:
- ✓ Mobile-responsive layout
- ✓ Touch-optimized forms
- ✓ Mobile-friendly buttons (larger for touch)
- ✓ Vertical scrolling (not horizontal)
- ✓ Mobile-optimized keyboards

### Mobile Tips

1. **Use Portrait Orientation**
   - Hold phone vertically
   - Forms are optimized for portrait
   - Easier to read and fill

2. **Larger Touch Targets**
   - Buttons are bigger for touch
   - Easy to tap accurately
   - ~44x44 pixels minimum

3. **Mobile Keyboard**
   - Correct keyboard appears automatically
   - Email field shows email keyboard
   - Number field shows number pad
   - Date field shows date picker

4. **Form Fill-in**
   - One question per screen
   - Scroll down to see next question
   - "Next" button to move forward
   - "Previous" button to go back
   - "Save" button when done

5. **Mobile Navigation**
   - Menu button (hamburger icon) at top
   - Main options: Patients, Forms, Reports
   - Back button to return
   - Touch to select

### Mobile Offline

Mobile devices work **fully offline** just like desktops:
- ✓ Login offline
- ✓ Add patients offline
- ✓ Fill forms offline
- ✓ View data offline
- ✓ Auto-sync when online

---

## Troubleshooting

### Problem: "Login Failed"

**Error:** Cannot login (online or offline)

**Solutions:**

1. **Check email spelling**
   - Emails are case-insensitive
   - Make sure there are no spaces
   - Double-check the spelling

2. **Check password**
   - Passwords are case-sensitive
   - Caps Lock should be OFF
   - Make sure you have the right password

3. **Forgot password?**
   - Click "Forgot Password?" on login page
   - Enter your email
   - Check your email for reset link
   - Create new password
   - Try login again

4. **Try a different browser**
   - Sometimes browser cache causes issues
   - Try Chrome, Firefox, or Safari
   - If login works in different browser, clear cache in original browser

### Problem: "Offline Access Not Available"

**Error:** Cannot login offline even though app should support it

**Reasons & Solutions:**

1. **Must have logged in online at least once**
   - First login MUST be online
   - Do you remember logging in online?
   - Try: Go online and login once

2. **Check if it's been 30+ days**
   - Offline access expires after 30 days
   - When did you last login online?
   - If 30+ days ago: Go online and login once more

3. **Email doesn't match**
   - The email must match what you registered
   - Check for typos
   - Try exact spelling of registration email

4. **Password changed recently?**
   - If you recently changed password
   - Old credentials still cached
   - Go online and login with NEW password
   - Then try offline with new password

5. **Try clearing browser storage**
   - Go to DevTools (F12)
   - Applications → Storage → Clear All
   - Refresh page
   - Try again

### Problem: "Data Not Syncing"

**Error:** Added forms offline, but they're not appearing online

**Solutions:**

1. **Check internet connection**
   - Look for connection indicator (should be green)
   - Try loading another website
   - If other sites don't load, restart your router

2. **Refresh the page**
   - Press Ctrl+R (Windows) or Cmd+R (Mac)
   - Wait for page to fully reload
   - Check if data appears now

3. **Try manual sync**
   - Look for "Sync" button
   - Click it
   - Wait for it to complete
   - Check status indicator

4. **Check browser storage isn't full**
   - IndexedDB has size limits (usually several MB)
   - If device is very full, storage might be full
   - Try clearing cache
   - Or try different browser

5. **Restart the app**
   - Close the browser tab completely
   - Wait 10 seconds
   - Open application again
   - Login and try syncing

6. **Still not working?**
   - Contact support
   - Include: Patient ID, last activity time, device type
   - We can manually sync from server side

### Problem: "Can't Add New Patient"

**Error:** "Add Patient" button doesn't work or shows error

**Reasons & Solutions:**

1. **Check if you're online**
   - Some features need internet for validation
   - Look at connection indicator
   - If offline, that's OK - patient queues for sync

2. **Try with internet first**
   - Connect to internet
   - Try adding patient again
   - If it works, system will cache the capability

3. **Check duplicate patient ID**
   - Is patient ID unique?
   - Check your existing patient list
   - Try different patient ID

4. **Field validation**
   - Make sure all required fields are filled
   - Required fields: Name, DOB, Patient ID
   - Try filling more carefully

5. **Try different browser**
   - Sometimes browser cache causes issues
   - Try Chrome, Firefox, or Safari
   - See if add patient works in different browser

### Problem: "My Data Disappeared!"

**Error:** Entered data offline, now it's gone

**Where Did It Go? Check These:**

1. **Did you logout?**
   - Logging out clears local data (by design, for security)
   - Always save before logging out
   - Data on server is still safe
   - Go online and login to sync data back

2. **Did you clear browser data?**
   - If you cleared browsing data:
     - Go to Settings
     - "Clear browsing data"
     - Check if IndexedDB was selected
     - This deletes local data
   - Check browser history - might be in "recently closed" tabs

3. **Did you switch browser?**
   - Each browser has its own IndexedDB
   - Data in Chrome is NOT in Firefox
   - Switch back to original browser
   - Or go online to sync data

4. **Did you restart your computer?**
   - Local data persists even after restart
   - But clear cache can remove it
   - Data is always safe on server if you synced

5. **Still missing?**
   - Contact support
   - Include patient ID and approximate time you entered data
   - We can check server backups
   - We can recover your data

### Problem: "Form Won't Save"

**Error:** Clicked save but form not saving

**Solutions:**

1. **Look for "Saved" confirmation**
   - Form should show "Saved ✓" message
   - If you don't see this, it didn't save

2. **Check required fields**
   - All required fields must be filled (marked with *)
   - Scroll through form and check all fields
   - Fill any missing fields
   - Try save again

3. **Check for invalid data**
   - Some fields have format requirements
   - Phone numbers must be valid format
   - Dates must be in correct format
   - Numbers must be actual numbers (not text)
   - Check error messages on form

4. **Try again**
   - Click "Save" button again
   - Wait a few seconds
   - Should see "Saved ✓" message

5. **Refresh page if still failing**
   - Press Ctrl+R (Windows) or Cmd+R (Mac)
   - Re-enter the form
   - Try saving again

### General Troubleshooting Tips

**Before Contacting Support:**

1. ✓ Check internet connection (green indicator)
2. ✓ Refresh page (Ctrl+R or Cmd+R)
3. ✓ Try different browser
4. ✓ Clear browser cache
5. ✓ Restart your device
6. ✓ Try logging out and back in

**When Contacting Support, Include:**

- Device type (Desktop/Laptop/Tablet/Mobile)
- Operating system (Windows/Mac/iOS/Android)
- Browser (Chrome/Firefox/Safari/Edge)
- Error message (copy exactly)
- Steps you took before error
- Approximate time error occurred
- Patient ID (if applicable)

---

## FAQ

### Q: Do I need internet every time I use the app?

**A:** No! After your first login, you can work offline indefinitely until the 30-day period expires. Then just verify online once every 30 days (takes ~30 seconds).

### Q: Is my offline data actually secure?

**A:** Yes! Your data is encrypted using AES-256 encryption (military-grade). Same security level as banks use. Even if someone steals your device, they can't read your data without your password.

### Q: What if I lose my device?

**A:** 
- Your data is encrypted (can't be read without your password)
- Contact us immediately and we'll disable your account
- Your data on the server is still safe and encrypted
- You can login on a new device using your email and password
- All your server data will be accessible

### Q: Can I use the app on multiple devices?

**A:** Yes! You can use the app on multiple devices (phone, tablet, laptop). Each device stores its own local copy of data. When you go online, all devices sync to the server, so they all have the latest data.

**Note:** Offline access timer (30 days) is per-device. So if you login online on Device A, you get 30 days offline on that device. Device B has its own 30-day timer.

### Q: What if I'm offline for more than 30 days?

**A:** 
1. You'll be prompted to verify online when you try to login offline
2. Just go online and login normally (takes ~30 seconds)
3. Your credentials are re-verified
4. Good for another 30 days
5. All your data is perfectly safe

### Q: Can I change my password?

**A:** Yes, but you need internet. Go to Settings → "Change Password" and follow the prompts.

**Important:** After changing password, login online once with your new password. Then you can use the new password offline too.

### Q: Can I delete a patient record?

**A:** Yes, but you need internet. This is a security feature to prevent accidental deletion.

### Q: What happens if I close the app while filling a form?

**A:** Don't worry! The app auto-saves your work. When you reopen the app and login, your form will still be there with all the data you entered. Continue where you left off.

### Q: Can another doctor see my patients?

**A:** No! Each doctor only sees their own patients. This is a security feature built into the system.

### Q: Can I share patients with another doctor?

**A:** Not through the app directly. Contact your administrator to set up shared access.

### Q: How do I know if my data synced?

**A:** 
1. Look for the sync indicator (usually at the top)
2. ✓ = Synced
3. ⏳ = Syncing in progress
4. ⚠️ = Pending (will sync when online)
5. ❌ = Error (will retry automatically)

### Q: Can I export my data?

**A:** Yes! From any patient, click "Export" and choose your format:
- PDF (for printing)
- JSON (for analysis)
- CSV (for Excel)

### Q: Is there an app for iPhone/Android?

**A:** The web application is fully responsive and works great on mobile browsers. No separate app needed - it's optimized for all device sizes.

### Q: How often should I sync my data?

**A:** Sync happens automatically when you go online. You don't need to do anything. Data is secure either way (offline or online).

### Q: What if I see different data online vs offline?

**A:** This shouldn't happen. When you go online, the app syncs all pending data. If you see a difference:
1. Refresh the page
2. Wait a few seconds for sync to complete
3. Check that all data appears
4. Contact support if still inconsistent

### Q: Can I undo a change I made?

**A:** If you haven't synced yet:
1. Logout without saving
2. Login again
3. The old data will be there

If you've already synced, we keep change history. Contact support to recover older versions of data.

### Q: What's the maximum number of patients I can add?

**A:** Theoretically unlimited. But for performance, we recommend:
- Max ~100 patients actively working
- Older patients can be archived

### Q: Does the app work on tablets?

**A:** Yes, fully optimized! Tablets work great - they have the responsive design of mobile with more screen space like desktops.

### Q: What browser should I use?

**A:** Any modern browser works:
- Chrome (recommended)
- Firefox
- Safari
- Edge

Use the latest version for best performance and security.

### Q: Does the app work in dark mode?

**A:** Yes! The app respects your system dark mode preference and has its own dark mode theme. Go to Settings to choose your preference.

---

## Best Practices

### Daily Usage

**Start Your Day:**
- ✓ Open the app
- ✓ Login with your credentials
- ✓ Check patient list
- ✓ Start your work

**During the Day:**
- ✓ Enter data as you collect it (don't wait until end of day)
- ✓ Save forms regularly (every 5-10 minutes)
- ✓ Don't worry about internet - app handles it

**End of Day:**
- ✓ Save any open forms
- ✓ Check sync status (should show ✓)
- ✓ You're done! Data is backed up

### Weekly Usage

**Weekly Checklist:**
- ✓ Go online at least once per week (recommended)
- ✓ Check that all data appears in the system
- ✓ Verify sync status is showing ✓
- ✓ Check if any patients need follow-up

### Monthly Usage

**Monthly Checklist:**
- ✓ Watch for re-verification notification (around day 30)
- ✓ When you see it, go online and login once (~30 seconds)
- ✓ You'll get another 30 days offline access
- ✓ No action needed if you're already working online regularly

### Data Entry

**Good Practices:**
- ✓ Enter data as you collect it (fresh memory)
- ✓ Double-check values before saving
- ✓ Use correct units (kg, mg/dL, etc.)
- ✓ Save frequently (don't lose work)
- ✓ Complete forms in order (don't skip sections)

**Things to Avoid:**
- ❌ Don't wait until end of week to enter data
- ❌ Don't fill random fields out of order
- ❌ Don't logout without saving
- ❌ Don't clear browser cache while working
- ❌ Don't close app without saving forms

### Offline Work

**Before Going Offline:**
- ✓ Go online at least once per week
- ✓ Make sure all sync shows ✓
- ✓ Verify your patients list is loaded

**While Offline:**
- ✓ Work normally - just like online
- ✓ Save forms regularly
- ✓ Don't worry about internet
- ✓ All data is saved locally and safely

**When Going Back Online:**
- ✓ App will automatically sync
- ✓ You'll see sync progress
- ✓ Data appears on server within seconds
- ✓ Check that all data appears correctly

### Security Practices

**Protect Your Account:**
- ✓ Use a strong password (8+ characters, mixed case, numbers)
- ✓ Don't share your password
- ✓ Don't write down your password
- ✓ Logout when leaving your device

**Protect Your Device:**
- ✓ Lock your device when away (password/fingerprint)
- ✓ Don't leave device unattended
- ✓ Use strong device password
- ✓ Keep software updated

**Protect Patient Data:**
- ✓ Don't print patient data unless necessary
- ✓ Don't share patient data via email
- ✓ Don't discuss patient IDs in public
- ✓ Follow your organization's privacy policy

### Backup & Recovery

**Make Regular Backups:**
- ✓ Export patient reports monthly (as PDF/CSV)
- ✓ Store exports in secure location
- ✓ Server has automatic backups (encrypted)

**If Something Goes Wrong:**
- ✓ Don't panic - data is usually safe
- ✓ Check server backups first
- ✓ Contact support with patient ID
- ✓ We can usually recover data

---

## Support & Contact

### Getting Help

**For Questions About Features:**
- Check this User Guide (FAQ section)
- Look in Troubleshooting section above
- Contact your organization's support team

**For Technical Issues:**
- Follow troubleshooting steps in this guide
- Try clearing cache and refreshing
- Check internet connection
- Try different browser
- Contact technical support if issue persists

**For Account Issues:**
- Forgot password: Use "Forgot Password" link
- Can't login: Check email/password spelling
- Account locked: Contact support
- Change password: Go to Settings → Change Password

### Contact Information

**Email Support:** support@kollectcare.com  
**Emergency (Production):** +1-XXX-XXX-XXXX  
**Response Time:** 24 hours (business days)

---

## Version & Updates

**Current Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**Next Review:** Quarterly  

**Changes in This Version:**
- ✅ Complete offline support (30-day window)
- ✅ Military-grade AES-256 encryption
- ✅ Real-time error monitoring (Sentry)
- ✅ Mobile-responsive design
- ✅ Automatic sync queue management
- ✅ Comprehensive documentation

---

## Summary

You now have everything you need to use the Clinical Trial Application effectively! 

### Key Takeaways:

✅ **First login must be online** - Just need internet once  
✅ **Works offline for 30 days** - After that, verify online once more  
✅ **Your data is encrypted** - AES-256, military-grade security  
✅ **Auto-sync** - App handles syncing automatically  
✅ **Works on all devices** - Desktop, tablet, mobile all fully supported  
✅ **Full offline support** - View patients, add forms, work completely offline  

### Quick Command Reference:

| Task | Steps |
|------|-------|
| **Login Online** | Email + Password → Click Login |
| **Login Offline** | Email + Password → Click Login (if within 30 days) |
| **Add Patient** | Patients → Add Patient → Fill info → Save |
| **Record Baseline** | Patient → Baseline → Fill form → Save |
| **Record Follow-up** | Patient → Follow-up → Fill form → Save |
| **View Comparison** | Patient → Comparison → See results |
| **Export Data** | Patient → Export → Choose format |
| **Check Sync** | Look at sync indicator (should show ✓) |
| **Verify Monthly** | When prompted → Go online → Login once |

---

**Happy documenting! The system is ready for you to get started.**

**Questions? See the FAQ or Troubleshooting sections above.**

---

*Document prepared for Clinical Trial Application - KC MeSempa RWE Study*  
*For issues or suggestions, contact: support@kollectcare.com*
