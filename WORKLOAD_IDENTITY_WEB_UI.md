# ⚡ FASTEST WAY: Use Google Cloud Console (Web Browser)

Since gcloud CLI installation requires admin rights, use the Google Cloud Console instead - takes 10 minutes, no installation needed!

## 🌐 Step 1: Enable APIs (2 minutes)

1. Go to: https://console.cloud.google.com/apis/library?project=kollectcare-rwe-study
2. Search and enable each (click "Enable"):
   - [ ] Workload Identity Federation API
   - [ ] Service Account Credentials API
   - [ ] Cloud Resource Manager API
   - [ ] IAM API

## 🏊 Step 2: Create Workload Identity Pool (2 minutes)

1. Go to: https://console.cloud.google.com/iam-admin/workload-identity-pools?project=kollectcare-rwe-study
2. Click "Create Pool"
3. Fill in:
   - Pool ID: `github-pool`
   - Display name: `GitHub Actions Pool`
   - Location: `global`
4. Click "Create"

## 🔗 Step 3: Create Workload Identity Provider (2 minutes)

1. In the pool you just created, click "Add Provider"
2. Fill in:
   - Provider Type: `OpenID Connect (OIDC)`
   - Provider ID: `github-provider`
   - Issuer URL: `https://token.actions.githubusercontent.com`
3. Under Attribute mappings, add:
   - `google.subject` → `assertion.sub`
   - `assertion.repository` → `assertion.repository`
4. Click "Create"

## 🤖 Step 4: Create Service Account (1 minute)

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=kollectcare-rwe-study
2. Click "Create Service Account"
3. Service account name: `github-firebase-deployer`
4. Display name: `GitHub Firebase Deployer`
5. Click "Create and Continue"

## 📋 Step 5: Grant Permissions (2 minutes)

1. In Service Accounts, click the account you just created
2. Go to "Permissions" tab
3. Click "Grant Access" (or the IAM section)
4. Add role: `Firebase Administrator`

## 🔑 Step 6: Set Up GitHub Trust (1 minute)

1. Still in Service Account, go to "Permissions"
2. Click "Grant Access"
3. New principals: Click "Add Principal"
4. Paste this:
   ```
   principalSet://iam.googleapis.com/projects/716627719667/locations/global/workloadIdentityPools/github-pool/attribute.repository/Omkar-Verma99/clinical-trial-application
   ```
5. Role: `Workload Identity User`
6. Click "Save"

## 📍 Step 7: Get Your WIF_PROVIDER Value (1 minute)

1. Go to: https://console.cloud.google.com/iam-admin/workload-identity-pools/locations/global/workloadIdentityPools/github-pool/providers?project=kollectcare-rwe-study
2. Click on `github-provider`
3. Copy the "Resource Name" at the top - it looks like:
   ```
   projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider
   ```

## 🔐 Step 8: Add GitHub Secrets (1 minute)

1. Go to: https://github.com/Omkar-Verma99/clinical-trial-application/settings/secrets/actions
2. Click "New repository secret"
3. Add first secret:
   - **Name:** `WIF_PROVIDER`
   - **Value:** (paste the resource name from Step 7)
4. Click "Add secret"
5. Click "New repository secret" again
6. Add second secret:
   - **Name:** `WIF_SERVICE_ACCOUNT`
   - **Value:** `github-firebase-deployer@kollectcare-rwe-study.iam.gserviceaccount.com`
7. Click "Add secret"

## ✅ Step 9: Commit & Deploy (2 minutes)

```bash
cd c:\Users\Omkar.Verma\OneDrive\ -\ Kollectcare\clinical-trial-application
git add .github/workflows/deploy.yml
git commit -m "ci: Enable Workload Identity for secure Firebase deployment"
git push origin main
```

Watch deployment at: https://github.com/Omkar-Verma99/clinical-trial-application/actions

## ✅ DONE!

Your GitHub Actions now use secure Workload Identity authentication!
- ✅ No secrets stored in GitHub
- ✅ No private keys exposed
- ✅ Future-proof (works with all firebase-tools versions)

---

**Time estimate: ~15 minutes total**

**Difficulty: Easy** - Just clicking buttons in the web console!
