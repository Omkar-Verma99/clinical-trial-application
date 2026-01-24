# Workload Identity Setup for GitHub Actions

Complete guide to set up Workload Identity Federation for secure Firebase deployment.

## Prerequisites

- Google Cloud Account with billable project (kollectcare-rwe-study)
- gcloud CLI installed
- GitHub repository: Omkar-Verma99/clinical-trial-application

---

## Step 1: Enable Required APIs

```bash
# Enable required Google Cloud APIs
gcloud services enable iamcredentials.googleapis.com \
  iam.googleapis.com \
  serviceusage.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=kollectcare-rwe-study
```

**Expected output:**
```
Enabling service [iamcredentials.googleapis.com]...
Enabling service [iam.googleapis.com]...
(etc)
```

---

## Step 2: Create Workload Identity Pool

```bash
# Create the pool (only needs to be done once)
gcloud iam workload-identity-pools create "github-pool" \
  --project="kollectcare-rwe-study" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

**Expected output:**
```
Created workload identity pool [github-pool].
name: projects/716627719667/locations/global/workloadIdentityPools/github-pool
```

**Save the name** - we'll use it in Step 3.

---

## Step 3: Create Workload Identity Provider

Replace `[PROJECT_NUMBER]` with your project number (716627719667):

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="kollectcare-rwe-study" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,assertion.repository=assertion.repository,assertion.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

**Expected output:**
```
Created workload identity pool provider [github-provider].
name: projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

**COPY THIS NAME** - You need it for GitHub secrets!

---

## Step 4: Create Service Account

```bash
gcloud iam service-accounts create "github-firebase-deployer" \
  --project="kollectcare-rwe-study" \
  --display-name="GitHub Firebase Deployer"
```

**Expected output:**
```
Created service account [github-firebase-deployer].
```

---

## Step 5: Grant Firebase Admin Role

```bash
gcloud projects add-iam-policy-binding "kollectcare-rwe-study" \
  --member="serviceAccount:github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

**Expected output:**
```
Updated IAM policy for project [kollectcare-rwe-study].
```

---

## Step 6: Create Workload Identity Binding

This allows GitHub Actions to impersonate the service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com" \
  --project="kollectcare-rwe-study" \
  --role="roles/iam.workloadIdentityUser" \
  --principal="principalSet://iam.googleapis.com/projects/716627719667/locations/global/workloadIdentityPools/github-pool/attribute.repository/Omkar-Verma99/clinical-trial-application"
```

**Expected output:**
```
Updated IAM policy for service account [github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com].
```

---

## Step 7: Get Required Values

Get your WIF_PROVIDER (full path):

```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="kollectcare-rwe-study" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

**Output example:**
```
projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

**SAVE THIS** - It's your WIF_PROVIDER!

---

## Step 8: Add GitHub Secrets

Go to: https://github.com/Omkar-Verma99/clinical-trial-application/settings/secrets/actions

Click "New repository secret" and add:

### Secret 1: WIF_PROVIDER
- **Name:** `WIF_PROVIDER`
- **Value:** `projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

### Secret 2: WIF_SERVICE_ACCOUNT
- **Name:** `WIF_SERVICE_ACCOUNT`
- **Value:** `github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com`

---

## Step 9: Update GitHub Actions Workflow

Your `.github/workflows/deploy.yml` should have:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

- name: Deploy to Firebase App Hosting
  run: firebase deploy --only apphosting --force --debug
```

---

## Step 10: Test Deployment

```bash
# Make a small change to trigger deployment
git add .
git commit -m "test: Verify Workload Identity deployment"
git push origin main
```

Watch GitHub Actions: https://github.com/Omkar-Verma99/clinical-trial-application/actions

---

## Verification Checklist

- [ ] APIs enabled (Step 1)
- [ ] Workload Identity Pool created (Step 2)
- [ ] Provider created (Step 3)
- [ ] Service Account created (Step 4)
- [ ] Firebase Admin role granted (Step 5)
- [ ] Binding created (Step 6)
- [ ] WIF_PROVIDER copied (Step 7)
- [ ] Both secrets added to GitHub (Step 8)
- [ ] deploy.yml updated (Step 9)
- [ ] Test push successful (Step 10)

---

## Troubleshooting

### Error: "Workload identity pool already exists"
✅ This is OK - it already exists from previous setup

```bash
# List existing pools
gcloud iam workload-identity-pools list \
  --location="global" \
  --project="kollectcare-rwe-study"
```

### Error: "Deployment fails with auth error"
Check that:
1. WIF_PROVIDER value is complete (includes /providers/github-provider)
2. WIF_SERVICE_ACCOUNT matches exactly
3. Service account has firebase.admin role

```bash
# Verify service account has correct role
gcloud projects get-iam-policy kollectcare-rwe-study \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-firebase-deployer*"
```

### Error: "Service account not found"
The service account might not exist. Create it with Step 4.

---

## Security Benefits

✅ **No private keys stored anywhere**
✅ **GitHub verifies directly with Google Cloud**
✅ **Each deployment creates temporary credentials**
✅ **Credentials auto-expire after deployment**
✅ **Future-proof** (won't break with firebase-tools updates)

---

## Done! 🎉

Your Firebase deployments now use secure, keyless authentication!

Next deployments will use Workload Identity automatically.
