# Admin Authentication and Role Routing Deep Findings

Date: 2026-03-11
Prepared by: GitHub Copilot (GPT-5.3-Codex)
Scope: Read-only audit of admin login, role recognition, routing, middleware, and Firestore rule alignment.

## Executive Summary

Admin login is currently implemented with a separate flow, but there are critical inconsistencies across routing, session handling, and role enforcement. These inconsistencies can cause an admin user to end up in doctor-facing flows and see "No patients" behavior, even after a successful login.

The most urgent issues are:
1. Admin dashboard route mismatch (`/admin/dashboard` vs actual `/admin`).
2. Doctor auth cookie is set for any Firebase-authenticated user, regardless of role.
3. Firestore rules assume `admins/{uid}` while setup guidance suggests non-uid admin document IDs.

## Confirmed Findings

### 1) Critical: Admin route mismatch (`/admin/dashboard` does not exist)

Evidence:
- `app/admin/login/page.tsx`: redirects to `/admin/dashboard` after success.
- `app/admin/components/AdminSidebar.tsx`: dashboard nav item points to `/admin/dashboard`.
- `middleware.ts`: redirects `/admin` and `/admin/login` to `/admin/dashboard` when authenticated.
- `app/admin/page.tsx`: actual admin dashboard page exists at `/admin`.

Impact:
- Broken or inconsistent post-login navigation for admin users.
- Middleware and UI expect a route that is not implemented.

Severity: Critical

---

### 2) Critical: Doctor session cookie is granted to any Firebase-authenticated user

Evidence:
- `contexts/auth-context.tsx`: on auth state change, `doctorAuth=true` cookie is set whenever `currentUser` exists.
- `contexts/auth-context.tsx`: doctor login uses `signInWithEmailAndPassword(...)`.
- `app/dashboard/page.tsx`: patient query filters by `where("doctorId", "==", user.uid)`.
- `app/dashboard/page.tsx`: shows "No patients yet" if none match.

Impact:
- If admin account signs in through doctor-auth path (or has active Firebase session), it can be treated as doctor.
- Resulting UI symptom matches reported issue: successful login but doctor interface + no patients.

Severity: Critical

---

### 3) High: Firestore rules and admin setup guide are misaligned on admin document identity

Evidence:
- `firestore.rules`:
  - `isAdmin()` checks existence of `admins/{request.auth.uid}`.
  - `match /admins/{adminId}` read/update requires `request.auth.uid == adminId`.
- `ADMIN_SETUP_GUIDE.md`:
  - Shows examples like `admin_001`.
  - Also instructs using Auto ID in setup steps.

Impact:
- If admin docs are created with Auto ID or custom IDs not equal to Firebase UID, rule-based admin checks fail.
- This can break admin permissions and data access even with valid credentials.

Severity: High

---

### 4) High: Admin route protection currently trusts cookie presence, not robust role verification each request

Evidence:
- `app/api/admin/login/route.ts`: verifies Firebase credentials, checks `admins` by email, then sets `adminAuth` and `adminAuthData` cookies.
- `middleware.ts`: for admin routes, checks cookie presence (`adminAuth` or `adminAuthData`) to allow access.
- `contexts/admin-auth-context.tsx`: client authenticated state depends on local/session data + Firestore fetch.

Impact:
- Authorization confidence is weaker than claim-based verification.
- Cookie/session drift can produce inconsistent behavior between server route access and client role state.

Severity: High

---

### 5) Medium: Authorization model is inconsistent across UI, middleware, and rules

Evidence:
- UI permissions use role-to-permissions mapping (`lib/admin-auth.ts`).
- Firestore data access relies on `request.auth.uid` and rule checks.
- `firestore.rules` has broad read for `adminPanel` collection with `isAuthenticated()` only.

Impact:
- Mixed trust boundaries increase risk of edge-case access issues.
- Harder to reason about security and behavior across pages.

Severity: Medium

## Direct Answers to Key Questions

### Is the system checking Firestore data or only authentication?
Current behavior is mixed:
1. Admin login API validates credentials against Firebase Auth.
2. Admin API then validates role/status from Firestore `admins` collection.
3. Doctor flow uses Firebase auth state and sets doctor cookie for any signed-in user.
4. Firestore rule-based admin checks depend on admin doc identity (`admins/{uid}`).

### Can we add role in authentication for easier recognition?
Yes. Recommended: Firebase Custom Claims (`role: super_admin | admin | doctor`) set via Admin SDK.

Benefits:
- Single source of truth for role at auth token level.
- Cleaner middleware checks.
- Reduced dependency on localStorage/cookies for critical authorization decisions.

### If role is empty, should default be doctor?
Recommendation: No.

Safer behavior:
1. `super_admin` or `admin` -> admin app routes.
2. `doctor` -> doctor app routes.
3. Missing/unknown role -> block privileged routes and show role-resolution/error page.

Reason:
- Defaulting to doctor can mask misconfiguration and cause exactly the confusing behavior observed.

## Recommended Implementation Strategy (for later)

### Phase 1: Stabilization (quick and low risk)
1. Fix route map mismatch:
   - Either create `/admin/dashboard` page, or switch all references to `/admin`.
2. Prevent admin users from being treated as doctors in doctor auth flow.
3. Add explicit role resolution check before doctor dashboard access.

Expected outcome:
- Admin lands reliably in admin interface.
- No accidental "doctor/no patients" fallback for admin accounts.

### Phase 2: Security Hardening (proper long-term model)
1. Introduce Firebase Custom Claims for role.
2. Align middleware with claim-based role checks.
3. Align Firestore docs/rules so admin identity model is consistent (`uid`-based or redesigned with secure backend checks).
4. Tighten permissive rules (example: `adminPanel` reads).

Expected outcome:
- Deterministic and secure role-based routing.
- Easier maintainability and fewer auth edge cases.

## Files Reviewed During Audit

- `app/admin/login/page.tsx`
- `app/admin/components/AdminSidebar.tsx`
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/patients/page.tsx`
- `app/admin/settings/page.tsx`
- `app/admin/components/AdminHeader.tsx`
- `app/api/admin/login/route.ts`
- `app/api/admin/logout/route.ts`
- `app/dashboard/page.tsx`
- `contexts/auth-context.tsx`
- `contexts/admin-auth-context.tsx`
- `lib/admin-auth.ts`
- `middleware.ts`
- `firestore.rules`
- `ADMIN_SETUP_GUIDE.md`

## Notes

- No code changes were made as part of this document creation.
- This document is intentionally written as an implementation-ready handoff for the next development pass.
