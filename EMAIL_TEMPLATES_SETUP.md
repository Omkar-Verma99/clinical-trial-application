# Firebase Email Templates Configuration Guide

## Overview
Firebase sends verification and password reset emails using default templates. To enable these emails and customize them with your branding, you need to configure email templates in Firebase Console.

---

## Step 1: Configure Email Templates in Firebase Console

### 1.1 Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **clinical-trial-application**
3. Navigate to: **Authentication** → **Email Templates** (left sidebar)

### 1.2 Verification Email Template

**Path:** Authentication → Email Templates → Email Verification

1. Click **Edit template** (pencil icon)
2. Configure the following:

**Subject:**
```
Verify Your Email - Kollectcare RWE Study
```

**Email Body (HTML):**
```html
<html>
  <body style="font-family: Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" bgcolor="#f5f5f5" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <table width="600" bgcolor="white" cellpadding="20" cellspacing="0" style="margin: 20px auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="text-align: center; padding: 30px 20px;">
                <h1 style="color: #0d47a1; margin: 0;">Kollectcare RWE Study</h1>
                <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">Clinical Trial Management System</p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 20px;">
                <h2 style="color: #212121; font-size: 20px; margin: 0 0 15px 0;">Verify Your Email Address</h2>
                <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for registering with Kollectcare RWE Study. To complete your account setup and gain access to the clinical trial management system, please verify your email address.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="%%LINK%%" style="background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Verify Email Address
                  </a>
                </div>
                
                <p style="color: #888; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
                  If you did not create this account, please ignore this email.<br>
                  This verification link will expire in 24 hours.
                </p>
              </td>
            </tr>
            
            <tr>
              <td style="border-top: 1px solid #eee; padding: 15px 20px; font-size: 12px; color: #999;">
                <p style="margin: 0;">
                  Kollectcare RWE Study | Real World Evidence Clinical Trials<br>
                  <a href="mailto:support@kollectcare.com" style="color: #2196f3; text-decoration: none;">support@kollectcare.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

3. Click **Save template**

### 1.3 Password Reset Email Template

**Path:** Authentication → Email Templates → Password Reset

1. Click **Edit template** (pencil icon)
2. Configure the following:

**Subject:**
```
Reset Your Password - Kollectcare RWE Study
```

**Email Body (HTML):**
```html
<html>
  <body style="font-family: Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" bgcolor="#f5f5f5" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <table width="600" bgcolor="white" cellpadding="20" cellspacing="0" style="margin: 20px auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="text-align: center; padding: 30px 20px;">
                <h1 style="color: #0d47a1; margin: 0;">Kollectcare RWE Study</h1>
                <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">Clinical Trial Management System</p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 20px;">
                <h2 style="color: #212121; font-size: 20px; margin: 0 0 15px 0;">Reset Your Password</h2>
                <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0;">
                  We received a request to reset the password for your Kollectcare account. Click the button below to create a new password.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="%%LINK%%" style="background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #f44336; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; background-color: #ffebee; padding: 12px; border-radius: 4px;">
                  ⚠️ This password reset link will expire in 1 hour. If you did not request this reset, please ignore this email and your account will remain unchanged.
                </p>
              </td>
            </tr>
            
            <tr>
              <td style="border-top: 1px solid #eee; padding: 15px 20px; font-size: 12px; color: #999;">
                <p style="margin: 0;">
                  Kollectcare RWE Study | Real World Evidence Clinical Trials<br>
                  <a href="mailto:support@kollectcare.com" style="color: #2196f3; text-decoration: none;">support@kollectcare.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

3. Click **Save template**

---

## Step 2: Enable Email Provider (SMTP)

### 2.1 Check Current Email Provider

1. Go to **Authentication** → **Settings** (gear icon)
2. Look for **Email/Password** section
3. Check the **Email provider** status

### 2.2 Set Up Application-Specific Email (Optional but Recommended)

If using Gmail for SMTP relay:

1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll to **Authorized domains**
3. Add your domain: `app-kollectcare-rwe-study.web.app`

### 2.3 Configure Gmail SMTP (If Needed)

1. Create a Gmail Service Account:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Enable Gmail API
   - Create Service Account credentials
   - Download JSON key

2. In Firebase Console:
   - Go to **Project Settings** → **Service Accounts**
   - Import the JSON key

---

## Step 3: Verify Email Configuration

### 3.1 Test Verification Email

```bash
# In browser console or via your app:
1. Go to /signup page
2. Register a new account
3. Check spam/promotions folder for verification email
4. Look for subject: "Verify Your Email - Kollectcare RWE Study"
```

### 3.2 Test Password Reset Email

```bash
# In browser console or via your app:
1. Go to /forgot-password page
2. Enter your email
3. Check spam/promotions folder for reset email
4. Look for subject: "Reset Your Password - Kollectcare RWE Study"
```

---

## Step 4: Troubleshoot Email Not Sending

### Issue 1: Emails Not Arriving

**Check:**
1. ✅ Verify email templates are saved
2. ✅ Check spam/promotions folder
3. ✅ Confirm email in Firebase User list shows correct address
4. ✅ Verify authorized domains include your app domain

**Solution:**
```javascript
// Add temporary logging to verify attempt
console.log("Sending verification email to:", user.email)

// Check Firebase Console → Logs
// Look for successful email sends
```

### Issue 2: Email Template Not Applied

**Check:**
1. ✅ Template is saved (not in draft)
2. ✅ Subject and body are both filled in
3. ✅ `%%LINK%%` placeholder is in the HTML

### Issue 3: SMTP Error

**Check:**
1. ✅ Gmail SMTP settings are correct
2. ✅ Service account has Gmail API access
3. ✅ Less secure app access is enabled (if using Gmail)

---

## Current Implementation Reference

### Verification Email (Signup)
**File:** [contexts/auth-context.tsx](contexts/auth-context.tsx#L148)

```tsx
// Sends using Firebase default template
await sendEmailVerification(user)
```

### Password Reset
**File:** [app/forgot-password/page.tsx](app/forgot-password/page.tsx#L41)

```tsx
// Sends using Firebase default template
await sendPasswordResetEmail(auth, email)
```

---

## Firebase Console Direct Links

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID:

- **Email Templates:** 
  ```
  https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/templates
  ```

- **Authentication Settings:** 
  ```
  https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/settings
  ```

- **User Management:** 
  ```
  https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/users
  ```

---

## Support & Documentation

- [Firebase Email Templates Documentation](https://firebase.google.com/docs/auth/custom-email-handler)
- [Firebase SMTP Configuration](https://firebase.google.com/docs/auth/smtp)
- Contact: `support@kollectcare.com`

---

## Checklist

- [ ] Verification email template configured
- [ ] Password reset email template configured
- [ ] Templates saved (not in draft)
- [ ] Test verification email sent
- [ ] Test password reset email sent
- [ ] Emails arriving in inbox (not spam)
- [ ] Links in emails are clickable and working

