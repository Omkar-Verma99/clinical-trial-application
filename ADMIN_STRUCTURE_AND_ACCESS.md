# Admin Structure and Access Model

## Current State (March 12, 2026)
- There are currently no active admin users and no active doctor users in Auth/Firestore.
- In this state, all admin routes redirect to `/admin/login` until a valid admin account is created.
- Claims backfill is not required right now because there are no existing accounts to migrate.

## Admin Application Structure

### Route Layout
- Canonical admin home route: `/admin`
- Backward compatibility route: `/admin/dashboard` (redirects to `/admin`)
- Admin section routes:
  - `/admin/doctors`
  - `/admin/patients`
  - `/admin/forms`
  - `/admin/analytics`
  - `/admin/exports`
  - `/admin/audit-logs`
  - `/admin/settings`

### Authentication and Session Layers
- Login endpoint validates credentials via Firebase Auth and admin Firestore profile.
- Middleware enforces admin access on `/admin/*` routes.
- Session cookies used by middleware:
  - `adminAuth`
  - `adminAuthData`
  - `appRole=admin|super_admin`
- Role claim is synced through Firebase Admin SDK for token-based role checks.

## Admin Roles and Permissions

### Role Types
- `admin`
- `super_admin`

### Access Matrix
| Area | admin | super_admin |
|---|---|---|
| Dashboard (`/admin`) | Yes | Yes |
| Doctors management | Yes | Yes |
| Patients management | Yes | Yes |
| Forms management | Yes | Yes |
| Analytics | Yes | Yes |
| Export center | Yes | Yes |
| Audit logs | Yes | Yes |
| Settings | Limited/Config-based | Full |
| Role/privilege changes | No (recommended) | Yes |

Note: Fine-grained feature gating depends on permission checks in the admin UI/services. `super_admin` should be used for sensitive governance actions.

## Visual Structure (Drawing)

```mermaid
flowchart TD
  A[User opens app] --> B{Route starts with /admin?}
  B -- No --> C[Normal doctor/public flow]
  B -- Yes --> D{Has valid admin session cookies?}

  D -- No --> E[/admin/login]
  D -- Yes --> F[/admin]

  F --> G[Dashboard Overview]
  F --> H[Doctors]
  F --> I[Patients]
  F --> J[Forms]
  F --> K[Analytics]
  F --> L[Exports]
  F --> M[Audit Logs]
  F --> N[Settings]

  O[Login API] --> P[Firebase Auth credential check]
  P --> Q[Firestore admins profile check]
  Q --> R[Set admin cookies]
  R --> S[Sync custom claim role=admin/super_admin]
  S --> F
```

## Required Data Model for Admin Accounts
- Firestore collection: `admins`
- Document ID: must be Firebase Auth UID (do not use auto-ID)
- Required fields (recommended):
  - `email`
  - `role` (`admin` or `super_admin`)
  - `status`
  - `createdAt`
  - `updatedAt`

## Recommended Admin Onboarding Steps
1. Create user in Firebase Authentication.
2. Copy the created Auth UID.
3. Create `admins/{uid}` document with role and metadata.
4. Login once via `/admin/login` to initialize cookies and role claim sync.
5. Verify access to `/admin` and side-menu routes.

## Security Notes
- Keep `super_admin` accounts minimal and tightly controlled.
- Do not rely only on client-side checks for critical actions.
- Continue enforcing role checks in backend APIs for sensitive operations.
