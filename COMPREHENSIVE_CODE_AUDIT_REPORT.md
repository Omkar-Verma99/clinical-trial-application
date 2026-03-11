# COMPREHENSIVE CODE AUDIT REPORT
## Clinical Trial Application - Full Security & Data Integrity Review

**Date**: March 11, 2026  
**Scope**: Complete codebase audit focusing on security, validation, data integrity, and error handling  

---

## EXECUTIVE SUMMARY

This audit identified **15 actionable findings** across security, data integrity, validation, and error handling categories. **4 HIGH severity** issues require immediate attention, particularly around sensitive data exposure, cookie security, and password reset flow vulnerabilities.

---

## CRITICAL FINDINGS

### 🔴 **HIGH: Sensitive Encryption Key Exposed in Configuration**

**Location**: [apphosting.yaml](apphosting.yaml#L28)

**Issue Type**: Security - Sensitive Data Exposure

**Severity**: HIGH

**Description**:
```yaml
- name: NEXT_PUBLIC_ENCRYPTION_KEY
  value: 906af497b3f4d5b3ff46dde386dd4aa6325b65c845d1cea23d24a47798f78a5d
  available_at: BUILD_AND_RUNTIME
```

The `NEXT_PUBLIC_ENCRYPTION_KEY` is exposed in the public configuration file. The `NEXT_PUBLIC_` prefix means this key is compiled into the client bundle and visible in browser DevTools. Any encryption using this key is compromised.

**Risk**: 
- Attackers can intercept and decrypt all data encrypted with this key
- Violates encryption security principles (key should never be publicly accessible)
- Client-side encryption is not secure for sensitive medical data

**Suggested Fix**:
1. Remove `NEXT_PUBLIC_ENCRYPTION_KEY` from apphosting.yaml
2. If encryption is needed for PII (patient data), use server-side encryption only
3. Keep encryption keys in `FIREBASE_SERVICE_ACCOUNT_KEY` or Cloud Secret Manager
4. Use Firebase Security Rules to encrypt sensitive fields server-side

**Priority**: IMMEDIATE - Rotate this key and cease using it

---

### 🔴 **HIGH: Non-HTTPOnly Cookie Exposes Sensitive Admin Data**

**Location**: [app/api/admin/login/route.ts](app/api/admin/login/route.ts#L62-L75)

**Issue Type**: Security - XSS Vulnerability

**Severity**: HIGH

**Description**:
```typescript
cookieStore.set('adminAuthData', JSON.stringify({
  adminId: adminDoc.id,
  email: adminData.email,
  role: adminData.role,
  firstName: adminData.firstName,
  lastName: adminData.lastName,
}), {
  httpOnly: false,  // ❌ VULNERABLE
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
});
```

The `adminAuthData` cookie is set with `httpOnly: false`, making it accessible to client-side JavaScript. An XSS attack can steal this sensitive admin data.

**Risk**:
- Admin role and ID exposed to XSS attacks
- Admin email leakage
- Privilege escalation if attacker can modify their role
- Combined with XSS, can enable account takeover

**Suggested Fix**:
```typescript
cookieStore.set('adminAuthData', JSON.stringify({
  // Store only UUID or session ID, not sensitive data
  sessionId: generateSecureSessionId(),
}), {
  httpOnly: true,   // ✅ SECURE - Not accessible to JS
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
});
```

Server should fetch admin details from session table, not from cookie.

**Priority**: IMMEDIATE - Hotfix required

---

### 🔴 **HIGH: Password Reset Email Flow Information Disclosure**

**Location**: [app/forgot-password/page.tsx](app/forgot-password/page.tsx#L43-L71)

**Issue Type**: Security - User Enumeration / Information Disclosure

**Severity**: HIGH

**Description**:
The forgot-password flow calls the `/api/auth/account-status` endpoint which returns:
```json
{ success: true, exists: true/false }
```

If `exists: false`, the user sees: `"Your ID is not created yet. Please create your account first."`

**Risk**:
- **User Enumeration Attack**: Attacker can enumerate all registered emails by calling the endpoint
- HIPAA Compliance Risk: Reveals which doctors are registered in the system
- Enables targeted social engineering

**Current Flow**:
1. User enters email
2. Client calls `/api/auth/account-status`  
3. Returns explicit exists/not-exists status
4. Frontend shows different messages

**Suggested Fix**:
1. Always return same message: `"If this email is registered, we've sent a password reset link"`
2. Check email server-side silently
3. If exists → send reset email
4. If not exists → log the attempt but don't indicate status
5. Implement rate limiting on endpoint

```typescript
// Better implementation
const handleSubmit = async (e: React.FormEvent) => {
  const normalizedEmail = email.trim().toLowerCase()
  
  try {
    await sendPasswordResetEmail(auth, normalizedEmail)
    // ALWAYS show same message
    toast({
      title: "Check Your Email",
      description: "If this email exists, a password reset link has been sent.",
    })
    router.push("/login")
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "We couldn't process your request. Please try again.",
    })
  }
}
```

**Priority**: HIGH - Implement immediately

---

### 🔴 **HIGH: Form Submission Without Server-Side Validation**

**Location**: [contexts/auth-context.tsx](contexts/auth-context.tsx#L167-L200), [app/patients/add/page.tsx](app/patients/add/page.tsx#L400-L500)

**Issue Type**: Security - Input Validation

**Severity**: HIGH

**Description**:
Client-side validates study site code format:
```typescript
const formatRegex = /^[A-Z]{3}-\d{2}$/
```

But there's no server-side validation of the API response format. A malicious actor can:
1. Intercept the API call
2. Send malformed data to Firestore
3. Bypass client validation

Example vulnerability:
- Client expects: `{ success: true, available: boolean }`
- Attacker could send: `{ success: true, available: "invalid_string" }`
- Stored in Firestore unvalidated

**Risk**:
- Data integrity issues
- Firestore type mismatches
- Downstream app crashes

**Suggested Fix**:
Add server-side validation in all POST endpoints:

```typescript
// app/api/auth/study-site-code-status/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // SERVER-SIDE VALIDATION
    if (typeof body?.studySiteCode !== 'string') {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      )
    }
    
    const studySiteCode = body.studySiteCode.trim().toUpperCase()
    
    // Validate format
    if (!/^[A-Z]{3}-\d{2}$/.test(studySiteCode)) {
      return NextResponse.json(
        { success: false, error: "Invalid study site code format" },
        { status: 400 }
      )
    }
    
    // Rest of logic...
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    )
  }
}
```

**Priority**: IMMEDIATE

---

## SECURITY VULNERABILITIES

### 🟠 **MEDIUM: Missing CORS/Origin Validation**

**Location**: All API routes (account-status, study-site-code-status, admin/login)

**Issue Type**: Security - CORS

**Severity**: MEDIUM

**Description**:
API endpoints don't explicitly validate origin. While they're POST endpoints (which require CSRF tokens in theory), there's no explicit CORS header validation.

**Suggested Fix**:
```typescript
export async function POST(request: Request) {
  try {
    // Validate request origin for CORS
    const origin = request.headers.get('origin')
    const allowedOrigins = ['https://kollectcare-rwe-study.com']
    
    if (!origin || !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { success: false, error: "Invalid request origin" },
        { status: 403 }
      )
    }
    
    // Continue with logic...
  } catch (error) {
    // ...
  }
}
```

---

### 🟠 **MEDIUM: Insufficient Rate Limiting on Auth Endpoints**

**Location**: [app/api/auth/account-status/route.ts](app/api/auth/account-status/route.ts), [app/api/auth/study-site-code-status/route.ts](app/api/auth/study-site-code-status/route.ts)

**Issue Type**: Security - Brute Force / DoS

**Severity**: MEDIUM

**Description**:
No rate limiting on authentication-related endpoint. An attacker can:
1. Enumerate all emails in the system
2. Query all study site codes simultaneously
3. Perform DoS attacks

**Suggested Fix**:
Implement rate limiting using middleware or Firebase Extensions:

```typescript
// Using Firebase Realtime DB for rate limiting
const rateLimitKey = `rateLimit_${request.headers.get('cf-connecting-ip')}`
const attempts = await getAttempts(rateLimitKey)

if (attempts > 10) { // 10 requests per minute
  return NextResponse.json(
    { success: false, error: "Too many requests" },
    { status: 429 }
  )
}

incrementAttempts(rateLimitKey)
```

---

### 🟠 **MEDIUM: Admin Password Not Properly Hashed Verification**

**Location**: [app/api/admin/login/route.ts](app/api/admin/login/route.ts#L27-L35)

**Issue Type**: Security - Authentication

**Severity**: MEDIUM

**Description**:
While bcrypt is used for password verification, there's no verification that:
1. Password meets minimum requirements
2. Account lockout after failed attempts
3. Password expiration policy

**Current Code**:
```typescript
const passwordMatch = await bcrypt.compare(password, adminData.passwordHash)
if (!passwordMatch) {
  return Response.json(
    { success: false, error: 'Invalid credentials' },
    { status: 401 }
  )
}
```

**Risk**:
- Weak passwords accepted during admin creation
- Brute force attacks possible without lockout
- No session management validation

**Suggested Fix**:
```typescript
// Add account lockout
if (adminData.failedLoginAttempts >= 5) {
  if (Date.now() - adminData.lastFailedLogin.getTime() < 15 * 60 * 1000) {
    return Response.json(
      { success: false, error: 'Account locked due to too many failed attempts' },
      { status: 403 }
    )
  }
}

const passwordMatch = await bcrypt.compare(password, adminData.passwordHash)
if (!passwordMatch) {
  // Increment failed attempts
  await updateDoc(
    doc(db, 'admins', adminDoc.id),
    {
      failedLoginAttempts: (adminData.failedLoginAttempts || 0) + 1,
      lastFailedLogin: new Date(),
    }
  )
  return Response.json(
    { success: false, error: 'Invalid credentials' },
    { status: 401 }
  )
}

// Reset failed attempts on success
await updateDoc(
  doc(db, 'admins', adminDoc.id),
  { failedLoginAttempts: 0 }
)
```

---

## DATA INTEGRITY ISSUES

### 🟠 **MEDIUM: Race Condition in Study Site Code Lock**

**Location**: [contexts/auth-context.tsx](contexts/auth-context.tsx#L206-L230)

**Issue Type**: Data Integrity - Race Condition

**Severity**: MEDIUM

**Description**:
The signup process uses transactions to prevent duplicate study site codes:

```typescript
await runTransaction(db, async (transaction) => {
  const studySiteSnap = await transaction.get(studySiteRef)

  if (studySiteSnap.exists()) {
    throw new Error("Study site code already in use...")
  }

  transaction.set(doctorRef, { ... })
  transaction.set(studySiteRef, { ... })
})
```

However, there's a pre-transaction check:
```typescript
const studySiteStatusResponse = await fetch("/api/auth/study-site-code-status", ...)
if (!studySiteStatusData?.available) {
  throw new Error("Study site code already in use...")
}
```

**Race Condition Scenario**:
1. User A starts signup with code `RWE-01`
2. User B starts signup with code `RWE-01` 
3. Both pass the API check (both call endpoint before either commits)
4. User A commits transaction first (success)
5. User B's transaction should fail, but timing is tight

**Suggested Fix**:
The transaction-based approach is correct, but the pre-check creates confusion:

```typescript
const signup = useCallback(async (email: string, password: string, doctorData: ...) => {
  // Remove the pre-check API call entirely
  // The transaction will handle the race condition properly
  
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedStudySiteCode = doctorData.studySiteCode.trim().toUpperCase()

  // Go straight to transaction
  try {
    await runTransaction(db, async (transaction) => {
      const studySiteRef = doc(db, "studySiteCodes", normalizedStudySiteCode)
      const studySiteSnap = await transaction.get(studySiteRef)

      if (studySiteSnap.exists()) {
        throw new Error("Study site code already in use.")
      }

      // Create user first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      )

      // Then atomically create records
      transaction.set(doc(db, "doctors", userCredential.user.uid), {...})
      transaction.set(studySiteRef, {...})
    })
  } catch (error) {
    if (error.message?.includes("Study site code")) {
      throw error
    }
    // Handle auth user cleanup
  }
}, [])
```

---

### 🟠 **MEDIUM: Missing Null/Undefined Checks in Object Access**

**Location**: [components/followup-form.tsx](components/followup-form.tsx#L165-L180)

**Issue Type**: Data Integrity - Null Reference

**Severity**: MEDIUM

**Description**:
Multiple places access nested properties without null checks:

```typescript
// Line 175-180 - What if existingData is missing properties?
const urinalysisSpecify: existingData?.urinalysis?.startsWith("Abnormal") 
  ? existingData.urinalysis.replace("Abnormal: ", "") 
  : "",

// Line 120 - What if doctor is null? 
physicianName: doctor?.name || "",  // OK - has fallback

// Line 410-415 - Safe access but assumes objects exist
hba1cChange: followup?.glycemicResponse?.hba1cChange,
```

**Risk**:
- Runtime undefined errors if data structure changes
- Healthcare app crashes
- Data loss if error not caught

**Suggested Fix**:
Add type guards and null checks consistently:

```typescript
// Use optional chaining + fallbacks
const urinalysisValue = existingData?.urinalysis 
  ? (existingData.urinalysis.startsWith("Abnormal") 
    ? existingData.urinalysis.replace("Abnormal: ", "")
    : "")
  : ""

// Better: create a helper function
const extractUrinalysisValue = (data: FollowUpData | null): string => {
  if (!data?.urinalysis) return ""
  return data.urinalysis.startsWith("Abnormal")
    ? data.urinalysis.replace("Abnormal: ", "")
    : ""
}
```

---

### 🟠 **MEDIUM: No Transactional Consistency for Multiple Documents**

**Location**: [components/baseline-form.tsx](components/baseline-form.tsx#L225-L245)

**Issue Type**: Data Integrity - Inconsistent State

**Severity**: MEDIUM

**Description**:
Baseline form saves data in a single batch but doesn't verify patient exists:

```typescript
try {
  const patientDocRef = doc(db, "patients", patientId)
  const batch = writeBatch(db)
  batch.set(patientDocRef, {
    baseline: data,
    baselineVisitDate: formData.baselineVisitDate,
    updatedAt: new Date().toISOString()
  }, { merge: true })

  await batch.commit()
} catch (error) {
  // What if patient doc doesn't exist?
}
```

**Risk**:
- Creates baseline data for non-existent patients
- Orphaned data in Firestore
- Billing issues if data export counts records

**Suggested Fix**:
```typescript
try {
  const patientDocRef = doc(db, "patients", patientId)
  
  // First verify patient exists
  const patientSnap = await getDoc(patientDocRef)
  if (!patientSnap.exists()) {
    throw new Error("Patient record not found")
  }

  // Verify doctor owns this patient
  if (patientSnap.data().doctorId !== user?.uid) {
    throw new Error("Access denied")
  }

  const batch = writeBatch(db)
  batch.set(patientDocRef, {
    baseline: data,
    baselineVisitDate: formData.baselineVisitDate,
    updatedAt: new Date().toISOString()
  }, { merge: true })

  await batch.commit()
}
```

---

## VALIDATION ISSUES

### 🟡 **MEDIUM: Missing Email Format Validation on API**

**Location**: [app/api/auth/account-status/route.ts](app/api/auth/account-status/route.ts#L9)

**Issue Type**: Validation

**Severity**: MEDIUM

**Description**:
Client validates email format but API only checks if it's a string:

```typescript
const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

if (!email) {
  return NextResponse.json(...)
}
```

No validation that email matches expected format (xxx@xxx.xxx)

**Suggested Fix**:
```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const email = typeof body?.email === "string" 
  ? body.email.trim().toLowerCase() 
  : ""

if (!email || !EMAIL_REGEX.test(email)) {
  return NextResponse.json(
    { success: false, error: "Invalid email format" },
    { status: 400 }
  )
}
```

---

### 🟡 **MEDIUM: Numeric Field Range Validation Incomplete**

**Location**: [components/baseline-form.tsx](components/baseline-form.tsx#L167-L180)

**Issue Type**: Validation - Range Checks

**Severity**: MEDIUM

**Description**:
Baseline form validates some ranges but missing others:

```typescript
// Validated:
if (isNaN(hba1c) || hba1c < 4 || hba1c > 15) rangeErrors.push("HbA1c must be between 4-15%")

// NOT validated:
heartRate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
serumCreatinine: formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : null,
egfr: formData.egfr ? Number.parseFloat(formData.egfr) : null,
ppg: formData.ppg ? Number.parseFloat(formData.ppg) : null,
```

Heart rate can be 0-500, EGFR can be 0-150, etc. but no validation.

**Suggested Fix**:
```typescript
const validationRanges = {
  hba1c: { min: 4, max: 15 },
  fpg: { min: 50, max: 500 },
  ppg: { min: 80, max: 600 },
  heartRate: { min: 40, max: 180 },
  serumCreatinine: { min: 0.4, max: 10 },
  egfr: { min: 5, max: 150 },
  weight: { min: 30, max: 200 },
  bloodPressureSystolic: { min: 70, max: 200 },
  bloodPressureDiastolic: { min: 40, max: 130 },
}

Object.entries(validationRanges).forEach(([field, { min, max }]) => {
  const value = Number.parseFloat(formData[field])
  if (!Number.isFinite(value) || value < min || value > max) {
    rangeErrors.push(`${field} must be between ${min}-${max}`)
  }
})
```

---

## ERROR HANDLING & EDGE CASES

### 🟡 **MEDIUM: Unhandled Promise Rejections in Auth Flow**

**Location**: [contexts/auth-context.tsx](contexts/auth-context.tsx#L140-L160)

**Issue Type**: Error Handling

**Severity**: MEDIUM

**Description**:
Fetch calls can fail silently if JSON parsing fails:

```typescript
const accountStatusResponse = await fetch("/api/auth/account-status", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: normalizedEmail }),
})

if (!accountStatusResponse.ok) {
  throw new Error("Unable to verify account status...")
}

const accountStatusData = await accountStatusResponse.json()
// What if JSON parsing fails? No try-catch here
```

**Risk**:
- Network error or server returning HTML instead of JSON
- Unhandled promise rejection crashes app
- User stuck in loading state

**Suggested Fix**:
```typescript
try {
  const accountStatusResponse = await fetch("/api/auth/account-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail }),
  })

  if (!accountStatusResponse.ok) {
    const errorText = await accountStatusResponse.text()
    console.error("Status API error:", errorText)
    throw new Error("Unable to verify account status. Please try again.")
  }

  let accountStatusData
  try {
    accountStatusData = await accountStatusResponse.json()
  } catch (parseError) {
    console.error("JSON parse error:", parseError)
    throw new Error("Server returned invalid response. Please try again.")
  }

  const accountExists = Boolean(accountStatusData?.exists)
  if (!accountExists) {
    const error = new Error("Your ID is not created yet...")
    ;(error as any).code = "app/account-not-created"
    throw error
  }

  await signInWithEmailAndPassword(auth, normalizedEmail, password)
  logInfo("User logged in successfully", { email: normalizedEmail })
} catch (error) {
  // Handle error appropriately
  throw error
}
```

---

### 🟡 **MEDIUM: Missing Timeout on Form Submissions**

**Location**: [components/baseline-form.tsx](components/baseline-form.tsx#L220-240), [components/followup-form.tsx](components/followup-form.tsx#L430-450)

**Issue Type**: Error Handling - Timeout

**Severity**: MEDIUM

**Description**:
Form submissions wait indefinitely for Firestore response:

```typescript
try {
  await batch.commit()  // No timeout specified
} catch (error) {
  // Could wait forever if network is slow
}
```

**Risk**:
- User stuck in loading state indefinitely
- Server resources consumed
- Poor UX

**Suggested Fix**:
```typescript
const commitWithTimeout = (batch: WriteBatch, timeoutMs: number = 30000) => {
  return Promise.race([
    batch.commit(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

try {
  await commitWithTimeout(batch, 30000)
} catch (error) {
  if (error.message === 'Request timeout') {
    toast({
      variant: "destructive",
      title: "Request timed out",
      description: "The server took too long to respond. Please check your internet connection."
    })
  }
}
```

---

### 🟡 **MEDIUM: Inconsistent Error Messages Leak Info**

**Location**: Multiple files (auth-context, forms)

**Issue Type**: Security - Information Disclosure

**Severity**: MEDIUM

**Description**:
Error messages sometimes expose internal details:

```typescript
// From forgot-password
throw new Error("Your ID is not created yet. Please create your account first.")

// From baseline form
description: error instanceof Error ? error.message : "Please try again."
```

**Risk**:
- Detailed Firestore errors exposed to users
- SQL injection-like patterns in medical context (Firestore queries)
- Version disclosure

**Suggested Fix**:
```typescript
const sanitizeErrorMessage = (error: any): string => {
  const errorCode = error?.code
  
  const errorMap: Record<string, string> = {
    'app/account-not-created': 'Account not found',
    'auth/invalid-credential': 'Invalid login credentials',
    'permission-denied': 'You do not have permission to access this resource',
    'not-found': 'Record not found',
    'already-exists': 'Record already exists',
    'firebaseError': 'An error occurred. Please try again.'
  }
  
  return errorMap[errorCode] || 'An unexpected error occurred. Please try again.'
}

// Usage
catch (error) {
  toast({
    title: "Error",
    description: sanitizeErrorMessage(error)
  })
}
```

---

## CONFIGURATION & ENVIRONMENT ISSUES

### 🟡 **MEDIUM: Debug Logging in Production**

**Location**: Multiple components and API routes

**Issue Type**: Configuration - Information Disclosure

**Severity**: MEDIUM

**Description**:
Conditional logging to console based on localhost check:

```typescript
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('✓ Form saved to Firebase')
}
```

However, server-side console logging always enabled:

```typescript
console.error('account-status API error', error)
```

**Risk**:
- Errors logged to CloudLogs contain sensitive data
- Debugging information visible in production logs
- Attacker can read logs if they gain access

**Suggested Fix**:
```typescript
// Structured logging with levels
const logError = (error: Error, context: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry/monitoring service (no PII)
    Sentry.captureException(error, {
      contexts: {
        request: { ...context, ip: '***' } // redact IP
      }
    })
  } else {
    console.error('Error:', error, context)
  }
}

// In handle
try {
  // ...
} catch (error) {
  logError(error, {
    action: 'fetchDoctor',
    userId: '***',  // never log exact UID
    errorType: error.code
  })
}
```

---

### 🟡 **MEDIUM: Firestore Security Rules Missing Admin Check**

**Location**: [firestore.rules](firestore.rules#L68-L85)

**Issue Type**: Security - Authorization

**Severity**: MEDIUM

**Description**:
Study site code locks are readable by any authenticated user:

```kotlin
match /studySiteCodes/{studySiteCode} {
  // Only authenticated users can read lock docs
  allow read: if isAuthenticated();  // ❌ Any authenticated user
  
  allow create: if isAuthenticated() &&
    request.resource.data.doctorId == request.auth.uid &&
    !exists(/databases/{database}/documents/studySiteCodes/$(studySiteCode));
    
  allow update, delete: if false;
}
```

**Risk**:
- Any authenticated doctor can see all study site codes
- Enables enumeration of which centers are registered
- Could be combined with email enumeration for targeted attacks

**Suggested Fix**:
```kotlin
match /studySiteCodes/{studySiteCode} {
  // Only the owner can read their own lock
  allow read: if isAuthenticated() &&
    resource.data.doctorId == request.auth.uid;
  
  // Allow creation only during signup (transaction)
  allow create: if isAuthenticated() &&
    request.resource.data.doctorId == request.auth.uid &&
    !exists(/databases/{database}/documents/studySiteCodes/$(studySiteCode));
    
  allow update, delete: if false;
}
```

---

## CODE QUALITY ISSUES

### 🟢 **LOW: Double-Submit Prevention Using Ref Instead of State**

**Location**: [components/baseline-form.tsx](components/baseline-form.tsx#L59-65), [app/patients/add/page.tsx](app/patients/add/page.tsx#L150-155)

**Issue Type**: Code Quality

**Severity**: LOW

**Description**:
Using useRef for submitLock is correct but inconsistent with loading state:

```typescript
const [loading, setLoading] = useState(false)
const submitLockRef = useRef(false)

// Later in handler
if (submitLockRef.current || loading) {
  return
}
submitLockRef.current = true
setLoading(true)
```

This works but checking both `loading` AND `submitLockRef` is redundant.

**Suggested Fix**:
Choose one pattern consistently:

```typescript
// Option 1: Just useRef (better for this use case)
const submitLockRef = useRef(false)

const handleSubmit = async (e) => {
  if (submitLockRef.current) return
  submitLockRef.current = true
  
  try {
    // operation
  } finally {
    submitLockRef.current = false
  }
}

// Option 2: State-based with async tracking
const [isSubmitting, setIsSubmitting] = useState(false)

const handleSubmit = async (e) => {
  if (isSubmitting) return
  setIsSubmitting(true)
  
  try {
    // operation
  } finally {
    setIsSubmitting(false)
  }
}
```

---

### 🟢 **LOW: Inconsistent Error Type Handling**

**Location**: [contexts/auth-context.tsx](contexts/auth-context.tsx#L119), [components/baseline-form.tsx](components/baseline-form.tsx#L290)

**Issue Type**: Code Quality

**Severity**: LOW

**Description**:
Error handling is inconsistent:

```typescript
// Sometimes
const errorMsg = error instanceof Error ? error.message : "Failed to fetch doctor profile"

// Sometimes
const errMsg = firebaseError instanceof Error ? firebaseError.message : "Failed to save patient..."

// Sometimes
description: error instanceof Error ? error.message : "Please try again."
```

Should use consistent helpers.

**Suggested Fix**:
Create error utility:

```typescript
// lib/error-utils.ts
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unexpected error occurred'
}

// Usage everywhere
const message = getErrorMessage(error)
```

---

## SUMMARY TABLE

| # | Location | Issue | Type | Severity | Status |
|---|----------|-------|------|----------|--------|
| 1 | apphosting.yaml | Encryption key public | Security | HIGH | ⚠️ CRITICAL |
| 2 | admin/login/route.ts | Non-HTTPOnly cookie | Security | HIGH | ⚠️ CRITICAL |
| 3 | forgot-password/page.tsx | User enumeration | Security | HIGH | ⚠️ CRITICAL |
| 4 | All APIs | No server validation | Security | HIGH | ⚠️ CRITICAL |
| 5 | All APIs | No CORS validation | Security | MEDIUM | ✓ |
| 6 | Auth endpoints | No rate limiting | Security | MEDIUM | ✓ |
| 7 | admin/login/route.ts | No account lockout | Security | MEDIUM | ✓ |
| 8 | auth-context.tsx | Race condition risk | Data Integrity | MEDIUM | ✓ |
| 9 | followup-form.tsx | Missing null checks | Data Integrity | MEDIUM | ✓ |
| 10 | baseline-form.tsx | No patient existence check | Data Integrity | MEDIUM | ✓ |
| 11 | account-status/route.ts | No email format validation | Validation | MEDIUM | ✓ |
| 12 | baseline-form.tsx | Incomplete range validation | Validation | MEDIUM | ✓ |
| 13 | auth-context.tsx | Unhandled promise rejection | Error Handling | MEDIUM | ✓ |
| 14 | baseline-form.tsx | No request timeout | Error Handling | MEDIUM | ✓ |
| 15 | Multiple | Error info disclosure | Error Handling | MEDIUM | ✓ |

---

## RECOMMENDED REMEDIATION TIMELINE

### IMMEDIATE (Within 24 hours)
1. **HIGH**: Rotate NEXT_PUBLIC_ENCRYPTION_KEY
2. **HIGH**: Fix adminAuthData cookie (httpOnly: true)
3. **HIGH**: Implement user enumeration fix for forgot-password

### THIS WEEK
4. **HIGH**: Add server-side validation to all API endpoints
5. **MEDIUM**: Fix race condition in signup (remove pre-check)
6. **MEDIUM**: Add account lockout to admin login

### THIS SPRINT
7. Complete validation fixes (email format, numeric ranges)
8. Add null safety checks throughout forms
9. Implement error sanitization helpers
10. Add request timeouts to all data operations

### ONGOING
11. Remove debug logging infrastructure
12. Implement monitoring and alerting
13. Set up security scanning in CI/CD
14. Establish code review checklist for security

---

## NOTES

- All timestamps in data represent UTC
- Forms use Firestore write batches for atomicity (good)
- Middleware authentication is properly configured
- Patient data isolation per doctor is enforced in rules ✅
- Password hashing uses bcrypt ✅

**Report Generated**: March 11, 2026  
**Auditor**: Automated Security Review  
**Status**: Requires Action on 4 HIGH severity items
