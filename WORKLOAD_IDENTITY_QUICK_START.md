## ✅ Workload Identity Setup Checklist

Follow these steps in order. Each takes ~1-2 minutes.

---

### Step 1: Open Terminal/PowerShell
```powershell
cd "c:\Users\Omkar.Verma\OneDrive - Kollectcare\clinical-trial-application"
```

---

### Step 2: Enable Google Cloud APIs
Copy and run this command:

```bash
gcloud services enable iamcredentials.googleapis.com iam.googleapis.com serviceusage.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com --project=kollectcare-rwe-study
```

**⏱️ Wait ~30 seconds**

✅ Check: You see "Enabling service..." messages

---

### Step 3: Create Workload Identity Pool
```bash
gcloud iam workload-identity-pools create "github-pool" \
  --project="kollectcare-rwe-study" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

✅ Check: Output shows `name: projects/716627719667/locations/global/workloadIdentityPools/github-pool`

---

### Step 4: Create Workload Identity Provider
```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="kollectcare-rwe-study" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,assertion.repository=assertion.repository,assertion.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

✅ Check: Output shows `name: projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

---

### Step 5: Create Service Account
```bash
gcloud iam service-accounts create "github-firebase-deployer" \
  --project="kollectcare-rwe-study" \
  --display-name="GitHub Firebase Deployer"
```

✅ Check: Output shows `Created service account [github-firebase-deployer]`

---

### Step 6: Grant Firebase Admin Role
```bash
gcloud projects add-iam-policy-binding "kollectcare-rwe-study" \
  --member="serviceAccount:github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

✅ Check: Output shows `Updated IAM policy for project [kollectcare-rwe-study]`

---

### Step 7: Create Workload Identity Binding
```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com" \
  --project="kollectcare-rwe-study" \
  --role="roles/iam.workloadIdentityUser" \
  --principal="principalSet://iam.googleapis.com/projects/716627719667/locations/global/workloadIdentityPools/github-pool/attribute.repository/Omkar-Verma99/clinical-trial-application"
```

✅ Check: Output shows `Updated IAM policy for service account`

---

### Step 8: Get WIF_PROVIDER Value
Run this command and **COPY the output**:

```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="kollectcare-rwe-study" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

**Expected output:**
```
projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

📋 **SAVE THIS VALUE** - You need it in Step 9!

---

### Step 9: Add GitHub Secrets

Go to: https://github.com/Omkar-Verma99/clinical-trial-application/settings/secrets/actions

#### Add Secret 1: WIF_PROVIDER
1. Click "New repository secret"
2. **Name:** `WIF_PROVIDER`
3. **Value:** (paste from Step 8 output above)
4. Click "Add secret"

#### Add Secret 2: WIF_SERVICE_ACCOUNT
1. Click "New repository secret"
2. **Name:** `WIF_SERVICE_ACCOUNT`
3. **Value:** `github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com`
4. Click "Add secret"

✅ Check: Both secrets appear in the list

---

### Step 10: Deploy.yml Already Updated ✅

The deploy.yml file has been automatically updated to use Workload Identity. You can verify it here:

`.github/workflows/deploy.yml` - contains the auth step with WIF_PROVIDER and WIF_SERVICE_ACCOUNT

---

### Step 11: Test Deployment

Push the updated files to GitHub:

```bash
git add .github/workflows/deploy.yml WORKLOAD_IDENTITY_SETUP.md
git commit -m "ci: Enable Workload Identity for secure Firebase deployment"
git push origin main
```

Then watch the deployment:
👉 https://github.com/Omkar-Verma99/clinical-trial-application/actions

✅ Check: Deployment completes without auth errors

---

## 🎉 DONE!

Your GitHub Actions now use secure Workload Identity authentication!

### Benefits:
✅ No private keys stored anywhere  
✅ No secrets that can leak  
✅ Temporary credentials per deployment  
✅ Future-proof (works with all firebase-tools versions)  

---

## Need Help?

If any step fails, run:
```bash
# See full error details
gcloud auth list
gcloud config list
```

Or check the detailed guide in: `WORKLOAD_IDENTITY_SETUP.md`
