# Email Customization Guide - Kollectcare RWE Study

## Overview
Currently, your app uses **Firebase Authentication's default email template**. We've created tools to customize this with branded emails.

---

## 🎯 Implementation Options

### **Option 1: Firebase Console Customization (Easiest - 2 minutes)**

✅ **Pros:** No coding required, built into Firebase  
❌ **Cons:** Limited customization, Firebase domain in sender

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project
2. Click **Authentication** → **Email Templates** tab
3. Click the **Email verification template** pencil icon
4. Customize:
   - **Sender name:** Change from "Firebase" to "Kollectcare RWE Study"
   - **Subject line:** Change to "Verify Your Email - Kollectcare RWE Study"
   - **Email body:** Use the HTML template provided below
5. Click **Save**

**Recommended HTML Template:**
```html
<p>Hello,</p>

<p>Welcome to the <strong>Kollectcare Real-World Evidence Study</strong>. Please verify your email address by clicking the link below:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="%LINK%" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 40px; border-radius: 6px; font-weight: bold;">
    Verify Email Address
  </a>
</p>

<p style="color: #999; font-size: 12px;">
  If you didn't request this verification, please ignore this email or contact your study administrator.
</p>
```

**Default Customization Values:**
- **Sender Name:** Kollectcare RWE Study
- **Subject:** Verify Your Email - Kollectcare RWE Study

---

### **Option 2: Resend Service (Recommended - Full Control)**

✅ **Pros:** Fully branded, professional, trackable, affordable  
❌ **Cons:** Requires API key, small cost (~$0.005/email)

**Setup Instructions:**

#### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up (free trial available)
3. Copy your **API Key** from Settings

#### Step 2: Add Environment Variables
1. Create `.env.local` file in project root:
```env
NEXT_PUBLIC_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_EMAIL_CONFIG_NAME=Kollectcare RWE Study
```

2. Update in `.env.example`:
```env
NEXT_PUBLIC_RESEND_API_KEY=your_resend_api_key_here
NEXT_PUBLIC_EMAIL_FROM=noreply@yourdomain.com
```

#### Step 3: The Custom Email Service Is Ready
Files created:
- ✅ `lib/custom-email.ts` - Email service with branded templates
- ✅ `app/api/send-verification-email/route.ts` - API endpoint

#### Step 4: Update Auth Context
Modify `contexts/auth-context.tsx` to use custom emails after Firebase signup (see updated code below)

---

### **Option 3: SendGrid Alternative**

Similar to Resend but with SendGrid:

```typescript
// In custom-email.ts replace the fetch call:
const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: user.email }]
    }],
    from: { email: config.fromEmail, name: config.fromName },
    subject: "Verify Your Email - Kollectcare RWE Study",
    content: [{
      type: "text/html",
      value: generateVerificationEmailHTML(verificationLink, user.email || "")
    }]
  })
})
```

---

## 📧 Currently Sent Email Details

**From:** `noreply@kollectcare-rwe-study.firebaseapp.com`  
**Subject:** "Verify your email for kollectcare-rwe-study"  
**Template:** Firebase default (not branded)

---

## 🚀 Next Steps for Your Implementation

### Quick Win (5 minutes):
1. **Use Firebase Console** (Option 1) to change sender name and subject
2. No code changes needed

### Full Branding (15 minutes):
1. **Set up Resend** (Option 2):
   - Create account at [resend.com](https://resend.com)
   - Copy API key
   - Add to `.env.local`
   
2. **Custom email service is ready** - files already created:
   - `lib/custom-email.ts` has all email templates
   - `app/api/send-verification-email/route.ts` is the endpoint

3. **Next step:** I can update auth-context to integrate with Resend

---

## 📝 Email Template Customization

The templates include:

**Verification Email:**
- ✅ Custom header with gradient
- ✅ Branded sender name: "Kollectcare RWE Study"
- ✅ Professional HTML layout
- ✅ Large, clear "Verify Email" button
- ✅ Fallback link for email clients that don't support buttons
- ✅ Study information section
- ✅ Security note

**Welcome Email (after verification):**
- ✅ Features list (offline support, reporting, etc.)
- ✅ Next steps guidance
- ✅ Branded design matching verification email

---

## ⚙️ Environment Setup

### For Option 2 (Resend):

**`.env.local` (Development):**
```env
# Email Configuration
NEXT_PUBLIC_RESEND_API_KEY=re_your_key_here
NEXT_PUBLIC_EMAIL_FROM=noreply@kollectcare-rwe-study.com
```

**Vercel/Production:**
- Go to Project Settings → Environment Variables
- Add the same variables
- Redeploy

---

## 🔐 Privacy & Compliance

All email options:
- ✅ Don't store email content in unnecessary places
- ✅ Follow HIPAA guidelines (verification link only, no patient data)
- ✅ Use HTTPS for all email links
- ✅ Include unsubscribe/ignore option

---

## 💡 Recommendation

**Start with:** Firebase Console customization (1 min setup)  
**Then upgrade to:** Resend for full branding (when you're ready)

Let me know which option you'd like to implement!
