# Deployment Permissions Issue Analysis

## Root Cause
The GitHub Actions deployment is failing with a **403 Forbidden** error when trying to access the Developer Connect resource:

```
Permission 'developerconnect.gitRepositoryLinks.get' denied on resource 
'//developerconnect.googleapis.com/projects/***/locations/us-central1/connections/apphosting-github-conn-tomiohb/gitRepositoryLinks/Omkar-Verma99-clinical-trial-application'
```

## Why This Happens
The service account (`FIREBASE_SERVICE_ACCOUNT_B64`) used in GitHub Actions doesn't have sufficient IAM permissions to:
1. Access Developer Connect resources
2. Manage App Hosting backends
3. Access Cloud Build and Artifact Registry

## What firebase.json Issue Was
The validation warnings about firebase.json were **NOT the cause of failure**:
- Warnings about "ignore" property and array format are just validation messages
- The backend WAS found successfully (`apphosting: Found backend(s) app`)
- Deployment proceeded past config validation

## Actual Configuration Structure
- **firebase.json**: Should NOT contain apphosting config (already fixed)
- **apphosting.yaml**: Contains the actual App Hosting configuration (node version, env vars, scaling)
- This is the correct Firebase structure

## Solution Required
The service account needs these IAM roles:

1. **roles/firebase.admin** - Full Firebase admin access (recommended for simplicity)
   OR granular permissions:
   - roles/apphosting.admin - App Hosting administration
   - roles/developerconnect.admin - Developer Connect access
   - roles/cloudbuild.builds.editor - Cloud Build management
   - roles/run.admin - Cloud Run management
   - roles/artifactregistry.admin - Artifact Registry access

## How to Fix

### Option A: Grant Firebase Admin (Simplest)
The service account `firebase-app-hosting-compute@[PROJECT_ID].iam.gserviceaccount.com` needs:
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member=serviceAccount:firebase-app-hosting-compute@[PROJECT_ID].iam.gserviceaccount.com \
  --role=roles/firebase.admin
```

### Option B: Use Workload Identity Federation
Use OIDC token from GitHub instead of service account key (more secure):
- Already has workflow permissions set up
- Needs Workload Identity configuration in GCP
- Would use `google-github-actions/auth@v2` action

## Status
✅ firebase.json corrected (removed unnecessary apphosting config)  
✅ apphosting.yaml is correct  
⏳ IAM permissions need to be added to service account  
⏳ Next deployment should succeed after permissions are fixed

## Files Modified This Session
- firebase.json: Removed apphosting config (now properly configured)
- Commit: f0bde1b
